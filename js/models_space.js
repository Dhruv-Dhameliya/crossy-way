// The Space biome. Not a recolour: every kind of prop becomes something that
// belongs in space, with the same footprint and the same "kind" so the rules
// stay identical (a rocket blocks a tile like a tree, a supply crate can be
// hopped over like a hay bale...):
//   traffic   -> spaceships (fighters, freighters, liners, saucers...)
//   rivers    -> empty space, crossed on broken asteroid chunks and wreckage
//   turtles   -> satellites that power down
//   crocodile -> a void worm
//   obstacles -> rockets, crystals, stranded astronauts, domes, aliens...
// Registered into Models, which picks them by biome.
(function () {
  var H = Models.helpers;
  var B = H.B;
  var shade = H.shade, choice = H.choice, rr = H.randRange, ri = H.randInt;
  var GLASS = 0x8fefff, HULL = 0xe6ecfa, PANEL = 0x7480a6, DARKP = 0x1b1e33, STEEL = 0x3a3f5c;
  var CYAN = 0x4de8ff, VIOLET = 0x8f6bff, PINK = 0xff5fd2, ORANGE = 0xff8a3d, RED = 0xff4f5a, GREEN = 0x45e6a8;

  function BR(x, y, z, w, h, d, c, ry, rx, rz) {
    var b = B(x, y, z, w, h, d, c);
    if (ry) b.ry = ry;
    if (rx) b.rx = rx;
    if (rz) b.rz = rz;
    return b;
  }

  // ===================================================================== scenery
  var CRYSTALS = [[0x7a5cff, 0xb7a3ff, 0xe3dbff], [0x23c9e8, 0x8ef0ff, 0xd4fbff], [0xff5fd2, 0xffa6e8, 0xffe0f6], [0x45e6a8, 0xa4ffd8, 0xe0fff2]];

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
    out.push(B(x, 1.28, z, 0.37, 0.07, 0.37, CYAN));
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

  var SHIP_COLORS = [0xff5a5f, 0x4f8bff, 0x45e6a8, 0xff9f1c, 0xc36bff, 0xf2f2f2, 0xff7ad9];

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
      var g = Utils.voxelMesh([B(0.1, 0.16, -0.06, 0.12, 0.2, 0.12, PINK), B(0.1, 0.3, -0.06, 0.06, 0.1, 0.06, 0xffd0f4)]);
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

  // ===================================================================== trains
  function maglevLoco() {
    var o = [];
    o.push(B(0, 0.26, 0, 1.65, 0.26, 0.9, 0x2a2e4a));
    o.push(B(0, 0.12, 0, 1.5, 0.04, 0.6, CYAN));
    o.push(B(-0.2, 0.74, 0, 1.2, 0.7, 0.92, HULL));
    o.push(B(0.52, 0.62, 0, 0.5, 0.46, 0.86, 0xc9d3ee));
    o.push(B(0.78, 0.52, 0, 0.14, 0.28, 0.7, 0xaab8de));
    o.push(B(-0.2, 1.12, 0, 1.24, 0.08, 0.96, PANEL));
    o.push(B(0.05, 0.86, 0.465, 0.9, 0.3, 0.02, GLASS));
    o.push(B(0.05, 0.86, -0.465, 0.9, 0.3, 0.02, GLASS));
    o.push(B(0.6, 0.78, 0, 0.3, 0.2, 0.7, GLASS));
    o.push(B(-0.2, 0.5, 0.465, 1.2, 0.07, 0.02, CYAN));
    o.push(B(-0.2, 0.5, -0.465, 1.2, 0.07, 0.02, CYAN));
    o.push(B(0.85, 0.5, 0, 0.04, 0.12, 0.26, 0xffffff));
    return o;
  }
  var TRAIN_COLORS = [0x6f8cff, 0x45e6a8, 0xff7ad9, 0xffb02e, 0xb7a3ff];
  function maglevCar(c) {
    var o = [];
    o.push(B(0, 0.24, 0, 1.65, 0.16, 0.8, 0x2a2e4a));
    o.push(B(0, 0.12, 0, 1.5, 0.04, 0.6, CYAN));
    o.push(B(0, 0.7, 0, 1.6, 0.76, 0.92, HULL));
    o.push(B(0, 1.1, 0, 1.64, 0.06, 0.96, PANEL));
    o.push(B(0, 0.5, 0.465, 1.6, 0.12, 0.02, c));
    o.push(B(0, 0.5, -0.465, 1.6, 0.12, 0.02, c));
    for (var i = 0; i < 4; i++) {
      o.push(B(-0.6 + i * 0.4, 0.84, 0.465, 0.26, 0.26, 0.02, GLASS));
      o.push(B(-0.6 + i * 0.4, 0.84, -0.465, 0.26, 0.26, 0.02, GLASS));
    }
    o.push(B(0.85, 0.3, 0, 0.12, 0.08, 0.12, PANEL));
    return o;
  }

  // ===================================================================== void worm
  // The "crocodile" of space: a segmented worm that rides the void. Its head (the
  // front 1.0) is the dangerous part; the lower jaw pivots to bite.
  function voidWorm(length) {
    var g = new THREE.Group();
    var L = length, headLen = Models.CROC_HEAD;
    var o = [], bodyEnd = L / 2 - headLen + 0.1;
    var n = Math.max(3, Math.floor((bodyEnd + L / 2) / 0.42));
    var seg = (bodyEnd + L / 2) / n;
    for (var i = 0; i < n; i++) {                                       // ringed segments
      var x = -L / 2 + (i + 0.5) * seg;
      var t = i / (n - 1);
      var c = i % 2 ? 0x6b4fd8 : 0x5a3fc0;
      var h = 0.3 - 0.08 * (1 - t), w = 0.66 - 0.2 * (1 - t);
      o.push(B(x, 0.0, 0, seg * 0.96, h, w, c));
      o.push(B(x, 0.0, 0, seg * 0.2, h + 0.02, w + 0.03, 0x45e6a8));    // glowing ring
      o.push(B(x, h / 2 + 0.05, 0, 0.1, 0.1, 0.1, 0xb7a3ff));          // dorsal spike
      o.push(B(x, -0.14, 0, seg * 0.8, 0.06, w * 0.7, 0x2f2370));
    }
    o.push(B(-L / 2 - 0.12, -0.02, 0, 0.26, 0.18, 0.26, 0x45e6a8));     // glowing tail tip
    var hx = L / 2 - headLen / 2;
    o.push(B(hx, 0.08, 0, headLen, 0.22, 0.6, 0x6b4fd8));              // upper jaw
    o.push(B(hx + 0.32, 0.06, 0, 0.4, 0.16, 0.44, 0x8260f0));
    o.push(B(hx - 0.2, 0.2, 0.2, 0.1, 0.2, 0.1, 0x8260f0));             // eye stalks
    o.push(B(hx - 0.2, 0.2, -0.2, 0.1, 0.2, 0.1, 0x8260f0));
    o.push(B(hx - 0.2, 0.34, 0.2, 0.14, 0.14, 0.14, CYAN));
    o.push(B(hx - 0.2, 0.34, -0.2, 0.14, 0.14, 0.14, CYAN));
    for (var t2 = 0; t2 < 4; t2++) {
      o.push(B(hx + 0.02 + t2 * 0.14, -0.05, 0.24, 0.06, 0.1, 0.04, 0xffffff));
      o.push(B(hx + 0.02 + t2 * 0.14, -0.05, -0.24, 0.06, 0.1, 0.04, 0xffffff));
    }
    g.add(Utils.voxelMesh(o));
    var jaw = new THREE.Group();
    jaw.position.set(L / 2 - headLen, -0.06, 0);
    var j = [
      B(headLen / 2, -0.04, 0, headLen - 0.02, 0.1, 0.52, 0x3a2f8f),
      B(headLen / 2, 0.02, 0, headLen - 0.1, 0.04, 0.4, PINK),
      B(headLen - 0.04, -0.02, 0, 0.1, 0.1, 0.3, 0x3a2f8f)
    ];
    for (var u = 0; u < 4; u++) {
      j.push(B(0.2 + u * 0.18, 0.08, 0.2, 0.06, 0.1, 0.04, 0xffffff));
      j.push(B(0.2 + u * 0.18, 0.08, -0.2, 0.06, 0.1, 0.04, 0xffffff));
    }
    jaw.add(Utils.voxelMesh(j));
    g.add(jaw);
    return { group: g, jaw: jaw, length: L, headLen: headLen };
  }

  Models.registerBiome('space', {
    obstacles: OBSTACLES, border: border, flower: starBloom, rock: moonRock, bush: dome,
    vehicles: V, vehicleColors: SHIP_COLORS,
    logBoxes: asteroidBoxes, pad: rockPadMesh, turtleBoxes: satellites,
    locoBoxes: maglevLoco, carBoxes: maglevCar, carColors: TRAIN_COLORS,
    croc: voidWorm
  });
})();
