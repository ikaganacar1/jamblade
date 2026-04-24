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
    for (const [id, { name }] of playerEntries) {
      const spawn = spawns[id];
      this.players.set(id, {
        name,
        x: spawn.x, y: spawn.y,
        vx: 0, vy: 0,
        joystickAngle: Math.atan2(-spawn.y, -spawn.x), // default aim toward center
        moving: false,
        spinSpeed: 100,
        state: 'launching',
      });
    }

    this.spectators = new Set();
  }

  addSpectator(socketId) { this.spectators.add(socketId); }
  removeSpectator(socketId) { this.spectators.delete(socketId); }
  hasSpectator(socketId) { return this.spectators.has(socketId); }

  getFullState() {
    const playersData = {};
    for (const [id, p] of this.players) {
      playersData[id] = { name: p.name, x: p.x, y: p.y, spinSpeed: p.spinSpeed, state: p.state };
    }
    return { players: playersData, obstacles: this.obstacles };
  }

  start() {
    const playersData = {};
    for (const [id, p] of this.players) {
      playersData[id] = { name: p.name, x: p.x, y: p.y, spinSpeed: p.spinSpeed, state: p.state };
    }

    this.io.emit('game:start', { players: playersData, obstacles: this.obstacles });

    setTimeout(() => {
      this.tickTimer = setInterval(() => this.tick(), C.TICK_INTERVAL);
      this.timerInterval = setInterval(() => {
        this.timeRemaining--;
        if (this.timeRemaining <= 0) this.endGame();
      }, 1000);
    }, 4000);
  }

  tick() {
    const entries = [...this.players.entries()];

    // ── Movement & spin decay ──────────────────────────────────────
    for (const [, p] of entries) {
      if (p.state === 'launching') continue;
      // Joystick: tiny force nudge
      if (p.moving) {
        p.vx += Math.cos(p.joystickAngle) * C.JOYSTICK_FORCE;
        p.vy += Math.sin(p.joystickAngle) * C.JOYSTICK_FORCE;
      }

      // Friction
      p.vx *= C.FRICTION;
      p.vy *= C.FRICTION;

      // Clamp speed
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > C.MAX_SPEED) {
        p.vx = (p.vx / speed) * C.MAX_SPEED;
        p.vy = (p.vy / speed) * C.MAX_SPEED;
      }

      // Spin decay
      p.spinSpeed = Math.max(0, p.spinSpeed - C.SPIN_DECAY);

      // Move
      let newX = p.x + p.vx;
      let newY = p.y + p.vy;

      // Gear wall collision — bounce with damping
      if (!isInsideMap(newX, newY)) {
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
      }

      p.x = newX;
      p.y = newY;
    }

    // ── Player-player collision ────────────────────────────────────
    const minDist = C.PLAYER_RADIUS * 2;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [, p1] = entries[i];
        const [, p2] = entries[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist && dist > 0.01 && p1.state === 'active' && p2.state === 'active') {
          const nx = dx / dist;
          const ny = dy / dist;

          // Relative velocity of p1 approaching p2 along the normal
          const relVel = (p1.vx - p2.vx) * nx + (p1.vy - p2.vy) * ny;

          // Spin makes collisions explosive — higher spin = bigger push
          const spinBonus = (p1.spinSpeed + p2.spinSpeed) * C.SPIN_COLLISION_FACTOR;

          // Impulse: restitution on approach + always-on spin push
          const impulse = Math.max(0, relVel) * 1.4 + spinBonus;

          p1.vx -= nx * impulse;
          p1.vy -= ny * impulse;
          p2.vx += nx * impulse;
          p2.vy += ny * impulse;

          // Separate overlapping players
          const overlap = (minDist - dist) * 0.5;
          p1.x -= nx * overlap;
          p1.y -= ny * overlap;
          p2.x += nx * overlap;
          p2.y += ny * overlap;

          // Both lose spin on impact
          p1.spinSpeed = Math.max(0, p1.spinSpeed - C.SPIN_COLLISION_LOSS);
          p2.spinSpeed = Math.max(0, p2.spinSpeed - C.SPIN_COLLISION_LOSS);
        }
      }
    }

    this.broadcastState();
  }

  handleLaunch(socketId, { speed, angle }) {
    const player = this.players.get(socketId);
    if (!player || player.state !== 'launching') return;
    // Map bar 0–1 to 30–100% of max speed so even min-bar gives some movement
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
      players[id] = {
        x: p.x, y: p.y,
        vx: p.vx, vy: p.vy,
        name: p.name,
        spinSpeed: p.spinSpeed,
        state: p.state,
      };
    }
    this.io.emit('game:state', { players, timer: this.timeRemaining });
  }

  endGame() {
    clearInterval(this.tickTimer);
    clearInterval(this.timerInterval);
    this.io.emit('game:end', { winner: 'runner', stats: { totalRunners: 0, cagedRunners: 0, freeRunners: 0 } });
    if (this.onGameEnd) this.onGameEnd();
  }

  handleDisconnect(socketId) {
    this.players.delete(socketId);
    if (this.players.size < 2) this.endGame();
  }

  hasPlayer(socketId) {
    return this.players.has(socketId);
  }
}

module.exports = Game;
