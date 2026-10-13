// The Space biome: same game, new skin. Every forest prop has a space twin with
// the same footprint and the same "kind" (so a crystal blocks a tile like a tree
// does, a cargo crate can be hopped over like a hay bale, a maglev train hits
// like a train...). Registered into Models, which picks them by biome.
(function () {
  var H = Models.helpers;
  var B = H.B;
  var GLASS = 0x8fefff;
  var HULL = 0xe6ecfa, PANEL = 0x7480a6, DARKP = 0x1b1e33, CYAN = 0x4de8ff, VIOLET = 0x8f6bff, PINK = 0xff5fd2, ORANGE = 0xff8a3d;

  // ------------------------------------------------------------------ scenery
  var CRYSTALS = [[0x7a5cff, 0xb7a3ff, 0xe3dbff], [0x23c9e8, 0x8ef0ff, 0xd4fbff], [0xff5fd2, 0xffa6e8, 0xffe0f6], [0x45e6a8, 0xa4ffd8, 0xe0fff2]];

  function crystal(out, x, z, kind) {
    var p = H.choice(CRYSTALS);
    var k = H.randRange(0.9, 1.3);
    if (kind === 3) {                 // dark obelisk with a glowing band
      out.push(B(x, 0.25, z, 0.5, 0.5, 0.5, 0x2c2f4d));
      out.push(B(x, 0.8, z, 0.34, 0.8, 0.34, 0x3a3e66));
      out.push(B(x, 0.9, z, 0.37, 0.07, 0.37, CYAN));
      out.push(B(x, 1.28, z, 0.37, 0.07, 0.37, CYAN));
      out.push(B(x, 1.38, z, 0.2, 0.2, 0.2, 0x4a4f80));
      return;
    }
    out.push(B(x, 0.12, z, 0.7, 0.24, 0.7, 0x3d3a66));                    // rocky base
    out.push(B(x, 0.24 + 0.3 * k, z, 0.38, 0.6 * k, 0.38, p[0]));
    out.push(B(x, 0.24 + 0.6 * k + 0.2, z, 0.26, 0.4, 0.26, p[1]));
    out.push(B(x, 0.24 + 0.6 * k + 0.45, z, 0.12, 0.2, 0.12, p[2]));
    if (kind !== 0) {
      out.push(B(x + 0.26, 0.24 + 0.2, z + 0.12, 0.2, 0.4, 0.2, p[1]));
      out.push(B(x + 0.26, 0.24 + 0.46, z + 0.12, 0.1, 0.16, 0.1, p[2]));
    }
    if (kind === 2) {
      out.push(B(x - 0.26, 0.24 + 0.24, z - 0.14, 0.22, 0.48, 0.22, p[0]));
      out.push(B(x - 0.26, 0.24 + 0.54, z - 0.14, 0.11, 0.18, 0.11, p[1]));
    }
  }

  function moonRock(out, x, z) {
    var base = H.choice([0x8f8fb0, 0x8584a8, 0x9b9abb]);
    out.push(B(x, 0.17, z, 0.7, 0.34, 0.64, base));
    out.push(B(x + 0.08, 0.42, z - 0.04, 0.42, 0.24, 0.4, H.shade(base, 0.14)));
    out.push(B(x - 0.1, 0.355, z + 0.1, 0.26, 0.02, 0.22, H.shade(base, -0.22))); // crater
    if (Math.random() < 0.5) out.push(B(x - 0.28, 0.1, z + 0.3, 0.2, 0.2, 0.2, H.shade(base, -0.1)));
  }

  function glowPod(out, x, z) {      // bush: a glowing alien plant
    out.push(B(x, 0.19, z, 0.74, 0.38, 0.74, 0x2a7a78));
    out.push(B(x, 0.45, z, 0.5, 0.16, 0.5, 0x3ccfb4));
    out.push(B(x + 0.2, 0.3, z + 0.38, 0.1, 0.1, 0.04, PINK));
    out.push(B(x - 0.15, 0.22, z + 0.38, 0.1, 0.1, 0.04, 0xffe14d));
    out.push(B(x, 0.58, z, 0.14, 0.12, 0.14, 0xc8fff0));
  }

  function crate(out, x, z) {        // hay bale: cargo crate
    out.push(B(x, 0.28, z, 0.82, 0.56, 0.7, 0xc9ced9));
    out.push(B(x, 0.28, z + 0.352, 0.82, 0.12, 0.02, 0xffc233));
    out.push(B(x, 0.28, z - 0.352, 0.82, 0.12, 0.02, 0xffc233));
    out.push(B(x - 0.26, 0.28, z, 0.07, 0.58, 0.72, 0x7480a6));
    out.push(B(x + 0.26, 0.28, z, 0.07, 0.58, 0.72, 0x7480a6));
    if (Math.random() < 0.5) out.push(B(x + 0.05, 0.7, z, 0.6, 0.3, 0.5, 0xaab2c6));
  }

  function laserFence(out, x, z) {   // fence: posts with a glowing beam
    out.push(B(x - 0.42, 0.28, z, 0.1, 0.56, 0.1, 0x59607f));
    out.push(B(x + 0.42, 0.28, z, 0.1, 0.56, 0.1, 0x59607f));
    out.push(B(x - 0.42, 0.58, z, 0.12, 0.06, 0.12, CYAN));
    out.push(B(x + 0.42, 0.58, z, 0.12, 0.06, 0.12, CYAN));
    out.push(B(x, 0.26, z, 0.74, 0.04, 0.04, 0x7df3ff));
    out.push(B(x, 0.42, z, 0.74, 0.04, 0.04, 0x7df3ff));
  }

  function radar(out, x, z) {        // scarecrow: a radar dish on a mast
    out.push(B(x, 0.12, z, 0.34, 0.24, 0.34, 0x59607f));
    out.push(B(x, 0.62, z, 0.08, 0.9, 0.08, 0xaab2c6));
    out.push(B(x, 1.08, z, 0.62, 0.1, 0.62, HULL));
    out.push(B(x, 1.16, z, 0.46, 0.06, 0.46, 0xc9d0e6));
    out.push(B(x, 1.32, z, 0.05, 0.28, 0.05, 0xaab2c6));
    out.push(B(x, 1.48, z, 0.1, 0.1, 0.1, 0xff4f5a));
  }

  function reactor(out, x, z) {      // stump: a humming core
    out.push(B(x, 0.18, z, 0.5, 0.36, 0.5, 0x59607f));
    out.push(B(x, 0.375, z, 0.4, 0.03, 0.4, ORANGE));
    out.push(B(x, 0.33, z, 0.52, 0.05, 0.52, 0x3d4260));
    out.push(B(x + 0.22, 0.12, z, 0.1, 0.2, 0.3, CYAN));
  }

  function canisters(out, x, z) {    // barrels: fuel tanks
    out.push(B(x - 0.2, 0.3, z, 0.4, 0.6, 0.4, 0xe9edf7));
    out.push(B(x - 0.2, 0.18, z, 0.42, 0.06, 0.42, 0x59607f));
    out.push(B(x - 0.2, 0.44, z, 0.42, 0.06, 0.42, 0xff5a5f));
    out.push(B(x + 0.22, 0.25, z + 0.08, 0.36, 0.5, 0.36, 0x6f8cff));
    out.push(B(x + 0.22, 0.52, z + 0.08, 0.12, 0.06, 0.12, 0xdde3f5));
  }

  function solar(out, x, z) {        // sunflower: a solar panel on a pole
    out.push(B(x, 0.4, z, 0.06, 0.8, 0.06, 0xaab2c6));
    out.push(B(x, 0.9, z - 0.02, 0.5, 0.4, 0.06, 0x2a3f8f));
    out.push(B(x, 0.9, z - 0.055, 0.5, 0.02, 0.01, 0x7fa0ff));
    out.push(B(x, 0.9, z - 0.055, 0.02, 0.4, 0.01, 0x7fa0ff));
    out.push(B(x, 0.9, z - 0.055, 0.1, 0.1, 0.01, 0xffd23f));
  }

  function alienShroom(out, x, z) {
    out.push(B(x, 0.14, z, 0.16, 0.28, 0.16, 0xe3dbff));
    out.push(B(x, 0.34, z, 0.46, 0.14, 0.46, VIOLET));
    out.push(B(x - 0.12, 0.42, z - 0.1, 0.1, 0.03, 0.1, 0x7df3ff));
    out.push(B(x + 0.12, 0.42, z + 0.08, 0.1, 0.03, 0.1, 0xffa6e8));
    out.push(B(x + 0.22, 0.1, z - 0.22, 0.1, 0.18, 0.1, 0xe3dbff));
    out.push(B(x + 0.22, 0.23, z - 0.22, 0.22, 0.08, 0.22, PINK));
  }

  var OBSTACLES = {
    tree: function (out, x, z) { crystal(out, x, z, H.randInt(0, 3)); },
    rock: moonRock, bush: glowPod, hay: crate, fence: laserFence, scarecrow: radar,
    stump: reactor, barrels: canisters, sunflower: solar, mushroom: alienShroom
  };

  // the border outside the playable strip: crystal spires and pylons
  function border(out, x, z, kind) { crystal(out, x, z, kind === 3 ? 3 : kind === 0 ? 0 : kind); }
  function starBloom(out, x, z) {
    var c = H.choice([0x7df3ff, 0xffa6e8, 0xe3dbff, 0xfff1a8]);
    var ox = H.randRange(-0.3, 0.3), oz = H.randRange(-0.3, 0.3);
    out.push(B(x + ox, 0.04, z + oz, 0.05, 0.08, 0.05, 0x59607f));
    out.push(B(x + ox, 0.11, z + oz, 0.1, 0.07, 0.1, c));
  }

  // ----------------------------------------------------------------- vehicles
  function glowBase(o, len, w, y) {  // hover pad instead of wheels
    o.push(B(0, y, 0, len * 0.86, 0.05, w * 0.7, CYAN));
    o.push(B(0, y + 0.07, 0, len, 0.1, w, DARKP));
  }
  function thruster(o, x, w) {
    o.push(B(x, 0.38, 0, 0.1, 0.18, w, 0x3a3e5c));
    o.push(B(x - 0.07, 0.38, 0, 0.06, 0.1, w * 0.7, ORANGE));
  }
  function nose(o, x, y, z) {
    o.push(B(x, y, z, 0.05, 0.1, 0.14, 0xe9fdff));
    o.push(B(x, y, -z, 0.05, 0.1, 0.14, 0xe9fdff));
  }

  var VEHICLES = {};
  VEHICLES.sedan = { len: 1.25, build: function (c) {
    var o = [];
    glowBase(o, 1.2, 0.7, 0.16);
    o.push(B(0, 0.36, 0, 1.25, 0.22, 0.72, c));
    o.push(B(-0.1, 0.58, 0, 0.62, 0.2, 0.58, GLASS));
    o.push(B(-0.1, 0.72, 0, 0.5, 0.06, 0.48, H.shade(c, 0.2)));
    o.push(B(-0.56, 0.52, 0, 0.12, 0.26, 0.5, H.shade(c, -0.1)));
    thruster(o, -0.66, 0.4); nose(o, 0.63, 0.38, 0.24);
    return o;
  } };
  VEHICLES.taxi = { len: 1.25, build: function () {
    var o = VEHICLES.sedan.build(0xffd23f);
    o.push(B(-0.1, 0.8, 0, 0.22, 0.1, 0.34, 0xffffff));
    o.push(B(0, 0.36, 0.375, 0.9, 0.05, 0.02, 0x222222));
    o.push(B(0, 0.36, -0.375, 0.9, 0.05, 0.02, 0x222222));
    return o;
  } };
  VEHICLES.police = { len: 1.3, build: function () {
    var o = [];
    glowBase(o, 1.25, 0.72, 0.16);
    o.push(B(0, 0.36, 0, 1.3, 0.22, 0.74, 0x23283f));
    o.push(B(-0.1, 0.58, 0, 0.64, 0.2, 0.6, 0xf4f4f4));
    o.push(B(-0.1, 0.58, 0, 0.68, 0.12, 0.64, GLASS));
    o.push(B(-0.1, 0.78, 0.14, 0.14, 0.1, 0.2, 0xff4f5a));
    o.push(B(-0.1, 0.78, -0.14, 0.14, 0.1, 0.2, 0x4f8bff));
    thruster(o, -0.7, 0.42); nose(o, 0.66, 0.38, 0.25);
    return o;
  } };
  VEHICLES.van = { len: 1.6, build: function (c) {
    var o = [];
    glowBase(o, 1.55, 0.76, 0.16);
    o.push(B(0, 0.5, 0, 1.6, 0.5, 0.78, c));
    o.push(B(0.25, 0.8, 0, 1.1, 0.12, 0.76, H.shade(c, 0.12)));
    o.push(B(0.81, 0.62, 0, 0.04, 0.24, 0.64, GLASS));
    o.push(B(0.4, 0.62, 0.395, 0.6, 0.2, 0.02, GLASS));
    o.push(B(0.4, 0.62, -0.395, 0.6, 0.2, 0.02, GLASS));
    o.push(B(-0.3, 0.45, 0.395, 0.9, 0.1, 0.02, CYAN));
    o.push(B(-0.3, 0.45, -0.395, 0.9, 0.1, 0.02, CYAN));
    thruster(o, -0.84, 0.5); nose(o, 0.81, 0.34, 0.26);
    return o;
  } };
  VEHICLES.truck = { len: 3.0, build: function (c) {
    var o = [];
    var box = H.choice([0xe6ecfa, 0x6f8cff, 0xff5a5f, 0xffb02e, 0x45e6a8]);
    glowBase(o, 2.9, 0.72, 0.2);
    o.push(B(1.1, 0.5, 0, 0.78, 0.6, 0.82, c));
    o.push(B(1.1, 0.86, 0, 0.7, 0.12, 0.8, H.shade(c, 0.15)));
    o.push(B(1.5, 0.66, 0, 0.04, 0.3, 0.64, GLASS));
    o.push(B(1.1, 0.66, 0.415, 0.5, 0.24, 0.02, GLASS));
    o.push(B(1.1, 0.66, -0.415, 0.5, 0.24, 0.02, GLASS));
    o.push(B(-0.35, 0.74, 0, 2.2, 0.98, 0.88, box));
    o.push(B(-0.35, 1.25, 0, 2.24, 0.04, 0.92, H.shade(box, -0.2)));
    for (var i = 0; i < 4; i++) {
      o.push(B(-1.15 + i * 0.55, 0.74, 0.445, 0.08, 0.88, 0.02, H.shade(box, -0.16)));
      o.push(B(-1.15 + i * 0.55, 0.74, -0.445, 0.08, 0.88, 0.02, H.shade(box, -0.16)));
    }
    thruster(o, -1.5, 0.6); nose(o, 1.5, 0.34, 0.28);
    return o;
  } };
  VEHICLES.bus = { len: 3.2, build: function (c) {
    var o = [];
    glowBase(o, 3.1, 0.82, 0.18);
    o.push(B(0, 0.56, 0, 3.0, 0.8, 0.86, c));
    o.push(B(1.55, 0.5, 0, 0.3, 0.5, 0.74, H.shade(c, 0.1)));    // nose cone
    o.push(B(1.72, 0.44, 0, 0.12, 0.3, 0.6, H.shade(c, 0.2)));
    o.push(B(0, 1.0, 0, 3.0, 0.1, 0.82, H.shade(c, 0.2)));
    o.push(B(-0.1, 0.8, 0.44, 2.6, 0.26, 0.02, GLASS));
    o.push(B(-0.1, 0.8, -0.44, 2.6, 0.26, 0.02, GLASS));
    o.push(B(1.2, 0.8, 0, 0.04, 0.34, 0.7, GLASS));
    o.push(B(0, 0.46, 0.44, 3.0, 0.07, 0.02, CYAN));
    o.push(B(0, 0.46, -0.44, 3.0, 0.07, 0.02, CYAN));
    thruster(o, -1.55, 0.6);
    return o;
  } };
  VEHICLES.motorbike = { len: 0.95, build: function (c) {
    var o = [], suit = H.choice([0xff4f5a, 0x4f8bff, 0xf2f2f2, 0xffa726, 0x45e6a8]);
    o.push(B(0, 0.2, 0, 0.84, 0.05, 0.14, CYAN));
    o.push(B(0, 0.3, 0, 0.8, 0.12, 0.2, c));
    o.push(B(0.18, 0.42, 0, 0.3, 0.12, 0.2, H.shade(c, 0.14)));
    o.push(B(-0.42, 0.34, 0, 0.1, 0.14, 0.18, ORANGE));
    o.push(B(0.4, 0.46, 0, 0.06, 0.2, 0.06, 0xaab2c6));
    o.push(B(0.36, 0.58, 0, 0.06, 0.06, 0.42, 0x333a5a));
    o.push(B(0.46, 0.44, 0, 0.05, 0.1, 0.14, 0xe9fdff));
    o.push(B(-0.14, 0.7, 0, 0.22, 0.4, 0.28, suit));
    o.push(B(-0.12, 1.0, 0, 0.3, 0.3, 0.3, 0xe6ecfa));          // astronaut helmet
    o.push(B(-0.0, 1.0, 0, 0.1, 0.18, 0.26, GLASS));
    o.push(B(0.1, 0.66, 0.14, 0.3, 0.08, 0.07, suit));
    o.push(B(0.1, 0.66, -0.14, 0.3, 0.08, 0.07, suit));
    return o;
  } };
  VEHICLES.tractor = { len: 1.9, build: function () {
    var o = [], body = H.choice([0xffa726, 0xe8e8f4, 0x45e6a8]);
    o.push(B(0.2, 0.5, 0, 1.2, 0.42, 0.62, body));
    o.push(B(0.95, 0.4, 0, 0.3, 0.14, 0.14, 0xaab2c6));          // drill
    o.push(B(1.1, 0.4, 0, 0.14, 0.1, 0.1, ORANGE));
    o.push(B(-0.35, 0.85, 0, 0.56, 0.5, 0.56, H.shade(body, 0.1)));
    o.push(B(-0.35, 0.9, 0, 0.6, 0.3, 0.6, GLASS));
    o.push(B(-0.35, 1.15, 0, 0.7, 0.06, 0.66, H.shade(body, -0.2)));
    [-1, 1].forEach(function (s) {
      o.push(B(0.55, 0.22, s * 0.4, 0.46, 0.44, 0.14, 0x2c2f48));
      o.push(B(-0.55, 0.28, s * 0.42, 0.6, 0.56, 0.14, 0x2c2f48));
      o.push(B(-0.55, 0.28, s * 0.5, 0.28, 0.28, 0.04, CYAN));
      o.push(B(0.55, 0.22, s * 0.48, 0.22, 0.22, 0.04, CYAN));
    });
    o.push(B(0.7, 0.9, 0.15, 0.07, 0.3, 0.07, 0x333a5a));
    return o;
  } };
  VEHICLES.ambulance = { len: 1.7, build: function () {
    var o = [];
    glowBase(o, 1.65, 0.8, 0.16);
    o.push(B(0, 0.52, 0, 1.7, 0.55, 0.8, 0xffffff));
    o.push(B(0.1, 0.82, 0, 1.5, 0.08, 0.78, 0xf0f0f0));
    o.push(B(0.86, 0.64, 0, 0.04, 0.24, 0.64, GLASS));
    [-1, 1].forEach(function (sz) {
      o.push(B(0, 0.46, sz * 0.405, 1.6, 0.1, 0.02, 0xff4f5a));
      o.push(B(-0.3, 0.64, sz * 0.405, 0.3, 0.08, 0.02, 0xff4f5a));
      o.push(B(-0.3, 0.64, sz * 0.405, 0.08, 0.3, 0.02, 0xff4f5a));
    });
    o.push(B(0.5, 0.92, 0.18, 0.18, 0.1, 0.22, 0xff4f5a));
    o.push(B(0.5, 0.92, -0.18, 0.18, 0.1, 0.22, 0x4f8bff));
    thruster(o, -0.9, 0.5); nose(o, 0.86, 0.34, 0.26);
    return o;
  } };
  VEHICLES.icecream = { len: 1.8, build: function () {
    var o = [], body = H.choice([0xffc1d9, 0x9ad7ff, 0xfff1b0]);
    glowBase(o, 1.7, 0.8, 0.16);
    o.push(B(0, 0.52, 0, 1.8, 0.6, 0.8, body));
    o.push(B(0, 0.86, 0, 1.7, 0.08, 0.78, 0xffffff));
    o.push(B(0.91, 0.64, 0, 0.04, 0.26, 0.64, GLASS));
    [-1, 1].forEach(function (sz) {
      o.push(B(-0.2, 0.62, sz * 0.405, 0.5, 0.26, 0.02, 0x8ad0ff));
      o.push(B(-0.2, 0.8, sz * 0.46, 0.6, 0.05, 0.14, 0xff4f5a));
      o.push(B(-0.2, 0.8, sz * 0.46, 0.2, 0.052, 0.142, 0xffffff));
    });
    o.push(B(-0.2, 0.96, 0, 0.12, 0.12, 0.12, 0xe0b070));
    o.push(B(-0.2, 1.06, 0, 0.22, 0.12, 0.22, 0xe0b070));
    o.push(B(-0.2, 1.2, 0, 0.32, 0.2, 0.32, 0xff9ec4));
    o.push(B(-0.2, 1.34, 0, 0.1, 0.1, 0.1, 0xff4f5a));
    thruster(o, -0.94, 0.5); nose(o, 0.91, 0.34, 0.26);
    return o;
  } };
  VEHICLES.sports = { len: 1.35, build: function (c) {
    var o = [];
    o.push(B(0, 0.14, 0, 1.3, 0.04, 0.5, CYAN));
    o.push(B(0, 0.2, 0, 1.35, 0.08, 0.8, DARKP));
    o.push(B(0, 0.32, 0, 1.35, 0.18, 0.78, c));
    o.push(B(-0.12, 0.47, 0, 0.55, 0.14, 0.6, H.shade(c, 0.1)));
    o.push(B(-0.12, 0.47, 0, 0.6, 0.1, 0.64, GLASS));
    o.push(B(-0.62, 0.52, 0, 0.1, 0.05, 0.74, DARKP));
    o.push(B(-0.6, 0.42, 0.28, 0.05, 0.16, 0.05, DARKP));
    o.push(B(-0.6, 0.42, -0.28, 0.05, 0.16, 0.05, DARKP));
    o.push(B(0.1, 0.415, 0, 1.0, 0.02, 0.2, 0xffffff));
    thruster(o, -0.7, 0.4); nose(o, 0.68, 0.32, 0.26);
    return o;
  } };

  // ---------------------------------------------------------------- floaters
  function asteroidBoxes(length) {   // log: a drifting asteroid chunk
    var o = [];
    var base = H.choice([0x77759c, 0x6d6c92, 0x82809f]);
    o.push(B(0, 0, 0, length, 0.34, 0.78, base));
    o.push(B(0, -0.11, 0, length + 0.02, 0.12, 0.8, H.shade(base, -0.28)));
    o.push(B(0, 0.175, 0, length * 0.94, 0.02, 0.56, H.shade(base, 0.2)));
    o.push(B(length / 2 + 0.01, 0, 0, 0.04, 0.36, 0.8, H.shade(base, 0.3)));
    o.push(B(-length / 2 - 0.01, 0, 0, 0.04, 0.36, 0.8, H.shade(base, 0.3)));
    var n = Math.floor(length);
    for (var i = 0; i < n; i++) {
      var cx = -length / 2 + (i + 0.5) * (length / n);
      o.push(B(cx, 0.185, H.randRange(-0.15, 0.15), 0.2, 0.02, 0.16, H.shade(base, -0.3)));    // craters
    }
    o.push(B(-length / 2 + 0.4, 0.3, 0.2, 0.12, 0.2, 0.12, VIOLET));                            // crystal tuft
    o.push(B(-length / 2 + 0.4, 0.43, 0.2, 0.06, 0.1, 0.06, 0xe3dbff));
    return o;
  }

  var _pad = null;
  function energyPad(withFlower) {
    if (!_pad) {
      _pad = {
        geo: new THREE.CylinderGeometry(0.44, 0.44, 0.07, 6),
        top: new THREE.CylinderGeometry(0.3, 0.3, 0.075, 6),
        mat: new THREE.MeshLambertMaterial({ color: 0x3a4a8a }),
        glow: new THREE.MeshBasicMaterial({ color: CYAN }),
        gem: new THREE.MeshBasicMaterial({ color: PINK }),
        gemGeo: new THREE.BoxGeometry(0.14, 0.14, 0.14)
      };
      [_pad.geo, _pad.top, _pad.gemGeo, _pad.mat, _pad.glow, _pad.gem].forEach(function (x) { x.__shared = true; });
    }
    var g = new THREE.Group();
    var base = new THREE.Mesh(_pad.geo, _pad.mat);
    base.castShadow = true; base.receiveShadow = true;
    var top = new THREE.Mesh(_pad.top, _pad.glow);
    top.position.y = 0.002;
    g.add(base); g.add(top);
    g.rotation.y = H.randRange(0, Math.PI);
    if (withFlower) {
      var f = new THREE.Mesh(_pad.gemGeo, _pad.gem);
      f.position.set(0.1, 0.12, -0.06);
      f.rotation.y = 0.7;
      g.add(f);
    }
    return g;
  }

  // "turtles": little star turtles with a glowing shell
  function starTurtles(n) {
    var o = [];
    for (var i = 0; i < n; i++) {
      var x = (i - (n - 1) / 2) * 1.05;
      o.push(B(x, 0.0, 0, 0.86, 0.2, 0.74, 0x3a2f8f));
      o.push(B(x, 0.12, 0, 0.7, 0.14, 0.6, 0x5a46c8));
      o.push(B(x, 0.19, 0, 0.46, 0.04, 0.4, 0x7d68ff));
      o.push(B(x, 0.215, 0, 0.2, 0.03, 0.2, 0xaef0ff));
      o.push(B(x + 0.14, 0.2, 0.12, 0.07, 0.03, 0.07, 0xff8fd8));
      o.push(B(x - 0.16, 0.2, -0.1, 0.07, 0.03, 0.07, 0xffe14d));
      o.push(B(x + 0.5, 0.04, 0, 0.2, 0.14, 0.2, 0x7be7d0));
      o.push(B(x + 0.6, 0.08, 0.06, 0.04, 0.05, 0.04, 0x111111));
      o.push(B(x + 0.6, 0.08, -0.06, 0.04, 0.05, 0.04, 0x111111));
      o.push(B(x + 0.22, -0.04, 0.4, 0.22, 0.05, 0.14, 0x7be7d0));
      o.push(B(x + 0.22, -0.04, -0.4, 0.22, 0.05, 0.14, 0x7be7d0));
      o.push(B(x - 0.26, -0.04, 0.38, 0.2, 0.05, 0.12, 0x7be7d0));
      o.push(B(x - 0.26, -0.04, -0.38, 0.2, 0.05, 0.12, 0x7be7d0));
      o.push(B(x - 0.46, 0.0, 0, 0.1, 0.06, 0.06, 0x7be7d0));
    }
    return o;
  }

  // ------------------------------------------------------------------ trains
  function maglevLoco() {
    var o = [];
    o.push(B(0, 0.26, 0, 1.65, 0.26, 0.9, 0x2a2e4a));
    o.push(B(0, 0.12, 0, 1.5, 0.04, 0.6, CYAN));
    o.push(B(-0.2, 0.74, 0, 1.2, 0.7, 0.92, HULL));
    o.push(B(0.52, 0.62, 0, 0.5, 0.46, 0.86, 0xc9d3ee));          // sleek nose
    o.push(B(0.78, 0.52, 0, 0.14, 0.28, 0.7, 0xaab8de));
    o.push(B(-0.2, 1.12, 0, 1.24, 0.08, 0.96, 0x59607f));
    o.push(B(0.05, 0.86, 0.465, 0.9, 0.3, 0.02, GLASS));
    o.push(B(0.05, 0.86, -0.465, 0.9, 0.3, 0.02, GLASS));
    o.push(B(0.6, 0.78, 0, 0.3, 0.2, 0.7, GLASS));
    o.push(B(-0.2, 0.5, 0.465, 1.2, 0.07, 0.02, CYAN));
    o.push(B(-0.2, 0.5, -0.465, 1.2, 0.07, 0.02, CYAN));
    o.push(B(0.85, 0.5, 0, 0.04, 0.12, 0.26, 0xffffff));
    return o;
  }
  var CAR_COLORS = [0x6f8cff, 0x45e6a8, 0xff7ad9, 0xffb02e, 0xb7a3ff];
  function maglevCar(c) {
    var o = [];
    o.push(B(0, 0.24, 0, 1.65, 0.16, 0.8, 0x2a2e4a));
    o.push(B(0, 0.12, 0, 1.5, 0.04, 0.6, CYAN));
    o.push(B(0, 0.7, 0, 1.6, 0.76, 0.92, HULL));
    o.push(B(0, 1.1, 0, 1.64, 0.06, 0.96, 0x59607f));
    o.push(B(0, 0.5, 0.465, 1.6, 0.12, 0.02, c));
    o.push(B(0, 0.5, -0.465, 1.6, 0.12, 0.02, c));
    for (var i = 0; i < 4; i++) {
      o.push(B(-0.6 + i * 0.4, 0.84, 0.465, 0.26, 0.26, 0.02, GLASS));
      o.push(B(-0.6 + i * 0.4, 0.84, -0.465, 0.26, 0.26, 0.02, GLASS));
    }
    o.push(B(0.85, 0.3, 0, 0.12, 0.08, 0.12, 0x59607f));
    return o;
  }

  Models.registerBiome('space', {
    obstacles: OBSTACLES, border: border, flower: starBloom, rock: moonRock, bush: glowPod,
    vehicles: VEHICLES, vehicleColors: CAR_COLORS,
    logBoxes: asteroidBoxes, pad: energyPad, turtleBoxes: starTurtles,
    locoBoxes: maglevLoco, carBoxes: maglevCar, carColors: CAR_COLORS
  });
})();
