const C = require('../shared/constants');

class Lobby {
  constructor(io) {
    this.io = io;
    this.players = new Map(); // socketId -> { name, ready }
    this.spectators = new Map(); // socketId -> { name }
    this.countdownTimer = null;
    this.countdownSeconds = 0;
    this.onGameStart = null;
  }

  addPlayer(socket, name) {
    if (this.players.size >= C.MAX_PLAYERS) {
      socket.emit('lobby:full');
      return false;
    }
    this.spectators.delete(socket.id);
    this.players.set(socket.id, { name, ready: false });
    this.broadcast();
    return true;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.cancelCountdown();
    this.broadcast();
  }

  addSpectator(socket, name) {
    this.spectators.set(socket.id, { name });
    this.broadcast();
  }

  removeSpectator(socketId) {
    this.spectators.delete(socketId);
    this.broadcast();
  }

  setName(socketId, name) {
    const player = this.players.get(socketId);
    if (!player) return;
    player.name = name;
    this.broadcast();
  }

  setReady(socketId, ready) {
    const player = this.players.get(socketId);
    if (!player) return;
    player.ready = ready;
    this.broadcast();
    this.checkAllReady();
  }

  checkAllReady() {
    if (this.players.size < C.MIN_PLAYERS) {
      this.cancelCountdown();
      return;
    }
    const allReady = [...this.players.values()].every((p) => p.ready);
    if (allReady && !this.countdownTimer) {
      this.startCountdown();
    } else if (!allReady) {
      this.cancelCountdown();
    }
  }

  startCountdown() {
    this.countdownSeconds = 3;
    this.io.emit('lobby:countdown', { seconds: this.countdownSeconds });
    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds <= 0) {
        this.cancelCountdown();
        if (this.onGameStart) {
          this.onGameStart([...this.players.entries()]);
        }
      } else {
        this.io.emit('lobby:countdown', { seconds: this.countdownSeconds });
      }
    }, 1000);
  }

  cancelCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
      this.io.emit('lobby:countdown', { seconds: 0 });
    }
  }

  broadcast() {
    const players = [];
    for (const [id, p] of this.players) {
      players.push({ id, name: p.name, ready: p.ready });
    }
    const spectators = [];
    for (const [id, s] of this.spectators) {
      spectators.push({ id, name: s.name });
    }
    this.io.emit('lobby:update', { players, spectators });
  }

  getPlayerIds() {
    return [...this.players.keys()];
  }

  clear() {
    this.players.clear();
    this.spectators.clear();
    this.cancelCountdown();
  }
}

module.exports = Lobby;
