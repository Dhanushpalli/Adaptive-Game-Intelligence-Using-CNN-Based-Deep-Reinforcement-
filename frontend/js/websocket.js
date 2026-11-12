class GameWebSocket {
  constructor(onStateReceived) {
    this.onStateReceived = onStateReceived;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.currentAction = 0; // 0: Idle, 1: Up, 2: Down, 3: Left, 4: Right
    this.init();
  }

  init() {
    const isHttps = window.location.protocol === "https:";
    const host = window.location.host || "localhost:8000";
    const protocol = isHttps ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${host}/ws/game`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected to game server.");
      this.reconnectAttempts = 0;
      const statusEl = document.getElementById("ollama-status");
      if (statusEl) statusEl.textContent = "Online";
    };

    this.ws.onmessage = (event) => {
      try {
        const state = JSON.parse(event.data);
        if (state.ollama_active !== undefined) {
          const statusEl = document.getElementById("ollama-status");
          if (statusEl) {
            statusEl.textContent = state.ollama_active ? "Active (Ollama LLM)" : "Rule Heuristic";
          }
        }
        if (this.onStateReceived) {
          this.onStateReceived(state);
        }
      } catch (err) {
        console.error("Error parsing game state:", err);
      }
    };

    this.ws.onclose = () => {
      console.warn("WebSocket disconnected. Retrying in 2 seconds...");
      const statusEl = document.getElementById("ollama-status");
      if (statusEl) statusEl.textContent = "Reconnecting...";
      setTimeout(() => this.init(), 2000);
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  }

  sendAction(action) {
    this.currentAction = action;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: action }));
    }
  }

  setMode(mode) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ mode: mode }));
    }
  }

  setLevel(level) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ level: parseInt(level) }));
    }
  }

  nextLevel() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ next_level: true }));
    }
  }

  reset() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ reset: true }));
    }
  }
}
