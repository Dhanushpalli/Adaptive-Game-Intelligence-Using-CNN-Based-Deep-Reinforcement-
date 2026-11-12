import os
import time
import random
import numpy as np

# Ensure plots folder exists
PLOTS_DIR = os.path.join(os.path.dirname(__file__), "plots")
os.makedirs(PLOTS_DIR, exist_ok=True)

from backend.engine.game_env import ArcadeSurvivalEnv
from backend.agent.drl_model import DQNAgent

def run_evaluation_trials(num_episodes: int = 5, use_dda: bool = True, agent_type: str = "drl"):
    """
    Runs simulated trials to record survival duration, reward scores, and difficulty curves.
    """
    env = ArcadeSurvivalEnv(dda_enabled=use_dda)
    agent = DQNAgent(num_actions=5)

    results = []

    print(f"--- Running {num_episodes} Trials | DDA: {use_dda} | Agent: {agent_type} ---")
    for ep in range(1, num_episodes + 1):
        obs = env.reset()
        done = False
        steps = 0
        total_reward = 0.0

        # Adjust difficulty preset if static
        if not use_dda:
            env.difficulty.enemy_speed_multiplier = 1.3
            env.difficulty.enemy_spawn_interval = 1.5

        while not done and steps < 600:  # Max 600 steps (~20s simulated)
            steps += 1
            if agent_type == "drl":
                action = agent.select_action(obs, evaluate=True)
            else:
                action = random.randint(0, 4)

            obs, reward, done, telemetry = env.step(action, dt=0.033)
            total_reward += reward

        telem = env.get_telemetry()
        print(f"Episode {ep:02d}: Survived {telem['survival_time']}s | Score: {telem['score']} | Dodges: {telem['dodges_recorded']}")
        results.append(telem)

    return results


def generate_benchmark_report():
    print("Running Benchmark 1: Static Difficulty vs LLM Dynamic Difficulty...")
    static_results = run_evaluation_trials(num_episodes=5, use_dda=False, agent_type="drl")
    dda_results = run_evaluation_trials(num_episodes=5, use_dda=True, agent_type="drl")

    avg_static_surv = np.mean([r["survival_time"] for r in static_results])
    avg_dda_surv = np.mean([r["survival_time"] for r in dda_results])

    avg_static_score = np.mean([r["score"] for r in static_results])
    avg_dda_score = np.mean([r["score"] for r in dda_results])

    print("\n" + "="*50)
    print("📈 EVALUATION & BENCHMARK SUMMARY")
    print("="*50)
    print(f"Static Difficulty  -> Avg Survival: {avg_static_surv:.1f}s | Avg Score: {avg_static_score:.1f}")
    print(f"LLM DDA Adaptive   -> Avg Survival: {avg_dda_surv:.1f}s | Avg Score: {avg_dda_score:.1f}")
    print("="*50)

    # Attempt to plot if matplotlib is installed
    try:
        import matplotlib.pyplot as plt
        categories = ["Static Preset", "LLM DDA"]
        survival_vals = [avg_static_surv, avg_dda_surv]
        score_vals = [avg_static_score, avg_dda_score]

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
        ax1.bar(categories, survival_vals, color=["#f85149", "#3fb950"])
        ax1.set_title("Average Survival Time (s)")
        ax1.set_ylabel("Seconds")

        ax2.bar(categories, score_vals, color=["#58a6ff", "#bc8cff"])
        ax2.set_title("Average Score Achieved")
        ax2.set_ylabel("Score")

        plt.tight_layout()
        plot_path = os.path.join(PLOTS_DIR, "benchmark_comparison.png")
        plt.savefig(plot_path)
        print(f"Saved benchmark figure to: {plot_path}")
    except ImportError:
        print("Note: matplotlib not installed yet. Skipping figure generation.")


if __name__ == "__main__":
    generate_benchmark_report()
