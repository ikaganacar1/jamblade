const CONSTANTS = {
  MAP_RADIUS: 1000,
  WORLD_SIZE: 2000,
  TICK_RATE: 20,
  TICK_INTERVAL: 50,
  GAME_DURATION: 180,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 5,
  RECONNECT_WINDOW: 10000,

  // Beyblade physics
  PLAYER_RADIUS: 110,
  FRICTION: 0.988,            // less friction → coast longer
  JOYSTICK_FORCE: 2.5,        // more responsive steering
  MAX_SPEED: 40,              // faster overall
  WALL_BOUNCE: 0.92,          // very bouncy walls
  SPIN_DECAY: 0.04,
  SPIN_COLLISION_LOSS: 5,
  SPIN_COLLISION_FACTOR: 0.16,// more explosive spin-based collisions
  SPIN_WALL_LOSS: 3,

  LAUNCH_TIMEOUT: 5,          // seconds before auto-launch at minimum speed

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
