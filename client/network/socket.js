class NetworkManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    var base = window.location.pathname.split('/').slice(0, -1).filter(Boolean);
    var socketPath = (base.length ? '/' + base[0] : '') + '/socket.io';
    this.socket = io({ path: socketPath, transports: ['websocket', 'polling'] });
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('Connected:', this.socket.id);
        resolve(this.socket.id);
      });
      this.socket.on('connect_error', (err) => {
        console.error('Socket connect error:', err.message);
        reject(err);
      });
    });
  }

  on(event, callback) {
    // Remove previous listener for this event to prevent duplicate handlers
    if (this.listeners.has(event) && this.socket) {
      this.socket.off(event, this.listeners.get(event));
    }
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    const cb = this.listeners.get(event);
    if (cb && this.socket) this.socket.off(event, cb);
    this.listeners.delete(event);
  }

  offAll() {
    for (const [event, cb] of this.listeners) {
      if (this.socket) this.socket.off(event, cb);
    }
    this.listeners.clear();
  }

  emit(event, data) {
    if (this.socket) this.socket.emit(event, data);
  }

  get id() {
    return this.socket?.id;
  }
}

window.network = new NetworkManager();
