from typing import Dict, Any

class DifficultyManager:
    """
    Manages dynamic game difficulty knobs and handles updates from LLM or heuristics.
    """
    def __init__(self):
        # Base settings
        self.tier = "Balanced"
        self.enemy_spawn_interval = 2.0      # seconds between enemy spawns
        self.enemy_speed_multiplier = 1.0    # 0.6x - 2.5x
        self.max_enemies = 8                 # maximum concurrent enemies
        self.collectible_spawn_interval = 3.5
        self.hazard_density = 4              # number of obstacles
        self.narrative_feedback = "Welcome agent. Game systems calibrated to standard baseline."
        self.challenge_event = "None"
        self.adjustment_count = 0

    def apply_llm_adjustment(self, data: Dict[str, Any]):
        """
        Safely applies sanitized LLM difficulty recommendations.
        """
        if not isinstance(data, dict):
            return

        if "difficulty_tier" in data and isinstance(data["difficulty_tier"], str):
            self.tier = data["difficulty_tier"]

        if "enemy_speed_multiplier" in data:
            try:
                val = float(data["enemy_speed_multiplier"])
                self.enemy_speed_multiplier = max(0.5, min(2.5, val))
            except (ValueError, TypeError):
                pass

        if "spawn_rate_multiplier" in data:
            try:
                # Lower interval = faster spawn
                rate = float(data["spawn_rate_multiplier"])
                base_interval = 2.0
                clamped_rate = max(0.5, min(2.5, rate))
                self.enemy_spawn_interval = base_interval / clamped_rate
            except (ValueError, TypeError):
                pass

        if "max_enemies" in data:
            try:
                val = int(data["max_enemies"])
                self.max_enemies = max(3, min(25, val))
            except (ValueError, TypeError):
                pass

        if "narrative_feedback" in data and data["narrative_feedback"]:
            self.narrative_feedback = str(data["narrative_feedback"])

        if "challenge_event" in data and data["challenge_event"]:
            self.challenge_event = str(data["challenge_event"])

        self.adjustment_count += 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tier": self.tier,
            "enemy_spawn_interval": round(self.enemy_spawn_interval, 2),
            "enemy_speed_multiplier": round(self.enemy_speed_multiplier, 2),
            "max_enemies": self.max_enemies,
            "hazard_density": self.hazard_density,
            "narrative_feedback": self.narrative_feedback,
            "challenge_event": self.challenge_event,
            "adjustment_count": self.adjustment_count
        }
