class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Result' });
  }

  init(data) {
    this.resultData = data;
  }

  create() {
    var w = this.cameras.main.width;
    var h = this.cameras.main.height;
    var font = 'Comicbon';
    var winnerName = this.resultData.winnerName || null;
    var winnerCategory = this.resultData.winnerCategory || 'balance';
    var winnerSkin = this.resultData.winnerSkin !== undefined ? this.resultData.winnerSkin : 0;
    var iWon = winnerName === window._myName;

    // Background + dark overlay
    this.add.image(w / 2, h / 2, 'bg').setDisplaySize(w, h);
    var ov = this.add.graphics();
    ov.fillStyle(0x000000, 0.55);
    ov.fillRect(0, 0, w, h);

    // Sound (audio preloaded in BootScene)
    if (winnerName) {
      this.sound.play(iWon ? 'sfx-game-win' : 'sfx-game-lose', { volume: 0.5 });
    } else {
      this.sound.play('sfx-game-win', { volume: 0.3 });
    }

    if (winnerName) {
      // Winner skin — bouncing avatar
      var skinKey = 'char-' + winnerCategory + '-' + winnerSkin;
      var texKey = this.textures.exists(skinKey) ? skinKey : 'player';
      var avatar = this.add.image(w / 2, h / 2 - 30, texKey).setDisplaySize(120, 120);
      this.tweens.add({
        targets: avatar, y: avatar.y - 8,
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Winner name (Fredoka, not JapanBrush)
      this.add.text(w / 2, h / 2 - 110, winnerName, {
        fontFamily: font, fontSize: '36px', color: '#FF85BB',
        fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5);

      this.add.text(w / 2, h / 2 + 58, 'KAZANDI!', {
        fontFamily: font, fontSize: '32px', color: '#ffffff',
        fontStyle: 'bold', stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5);
    } else {
      this.add.text(w / 2, h / 2 - 20, 'BERABERE!', {
        fontFamily: font, fontSize: '48px', color: '#FF85BB',
        fontStyle: 'bold', stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5);
    }

    this.add.text(w / 2, h - 22, 'Lobiye dönülüyor...', {
      fontFamily: font, fontSize: '13px', color: '#aabbee',
    }).setOrigin(0.5, 1);

    this.time.delayedCall(5000, () => {
      this.scene.start('Lobby');
    });
  }
}
