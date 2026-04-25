class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    var w = this.cameras.main.width;
    var h = this.cameras.main.height;
    this.add.text(w / 2, h / 2, 'Loading...', {
      fontSize: '24px', color: '#000000',
    }).setOrigin(0.5);

    this.load.image('map-bg', 'assets/map.png');
    this.load.image('player', 'assets/player.png');
    this.load.image('bg', 'assets/background.jpeg');
    this.load.audio('sfx-menu', 'assets/menu-music.mp3');
    this.load.audio('sfx-game-start', 'assets/game-start.mp3');
    this.load.audio('sfx-game-win', 'assets/game-win.mp3');
    this.load.audio('sfx-game-lose', 'assets/game-lose.mp3');

    var cats = ['attack', 'defence', 'stamina', 'balance'];
    for (var ci = 0; ci < cats.length; ci++) {
      for (var si = 0; si < 4; si++) {
        this.load.image('char-' + cats[ci] + '-' + si,
          'assets/characters/' + cats[ci] + '/' + si + '.png');
      }
    }
  }

  create() {
    window.runnerSkins = [];
    window.hunterSkins = [];

    // Force the browser to load JapanBrush before Phaser renders any text with it
    var self = this;
    document.fonts.load('40px JapanBrush');
    document.fonts.load('40px Comicbon').finally(function() {
      window.network.connect().then(function() {
        self.scene.start('Lobby');
      });
    });
  }
}
