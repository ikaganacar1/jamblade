class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  init(data) {
    this.gameData = data;
  }

  preload() {
    // Load any skins not yet loaded
    var rSkins = window.runnerSkins || [];
    var hSkins = window.hunterSkins || [];
    for (var ri = 0; ri < rSkins.length; ri++) {
      if (!this.textures.exists('runner-skin-' + ri)) {
        this.load.spritesheet('runner-skin-' + ri, 'assets/runners/' + rSkins[ri], { frameWidth: 256, frameHeight: 256 });
      }
    }
    for (var hi = 0; hi < hSkins.length; hi++) {
      if (!this.textures.exists('hunter-skin-' + hi)) {
        this.load.spritesheet('hunter-skin-' + hi, 'assets/hunters/' + hSkins[hi], { frameWidth: 256, frameHeight: 256 });
      }
    }
  }

  create() {
    // Create any missing skin animations after preload
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

    var myId = window.network.id;
    var myTeam = this.gameData.players[myId]?.team;

    this.cameras.main.setBounds(
      -CONSTANTS.MAP_RADIUS - 50, -CONSTANTS.MAP_RADIUS - 50,
      CONSTANTS.WORLD_SIZE + 100, CONSTANTS.WORLD_SIZE + 100
    );

    this.drawMap();

    // Static shadows
    var shadowG = this.add.graphics().setDepth(0);
    shadowG.fillStyle(0x000000, 0.38);

    // Obstacle sprites
    for (var obs of this.gameData.obstacles) {
      if (obs.type === 'rock') {
        shadowG.fillEllipse(obs.x, obs.y + obs.radius * 0.85, obs.radius * 2, obs.radius * 0.65);
        this.add.image(obs.x, obs.y, 'rock').setDisplaySize(obs.radius * 2, obs.radius * 2);
      } else if (obs.type === 'tree') {
        shadowG.fillEllipse(obs.x, obs.y + 18, 50, 16);
        this.add.image(obs.x, obs.y, 'tree-trunk').setDisplaySize(30, 30);
        this.add.image(obs.x, obs.y - 10, 'tree-canopy').setDisplaySize(70, 70);
      } else if (obs.type === 'bush') {
        shadowG.fillEllipse(obs.x, obs.y + obs.radius * 0.5, obs.radius * 1.6, obs.radius * 0.6);
        this.add.image(obs.x, obs.y, 'bush').setDisplaySize(obs.radius * 2, obs.radius * 2).setAlpha(0.7);
      }
    }

    // Player sprites
    this.playerSprites = {};
    for (var [id, p] of Object.entries(this.gameData.players)) {
      this.createPlayerSprite(id, p);
    }

    var mySpr = this.playerSprites[myId];
    if (mySpr) {
      this.cameras.main.startFollow(mySpr.container, true, 0.08, 0.08);
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

    // Client-side prediction for local player
    var mySpr = this.playerSprites[myId];
    if (mySpr && this.joystick.moving) {
      var me = state.players[myId];
      if (me) {
        var speed = CONSTANTS.PLAYER_SPEED * (delta / 1000);
        var dx = Math.cos(this.joystick.angle) * speed;
        var dy = Math.sin(this.joystick.angle) * speed;
        mySpr.container.x += dx;
        mySpr.container.y += dy;
        var dist = Math.sqrt(mySpr.container.x * mySpr.container.x + mySpr.container.y * mySpr.container.y);
        if (dist > CONSTANTS.MAP_RADIUS) {
          var scale = CONSTANTS.MAP_RADIUS / dist;
          mySpr.container.x *= scale;
          mySpr.container.y *= scale;
        }
      }
    }

    for (var [id, p] of Object.entries(state.players)) {
      var spr = this.playerSprites[id];
      if (!spr) {
        spr = this.createPlayerSprite(id, p);
      }

      var isMe = id === myId;

      if (isMe) {
        spr.container.x += (p.x - spr.container.x) * 0.08;
        spr.container.y += (p.y - spr.container.y) * 0.08;
      } else if (this.prevState && this.prevState.players[id]) {
        var prev = this.prevState.players[id];
        spr.container.x = prev.x + (p.x - prev.x) * t;
        spr.container.y = prev.y + (p.y - prev.y) * t;
      } else {
        spr.container.x += (p.x - spr.container.x) * 0.2;
        spr.container.y += (p.y - spr.container.y) * 0.2;
      }

      if (p.moving) {
        spr.sprite.setFlipX(Math.cos(p.angle) < 0);
        if (spr.hasSheet) {
          var walkKey = spr.team === 'hunter' ? 'hunter-walk-' + spr.skin : 'runner-walk-' + spr.skin;
          if (!spr.sprite.anims.isPlaying || spr.sprite.anims.currentAnim.key !== walkKey) {
            spr.sprite.play(walkKey);
          }
        }
      } else if (spr.hasSheet) {
        var idleKey = spr.team === 'hunter' ? 'hunter-idle-' + spr.skin : 'runner-idle-' + spr.skin;
        if (!spr.sprite.anims.isPlaying || spr.sprite.anims.currentAnim.key !== idleKey) {
          spr.sprite.play(idleKey);
        }
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
    var sheetKey;
    var skin = data.skin !== undefined ? data.skin : -1;
    if (data.team === 'hunter' && skin >= 0 && this.textures.exists('hunter-skin-' + skin)) {
      sheetKey = 'hunter-skin-' + skin;
    } else if (data.team === 'runner' && skin >= 0 && this.textures.exists('runner-skin-' + skin)) {
      sheetKey = 'runner-skin-' + skin;
    } else {
      sheetKey = null;
    }
    var fallbackKey = data.team === 'hunter' ? 'duck-hunter' : 'duck-runner';
    var hasSheet = sheetKey && this.textures.exists(sheetKey);

    var container = this.add.container(data.x, data.y);
    var sprite;
    if (hasSheet) {
      sprite = this.add.sprite(0, 0, sheetKey, 0).setDisplaySize(48, 48);
    } else {
      sprite = this.add.image(0, 0, fallbackKey).setDisplaySize(48, 38);
    }
    var playerShadow = this.add.graphics();
    playerShadow.fillStyle(0x000000, 0.25);
    playerShadow.fillEllipse(0, 20, 36, 12);
    var nameLabel = this.add.text(0, -28, data.name || '', {
      fontSize: '11px', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 3, y: 1 },
    }).setOrigin(0.5);
    container.add([playerShadow, sprite, nameLabel]);
    container.setDepth(100);

    this.playerSprites[id] = { container, sprite, nameLabel, hasSheet, team: data.team, skin };
    return this.playerSprites[id];
  }

  drawMap() {
    var outer = this.add.graphics();
    outer.fillStyle(0x111111, 1);
    outer.fillRect(
      -CONSTANTS.MAP_RADIUS - 200, -CONSTANTS.MAP_RADIUS - 200,
      CONSTANTS.WORLD_SIZE + 400, CONSTANTS.WORLD_SIZE + 400
    );
    outer.setDepth(-3);

    var mapSize = CONSTANTS.MAP_RADIUS * 2;
    if (this.textures.exists('map-bg')) {
      this.add.image(0, 0, 'map-bg').setDisplaySize(mapSize, mapSize).setDepth(-2);
    } else {
      var g = this.add.graphics();
      g.fillStyle(0x4a8a2a, 1);
      g.fillCircle(0, 0, CONSTANTS.MAP_RADIUS);
      g.setDepth(-2);
    }

    var border = this.add.graphics();
    border.lineStyle(6, 0xff4444, 0.8);
    border.strokeCircle(0, 0, CONSTANTS.MAP_RADIUS);
    border.lineStyle(2, 0xffffff, 0.3);
    border.strokeCircle(0, 0, CONSTANTS.MAP_RADIUS + 4);
    border.setDepth(50);
  }
}
