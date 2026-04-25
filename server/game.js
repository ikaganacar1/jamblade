const C = require('../shared/constants');
const { generateObstacles, generateSpawnPoints, isInsideMap } = require('./map');

class Game {
  constructor(io, playerEntries, onGameEnd) {
    this.io = io;
    this.onGameEnd = onGameEnd;
    this.tickTimer = null;
    this.timerInterval = null;
    this.timeRemaining = C.GAME_DURATION;

    this.obstacles = generateObstacles();
    const playerIds = playerEntries.map(([id]) => id);
    const spawns = generateSpawnPoints(playerIds);

    this.players = new Map();
    for (const [id, { name, category, skin }] of playerEntries) {
      const spawn = spawns[id];
      this.players.set(id, {
        name,
        category: category || 'balance',
        skin: skin || 0,
        x: spawn.x, y: spawn.y,
        vx: 0, vy: 0,
        joystickAngle: Math.atan2(-spawn.y, -spawn.x),
        moving: false,
        spinSpeed: 100,
        state: 'launching',
        eliminatedAt: null,
      });
    }

    this.spectators = new Set();
    this.launchTimer = null;
  }

  addSpectator(socketId) { this.spectators.add(socketId); }
  removeSpectator(socketId) { this.spectators.delete(socketId); }
  hasSpectator(socketId) { return this.spectators.has(socketId); }

  getFullState() {
    const playersData = {};
    for (const [id, p] of this.players) {
      playersData[id] = { name: p.name, x: p.x, y: p.y, spinSpeed: p.spinSpeed, state: p.state, category: p.category, skin: p.skin };
    }
    return { players: playersData, obstacles: this.obstacles };
  }

  start() {
    const playersData = {};
    for (const [id, p] of this.players) {
      playersData[id] = { name: p.name, x: p.x, y: p.y, spinSpeed: p.spinSpeed, state: p.state, category: p.category, skin: p.skin };
    }
    this.io.emit('game:start', { players: playersData, obstacles: this.obstacles });

    setTimeout(() => {
      this.tickTimer = setInterval(() => this.tick(), C.TICK_INTERVAL);
      this.timerInterval = setInterval(() => {
        this.timeRemaining--;
        if (this.timeRemaining <= 0) this.endGame();
      }, 1000);

      // Auto-launch any player who hasn't launched after LAUNCH_TIMEOUT seconds
      this.launchTimer = setTimeout(() => {
        for (const [, p] of this.players) {
          if (p.state === 'launching') {
            const speed = C.MAX_SPEED * 0.3;
            p.vx = Math.cos(p.joystickAngle) * speed;
            p.vy = Math.sin(p.joystickAngle) * speed;
            p.state = 'active';
          }
        }
      }, C.LAUNCH_TIMEOUT * 1000);
    }, 4000);
  }

  tick() {
    const entries = [...this.players.entries()];

    // ── Movement, spin decay, elimination ─────────────────────────
    for (const [id, p] of entries) {
      if (p.state === 'launching') continue;

      // Apply joystick force (active only)
      if (p.moving && p.state === 'active') {
        p.vx += Math.cos(p.joystickAngle) * C.JOYSTICK_FORCE;
        p.vy += Math.sin(p.joystickAngle) * C.JOYSTICK_FORCE;
      }

      // Friction + speed clamp (category modifies max speed)
      p.vx *= C.FRICTION;
      p.vy *= C.FRICTION;
      const cat = C.CATEGORIES[p.category] || C.CATEGORIES.balance;
      const maxSpd = C.MAX_SPEED * cat.speed;
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > maxSpd) { p.vx = p.vx / spd * maxSpd; p.vy = p.vy / spd * maxSpd; }

      // Spin decay (category modifies rate)
      if (p.state === 'active') {
        p.spinSpeed = Math.max(0, p.spinSpeed - C.SPIN_DECAY * cat.decay);

        // Elimination: spin depleted → eject outward
        if (p.spinSpeed <= 0) {
          p.state = 'eliminated';
          p.eliminatedAt = Date.now();
          const d = Math.sqrt(p.x * p.x + p.y * p.y) || 1;
          p.vx = (p.x / d) * C.MAX_SPEED * 5;
          p.vy = (p.y / d) * C.MAX_SPEED * 5;
          this.io.emit('game:eliminated', { playerId: id, name: p.name });
        }
      }

      // Move
      let newX = p.x + p.vx;
      let newY = p.y + p.vy;

      // Gear wall: bounce + spin loss (skip for eliminated — they fly out)
      if (p.state !== 'eliminated' && !isInsideMap(newX, newY)) {
        const preSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (isInsideMap(newX, p.y)) {
          p.vy = -p.vy * C.WALL_BOUNCE;
          newY = p.y;
        } else if (isInsideMap(p.x, newY)) {
          p.vx = -p.vx * C.WALL_BOUNCE;
          newX = p.x;
        } else {
          p.vx = -p.vx * C.WALL_BOUNCE;
          p.vy = -p.vy * C.WALL_BOUNCE;
          newX = p.x;
          newY = p.y;
        }
        p.spinSpeed = Math.max(0, p.spinSpeed - C.SPIN_WALL_LOSS);
        // Shake the player who hit the wall — intensity scaled 0→0.08 by approach speed
        const wallShake = (preSpeed / C.MAX_SPEED) * 0.08;
        const wallSocket = this.io.sockets.sockets.get(id);
        if (wallSocket) wallSocket.emit('game:shake', { duration: 180, intensity: wallShake });
      }

      p.x = newX;
      p.y = newY;
    }

    // ── Player-player collision (active only) ──────────────────────
    const minDist = C.PLAYER_RADIUS * 2;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [id1, p1] = entries[i];
        const [id2, p2] = entries[j];
        if (p1.state !== 'active' || p2.state !== 'active') continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= minDist || dist < 0.01) continue;

        const nx = dx / dist, ny = dy / dist;
        const relVel = (p1.vx - p2.vx) * nx + (p1.vy - p2.vy) * ny;
        const spinBonus = (p1.spinSpeed + p2.spinSpeed) * C.SPIN_COLLISION_FACTOR;
        const impulse = Math.max(0, relVel) * 1.4 + spinBonus;

        // Category-asymmetric knockback
        const c1 = C.CATEGORIES[p1.category] || C.CATEGORIES.balance;
        const c2 = C.CATEGORIES[p2.category] || C.CATEGORIES.balance;
        p1.vx -= nx * impulse * c2.damageOut * c1.shieldIn;
        p1.vy -= ny * impulse * c2.damageOut * c1.shieldIn;
        p2.vx += nx * impulse * c1.damageOut * c2.shieldIn;
        p2.vy += ny * impulse * c1.damageOut * c2.shieldIn;

        const overlap = (minDist - dist) * 0.5;
        p1.x -= nx * overlap; p1.y -= ny * overlap;
        p2.x += nx * overlap; p2.y += ny * overlap;

        // Category-asymmetric spin damage
        p1.spinSpeed = Math.max(0, p1.spinSpeed - C.SPIN_COLLISION_LOSS * c2.spinOut * c1.spinIn);
        p2.spinSpeed = Math.max(0, p2.spinSpeed - C.SPIN_COLLISION_LOSS * c1.spinOut * c2.spinIn);

        // Shake both colliding players — harder hit = bigger shake (0→0.15)
        const hitShake = Math.min(impulse / 60, 1) * 0.15;
        [id1, id2].forEach(sid => {
          const sock = this.io.sockets.sockets.get(sid);
          if (sock) sock.emit('game:shake', { duration: 250, intensity: hitShake });
        });
      }
    }

    // ── Win condition ──────────────────────────────────────────────
    const alive = [...this.players.values()].filter(p => p.state === 'active' || p.state === 'launching');
    if (alive.length <= 1) {
      this.endGame(alive[0]?.name ?? null);
      return;
    }

    // ── Remove eliminated players after visual flyoff (2s) ─────────
    const toRemove = [];
    for (const [id, p] of this.players) {
      if (p.state === 'eliminated' && Date.now() - p.eliminatedAt > 2000) toRemove.push(id);
    }
    toRemove.forEach(id => this.players.delete(id));

    this.broadcastState();
  }

  handleLaunch(socketId, { speed, angle }) {
    const player = this.players.get(socketId);
    if (!player || player.state !== 'launching') return;
    const launchSpeed = (0.3 + speed * 0.7) * C.MAX_SPEED;
    player.vx = Math.cos(angle) * launchSpeed;
    player.vy = Math.sin(angle) * launchSpeed;
    player.state = 'active';
  }

  handleInput(socketId, { angle, moving }) {
    const player = this.players.get(socketId);
    if (!player) return;
    player.joystickAngle = angle;
    player.moving = moving;
  }

  broadcastState() {
    const players = {};
    for (const [id, p] of this.players) {
      players[id] = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, name: p.name, spinSpeed: p.spinSpeed, state: p.state, category: p.category, skin: p.skin };
    }
    this.io.emit('game:state', { players, timer: this.timeRemaining });
  }

  endGame(winnerName = null) {
    clearInterval(this.tickTimer);
    clearInterval(this.timerInterval);
    clearTimeout(this.launchTimer);

    let winnerCategory = 'balance', winnerSkin = 0;

    if (!winnerName) {
      let maxSpin = -1;
      for (const p of this.players.values()) {
        if ((p.state === 'active' || p.state === 'launching') && p.spinSpeed > maxSpin) {
          maxSpin = p.spinSpeed;
          winnerName = p.name;
          winnerCategory = p.category || 'balance';
          winnerSkin = p.skin || 0;
        }
      }
    } else {
      for (const p of this.players.values()) {
        if (p.name === winnerName) {
          winnerCategory = p.category || 'balance';
          winnerSkin = p.skin || 0;
          break;
        }
      }
    }

    this.io.emit('game:end', { winnerName, winnerCategory, winnerSkin });
    if (this.onGameEnd) this.onGameEnd();
  }

  handleDisconnect(socketId) {
    this.players.delete(socketId);
    const alive = [...this.players.values()].filter(p => p.state === 'active' || p.state === 'launching');
    if (alive.length <= 1) this.endGame(alive[0]?.name ?? null);
  }

  hasPlayer(socketId) { return this.players.has(socketId); }
}

module.exports = Game;
