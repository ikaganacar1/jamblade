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

    var imgAspect = 2412 / 1760;
    var displayW = CONSTANTS.WORLD_SIZE * imgAspect;
    var displayH = CONSTANTS.WORLD_SIZE;
    var zoom = Math.min(this.cameras.main.width / displayW, this.cameras.main.height / displayH);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(0, 0);

    this.drawMap();

    // ── Launcher placeholders (world space, below players) ────────
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
      // Corner accents
      lg.lineStyle(2, 0x66ccff, 0.6);
      lg.strokeRect(p0.x - lw / 2 + 8, p0.y - lh / 2 + 8, lw - 16, lh - 16);
    }

    // Player sprites
    this.playerSprites = {};
    for (var id2 in this.gameData.players) {
      this.createPlayerSprite(id2, this.gameData.players[id2]);
    }

    this.joystick = new VirtualJoystick(this);

    // ── Aim arrow (world space, updated each frame) ───────────────
    this.aimArrow = this.add.graphics().setDepth(90);

    // ── Power bar (HUD) ───────────────────────────────────────────
    var hf = 'Fredoka, sans-serif';
    this.powerBarG = this.add.graphics().setScrollFactor(0).setDepth(1001);
    this.powerBarLabelTop = this.add.text(755, 68, 'GÜÇ', {
      fontFamily: hf, fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(1002);
    this.powerBarLabelBot = this.add.text(755, 302, 'TIKLA!', {
      fontFamily: hf, fontSize: '11px', color: '#aaddff', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1002);
    this.aimHintText = this.add.text(755, 315, 'yön: sol', {
      fontFamily: hf, fontSize: '10px', color: '#88aacc',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1002);

    this.myLaunching = true;
    this.barProgress = 0;
    this.barDir = 1;

    // Tap right half → launch
    this.input.on('pointerdown', function(ptr) {
      if (!self.myLaunching) return;
      if (ptr.x < self.cameras.main.width * 0.5) return; // left = joystick
      window.network.emit('launch', {
        speed: self.barProgress,
        angle: self.joystick.angle,
      });
      self.myLaunching = false;
      self.powerBarG.clear();
      self.powerBarLabelTop.setAlpha(0);
      self.powerBarLabelBot.setAlpha(0);
      self.aimHintText.setAlpha(0);
      self.aimArrow.clear();
    });

    // ── HUD ───────────────────────────────────────────────────────
    this.timerText = this.add.text(10, 10, '', {
      fontFamily: hf, fontSize: '20px', color: '#ffffff',
      backgroundColor: '#00000099', padding: { x: 10, y: 5 }, fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(999);

    // Input send
    this.inputTimer = this.time.addEvent({
      delay: CONSTANTS.TICK_INTERVAL,
      callback: function() {
        window.network.emit('input', { angle: this.joystick.angle, moving: this.joystick.moving });
      },
      callbackScope: this,
      loop: true,
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

    // ── Power bar + aim arrow (while waiting to launch) ──────────
    if (this.myLaunching) {
      this.barProgress += this.barDir * delta / 750;
      if (this.barProgress >= 1) { this.barProgress = 1; this.barDir = -1; }
      if (this.barProgress <= 0) { this.barProgress = 0; this.barDir = 1; }
      this.drawPowerBar(this.barProgress);

      var mySpawn = this.launcherPositions[myId];
      if (mySpawn) {
        var ang = this.joystick.angle;
        var arrowLen = 220;
        var ax = mySpawn.x + Math.cos(ang) * arrowLen;
        var ay = mySpawn.y + Math.sin(ang) * arrowLen;
        this.aimArrow.clear();
        this.aimArrow.lineStyle(10, 0xffee00, 0.9);
        this.aimArrow.lineBetween(mySpawn.x, mySpawn.y, ax, ay);
        this.aimArrow.fillStyle(0xffee00, 0.9);
        this.aimArrow.fillTriangle(
          ax, ay,
          ax - Math.cos(ang - 0.45) * 50, ay - Math.sin(ang - 0.45) * 50,
          ax - Math.cos(ang + 0.45) * 50, ay - Math.sin(ang + 0.45) * 50
        );
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

      // Only spin active players; launching players sit still
      if (p.state === 'active') {
        spr.localRotation = (spr.localRotation || 0) + (p.spinSpeed / 100) * 18 * (delta / 1000);
        spr.sprite.rotation = spr.localRotation;
      }

      spr.nameLabel.setText(p.name);
    }

    // Remove disconnected players
    for (var pid in this.playerSprites) {
      if (!state.players[pid]) {
        this.playerSprites[pid].container.destroy();
        delete this.playerSprites[pid];
      }
    }
  }

  drawPowerBar(progress) {
    var g = this.powerBarG;
    g.clear();
    var bx = 730, by = 72, bw = 50, bh = 226;

    // Dark background
    g.fillStyle(0x000000, 0.75);
    g.fillRoundedRect(bx - 6, by - 4, bw + 12, bh + 8, 8);

    // Gradient strips: red (bottom) → green (top)
    var strips = 24;
    var sh = bh / strips;
    for (var i = 0; i < strips; i++) {
      var t = i / (strips - 1);
      var r = Math.floor(220 * (1 - t));
      var gr = Math.floor(210 * t);
      g.fillStyle((r << 16) | (gr << 8) | 20, 1);
      g.fillRect(bx, by + bh - (i + 1) * sh, bw, sh + 1);
    }

    // Moving pointer
    var py = by + bh - progress * bh;
    g.lineStyle(5, 0xffffff, 1);
    g.lineBetween(bx - 4, py, bx + bw + 4, py);
    // Side triangles
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(bx - 4, py, bx - 16, py - 9, bx - 16, py + 9);
    g.fillTriangle(bx + bw + 4, py, bx + bw + 16, py - 9, bx + bw + 16, py + 9);
  }

  createPlayerSprite(id, data) {
    var size = CONSTANTS.PLAYER_RADIUS * 2;
    var container = this.add.container(data.x, data.y);
    var shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillEllipse(size * 0.15, size * 0.35, size * 0.9, size * 0.28);
    var sprite = this.add.image(0, 0, 'player').setDisplaySize(size, size);
    var nameLabel = this.add.text(0, -(size * 0.6), data.name || '', {
      fontSize: '20px', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add([shadow, sprite, nameLabel]);
    container.setDepth(100);

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
