class DashboardVisualizer {
  constructor() {
    this.initChart();
    this.cnnCanvas = document.getElementById("cnnCanvas");
    this.cnnCtx = this.cnnCanvas ? this.cnnCanvas.getContext("2d") : null;
    this.lastFeedback = "";
  }

  initChart() {
    const ctx = document.getElementById("telemetryChart").getContext("2d");
    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Vitality (HP)",
            data: [],
            borderColor: "#00e676",
            backgroundColor: "rgba(0, 230, 118, 0.12)",
            tension: 0.25,
            fill: true,
            pointRadius: 0,
            borderWidth: 2
          },
          {
            label: "Diamonds 💎",
            data: [],
            borderColor: "#00e5ff",
            backgroundColor: "rgba(0, 229, 255, 0.08)",
            tension: 0.25,
            fill: false,
            pointRadius: 0,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        animation: false,
        scales: {
          x: { display: false },
          y: {
            min: 0,
            grid: { color: "#242e3f" },
            ticks: { color: "#8b99ad", font: { size: 10 } }
          }
        },
        plugins: {
          legend: {
            labels: { color: "#8b99ad", boxWidth: 12, font: { size: 10, weight: "bold" } }
          }
        }
      }
    });
  }

  updateMetrics(telemetry) {
    if (!this.chart) return;

    if (telemetry.survival_time <= 0.1 && this.chart.data.labels.length > 10) {
      this.chart.data.labels = [];
      this.chart.data.datasets[0].data = [];
      this.chart.data.datasets[1].data = [];
    }

    if (telemetry.game_over) {
      // Lock chart display upon game over
      return;
    }

    const timeLabel = telemetry.survival_time + "s";
    if (this.chart.data.labels.length > 30) {
      this.chart.data.labels.shift();
      this.chart.data.datasets[0].data.shift();
      this.chart.data.datasets[1].data.shift();
    }

    this.chart.data.labels.push(timeLabel);
    this.chart.data.datasets[0].data.push(telemetry.health);
    this.chart.data.datasets[1].data.push(telemetry.score);
    this.chart.update("none");

    // Update LLM Feedback Log if changed
    const diff = telemetry.difficulty || {};
    const feedback = diff.narrative_feedback;
    if (feedback && feedback !== this.lastFeedback) {
      this.lastFeedback = feedback;
      this.appendFeedbackLog(diff.tier, feedback, diff.challenge_event);
    }
  }

  appendFeedbackLog(tier, text, event) {
    const box = document.getElementById("llm-log-box");
    if (!box) return;

    const entry = document.createElement("div");
    entry.className = "log-entry";
    if (event && event !== "None" && event !== "Standard") {
      entry.className += " alert";
    }

    const timeStr = new Date().toLocaleTimeString();
    entry.innerHTML = `
      <span class="time">[HQ TACTICAL ${timeStr}] Tier: <strong>${tier}</strong> &bull; Event: ${event || "Standard"}</span>
      <div>${text}</div>
    `;

    box.appendChild(entry);
    box.scrollTop = box.scrollHeight;
  }

  renderCNNActivation(matrix) {
    if (!this.cnnCtx || !matrix || matrix.length === 0) return;

    const rows = matrix.length;
    const cols = matrix[0].length;
    const cellW = this.cnnCanvas.width / cols;
    const cellH = this.cnnCanvas.height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = matrix[r][c]; // 0 - 255
        // Heatmap: Hunter Assassin palette (Navy -> Cyan -> Orange -> White)
        const norm = val / 255;
        let red = 0, green = 0, blue = 0;

        if (norm < 0.4) {
          const t = norm / 0.4;
          red = Math.floor(10 + t * 20);
          green = Math.floor(20 + t * 180);
          blue = Math.floor(40 + t * 215);
        } else if (norm < 0.8) {
          const t = (norm - 0.4) / 0.4;
          red = Math.floor(30 + t * 225);
          green = Math.floor(200 - t * 80);
          blue = Math.floor(255 - t * 220);
        } else {
          const t = (norm - 0.8) / 0.2;
          red = 255;
          green = Math.floor(120 + t * 135);
          blue = Math.floor(35 + t * 220);
        }

        this.cnnCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        this.cnnCtx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }
  }

  renderQValues(qValues) {
    if (!qValues || qValues.length < 5) return;
    // Softmax-like normalization for visual representation
    const maxQ = Math.max(...qValues);
    const expQ = qValues.map(v => Math.exp(v - maxQ));
    const sumExp = expQ.reduce((a, b) => a + b, 0);
    const probs = expQ.map(v => Math.round((v / sumExp) * 100));

    for (let i = 0; i < 5; i++) {
      const el = document.getElementById(`q-${i}`);
      if (el) {
        el.style.width = `${probs[i]}%`;
      }
    }
  }
}
