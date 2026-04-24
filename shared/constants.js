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
  PLAYER_RADIUS: 110,         // collision radius in world units (display = 300x300)
  FRICTION: 0.985,            // velocity multiplier per tick
  JOYSTICK_FORCE: 1.5,        // tiny force nudge per tick when joystick active
  MAX_SPEED: 28,              // max velocity magnitude per tick
  WALL_BOUNCE: 0.55,          // speed retained on gear wall bounce
  SPIN_DECAY: 0.04,           // spin speed lost per tick (~125s to drain fully)
  SPIN_COLLISION_LOSS: 6,     // spin lost on each hit
  SPIN_COLLISION_FACTOR: 0.12,// spin → collision impulse multiplier

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
