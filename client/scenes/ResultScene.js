class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Result' });
  }

  init(data) {
    this.resultData = data;
  }

  preload() {
    if (!this.cache.audio.exists('sfx-game-win')) {
      this.load.audio('sfx-game-win', 'assets/game-win.mp3');
    }
    if (!this.cache.audio.exists('sfx-game-lose')) {
      this.load.audio('sfx-game-lose', 'assets/game-lose.mp3');
    }
  }

  create() {
    var w = this.cameras.main.width;
    var h = this.cameras.main.height;
    var font = 'Fredoka, sans-serif';
    var winnerName = this.resultData.winnerName || null;
    var iWon = winnerName === window._myName;

    // ── Background (matches lobby) ────────────────────────────────
    var bg = this.add.graphics();
    bg.fillGradientStyle(0x173a8b, 0x173a8b, 0xFFCEE3, 0xFFCEE3, 1);
    bg.fillRect(0, 0, w, h);

    // ── Sound ─────────────────────────────────────────────────────
    if (winnerName) {
      this.sound.play(iWon ? 'sfx-game-win' : 'sfx-game-lose', { volume: 0.5 });
    } else {
      this.sound.play('sfx-game-win', { volume: 0.3 });
    }

    // ── Winner display ────────────────────────────────────────────
    if (winnerName) {
      this.add.text(w / 2, h / 2 - 60, winnerName, {
        fontFamily: 'JapanBrush', fontSize: '54px', color: '#FF85BB',
        stroke: '#021A54', strokeThickness: 4,
      }).setOrigin(0.5);

      this.add.text(w / 2, h / 2 + 10, 'KAZANDI!', {
        fontFamily: font, fontSize: '28px', color: '#ffffff',
        fontStyle: 'bold', stroke: '#021A54', strokeThickness: 3,
      }).setOrigin(0.5);
    } else {
      this.add.text(w / 2, h / 2 - 20, 'BERABERE!', {
        fontFamily: 'JapanBrush', fontSize: '54px', color: '#FF85BB',
        stroke: '#021A54', strokeThickness: 4,
      }).setOrigin(0.5);
    }

    this.add.text(w / 2, h / 2 + 72, 'Lobiye dönülüyor...', {
      fontFamily: font, fontSize: '14px', color: '#aabbee',
    }).setOrigin(0.5);

    this.time.delayedCall(5000, () => {
      this.scene.start('Lobby');
    });
  }
}
