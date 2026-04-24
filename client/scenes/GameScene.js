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

    var imgAspect = 2412 / 1760;
    var displayW = CONSTANTS.WORLD_SIZE * imgAspect;
    this.cameras.main.setBounds(
      -displayW / 2 - 50, -CONSTANTS.WORLD_SIZE / 2 - 50,
      displayW + 100, CONSTANTS.WORLD_SIZE + 100
    );

    this.drawMap();

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
        var nx = mySpr.container.x + dx;
        var ny = mySpr.container.y + dy;
        if (!window.isInsideMap || window.isInsideMap(nx, ny)) {
          mySpr.container.x = nx;
          mySpr.container.y = ny;
        } else if (window.isInsideMap(nx, mySpr.container.y)) {
          mySpr.container.x = nx;
        } else if (window.isInsideMap(mySpr.container.x, ny)) {
          mySpr.container.y = ny;
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
