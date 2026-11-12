from typing import Dict, Any

DDA_SYSTEM_PROMPT = """You are an Adaptive Game Master AI for an arcade survival video game.
Your task is to analyze real-time player telemetry and adjust the game difficulty to keep the player in an optimal "Flow State" (neither overwhelmed nor bored).

Output STRICT, VALID JSON ONLY. Do not include markdown code block ticks (```), commentary, or explanations outside the JSON object.

JSON Schema to follow:
{
  "difficulty_tier": "Novice" | "Balanced" | "Challenger" | "Nightmare",
  "enemy_speed_multiplier": float (between 0.7 and 2.2),
  "spawn_rate_multiplier": float (between 0.6 and 2.2),
  "max_enemies": int (between 4 and 20),
  "challenge_event": "Standard" | "Speed Surge" | "Swarm Wave" | "Resource Scarcity" | "Boss Threat",
  "narrative_feedback": "A short, engaging 1-2 sentence tactical observation and advice directly to the player."
}
"""

def generate_dda_prompt(telemetry: Dict[str, Any]) -> str:
    diff = telemetry.get("difficulty", {})
    return f"""Analyze current gameplay telemetry:
- Survival Time: {telemetry.get('survival_time', 0)} seconds
- Current Health: {telemetry.get('health', 100)} / 100
- Score: {telemetry.get('score', 0)}
- Damage Taken: {telemetry.get('damage_taken', 0)}
- Dodges Recorded: {telemetry.get('dodges_recorded', 0)}
- Collectibles Picked Up: {telemetry.get('collectibles_gathered', 0)}
- Active Enemies: {telemetry.get('enemies_count', 0)}
- Current Tier: {diff.get('tier', 'Balanced')}
- Current Enemy Speed Multiplier: {diff.get('enemy_speed_multiplier', 1.0)}

Respond with the JSON object containing difficulty parameter recommendations and narrative feedback.
"""
