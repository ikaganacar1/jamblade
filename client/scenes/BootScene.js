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
    this.load.image('map-borders', 'assets/map_borders.png');
    this.load.image('player', 'assets/player.png');
    this.load.audio('sfx-menu', 'assets/menu-music.mp3');
  }

  create() {
    window.runnerSkins = [];
    window.hunterSkins = [];

    this.setupMapBoundary();

    window.network.connect().then(function() {
      this.scene.start('Lobby');
    }.bind(this));
  }

  setupMapBoundary() {
    if (!this.textures.exists('map-borders')) return;
    var src = this.textures.get('map-borders').getSourceImage();
    var imgW = src.naturalWidth || src.width;
    var imgH = src.naturalHeight || src.height;
    var canvas = document.createElement('canvas');
    canvas.width = imgW;
    canvas.height = imgH;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(src, 0, 0);
    var pixelData = ctx.getImageData(0, 0, imgW, imgH).data;
    var scale = imgH / CONSTANTS.WORLD_SIZE;

    window.isInsideMap = function(wx, wy) {
      var px = Math.round(imgW / 2 + wx * scale);
      var py = Math.round(imgH / 2 + wy * scale);
      if (px < 0 || py < 0 || px >= imgW || py >= imgH) return false;
      return pixelData[(py * imgW + px) * 4 + 3] > 128;
    };
  }
}
