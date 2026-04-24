class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Lobby' });
  }

  create() {
    var w = this.cameras.main.width;
    var h = this.cameras.main.height;
    var font = 'Fredoka, sans-serif';
    var self = this;

    this.isSpectator = false;

    // ── BACKGROUND ──────────────────────────────────────
    var bg = this.add.graphics();
    bg.fillGradientStyle(0x173a8b, 0x173a8b , 0xFFCEE3 ,0xFFCEE3 , 1);
    
    bg.fillRect(0, 0, w, h);

    // Divider line
    this.add.graphics().lineStyle(2, 0xFF85BB, 0.5).lineBetween(400, 0, 400, h);

    // ── LEFT PANEL ──────────────────────────────────────
    this.add.text(200, 4, 'JamBlade', {
      fontFamily: 'JapanBrush', fontSize: '72px', color: '#FF85BB',
      stroke: '#021A54', strokeThickness: 4,
    }).setOrigin(0.5, 0);

    var listBg = this.add.graphics();
    listBg.fillStyle(0x000000, 0.22);
    listBg.fillRoundedRect(8, 82, 385, 242, 8);

    this.playerListTitle = this.add.text(200, 88, 'Oyuncular', {
      fontFamily: font, fontSize: '12px', color: '#FF85BB', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.playerListText = this.add.text(200, 104, 'Bağlanılıyor...', {
      fontFamily: font, fontSize: '11px', color: '#FF85BB',
      align: 'center', lineSpacing: 3,
    }).setOrigin(0.5, 0);

    this.countdownText = this.add.text(200, 340, '', {
      fontFamily: font, fontSize: '15px', color: '#660000', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // ── RIGHT PANEL ──────────────────────────────────────
    var rx = 415;

    this.add.text(rx, 10, 'İsmin:', {
      fontFamily: font, fontSize: '10px', color: '#FF85BB', fontStyle: 'bold',
    });

    var names = CONSTANTS.PLAYER_NAMES;
    this.playerName = names[Math.floor(Math.random() * names.length)];

    this.nameTag = this.add.text(rx, 24, this.playerName, {
      fontFamily: font, fontSize: '20px', color: '#FF85BB', fontStyle: 'bold',
      backgroundColor: '#00000018', padding: { x: 14, y: 6 },
    }).setInteractive({ useHandCursor: true });

    this.add.text(rx, 58, 'değiştirmek için tıkla', {
      fontFamily: font, fontSize: '9px', color: '#FF85BB',
    });

    this.nameTag.on('pointerdown', function() {
      self.playerName = names[Math.floor(Math.random() * names.length)];
      self.nameTag.setText(self.playerName);
      window.network.emit('name:update', { name: self.playerName });
    });

    // ── READY BUTTON ────────────────────────────────────
    this.isReady = false;
    this.readyBtn = this.add.text(606, h - 38, 'HAZIR VER', {
      fontFamily: font, fontSize: '17px', color: '#FF85BB', fontStyle: 'bold',
      backgroundColor: '#7a2200', padding: { x: 28, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.readyBtn.on('pointerdown', function() {
      self.isReady = !self.isReady;
      self.readyBtn.setText(self.isReady ? '✓ HAZIR' : 'HAZIR VER');
      self.readyBtn.setStyle({
        color: self.isReady ? '#00ff88' : '#FF85BB',
        backgroundColor: self.isReady ? '#0a4422' : '#7a2200',
      });
      window.network.emit('ready', { ready: self.isReady });
    });

    // ── SPECTATOR ────────────────────────────────────────
    this.spectatorBtn = this.add.text(606, h - 78, '👁  SEYİRCİ OL', {
      fontFamily: font, fontSize: '14px', color: '#aaddff', fontStyle: 'bold',
      backgroundColor: '#003355', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.spectatorBtn.on('pointerdown', function() {
      if (self.isSpectator) return;
      self.isSpectator = true;
      self.readyBtn.setVisible(false);
      self.spectatorBtn.setAlpha(0).disableInteractive();
      self.spectatorStatusText.setAlpha(1);
      self.backToPlayerBtn.setAlpha(1);
      window.network.emit('spectate', { name: self.playerName });
    });

    this.spectatorStatusText = this.add.text(606, h - 120, '👁 SEYİRCİ\nOYUN BEKLENİYOR', {
      fontFamily: font, fontSize: '14px', color: '#aaddff', fontStyle: 'bold',
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5).setAlpha(0);

    this.backToPlayerBtn = this.add.text(606, h - 78, 'OYUNCU OL', {
      fontFamily: font, fontSize: '14px', color: '#FF85BB', fontStyle: 'bold',
      backgroundColor: '#ff3791', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);

    this.backToPlayerBtn.on('pointerdown', function() {
      if (!self.isSpectator) return;
      self.isSpectator = false;
      self.isReady = false;
      self.readyBtn.setVisible(true).setText('HAZIR VER').setStyle({ color: '#FF85BB', backgroundColor: '#7a2200' });
      self.spectatorBtn.setAlpha(1).setInteractive({ useHandCursor: true });
      self.spectatorStatusText.setAlpha(0);
      self.backToPlayerBtn.setAlpha(0);
      window.network.emit('join', { name: self.playerName });
    });

    // ── POPUP ────────────────────────────────────────────
    this.popupText = this.add.text(w / 2, h / 2, '', {
      fontFamily: font, fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#cc2200dd', padding: { x: 28, y: 14 },
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(501).setAlpha(0);

    // ── MENU MUSIC ───────────────────────────────────────
    if (!this.sound.get('sfx-menu')) {
      this.menuMusic = this.sound.add('sfx-menu', { volume: 0.3, loop: true });
    } else {
      this.menuMusic = this.sound.get('sfx-menu');
    }
    if (!this.menuMusic.isPlaying) this.menuMusic.play();

    window.network.emit('join', { name: this.playerName });

    // ── SOCKET EVENTS ────────────────────────────────────
    window.network.on('lobby:update', function(data) {
      var players = data.players;
      self.playerListTitle.setText('OYUNCULAR (' + players.length + '/' + CONSTANTS.MAX_PLAYERS + ')');

      var lines = [];
      for (var i = 0; i < players.length; i++) {
        var p = players[i];
        var ready = p.ready ? ' ✓' : '';
        var me = p.id === window.network.id ? ' ← sen' : '';
        lines.push('⚪ ' + p.name + ready + me);
      }
      var spectators = data.spectators || [];
      for (var sp = 0; sp < spectators.length; sp++) {
        var isMe = spectators[sp].id === window.network.id ? ' ← sen' : '';
        lines.push('👁 ' + spectators[sp].name + isMe);
      }
      if (players.length < CONSTANTS.MIN_PLAYERS) {
        lines.push('');
        lines.push('min ' + CONSTANTS.MIN_PLAYERS + ' oyuncu gerekli');
      }
      self.playerListText.setText(lines.join('\n'));
    });

    window.network.on('lobby:countdown', function(data) {
      self.countdownText.setText(data.seconds > 0 ? 'Oyun ' + data.seconds + 's içinde başlıyor!' : '');
    });

    window.network.on('game:start', function(data) {
      if (self.menuMusic) self.menuMusic.stop();
      self.scene.start(self.isSpectator ? 'Spectator' : 'Countdown', data);
    });

    window.network.on('game:spectate', function(data) {
      if (self.menuMusic) self.menuMusic.stop();
      self.scene.start('Spectator', data);
    });

    window.network.on('lobby:full', function() {
      self.playerListText.setText('Lobi dolu!');
    });

    window.network.on('lobby:gameInProgress', function() {
      self.playerListText.setText('Oyun devam ediyor, bekleyin...');
    });

    this.events.once('shutdown', function() {
      window.network.off('lobby:update');
      window.network.off('lobby:countdown');
      window.network.off('game:start');
      window.network.off('game:spectate');
      window.network.off('lobby:full');
      window.network.off('lobby:gameInProgress');
    });
  }

  showPopup(msg) {
    var self = this;
    this.popupText.setText(msg).setAlpha(1).setScale(0.7);
    this.tweens.add({ targets: this.popupText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    if (this._popupTimer) this._popupTimer.remove();
    this._popupTimer = this.time.delayedCall(2000, function() {
      self.tweens.add({ targets: self.popupText, alpha: 0, duration: 400, ease: 'Quad.easeIn' });
    });
  }
}
