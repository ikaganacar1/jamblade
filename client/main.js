// Try to lock orientation to landscape
try {
  screen.orientation.lock('landscape').catch(function() {});
} catch (e) {}

var config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  input: { activePointers: 3 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 812,
    height: 375,
  },
  backgroundColor: '#173a8b',
  scene: [BootScene, LobbyScene, CountdownScene, GameScene, ResultScene, SpectatorScene],
};

var game = new Phaser.Game(config);
