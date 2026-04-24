const C = require('../shared/constants');
const { generateObstacles, generateSpawnPoints } = require('./map');

class Game {
  constructor(io, playerEntries, onGameEnd, runnerSkinCount, hunterSkinCount) {
    this.io = io;
    this.onGameEnd = onGameEnd;
    this.tickTimer = null;
    this.timerInterval = null;
    this.timeRemaining = C.GAME_DURATION;

    this.obstacles = generateObstacles();
    const playerIds = playerEntries.map(([id]) => id);
    const spawns = generateSpawnPoints(playerIds);

    var rSkinCount = runnerSkinCount || 0;
    var hSkinCount = hunterSkinCount || 0;
    var rFallbackSkin = 0;
    var hFallbackSkin = 0;

    this.players = new Map();
    for (const [id, { name, team, skin: chosenSkin }] of playerEntries) {
      const spawn = spawns[id];
      var skin = chosenSkin >= 0 ? chosenSkin : -1;
      if (skin === -1) {
        if (team === 'runner' && rSkinCount > 0) skin = rFallbackSkin++ % rSkinCount;
        if (team === 'hunter' && hSkinCount > 0) skin = hFallbackSkin++ % hSkinCount;
      }
      this.players.set(id, {
        name, team, skin,
        x: spawn.x, y: spawn.y,
        angle: 0, moving: false,
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
      playersData[id] = { name: p.name, x: p.x, y: p.y, team: p.team, skin: p.skin };
    }
    return { players: playersData, obstacles: this.obstacles };
  }

  start() {
    const playersData = {};
    for (const [id, p] of this.players) {
      playersData[id] = { name: p.name, x: p.x, y: p.y, team: p.team, skin: p.skin };
    }

    this.io.emit('game:start', { players: playersData, obstacles: this.obstacles });

    // Delay ticks to match client countdown screen
    setTimeout(() => {
      this.tickTimer = setInterval(() => this.tick(), C.TICK_INTERVAL);
      this.timerInterval = setInterval(() => {
        this.timeRemaining--;
        if (this.timeRemaining <= 0) this.endGame();
      }, 1000);
    }, 4000);
  }

  tick() {
    for (const [, p] of this.players) {
      if (!p.moving) continue;

      const speed = C.PLAYER_SPEED / C.TICK_RATE;
      let newX = p.x + Math.cos(p.angle) * speed;
      let newY = p.y + Math.sin(p.angle) * speed;

      // Clamp to map circle
      const dist = Math.sqrt(newX * newX + newY * newY);
      if (dist > C.MAP_RADIUS) {
        const scale = C.MAP_RADIUS / dist;
        newX *= scale;
        newY *= scale;
      }

      // Push out of solid obstacles
      for (const obs of this.obstacles) {
        if (obs.type === 'bush') continue;
        const odx = newX - obs.x;
        const ody = newY - obs.y;
        const oDist = Math.sqrt(odx * odx + ody * ody);
        const minDist = obs.radius + 16;
        if (oDist < minDist) {
          const pushScale = minDist / oDist;
          newX = obs.x + odx * pushScale;
          newY = obs.y + ody * pushScale;
        }
      }

      p.x = newX;
      p.y = newY;
    }

    this.broadcastState();
  }

  handleInput(socketId, { angle, moving }) {
    const player = this.players.get(socketId);
    if (!player) return;
    player.angle = angle;
    player.moving = moving;
  }

  broadcastState() {
    const players = {};
    for (const [id, p] of this.players) {
      players[id] = { x: p.x, y: p.y, angle: p.angle, moving: p.moving, team: p.team, name: p.name, skin: p.skin };
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
