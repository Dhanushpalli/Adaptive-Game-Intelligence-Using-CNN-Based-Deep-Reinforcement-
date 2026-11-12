document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // Visualizer and Chart manager
  const visualizer = new DashboardVisualizer();

  // Audio SFX System (Web Audio API)
  class SoundManager {
    constructor() {
      this.enabled = true;
      this.ctx = null;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    playGem() {
      if (!this.enabled) return;
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = "sine";
        osc2.type = "triangle";
        osc1.frequency.setValueAtTime(1046.5, now);
        osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.12);
        osc2.frequency.setValueAtTime(2093.0, now + 0.05);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.05);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
      } catch (e) {}
    }

    playAlert() {
      if (!this.enabled) return;
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.15);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      } catch (e) {}
    }

    playDash() {
      if (!this.enabled) return;
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);
      } catch (e) {}
    }

    playHit() {
      if (!this.enabled) return;
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      } catch (e) {}
    }

    playWinLevel() {
      if (!this.enabled) return;
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.18, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.35);
        });
      } catch (e) {}
    }

    playGameOver() {
      this.playAssassinDead();
    }

    playAssassinDead() {
      if (!this.enabled) return;
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;

        // 1. Heavy tactical sub-bass impact drop (elimination thud)
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = "sawtooth";
        subOsc.frequency.setValueAtTime(160, now);
        subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.55);

        subGain.gain.setValueAtTime(0.35, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.65);

        // 2. High-frequency vitals flatline sound
        const flatOsc = this.ctx.createOscillator();
        const flatGain = this.ctx.createGain();
        flatOsc.type = "sine";
        flatOsc.frequency.setValueAtTime(880, now + 0.08);

        flatGain.gain.setValueAtTime(0.001, now);
        flatGain.gain.setValueAtTime(0.2, now + 0.08);
        flatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

        flatOsc.connect(flatGain);
        flatGain.connect(this.ctx.destination);
        flatOsc.start(now + 0.08);
        flatOsc.stop(now + 0.95);

        // 3. Clear Voice Annunciation: "Assassin dead"
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance("Assassin dead");
          utter.rate = 0.95;
          utter.pitch = 0.85;
          utter.volume = 1.0;
          window.speechSynthesis.speak(utter);
        }
      } catch (e) {
        console.warn("Assassin dead sound error:", e);
      }
    }
  }

  const sfx = new SoundManager();

  // Floating Combat & Diamond Texts
  const floatingTexts = [];
  function addFloatingText(x, y, text, color = "#00e5ff") {
    floatingTexts.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y - 10,
      text: text,
      color: color,
      alpha: 1.0,
      vy: -1.6
    });
  }

  // Sparkling particle effects
  const particles = [];
  function spawnSparkles(x, y, color = "#00e5ff", count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.0;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 2 + Math.random() * 3,
        alpha: 1.0
      });
    }
  }

  // State Tracking
  let lastScore = 0;
  let lastHealth = 100;
  let currentLevel = 1;
  let hasHandledWin = false;
  let hasHandledDeath = false;
  let playerTrail = []; // Hunter Assassin orange motion curve trail
  let targetWaypoint = null; // Click-to-Move waypoint {x, y}
  let isAlertedGlobal = false;
  let lastAlertSoundTime = 0;
  let lastPlayerPos = { x: 300, y: 300, angle: 0 };

  // Keys active state
  const keysPressed = {};
  let currentAction = 0; // 0: Idle, 1: Up, 2: Down, 3: Left, 4: Right

  // WebSocket Manager
  const wsManager = new GameWebSocket((state) => {
    renderGame(state);
  });

  // Sound Button
  const btnSound = document.getElementById("btn-sound");
  btnSound.addEventListener("click", () => {
    sfx.enabled = !sfx.enabled;
    if (sfx.enabled) {
      btnSound.classList.add("active");
      btnSound.textContent = "🔊 SFX ON";
      sfx.ensureContext();
    } else {
      btnSound.classList.remove("active");
      btnSound.textContent = "🔇 SFX OFF";
    }
  });

  // Keyboard Input Listeners
  window.addEventListener("keydown", (e) => {
    sfx.ensureContext();
    if (e.code === "Space" || e.code === "Enter") {
      if (!levelWinOverlay.classList.contains("hidden")) {
        levelWinOverlay.classList.add("hidden");
        wsManager.nextLevel();
        return;
      }
      if (!campaignWinOverlay.classList.contains("hidden")) {
        campaignWinOverlay.classList.add("hidden");
        wsManager.setLevel(1);
        return;
      }
      if (!gameOverOverlay.classList.contains("hidden")) {
        gameOverOverlay.classList.add("hidden");
        wsManager.reset();
        return;
      }
    }
    const key = e.key.toLowerCase();
    keysPressed[key] = true;
    targetWaypoint = null;
    updateKeyAction();
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    keysPressed[key] = false;
    updateKeyAction();
  });

  function updateKeyAction() {
    let action = 0;
    if (keysPressed["w"] || keysPressed["arrowup"]) action = 1;
    else if (keysPressed["s"] || keysPressed["arrowdown"]) action = 2;
    else if (keysPressed["a"] || keysPressed["arrowleft"]) action = 3;
    else if (keysPressed["d"] || keysPressed["arrowright"]) action = 4;

    if (action !== currentAction) {
      currentAction = action;
      wsManager.sendAction(currentAction);
    }
  }

  // Click-to-Move / Tap Navigation (Hunter Assassin Control)
  canvas.addEventListener("click", (e) => {
    sfx.ensureContext();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    targetWaypoint = { x: clickX, y: clickY };
    sfx.playDash();
    spawnSparkles(clickX, clickY, "#ff8c00", 6);
  });

  // UI Buttons & Modals
  const btnHuman = document.getElementById("btn-mode-human");
  const btnAI = document.getElementById("btn-mode-ai");
  const btnReset = document.getElementById("btn-reset");
  const btnOverlayRestart = document.getElementById("btn-overlay-restart");
  const btnNextLevel = document.getElementById("btn-next-level");
  const btnCampaignRestart = document.getElementById("btn-campaign-restart");

  const gameOverOverlay = document.getElementById("game-overlay");
  const levelWinOverlay = document.getElementById("level-complete-overlay");
  const campaignWinOverlay = document.getElementById("campaign-win-overlay");

  // Level selector buttons
  const lvlButtons = document.querySelectorAll(".lvl-btn");
  lvlButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lvl = parseInt(btn.getAttribute("data-lvl"));
      hideAllModals();
      targetWaypoint = null;
      playerTrail = [];
      wsManager.setLevel(lvl);
    });
  });

  btnHuman.addEventListener("click", () => {
    btnHuman.classList.add("active");
    btnAI.classList.remove("active");
    wsManager.setMode("human");
  });

  btnAI.addEventListener("click", () => {
    btnAI.classList.add("active");
    btnHuman.classList.remove("active");
    wsManager.setMode("ai");
  });

  btnReset.addEventListener("click", () => {
    hideAllModals();
    targetWaypoint = null;
    playerTrail = [];
    hasHandledWin = false;
    hasHandledDeath = false;
    wsManager.reset();
  });

  btnOverlayRestart.addEventListener("click", () => {
    hideAllModals();
    targetWaypoint = null;
    playerTrail = [];
    hasHandledWin = false;
    hasHandledDeath = false;
    wsManager.reset();
  });

  btnNextLevel.addEventListener("click", () => {
    hideAllModals();
    targetWaypoint = null;
    playerTrail = [];
    hasHandledWin = false;
    hasHandledDeath = false;
    wsManager.nextLevel();
  });

  btnCampaignRestart.addEventListener("click", () => {
    hideAllModals();
    targetWaypoint = null;
    playerTrail = [];
    hasHandledWin = false;
    hasHandledDeath = false;
    wsManager.setLevel(1);
  });

  function hideAllModals() {
    gameOverOverlay.classList.add("hidden");
    levelWinOverlay.classList.add("hidden");
    campaignWinOverlay.classList.add("hidden");
  }

  // -------------------------------------------------------------
  // MAIN RENDERING LOOP (Hunter Assassin 5-Level Architecture)
  // -------------------------------------------------------------
  function renderGame(state) {
    if (!state) return;

    const player = state.player;
    if (player) {
      lastPlayerPos.x = player.x;
      lastPlayerPos.y = player.y;
      if (player.angle !== undefined) {
        lastPlayerPos.angle = player.angle;
      }
    }

    if (state.level && state.level !== currentLevel) {
      currentLevel = state.level;
      hasHandledWin = false;
      playerTrail = [];
      targetWaypoint = null;
      hideAllModals();
    }

    // Process Click-To-Move Waypoint in Human Mode
    if (targetWaypoint && player && player.alive && state.mode !== "ai" && !state.level_completed) {
      const dx = targetWaypoint.x - player.x;
      const dy = targetWaypoint.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 12) {
        targetWaypoint = null;
        if (currentAction !== 0) {
          currentAction = 0;
          wsManager.sendAction(0);
        }
      } else {
        let action = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          action = dx > 0 ? 4 : 3;
        } else {
          action = dy > 0 ? 2 : 1;
        }
        if (action !== currentAction) {
          currentAction = action;
          wsManager.sendAction(currentAction);
        }
      }
    }

    // Update Player Movement Trail (Hunter Assassin Orange Curved Path)
    if (player && player.alive) {
      if (playerTrail.length === 0 || Math.hypot(player.x - playerTrail[playerTrail.length - 1].x, player.y - playerTrail[playerTrail.length - 1].y) > 4) {
        playerTrail.push({ x: player.x, y: player.y, time: Date.now() });
      }
    }
    const trailCutoff = Date.now() - 400;
    while (playerTrail.length > 0 && playerTrail[0].time < trailCutoff) {
      playerTrail.shift();
    }

    // Detect Flashlight Collisions with Player
    let playerDetected = false;
    if (player && player.alive && state.enemies) {
      state.enemies.forEach((en) => {
        const enAngle = en.angle !== undefined ? en.angle : 0;
        const dx = player.x - en.x;
        const dy = player.y - en.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 140) {
          let angleToPlayer = Math.atan2(dy, dx);
          let diff = angleToPlayer - enAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          if (Math.abs(diff) < (55 * Math.PI) / 360) {
            playerDetected = true;
          }
        }
      });
    }

    // Play Alert Audio if newly detected
    if (playerDetected && !isAlertedGlobal) {
      const now = Date.now();
      if (now - lastAlertSoundTime > 1200) {
        sfx.playAlert();
        lastAlertSoundTime = now;
      }
    }
    isAlertedGlobal = playerDetected;

    // Detect Score / Health changes for Audio & Floating Texts
    if (player) {
      if (player.score > lastScore) {
        const diff = player.score - lastScore;
        addFloatingText(player.x, player.y, `+${diff} 💎`, "#00e5ff");
        spawnSparkles(player.x, player.y, "#00e5ff", 10);
        sfx.playGem();
        lastScore = player.score;
      }
      if (player.health < lastHealth) {
        sfx.playHit();
        addFloatingText(player.x, player.y, `-${Math.round(lastHealth - player.health)} HP`, "#ff334b");
        spawnSparkles(player.x, player.y, "#ff334b", 8);
        lastHealth = player.health;
      } else if (player.health > lastHealth) {
        lastHealth = player.health;
      }
    }

    // 1. DRAW HUNTER ASSASSIN WAREHOUSE FLOOR
    drawWarehouseFloor();

    // 2. DRAW STARTING POINT & DESTINATION ZONE (HELIPAD)
    if (state.start_point) {
      drawStartingPoint(state.start_point, player);
    }
    if (state.destination) {
      drawDestinationHelipad(state.destination, player);
    }

    // 3. DRAW CLICK-TO-MOVE ORANGE TRAJECTORY LINE
    drawMovementTrajectory(player);

    // 4. DRAW OBSTACLES (Walls, Crates & Camo Bushes)
    if (state.obstacles) {
      state.obstacles.forEach((obs) => {
        drawObstacle(obs);
      });
    }

    // 5. DRAW COLLECTIBLES (Multifaceted Cyan Diamonds 💎 & Drops)
    if (state.collectibles) {
      state.collectibles.forEach((col) => {
        drawCollectible(col);
      });
    }

    // 6. DRAW GUARD FLASHLIGHT VISION CONES
    if (state.enemies) {
      state.enemies.forEach((en) => {
        const enAlert = en.alerted !== undefined ? en.alerted : playerDetected;
        drawFlashlightCone(en, enAlert);
      });
    }

    // 7. DRAW GUARDS (Top-Down Tactical Uniforms)
    if (state.enemies) {
      state.enemies.forEach((en, idx) => {
        const enAlert = en.alerted !== undefined ? en.alerted : playerDetected;
        drawGuard(en, idx, enAlert);
      });
    }

    // 8. DRAW HUNTER ASSASSIN (Player)
    if (player && player.alive) {
      drawAssassinPlayer(player, playerDetected);
    }

    // 9. UPDATE & DRAW PARTICLES & FLOATING COMBAT TEXTS
    updateAndDrawParticles();
    updateAndDrawFloatingTexts();

    // 10. UPDATE TELEMETRY & IN-GAME HUD
    if (state.telemetry) {
      updateHUD(state, playerDetected);
      visualizer.updateMetrics(state.telemetry);

      // Handle Level Win vs Game Over Modals
      if (state.level_completed) {
        if (!hasHandledWin) {
          hasHandledWin = true;
          sfx.playWinLevel();
          spawnSparkles(state.destination ? state.destination.x : 300, state.destination ? state.destination.y : 300, "#ffd700", 30);
          showLevelWinModal(state);
        }
      } else if (state.telemetry.game_over || (player && !player.alive)) {
        if (!hasHandledDeath) {
          hasHandledDeath = true;
          sfx.playAssassinDead();
          addFloatingText(player ? player.x : 300, player ? player.y : 300, "💀 ASSASSIN DEAD", "#ff1744");
          spawnSparkles(player ? player.x : 300, player ? player.y : 300, "#ff1744", 16);
        }
        if (state.mode !== "ai") {
          gameOverOverlay.classList.remove("hidden");
          document.getElementById("overlay-gems").textContent = `+${player ? player.score : 0} 💎`;
          document.getElementById("overlay-stats").textContent = 
            `Level ${state.level || currentLevel} Failed • Survived: ${state.telemetry.survival_time}s • Score: ${state.telemetry.score}`;
        }
      } else {
        hasHandledDeath = false;
        hideAllModals();
      }
    }

    // 11. CNN & Q-Value visualizations
    if (state.cnn_activation) {
      visualizer.renderCNNActivation(state.cnn_activation);
    }
    if (state.q_values) {
      visualizer.renderQValues(state.q_values);
    }
  }

  function showLevelWinModal(state) {
    const lvl = state.level || currentLevel;
    const bonus = 300 * lvl;

    if (state.mode === "ai") {
      // In AI Mode, show animated in-game status banner without blocking modal
      const objText = document.getElementById("obj-text");
      if (objText) {
        const nextTarget = lvl < 5 ? lvl + 1 : 1;
        objText.innerHTML = `<span style="color:#00e5ff; font-weight:800;">🚀 AI OPERATIVE EXTRACTED HELIPAD! AUTO-ADVANCING TO LEVEL ${nextTarget}...</span>`;
      }
      return;
    }

    if (lvl >= 5) {
      campaignWinOverlay.classList.remove("hidden");
      document.getElementById("campaign-total-gems").textContent = `+${state.telemetry.score} 💎 TOTAL LOOT`;
      document.getElementById("campaign-stats").textContent = 
        `All 5 Sectors Cleared! Total Time: ${state.telemetry.survival_time}s • Total Dodges: ${state.telemetry.dodges_recorded}`;
    } else {
      levelWinOverlay.classList.remove("hidden");
      document.getElementById("win-level-title").textContent = `LEVEL ${lvl} COMPLETED!`;
      document.getElementById("win-level-bonus").textContent = `+${bonus} 💎 EXTRACTION BONUS`;
      document.getElementById("win-level-stats").textContent = 
        `Sector Cleared in ${state.telemetry.survival_time}s • Guard Dodges: ${state.telemetry.dodges_recorded}`;
      document.getElementById("btn-next-level").textContent = `PROCEED TO LEVEL ${lvl + 1} ➔`;
    }
  }

  // -------------------------------------------------------------
  // 1. WAREHOUSE FLOOR
  // -------------------------------------------------------------
  function drawWarehouseFloor() {
    ctx.fillStyle = "#d4c8b6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tileSize = 60;
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += tileSize) {
      for (let y = 0; y < canvas.height; y += tileSize) {
        const tileIdx = ((x / tileSize) + (y / tileSize)) % 2;
        if (tileIdx === 0) {
          ctx.fillStyle = "rgba(224, 214, 198, 0.45)";
          ctx.fillRect(x, y, tileSize, tileSize);
        }
        ctx.strokeStyle = "rgba(180, 168, 150, 0.4)";
        ctx.strokeRect(x, y, tileSize, tileSize);
      }
    }

    const vignette = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 220,
      canvas.width / 2, canvas.height / 2, 420
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(15, 20, 25, 0.4)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // -------------------------------------------------------------
  // 2. STARTING POINT & DESTINATION ZONE (HELIPAD)
  // -------------------------------------------------------------
  function drawStartingPoint(start, player) {
    const x = start.x;
    const y = start.y;

    ctx.save();
    // Drop shadow
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fill();

    // Green Infiltration Landing Circle
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 230, 118, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 230, 118, 0.8)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosshair in center
    ctx.strokeStyle = "rgba(0, 230, 118, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y);
    ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12);
    ctx.stroke();

    // "START" Label
    ctx.font = "bold 9px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#00e676";
    ctx.fillText("START", x, y + 36);

    ctx.restore();
  }

  function drawDestinationHelipad(dest, player) {
    const x = dest.x;
    const y = dest.y;
    const radius = dest.radius || 32;

    ctx.save();

    // Animated pulsing beacon rings radiating outward
    const time = Date.now() / 600;
    const pulse1 = (time % 1);
    const pulse2 = ((time + 0.5) % 1);

    [pulse1, pulse2].forEach((p) => {
      ctx.beginPath();
      ctx.arc(x, y, radius + p * 28, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.6 * (1 - p)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Outer Helipad Perimeter Pad
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#162330";
    ctx.fill();
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "rgba(0, 229, 255, 0.6)";
    ctx.shadowBlur = 12;
    ctx.stroke();

    ctx.shadowColor = "transparent";

    // Inner ring
    ctx.beginPath();
    ctx.arc(x, y, radius - 7, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 215, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotating Radar Scan Line
    const radarAngle = (Date.now() / 800) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(radarAngle) * (radius - 8), y + Math.sin(radarAngle) * (radius - 8));
    ctx.strokeStyle = "rgba(0, 229, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Prominent "H" Helipad Insignia in center
    ctx.font = "900 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffd700";
    ctx.fillText("H", x, y);

    // Label: "EXTRACTION"
    ctx.font = "bold 9px -apple-system, sans-serif";
    ctx.fillStyle = "#00e5ff";
    ctx.fillText("EXTRACTION", x, y + radius + 14);

    ctx.restore();
  }

  // -------------------------------------------------------------
  // 3. ORANGE MOVEMENT TRAJECTORY
  // -------------------------------------------------------------
  function drawMovementTrajectory(player) {
    if (!player || !player.alive) return;

    if (playerTrail.length > 2) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(playerTrail[0].x, playerTrail[0].y);
      for (let i = 1; i < playerTrail.length; i++) {
        const xc = (playerTrail[i].x + playerTrail[i - 1].x) / 2;
        const yc = (playerTrail[i].y + playerTrail[i - 1].y) / 2;
        ctx.quadraticCurveTo(playerTrail[i - 1].x, playerTrail[i - 1].y, xc, yc);
      }
      ctx.lineTo(player.x, player.y);
      ctx.strokeStyle = "#ff8c00";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(255, 140, 0, 0.8)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    }

    if (targetWaypoint) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      const midX = (player.x + targetWaypoint.x) / 2;
      const midY = (player.y + targetWaypoint.y) / 2;
      const offset = (targetWaypoint.x - player.x) * 0.15;
      ctx.quadraticCurveTo(midX + offset, midY - offset, targetWaypoint.x, targetWaypoint.y);

      ctx.strokeStyle = "#ff9900";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.shadowColor = "rgba(255, 153, 0, 0.9)";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.setLineDash([]);

      const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
      const ringRadius = 9 + pulse * 4;

      ctx.beginPath();
      ctx.arc(targetWaypoint.x, targetWaypoint.y, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(targetWaypoint.x, targetWaypoint.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ff8800";
      ctx.fill();
      ctx.restore();
    }
  }

  // -------------------------------------------------------------
  // 4. OBSTACLES (Walls, Crates, Bushes)
  // -------------------------------------------------------------
  function drawObstacle(obs) {
    const type = obs.type || "wall";
    const x = obs.x;
    const y = obs.y;
    const w = obs.width;
    const h = obs.height;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 8;

    if (type === "wall") {
      ctx.fillStyle = "#2c333e";
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();

      ctx.shadowColor = "transparent";
      const wallGrad = ctx.createLinearGradient(x, y, x, y + h);
      wallGrad.addColorStop(0, "#3f4857");
      wallGrad.addColorStop(1, "#262c36");
      ctx.fillStyle = wallGrad;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 4);
      ctx.fill();

      ctx.strokeStyle = "#5a667a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + h - 3);
      ctx.lineTo(x + 3, y + 3);
      ctx.lineTo(x + w - 3, y + 3);
      ctx.stroke();

      ctx.fillStyle = "#8a96a8";
      [
        [x + 6, y + 6],
        [x + w - 6, y + 6],
        [x + 6, y + h - 6],
        [x + w - 6, y + h - 6]
      ].forEach(([bx, by]) => {
        ctx.beginPath();
        ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

    } else if (type === "crate") {
      ctx.fillStyle = "#965225";
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#b46932";
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

      ctx.strokeStyle = "#7c3e16";
      ctx.lineWidth = Math.max(3, w * 0.08);
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 4);
      ctx.lineTo(x + w - 4, y + h - 4);
      ctx.moveTo(x + w - 4, y + 4);
      ctx.lineTo(x + 4, y + h - 4);
      ctx.stroke();

      ctx.strokeStyle = "#5a2d10";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

    } else if (type === "bush") {
      ctx.fillStyle = "#2d5032";
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#46774c";
      const count = Math.floor((w * h) / 120);
      for (let i = 0; i < count; i++) {
        const lx = x + 6 + (Math.sin(i * 99) * 0.5 + 0.5) * (w - 12);
        const ly = y + 6 + (Math.cos(i * 47) * 0.5 + 0.5) * (h - 12);
        const lr = 3 + (i % 3);
        ctx.beginPath();
        ctx.arc(lx, ly, lr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "#5f9a67";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.stroke();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // 5. COLLECTIBLES (Cyan Diamonds 💎)
  // -------------------------------------------------------------
  function drawCollectible(col) {
    const x = col.x;
    const y = col.y;
    const type = col.type || "coin";

    ctx.save();
    const floatOffset = Math.sin((Date.now() + x * 10) / 250) * 3;
    const cy = y + floatOffset;

    ctx.beginPath();
    ctx.ellipse(x, y + 10, 8, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fill();

    if (type === "coin") {
      const size = 11;
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(x - size, cy - 2);
      ctx.lineTo(x - size * 0.55, cy - size * 0.75);
      ctx.lineTo(x + size * 0.55, cy - size * 0.75);
      ctx.lineTo(x + size, cy - 2);
      ctx.closePath();
      ctx.fillStyle = "#80f3ff";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x - size, cy - 2);
      ctx.lineTo(x + size, cy - 2);
      ctx.lineTo(x, cy + size);
      ctx.closePath();
      ctx.fillStyle = "#00b0ff";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x - size * 0.55, cy - size * 0.75);
      ctx.lineTo(x + size * 0.55, cy - size * 0.75);
      ctx.lineTo(x + size * 0.35, cy - 2);
      ctx.lineTo(x, cy + size * 0.4);
      ctx.lineTo(x - size * 0.35, cy - 2);
      ctx.closePath();
      ctx.fillStyle = "#e0f7fa";
      ctx.fill();

      const sparkleRot = (Date.now() / 600) % (Math.PI * 2);
      ctx.save();
      ctx.translate(x + size * 0.4, cy - size * 0.4);
      ctx.rotate(sparkleRot);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-1, -4, 2, 8);
      ctx.fillRect(-4, -1, 8, 2);
      ctx.restore();

    } else if (type === "health") {
      ctx.fillStyle = "#d32f2f";
      ctx.beginPath();
      ctx.roundRect(x - 9, cy - 8, 18, 16, 4);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 6, cy - 2, 12, 4);
      ctx.fillRect(x - 2, cy - 6, 4, 12);

    } else if (type === "boost") {
      ctx.fillStyle = "#ffb300";
      ctx.shadowColor = "#ffb300";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(x - 8, cy - 9, 16, 18, 3);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(x + 2, cy - 7);
      ctx.lineTo(x - 4, cy);
      ctx.lineTo(x, cy);
      ctx.lineTo(x - 2, cy + 7);
      ctx.lineTo(x + 4, cy);
      ctx.lineTo(x, cy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // 6. GUARD FLASHLIGHT VISION CONES
  // -------------------------------------------------------------
  function drawFlashlightCone(en, playerDetected) {
    const x = en.x;
    const y = en.y;
    const angle = en.angle !== undefined ? en.angle : 0;
    const range = 140;
    const fov = (55 * Math.PI) / 180;

    ctx.save();
    const startAngle = angle - fov / 2;
    const endAngle = angle + fov / 2;

    const coneGrad = ctx.createRadialGradient(x, y, 6, x, y, range);
    if (playerDetected) {
      coneGrad.addColorStop(0, "rgba(255, 60, 60, 0.75)");
      coneGrad.addColorStop(0.3, "rgba(255, 90, 90, 0.45)");
      coneGrad.addColorStop(0.85, "rgba(255, 120, 120, 0.15)");
      coneGrad.addColorStop(1, "rgba(255, 120, 120, 0.0)");
    } else {
      coneGrad.addColorStop(0, "rgba(255, 255, 240, 0.75)");
      coneGrad.addColorStop(0.25, "rgba(255, 248, 200, 0.45)");
      coneGrad.addColorStop(0.85, "rgba(255, 240, 160, 0.15)");
      coneGrad.addColorStop(1, "rgba(255, 240, 160, 0.0)");
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = coneGrad;
    ctx.fill();

    ctx.strokeStyle = playerDetected ? "rgba(255, 80, 80, 0.35)" : "rgba(255, 250, 200, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  // -------------------------------------------------------------
  // 7. GUARDS
  // -------------------------------------------------------------
  function drawGuard(en, idx, playerDetected) {
    const x = en.x;
    const y = en.y;
    const angle = en.angle !== undefined ? en.angle : 0;
    const isRedGuard = (idx % 2 === 1) || en.type === "dasher";

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.ellipse(0, 4, 13, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fill();

    ctx.strokeStyle = isRedGuard ? "rgba(255, 50, 50, 0.4)" : "rgba(60, 160, 255, 0.55)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#15181e";
    ctx.fillRect(8, 2, 14, 3.5);
    ctx.fillStyle = "#2d3440";
    ctx.fillRect(5, 1, 7, 5);

    ctx.fillStyle = isRedGuard ? "#8b1818" : "#1a3a6b";
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isRedGuard ? "#b71c1c" : "#23559e";
    ctx.beginPath();
    ctx.arc(6, -6, 3.5, 0, Math.PI * 2);
    ctx.arc(6, 6, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d79973";
    ctx.beginPath();
    ctx.arc(10, 3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isRedGuard ? "#d32f2f" : "#0d1f3d";
    ctx.beginPath();
    ctx.arc(-1, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    drawGuardAlertBadge(x, y, playerDetected);
  }

  function drawGuardAlertBadge(gx, gy, isAlerted) {
    if (!isAlerted) return; // Calm patrol mode: no visual clutter

    ctx.save();
    const bounce = Math.sin((Date.now() + gx * 5) / 180) * 3;
    const badgeY = gy - 24 + bounce;

    ctx.fillStyle = "#ff1744";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.0;
    ctx.font = "bold 16px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("!", gx, badgeY);
    ctx.fillText("!", gx, badgeY);

    ctx.restore();
  }

  // -------------------------------------------------------------
  // 8. HUNTER ASSASSIN PLAYER
  // -------------------------------------------------------------
  function drawAssassinPlayer(player, playerDetected) {
    const x = player.x;
    const y = player.y;
    const angle = player.angle !== undefined ? player.angle : lastPlayerPos.angle;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.ellipse(0, 5, 14, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fill();

    if (!playerDetected) {
      ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255, 51, 75, 0.6)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#d79973";
    ctx.beginPath();
    ctx.arc(4, -8, 4.5, 0, Math.PI * 2);
    ctx.arc(4, 8, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a1f26";
    ctx.fillRect(7, -9, 3, 3);
    ctx.fillRect(7, 6, 3, 3);

    ctx.fillStyle = "#c5d1e0";
    ctx.beginPath();
    ctx.moveTo(11, 7);
    ctx.lineTo(19, 7);
    ctx.lineTo(17, 9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = player.invulnerable ? "rgba(255, 255, 255, 0.85)" : "#212732";
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff7700";
    ctx.fillRect(-5, -4, 2, 8);

    ctx.fillStyle = "#e2a984";
    ctx.beginPath();
    ctx.arc(-1, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // -------------------------------------------------------------
  // 9. PARTICLES & FLOATING TEXTS
  // -------------------------------------------------------------
  function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.035;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function updateAndDrawFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.022;

      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";

      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);

      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // -------------------------------------------------------------
  // 10. UPDATE HUD & LEVEL PROGRESSION
  // -------------------------------------------------------------
  function updateHUD(state, playerDetected) {
    const telemetry = state.telemetry;
    const lvl = state.level || currentLevel;
    const lvlInfo = state.level_info || {};

    // Level Title in top bar
    const titleEl = document.getElementById("level-display-name");
    if (titleEl && lvlInfo.name) {
      titleEl.textContent = lvlInfo.name;
    }

    // Active button in level navigation group
    lvlButtons.forEach((btn) => {
      const btnLvl = parseInt(btn.getAttribute("data-lvl"));
      if (btnLvl === lvl) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Objective distance
    if (state.destination && state.player) {
      const dist = Math.hypot(state.player.x - state.destination.x, state.player.y - state.destination.y);
      const distEl = document.getElementById("obj-dist");
      if (distEl) distEl.textContent = `📍 DIST: ${Math.round(dist)}px`;
    }

    // Top Canvas HUD Bar
    document.getElementById("val-level").textContent = lvl;
    document.getElementById("val-diamonds").textContent = telemetry.score;
    document.getElementById("val-targets").textContent = state.enemies ? state.enemies.length : 0;
    document.getElementById("val-time").textContent = telemetry.survival_time + "s";

    // Stealth Indicator Tag
    const stealthTag = document.getElementById("stealth-indicator");
    const stealthText = document.getElementById("stealth-text");
    if (playerDetected) {
      stealthTag.className = "stealth-tag stealth-detected";
      stealthText.textContent = "DETECTED!";
    } else if (state.enemies && state.enemies.length > 0) {
      stealthTag.className = "stealth-tag stealth-shadow";
      stealthText.textContent = "SHADOW STEALTH";
    } else {
      stealthTag.className = "stealth-tag stealth-alert";
      stealthText.textContent = "CLEAR";
    }

    // Left Telemetry Panel
    document.getElementById("stat-level").textContent = `${lvl} / 5`;
    document.getElementById("stat-survival").textContent = telemetry.survival_time + "s";
    document.getElementById("stat-score").textContent = telemetry.score;
    document.getElementById("stat-gems-left").textContent = `💎 ${telemetry.score}`;
    document.getElementById("stat-health").textContent = `${Math.round(telemetry.health)} / 100`;

    const healthFill = document.getElementById("health-bar");
    const healthPercent = Math.max(0, Math.min(100, telemetry.health));
    healthFill.style.width = healthPercent + "%";
    if (healthPercent < 30) {
      healthFill.style.background = "linear-gradient(90deg, #d50000, var(--accent-red))";
    } else if (healthPercent < 60) {
      healthFill.style.background = "linear-gradient(90deg, #ff8f00, var(--accent-yellow))";
    } else {
      healthFill.style.background = "linear-gradient(90deg, #00c853, var(--accent-green))";
    }

    document.getElementById("stat-dodges").textContent = telemetry.dodges_recorded;
    document.getElementById("stat-collectibles").textContent = telemetry.collectibles_gathered;
    document.getElementById("stat-damage").textContent = Math.round(telemetry.damage_taken);

    const diff = telemetry.difficulty || {};
    document.getElementById("badge-tier").textContent = lvlInfo.tier || diff.tier || "Recruit";
    document.getElementById("stat-obstacles-count").textContent = `${state.obstacles ? state.obstacles.length : (lvlInfo.num_obstacles || 6)} Blocks`;
    document.getElementById("stat-speed-mult").textContent = (lvlInfo.enemy_speed_multiplier || diff.enemy_speed_multiplier || 1.0) + "x";
    document.getElementById("stat-spawn-rate").textContent = (diff.enemy_spawn_interval || 3.0) + "s";
    document.getElementById("stat-event").textContent = diff.challenge_event || "None";
  }
});
