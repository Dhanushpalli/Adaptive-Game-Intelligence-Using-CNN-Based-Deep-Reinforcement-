import os
import sys
import time
import math
import random
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np

# Ensure root workspace is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.engine.game_env import ArcadeSurvivalEnv
from backend.agent.drl_model import DQNAgent

WEIGHTS_DIR = os.path.join(BASE_DIR, "backend", "agent", "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)
CHECKPOINT_PATH = os.path.join(WEIGHTS_DIR, "dqn_model.pt")


def get_expert_action(env: ArcadeSurvivalEnv) -> int:
    """
    Expert heuristic demonstration to guide CNN-DRL policy:
    1. Strong repulsion from close enemies (evasion/survival).
    2. Attraction toward nearest collectible.
    3. Boundary avoidance.
    """
    px, py = env.player.x, env.player.y
    force_x, force_y = 0.0, 0.0

    # 1. Repel from enemies
    for en in env.enemies:
        dx = px - en.x
        dy = py - en.y
        dist = math.hypot(dx, dy)
        if dist < 140:
            weight = (140 - dist) / 140.0
            force_x += (dx / (dist + 1e-4)) * weight * 3.5
            force_y += (dy / (dist + 1e-4)) * weight * 3.5

    # 2. Attract to closest collectible if not in extreme danger
    if len(env.collectibles) > 0 and math.hypot(force_x, force_y) < 2.0:
        best_col = min(env.collectibles, key=lambda c: math.hypot(px - c.x, py - c.y))
        cdx = best_col.x - px
        cdy = best_col.y - py
        cdist = math.hypot(cdx, cdy)
        if cdist > 0:
            force_x += (cdx / cdist) * 1.5
            force_y += (cdy / cdist) * 1.5

    # 3. Arena boundary bounce
    margin = 70
    if px < margin: force_x += (margin - px) / margin * 2.0
    if px > env.WIDTH - margin: force_x -= (px - (env.WIDTH - margin)) / margin * 2.0
    if py < margin: force_y += (margin - py) / margin * 2.0
    if py > env.HEIGHT - margin: force_y -= (py - (env.HEIGHT - margin)) / margin * 2.0

    # Convert dominant vector direction to discrete action:
    # 0: Idle, 1: Up, 2: Down, 3: Left, 4: Right
    if abs(force_x) < 0.2 and abs(force_y) < 0.2:
        return 0
    if abs(force_x) > abs(force_y):
        return 4 if force_x > 0 else 3
    else:
        return 2 if force_y > 0 else 1


def train_cnn_agent(episodes: int = 15, steps_per_episode: int = 300):
    print("=" * 60)
    print("Training CNN-DRL Agent with Visual Frame Perception...")
    print(f"Target: {episodes} episodes | Device: {'cuda' if torch.cuda.is_available() else 'cpu'}")
    print("=" * 60)

    env = ArcadeSurvivalEnv(dda_enabled=True)
    agent = DQNAgent(num_actions=5)
    
    device = agent.device
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(agent.policy_net.parameters(), lr=3e-4)

    total_samples = 0
    start_time = time.time()

    for ep in range(1, episodes + 1):
        obs = env.reset()
        ep_loss = 0.0
        ep_steps = 0
        ep_reward = 0.0

        for step in range(steps_per_episode):
            # Get teacher action
            expert_act = get_expert_action(env)

            # Mix exploration: early on use expert, later let CNN decide
            if random.random() < 0.2:
                action = random.randint(0, 4)
            elif random.random() < 0.8:
                action = expert_act
            else:
                action = agent.select_action(obs, evaluate=False)

            # Train CNN to predict visual policy directly from the 84x84 frame stack
            state_tensor = torch.FloatTensor(obs).unsqueeze(0).to(device)
            target_tensor = torch.LongTensor([expert_act]).to(device)

            agent.policy_net.train()
            optimizer.zero_grad()
            logits = agent.policy_net(state_tensor)
            loss = criterion(logits, target_tensor)
            loss.backward()
            optimizer.step()

            ep_loss += loss.item()
            ep_steps += 1
            total_samples += 1

            # Step environment
            next_obs, reward, done, telem = env.step(action, dt=0.033)
            ep_reward += reward
            obs = next_obs

            if done:
                break

        avg_loss = ep_loss / max(1, ep_steps)
        print(f"Episode {ep:02d}/{episodes} | Steps: {ep_steps:3d} | Avg Loss: {avg_loss:.4f} | Survival: {telem['survival_time']:.1f}s | Score: {telem['score']}")

    # Save trained model weights
    agent.save(CHECKPOINT_PATH)
    elapsed = time.time() - start_time
    print("=" * 60)
    print(f"[OK] Training completed in {elapsed:.1f}s!")
    print(f"Checkpoint saved to: {CHECKPOINT_PATH}")
    print("The AI Agent can now be loaded directly in the game server.")
    print("=" * 60)


if __name__ == "__main__":
    train_cnn_agent(episodes=100, steps_per_episode=250)
