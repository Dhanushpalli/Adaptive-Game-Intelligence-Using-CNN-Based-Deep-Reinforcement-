import math
import random
from typing import List, Tuple, Dict, Any

class Player:
    def __init__(self, x: float, y: float, speed: float = 5.4, max_health: float = 100.0):
        self.x = x
        self.y = y
        self.radius = 14
        self.speed = speed
        self.max_health = max_health
        self.health = max_health
        self.score = 0
        self.alive = True
        self.invulnerable_timer = 0.0
        self.angle = 0.0

    def move(self, dx: float, dy: float, bounds_w: float, bounds_h: float):
        if not self.alive:
            return
        # Normalize diagonal movement
        if dx != 0 and dy != 0:
            norm = math.sqrt(dx * dx + dy * dy)
            dx /= norm
            dy /= norm

        if dx != 0 or dy != 0:
            self.angle = math.atan2(dy, dx)

        self.x = max(self.radius, min(bounds_w - self.radius, self.x + dx * self.speed))
        self.y = max(self.radius, min(bounds_h - self.radius, self.y + dy * self.speed))

    def take_damage(self, amount: float):
        if self.invulnerable_timer > 0:
            return False
        self.health = max(0.0, self.health - amount)
        self.invulnerable_timer = 0.75  # Grace period to allow tactical disengagement
        if self.health <= 0:
            self.alive = False
        return True

    def heal(self, amount: float):
        self.health = min(self.max_health, self.health + amount)

    def update(self, dt: float):
        if self.invulnerable_timer > 0:
            self.invulnerable_timer = max(0.0, self.invulnerable_timer - dt)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "x": round(self.x, 1),
            "y": round(self.y, 1),
            "radius": self.radius,
            "health": round(self.health, 1),
            "max_health": self.max_health,
            "score": self.score,
            "alive": self.alive,
            "invulnerable": self.invulnerable_timer > 0,
            "angle": round(self.angle, 3)
        }


def check_line_of_sight(x1: float, y1: float, x2: float, y2: float, obstacles) -> bool:
    """
    Returns True if direct line of sight between (x1, y1) and (x2, y2)
    is not blocked by opaque obstacles (walls and crates).
    Bushes allow stealth camo passthrough.
    """
    if not obstacles:
        return True

    def ccw(ax, ay, bx, by, cx, cy):
        return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax)

    def segments_intersect(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y):
        return (ccw(p1x, p1y, p3x, p3y, p4x, p4y) != ccw(p2x, p2y, p3x, p3y, p4x, p4y) and
                ccw(p1x, p1y, p2x, p2y, p3x, p3y) != ccw(p1x, p1y, p2x, p2y, p4x, p4y))

    for obs in obstacles:
        if getattr(obs, "obs_type", "wall") == "bush":
            continue
        rx, ry, rw, rh = obs.x, obs.y, obs.width, obs.height
        # Bounding box quick reject
        if min(x1, x2) > rx + rw or max(x1, x2) < rx:
            continue
        if min(y1, y2) > ry + rh or max(y1, y2) < ry:
            continue

        # Check line against the 4 edges of the obstacle
        if segments_intersect(x1, y1, x2, y2, rx, ry, rx + rw, ry): return False
        if segments_intersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh): return False
        if segments_intersect(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh): return False
        if segments_intersect(x1, y1, x2, y2, rx, ry, rx, ry + rh): return False

    return True


class Enemy:
    TYPES = ["chaser", "patroller", "ambusher", "dasher"]

    def __init__(self, x: float, y: float, enemy_type: str = "chaser", speed_multiplier: float = 1.0):
        self.x = x
        self.y = y
        self.radius = 13
        self.type = enemy_type
        self.base_speed = 2.4 * speed_multiplier
        self.damage = 15.0
        
        # Initial patrol angle & velocity
        initial_angle = random.uniform(0, 2 * math.pi)
        self.vx = math.cos(initial_angle) * self.base_speed
        self.vy = math.sin(initial_angle) * self.base_speed
        self.angle = initial_angle

        self.target_timer = 0.0
        self.patrol_timer = random.uniform(2.0, 4.0)
        self.stuck_counter = 0
        self.last_x = self.x
        self.last_y = self.y
        self.is_alerted = False

        if self.type == "dasher":
            self.radius = 11
            self.base_speed = 3.6 * speed_multiplier
            self.damage = 25.0
        elif self.type == "ambusher":
            self.radius = 15
            self.base_speed = 2.0 * speed_multiplier
            self.damage = 30.0

    def update(self, player_x: float, player_y: float, bounds_w: float, bounds_h: float, dt: float, obstacles=None, other_enemies=None):
        # 1. Vision Cone & Stealth Detection (Flashlight cone 55 deg / 135px, Hearing range 45px)
        dx_p = player_x - self.x
        dy_p = player_y - self.y
        dist_p = math.hypot(dx_p, dy_p)

        angle_to_player = math.atan2(dy_p, dx_p)
        diff_angle = angle_to_player - self.angle
        while diff_angle < -math.pi: diff_angle += 2 * math.pi
        while diff_angle > math.pi: diff_angle -= 2 * math.pi

        has_los = check_line_of_sight(self.x, self.y, player_x, player_y, obstacles)
        in_cone = (dist_p < 135.0 and abs(diff_angle) < (55.0 * math.pi / 360.0) and has_los)
        in_hearing = (dist_p < 48.0)  # Very close sound trigger
        self.is_alerted = in_cone or in_hearing

        # 2. Movement Behavior based on alert status
        if self.is_alerted:
            # Alerted: Turn and pursue player
            if dist_p > 1.0:
                self.vx = (dx_p / dist_p) * self.base_speed
                self.vy = (dy_p / dist_p) * self.base_speed
                self.angle = angle_to_player
        else:
            # Not Alerted: Active patrolling with periodic direction adjustments
            self.patrol_timer -= dt
            if self.patrol_timer <= 0:
                self.patrol_timer = random.uniform(2.5, 5.0)
                # Rotate patrol heading smoothly
                turn = random.uniform(-math.pi * 0.6, math.pi * 0.6)
                self.angle = (self.angle + turn) % (2 * math.pi)
                self.vx = math.cos(self.angle) * self.base_speed
                self.vy = math.sin(self.angle) * self.base_speed

            # Ensure minimum velocity so guard is never idle
            speed_current = math.hypot(self.vx, self.vy)
            if speed_current < self.base_speed * 0.5:
                self.vx = math.cos(self.angle) * self.base_speed
                self.vy = math.sin(self.angle) * self.base_speed

        # 3. Guard-to-Guard Separation (prevents enemy clumping)
        if other_enemies:
            for other in other_enemies:
                if other is self:
                    continue
                sep_dx = self.x - other.x
                sep_dy = self.y - other.y
                sep_dist = math.hypot(sep_dx, sep_dy)
                min_sep = self.radius + other.radius + 8.0
                if 0 < sep_dist < min_sep:
                    push_mag = (min_sep - sep_dist) / min_sep * 1.5
                    self.vx += (sep_dx / sep_dist) * push_mag
                    self.vy += (sep_dy / sep_dist) * push_mag

        # 4. Independent Axis Obstacle Collision & Wall-Sliding
        test_x = self.x + self.vx
        test_y = self.y + self.vy

        collided_x = False
        collided_y = False

        if obstacles:
            for obs in obstacles:
                if obs.collides_with(test_x, self.y, self.radius):
                    collided_x = True
                if obs.collides_with(self.x, test_y, self.radius):
                    collided_y = True

        # Resolve X movement
        if collided_x:
            self.vx = -self.vx * 0.7  # Deflect away
        else:
            self.x = test_x

        # Resolve Y movement
        if collided_y:
            self.vy = -self.vy * 0.7  # Deflect away
        else:
            self.y = test_y

        # If hit on both axes (corner or perpendicular wall): Rotate 90 deg
        if collided_x and collided_y:
            self.angle += random.choice([math.pi * 0.5, -math.pi * 0.5])
            self.vx = math.cos(self.angle) * self.base_speed
            self.vy = math.sin(self.angle) * self.base_speed

        # 5. Anti-Stuck Failsafe
        moved_dist = math.hypot(self.x - self.last_x, self.y - self.last_y)
        if moved_dist < 0.25:
            self.stuck_counter += 1
        else:
            self.stuck_counter = 0
        self.last_x = self.x
        self.last_y = self.y

        if self.stuck_counter >= 3:
            # Force unstuck: immediately steer into open space
            escape_angle = random.uniform(0, 2 * math.pi)
            self.vx = math.cos(escape_angle) * self.base_speed
            self.vy = math.sin(escape_angle) * self.base_speed
            self.angle = escape_angle
            self.x += self.vx * 1.2
            self.y += self.vy * 1.2
            self.stuck_counter = 0

        # 6. Arena Boundary Bounce
        pad = self.radius + 2.0
        if self.x <= pad:
            self.x = pad
            self.vx = abs(self.vx)
            self.angle = math.atan2(self.vy, self.vx)
        elif self.x >= bounds_w - pad:
            self.x = bounds_w - pad
            self.vx = -abs(self.vx)
            self.angle = math.atan2(self.vy, self.vx)

        if self.y <= pad:
            self.y = pad
            self.vy = abs(self.vy)
            self.angle = math.atan2(self.vy, self.vx)
        elif self.y >= bounds_h - pad:
            self.y = bounds_h - pad
            self.vy = -abs(self.vy)
            self.angle = math.atan2(self.vy, self.vx)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "x": round(self.x, 1),
            "y": round(self.y, 1),
            "radius": self.radius,
            "type": self.type,
            "angle": round(self.angle, 3),
            "alerted": bool(self.is_alerted)
        }


class Obstacle:
    def __init__(self, x: float, y: float, width: float, height: float, obs_type: str = "wall"):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.obs_type = obs_type  # "wall", "crate", "bush"

    def collides_with(self, px: float, py: float, radius: float) -> bool:
        # Closest point on rectangle to circle
        closest_x = max(self.x, min(px, self.x + self.width))
        closest_y = max(self.y, min(py, self.y + self.height))
        dx = px - closest_x
        dy = py - closest_y
        return (dx * dx + dy * dy) < (radius * radius)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "x": round(self.x, 1),
            "y": round(self.y, 1),
            "width": self.width,
            "height": self.height,
            "type": self.obs_type
        }


class Collectible:
    TYPES = ["coin", "health", "boost"]

    def __init__(self, x: float, y: float, item_type: str = "coin"):
        self.x = x
        self.y = y
        self.radius = 8
        self.type = item_type
        if self.type == "coin":
            self.value = 50
        elif self.type == "health":
            self.value = 25
        elif self.type == "boost":
            self.value = 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "x": round(self.x, 1),
            "y": round(self.y, 1),
            "radius": self.radius,
            "type": self.type,
            "value": self.value
        }
