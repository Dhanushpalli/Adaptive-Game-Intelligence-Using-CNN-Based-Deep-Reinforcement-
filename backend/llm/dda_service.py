import json
import logging
import re
from typing import Dict, Any, Optional
import requests
from backend.llm.prompts import DDA_SYSTEM_PROMPT, generate_dda_prompt

logger = logging.getLogger("DDA_Service")

class DDAService:
    def __init__(self, model_name: str = "llama3.2:1b", ollama_host: str = "http://localhost:11434"):
        self.model_name = model_name
        self.ollama_host = ollama_host
        self.last_adjustment: Optional[Dict[str, Any]] = None
        self.is_connected = False

    def check_connection(self) -> bool:
        try:
            res = requests.get(f"{self.ollama_host}/api/tags", timeout=1.5)
            self.is_connected = (res.status_code == 200)
            return self.is_connected
        except Exception:
            self.is_connected = False
            return False

    def evaluate_gameplay(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends telemetry to local Ollama. If Ollama is unavailable, uses the fallback heuristic.
        """
        prompt = generate_dda_prompt(telemetry)

        if self.check_connection():
            try:
                payload = {
                    "model": self.model_name,
                    "prompt": prompt,
                    "system": DDA_SYSTEM_PROMPT,
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.4,
                        "num_predict": 180
                    }
                }
                res = requests.post(f"{self.ollama_host}/api/generate", json=payload, timeout=15.0)
                if res.status_code == 200:
                    raw_text = res.json().get("response", "")
                    parsed = self._extract_json(raw_text)
                    if parsed:
                        self.last_adjustment = parsed
                        return parsed
            except Exception as e:
                logger.warning(f"Ollama request error: {e}. Falling back to rule-based DDA.")

        # Fallback Heuristic
        fallback = self._heuristic_fallback(telemetry)
        self.last_adjustment = fallback
        return fallback

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        try:
            # Direct parse
            return json.loads(text.strip())
        except Exception:
            # Regex extraction for JSON block
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except Exception:
                    pass
        return None

    def _heuristic_fallback(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Intelligent rule-based adaptation when Ollama is offline/starting up.
        """
        survival = telemetry.get("survival_time", 0)
        health = telemetry.get("health", 100)
        dodges = telemetry.get("dodges_recorded", 0)
        collectibles = telemetry.get("collectibles_gathered", 0)

        # Performance score estimation
        performance = (survival * 0.5) + (dodges * 1.5) + (collectibles * 2.0) - ((100 - health) * 0.4)

        if performance < 20 or health < 30:
            return {
                "difficulty_tier": "Mercy / Novice",
                "enemy_speed_multiplier": 0.85,
                "spawn_rate_multiplier": 0.8,
                "max_enemies": 5,
                "challenge_event": "Health Resupply",
                "narrative_feedback": "Tactical analysis: Critical damage sustained. Scaling back enemy aggression."
            }
        elif performance > 80 and health > 70:
            return {
                "difficulty_tier": "Challenger",
                "enemy_speed_multiplier": 1.35,
                "spawn_rate_multiplier": 1.3,
                "max_enemies": 12,
                "challenge_event": "Speed Surge",
                "narrative_feedback": "Exceptional evasion detected! Enemy velocity and numbers increased."
            }
        elif performance > 150:
            return {
                "difficulty_tier": "Nightmare",
                "enemy_speed_multiplier": 1.6,
                "spawn_rate_multiplier": 1.5,
                "max_enemies": 16,
                "challenge_event": "Swarm Wave",
                "narrative_feedback": "Maximum threat protocol engaged! Swarm incoming."
            }
        else:
            return {
                "difficulty_tier": "Balanced",
                "enemy_speed_multiplier": 1.05,
                "spawn_rate_multiplier": 1.05,
                "max_enemies": 8,
                "challenge_event": "Standard",
                "narrative_feedback": "Optimal combat rhythm achieved. Maintaining steady operational pressure."
            }
