import asyncio
import os
import time
from typing import Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.engine.game_env import ArcadeSurvivalEnv
from backend.agent.drl_model import DQNAgent, TORCH_AVAILABLE
from backend.llm.dda_service import DDAService

app = FastAPI(title="Adaptive Game Intelligence Platform")

# Base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
WEIGHTS_PATH = os.path.join(BASE_DIR, "backend", "agent", "weights", "dqn_model.pt")

# Global Game Session State
env = ArcadeSurvivalEnv()
agent = DQNAgent(num_actions=5, model_path=WEIGHTS_PATH)
dda = DDAService()

current_mode = "human"  # "human" or "ai"
dda_eval_timer = 0.0
last_human_action = 0
ai_death_timer = 0.0


@app.get("/api/status")
async def get_status():
    return {
        "mode": current_mode,
        "torch_available": TORCH_AVAILABLE,
        "ollama_connected": dda.check_connection(),
        "ollama_model": dda.model_name,
        "telemetry": env.get_telemetry()
    }


class ModeRequest(BaseModel):
    mode: str


class LevelRequest(BaseModel):
    level: int


@app.post("/api/mode")
async def set_mode(req: ModeRequest):
    global current_mode
    if req.mode in ["human", "ai"]:
        current_mode = req.mode
        return {"status": "success", "mode": current_mode}
    return {"status": "error", "message": "Invalid mode"}


@app.get("/api/level")
async def get_level():
    return env.get_level_info()


@app.post("/api/level")
async def set_level(req: LevelRequest):
    if 1 <= req.level <= 5:
        env.set_level(req.level)
        return {"status": "success", "level_info": env.get_level_info()}
    return {"status": "error", "message": "Level must be between 1 and 5"}


@app.post("/api/reset")
async def reset_game():
    env.reset()
    return {"status": "reset", "telemetry": env.get_telemetry(), "level_info": env.get_level_info()}


@app.websocket("/ws/game")
async def websocket_game(websocket: WebSocket):
    global dda_eval_timer, last_human_action, current_mode, ai_death_timer
    await websocket.accept()

    fps = 30
    frame_duration = 1.0 / fps

    try:
        while True:
            cycle_start = time.time()

            # Handle incoming WebSocket messages (non-blocking)
            try:
                msg = await asyncio.wait_for(websocket.receive_json(), timeout=0.001)
                if "action" in msg:
                    last_human_action = int(msg["action"])
                if "mode" in msg and msg["mode"] in ["human", "ai"]:
                    current_mode = msg["mode"]
                    if current_mode == "ai" and os.path.exists(WEIGHTS_PATH):
                        agent.load(WEIGHTS_PATH)
                if "level" in msg:
                    env.set_level(int(msg["level"]))
                if "next_level" in msg and msg["next_level"]:
                    env.next_level()
                if "reset" in msg and msg["reset"]:
                    env.reset()
            except asyncio.TimeoutError:
                pass

            # Determine Action
            if current_mode == "ai":
                obs = env.get_observation()
                dest_coords = (env.destination["x"], env.destination["y"])
                player_coords = (env.player.x, env.player.y)
                action = agent.select_action(
                    obs,
                    evaluate=True,
                    destination=dest_coords,
                    player_pos=player_coords,
                    obstacles=env.obstacles,
                    enemies=env.enemies
                )
            else:
                action = last_human_action

            # Step Environment
            obs, reward, done, telemetry = env.step(action, dt=frame_duration)

            # In AI mode, auto-advance on level completion or auto-restart after death
            if current_mode == "ai":
                if done:
                    ai_death_timer += frame_duration
                    if ai_death_timer >= 1.0:
                        if env.level_completed:
                            if env.current_level >= 5:
                                env.set_level(1)
                            else:
                                env.next_level()
                        else:
                            env.reset()
                        ai_death_timer = 0.0
                else:
                    ai_death_timer = 0.0

            # Store experience for live agent adaptation
            if current_mode == "ai":
                next_obs = env.get_observation()
                agent.memory.push(obs, action, reward, next_obs, done)

            # Non-blocking Asynchronous DDA Evaluation (runs in background thread without freezing game)
            if not env.game_over:
                dda_eval_timer += frame_duration
                if dda_eval_timer >= 10.0 and not getattr(dda, "is_evaluating", False):
                    dda_eval_timer = 0.0
                    dda.is_evaluating = True
                    snapshot_telemetry = dict(telemetry)

                    async def run_async_dda(telem):
                        try:
                            adj = await asyncio.to_thread(dda.evaluate_gameplay, telem)
                            env.difficulty.apply_llm_adjustment(adj)
                        except Exception:
                            pass
                        finally:
                            dda.is_evaluating = False

                    asyncio.create_task(run_async_dda(snapshot_telemetry))

            # Prepare Payload for Frontend
            render_state = env.get_render_state()
            render_state["mode"] = current_mode
            render_state["cnn_activation"] = agent.get_activation_map()
            render_state["q_values"] = getattr(agent, "last_q_values", [0]*5)
            render_state["ollama_active"] = dda.is_connected

            await websocket.send_json(render_state)

            # Maintain frame rate
            elapsed = time.time() - cycle_start
            sleep_time = max(0.001, frame_duration - elapsed)
            await asyncio.sleep(sleep_time)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        import traceback
        print(f"WebSocket session error: {e}")
        traceback.print_exc()


# Serve Static Frontend Files
if os.path.exists(FRONTEND_DIR):
    css_dir = os.path.join(FRONTEND_DIR, "css")
    js_dir = os.path.join(FRONTEND_DIR, "js")
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
