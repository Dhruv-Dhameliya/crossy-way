// The Space biome. Not a recolour: every kind of prop becomes something that
// belongs in space, with the same footprint and the same "kind" so the rules
// stay identical (a rocket blocks a tile like a tree, a supply crate can be
// hopped over like a hay bale...):
//   traffic   -> spaceships flying over an energy light-bridge (no roads in space)
//   rivers    -> empty space, crossed on broken asteroid chunks and wreckage
//   turtles   -> satellites that power down
//   trains    -> blazing comets (no railways in space)
//   crocodile -> an orbital laser strike on an asteroid
//   eagle     -> a UFO with a tractor beam
//   obstacles -> rockets, crystals, stranded astronauts, domes, aliens...
// Registered into Models, which picks them by biome.
var SpaceModels = (function () {
  var H = Models.helpers;
  var B = H.B;
  var shade = H.shade, choice = H.choice, rr = H.randRange, ri = H.randInt;
  var GLASS = 0x8fefff, HULL = 0xe6ecfa, PANEL = 0x7480a6, DARKP = 0x1b1e33, STEEL = 0x3a3f5c;
  var CYAN = 0x00e5ff, VIOLET = 0xa24dff, PINK = 0xff2bd6, ORANGE = 0xff7a00, RED = 0xff2d55, GREEN = 0x39ff88;

  function BR(x, y, z, w, h, d, c, ry, rx, rz) {
    var b = B(x, y, z, w, h, d, c);
    if (ry) b.ry = ry;
    if (rx) b.rx = rx;
    if (rz) b.rz = rz;
    return b;
  }

  // ===================================================================== scenery
  var CRYSTALS = [[0x9d4dff, 0xc58bff, 0xf0e0ff], [0x00d9ff, 0x66f0ff, 0xd4fbff], [0xff2bd6, 0xff7de6, 0xffe0f9], [0x39ff88, 0x8dffbb, 0xe0fff0]];

  function crystal(out, x, z, kind) {
    var p = choice(CRYSTALS);
    var k = rr(0.9, 1.3);
    out.push(B(x, 0.12, z, 0.7, 0.24, 0.7, 0x3d3a66));
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

  function obelisk(out, x, z) {      // a dark alien monolith with glowing bands
    out.push(B(x, 0.25, z, 0.5, 0.5, 0.5, 0x2c2f4d));
    out.push(B(x, 0.8, z, 0.34, 0.8, 0.34, 0x3a3e66));
    out.push(B(x, 0.9, z, 0.37, 0.07, 0.37, CYAN));
    out.push(B(x, 1.28, z, 0.37, 0.07, 0.37, PINK));
    out.push(B(x, 1.4, z, 0.2, 0.2, 0.2, 0x4a4f80));
  }

  function rocket(out, x, z) {       // a rocket waiting on its pad (tall: Jump can't clear it)
    var fin = choice([RED, 0x4f8bff, 0xffb02e]);
    out.push(B(x, 0.04, z, 0.64, 0.08, 0.64, PANEL));
    out.push(B(x, 0.12, z, 0.2, 0.1, 0.2, 0x2b2f4d));
    out.push(B(x, 0.68, z, 0.34, 1.1, 0.34, 0xf2f4fb));
    out.push(B(x, 0.5, z, 0.37, 0.09, 0.37, fin));
    out.push(B(x, 0.98, z, 0.37, 0.07, 0.37, fin));
    out.push(B(x, 1.34, z, 0.26, 0.24, 0.26, fin));
    out.push(B(x, 1.52, z, 0.14, 0.14, 0.14, fin));
    out.push(B(x, 0.8, z + 0.175, 0.15, 0.15, 0.02, GLASS));
    out.push(B(x, 0.8, z + 0.185, 0.19, 0.19, 0.01, 0xdfe6f5));
    out.push(B(x + 0.25, 0.3, z, 0.16, 0.32, 0.08, fin));
    out.push(B(x - 0.25, 0.3, z, 0.16, 0.32, 0.08, fin));
    out.push(B(x, 0.3, z + 0.25, 0.08, 0.32, 0.16, fin));
    out.push(B(x, 0.3, z - 0.25, 0.08, 0.32, 0.16, fin));
  }

  function moonRock(out, x, z) {
    var base = choice([0x8f8fb0, 0x8584a8, 0x9b9abb]);
    out.push(B(x, 0.17, z, 0.7, 0.34, 0.64, base));
    out.push(B(x + 0.08, 0.42, z - 0.04, 0.42, 0.24, 0.4, shade(base, 0.14)));
    out.push(B(x - 0.1, 0.355, z + 0.1, 0.26, 0.02, 0.22, shade(base, -0.22)));
    if (Math.random() < 0.5) out.push(B(x - 0.28, 0.1, z + 0.3, 0.2, 0.2, 0.2, shade(base, -0.1)));
  }

  function meteorite(out, x, z) {    // a smouldering meteorite with lava cracks
    out.push(B(x, 0.2, z, 0.62, 0.4, 0.56, 0x4a4663));
    out.push(B(x - 0.06, 0.46, z, 0.34, 0.14, 0.3, 0x5a557a));
    out.push(B(x, 0.41, z, 0.42, 0.02, 0.05, ORANGE));
    out.push(B(x + 0.1, 0.3, z + 0.285, 0.05, 0.22, 0.02, ORANGE));
    out.push(B(x - 0.2, 0.25, z + 0.285, 0.04, 0.16, 0.02, 0xffc233));
    out.push(B(x + 0.31, 0.28, z - 0.1, 0.02, 0.18, 0.05, ORANGE));
  }

  function dome(out, x, z) {         // bush: a tiny habitat dome with plants inside (low)
    out.push(B(x, 0.08, z, 0.8, 0.16, 0.8, PANEL));
    out.push(B(x, 0.16, z + 0.405, 0.8, 0.04, 0.01, CYAN));
    out.push(B(x, 0.36, z, 0.66, 0.36, 0.66, 0xa9efff));
    out.push(B(x, 0.58, z, 0.46, 0.08, 0.46, 0xcaf6ff));
    out.push(B(x - 0.08, 0.3, z, 0.18, 0.28, 0.18, GREEN));
    out.push(B(x + 0.14, 0.26, z + 0.08, 0.14, 0.2, 0.14, PINK));
    out.push(B(x + 0.02, 0.46, z - 0.1, 0.12, 0.1, 0.12, 0xffe14d));
  }

  function crate(out, x, z) {        // hay bale: a supply crate
    out.push(B(x, 0.28, z, 0.82, 0.56, 0.7, 0xc9ced9));
    out.push(B(x, 0.28, z + 0.352, 0.82, 0.12, 0.02, 0xffc233));
    out.push(B(x, 0.28, z - 0.352, 0.82, 0.12, 0.02, 0xffc233));
    out.push(B(x - 0.26, 0.28, z, 0.07, 0.58, 0.72, PANEL));
    out.push(B(x + 0.26, 0.28, z, 0.07, 0.58, 0.72, PANEL));
    if (Math.random() < 0.5) out.push(B(x + 0.05, 0.7, z, 0.6, 0.3, 0.5, 0xaab2c6));
  }

  function laserFence(out, x, z) {
    out.push(B(x - 0.42, 0.28, z, 0.1, 0.56, 0.1, 0x59607f));
    out.push(B(x + 0.42, 0.28, z, 0.1, 0.56, 0.1, 0x59607f));
    out.push(B(x - 0.42, 0.58, z, 0.12, 0.06, 0.12, CYAN));
    out.push(B(x + 0.42, 0.58, z, 0.12, 0.06, 0.12, CYAN));
    out.push(B(x, 0.26, z, 0.74, 0.04, 0.04, 0x7df3ff));
    out.push(B(x, 0.42, z, 0.74, 0.04, 0.04, 0x7df3ff));
  }

  function astronaut(out, x, z) {    // scarecrow: a stranded astronaut waving beside a flag (tall)
    var W = 0xf4f6fb;
    out.push(B(x - 0.09, 0.14, z, 0.12, 0.28, 0.14, W));
    out.push(B(x + 0.09, 0.14, z, 0.12, 0.28, 0.14, W));
    out.push(B(x - 0.09, 0.03, z + 0.02, 0.14, 0.06, 0.2, 0x59607f));
    out.push(B(x + 0.09, 0.03, z + 0.02, 0.14, 0.06, 0.2, 0x59607f));
    out.push(B(x, 0.5, z, 0.34, 0.4, 0.24, W));
    out.push(B(x, 0.54, z + 0.125, 0.16, 0.12, 0.02, 0x4f8bff));
    out.push(B(x, 0.46, z + 0.125, 0.1, 0.05, 0.02, RED));
    out.push(B(x, 0.52, z - 0.17, 0.26, 0.32, 0.12, 0xaab2c6));
    out.push(B(x - 0.23, 0.46, z, 0.1, 0.3, 0.12, W));
    out.push(B(x + 0.25, 0.72, z, 0.1, 0.34, 0.12, W));                 // raised hand
    out.push(B(x, 0.92, z, 0.36, 0.32, 0.32, W));
    out.push(B(x, 0.92, z + 0.17, 0.28, 0.22, 0.02, 0xffb02e));
    out.push(B(x - 0.34, 0.62, z - 0.12, 0.03, 1.24, 0.03, 0xaab2c6));  // flag
    out.push(B(x - 0.2, 1.12, z - 0.12, 0.28, 0.18, 0.02, RED));
    out.push(B(x - 0.2, 1.12, z - 0.12, 0.1, 0.1, 0.025, 0xffffff));
  }

  function reactor(out, x, z) {
    out.push(B(x, 0.18, z, 0.5, 0.36, 0.5, PANEL));
    out.push(B(x, 0.375, z, 0.4, 0.03, 0.4, ORANGE));
    out.push(B(x, 0.33, z, 0.52, 0.05, 0.52, 0x3d4260));
    out.push(B(x + 0.22, 0.12, z, 0.1, 0.2, 0.3, CYAN));
  }

  function canisters(out, x, z) {
    out.push(B(x - 0.2, 0.3, z, 0.4, 0.6, 0.4, 0xe9edf7));
    out.push(B(x - 0.2, 0.18, z, 0.42, 0.06, 0.42, PANEL));
    out.push(B(x - 0.2, 0.44, z, 0.42, 0.06, 0.42, RED));
    out.push(B(x + 0.22, 0.25, z + 0.08, 0.36, 0.5, 0.36, 0x6f8cff));
    out.push(B(x + 0.22, 0.52, z + 0.08, 0.12, 0.06, 0.12, 0xdde3f5));
  }

  function solar(out, x, z) {        // sunflower: a solar panel array that tracks the sun (tall)
    out.push(B(x, 0.4, z, 0.06, 0.8, 0.06, 0xaab2c6));
    out.push(B(x, 0.9, z - 0.02, 0.5, 0.4, 0.06, 0x2a3f8f));
    out.push(B(x, 0.9, z - 0.055, 0.5, 0.02, 0.01, 0x7fa0ff));
    out.push(B(x, 0.9, z - 0.055, 0.02, 0.4, 0.01, 0x7fa0ff));
    out.push(B(x, 0.9, z - 0.055, 0.1, 0.1, 0.01, 0xffd23f));
  }

  function alien(out, x, z) {        // mushroom: a little green alien waiting around (low)
    out.push(B(x, 0.18, z, 0.4, 0.36, 0.34, 0x6ee06a));
    out.push(B(x, 0.42, z, 0.3, 0.14, 0.28, 0x8ff08a));
    out.push(B(x - 0.09, 0.34, z + 0.175, 0.1, 0.12, 0.02, 0xffffff));
    out.push(B(x + 0.09, 0.34, z + 0.175, 0.1, 0.12, 0.02, 0xffffff));
    out.push(B(x - 0.09, 0.34, z + 0.19, 0.04, 0.06, 0.01, 0x111111));
    out.push(B(x + 0.09, 0.34, z + 0.19, 0.04, 0.06, 0.01, 0x111111));
    out.push(B(x, 0.2, z + 0.175, 0.12, 0.03, 0.02, 0x2b5a2b));
    out.push(B(x - 0.1, 0.58, z, 0.03, 0.18, 0.03, 0x6ee06a));
    out.push(B(x + 0.1, 0.58, z, 0.03, 0.18, 0.03, 0x6ee06a));
    out.push(B(x - 0.1, 0.69, z, 0.07, 0.07, 0.07, PINK));
    out.push(B(x + 0.1, 0.69, z, 0.07, 0.07, 0.07, 0xffe14d));
    out.push(B(x - 0.25, 0.2, z, 0.1, 0.06, 0.08, 0x6ee06a));
    out.push(B(x + 0.25, 0.2, z, 0.1, 0.06, 0.08, 0x6ee06a));
  }

  var OBSTACLES = {
    tree: function (out, x, z) {
      var r = Math.random();
      if (r < 0.36) rocket(out, x, z); else if (r < 0.8) crystal(out, x, z, ri(0, 2)); else obelisk(out, x, z);
    },
    rock: function (out, x, z) { if (Math.random() < 0.5) meteorite(out, x, z); else moonRock(out, x, z); },
    bush: dome, hay: crate, fence: laserFence, scarecrow: astronaut,
    stump: reactor, barrels: canisters, sunflower: solar, mushroom: alien
  };

  // the border outside the playable strip: rockets, crystals and monoliths
  function border(out, x, z, kind) {
    if (kind === 3) obelisk(out, x, z);
    else if (kind === 2 && Math.random() < 0.5) rocket(out, x, z);
    else crystal(out, x, z, kind === 0 ? 0 : kind);
  }
  function starBloom(out, x, z) {
    var c = choice([0x7df3ff, 0xffa6e8, 0xe3dbff, 0xfff1a8]);
    var ox = rr(-0.3, 0.3), oz = rr(-0.3, 0.3);
    out.push(B(x + ox, 0.04, z + oz, 0.05, 0.08, 0.05, 0x59607f));
    out.push(B(x + ox, 0.11, z + oz, 0.1, 0.07, 0.1, c));
  }

  // ==================================================================== spaceships
  // They face +x and hover; a real engine flame trails behind each one.
  function flame(o, x, y, z, s) {
    s = s || 1;
    o.push(B(x - 0.08 * s, y, z, 0.2 * s, 0.12 * s, 0.12 * s, 0xfff1a8));
    o.push(B(x - 0.24 * s, y, z, 0.2 * s, 0.09 * s, 0.09 * s, 0xffa63d));
    o.push(B(x - 0.38 * s, y, z, 0.14 * s, 0.06 * s, 0.06 * s, 0xff5a2d));
  }
  function engine(o, x, y, z, r, s) {
    o.push(B(x, y, z, 0.2, r, r, 0x2b2f4d));
    o.push(B(x - 0.11, y, z, 0.05, r * 0.82, r * 0.82, 0x6a728f));
    flame(o, x - 0.14, y, z, s);
  }
  function canopy(o, x, y, w, d) {
    o.push(B(x, y, 0, w, 0.13, d, GLASS));
    o.push(B(x + 0.03, y + 0.07, 0, w * 0.7, 0.04, d * 0.7, 0xd8fbff));
  }
  function navLights(o, x, y, z) {
    o.push(B(x, y, z, 0.05, 0.05, 0.05, RED));
    o.push(B(x, y, -z, 0.05, 0.05, 0.05, 0x45ff8a));
  }
  function glowStrip(o, len, y) { o.push(B(0, y, 0, len, 0.03, 0.2, CYAN)); }
  function swept(o, x, y, z, chord, span, c) {   // a swept-back wing pair
    o.push(BR(x, y, z, chord, 0.05, span, c, -0.5));
    o.push(BR(x, y, -z, chord, 0.05, span, c, 0.5));
  }

  var V = {};
  V.sedan = { len: 1.25, build: function (c) {          // star fighter
    var o = [];
    glowStrip(o, 0.7, 0.26);
    o.push(B(-0.05, 0.42, 0, 0.95, 0.2, 0.36, c));
    o.push(B(0.55, 0.42, 0, 0.34, 0.14, 0.26, shade(c, 0.1)));
    o.push(B(0.78, 0.42, 0, 0.14, 0.08, 0.14, 0xe9edf7));
    canopy(o, 0.1, 0.56, 0.36, 0.24);
    swept(o, -0.2, 0.4, 0.3, 0.5, 0.5, shade(c, -0.15));
    o.push(B(-0.46, 0.62, 0, 0.26, 0.24, 0.04, shade(c, -0.25)));
    engine(o, -0.56, 0.42, 0.12, 0.13, 1); engine(o, -0.56, 0.42, -0.12, 0.13, 1);
    navLights(o, -0.3, 0.45, 0.52);
    return o;
  } };
  V.taxi = { len: 1.25, build: function () {            // yellow taxi shuttle
    var o = [];
    glowStrip(o, 0.8, 0.26);
    o.push(B(0, 0.44, 0, 1.1, 0.28, 0.52, 0xffd23f));
    o.push(B(-0.05, 0.64, 0, 0.8, 0.14, 0.42, 0xffe27a));
    o.push(B(0.58, 0.42, 0, 0.12, 0.2, 0.4, 0xffd23f));
    o.push(B(0.2, 0.66, 0.215, 0.4, 0.1, 0.02, GLASS));
    o.push(B(0.2, 0.66, -0.215, 0.4, 0.1, 0.02, GLASS));
    o.push(B(0.46, 0.62, 0, 0.06, 0.12, 0.36, GLASS));
    o.push(B(0, 0.42, 0.265, 0.9, 0.05, 0.02, 0x222222));
    o.push(B(0, 0.42, -0.265, 0.9, 0.05, 0.02, 0x222222));
    o.push(B(-0.05, 0.76, 0, 0.22, 0.08, 0.2, 0xffffff));
    swept(o, -0.25, 0.36, 0.34, 0.4, 0.3, 0xe8b820);
    engine(o, -0.6, 0.44, 0.15, 0.14, 1); engine(o, -0.6, 0.44, -0.15, 0.14, 1);
    return o;
  } };
  V.police = { len: 1.3, build: function () {           // patrol cruiser
    var o = [];
    glowStrip(o, 0.8, 0.26);
    o.push(B(-0.02, 0.42, 0, 1.0, 0.22, 0.4, 0x23283f));
    o.push(B(0.6, 0.42, 0, 0.3, 0.14, 0.28, 0x2f3552));
    o.push(B(0, 0.42, 0.205, 0.8, 0.06, 0.02, 0xf4f4f4));
    o.push(B(0, 0.42, -0.205, 0.8, 0.06, 0.02, 0xf4f4f4));
    canopy(o, 0.08, 0.56, 0.4, 0.28);
    o.push(B(-0.05, 0.7, 0.1, 0.14, 0.09, 0.14, RED));
    o.push(B(-0.05, 0.7, -0.1, 0.14, 0.09, 0.14, 0x4f8bff));
    swept(o, -0.2, 0.4, 0.3, 0.52, 0.5, 0x2f3552);
    engine(o, -0.58, 0.42, 0.13, 0.14, 1); engine(o, -0.58, 0.42, -0.13, 0.14, 1);
    return o;
  } };
  V.van = { len: 1.6, build: function (c) {             // cargo pod
    var o = [];
    glowStrip(o, 1.0, 0.24);
    o.push(B(0.2, 0.46, 0, 1.1, 0.4, 0.62, c));
    o.push(B(0.2, 0.7, 0, 0.9, 0.1, 0.58, shade(c, 0.2)));
    o.push(B(0.78, 0.5, 0, 0.06, 0.22, 0.5, GLASS));
    o.push(B(-0.45, 0.5, 0, 0.7, 0.5, 0.72, shade(c, -0.12)));          // cargo container
    o.push(B(-0.45, 0.5, 0.365, 0.7, 0.12, 0.02, 0xffc233));
    o.push(B(-0.45, 0.5, -0.365, 0.7, 0.12, 0.02, 0xffc233));
    engine(o, -0.84, 0.5, 0.2, 0.18, 1.1); engine(o, -0.84, 0.5, -0.2, 0.18, 1.1);
    navLights(o, 0.5, 0.74, 0.28);
    return o;
  } };
  V.truck = { len: 3.0, build: function (c) {           // bulk freighter
    var o = [], box = choice([0xe6ecfa, 0x6f8cff, 0xff5a5f, 0xffb02e, 0x45e6a8]);
    glowStrip(o, 2.4, 0.22);
    o.push(B(-0.1, 0.36, 0, 2.6, 0.14, 0.3, STEEL));                    // spine
    o.push(B(1.15, 0.52, 0, 0.7, 0.4, 0.62, c));                        // bridge
    o.push(B(1.15, 0.78, 0, 0.5, 0.12, 0.5, shade(c, 0.2)));
    o.push(B(1.52, 0.56, 0, 0.06, 0.2, 0.5, GLASS));
    o.push(B(1.15, 0.58, 0.32, 0.4, 0.14, 0.02, GLASS));
    o.push(B(1.15, 0.58, -0.32, 0.4, 0.14, 0.02, GLASS));
    for (var i = 0; i < 3; i++) {
      var cx = 0.3 - i * 0.78;
      o.push(B(cx, 0.6, 0, 0.72, 0.5, 0.74, i === 1 ? shade(box, -0.15) : box));
      o.push(B(cx, 0.6, 0.375, 0.72, 0.06, 0.02, 0xffffff));
      o.push(B(cx, 0.6, -0.375, 0.72, 0.06, 0.02, 0xffffff));
      o.push(B(cx, 0.88, 0, 0.74, 0.04, 0.76, shade(box, -0.3)));
    }
    o.push(B(-1.4, 0.5, 0, 0.3, 0.4, 0.5, 0x2b2f4d));
    engine(o, -1.58, 0.56, 0.18, 0.2, 1.4); engine(o, -1.58, 0.56, -0.18, 0.2, 1.4); engine(o, -1.58, 0.36, 0, 0.18, 1.2);
    navLights(o, 1.4, 0.4, 0.32);
    return o;
  } };
  V.bus = { len: 3.2, build: function (c) {             // passenger liner
    var o = [];
    glowStrip(o, 2.6, 0.22);
    o.push(B(-0.15, 0.54, 0, 2.75, 0.5, 0.7, c));
    o.push(B(-0.15, 0.82, 0, 2.7, 0.1, 0.64, shade(c, 0.22)));
    o.push(B(1.4, 0.5, 0, 0.45, 0.4, 0.58, shade(c, 0.1)));             // nose
    o.push(B(1.6, 0.48, 0, 0.08, 0.22, 0.34, shade(c, 0.25)));
    o.push(B(1.15, 0.7, 0, 0.3, 0.16, 0.5, GLASS));
    o.push(B(-0.2, 0.64, 0.355, 2.4, 0.14, 0.02, GLASS));
    o.push(B(-0.2, 0.64, -0.355, 2.4, 0.14, 0.02, GLASS));
    o.push(B(-0.15, 0.44, 0.355, 2.7, 0.06, 0.02, CYAN));
    o.push(B(-0.15, 0.44, -0.355, 2.7, 0.06, 0.02, CYAN));
    o.push(B(-1.1, 1.02, 0, 0.6, 0.3, 0.05, shade(c, -0.25)));          // tail fin
    engine(o, -1.58, 0.6, 0.2, 0.2, 1.4); engine(o, -1.58, 0.6, -0.2, 0.2, 1.4); engine(o, -1.58, 0.4, 0, 0.18, 1.2);
    return o;
  } };
  V.motorbike = { len: 0.95, build: function (c) {      // jet speeder with a space-suited rider
    var o = [];
    o.push(B(0, 0.3, 0, 0.8, 0.12, 0.2, c));
    o.push(B(0.46, 0.32, 0, 0.2, 0.1, 0.14, shade(c, 0.15)));
    o.push(BR(-0.05, 0.34, 0.2, 0.3, 0.04, 0.3, shade(c, -0.1), -0.4));
    o.push(BR(-0.05, 0.34, -0.2, 0.3, 0.04, 0.3, shade(c, -0.1), 0.4));
    o.push(B(0.3, 0.46, 0, 0.06, 0.2, 0.06, 0xaab2c6));
    o.push(B(0.28, 0.58, 0, 0.06, 0.06, 0.4, 0x333a5a));
    o.push(B(-0.1, 0.62, 0, 0.22, 0.3, 0.26, HULL));
    o.push(B(-0.26, 0.64, 0, 0.1, 0.26, 0.22, 0x6a728f));              // jetpack
    o.push(B(-0.08, 0.86, 0, 0.28, 0.26, 0.28, HULL));
    o.push(B(0.05, 0.86, 0, 0.06, 0.15, 0.22, 0xffb02e));
    o.push(B(0.1, 0.62, 0.16, 0.3, 0.07, 0.07, HULL));
    o.push(B(0.1, 0.62, -0.16, 0.3, 0.07, 0.07, HULL));
    engine(o, -0.42, 0.3, 0, 0.14, 0.9);
    return o;
  } };
  V.tractor = { len: 1.9, build: function (c) {         // asteroid miner with a drill
    var o = [];
    glowStrip(o, 1.2, 0.22);
    o.push(B(-0.05, 0.5, 0, 1.3, 0.46, 0.72, c));
    o.push(B(-0.35, 0.88, 0, 0.6, 0.38, 0.56, shade(c, 0.1)));
    o.push(B(-0.3, 0.9, 0, 0.64, 0.24, 0.6, GLASS));
    o.push(B(-0.35, 1.1, 0, 0.7, 0.06, 0.64, shade(c, -0.25)));
    o.push(B(0.78, 0.48, 0, 0.3, 0.36, 0.36, 0xaab2c6));                // drill
    o.push(B(0.98, 0.48, 0, 0.24, 0.24, 0.24, 0xdfe6f5));
    o.push(B(1.12, 0.48, 0, 0.14, 0.12, 0.12, ORANGE));
    o.push(B(0.55, 0.28, 0.4, 0.5, 0.1, 0.1, 0xffb02e));                // claw arms
    o.push(B(0.55, 0.28, -0.4, 0.5, 0.1, 0.1, 0xffb02e));
    o.push(B(0.82, 0.28, 0.4, 0.1, 0.18, 0.1, 0xaab2c6));
    o.push(B(0.82, 0.28, -0.4, 0.1, 0.18, 0.1, 0xaab2c6));
    o.push(B(0.3, 0.22, 0.3, 0.3, 0.1, 0.2, CYAN));
    o.push(B(0.3, 0.22, -0.3, 0.3, 0.1, 0.2, CYAN));
    engine(o, -0.74, 0.5, 0.18, 0.2, 1.2); engine(o, -0.74, 0.5, -0.18, 0.2, 1.2);
    return o;
  } };
  V.ambulance = { len: 1.7, build: function () {        // medical frigate
    var o = [];
    glowStrip(o, 1.1, 0.24);
    o.push(B(-0.05, 0.48, 0, 1.45, 0.42, 0.7, 0xffffff));
    o.push(B(0.88, 0.46, 0, 0.3, 0.3, 0.5, 0xf0f0f0));
    o.push(B(0.7, 0.62, 0, 0.3, 0.14, 0.52, GLASS));
    [-1, 1].forEach(function (sz) {
      o.push(B(-0.25, 0.5, sz * 0.355, 0.34, 0.1, 0.02, RED));
      o.push(B(-0.25, 0.5, sz * 0.355, 0.1, 0.34, 0.02, RED));
      o.push(B(0.2, 0.42, sz * 0.355, 0.8, 0.05, 0.02, RED));
    });
    o.push(B(0.2, 0.78, 0.16, 0.2, 0.1, 0.2, RED));
    o.push(B(0.2, 0.78, -0.16, 0.2, 0.1, 0.2, 0x4f8bff));
    swept(o, -0.35, 0.4, 0.3, 0.4, 0.4, 0xe0e4f0);
    engine(o, -0.8, 0.48, 0.18, 0.18, 1.1); engine(o, -0.8, 0.48, -0.18, 0.18, 1.1);
    return o;
  } };
  V.icecream = { len: 1.8, build: function () {         // a flying saucer selling space ice cream
    var o = [], pale = choice([0xffc1d9, 0x9ad7ff, 0xfff1b0]);
    o.push(B(0, 0.28, 0, 0.7, 0.1, 0.46, CYAN));                        // under glow
    o.push(B(0, 0.36, 0, 0.9, 0.12, 0.6, 0x59607f));
    o.push(B(0, 0.46, 0, 1.5, 0.1, 0.84, pale));
    o.push(B(0, 0.54, 0, 1.2, 0.08, 0.7, shade(pale, 0.2)));
    o.push(B(0, 0.62, 0, 0.7, 0.08, 0.5, GLASS));
    var lc = [RED, 0xffe14d, 0x45e6a8, 0x4f8bff];
    for (var i = 0; i < 7; i++) {                                        // rim lights
      var px = -0.66 + i * 0.22;
      o.push(B(px, 0.46, 0.43, 0.07, 0.07, 0.03, lc[i % 4]));
      o.push(B(px, 0.46, -0.43, 0.07, 0.07, 0.03, lc[(i + 2) % 4]));
    }
    o.push(B(0.78, 0.46, 0, 0.04, 0.07, 0.3, lc[1]));
    o.push(B(-0.78, 0.46, 0, 0.04, 0.07, 0.3, lc[0]));
    o.push(B(0, 0.72, 0, 0.16, 0.14, 0.16, 0xe0b070));                 // ice-cream cone in the dome
    o.push(B(0, 0.84, 0, 0.26, 0.14, 0.26, 0xff9ec4));
    o.push(B(0, 0.95, 0, 0.1, 0.1, 0.1, RED));
    o.push(B(0, 0.6, 0.255, 0.4, 0.05, 0.02, 0xffffff));
    return o;
  } };
  V.sports = { len: 1.35, build: function (c) {         // racing craft
    var o = [];
    glowStrip(o, 0.8, 0.24);
    o.push(B(0, 0.38, 0, 1.2, 0.14, 0.34, c));
    o.push(B(0.7, 0.37, 0, 0.3, 0.08, 0.2, shade(c, 0.12)));
    o.push(B(-0.05, 0.5, 0, 0.36, 0.12, 0.22, GLASS));
    o.push(B(-0.1, 0.36, 0.3, 0.7, 0.12, 0.14, shade(c, -0.15)));
    o.push(B(-0.1, 0.36, -0.3, 0.7, 0.12, 0.14, shade(c, -0.15)));
    o.push(B(-0.55, 0.62, 0, 0.12, 0.04, 0.8, DARKP));                 // rear wing
    o.push(B(-0.55, 0.52, 0.38, 0.12, 0.2, 0.03, DARKP));
    o.push(B(-0.55, 0.52, -0.38, 0.12, 0.2, 0.03, DARKP));
    o.push(B(0.1, 0.455, 0, 0.9, 0.02, 0.1, 0xffffff));
    engine(o, -0.66, 0.4, 0, 0.2, 1.3);
    return o;
  } };

  var SHIP_COLORS = [0xff2bd6, 0x00e5ff, 0x39ff88, 0xffd60a, 0xa24dff, 0xff6a00, 0x3d7bff];

  // ===================================================================== floaters
  // Rivers are empty space: you cross on destroyed asteroids. Irregular,
  // jagged and cracked, but with a flat top to stand on.
  function asteroidBoxes(length) {
    var o = [];
    var base = choice([0x77759c, 0x6d6c92, 0x82809f, 0x6a6488]);
    o.push(B(0, 0, 0, length - 0.1, 0.34, 0.7, base));
    o.push(B(0, 0.175, 0, length * 0.86, 0.02, 0.46, shade(base, 0.2)));
    var n = Math.floor(length * 2), i;
    for (i = 0; i < n; i++) {                                           // ragged rim chunks
      var x = -length / 2 + (i + 0.5) * (length / n);
      var side = i % 2 ? 1 : -1;
      o.push(B(x, rr(-0.06, 0.04), side * rr(0.34, 0.44), rr(0.3, 0.55), rr(0.22, 0.34), rr(0.16, 0.3), shade(base, rr(-0.18, 0.1))));
    }
    o.push(B(length / 2 - 0.05, -0.02, rr(-0.1, 0.1), 0.24, 0.28, 0.52, shade(base, -0.1)));
    o.push(B(-length / 2 + 0.05, 0.0, rr(-0.1, 0.1), 0.24, 0.3, 0.56, shade(base, -0.05)));
    o.push(B(rr(-0.4, 0.4), -0.3, rr(-0.1, 0.1), rr(0.6, 1.0), 0.3, 0.44, shade(base, -0.4)));   // broken underside
    o.push(B(rr(-0.6, 0.6), -0.4, rr(-0.1, 0.1), 0.34, 0.24, 0.3, shade(base, -0.5)));
    for (i = 0; i < Math.floor(length); i++) {                          // craters
      o.push(B(-length / 2 + 0.45 + i * (length / Math.floor(length)) * 0.9, 0.185, rr(-0.14, 0.14), rr(0.18, 0.28), 0.02, rr(0.14, 0.22), shade(base, -0.32)));
    }
    var cx = rr(-length / 2 + 0.5, length / 2 - 0.5);                   // glowing crack and ore
    o.push(B(cx, 0.186, 0, 0.04, 0.014, 0.5, ORANGE));
    o.push(B(cx + 0.06, 0.186, 0.1, 0.16, 0.014, 0.04, 0xffc233));
    o.push(B(-length / 2 + 0.35, 0.28, 0.3, 0.1, 0.18, 0.1, VIOLET));
    o.push(B(-length / 2 + 0.35, 0.4, 0.3, 0.05, 0.08, 0.05, 0xe3dbff));
    o.push(B(length / 2 - 0.4, 0.26, -0.3, 0.12, 0.14, 0.1, shade(base, 0.25)));
    return o;
  }

  // a single drifting rock for a one-tile step
  function rockPad() {
    return H.cachedMesh('padrock:' + ri(0, 3), function () {
      var o = [], base = choice([0x77759c, 0x6d6c92, 0x82809f]);
      o.push(B(0, 0, 0, 0.86, 0.07, 0.78, base));
      o.push(B(0, 0.04, 0, 0.7, 0.02, 0.62, shade(base, 0.2)));
      o.push(B(rr(-0.1, 0.1), -0.12, 0, 0.6, 0.2, 0.5, shade(base, -0.35)));
      o.push(B(rr(-0.2, 0.2), -0.26, 0, 0.3, 0.16, 0.3, shade(base, -0.5)));
      o.push(B(0.36, -0.02, 0.2, 0.2, 0.12, 0.2, shade(base, -0.1)));
      o.push(B(-0.34, -0.02, -0.22, 0.22, 0.12, 0.18, shade(base, -0.15)));
      o.push(B(0.0, 0.05, 0.1, 0.03, 0.01, 0.3, ORANGE));
      return o;
    });
  }
  function rockPadMesh(withGem) {
    var m = rockPad();
    m.rotation.y = rr(0, Math.PI);
    if (withGem) {
      var g = Utils.voxelMesh([B(0.1, 0.16, -0.06, 0.12, 0.2, 0.12, PINK), B(0.1, 0.3, -0.06, 0.06, 0.1, 0.06, 0xffd0f4)], { material: neonMaterial() });
      m.add(g);
    }
    return m;
  }

  // "turtles": satellites that power down (they shake, then go dark and drop away)
  function satellites(n) {
    var o = [];
    for (var i = 0; i < n; i++) {
      var x = (i - (n - 1) / 2) * 1.05;
      o.push(B(x, 0.0, 0, 0.88, 0.2, 0.74, 0x59607f));                  // deck
      o.push(B(x, 0.115, 0, 0.8, 0.03, 0.66, 0x24357f));                // solar skin
      o.push(B(x, 0.133, 0, 0.8, 0.008, 0.02, 0x7fa0ff));
      o.push(B(x - 0.26, 0.133, 0, 0.02, 0.008, 0.66, 0x7fa0ff));
      o.push(B(x + 0.26, 0.133, 0, 0.02, 0.008, 0.66, 0x7fa0ff));
      o.push(B(x, -0.14, 0, 0.5, 0.18, 0.46, 0x3a3f5c));                // body underneath
      o.push(B(x + 0.5, 0.0, 0, 0.18, 0.1, 0.1, 0xaab2c6));             // antenna boom
      o.push(B(x + 0.62, 0.05, 0, 0.1, 0.1, 0.1, 0xdfe6f5));
      o.push(B(x - 0.38, 0.17, 0.28, 0.07, 0.07, 0.07, RED));           // status lights
      o.push(B(x - 0.38, 0.17, -0.28, 0.07, 0.07, 0.07, 0x45ff8a));
      o.push(B(x - 0.5, -0.04, 0, 0.14, 0.12, 0.3, 0x6a728f));
    }
    return o;
  }

  // ===================================================================== comets
  // There are no railways in space: a blazing comet streaks across the lane instead.
  // Same rules as a train (warning first, then it crosses fast and hits anything in
  // its path); its length is made of segments just like train cars.
  function cometHead() {
    var o = [];
    o.push(B(0.12, 0.5, 0, 1.1, 0.8, 0.8, 0x5a4a46));            // rocky nucleus
    o.push(B(0.35, 0.78, 0.08, 0.7, 0.5, 0.66, 0x7a625a));
    o.push(B(0.7, 0.42, -0.08, 0.5, 0.5, 0.64, 0x4a3c3a));
    o.push(B(0.5, 0.96, 0.1, 0.34, 0.06, 0.3, 0xcdeffa));        // ice patch
    o.push(B(0.78, 0.7, 0.2, 0.1, 0.34, 0.24, 0xcdeffa));
    o.push(B(-0.5, 0.52, 0, 0.7, 0.72, 0.84, 0xff6a2d));          // burning rear half
    o.push(B(-0.78, 0.52, 0, 0.4, 0.55, 0.7, 0xffb02e));
    o.push(B(-0.45, 0.9, 0.12, 0.34, 0.2, 0.3, 0xffd23f));
    o.push(B(0.1, 0.3, 0.405, 0.6, 0.05, 0.02, 0xff8a3d));        // lava cracks
    o.push(B(0.2, 0.6, -0.405, 0.5, 0.04, 0.02, 0xff8a3d));
    return o;
  }
  var FIRE = [0xff8a3d, 0xff6a2d, 0xffb02e, 0xff3b6b];
  function cometTail(c) {            // a ragged tongue of fire, not a solid car
    var o = [];
    o.push(B(0, 0.42, 0, 1.64, 0.36, 0.5, c));
    o.push(B(0, 0.42, 0, 1.66, 0.18, 0.3, Utils.shade(c, 0.5)));
    for (var i = 0; i < 7; i++) {
      var x = -0.72 + i * 0.24 + rr(-0.05, 0.05);
      var h = rr(0.2, 0.62), side = i % 2 ? 1 : -1;
      o.push(B(x, 0.42 + h / 2 + 0.1, side * rr(0.0, 0.18), rr(0.2, 0.34), h, rr(0.22, 0.34), Utils.shade(c, rr(-0.1, 0.35))));
    }
    o.push(B(rr(-0.5, 0.5), 0.16, rr(-0.2, 0.2), 0.3, 0.14, 0.3, Utils.shade(c, -0.25)));
    o.push(B(-0.55, 0.9, 0.0, 0.14, 0.14, 0.14, 0xfff3b0));      // flying embers
    o.push(B(0.35, 1.0, 0.1, 0.1, 0.1, 0.1, 0xfff3b0));
    return o;
  }

  // a warning beacon pylon (replaces the railway signal)
  // ===================================================================== laser strike
  // The "crocodile" of space: a marked patch on an asteroid that charges up and gets
  // hit by an orbital laser. Only dangerous while the beam is firing.
  function laserAsteroid(length) {
    var g = new THREE.Group();
    var L = length, headLen = Models.CROC_HEAD;
    g.add(Utils.voxelMesh(asteroidBoxes(L), { material: neonMaterial() }));
    var hx = L / 2 - headLen / 2;
    g.add(Utils.voxelMesh([
      B(hx, 0.19, 0, headLen - 0.04, 0.025, 0.64, 0x3a1018),       // scorched target zone
      B(hx, 0.2, 0, headLen - 0.3, 0.012, 0.36, 0x5a1a22),
      B(hx + 0.46, 0.36, 0.26, 0.07, 0.34, 0.07, STEEL),            // emitter masts
      B(hx + 0.46, 0.56, 0.26, 0.11, 0.08, 0.11, RED),
      B(hx - 0.46, 0.36, -0.26, 0.07, 0.34, 0.07, STEEL),
      B(hx - 0.46, 0.56, -0.26, 0.11, 0.08, 0.11, RED)
    ], { material: neonMaterial() }));
    var ring = new THREE.Mesh(new THREE.BoxGeometry(headLen - 0.08, 0.03, 0.68),
      new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.2, depthWrite: false }));
    ring.position.set(hx, 0.215, 0);
    ring.renderOrder = 2;
    g.add(ring);
    var beam = new THREE.Mesh(new THREE.BoxGeometry(headLen - 0.1, 6, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xaaf6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    beam.position.set(hx, 3.2, 0);
    beam.renderOrder = 3;
    beam.visible = false;
    g.add(beam);
    var core = new THREE.Mesh(new THREE.BoxGeometry(0.34, 6, 0.24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    core.position.set(hx, 3.2, 0);
    core.renderOrder = 4;
    core.visible = false;
    g.add(core);
    // open: 0 idle, ~0.4 charging (warning), 1 firing
    function fx(open) {
      var firing = open > 0.62;
      ring.material.opacity = 0.2 + open * 0.55 + (open > 0.05 && open < 0.62 ? Math.sin(performance.now() * 0.03) * 0.15 : 0);
      beam.visible = core.visible = open > 0.3;
      beam.material.opacity = firing ? 0.55 : Math.max(0, (open - 0.3) * 0.8);
      core.material.opacity = firing ? 0.9 : 0;
    }
    function onFire(vol) { SpaceAudio.laserFire(vol); }
    function onKill(p) {                       // the orbital laser vaporises the chicken
      SpaceAudio.zap();
      Particles.burst(p.x, p.y + 0.5, p.z, { colors: [0xffffff, 0x9ff6ff, 0x00e5ff, 0xff2bd6], count: 22, speed: 3.5, up: 5, size: 0.12, life: 0.7, gravity: 6, spread: 0.3 });
    }
    return { group: g, jaw: new THREE.Group(), fx: fx, onFire: onFire, onKill: onKill, length: L, headLen: headLen };
  }

  // ===================================================================== UFO (eagle)
  function buildUfo() {
    var g = new THREE.Group();
    var o = [
      B(0, -0.1, 0, 0.8, 0.14, 0.8, 0x59607f),
      B(0, 0.0, 0, 1.6, 0.14, 1.6, 0xb8c0d8),
      B(0, 0.12, 0, 1.3, 0.12, 1.3, 0xdfe6f5),
      BR(0, 0.0, 0, 1.6, 0.14, 1.6, 0xb8c0d8, 0.785),           // rotated copies make the disc octagonal
      BR(0, 0.12, 0, 1.3, 0.12, 1.3, 0xdfe6f5, 0.785),
      B(0, 0.06, 0, 1.64, 0.04, 1.64, CYAN),                    // neon belt
      BR(0, 0.06, 0, 1.64, 0.04, 1.64, PINK, 0.785),
      B(0, 0.22, 0, 0.8, 0.1, 0.8, 0xaab2c6),
      B(0, 0.34, 0, 0.6, 0.16, 0.6, 0x8fefff),                   // dome
      B(0, 0.44, 0, 0.36, 0.08, 0.36, 0xd8fbff),
      B(0, 0.34, 0, 0.18, 0.16, 0.18, 0x6ee06a),                 // alien pilot
      B(0, 0.34, 0.095, 0.12, 0.05, 0.02, 0x111111)
    ];
    var lc = [RED, 0xffe14d, GREEN, 0x4f8bff];
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2;
      o.push(B(Math.cos(a) * 0.72, 0.03, Math.sin(a) * 0.72, 0.1, 0.1, 0.1, lc[i % 4]));
    }
    g.add(Utils.voxelMesh(o, { material: neonMaterial() }));
    var geo = new THREE.CylinderGeometry(0.28, 0.85, 1, 20, 1, true);
    geo.translate(0, -0.5, 0);
    var beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x9ff6ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false
    }));
    beam.position.y = -0.12;
    beam.visible = false;
    beam.renderOrder = 3;
    g.add(beam);
    return { group: g, beam: beam };
  }

  // ===================================================================== neon
  // Props use this material: like the normal voxel material, but bright, saturated
  // colours (cyan, magenta, lime, orange...) are self-lit, so they glow like neon
  // tubes against the dark world whatever the lighting. uNeon pulses the glow.
  var neonU = { value: 1 };
  var _neonMat = null;
  function neonMaterial() {
    if (!_neonMat) {
      _neonMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      _neonMat.onBeforeCompile = function (shader) {
        shader.uniforms.uNeon = neonU;
        shader.fragmentShader = 'uniform float uNeon;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n' +
          'float nLum = max(vColor.r, max(vColor.g, vColor.b));\n' +
          'float nSat = nLum - min(vColor.r, min(vColor.g, vColor.b));\n' +
          'totalEmissiveRadiance += vColor * (smoothstep(0.42, 0.8, nLum) * smoothstep(0.22, 0.5, nSat) * 0.7 + 0.03) * uNeon;');
      };
      _neonMat.customProgramCacheKey = function () { return 'neon2'; };
      _neonMat.__shared = true;
    }
    return _neonMat;
  }

  // a soft additive glow ribbon (engine trails, hover pools)
  var _glowTex = null;
  function glowTexture() {
    if (!_glowTex) {
      var cv = document.createElement('canvas');
      cv.width = 128; cv.height = 32;
      var c = cv.getContext('2d');
      var g = c.createLinearGradient(0, 0, 128, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,1)');
      c.fillStyle = g; c.fillRect(0, 0, 128, 32);
      c.globalCompositeOperation = 'destination-in';
      var v = c.createLinearGradient(0, 0, 0, 32);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.5, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = v; c.fillRect(0, 0, 128, 32);
      _glowTex = new THREE.CanvasTexture(cv);
    }
    return _glowTex;
  }
  var _trailGeo = null, _trailMats = {};
  function trailMat(color) {
    if (!_trailGeo) {
      _trailGeo = new THREE.PlaneGeometry(1, 1);
      _trailGeo.__shared = true;
    }
    if (!_trailMats[color]) {
      var m = new THREE.MeshBasicMaterial({ map: glowTexture(), color: color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, opacity: 0.5 });
      m.__shared = true;
      _trailMats[color] = m;
    }
    return _trailMats[color];
  }
  // every ship gets a glowing engine trail behind it and a pool of light on the bridge below
  function decorateShip(mesh, kind, color, len) {
    var mat = trailMat(color);
    var trailLen = 2.2 + len * 0.45;
    var flat = new THREE.Mesh(_trailGeo, mat);
    flat.rotation.x = -Math.PI / 2;
    flat.scale.set(trailLen, 0.42, 1);
    flat.position.set(-len / 2 - trailLen / 2 + 0.1, 0.42, 0);
    flat.renderOrder = 2;
    var tall = new THREE.Mesh(_trailGeo, mat);
    tall.scale.set(trailLen, 0.3, 1);
    tall.position.set(-len / 2 - trailLen / 2 + 0.1, 0.42, 0);
    tall.renderOrder = 2;
    var pool = new THREE.Mesh(_trailGeo, mat);
    pool.rotation.x = -Math.PI / 2;
    pool.scale.set(len * 0.9 + 0.5, 0.6, 1);
    pool.position.set(-0.1, -0.06, 0);       // (the ship hovers ~0.1 above the lane, so this lies on it)
    pool.renderOrder = 1;
    mesh.add(flat); mesh.add(tall); mesh.add(pool);
  }

  // hologram portal: two neon pylons with light beams marking the border
  function neonGate() {
    var g = new THREE.Group();
    [-1, 1].forEach(function (s) {
      var m = Utils.voxelMesh([
        B(0, 0.2, 0, 0.62, 0.4, 0.62, 0x1b1e33),
        B(0, 1.2, 0, 0.36, 1.6, 0.36, 0x2a2e55),
        B(0, 0.5, 0, 0.46, 0.06, 0.46, CYAN),
        B(0, 1.1, 0, 0.46, 0.06, 0.46, PINK),
        B(0, 1.7, 0, 0.46, 0.06, 0.46, CYAN),
        B(0, 2.1, 0, 0.6, 0.18, 0.6, 0x1b1e33),
        B(0, 2.3, 0, 0.26, 0.26, 0.26, PINK)
      ], { material: neonMaterial() });
      m.position.x = s * (CONFIG.PLAY_HALF + 1.6);
      g.add(m);
      var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 7, 10, 1, true), new THREE.MeshBasicMaterial({
        color: s > 0 ? PINK : CYAN, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide
      }));
      beam.position.set(m.position.x, 3.5, 0);
      beam.renderOrder = 3;
      g.add(beam);
    });
    return g;
  }

  // wrecked hull plates: the stepping stones over a black hole
  function hullPlate(width) {
    return H.cachedMesh('plat:space:' + width, function () {
      var o = [];
      o.push(B(0, 0, 0, width, 0.3, 0.78, 0x3d4470));
      o.push(B(0, 0.165, 0, width - 0.1, 0.03, 0.66, 0x5a64a0));
      o.push(B(0, -0.17, 0, width - 0.3, 0.05, 0.5, CYAN));
      o.push(B(0, 0.19, 0, width - 0.3, 0.01, 0.04, 0x7df3ff));
      o.push(B(-width / 2 + 0.2, 0.19, 0.22, 0.12, 0.02, 0.12, PINK));
      o.push(B(width / 2 - 0.2, 0.19, -0.22, 0.12, 0.02, 0.12, PINK));
      o.push(B(width / 2 + 0.01, 0, 0, 0.04, 0.32, 0.8, 0x7480a6));
      o.push(B(-width / 2 - 0.01, 0, 0, 0.04, 0.32, 0.8, 0x7480a6));
      o.push(B(0.1, 0.2, 0.3, 0.3, 0.04, 0.08, ORANGE));            // exposed wiring
      o.push(B(-0.3, -0.02, -0.4, 0.5, 0.16, 0.1, 0x59607f));       // torn edge
      return o;
    }, neonMaterial());
  }

  Models.registerBiome('space', {
    obstacles: OBSTACLES, border: border, flower: starBloom, rock: moonRock, bush: dome,
    vehicles: V, vehicleColors: SHIP_COLORS,
    logBoxes: asteroidBoxes, pad: rockPadMesh, turtleBoxes: satellites,
    locoBoxes: cometHead, carBoxes: cometTail, carColors: FIRE,
    croc: laserAsteroid, material: neonMaterial(), platform: hullPlate, gate: neonGate,
    signalStyle: { base: 0x1b1e33, pole: 0xaab2c6, housing: 0x1b1e33, cap: 0x00e5ff, extra: [B(0, 1.94, 0, 0.05, 0.3, 0.05, 0xaab2c6), B(0, 2.12, 0, 0.12, 0.12, 0.12, 0xff2d55)] },
    decorate: decorateShip,
    warm: function () { return Utils.voxelMesh([B(0, 0.1, 0, 0.1, 0.2, 0.1, CYAN)], { material: neonMaterial() }); }
  });

  return { neonMaterial: neonMaterial, buildUfo: buildUfo, setPulse: function (v) { neonU.value = v; } };
})();
