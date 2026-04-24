class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  init(data) {
    this.gameData = data;
  }

  create() {
    var myId = window.network.id;
    var myTeam = this.gameData.players[myId]?.team;

    // Fixed camera: zoom to fit the full map, no following
    var imgAspect = 2412 / 1760;
    var displayW = CONSTANTS.WORLD_SIZE * imgAspect;
    var displayH = CONSTANTS.WORLD_SIZE;
    var zoom = Math.min(this.cameras.main.width / displayW, this.cameras.main.height / displayH);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(0, 0);

    this.drawMap();

    // Player sprites
    this.playerSprites = {};
    for (var [id, p] of Object.entries(this.gameData.players)) {
      this.createPlayerSprite(id, p);
    }

    this.joystick = new VirtualJoystick(this);

    // HUD
    var hudFont = 'Fredoka, sans-serif';
    var teamColor = myTeam === 'hunter' ? '#ff6644' : '#f0c020';
    var teamLabel = myTeam === 'hunter' ? '🔴 KOVALAYAN' : '🟡 KAÇAN';

    this.timerText = this.add.text(10, 10, '', {
      fontFamily: hudFont, fontSize: '20px', color: '#ffffff',
      backgroundColor: '#00000099', padding: { x: 10, y: 5 },
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(999);

    this.teamText = this.add.text(10, 44, teamLabel, {
      fontFamily: hudFont, fontSize: '15px', color: teamColor,
      backgroundColor: '#00000099', padding: { x: 10, y: 5 },
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(999);

    // Input send
    this.inputTimer = this.time.addEvent({
      delay: CONSTANTS.TICK_INTERVAL,
      callback: function() {
        window.network.emit('input', {
          angle: this.joystick.angle,
          moving: this.joystick.moving,
        });
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
      data.myTeam = myTeam;
      this.scene.start('Result', data);
    }.bind(this));
  }

  update(time, delta) {
    if (!this.latestState) return;
    var myId = window.network.id;
    var state = this.latestState;

    // Timer
    var min = Math.floor(state.timer / 60);
    var sec = state.timer % 60;
    this.timerText.setText('T ' + min + ':' + (sec < 10 ? '0' : '') + sec);

    // Interpolation timing
    this.stateTime += delta;
    var t = Math.min(this.stateTime / CONSTANTS.TICK_INTERVAL, 1);

    for (var [id, p] of Object.entries(state.players)) {
      var spr = this.playerSprites[id];
      if (!spr) {
        spr = this.createPlayerSprite(id, p);
      }

      if (this.prevState && this.prevState.players[id]) {
        var prev = this.prevState.players[id];
        spr.container.x = prev.x + (p.x - prev.x) * t;
        spr.container.y = prev.y + (p.y - prev.y) * t;
      } else {
        spr.container.x += (p.x - spr.container.x) * 0.2;
        spr.container.y += (p.y - spr.container.y) * 0.2;
      }

      if (p.moving) {
        spr.sprite.setFlipX(Math.cos(p.angle) < 0);
      }

      spr.nameLabel.setText(p.name);
    }

    // Remove disconnected players
    for (var pid of Object.keys(this.playerSprites)) {
      if (!state.players[pid]) {
        this.playerSprites[pid].container.destroy();
        delete this.playerSprites[pid];
      }
    }
  }

  createPlayerSprite(id, data) {
    var container = this.add.container(data.x, data.y);
    var sprite = this.add.image(0, 0, 'player').setDisplaySize(48, 48);
    var shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillEllipse(0, 20, 36, 12);
    var nameLabel = this.add.text(0, -28, data.name || '', {
      fontSize: '11px', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 3, y: 1 },
    }).setOrigin(0.5);
    container.add([shadow, sprite, nameLabel]);
    container.setDepth(100);

    this.playerSprites[id] = { container, sprite, nameLabel };
    return this.playerSprites[id];
  }

  drawMap() {
    // Dark fill behind everything in case the image doesn't cover the edges
    var outer = this.add.graphics();
    outer.fillStyle(0x050a10, 1);
    outer.fillRect(-3000, -3000, 6000, 6000);
    outer.setDepth(-3);

    // Map background — display at natural aspect ratio scaled to WORLD_SIZE height
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
