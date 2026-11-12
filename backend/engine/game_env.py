import random
import time
import math
from collections import deque
from typing import Dict, Any, Tuple, List, Optional
import numpy as np

from backend.engine.entities import Player, Enemy, Obstacle, Collectible
from backend.engine.difficulty import DifficultyManager

class ArcadeSurvivalEnv:
    """
    Core 2D Arcade Survival Game Environment with 5 Levels of escalating difficulty.
    Supports starting points, extraction destinations, obstacle density scaling, and guard count progression.
    """
    WIDTH = 600
    HEIGHT = 600
    OBS_SIZE = 84

    # Discrete Actions: 0: Idle, 1: Up, 2: Down, 3: Left, 4: Right
    ACTION_MEANINGS = {0: "Idle", 1: "Up", 2: "Down", 3: "Left", 4: "Right"}

    LEVEL_CONFIGS = {
        1: {
            "name": "Level 1: Infiltration Depot",
            "start_point": {"x": 70, "y": 530},
            "destination": {"x": 530, "y": 70, "radius": 32},
            "num_obstacles": 6,
            "initial_enemies": 2,
            "max_enemies": 3,
            "enemy_speed_multiplier": 0.9,
            "spawn_interval": 4.0,
            "collectibles_count": 3,
            "tier": "Recruit (Tier 1)",
            "enemy_pool": ["patroller", "chaser"],
            "description": "Infiltrate the outer depot. Evade the 2 guards and reach the Extraction Helipad."
        },
        2: {
            "name": "Level 2: Cargo Hangar",
            "start_point": {"x": 300, "y": 540},
            "destination": {"x": 300, "y": 65, "radius": 32},
            "num_obstacles": 10,
            "initial_enemies": 4,
            "max_enemies": 5,
            "enemy_speed_multiplier": 1.15,
            "spawn_interval": 3.2,
            "collectibles_count": 4,
            "tier": "Operative (Tier 2)",
            "enemy_pool": ["patroller", "chaser", "ambusher"],
            "description": "Heavy cargo maze ahead. 4 armed guards patrol the central storage bay."
        },
        3: {
            "name": "Level 3: Subterranean Corridors",
            "start_point": {"x": 65, "y": 300},
            "destination": {"x": 535, "y": 300, "radius": 32},
            "num_obstacles": 14,
            "initial_enemies": 6,
            "max_enemies": 7,
            "enemy_speed_multiplier": 1.4,
            "spawn_interval": 2.5,
            "collectibles_count": 5,
            "tier": "Veteran (Tier 3)",
            "enemy_pool": ["chaser", "patroller", "ambusher", "dasher"],
            "description": "High alert zone! 6 guards with flashlights patrol tight corridors."
        },
        4: {
            "name": "Level 4: High Security Block",
            "start_point": {"x": 70, "y": 70},
            "destination": {"x": 530, "y": 530, "radius": 32},
            "num_obstacles": 18,
            "initial_enemies": 8,
            "max_enemies": 9,
            "enemy_speed_multiplier": 1.65,
            "spawn_interval": 2.0,
            "collectibles_count": 6,
            "tier": "Elite Threat (Tier 4)",
            "enemy_pool": ["dasher", "ambusher", "chaser", "dasher"],
            "description": "Severe security grid. 8 agile mercenaries and heavy obstacle density."
        },
        5: {
            "name": "Level 5: Citadel Stronghold",
            "start_point": {"x": 70, "y": 530},
            "destination": {"x": 530, "y": 70, "radius": 34},
            "num_obstacles": 24,
            "initial_enemies": 10,
            "max_enemies": 12,
            "enemy_speed_multiplier": 1.9,
            "spawn_interval": 1.5,
            "collectibles_count": 7,
            "tier": "Maximum Nightmare (Tier 5)",
            "enemy_pool": ["dasher", "ambusher", "chaser"],
            "description": "Final Citadel Fortress! 10 elite guards garrisoned with lethal sweep speed."
        }
    }

    def __init__(self, dda_enabled: bool = True):
        self.dda_enabled = dda_enabled
        self.difficulty = DifficultyManager()
        self.frame_stack_size = 4
        self.frames = deque(maxlen=self.frame_stack_size)

        # Level System
        self.current_level = 1
        self.level_completed = False
        self.start_point = dict(self.LEVEL_CONFIGS[1]["start_point"])
        self.destination = dict(self.LEVEL_CONFIGS[1]["destination"])

        # Entities
        self.player: Player = Player(self.start_point["x"], self.start_point["y"])
        self.enemies: List[Enemy] = []
        self.obstacles: List[Obstacle] = []
        self.collectibles: List[Collectible] = []

        # Timers & Spawners
        self.spawn_enemy_timer = 0.0
        self.spawn_collectible_timer = 0.0
        self.start_time = time.time()
        self.last_update = time.time()

        # Telemetry & Performance Tracking
        self.total_damage_taken = 0.0
        self.total_collectibles_gathered = 0
        self.dodges_recorded = 0
        self.steps_survived = 0
        self.game_over = False
        self.final_survival_time = 0.0

        self.reset()

    def set_level(self, level: int):
        self.current_level = max(1, min(5, int(level)))
        self.reset()

    def next_level(self):
        if self.current_level < 5:
            self.current_level += 1
        self.reset()

    def get_level_info(self) -> Dict[str, Any]:
        cfg = self.LEVEL_CONFIGS[self.current_level]
        return {
            "level": self.current_level,
            "max_levels": 5,
            "name": cfg["name"],
            "description": cfg["description"],
            "tier": cfg["tier"],
            "num_obstacles": cfg["num_obstacles"],
            "initial_enemies": cfg["initial_enemies"],
            "enemy_speed_multiplier": cfg["enemy_speed_multiplier"],
            "start_point": self.start_point,
            "destination": self.destination,
            "level_completed": self.level_completed
        }

    def reset(self) -> np.ndarray:
        cfg = self.LEVEL_CONFIGS[self.current_level]
        self.start_point = dict(cfg["start_point"])
        self.destination = dict(cfg["destination"])
        self.level_completed = False

        # Reset player at starting point
        self.player = Player(self.start_point["x"], self.start_point["y"])
        self.enemies.clear()
        self.collectibles.clear()
        self.obstacles.clear()

        # Sync difficulty manager with level config
        self.difficulty.tier = cfg["tier"]
        self.difficulty.enemy_speed_multiplier = cfg["enemy_speed_multiplier"]
        self.difficulty.enemy_spawn_interval = cfg["spawn_interval"]
        self.difficulty.max_enemies = cfg["max_enemies"]
        self.difficulty.hazard_density = cfg["num_obstacles"]

        # Generate Level Obstacles (avoiding start point and destination)
        num_obstacles = cfg["num_obstacles"]
        attempts = 0
        while len(self.obstacles) < num_obstacles and attempts < 150:
            attempts += 1
            ow = random.randint(34, 72)
            oh = random.randint(34, 72)
            ox = random.randint(30, self.WIDTH - 100)
            oy = random.randint(30, self.HEIGHT - 100)

            # Keep start and destination completely clear
            dist_start = math.hypot(ox + ow/2 - self.start_point["x"], oy + oh/2 - self.start_point["y"])
            dist_dest = math.hypot(ox + ow/2 - self.destination["x"], oy + oh/2 - self.destination["y"])

            if dist_start > 95 and dist_dest > 95:
                idx = len(self.obstacles)
                if idx % 4 == 0:
                    otype = "bush"
                elif idx % 2 == 0:
                    otype = "crate"
                else:
                    otype = "wall"
                self.obstacles.append(Obstacle(ox, oy, ow, oh, obs_type=otype))

        # Initial Enemies for this level (distributed across arena, away from start)
        for _ in range(cfg["initial_enemies"]):
            self._spawn_enemy(force_away_from_start=True)

        # Initial Collectibles
        for _ in range(cfg["collectibles_count"]):
            self._spawn_collectible()

        self.start_time = time.time()
        self.last_update = time.time()
        self.total_damage_taken = 0.0
        self.total_collectibles_gathered = 0
        self.dodges_recorded = 0
        self.steps_survived = 0
        self.game_over = False
        self.final_survival_time = 0.0

        initial_frame = self._render_lowres_frame()
        self.frames.clear()
        for _ in range(self.frame_stack_size):
            self.frames.append(initial_frame)

        return self.get_observation()

    def _spawn_enemy(self, force_away_from_start: bool = False):
        if len(self.enemies) >= self.difficulty.max_enemies:
            return

        cfg = self.LEVEL_CONFIGS[self.current_level]
        etype = random.choice(cfg["enemy_pool"])

        if force_away_from_start:
            # Place enemy at a safe distance from player's starting point and clear of all obstacles
            for _ in range(30):
                ex = random.uniform(50, self.WIDTH - 50)
                ey = random.uniform(50, self.HEIGHT - 50)
                if math.hypot(ex - self.start_point["x"], ey - self.start_point["y"]) > 140:
                    if not any(obs.collides_with(ex, ey, 24.0) for obs in self.obstacles):
                        self.enemies.append(Enemy(ex, ey, enemy_type=etype, speed_multiplier=self.difficulty.enemy_speed_multiplier))
                        return

        # Perimeter or open zone spawn (guaranteeing clearance from obstacles)
        for _ in range(30):
            side = random.choice(["top", "bottom", "left", "right"])
            if side == "top":
                ex, ey = random.uniform(30, self.WIDTH - 30), 30
            elif side == "bottom":
                ex, ey = random.uniform(30, self.WIDTH - 30), self.HEIGHT - 30
            elif side == "left":
                ex, ey = 30, random.uniform(30, self.HEIGHT - 30)
            else:
                ex, ey = self.WIDTH - 30, random.uniform(30, self.HEIGHT - 30)

            if not any(obs.collides_with(ex, ey, 24.0) for obs in self.obstacles):
                self.enemies.append(Enemy(ex, ey, enemy_type=etype, speed_multiplier=self.difficulty.enemy_speed_multiplier))
                return

    def _spawn_collectible(self):
        cfg = self.LEVEL_CONFIGS[self.current_level]
        for _ in range(10):
            cx = random.uniform(40, self.WIDTH - 40)
            cy = random.uniform(40, self.HEIGHT - 40)
            if math.hypot(cx - self.start_point["x"], cy - self.start_point["y"]) > 50:
                ctype = random.choice(["coin", "coin", "health", "boost"])
                self.collectibles.append(Collectible(cx, cy, ctype))
                break

    def step(self, action: int, dt: float = 0.033) -> Tuple[np.ndarray, float, bool, Dict[str, Any]]:
        if self.game_over:
            return self.get_observation(), 0.0, True, self.get_telemetry()

        self.steps_survived += 1
        reward = 0.1  # Base survival reward per step

        # Process Action
        dx, dy = 0.0, 0.0
        if action == 1: dy = -1.0
        elif action == 2: dy = 1.0
        elif action == 3: dx = -1.0
        elif action == 4: dx = 1.0

        old_px, old_py = self.player.x, self.player.y

        # Smooth sliding collision resolution (test X and Y separately)
        if dx != 0:
            test_x = max(self.player.radius, min(self.WIDTH - self.player.radius, old_px + dx * self.player.speed))
            if not any(obs.collides_with(test_x, old_py, self.player.radius) for obs in self.obstacles):
                self.player.x = test_x

        if dy != 0:
            test_y = max(self.player.radius, min(self.HEIGHT - self.player.radius, old_py + dy * self.player.speed))
            if not any(obs.collides_with(self.player.x, test_y, self.player.radius) for obs in self.obstacles):
                self.player.y = test_y

        if dx != 0 or dy != 0:
            self.player.angle = math.atan2(dy, dx)
        self.player.update(dt)

        # Check if Player reached Destination (Win Condition!)
        dist_to_dest = math.hypot(self.player.x - self.destination["x"], self.player.y - self.destination["y"])
        reach_threshold = self.destination.get("radius", 32) + self.player.radius + 12
        if dist_to_dest <= reach_threshold:
            if not self.level_completed:
                self.level_completed = True
                bonus_score = 300 * self.current_level
                self.player.score += bonus_score
                reward += 150.0

        # Distance shaping reward towards destination
        old_dist = math.hypot(old_px - self.destination["x"], old_py - self.destination["y"])
        if dist_to_dest < old_dist:
            reward += 0.08

        # Spawn Timers
        self.spawn_enemy_timer += dt
        if self.spawn_enemy_timer >= self.difficulty.enemy_spawn_interval:
            self.spawn_enemy_timer = 0.0
            self._spawn_enemy()

        self.spawn_collectible_timer += dt
        if self.spawn_collectible_timer >= self.difficulty.collectible_spawn_interval:
            self.spawn_collectible_timer = 0.0
            cfg = self.LEVEL_CONFIGS[self.current_level]
            if len(self.collectibles) < cfg["collectibles_count"] + 3:
                self._spawn_collectible()

        # Update Enemies & Enemy Collisions
        for enemy in self.enemies:
            enemy.update(self.player.x, self.player.y, self.WIDTH, self.HEIGHT, dt, obstacles=self.obstacles, other_enemies=self.enemies)
            dist = math.hypot(self.player.x - enemy.x, self.player.y - enemy.y)

            # Hit Player
            if dist < (self.player.radius + enemy.radius):
                took_hit = self.player.take_damage(enemy.damage)
                if took_hit:
                    self.total_damage_taken += enemy.damage
                    reward -= 10.0
            elif dist < (self.player.radius + enemy.radius + 20):
                # Proximity dodge recorded
                self.dodges_recorded += 1
                reward += 0.05

        # Collectibles
        for col in self.collectibles[:]:
            dist = math.hypot(self.player.x - col.x, self.player.y - col.y)
            if dist < (self.player.radius + col.radius + 6):
                self.player.score += col.value
                self.total_collectibles_gathered += 1
                if col.type == "health":
                    self.player.heal(25.0)
                reward += 5.0
                self.collectibles.remove(col)

        if not self.player.alive and not self.game_over:
            self.game_over = True
            self.final_survival_time = time.time() - self.start_time
            reward -= 20.0

        # Frame capture
        current_frame = self._render_lowres_frame()
        self.frames.append(current_frame)

        return self.get_observation(), reward, (self.game_over or self.level_completed), self.get_telemetry()

    def _render_lowres_frame(self) -> np.ndarray:
        """
        Renders an 84x84 grayscale representation directly to a NumPy array for CNN processing.
        Channel values:
          0 = Background
          70 = Destination Zone
          100 = Obstacle
          150 = Collectible
          200 = Enemy
          255 = Player
        """
        grid = np.zeros((self.OBS_SIZE, self.OBS_SIZE), dtype=np.uint8)
        scale_x = self.OBS_SIZE / self.WIDTH
        scale_y = self.OBS_SIZE / self.HEIGHT

        # Draw Destination Zone
        dx = int(self.destination["x"] * scale_x)
        dy = int(self.destination["y"] * scale_y)
        dr = max(2, int(self.destination["radius"] * scale_x))
        grid[max(0, dy-dr):min(self.OBS_SIZE, dy+dr+1), max(0, dx-dr):min(self.OBS_SIZE, dx+dr+1)] = 70

        # Draw Obstacles
        for obs in self.obstacles:
            x0 = int(obs.x * scale_x)
            y0 = int(obs.y * scale_y)
            x1 = min(self.OBS_SIZE, int((obs.x + obs.width) * scale_x))
            y1 = min(self.OBS_SIZE, int((obs.y + obs.height) * scale_y))
            grid[y0:y1, x0:x1] = 100

        # Draw Collectibles
        for col in self.collectibles:
            cx = int(col.x * scale_x)
            cy = int(col.y * scale_y)
            if 0 <= cx < self.OBS_SIZE and 0 <= cy < self.OBS_SIZE:
                grid[max(0, cy-1):min(self.OBS_SIZE, cy+2), max(0, cx-1):min(self.OBS_SIZE, cx+2)] = 150

        # Draw Enemies
        for en in self.enemies:
            ex = int(en.x * scale_x)
            ey = int(en.y * scale_y)
            if 0 <= ex < self.OBS_SIZE and 0 <= ey < self.OBS_SIZE:
                grid[max(0, ey-2):min(self.OBS_SIZE, ey+3), max(0, ex-2):min(self.OBS_SIZE, ex+3)] = 200

        # Draw Player
        if self.player.alive:
            px = int(self.player.x * scale_x)
            py = int(self.player.y * scale_y)
            if 0 <= px < self.OBS_SIZE and 0 <= py < self.OBS_SIZE:
                grid[max(0, py-2):min(self.OBS_SIZE, py+3), max(0, px-2):min(self.OBS_SIZE, px+3)] = 255

        return grid

    def get_observation(self) -> np.ndarray:
        """Returns stacked 4-frame observation normalized to [0.0, 1.0] shape: (4, 84, 84)"""
        stacked = np.stack(self.frames, axis=0).astype(np.float32) / 255.0
        return stacked

    def get_telemetry(self) -> Dict[str, Any]:
        if self.game_over:
            survival_sec = self.final_survival_time
        else:
            survival_sec = time.time() - self.start_time
        return {
            "level": self.current_level,
            "level_completed": self.level_completed,
            "survival_time": round(survival_sec, 1),
            "score": self.player.score,
            "health": round(self.player.health, 1),
            "enemies_count": len(self.enemies),
            "damage_taken": round(self.total_damage_taken, 1),
            "collectibles_gathered": self.total_collectibles_gathered,
            "dodges_recorded": self.dodges_recorded,
            "difficulty": self.difficulty.to_dict(),
            "game_over": self.game_over,
            "start_point": self.start_point,
            "destination": self.destination
        }

    def get_render_state(self) -> Dict[str, Any]:
        """Provides full high-res object state for the HTML5 canvas renderer."""
        return {
            "level": self.current_level,
            "level_completed": self.level_completed,
            "level_info": self.get_level_info(),
            "start_point": self.start_point,
            "destination": self.destination,
            "player": self.player.to_dict(),
            "enemies": [e.to_dict() for e in self.enemies],
            "obstacles": [o.to_dict() for o in self.obstacles],
            "collectibles": [c.to_dict() for c in self.collectibles],
            "telemetry": self.get_telemetry()
        }
