class CountdownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Countdown' });
  }

  init(data) {
    this.gameData = data;
  }

  preload() {
    if (!this.cache.audio.exists('sfx-game-start')) {
      this.load.audio('sfx-game-start', 'assets/game-start.mp3');
    }
  }

  create() {
    var w = this.cameras.main.width;
    var h = this.cameras.main.height;
    var font = 'Fredoka, sans-serif';
    var myId = window.network.id;
    var myData = this.gameData.players[myId];

    // ── Background ───────────────────────────────────────────────
    this.add.image(w / 2, h / 2, 'bg').setDisplaySize(w, h);

    // ── Player avatar + name ──────────────────────────────────────
    if (myData) {
      var avatar = this.add.image(w / 2, h / 2 - 16, 'player').setDisplaySize(100, 100);
      this.tweens.add({
        targets: avatar, y: avatar.y - 8,
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.add.text(w / 2, h / 2 + 58, myData.name || '', {
        fontFamily: font, fontSize: '20px', color: '#FF85BB',
        stroke: '#021A54', strokeThickness: 3, fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    this.sound.play('sfx-game-start', { volume: 0.5 });

    // ── Countdown numbers ─────────────────────────────────────────
    this.countdownText = this.add.text(w / 2, h - 55, '', {
      fontFamily: 'JapanBrush', fontSize: '64px', color: '#ffffff',
      stroke: '#021A54', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);

    var self = this;
    var counts = ['3', '2', '1', 'HAZIR!'];
    for (var i = 0; i < counts.length; i++) {
      (function(idx) {
        self.time.delayedCall(idx * 1000, function() {
          self.countdownText.setText(counts[idx]).setAlpha(1).setScale(1.5);
          self.countdownText.setColor(counts[idx] === 'HAZIR!' ? '#FF85BB' : '#ffffff');
          self.tweens.add({ targets: self.countdownText, scale: 1, duration: 380, ease: 'Back.easeOut' });
        });
      })(i);
    }

    this.time.delayedCall(counts.length * 1000, function() {
      self.scene.start('Game', self.gameData);
    });
  }
}
