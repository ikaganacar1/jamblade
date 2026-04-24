const CONSTANTS = {
  MAP_RADIUS: 1000,
  WORLD_SIZE: 2000,
  TICK_RATE: 20,
  TICK_INTERVAL: 50,
  PLAYER_SPEED: 200,
  GAME_DURATION: 180,
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 20,
  RECONNECT_WINDOW: 10000,
  PLAYER_NAMES: [
    'ÇirkinÖrdek', 'KorkakTavuk', 'NinjaKaz', 'Gurba', 'PanikTavşan',
    'ÇirkinMalKöpek', 'KırmızıBoğa', 'LogitechFare', 'LinuxPenguen', 'YürüyenUçak',
    'ŞişkoAyıcık', 'ElmaKurdu', 'KayseriliPastırma', 'ÇubukTurşusu', 'AyvalıkTostu',
    'OstimBaykuşu', 'TatlıFokçuk', 'ZıpZıpMaymun', 'PremsesKedi', 'CiciKuş',
  ],
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONSTANTS;
}
