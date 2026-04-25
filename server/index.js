const express = require('express');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Lobby = require('./lobby');
const Game = require('./game');

const BASE = process.env.APP_BASE_PATH || '';

const app = express();
app.use(compression());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
  path: BASE + '/socket.io',
});

app.use(function(req, res, next) {
  if (req.query.v) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.path.match(/\.(png|mp3|svg|jpg|webp)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }
  next();
});

app.use(BASE, express.static(path.join(__dirname, '..', 'client')));
app.use(BASE + '/shared', express.static(path.join(__dirname, '..', 'shared')));

const PORT = process.env.PORT || 3000;

const lobby = new Lobby(io);
let game = null;

function returnToLobby() {
  game = null;
  lobby.clear();
  console.log('Returned to lobby');
}

lobby.onGameStart = (playerEntries) => {
  console.log('Game starting with', playerEntries.length, 'players');
  game = new Game(io, playerEntries, () => {
    setTimeout(returnToLobby, 3000);
  });
  game.start();
};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join', ({ name }) => {
    if (game) { socket.emit('lobby:gameInProgress'); return; }
    lobby.addPlayer(socket, name);
  });

  socket.on('ready', ({ ready }) => {
    if (game) return;
    lobby.setReady(socket.id, ready);
  });

  socket.on('name:update', ({ name }) => {
    if (game) return;
    lobby.setName(socket.id, name);
  });

  socket.on('category:select', ({ category }) => {
    if (game) return;
    lobby.setCategory(socket.id, category);
  });

  socket.on('skin:select', ({ skin }) => {
    if (game) return;
    lobby.setSkin(socket.id, skin);
  });

  socket.on('spectate', ({ name }) => {
    if (game) {
      game.addSpectator(socket.id);
      socket.emit('game:spectate', game.getFullState());
    } else {
      lobby.removePlayer(socket.id);
      lobby.addSpectator(socket, name);
    }
  });

  socket.on('input', (data) => {
    if (game) game.handleInput(socket.id, data);
  });

  socket.on('launch', (data) => {
    if (game) game.handleLaunch(socket.id, data);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    if (game && game.hasPlayer(socket.id)) {
      game.handleDisconnect(socket.id);
    } else if (game && game.hasSpectator(socket.id)) {
      game.removeSpectator(socket.id);
    } else {
      lobby.removePlayer(socket.id);
      lobby.removeSpectator(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
