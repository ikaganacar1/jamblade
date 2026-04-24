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
    this.load.audio('sfx-menu', 'assets/menu-music.mp3');
  }

  create() {
    window.runnerSkins = [];
    window.hunterSkins = [];

    // Force the browser to load JapanBrush before Phaser renders any text with it
    var self = this;
    document.fonts.load('40px JapanBrush').finally(function() {
      window.network.connect().then(function() {
        self.scene.start('Lobby');
      });
    });
  }
}
