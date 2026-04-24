const C = require('../shared/constants');
const path = require('path');
const fs = require('fs');
const { PNG } = require('pngjs');

// Load map_borders.png at module init — alpha channel defines playable area
let _pixelData = null;
let _imgW = 0, _imgH = 0, _scale = 1;

try {
  const buf = fs.readFileSync(path.join(__dirname, '../client/assets/map_borders.png'));
  const png = PNG.sync.read(buf);
  _pixelData = png.data; // RGBA Buffer
  _imgW = png.width;
  _imgH = png.height;
  // Scale: pixels per world unit, using image height mapped to WORLD_SIZE
  _scale = _imgH / C.WORLD_SIZE;
  console.log(`Map borders loaded: ${_imgW}x${_imgH}, scale: ${_scale.toFixed(4)} px/unit`);
} catch (e) {
  console.warn('Could not load map_borders.png, falling back to circular boundary:', e.message);
}

function isInsideMap(wx, wy) {
  if (!_pixelData) {
    return Math.sqrt(wx * wx + wy * wy) < C.MAP_RADIUS;
  }
  const px = Math.round(_imgW / 2 + wx * _scale);
  const py = Math.round(_imgH / 2 + wy * _scale);
  if (px < 0 || py < 0 || px >= _imgW || py >= _imgH) return false;
  // Alpha channel (index + 3) — > 128 means inside the gear shape
  return _pixelData[(py * _imgW + px) * 4 + 3] > 128;
}

function generateObstacles() {
  const obstacles = [];
  const rng = (min, max) => min + Math.random() * (max - min);

  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = rng(100, 700);
    obstacles.push({ type: 'rock', x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, radius: rng(20, 40) });
  }

  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = rng(100, 700);
    obstacles.push({ type: 'tree', x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, radius: 30 });
  }

  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = rng(150, 650);
    obstacles.push({ type: 'bush', x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, radius: 45 });
  }

  return obstacles;
}

function generateSpawnPoints(playerIds) {
  const spawns = {};
  playerIds.forEach((id, i) => {
    const angle = (i / playerIds.length) * Math.PI * 2;
    const dist = 400;
    spawns[id] = { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  });
  return spawns;
}

module.exports = { generateObstacles, generateSpawnPoints, isInsideMap };
