// Global game configuration and shared constants.
var CONFIG = {
  TILE: 1,                  // world units per grid tile
  PLAY_HALF: 7,             // playable columns run -PLAY_HALF..PLAY_HALF
  LANE_HALF: 30,            // vehicles / logs / trains wrap at this distance (always off-screen)
  TREE_HALF: 26,            // forest on grass rows fills out to this column
  GROUND_VISUAL_HALF: 46,   // how wide each lane's ground renders
  ROWS_AHEAD: 21,           // rows kept generated ahead of the camera
  ROWS_BEHIND: 17,          // rows kept behind the camera (visual buffer)

  CHICKEN_SCALE: 0.88,      // the chicken's size relative to a tile (a touch smaller than before)
  HIT_MARGIN: 0.26,         // how close a hazard must get to the chicken's centre to hit it (= half its body)

  HOP_DURATION: 0.15,       // seconds per hop
  HOP_HEIGHT: 0.5,

  // Fixed isometric camera. Orientation is set once; per frame we only translate it.
  CAMERA_OFFSET: { x: 10.5, y: 12.5, z: -10.5 },
  CAMERA_OFFSET_X_MAGNITUDE: 10.5,
  CAMERA_LEAD: 1.5,         // rows of look-ahead: keeps the chicken near the middle of the screen
  CAMERA_FRUSTUM_HALF: 6.6, // half the visible height in world units
  CAMERA_MIN_HALF_WIDTH: 5.4, // portrait screens zoom out so this much stays visible sideways
  CAMERA_FOLLOW_X: 7,       // horizontal follow stiffness (higher = snappier)
  CAMERA_FOLLOW_Z: 9,       // forward follow stiffness

  // The camera simply follows the chicken (it never drags you toward a corner).
  // The only ways to lose: hit a hazard, or dawdle until the eagle comes.
  IDLE_WARN: 8,             // seconds without reaching a new row -> HURRY warning
  IDLE_EAGLE: 12,           // ...and the eagle arrives
  MAX_BACKTRACK: 5,         // how many rows back from your best row you may hop

  // With the fixed camera a sideways hop in +worldX projects as screen-LEFT
  // motion, so the Left/Right input axis is inverted once here.
  INPUT_X_SIGN: -1,

  ROW_TYPES: { GRASS: 'grass', ROAD: 'road', WATER: 'water', RAIL: 'rail' },

  // Surface height of each lane type (grass is the reference plane; roads and
  // rivers sit slightly lower for a stepped, layered look).
  ROW_TOP: { grass: 0, road: -0.1, rail: -0.04, water: -0.24 },
  ROW_BOTTOM: -0.6,

  COLORS: {
    sky: 0xb7e4f7,
    grassA: 0x95d34b, grassB: 0x88c941, grassSide: 0x5e9c35,
    roadA: 0x5b5d66, roadB: 0x54565f, roadSide: 0x3b3d45,
    roadLine: 0xf2f2f2,
    waterA: 0x4cc4f2, waterB: 0x42b8ea, waterSide: 0x2a86b8,
    railBedA: 0x9b8a72, railBedB: 0x917f68, railSide: 0x6b5b48,
    sleeper: 0x5a3f2a, rail: 0xcfd2d8,
    coin: 0xffd23f, coinDark: 0xd99a14, coinShine: 0xfff0a0
  },

  // Collectible power-ups (dur in seconds; blast is instant). weight = spawn odds.
  POWERUPS: {
    magnet: { label: 'MAGNET', icon: '🧲', color: '#ff5a5f', dur: 10, weight: 0.2, blurb: 'Coins fly to you' },
    ghost:  { label: 'GHOST', icon: '👻', color: '#9ad7ff', dur: 7, weight: 0.15, blurb: 'Traffic passes through' },
    shield: { label: 'SHIELD', icon: '🛡️', color: '#3d8bff', dur: 16, weight: 0.2, blurb: 'Survives one hit' },
    freeze: { label: 'FREEZE', icon: '❄️', color: '#5fe3ff', dur: 6, weight: 0.13, blurb: 'Stops all traffic' },
    double: { label: '2X COINS', icon: '💰', color: '#ffc107', dur: 12, weight: 0.15, blurb: 'Coins count double' },
    jump:   { label: 'JUMP', icon: '🦘', color: '#6dd34a', dur: 14, weight: 0.14, blurb: 'Hop over small obstacles' },
    skiplane: { label: 'SKIP LANE', icon: '⏭️', color: '#ff9f1c', dur: 8, weight: 0.09, blurb: 'Leap over a whole lane at once' },
    blast:  { label: 'BLAST', icon: '💣', color: '#ff7a1a', dur: 0, weight: 0.17, blurb: 'Clears nearby traffic' }
  },

  BEST_SCORE_KEY: 'crossy_way_best_score',
  COINS_KEY: 'crossy_way_total_coins',
  LEAN_KEY: 'crossy_way_camera_lean',
  FONT_KEY: 'crossy_way_title_font',
  SOUND_KEY: 'crossy_way_sound',
  QUALITY_KEY: 'crossy_way_quality',
  DIFF_KEY: 'crossy_way_difficulty',
  // Difficulty: speed = traffic / log / train speed, traffic = how crowded the roads are,
  // train = how often trains come (lower = more often), trainWarn = seconds of signal warning,
  // eagle = seconds of standing still before the eagle arrives (its cry comes 3 s earlier),
  // ramp = rows until full difficulty, special = how often unusual lanes (turtles) appear,
  // spread = how different vehicle speeds in one lane are (tighter = busier, convoy-like roads).
  DIFFICULTY: {
    easy:    { label: 'Easy',    icon: '🌱', speed: 0.78, traffic: 0.78, train: 1.5,  trainWarn: 2.4, eagle: 12,  ramp: 260, special: 0.6, spread: 1, blurb: 'Slower, calmer traffic. Trains are rare and the eagle waits 12 seconds.' },
    medium:  { label: 'Medium',  icon: '⚡', speed: 1,    traffic: 1,    train: 1,    trainWarn: 1.9, eagle: 9,   ramp: 180, special: 1,   spread: 1, blurb: 'The classic mix. The eagle comes after 9 seconds.' },
    hard:    { label: 'Hard',    icon: '🔥', speed: 1.25, traffic: 1.25, train: 0.75, trainWarn: 1.6, eagle: 7.5, ramp: 140, special: 1.3, spread: 0.8, blurb: 'Faster, busier roads, more trains, and the eagle after 7.5 seconds.' },
    extreme: { label: 'Extreme', icon: '💀', speed: 1.5,  traffic: 1.5,  train: 0.5,  trainWarn: 1.3, eagle: 6,   ramp: 100, special: 1.6, spread: 0.55, blurb: 'Flat-out speed, packed roads, constant trains, and the eagle after only 6 seconds!' }
  },

  DPAD_KEY: 'crossy_way_dpad',
  DPAD_SWAP_KEY: 'crossy_way_dpad_swap',
  BIOME_KEY: 'crossy_way_biome',
  DPAD_SIZE_KEY: 'crossy_way_dpad_size',
  SWIPE_KEY: 'crossy_way_swipe_style',
  TAB_KEY: 'crossy_way_settings_tab',
  TOD_KEY: 'crossy_way_time_of_day',
  WEATHER_KEY: 'crossy_way_weather'
};

// The current difficulty (read by the world, the eagle timer and the HUD).
var Difficulty = {
  mode: (function () {
    var m = null;
    try { m = localStorage.getItem(CONFIG.DIFF_KEY); } catch (e) { /* private mode */ }
    return CONFIG.DIFFICULTY[m] ? m : 'medium';
  })(),
  get cur() { return CONFIG.DIFFICULTY[this.mode]; }
};

// ---------------------------------------------------------------------------
// Biomes. Same game in every biome - only the look (ground, props, vehicles,
// lighting, sounds) changes. Lane variants (ice / void) exist in every biome.
// ---------------------------------------------------------------------------
CONFIG.BIOME_COLORS = {
  forest: Object.assign({}, CONFIG.COLORS, {
    iceA: 0xcdeffa, iceB: 0xbfe6f5, iceSide: 0x8fc4d8,
    voidA: 0x231b15, voidB: 0x1b1410, voidSide: 0x0d0907, voidAccent: 0xff8a3d,
    backdrop: CONFIG.COLORS.grassB
  }),
  space: {
    sky: 0x120f2e,
    grassA: 0x6f6c92, grassB: 0x66638a, grassSide: 0x3f3d62,
    roadA: 0x1f2d5c, roadB: 0x1a2750, roadSide: 0x080b26, roadLine: 0x4de8ff,
    waterA: 0x070a26, waterB: 0x050820, waterSide: 0x02030f, waterAccent: 0x8ff4ff,
    railBedA: 0x3a3f5c, railBedB: 0x343955, railSide: 0x1d2038, sleeper: 0x2fd4e8, rail: 0xaef6ff,
    iceA: 0x9fe9ff, iceB: 0x8adcf5, iceSide: 0x4aa3c8,
    voidA: 0x030308, voidB: 0x020206, voidSide: 0x000000, voidAccent: 0xff8a3d,
    coin: CONFIG.COLORS.coin, coinDark: CONFIG.COLORS.coinDark, coinShine: CONFIG.COLORS.coinShine,
    backdrop: 0x2a2750
  }
};

// Which biome a row belongs to. "auto" walks through the biomes as you run
// (Forest, then Space, then back...); "forest" / "space" lock one in.
var Biome = {
  mode: (function () {
    var m = null;
    try { m = localStorage.getItem(CONFIG.BIOME_KEY); } catch (e) { /* private mode */ }
    return m === 'forest' || m === 'space' ? m : 'auto';
  })(),
  LEN: 110,                      // rows per biome in auto mode
  order: ['forest', 'space'],
  forRow: function (z) {
    if (this.mode !== 'auto') return this.mode;
    if (z < 0) return this.order[0];
    return this.order[Math.floor(z / this.LEN) % this.order.length];
  },
  colors: function (b) { return CONFIG.BIOME_COLORS[b] || CONFIG.BIOME_COLORS.forest; }
};
