// Everything the coin shop sells: chicken skins, outfits, hop effects and the "extras" (pets,
// trails, auras, death animations, hop sounds): what exists, what you own, what you're wearing,
// plus the 3D parts and the little pixel previews.
var Cosmetics = (function () {
  var KEY = 'crossy_way_cosmetics';

  function B(x, y, z, w, h, d, color) {
    return { x: x, y: y, z: z, w: w, h: h, d: d, color: color };
  }

  // ---------------------------------------------------------------- skins
  var SKINS = [
    { id: 'classic', name: 'Classic', price: 0, body: 0xfafafa, shade: 0xe9eef2, wing: 0xe9eef2, tail: 0xeef2f5, beak: 0xf7a823, legs: 0xf7a823, comb: 0xe53935, eye: 0x1d1d22 },
    { id: 'brownie', name: 'Brownie', price: 40, body: 0xc98a4e, shade: 0xb0733a, wing: 0xa8672f, tail: 0xb77a3e, beak: 0xf7a823, legs: 0xf7a823, comb: 0xd32f2f, eye: 0x1d1d22 },
    { id: 'rosy', name: 'Rosy', price: 60, body: 0xffb6d0, shade: 0xf29ab8, wing: 0xf08fb0, tail: 0xf6a5c3, beak: 0xffa000, legs: 0xffa000, comb: 0xff4f8b, eye: 0x1d1d22 },
    { id: 'sky', name: 'Sky', price: 80, body: 0x8fd0ff, shade: 0x6fb8f0, wing: 0x62aee8, tail: 0x7cc2f6, beak: 0xffb300, legs: 0xffb300, comb: 0xff7043, eye: 0x1d1d22 },
    { id: 'lime', name: 'Lime', price: 100, body: 0xa5e05a, shade: 0x8ac444, wing: 0x7bb83a, tail: 0x92d04c, beak: 0xff9800, legs: 0xff9800, comb: 0xff5252, eye: 0x1d1d22 },
    { id: 'fire', name: 'Fire', price: 160, body: 0xff7043, shade: 0xe64a19, wing: 0xd84315, tail: 0xf4511e, beak: 0xffd54f, legs: 0xffd54f, comb: 0xffd54f, eye: 0x1d1d22 },
    { id: 'midnight', name: 'Midnight', price: 220, body: 0x3a3f55, shade: 0x2d3145, wing: 0x262a3b, tail: 0x30354a, beak: 0xffb300, legs: 0xffb300, comb: 0x7e57c2, eye: 0xffe14d },
    { id: 'golden', name: 'Golden', price: 400, body: 0xffd54f, shade: 0xf2b92a, wing: 0xe8a91a, tail: 0xf6c13a, beak: 0xff8f00, legs: 0xff8f00, comb: 0xff6f00, eye: 0x1d1d22, glow: 0x4a3300 }
  ];

  // -------------------------------------------------------------- outfits
  // boxes(): 3D parts in the chicken's local space. px: pixel-art overlay for previews (14x15 grid).
  var OUTFITS = [
    { id: 'shades', name: 'Shades', slot: 'face', price: 50, boxes: function () {
      return [B(0, 0.68, 0.29, 0.44, 0.11, 0.04, 0x111111), B(-0.24, 0.68, 0.12, 0.04, 0.04, 0.3, 0x111111), B(0.24, 0.68, 0.12, 0.04, 0.04, 0.3, 0x111111),
        B(-0.1, 0.7, 0.315, 0.1, 0.03, 0.01, 0x5a6b7a)];
    }, px: [[3, 6, 3, 2, '#111'], [8, 6, 3, 2, '#111'], [6, 6, 2, 1, '#111'], [4, 6, 1, 1, '#5a6b7a']] },
    { id: 'stache', name: 'Mustache', slot: 'face', price: 70, boxes: function () {
      return [B(0, 0.55, 0.325, 0.26, 0.05, 0.06, 0x4e342e), B(-0.14, 0.52, 0.325, 0.06, 0.08, 0.06, 0x4e342e), B(0.14, 0.52, 0.325, 0.06, 0.08, 0.06, 0x4e342e)];
    }, px: [[4, 10, 6, 1, '#4e342e'], [3, 10, 1, 1, '#4e342e'], [10, 10, 1, 1, '#4e342e']] },
    { id: 'bowtie', name: 'Bow Tie', slot: 'face', price: 60, boxes: function () {
      return [B(0, 0.28, 0.27, 0.08, 0.08, 0.06, 0xb71c1c), B(-0.1, 0.28, 0.27, 0.12, 0.13, 0.05, 0xe53935), B(0.1, 0.28, 0.27, 0.12, 0.13, 0.05, 0xe53935)];
    }, px: [[4, 11, 2, 2, '#e53935'], [8, 11, 2, 2, '#e53935'], [6, 11, 2, 2, '#b71c1c']] },
    { id: 'partyhat', name: 'Party Hat', slot: 'head', price: 60, boxes: function () {
      return [B(0, 0.93, 0, 0.34, 0.08, 0.34, 0xff4fa0), B(0, 1.01, 0, 0.26, 0.08, 0.26, 0x4fc3f7), B(0, 1.09, 0, 0.18, 0.08, 0.18, 0xff4fa0),
        B(0, 1.17, 0, 0.1, 0.08, 0.1, 0x4fc3f7), B(0, 1.25, 0, 0.1, 0.1, 0.1, 0xffe14d)];
    }, px: [[6, 0, 2, 1, '#ffe14d'], [6, 1, 2, 1, '#4fc3f7'], [5, 2, 4, 1, '#ff4fa0'], [4, 3, 6, 1, '#4fc3f7'], [4, 4, 6, 1, '#ff4fa0']] },
    { id: 'cap', name: 'Red Cap', slot: 'head', price: 90, boxes: function () {
      return [B(0, 0.9, 0, 0.56, 0.12, 0.54, 0xe53935), B(0, 0.87, 0.33, 0.4, 0.04, 0.22, 0xb71c1c), B(0, 0.97, 0, 0.08, 0.05, 0.08, 0xb71c1c)];
    }, px: [[3, 3, 8, 2, '#e53935'], [4, 2, 6, 1, '#e53935'], [3, 5, 8, 1, '#b71c1c']] },
    { id: 'cowboy', name: 'Cowboy Hat', slot: 'head', price: 140, boxes: function () {
      return [B(0, 0.88, 0.02, 0.86, 0.05, 0.72, 0x8d5a2b), B(0, 1.0, 0, 0.42, 0.2, 0.4, 0xa0692f), B(0, 0.93, 0, 0.44, 0.05, 0.42, 0x4e342e), B(0, 1.12, 0, 0.34, 0.05, 0.32, 0x8d5a2b)];
    }, px: [[5, 1, 4, 2, '#a0692f'], [4, 3, 6, 1, '#4e342e'], [1, 4, 12, 1, '#8d5a2b']] },
    { id: 'wizard', name: 'Wizard Hat', slot: 'head', price: 180, boxes: function () {
      return [B(0, 0.88, 0.02, 0.72, 0.05, 0.66, 0x4527a0), B(0, 1.0, 0, 0.44, 0.2, 0.42, 0x5e35b1), B(0, 1.18, 0, 0.32, 0.18, 0.3, 0x5e35b1),
        B(0, 1.34, 0.02, 0.2, 0.16, 0.18, 0x673ab7), B(0.05, 1.48, 0.03, 0.1, 0.14, 0.1, 0x7e57c2), B(0, 0.93, 0, 0.46, 0.05, 0.44, 0xffd54f), B(0, 1.0, 0.22, 0.08, 0.08, 0.03, 0xffd54f)];
    }, px: [[7, 0, 2, 1, '#7e57c2'], [6, 1, 3, 1, '#673ab7'], [5, 2, 4, 1, '#5e35b1'], [4, 3, 6, 1, '#ffd54f'], [2, 4, 10, 1, '#4527a0'], [7, 2, 1, 1, '#ffd54f']] },
    { id: 'crown', name: 'Royal Crown', slot: 'head', price: 350, boxes: function () {
      var o = [B(0, 0.9, 0, 0.44, 0.1, 0.42, 0xffd54f), B(0, 0.99, 0.17, 0.08, 0.14, 0.08, 0xffd54f), B(0, 0.99, -0.17, 0.08, 0.14, 0.08, 0xffd54f), B(0, 0.9, 0.22, 0.07, 0.07, 0.03, 0xe53935)];
      [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { o.push(B(sx * 0.17, 0.99, sz * 0.16, 0.08, 0.1, 0.08, 0xffd54f)); }); });
      return o;
    }, px: [[4, 3, 6, 2, '#ffd54f'], [4, 2, 1, 1, '#ffd54f'], [6, 1, 2, 2, '#ffd54f'], [9, 2, 1, 1, '#ffd54f'], [6, 4, 2, 1, '#e53935']] },
    { id: 'chef', name: 'Chef Hat', slot: 'head', price: 110, boxes: function () {
      return [B(0, 0.93, 0, 0.5, 0.1, 0.48, 0xf0f0f0), B(0, 1.1, 0, 0.62, 0.26, 0.6, 0xffffff), B(0, 1.3, 0, 0.46, 0.14, 0.44, 0xffffff), B(0.2, 1.2, 0.2, 0.2, 0.2, 0.2, 0xf7f7f7)];
    }, px: [[4, 3, 6, 1, '#f0f0f0'], [3, 1, 8, 2, '#fff'], [4, 0, 6, 1, '#fff']] },
    { id: 'tophat', name: 'Top Hat', slot: 'head', price: 200, boxes: function () {
      return [B(0, 0.89, 0, 0.72, 0.05, 0.66, 0x1c1c22), B(0, 1.12, 0, 0.42, 0.42, 0.4, 0x24242c), B(0, 0.98, 0, 0.44, 0.1, 0.42, 0xc62828)];
    }, px: [[5, 0, 4, 3, '#24242c'], [5, 2, 4, 1, '#c62828'], [2, 3, 10, 1, '#1c1c22']] },
    { id: 'pirate', name: 'Pirate Hat', slot: 'head', price: 130, boxes: function () {
      return [B(0, 0.91, 0, 0.82, 0.1, 0.5, 0x1c1c22), B(0, 1.0, 0, 0.52, 0.12, 0.44, 0x2a2a33), B(-0.38, 0.98, 0, 0.1, 0.16, 0.44, 0x1c1c22), B(0.38, 0.98, 0, 0.1, 0.16, 0.44, 0x1c1c22),
        B(0, 0.99, 0.23, 0.12, 0.12, 0.03, 0xffffff), B(0, 0.96, 0.23, 0.04, 0.04, 0.03, 0x111111)];
    }, px: [[3, 2, 8, 2, '#2a2a33'], [1, 3, 12, 1, '#1c1c22'], [6, 3, 2, 1, '#fff']] },
    { id: 'viking', name: 'Viking Helm', slot: 'head', price: 160, boxes: function () {
      return [B(0, 0.93, 0, 0.52, 0.14, 0.5, 0x9e9e9e), B(0, 1.02, 0, 0.3, 0.06, 0.3, 0xb8b8b8), B(-0.32, 1.02, 0, 0.1, 0.2, 0.1, 0xf5f0dc), B(0.32, 1.02, 0, 0.1, 0.2, 0.1, 0xf5f0dc),
        B(-0.36, 1.16, 0, 0.08, 0.14, 0.08, 0xf5f0dc), B(0.36, 1.16, 0, 0.08, 0.14, 0.08, 0xf5f0dc)];
    }, px: [[3, 3, 8, 2, '#9e9e9e'], [2, 1, 1, 3, '#f5f0dc'], [11, 1, 1, 3, '#f5f0dc'], [1, 0, 1, 1, '#f5f0dc'], [12, 0, 1, 1, '#f5f0dc']] },
    { id: 'propeller', name: 'Propeller Cap', slot: 'head', price: 120, boxes: function () {
      return [B(0, 0.92, 0, 0.5, 0.1, 0.48, 0x1e88e5), B(0, 1.0, 0, 0.36, 0.08, 0.34, 0xe53935), B(0, 1.08, 0, 0.05, 0.12, 0.05, 0x555555),
        B(0, 1.17, 0, 0.56, 0.03, 0.09, 0xffd54f), B(0, 1.17, 0, 0.09, 0.03, 0.56, 0x43a047)];
    }, px: [[4, 3, 6, 1, '#1e88e5'], [5, 2, 4, 1, '#e53935'], [3, 1, 8, 1, '#ffd54f'], [6, 0, 2, 1, '#555']] },
    { id: 'halo', name: 'Halo', slot: 'head', price: 250, boxes: function () {
      return [B(0, 1.14, 0.2, 0.46, 0.05, 0.06, 0xffe566), B(0, 1.14, -0.2, 0.46, 0.05, 0.06, 0xffe566), B(0.2, 1.14, 0, 0.06, 0.05, 0.34, 0xffe566), B(-0.2, 1.14, 0, 0.06, 0.05, 0.34, 0xffe566)];
    }, px: [[3, 1, 8, 1, '#ffe566'], [2, 2, 1, 1, '#ffe566'], [11, 2, 1, 1, '#ffe566'], [3, 3, 8, 1, '#ffe566']] },
    { id: 'flowers', name: 'Flower Crown', slot: 'head', price: 90, boxes: function () {
      return [B(0, 0.92, 0, 0.54, 0.06, 0.52, 0x43a047), B(0.2, 0.98, 0.18, 0.12, 0.12, 0.12, 0xff6f9c), B(-0.2, 0.98, 0.18, 0.12, 0.12, 0.12, 0xffd54f),
        B(0.22, 0.98, -0.12, 0.12, 0.12, 0.12, 0xffffff), B(-0.22, 0.98, -0.12, 0.12, 0.12, 0.12, 0xb39ddb), B(0, 0.99, 0.26, 0.12, 0.12, 0.1, 0xff8a65)];
    }, px: [[3, 3, 8, 1, '#43a047'], [3, 2, 2, 1, '#ff6f9c'], [6, 2, 2, 1, '#ff8a65'], [9, 2, 2, 1, '#ffd54f']] },
    { id: 'monocle', name: 'Monocle', slot: 'face', price: 80, boxes: function () {
      return [B(0.14, 0.68, 0.29, 0.17, 0.17, 0.03, 0xffd54f), B(0.14, 0.68, 0.3, 0.1, 0.1, 0.03, 0xcfefff), B(0.2, 0.52, 0.29, 0.02, 0.2, 0.02, 0xffd54f)];
    }, px: [[8, 6, 3, 3, '#ffd54f'], [9, 7, 1, 1, '#cfefff'], [10, 9, 1, 2, '#ffd54f']] },
    { id: 'scarf', name: 'Cozy Scarf', slot: 'face', price: 75, boxes: function () {
      return [B(0, 0.3, 0, 0.6, 0.12, 0.56, 0xe53935), B(0, 0.3, 0.2, 0.62, 0.05, 0.2, 0xffffff), B(0.18, 0.18, 0.3, 0.14, 0.26, 0.05, 0xe53935), B(0.18, 0.1, 0.3, 0.14, 0.05, 0.05, 0xffffff)];
    }, px: [[3, 10, 8, 1, '#e53935'], [3, 11, 2, 1, '#fff'], [9, 11, 2, 2, '#e53935']] },
  ];


  // ---------------------------------------------------------------- effects
  // Hop effects: little particles that follow every hop. One can be worn at a time.
  // up: initial upward speed (negative gravity floats up), seq: cycle through the colours in order.
  var FX = [
    { id: 'sparkle', name: 'Sparkles', icon: '✨', price: 80,  colors: [0xfff3a0, 0xffd23f, 0xffffff], up: 2.2, gravity: 3,  size: 0.09, life: 0.6 },
    { id: 'hearts',  name: 'Hearts',   icon: '💗', price: 100, colors: [0xff6f9c, 0xff3d7f, 0xffb3cf], up: 1.4, gravity: -1.2, size: 0.11, life: 0.9 },
    { id: 'rainbow', name: 'Rainbow',  icon: '🌈', price: 200, colors: [0xff5a5f, 0xff9f1c, 0xffd23f, 0x5cb83f, 0x3d8bff, 0xc36bff], up: 0.2, gravity: 0, size: 0.13, life: 0.7, seq: true },
    { id: 'petals',  name: 'Petals',   icon: '🌸', price: 110, colors: [0xffc1d9, 0xffffff, 0xff9ec4], up: 1, gravity: 1.2, size: 0.1, life: 1.1 },
    { id: 'snow',    name: 'Snowfall', icon: '❄️', price: 120, colors: [0xffffff, 0xdff3ff, 0xbfe6ff], up: 0.6, gravity: 1, size: 0.09, life: 1.1 },
    { id: 'embers',  name: 'Embers',   icon: '🔥', price: 160, colors: [0xff7a1a, 0xffb02e, 0xfff3b0], up: 1.8, gravity: -2, size: 0.09, life: 0.8 },
    { id: 'bubbles', name: 'Bubbles',  icon: '🫧', price: 90,  colors: [0xcff1ff, 0x9be0ff, 0xffffff], up: 1.2, gravity: -1.5, size: 0.12, life: 1 }
  ];

  // ---------------------------------------------------------------- extras
  // Pets follow you around (cosmetic only: they never do anything), trails mark the ground you
  // hopped on, auras circle the chicken, death animations replace the way it goes (every way to
  // lose except the eagle / UFO grab), hop sounds change the sound of a hop.
  // Their looks live in pets.js, flair.js and audio.js, found by id; this is the catalogue.
  // radio: one is always picked (the free 'classic' is the default); the others can be switched off.
  var PETS = [
    { id: 'duckling', name: 'Duckling', icon: '🐥', price: 120 },
    { id: 'frog',     name: 'Frog',     icon: '🐸', price: 150 },
    { id: 'bunny',    name: 'Bunny',    icon: '🐰', price: 180 },
    { id: 'drone',    name: 'Mini Drone', icon: '🚁', price: 250 },
    { id: 'dragon',   name: 'Baby Dragon', icon: '🐲', price: 340 }
  ];
  var TRAILS = [
    { id: 'prints',  name: 'Paw Prints',   icon: '🐾', price: 60 },
    { id: 'flowers', name: 'Flower Path',  icon: '🌼', price: 100 },
    { id: 'stars',   name: 'Star Dust',    icon: '⭐', price: 120 },
    { id: 'neon',    name: 'Neon Tiles',   icon: '💠', price: 150 },
    { id: 'rainbow', name: 'Rainbow Road', icon: '🛣️', price: 210 }
  ];
  var AURAS = [
    { id: 'coins',  name: 'Gold Orbit',   icon: '🪙', price: 180 },
    { id: 'frost',  name: 'Frost Spin',   icon: '❄️', price: 190 },
    { id: 'fire',   name: 'Fire Ring',    icon: '🔥', price: 200 },
    { id: 'magnet', name: 'Magnet Field', icon: '🧲', price: 220 },
    { id: 'star',   name: 'Star Halo',    icon: '🌟', price: 240 }
  ];
  var DEATHS = [
    { id: 'classic',  name: 'Classic',   icon: '💥', price: 0 },
    { id: 'poof',     name: 'Poof!',     icon: '💨', price: 80 },
    { id: 'confetti', name: 'Confetti',  icon: '🎉', price: 110 },
    { id: 'spin',     name: 'Cartoon Spin', icon: '🌀', price: 130 },
    { id: 'ghost',    name: 'Ghost',     icon: '👻', price: 150 },
    { id: 'rocket',   name: 'Blast Off', icon: '🚀', price: 200 }
  ];
  var HSOUNDS = [
    { id: 'classic', name: 'Classic', icon: '🔔', price: 0 },
    { id: 'boing',   name: 'Boing',   icon: '🦘', price: 50 },
    { id: 'pop',     name: 'Pop',     icon: '🎈', price: 60 },
    { id: 'squeak',  name: 'Squeak',  icon: '🦆', price: 70 },
    { id: 'chirp',   name: 'Chirp',   icon: '🐦', price: 80 },
    { id: 'blip',    name: 'Arcade',  icon: '👾', price: 90 }
  ];
  var EXTRA = { pet: PETS, trail: TRAILS, aura: AURAS, death: DEATHS, hsound: HSOUNDS };
  var RADIO = { death: 1, hsound: 1 };
  var EXTRA_KINDS = Object.keys(EXTRA);

  // ---------------------------------------------------------------- state
  var state = load();
  var fxCur = fxById(state.fx);   // the worn hop effect (cached: the player asks for it every frame)

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* fresh start */ }
    // fill in anything an older or damaged save is missing
    var d = { skins: ['classic'], outfits: [], fxOwned: [], skin: 'classic', head: null, face: null, fx: null, own: {}, eq: {} };
    EXTRA_KINDS.forEach(function (k) { d.own[k] = RADIO[k] ? ['classic'] : []; d.eq[k] = RADIO[k] ? 'classic' : null; });
    if (s && typeof s === 'object') {
      ['skins', 'outfits', 'fxOwned'].forEach(function (k) { if (Array.isArray(s[k])) d[k] = s[k]; });
      ['skin', 'head', 'face', 'fx'].forEach(function (k) { if (typeof s[k] === 'string') d[k] = s[k]; });
      EXTRA_KINDS.forEach(function (k) {
        if (s.own && Array.isArray(s.own[k])) d.own[k] = s.own[k];
        if (s.eq && (typeof s.eq[k] === 'string' || s.eq[k] === null)) d.eq[k] = s.eq[k];
        if (RADIO[k] && d.own[k].indexOf('classic') < 0) d.own[k].unshift('classic');
        if (RADIO[k] && !d.eq[k]) d.eq[k] = 'classic';
      });
    }
    if (d.skins.indexOf('classic') < 0) d.skins.unshift('classic');
    return d;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function skinById(id) { return SKINS.filter(function (s) { return s.id === id; })[0] || SKINS[0]; }
  function fxById(id) { return FX.filter(function (f) { return f.id === id; })[0] || null; }
  function outfitById(id) { return OUTFITS.filter(function (o) { return o.id === id; })[0] || null; }

  function hex(c) { return '#' + ('000000' + c.toString(16)).slice(-6); }
  function rect(x, y, w, h, fill) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"/>';
  }

  // Pixel preview of a look (defaults to what you are wearing now).
  function svg(look) {
    look = look || current();
    var s = look.skin;
    var out = '<svg viewBox="0 0 14 15" shape-rendering="crispEdges" aria-hidden="true">';
    out += rect(3, 14, 8, 1, 'rgba(0,0,0,.25)');
    out += rect(4, 12, 1, 2, hex(s.legs)) + rect(9, 12, 1, 2, hex(s.legs)) + rect(3, 13, 3, 1, hex(s.legs)) + rect(8, 13, 3, 1, hex(s.legs));
    out += rect(3, 5, 8, 8, hex(s.body)) + rect(3, 11, 8, 2, hex(s.shade));
    out += rect(2, 7, 1, 4, hex(s.wing)) + rect(11, 7, 1, 4, hex(s.wing));
    if (!look.head) out += rect(6, 3, 2, 1, hex(s.comb)) + rect(5, 4, 4, 1, hex(s.comb));
    out += rect(4, 6, 1, 2, hex(s.eye)) + rect(9, 6, 1, 2, hex(s.eye));
    out += rect(5, 8, 4, 2, hex(s.beak)) + rect(6, 10, 2, 1, hex(s.comb));
    [look.face, look.head].forEach(function (o) {
      if (o) o.px.forEach(function (r) { out += rect(r[0], r[1], r[2], r[3], r[4]); });
    });
    return out + '</svg>';
  }

  function current() {
    return { skin: skinById(state.skin), head: outfitById(state.head), face: outfitById(state.face) };
  }

  function extraById(kind, id) { return EXTRA[kind].filter(function (e) { return e.id === id; })[0] || null; }
  function itemOf(kind, id) {
    if (EXTRA[kind]) return extraById(kind, id);
    return kind === 'skin' ? skinById(id) : kind === 'fx' ? fxById(id) : outfitById(id);
  }
  function ownedList(kind) {
    if (EXTRA[kind]) return state.own[kind];
    return kind === 'skin' ? state.skins : kind === 'fx' ? state.fxOwned : state.outfits;
  }
  // the worn extra of this kind (null = none; a radio kind falls back to its free default)
  function eqItem(kind) {
    var it = extraById(kind, state.eq[kind]);
    return it || (RADIO[kind] ? EXTRA[kind][0] : null);
  }
  function rarity(price) { return price <= 70 ? 'Common' : price <= 140 ? 'Uncommon' : price <= 250 ? 'Rare' : 'Epic'; }

  return {
    SKINS: SKINS,
    OUTFITS: OUTFITS,
    FX: FX,
    EXTRA_KINDS: EXTRA_KINDS,
    // every item of a shop tab
    list: function (kind) {
      return EXTRA[kind] || (kind === 'skin' ? SKINS : kind === 'fx' ? FX : OUTFITS);
    },
    // a toggle kind can be taken off again, a radio kind always has one picked
    isRadio: function (kind) { return !!RADIO[kind]; },
    // the extra being worn: its catalogue entry (or null), and just its id
    eq: eqItem,
    eqId: function (kind) { var it = eqItem(kind); return it ? it.id : null; },
    itemOf: itemOf,
    rarity: rarity,
    // the hop effect being worn (or null)
    fx: function () { return fxCur; },
    // Mystery chest: a random item you don't own yet (cheaper items are more likely). null = you own everything.
    chestPick: function () {
      var pool = [];
      [['skin', SKINS], ['outfit', OUTFITS], ['fx', FX]].concat(EXTRA_KINDS.map(function (k) { return [k, EXTRA[k]]; })).forEach(function (g) {
        g[1].forEach(function (it) {
          if (ownedList(g[0]).indexOf(it.id) < 0 && it.price > 0) pool.push({ kind: g[0], id: it.id, w: 1 / Math.sqrt(it.price) });
        });
      });
      if (!pool.length) return null;
      var tot = pool.reduce(function (a, p) { return a + p.w; }, 0), r = Math.random() * tot;
      for (var i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) return pool[i]; }
      return pool[pool.length - 1];
    },
    CHEST_PRICE: 90,
    current: current,
    svg: svg,
    // 3D accessories for whatever is equipped
    outfitBoxes: function () {
      var look = current(), out = [];
      [look.face, look.head].forEach(function (o) { if (o) out = out.concat(o.boxes()); });
      return out;
    },
    owned: function (kind, id) { return ownedList(kind).indexOf(id) >= 0; },
    isEquipped: function (kind, id) {
      if (EXTRA[kind]) return this.eqId(kind) === id;
      if (kind === 'skin') return state.skin === id;
      if (kind === 'fx') return state.fx === id;
      var o = outfitById(id);
      return !!o && state[o.slot] === id;
    },
    price: function (kind, id) { return itemOf(kind, id).price; },
    buy: function (kind, id) {
      if (this.owned(kind, id)) return;
      ownedList(kind).push(id);
      save();
    },
    // Skins: pick one. Outfits: one per slot; equipping the worn one takes it off.
    equip: function (kind, id) {
      if (!this.owned(kind, id)) return;
      if (EXTRA[kind]) state.eq[kind] = RADIO[kind] ? id : (state.eq[kind] === id ? null : id);
      else if (kind === 'skin') state.skin = id;
      else if (kind === 'fx') { state.fx = state.fx === id ? null : id; fxCur = fxById(state.fx); }
      else {
        var o = outfitById(id);
        state[o.slot] = state[o.slot] === id ? null : id;
      }
      save();
    },
    ownedCount: function () {
      return state.skins.length + state.outfits.length + state.fxOwned.length +
        EXTRA_KINDS.reduce(function (n, k) { return n + state.own[k].length; }, 0);
    },
    // everything you paid coins for (the free defaults don't count): for the "Shopaholic" trophy
    boughtCount: function () {
      return state.skins.length - 1 + state.outfits.length + state.fxOwned.length +
        EXTRA_KINDS.reduce(function (n, k) { return n + state.own[k].length - (RADIO[k] ? 1 : 0); }, 0);
    },
    // chickens + outfits you bought (not the free Classic, not hop effects): for the "Fashionista" trophy
    wardrobeCount: function () { return state.skins.length - 1 + state.outfits.length; },
    totalCount: function () {
      return SKINS.length + OUTFITS.length + FX.length +
        EXTRA_KINDS.reduce(function (n, k) { return n + EXTRA[k].length; }, 0);
    }
  };
})();
