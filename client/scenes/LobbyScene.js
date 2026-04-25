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
    this._lobbyData = null;

    // ── BACKGROUND ──────────────────────────────────────
    this.add.image(w / 2, h / 2, 'bg').setDisplaySize(w, h);

    // Divider line
    this.add.graphics().lineStyle(2, 0xFF85BB, 0.5).lineBetween(400, 0, 400, h);

    // ── LEFT PANEL ──────────────────────────────────────
    // Title hidden (logo is in the background image)

    var listBg = this.add.graphics();
    listBg.fillStyle(0x000000, 0.32);
    listBg.fillRoundedRect(8, 94, 385, 242, 8);

    this.playerListTitle = this.add.text(200, 100, 'Oyuncular', {
      fontFamily: font, fontSize: '12px', color: '#FF85BB', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.playerListText = this.add.text(200, 116, 'Bağlanılıyor...', {
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
      backgroundColor: '#00000032', padding: { x: 14, y: 6 },
    }).setInteractive({ useHandCursor: true });

    this.add.text(rx, 58, 'değiştirmek için tıkla', {
      fontFamily: font, fontSize: '9px', color: '#FF85BB',
    });

    this.nameTag.on('pointerdown', function() {
      self.playerName = names[Math.floor(Math.random() * names.length)];
      self.nameTag.setText(self.playerName);
      window.network.emit('name:update', { name: self.playerName });
      self.refreshPlayerList();
    });

    // ── CATEGORY SELECTION ───────────────────────────────
    this.selectedCategory = 'balance';
    this.selectedSkin = 0;

    var catKeys   = ['attack', 'defence', 'stamina', 'balance'];
    var catLabels = ['SALDIRI', 'SAVUNMA', 'STAMİNA', 'DENGE'];
    var catBgColors = { attack: '#8B0000', defence: '#003080', stamina: '#005500', balance: '#5a4000' };

    this.add.text(rx, 70, 'Tip Seç:', {
      fontFamily: font, fontSize: '10px', color: '#FF85BB', fontStyle: 'bold',
    });

    this.catBtns = {};
    var catBtnW = 84, catBtnGap = 7;
    var catStartX = rx + 5;
    for (var ci = 0; ci < catKeys.length; ci++) {
      (function(idx) {
        var ck = catKeys[idx];
        var bx = catStartX + idx * (catBtnW + catBtnGap) + catBtnW / 2;
        var btn = self.add.text(bx, 82, catLabels[idx], {
          fontFamily: font, fontSize: '9px', color: '#ffffff', fontStyle: 'bold',
          backgroundColor: catBgColors[ck] + 'cc',
          padding: { x: 6, y: 5 },
        }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

        btn.on('pointerdown', function() {
          self.selectedCategory = ck;
          self.selectedSkin = 0;
          self.updateCatButtons();
          self.buildSkinGrid();
          window.network.emit('category:select', { category: ck });
          window.network.emit('skin:select', { skin: 0 });
        });
        self.catBtns[ck] = btn;
      })(ci);
    }
    this.updateCatButtons();

    // ── SKIN GRID ────────────────────────────────────────
    this.skinSprites = [];
    this.skinHighlight = this.add.graphics();
    this.catDescText = this.add.text(rx + 197, 258, '', {
      fontFamily: font, fontSize: '9px', color: '#FFCCDD',
      align: 'center', wordWrap: { width: 385 },
    }).setOrigin(0.5, 0);

    this.buildSkinGrid();

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
      self._lobbyData = data;
      // Sync my selection from server state
      for (var i = 0; i < data.players.length; i++) {
        var p = data.players[i];
        if (p.id === window.network.id) {
          if (p.category && p.category !== self.selectedCategory) {
            self.selectedCategory = p.category;
            self.selectedSkin = p.skin || 0;
            self.updateCatButtons();
            self.buildSkinGrid();
          } else if (p.skin !== undefined && p.skin !== self.selectedSkin) {
            self.selectedSkin = p.skin;
            self.highlightSkin();
          }
          break;
        }
      }
      self.refreshPlayerList();
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
      // Retry joining once the server clears the game
      self.time.delayedCall(2000, function() {
        window.network.emit('join', { name: self.playerName });
      });
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

  updateCatButtons() {
    var catColors = { attack: '#cc3300', defence: '#0055cc', stamina: '#008833', balance: '#997700' };
    var catKeys = ['attack', 'defence', 'stamina', 'balance'];
    for (var i = 0; i < catKeys.length; i++) {
      var ck = catKeys[i];
      var btn = this.catBtns[ck];
      if (!btn) continue;
      var selected = ck === this.selectedCategory;
      btn.setStyle({
        backgroundColor: selected ? catColors[ck] : catColors[ck] + '55',
        color: selected ? '#ffffff' : '#aaaaaa',
      });
    }
    // Update description
    if (this.catDescText) {
      var desc = CONSTANTS.CATEGORY_DESC[this.selectedCategory] || '';
      this.catDescText.setText(desc);
    }
  }

  buildSkinGrid() {
    // Destroy old skin sprites
    for (var i = 0; i < this.skinSprites.length; i++) this.skinSprites[i].destroy();
    this.skinSprites = [];
    this.skinHighlight.clear();

    var cat = this.selectedCategory;
    var self = this;
    var skinSize = 72;
    var gap = 10;
    var cols = 4;
    var totalW = cols * skinSize + (cols - 1) * gap;
    var startX = 415 + (397 - totalW) / 2;
    var startY = 110;

    for (var si = 0; si < 4; si++) {
      (function(idx) {
        var col = idx % 2, row = Math.floor(idx / 2);
        // 2x2 layout
        var sx = startX + col * (skinSize + gap) + skinSize / 2;
        var sy = startY + row * (skinSize + gap) + skinSize / 2;
        var key = 'char-' + cat + '-' + idx;
        if (!self.textures.exists(key)) return;

        var spr = self.add.image(sx, sy, key)
          .setDisplaySize(skinSize, skinSize)
          .setInteractive({ useHandCursor: true });

        spr.on('pointerover', function() { spr.setAlpha(0.75); });
        spr.on('pointerout', function() { spr.setAlpha(1); });
        spr.on('pointerdown', function() {
          self.selectedSkin = idx;
          self.highlightSkin();
          window.network.emit('skin:select', { skin: idx });
        });

        self.skinSprites.push(spr);
      })(si);
    }
    this.highlightSkin();
  }

  highlightSkin() {
    this.skinHighlight.clear();
    var spr = this.skinSprites[this.selectedSkin];
    if (!spr) return;
    this.skinHighlight.lineStyle(3, 0xFF85BB, 1);
    this.skinHighlight.strokeRect(spr.x - 38, spr.y - 38, 76, 76);
  }

  refreshPlayerList() {
    var data = this._lobbyData;
    if (!data) return;

    var players = data.players;
    this.playerListTitle.setText('OYUNCULAR (' + players.length + '/' + CONSTANTS.MAX_PLAYERS + ')');

    var lines = [];
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      // If this is me, show my current local name (may differ from server until roundtrip)
      var displayName = (p.id === window.network.id) ? this.playerName : p.name;
      var ready = p.ready ? ' ✓' : '';
      var me = p.id === window.network.id ? ' ← sen' : '';
      var catBadge = { attack: '[ATK]', defence: '[DEF]', stamina: '[STA]', balance: '[BAL]' };
      var badge = catBadge[p.category] || '[BAL]';
      lines.push(badge + ' ' + displayName + ready + me);
    }
    var spectators = data.spectators || [];
    for (var sp = 0; sp < spectators.length; sp++) {
      var isMe = spectators[sp].id === window.network.id ? ' ← sen' : '';
      lines.push('👁 ' + spectators[sp].name + isMe);
    }
    if (players.length < CONSTANTS.MIN_PLAYERS) {
      lines.push('');
      lines.push('');
      lines.push('');
      lines.push('');
      lines.push('min ' + CONSTANTS.MIN_PLAYERS + ' oyuncu gerekli');
    }
    this.playerListText.setText(lines.join('\n'));
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
