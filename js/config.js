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
    blast:  { label: 'BLAST', icon: '💣', color: '#ff7a1a', dur: 0, weight: 0.17, blurb: 'Clears nearby traffic' }
  },

  BEST_SCORE_KEY: 'crossy_way_best_score',
  COINS_KEY: 'crossy_way_total_coins',
  LEAN_KEY: 'crossy_way_camera_lean',
  FONT_KEY: 'crossy_way_title_font',
  SOUND_KEY: 'crossy_way_sound',
  QUALITY_KEY: 'crossy_way_quality',
  DPAD_KEY: 'crossy_way_dpad',
  DPAD_SWAP_KEY: 'crossy_way_dpad_swap',
  SWIPE_KEY: 'crossy_way_swipe_style',
  TAB_KEY: 'crossy_way_settings_tab',
  TOD_KEY: 'crossy_way_time_of_day',
  WEATHER_KEY: 'crossy_way_weather'
};
