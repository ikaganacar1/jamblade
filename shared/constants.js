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
  JOYSTICK_FORCE: 1.5,        // more responsive steering
  MAX_SPEED: 40,              // faster overall
  WALL_BOUNCE: 0.92,          // very bouncy walls
  SPIN_DECAY: 0.04,
  SPIN_COLLISION_LOSS: 5,
  SPIN_COLLISION_FACTOR: 0.16,// more explosive spin-based collisions
  SPIN_WALL_LOSS: 3,

  LAUNCH_TIMEOUT: 5,          // seconds before auto-launch at minimum speed

  // Category physics modifiers
  // damageOut: knockback multiplier dealt to opponent
  // shieldIn:  knockback multiplier received
  // spinOut:   spin damage dealt to opponent
  // spinIn:    spin damage taken
  // decay:     spin decay rate multiplier (lower = spins longer)
  // speed:     max speed multiplier
  CATEGORIES: {
    attack:  { damageOut: 1.5, shieldIn: 0.9,  spinOut: 1.6, spinIn: 1.1,  decay: 1.0,  speed: 1.05 },
    defence: { damageOut: 0.7, shieldIn: 0.45, spinOut: 0.7, spinIn: 0.45, decay: 1.0,  speed: 0.85 },
    stamina: { damageOut: 0.95,shieldIn: 0.85, spinOut: 0.9, spinIn: 0.85, decay: 0.55, speed: 1.2  },
    balance: { damageOut: 1.0, shieldIn: 1.0,  spinOut: 1.0, spinIn: 1.0,  decay: 1.0,  speed: 1.0  },
  },
  CATEGORY_LABELS: { attack: 'SALDIRI', defence: 'SAVUNMA', stamina: 'STAMİNA', balance: 'DENGE' },
  CATEGORY_DESC: {
    attack:  'Rakiplere çok güçlü çarpar — ama savunması zayıf!',
    defence: 'Darbeleri emer, kolay yıkılmaz — ama saldırısı zayıf.',
    stamina: 'Daha uzun döner ve daha hızlıdır.',
    balance: 'Tüm özelliklerde dengeli performans.',
  },

  PLAYER_NAMES: [
    'Tevret Fikfik', 'Doğan SLX', 'Garen', 'Kafakopter', 'Kötü Çocuk Sokakta',
    'Çirkin Mal Köpek', 'Feyyaz Yiğit', 'Logitech Fare', 'Linux Penguen', 'Köylü Vampir',
    'Gazi Rakun', 'Unityci', 'Godotçu', 'Çubuk Turşu', 'Ankara Simit',
    'Çoko Prens', 'Peti Bör', 'Jam Yılmaz', 'Money Fest', 'Lavuk Dürüm',
  ],
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONSTANTS;
}
