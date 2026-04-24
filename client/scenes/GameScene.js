class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  init(data) {
    this.gameData = data;
  }

  create() {
    var myId = window.network.id;
    var self = this;
    var sw = this.cameras.main.width;
    var sh = this.cameras.main.height;

    // ── World camera (zoomed out to fit map) ──────────────────────
    var imgAspect = 2412 / 1760;
    var displayW = CONSTANTS.WORLD_SIZE * imgAspect;
    var displayH = CONSTANTS.WORLD_SIZE;
    this._zoom = Math.min(sw / displayW, sh / displayH);
    this.cameras.main.setZoom(this._zoom);
    this.cameras.main.centerOn(0, 0);

    this.drawMap();

    // Launcher placeholders (world space)
    this.launcherPositions = {};
    for (var id in this.gameData.players) {
      var p0 = this.gameData.players[id];
      this.launcherPositions[id] = { x: p0.x, y: p0.y };
      var lw = 260, lh = 150;
      var lg = this.add.graphics().setDepth(50);
      lg.fillStyle(0x0a1a3a, 0.85);
      lg.lineStyle(4, 0x3399ff, 1);
      lg.fillRoundedRect(p0.x - lw / 2, p0.y - lh / 2, lw, lh, 14);
      lg.strokeRoundedRect(p0.x - lw / 2, p0.y - lh / 2, lw, lh, 14);
      lg.lineStyle(2, 0x66ccff, 0.5);
      lg.strokeRect(p0.x - lw / 2 + 8, p0.y - lh / 2 + 8, lw - 16, lh - 16);
    }

    // Player sprites (world space)
    this.playerSprites = {};
    for (var id2 in this.gameData.players) {
      this.createPlayerSprite(id2, this.gameData.players[id2]);
    }

    // Aim arrow (world space, updated each frame)
    this.aimArrow = this.add.graphics().setDepth(90);

    // World-space power bar (drawn near MY launcher)
    this.worldBarG = this.add.graphics().setDepth(95);

    // ── UI camera (zoom=1, screen-space HUD) ──────────────────────
    var worldObjs = this.children.list.slice();
    this.uiCam = this.cameras.add(0, 0, sw, sh).setName('ui');
    this.uiCam.ignore(worldObjs);

    // Joystick (screen space — only uiCam renders it)
    this.joystick = new VirtualJoystick(this);

    // Timer HUD (screen space)
    var hf = 'Fredoka, sans-serif';
    this.timerText = this.add.text(10, 10, '', {
      fontFamily: hf, fontSize: '20px', color: '#FF85BB',
      backgroundColor: '#173a8bcc', padding: { x: 10, y: 5 }, fontStyle: 'bold',
    });

    // Main camera ignores all UI objects
    var uiObjs = this.children.list.filter(function(c) { return worldObjs.indexOf(c) === -1; });
    this.cameras.main.ignore(uiObjs);

    // ── Launch state ───────────────────────────────────────────────
    this.myLaunching = true;
    this.barProgress = 0;
    this.barDir = 1;

    // Store my name for win screen
    var myData = this.gameData.players[myId];
    if (myData) window._myName = myData.name;

    // Tap RIGHT half (not joystick side) to launch
    this.input.on('pointerdown', function(ptr) {
      if (!self.myLaunching) return;
      if (ptr.x < sw * 0.5) return;
      window.network.emit('launch', { speed: self.barProgress, angle: self.joystick.angle });
      self.myLaunching = false;
      self.worldBarG.clear();
      self.aimArrow.clear();
    });

    // Input ticker
    this.inputTimer = this.time.addEvent({
      delay: CONSTANTS.TICK_INTERVAL,
      callback: function() {
        window.network.emit('input', { angle: this.joystick.angle, moving: this.joystick.moving });
      },
      callbackScope: this, loop: true,
    });

    this.latestState = null;
    this.prevState = null;
    this.stateTime = 0;

    window.network.on('game:state', function(state) {
      this.prevState = this.latestState;
      this.latestState = state;
      this.stateTime = 0;
    }.bind(this));

    window.network.on('game:end', function(data) {
      this.joystick.destroy();
      this.scene.start('Result', data);
    }.bind(this));
  }

  update(time, delta) {
    var myId = window.network.id;

    // ── Launch phase: power bar + aim arrow in WORLD space ────────
    if (this.myLaunching) {
      this.barProgress += this.barDir * delta / 750;
      if (this.barProgress >= 1) { this.barProgress = 1; this.barDir = -1; }
      if (this.barProgress <= 0) { this.barProgress = 0; this.barDir = 1; }

      var spawn = this.launcherPositions[myId];
      if (spawn) {
        // Aim arrow
        var ang = this.joystick.angle;
        var aLen = 260;
        var ax = spawn.x + Math.cos(ang) * aLen;
        var ay = spawn.y + Math.sin(ang) * aLen;
        this.aimArrow.clear();
        this.aimArrow.lineStyle(35, 0xffee00, 0.9);
        this.aimArrow.lineBetween(spawn.x, spawn.y, ax, ay);
        this.aimArrow.fillStyle(0xffee00, 0.9);
        this.aimArrow.fillTriangle(
          ax, ay,
          ax - Math.cos(ang - 0.42) * 70, ay - Math.sin(ang - 0.42) * 70,
          ax - Math.cos(ang + 0.42) * 70, ay - Math.sin(ang + 0.42) * 70
        );

        // Power bar in world space — offset toward center from launcher
        var len = Math.sqrt(spawn.x * spawn.x + spawn.y * spawn.y) || 1;
        var nx = spawn.x / len, ny = spawn.y / len; // outward normal
        var barCx = spawn.x - nx * 200; // 200 units toward center
        var barCy = spawn.y - ny * 200;
        var bw = 90, bh = 500;
        this.drawWorldBar(barCx, barCy, bw, bh, this.barProgress);
      }
    }

    if (!this.latestState) return;
    var state = this.latestState;

    // Timer
    var min = Math.floor(state.timer / 60);
    var sec = state.timer % 60;
    this.timerText.setText('T ' + min + ':' + (sec < 10 ? '0' : '') + sec);

    this.stateTime += delta;
    var t = Math.min(this.stateTime / CONSTANTS.TICK_INTERVAL, 1);

    for (var id in state.players) {
      var p = state.players[id];
      var spr = this.playerSprites[id];
      if (!spr) spr = this.createPlayerSprite(id, p);

      if (this.prevState && this.prevState.players[id]) {
        var prev = this.prevState.players[id];
        spr.container.x = prev.x + (p.x - prev.x) * t;
        spr.container.y = prev.y + (p.y - prev.y) * t;
      } else {
        spr.container.x += (p.x - spr.container.x) * 0.2;
        spr.container.y += (p.y - spr.container.y) * 0.2;
      }

      if (p.state === 'active') {
        spr.localRotation = (spr.localRotation || 0) + (p.spinSpeed / 100) * 18 * (delta / 1000);
        spr.sprite.rotation = spr.localRotation;
        spr.container.setAlpha(1);
      } else if (p.state === 'eliminated') {
        spr.container.setAlpha(Math.max(0, spr.container.alpha - delta * 0.001));
      }

      spr.nameLabel.setText(p.name);
    }

    for (var pid in this.playerSprites) {
      if (!state.players[pid]) {
        this.playerSprites[pid].container.destroy();
        delete this.playerSprites[pid];
      }
    }
  }

  drawWorldBar(cx, cy, bw, bh, progress) {
    var g = this.worldBarG;
    g.clear();

    // Background
    g.fillStyle(0x000000, 0.75);
    g.fillRoundedRect(cx - bw / 2 - 8, cy - bh / 2 - 8, bw + 16, bh + 16, 12);

    // Gradient strips (red bottom → green top)
    var strips = 20;
    var sh = bh / strips;
    for (var i = 0; i < strips; i++) {
      var t = i / (strips - 1);
      var r = Math.floor(220 * (1 - t));
      var gr = Math.floor(200 * t);
      g.fillStyle((r << 16) | (gr << 8) | 10, 1);
      g.fillRect(cx - bw / 2, cy + bh / 2 - (i + 1) * sh, bw, sh + 1);
    }

    // Pointer line
    var py = cy + bh / 2 - progress * bh;
    g.lineStyle(18, 0xffffff, 1);
    g.lineBetween(cx - bw / 2 - 6, py, cx + bw / 2 + 6, py);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(cx - bw / 2 - 6, py, cx - bw / 2 - 30, py - 18, cx - bw / 2 - 30, py + 18);
    g.fillTriangle(cx + bw / 2 + 6, py, cx + bw / 2 + 30, py - 18, cx + bw / 2 + 30, py + 18);
  }

  createPlayerSprite(id, data) {
    var size = CONSTANTS.PLAYER_RADIUS * 2;
    var container = this.add.container(data.x, data.y);
    var shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillEllipse(size * 0.15, size * 0.35, size * 0.9, size * 0.28);
    var sprite = this.add.image(0, 0, 'player').setDisplaySize(size, size);
    var nameLabel = this.add.text(0, -(size * 0.65), data.name || '', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: Math.round(size * 0.38) + 'px',
      color: '#ffffff', backgroundColor: '#00000099',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5);
    container.add([shadow, sprite, nameLabel]);
    container.setDepth(100);

    // Tell uiCam to ignore this container (it's a world object)
    if (this.uiCam) this.uiCam.ignore(container);

    this.playerSprites[id] = { container, sprite, nameLabel, localRotation: 0 };
    return this.playerSprites[id];
  }

  drawMap() {
    var outer = this.add.graphics();
    outer.fillStyle(0x050a10, 1);
    outer.fillRect(-3000, -3000, 6000, 6000);
    outer.setDepth(-3);

    var imgAspect = 2412 / 1760;
    var displayH = CONSTANTS.WORLD_SIZE;
    var displayW = displayH * imgAspect;
    if (this.textures.exists('map-bg')) {
      this.add.image(0, 0, 'map-bg').setDisplaySize(displayW, displayH).setDepth(-2);
    } else {
      var g = this.add.graphics();
      g.fillStyle(0x1a3a5a, 1);
      g.fillCircle(0, 0, 800);
      g.setDepth(-2);
    }
  }
}
