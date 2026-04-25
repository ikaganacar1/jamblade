class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Lobby' });
  }

  create() {
    var w = this.cameras.main.width;
    var h = this.cameras.main.height;
    var font = 'Comicbon';
    var self = this;

    this.isSpectator = false;
    this._lobbyData = null;

    // ── BACKGROUND ──────────────────────────────────────────────────
    this.add.image(w / 2, h / 2, 'bg').setDisplaySize(w, h);

    // ── LEFT PANEL ──────────────────────────────────────────────────
    var panelBg = this.add.graphics();
    panelBg.fillStyle(0x000000, 0.38);
    panelBg.fillRoundedRect(6, 6, 390, 357, 22);

    // Name section (top of left panel)
    this.add.text(18, 14, 'İsmin:', {
      fontFamily: font, fontSize: '10px', color: '#FF85BB', fontStyle: 'bold',
    });

    var names = CONSTANTS.PLAYER_NAMES;
    this.playerName = names[Math.floor(Math.random() * names.length)];

    this.nameTag = this.add.text(18, 28, this.playerName, {
      fontFamily: font, fontSize: '20px', color: '#FF85BB', fontStyle: 'bold',
      backgroundColor: '#ffffff22', padding: { x: 10, y: 5 },
    }).setInteractive({ useHandCursor: true });

    this.add.text(18, 62, 'değiştirmek için tıkla', {
      fontFamily: font, fontSize: '9px', color: '#ffaabb',
    });

    this.nameTag.on('pointerdown', function() {
      self.playerName = names[Math.floor(Math.random() * names.length)];
      self.nameTag.setText(self.playerName);
      window.network.emit('name:update', { name: self.playerName });
      self.refreshPlayerList();
    });

    // Separator inside left panel
    var sep = this.add.graphics();
    sep.lineStyle(1, 0xFF85BB, 0.3);
    sep.lineBetween(18, 74, 388, 74);

    // Player list section
    this.playerListTitle = this.add.text(200, 80, 'Oyuncular', {
      fontFamily: font, fontSize: '12px', color: '#FF85BB', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.playerListText = this.add.text(200, 96, 'Bağlanılıyor...', {
      fontFamily: font, fontSize: '11px', color: '#FF85BB',
      align: 'center', lineSpacing: 3,
    }).setOrigin(0.5, 0);

    this.countdownText = this.add.text(200, 342, '', {
      fontFamily: font, fontSize: '14px', color: '#ffdd88', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // ── RIGHT PANEL ──────────────────────────────────────────────────
    var rx = 415;

    // ── Category buttons ─────────────────────────────────────────────
    this.add.text(rx + 4, 6, 'TİP SEÇ:', {
      fontFamily: font, fontSize: '10px', color: '#FF85BB', fontStyle: 'bold',
    });

    this.selectedCategory = 'balance';
    this.selectedSkin = 0;

    var catKeys   = ['attack', 'defence', 'stamina', 'balance'];
    var catLabels = ['SALDIRI', 'SAVUNMA', 'STAMİNA', 'DENGE'];
    var catActiveColors  = { attack: 0xcc2200, defence: 0x0044bb, stamina: 0x006622, balance: 0x886600 };
    var catInactiveAlpha = 0.35;

    var catBtnW = 86, catBtnH = 30, catBtnGap = 5, catBtnRadius = 14;
    var catStartX = rx + 4;

    this.catBtns = {};
    for (var ci = 0; ci < catKeys.length; ci++) {
      (function(idx) {
        var ck = catKeys[idx];
        var cx = catStartX + idx * (catBtnW + catBtnGap) + catBtnW / 2;
        var cy = 38;
        var btn = self._rBtn(cx, cy, catBtnW, catBtnH, catLabels[idx], font, '9px', '#ffffff', catActiveColors[ck], catBtnRadius);
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

    // ── Skin grid ─────────────────────────────────────────────────────
    this.add.text(rx + 4, 74, 'KARAKTER SEÇ:', {
      fontFamily: font, fontSize: '10px', color: '#FF85BB', fontStyle: 'bold',
    });

    this.skinSprites = [];
    this.skinHighlight = this.add.graphics();
    this.catDescText = this.add.text(rx + 198, 222, '', {
      fontFamily: font, fontSize: '9px', color: '#ffccdd', align: 'center',
      wordWrap: { width: 390 },
    }).setOrigin(0.5, 0);

    this.buildSkinGrid();

    // ── Spectator ────────────────────────────────────────────────────
    this.spectatorStatusText = this.add.text(rx + 198, h - 132, '👁 SEYİRCİ\nOYUN BEKLENİYOR', {
      fontFamily: font, fontSize: '13px', color: '#aaddff', fontStyle: 'bold',
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0).setAlpha(0);

    this.spectatorBtn = this._rBtn(rx + 198, h - 80, 174, 34, '👁  SEYİRCİ OL', font, '13px', '#aaddff', 0x003355, 16);
    this.spectatorBtn.on('pointerdown', function() {
      if (self.isSpectator) return;
      self.isSpectator = true;
      self.readyBtn.setVisible(false);
      self.spectatorBtn.setAlpha(0).disableInteractive();
      self.spectatorStatusText.setAlpha(1);
      self.backToPlayerBtn.setVisible(true);
      window.network.emit('spectate', { name: self.playerName });
    });

    this.backToPlayerBtn = this._rBtn(rx + 198, h - 80, 174, 34, 'OYUNCU OL', font, '13px', '#FF85BB', 0xcc2277, 16);
    this.backToPlayerBtn.setVisible(false);
    this.backToPlayerBtn.on('pointerdown', function() {
      if (!self.isSpectator) return;
      self.isSpectator = false;
      self.isReady = false;
      self.readyBtn.setVisible(true).setText('HAZIR VER').updateBg(0x7a2200).setTextColor('#FF85BB');
      self.spectatorBtn.setAlpha(1).enableInteractive();
      self.spectatorStatusText.setAlpha(0);
      self.backToPlayerBtn.setVisible(false);
      window.network.emit('join', { name: self.playerName });
    });

    // ── Ready button ─────────────────────────────────────────────────
    this.isReady = false;
    this.readyBtn = this._rBtn(rx + 198, h - 34, 190, 40, 'HAZIR VER', font, '17px', '#FF85BB', 0x7a2200, 18);
    this.readyBtn.on('pointerdown', function() {
      self.isReady = !self.isReady;
      if (self.isReady) {
        self.readyBtn.setText('✓ HAZIR').updateBg(0x0a4422).setTextColor('#00ff88');
      } else {
        self.readyBtn.setText('HAZIR VER').updateBg(0x7a2200).setTextColor('#FF85BB');
      }
      window.network.emit('ready', { ready: self.isReady });
    });

    // ── Popup ────────────────────────────────────────────────────────
    this.popupText = this.add.text(w / 2, h / 2, '', {
      fontFamily: font, fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#cc2200dd', padding: { x: 24, y: 12 },
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(501).setAlpha(0);

    // ── Menu music ───────────────────────────────────────────────────
    if (!this.sound.get('sfx-menu')) {
      this.menuMusic = this.sound.add('sfx-menu', { volume: 0.3, loop: true });
    } else {
      this.menuMusic = this.sound.get('sfx-menu');
    }
    if (!this.menuMusic.isPlaying) this.menuMusic.play();

    window.network.emit('join', { name: this.playerName });

    // ── Socket events ────────────────────────────────────────────────
    window.network.on('lobby:update', function(data) {
      self._lobbyData = data;
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

  // ── Rounded button helper ─────────────────────────────────────────
  _rBtn(x, y, w, h, label, font, fontSize, textColor, bgColorInt, radius) {
    var bg = this.add.graphics();
    bg.fillStyle(bgColorInt, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);

    var t = this.add.text(x, y, label, {
      fontFamily: font, fontSize: fontSize, color: textColor, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    var obj = {
      text: t, bg: bg,
      _x: x, _y: y, _w: w, _h: h, _r: radius,
      on: function(ev, fn) { t.on(ev, fn); return obj; },
      setVisible: function(v) { bg.setVisible(v); t.setVisible(v); return obj; },
      setAlpha: function(a) { bg.setAlpha(a); t.setAlpha(a); return obj; },
      disableInteractive: function() { t.disableInteractive(); return obj; },
      enableInteractive: function() { t.setInteractive({ useHandCursor: true }); return obj; },
      updateBg: function(col) {
        bg.clear();
        bg.fillStyle(col, 1);
        bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
        return obj;
      },
      setText: function(str) { t.setText(str); return obj; },
      setTextColor: function(col) { t.setColor(col); return obj; },
    };
    return obj;
  }

  updateCatButtons() {
    var activeColors  = { attack: 0xcc2200, defence: 0x0044bb, stamina: 0x006622, balance: 0x886600 };
    var keys = ['attack', 'defence', 'stamina', 'balance'];
    for (var i = 0; i < keys.length; i++) {
      var ck = keys[i];
      var btn = this.catBtns[ck];
      if (!btn) continue;
      var sel = ck === this.selectedCategory;
      btn.updateBg(sel ? activeColors[ck] : 0x333333);
      btn.setTextColor(sel ? '#ffffff' : '#888888');
      btn.bg.setAlpha(sel ? 1 : 0.55);
    }
    var desc = CONSTANTS.CATEGORY_DESC && CONSTANTS.CATEGORY_DESC[this.selectedCategory] || '';
    if (this.catDescText) this.catDescText.setText(desc);
  }

  buildSkinGrid() {
    for (var i = 0; i < this.skinSprites.length; i++) this.skinSprites[i].destroy();
    this.skinSprites = [];
    this.skinHighlight.clear();

    var cat = this.selectedCategory;
    var self = this;
    var skinSize = 70;
    var gap = 8;

    // 2×2 grid centered in right panel (415-812)
    var panelCx = 415 + (812 - 415) / 2; // 613.5
    var col1x = panelCx - skinSize / 2 - gap / 2; // 573.5
    var col2x = panelCx + skinSize / 2 + gap / 2;  // 653.5
    var row1y = 122;
    var row2y = row1y + skinSize + gap;              // 200

    var positions = [
      [col1x, row1y], [col2x, row1y],
      [col1x, row2y], [col2x, row2y],
    ];

    for (var si = 0; si < 4; si++) {
      (function(idx) {
        var key = 'char-' + cat + '-' + idx;
        if (!self.textures.exists(key)) return;
        var px = positions[idx][0], py = positions[idx][1];
        var spr = self.add.image(px, py, key)
          .setDisplaySize(skinSize, skinSize)
          .setInteractive({ useHandCursor: true });
        spr.on('pointerover', function() { spr.setAlpha(0.75); });
        spr.on('pointerout',  function() { spr.setAlpha(1); });
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
    this.skinHighlight.strokeRoundedRect(spr.x - 38, spr.y - 38, 76, 76, 10);
  }

  refreshPlayerList() {
    var data = this._lobbyData;
    if (!data) return;
    var players = data.players;
    this.playerListTitle.setText('OYUNCULAR (' + players.length + '/' + CONSTANTS.MAX_PLAYERS + ')');
    var lines = [];
    var catBadge = { attack: '[ATK]', defence: '[DEF]', stamina: '[STA]', balance: '[BAL]' };
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var displayName = (p.id === window.network.id) ? this.playerName : p.name;
      var ready = p.ready ? ' ✓' : '';
      var me = p.id === window.network.id ? ' ← sen' : '';
      var badge = catBadge[p.category] || '[BAL]';
      lines.push(badge + ' ' + displayName + ready + me);
    }
    var spectators = data.spectators || [];
    for (var sp = 0; sp < spectators.length; sp++) {
      lines.push('👁 ' + spectators[sp].name + (spectators[sp].id === window.network.id ? ' ← sen' : ''));
    }
    if (players.length < CONSTANTS.MIN_PLAYERS) {
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
