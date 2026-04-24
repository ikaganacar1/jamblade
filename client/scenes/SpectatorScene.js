class SpectatorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Spectator' });
  }

  init(data) {
    this.gameData = data;
  }

  preload() {
    if (!this.textures.exists('map-bg')) {
      this.load.image('map-bg', 'assets/map.png');
    }
    var rSkins = window.runnerSkins || [];
    var hSkins = window.hunterSkins || [];
    for (var ri = 0; ri < rSkins.length; ri++) {
      if (!this.textures.exists('runner-skin-' + ri))
        this.load.spritesheet('runner-skin-' + ri, 'assets/runners/' + rSkins[ri], { frameWidth: 256, frameHeight: 256 });
    }
    for (var hi = 0; hi < hSkins.length; hi++) {
      if (!this.textures.exists('hunter-skin-' + hi))
        this.load.spritesheet('hunter-skin-' + hi, 'assets/hunters/' + hSkins[hi], { frameWidth: 256, frameHeight: 256 });
    }
  }

  create() {
    var w = this.cameras.main.width;
    var h = this.cameras.main.height;
    var font = 'Fredoka, sans-serif';
    var self = this;

    // Skin animations
    var rSkins = window.runnerSkins || [];
    var hSkins = window.hunterSkins || [];
    for (var ri = 0; ri < rSkins.length; ri++) {
      if (this.textures.exists('runner-skin-' + ri) && !this.anims.exists('runner-walk-' + ri)) {
        this.anims.create({ key: 'runner-walk-' + ri, frames: this.anims.generateFrameNumbers('runner-skin-' + ri, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'runner-idle-' + ri, frames: [{ key: 'runner-skin-' + ri, frame: 0 }], frameRate: 1 });
      }
    }
    for (var hi2 = 0; hi2 < hSkins.length; hi2++) {
      if (this.textures.exists('hunter-skin-' + hi2) && !this.anims.exists('hunter-walk-' + hi2)) {
        this.anims.create({ key: 'hunter-walk-' + hi2, frames: this.anims.generateFrameNumbers('hunter-skin-' + hi2, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'hunter-idle-' + hi2, frames: [{ key: 'hunter-skin-' + hi2, frame: 0 }], frameRate: 1 });
      }
    }

    var zoom = 0.5;
    this.zoom = zoom;

    var worldObjs = [];
    function addW(obj) { worldObjs.push(obj); return obj; }

    // ── WORLD: Map ──────────────────────────────────────────────
    var outer = addW(this.add.graphics().setDepth(-3));
    outer.fillStyle(0x050a10, 1);
    outer.fillRect(-3000, -3000, 6000, 6000);

    var imgAspect = 2412 / 1760;
    var displayH = CONSTANTS.WORLD_SIZE;
    var displayW = displayH * imgAspect;
    if (this.textures.exists('map-bg')) {
      addW(this.add.image(0, 0, 'map-bg').setDisplaySize(displayW, displayH).setDepth(-2));
    } else {
      var gfill = addW(this.add.graphics().setDepth(-2));
      gfill.fillStyle(0x1a3a5a, 1);
      gfill.fillCircle(0, 0, 800);
    }

    // ── WORLD: Players ─────────────────────────────────────────
    this.playerSprites = {};
    this.worldObjs = worldObjs;
    for (var id in this.gameData.players) {
      this.createPlayerSprite(id, this.gameData.players[id]);
    }

    // ── UI CAMERA ──────────────────────────────────────────────
    this.uiCam = this.cameras.add(0, 0, w, h).setName('ui');
    this.uiCam.ignore(this.worldObjs);

    // ── HUD ────────────────────────────────────────────────────
    this.timerText = this.add.text(10, 10, '', {
      fontFamily: font, fontSize: '20px', color: '#ffffff',
      backgroundColor: '#00000099', padding: { x: 10, y: 5 }, fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(1000);

    this.spectatorBadge = this.add.text(w / 2, 10, '👁  SEYİRCİ', {
      fontFamily: font, fontSize: '16px', color: '#ffdd88', fontStyle: 'bold',
      backgroundColor: '#00000099', padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    this.playerCountText = this.add.text(w - 10, 10, '', {
      fontFamily: font, fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#00000099', padding: { x: 10, y: 5 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);

    this.cameras.main.ignore([this.timerText, this.spectatorBadge, this.playerCountText]);

    // ── MAIN CAMERA ────────────────────────────────────────────
    var _imgAspect = 2412 / 1760;
    var _displayW = CONSTANTS.WORLD_SIZE * _imgAspect;
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(
      -_displayW / 2, -CONSTANTS.WORLD_SIZE / 2,
      _displayW, CONSTANTS.WORLD_SIZE
    );
    this.cameras.main.centerOn(0, 0);

    // ── DRAG TO PAN ────────────────────────────────────────────
    this._drag = null;
    this.input.on('pointerdown', function(ptr) {
      self._drag = { px: ptr.x, py: ptr.y, sx: self.cameras.main.scrollX, sy: self.cameras.main.scrollY };
    });
    this.input.on('pointermove', function(ptr) {
      if (!self._drag) return;
      self.cameras.main.setScroll(
        self._drag.sx - (ptr.x - self._drag.px) / zoom,
        self._drag.sy - (ptr.y - self._drag.py) / zoom
      );
    });
    this.input.on('pointerup', function() { self._drag = null; });
    this.input.on('pointerupoutside', function() { self._drag = null; });

    // ── Events ─────────────────────────────────────────────────
    this.latestState = null;
    this.prevState = null;
    this.stateTime = 0;
    window.network.on('game:state', function(state) {
      this.prevState = this.latestState;
      this.latestState = state;
      this.stateTime = 0;
    }.bind(this));
    window.network.on('game:end', function() { this.scene.start('Lobby'); }.bind(this));
  }

  update(time, delta) {
    if (!this.latestState) return;
    var state = this.latestState;

    this.stateTime += delta;
    var t = Math.min(this.stateTime / CONSTANTS.TICK_INTERVAL, 1);

    var min = Math.floor(state.timer / 60);
    var sec = state.timer % 60;
    this.timerText.setText('T ' + min + ':' + (sec < 10 ? '0' : '') + sec);

    var players = state.players;
    var total = Object.keys(players).length;
    this.playerCountText.setText('👥 ' + total);

    for (var pid in players) {
      var p = players[pid];
      var spr = this.playerSprites[pid];
      if (!spr) spr = this.createPlayerSprite(pid, p);

      if (this.prevState && this.prevState.players[pid]) {
        var prev = this.prevState.players[pid];
        spr.container.x = prev.x + (p.x - prev.x) * t;
        spr.container.y = prev.y + (p.y - prev.y) * t;
      } else {
        spr.container.x += (p.x - spr.container.x) * 0.3;
        spr.container.y += (p.y - spr.container.y) * 0.3;
      }

      if (p.moving) {
        spr.sprite.setFlipX(Math.cos(p.angle) < 0);
        if (spr.hasSheet) {
          var walkKey = spr.team === 'hunter' ? 'hunter-walk-' + spr.skin : 'runner-walk-' + spr.skin;
          if (!spr.sprite.anims.isPlaying || spr.sprite.anims.currentAnim?.key !== walkKey) spr.sprite.play(walkKey);
        }
      } else if (spr.hasSheet) {
        var idleKey = spr.team === 'hunter' ? 'hunter-idle-' + spr.skin : 'runner-idle-' + spr.skin;
        if (!spr.sprite.anims.isPlaying || spr.sprite.anims.currentAnim?.key !== idleKey) spr.sprite.play(idleKey);
      }

      spr.nameLabel.setText(p.name);
    }

    for (var dpid in this.playerSprites) {
      if (!players[dpid]) {
        this.playerSprites[dpid].container.destroy();
        delete this.playerSprites[dpid];
      }
    }
  }

  createPlayerSprite(id, data) {
    var skin = data.skin !== undefined ? data.skin : -1;
    var sheetKey = null;
    if (data.team === 'hunter' && skin >= 0 && this.textures.exists('hunter-skin-' + skin)) sheetKey = 'hunter-skin-' + skin;
    else if (data.team === 'runner' && skin >= 0 && this.textures.exists('runner-skin-' + skin)) sheetKey = 'runner-skin-' + skin;

    var hasSheet = !!sheetKey;
    var container = this.add.container(data.x, data.y).setDepth(100);

    if (this.uiCam) this.uiCam.ignore(container);
    if (this.worldObjs) this.worldObjs.push(container);

    var shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillEllipse(0, 20, 36, 12);
    var sprite = hasSheet
      ? this.add.sprite(0, 0, sheetKey, 0).setDisplaySize(48, 48)
      : this.add.image(0, 0, data.team === 'hunter' ? 'duck-hunter' : 'duck-runner').setDisplaySize(48, 38);
    var nameLabel = this.add.text(0, -28, data.name || '', {
      fontSize: '11px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 3, y: 1 },
    }).setOrigin(0.5);
    container.add([shadow, sprite, nameLabel]);

    this.playerSprites[id] = { container, sprite, nameLabel, hasSheet, team: data.team, skin };
    return this.playerSprites[id];
  }
}
