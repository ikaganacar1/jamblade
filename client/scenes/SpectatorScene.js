class SpectatorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Spectator' });
  }

  init(data) {
    this.gameData = data;
  }

  create() {
    var w = this.cameras.main.width;
    var h = this.cameras.main.height;
    var font = 'Fredoka, sans-serif';
    var self = this;

    var imgAspect = 2412 / 1760;
    var displayW = CONSTANTS.WORLD_SIZE * imgAspect;
    var displayH = CONSTANTS.WORLD_SIZE;
    var zoom = Math.min(w / displayW, h / displayH);
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
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(0, 0);

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

      spr.localRotation = (spr.localRotation || 0) + (p.spinSpeed / 100) * 18 * (delta / 1000);
      spr.sprite.rotation = spr.localRotation;

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
    var size = CONSTANTS.PLAYER_RADIUS * 2;
    var container = this.add.container(data.x, data.y).setDepth(100);

    if (this.uiCam) this.uiCam.ignore(container);
    if (this.worldObjs) this.worldObjs.push(container);

    var shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillEllipse(size * 0.15, size * 0.35, size * 0.9, size * 0.28);
    var sprite = this.add.image(0, 0, 'player').setDisplaySize(size, size);
    var nameLabel = this.add.text(0, -(size * 0.6), data.name || '', {
      fontSize: '20px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add([shadow, sprite, nameLabel]);

    this.playerSprites[id] = { container, sprite, nameLabel, localRotation: 0 };
    return this.playerSprites[id];
  }
}
