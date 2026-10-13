// Every 3D asset in the game (the one and only Crossy Way world): trees,
// rocks, vehicles, logs, lily pads, trains, signals, the coin and the eagle.
// Static scenery is returned as box lists so a whole grass row can be baked
// into one mesh; moving things come back as ready-to-use meshes.
var Models = (function () {
  var GLASS = 0xbfe8f8;
  var DARK = 0x2b2b30;

  function B(x, y, z, w, h, d, color) {
    return { x: x, y: y, z: z, w: w, h: h, d: d, color: color };
  }

  // Moving props are built from a handful of variants. Each variant's merged
  // geometry is baked once and shared by every instance (saves a geometry
  // merge, and GPU memory, per spawned vehicle / log / train car).
  var geoCache = {};
  function cachedMesh(key, makeBoxes) {
    var g = geoCache[key];
    if (!g) {
      g = Utils.voxelGeometry(makeBoxes());
      g.__shared = true;
      geoCache[key] = g;
    }
    var m = new THREE.Mesh(g, Utils.voxelMaterial());
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Other biomes (space...) register their props here: same kinds, new looks.
  var BIOMES = {};
  function biomeOf(name) { return name ? BIOMES[name] || null : null; }

  // ---------------------------------------------------------------------
  // Scenery (box lists, positioned at tile column x on a row whose surface is y=0)
  // ---------------------------------------------------------------------
  var TRUNK = 0x7a4f2a;

  function jitter(color) { return Utils.shade(color, Utils.randRange(-0.06, 0.06)); }

  function treeBoxes(out, x, z, kind, biome) {
    var bm = biomeOf(biome);
    if (bm) return bm.border(out, x, z, kind);
    var dark = jitter(0x2f9a3e), light = jitter(0x47b455);
    if (kind === 0) {            // round oak
      out.push(B(x, 0.2, z, 0.26, 0.4, 0.26, TRUNK));
      out.push(B(x, 0.67, z, 0.8, 0.54, 0.8, dark));
      out.push(B(x, 1.12, z, 0.52, 0.36, 0.52, light));
    } else if (kind === 1) {     // tall oak
      var k = Utils.randRange(0.9, 1.25);
      out.push(B(x, 0.3, z, 0.28, 0.6, 0.28, TRUNK));
      out.push(B(x, 0.6 + 0.4 * k, z, 0.86, 0.8 * k, 0.86, dark));
      out.push(B(x, 0.6 + 0.8 * k + 0.25, z, 0.62, 0.5, 0.62, light));
      out.push(B(x, 0.6 + 0.8 * k + 0.5 + 0.15, z, 0.34, 0.3, 0.34, jitter(0x5bc766)));
    } else if (kind === 2) {     // pine
      var pine = [0x23704a, 0x2b8556, 0x339a62, 0x3cae6e];
      var widths = [0.96, 0.74, 0.54, 0.32];
      out.push(B(x, 0.15, z, 0.2, 0.3, 0.2, TRUNK));
      var y = 0.3;
      for (var i = 0; i < 4; i++) {
        var h = i === 3 ? 0.4 : 0.34;
        out.push(B(x, y + h / 2, z, widths[i], h, widths[i], jitter(pine[i])));
        y += h - 0.04;
      }
    } else {                     // chunky cube tree
      out.push(B(x, 0.15, z, 0.24, 0.3, 0.24, TRUNK));
      out.push(B(x, 0.3 + 0.4, z, 0.74, 0.8, 0.74, dark));
      out.push(B(x, 0.3 + 0.8 + 0.07, z, 0.5, 0.14, 0.5, light));
    }
  }

  function rockBoxes(out, x, z, biome) {
    var bm = biomeOf(biome);
    if (bm) return bm.rock(out, x, z);
    var base = Utils.choice([0x9aa3ab, 0x8d969e, 0xa6aeb5]);
    out.push(B(x, 0.17, z, 0.7, 0.34, 0.64, base));
    out.push(B(x + 0.08, 0.42, z - 0.04, 0.42, 0.24, 0.4, Utils.shade(base, 0.15)));
    if (Math.random() < 0.5) out.push(B(x - 0.28, 0.1, z + 0.3, 0.2, 0.2, 0.2, Utils.shade(base, -0.1)));
  }

  function bushBoxes(out, x, z) {
    out.push(B(x, 0.19, z, 0.74, 0.38, 0.74, 0x3f9f4b));
    out.push(B(x, 0.45, z, 0.5, 0.16, 0.5, 0x5bbd5e));
    if (Math.random() < 0.5) {
      out.push(B(x + 0.2, 0.3, z + 0.38, 0.1, 0.1, 0.04, 0xe8433a));
      out.push(B(x - 0.15, 0.22, z + 0.38, 0.1, 0.1, 0.04, 0xe8433a));
    }
  }

  function flowerBoxes(out, x, z, biome) {
    var bm = biomeOf(biome);
    if (bm) return bm.flower(out, x, z);
    var c = Utils.choice([0xffffff, 0xffe14d, 0xff8fb3, 0xc79bff]);
    var ox = Utils.randRange(-0.3, 0.3), oz = Utils.randRange(-0.3, 0.3);
    out.push(B(x + ox, 0.05, z + oz, 0.04, 0.1, 0.04, 0x3f9f4b));
    out.push(B(x + ox, 0.12, z + oz, 0.11, 0.06, 0.11, c));
  }

  // ---- more obstacles that block a tile ----
  function hayBoxes(out, x, z) {
    out.push(B(x, 0.28, z, 0.82, 0.56, 0.7, 0xe3b94a));
    out.push(B(x - 0.26, 0.28, z, 0.07, 0.58, 0.72, 0xb98a2a));
    out.push(B(x + 0.26, 0.28, z, 0.07, 0.58, 0.72, 0xb98a2a));
    if (Math.random() < 0.5) out.push(B(x + 0.05, 0.7, z, 0.6, 0.3, 0.5, 0xd9ad3c));
  }
  function fenceBoxes(out, x, z) {
    var wood = 0xa9743c;
    out.push(B(x - 0.42, 0.28, z, 0.1, 0.56, 0.1, 0x8d5a2b));
    out.push(B(x + 0.42, 0.28, z, 0.1, 0.56, 0.1, 0x8d5a2b));
    out.push(B(x, 0.26, z, 0.08, 0.5, 0.08, 0x8d5a2b));
    out.push(B(x, 0.2, z, 0.96, 0.07, 0.06, wood));
    out.push(B(x, 0.42, z, 0.96, 0.07, 0.06, wood));
  }
  function scarecrowBoxes(out, x, z) {
    out.push(B(x, 0.5, z, 0.08, 1.0, 0.08, 0x8d5a2b));
    out.push(B(x, 0.78, z, 0.72, 0.07, 0.07, 0x8d5a2b));
    out.push(B(x, 0.64, z, 0.3, 0.38, 0.16, 0x3f7fe0));
    out.push(B(x + 0.08, 0.6, z - 0.09, 0.1, 0.1, 0.02, 0xe53935));
    out.push(B(x, 1.06, z, 0.22, 0.22, 0.2, 0xf0d0a0));
    out.push(B(x - 0.05, 1.07, z - 0.11, 0.04, 0.04, 0.02, 0x222222));
    out.push(B(x + 0.05, 1.07, z - 0.11, 0.04, 0.04, 0.02, 0x222222));
    out.push(B(x, 1.2, z, 0.38, 0.05, 0.38, 0x6b4a2a));
    out.push(B(x, 1.28, z, 0.22, 0.12, 0.22, 0x6b4a2a));
    out.push(B(x - 0.4, 0.7, z, 0.1, 0.16, 0.05, 0xe3b94a)); // straw
    out.push(B(x + 0.4, 0.7, z, 0.1, 0.16, 0.05, 0xe3b94a));
  }
  function stumpBoxes(out, x, z) {
    out.push(B(x, 0.18, z, 0.5, 0.36, 0.5, 0x8a5a2b));
    out.push(B(x, 0.375, z, 0.42, 0.03, 0.42, 0xd9a766));
    out.push(B(x - 0.1, 0.375, z - 0.08, 0.14, 0.035, 0.14, 0xc08a50));
    out.push(B(x + 0.22, 0.12, z, 0.12, 0.2, 0.3, 0x3f9f4b)); // moss
  }
  function barrelBoxes(out, x, z) {
    out.push(B(x - 0.2, 0.3, z, 0.4, 0.6, 0.4, 0xb03a2e));
    out.push(B(x - 0.2, 0.18, z, 0.42, 0.06, 0.42, 0x333333));
    out.push(B(x - 0.2, 0.44, z, 0.42, 0.06, 0.42, 0x333333));
    out.push(B(x + 0.22, 0.25, z + 0.08, 0.36, 0.5, 0.36, 0x2f6fb0));
    out.push(B(x + 0.22, 0.2, z + 0.08, 0.38, 0.06, 0.38, 0x333333));
  }
  function sunflowerBoxes(out, x, z) {
    out.push(B(x, 0.4, z, 0.06, 0.8, 0.06, 0x3f9f4b));
    out.push(B(x + 0.1, 0.3, z, 0.18, 0.05, 0.1, 0x3f9f4b));
    out.push(B(x, 0.9, z - 0.02, 0.4, 0.4, 0.07, 0xffd23f));
    out.push(B(x, 0.9, z - 0.07, 0.2, 0.2, 0.05, 0x6b3d1a));
  }
  function mushroomBoxes(out, x, z) {
    out.push(B(x, 0.14, z, 0.16, 0.28, 0.16, 0xf5f0e6));
    out.push(B(x, 0.34, z, 0.46, 0.14, 0.46, 0xe53935));
    out.push(B(x - 0.12, 0.42, z - 0.1, 0.1, 0.03, 0.1, 0xffffff));
    out.push(B(x + 0.12, 0.42, z + 0.08, 0.1, 0.03, 0.1, 0xffffff));
    out.push(B(x + 0.22, 0.1, z - 0.22, 0.1, 0.18, 0.1, 0xf5f0e6));
    out.push(B(x + 0.22, 0.23, z - 0.22, 0.22, 0.08, 0.22, 0xe53935));
  }

  var OBSTACLE_ODDS = [
    { value: 'tree', weight: 0.38 }, { value: 'rock', weight: 0.11 }, { value: 'bush', weight: 0.13 },
    { value: 'hay', weight: 0.09 }, { value: 'fence', weight: 0.08 }, { value: 'scarecrow', weight: 0.04 },
    { value: 'stump', weight: 0.05 }, { value: 'barrels', weight: 0.05 }, { value: 'sunflower', weight: 0.05 },
    { value: 'mushroom', weight: 0.02 }
  ];
  // One random blocker for a tile (all of them stop the chicken like a tree does).
  function obstacleBoxes(out, x, z, biome) {
    var kind = Utils.weightedChoice(OBSTACLE_ODDS);
    var bm = biomeOf(biome);
    if (bm && bm.obstacles[kind]) { bm.obstacles[kind](out, x, z); return kind; }
    switch (kind) {
      case 'tree': treeBoxes(out, x, z, Utils.randInt(0, 3)); break;
      case 'rock': rockBoxes(out, x, z); break;
      case 'bush': bushBoxes(out, x, z); break;
      case 'hay': hayBoxes(out, x, z); break;
      case 'fence': fenceBoxes(out, x, z); break;
      case 'scarecrow': scarecrowBoxes(out, x, z); break;
      case 'stump': stumpBoxes(out, x, z); break;
      case 'barrels': barrelBoxes(out, x, z); break;
      case 'sunflower': sunflowerBoxes(out, x, z); break;
      default: mushroomBoxes(out, x, z);
    }
    return kind;
  }

  // Low obstacles the Jump power-up can hop over (trees, scarecrows and sunflowers are too tall).
  var SMALL_KINDS = { rock: 1, bush: 1, hay: 1, fence: 1, stump: 1, barrels: 1, mushroom: 1 };
  function isSmallObstacle(kind) { return !!SMALL_KINDS[kind]; }

  // Scenery material: like the shared voxel material, but everything above the
  // ground sways gently in the wind (tall trees and flowers more than low rocks).
  var _windU = { value: 0 };
  var _sceneryMat = null;
  function sceneryMaterial() {
    if (!_sceneryMat) {
      _sceneryMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      _sceneryMat.onBeforeCompile = function (shader) {
        shader.uniforms.uTime = _windU;
        shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n' +
          'float sway = max(0.0, position.y - 0.4);\n' +
          'transformed.x += sin(uTime * 1.7 + position.x * 0.9 + position.z * 0.6) * sway * 0.04;\n' +
          'transformed.z += cos(uTime * 1.3 + position.x * 0.8) * sway * 0.025;');
      };
      _sceneryMat.customProgramCacheKey = function () { return 'sway'; };
      _sceneryMat.__shared = true;
    }
    return _sceneryMat;
  }

  // ---------------------------------------------------------------------
  // Vehicles (face +x; the lane flips them with rotation.y)
  // ---------------------------------------------------------------------
  function wheelPair(out, x, zOff, size) {
    size = size || 0.24;
    out.push(B(x, size / 2, zOff, size, size, 0.12, DARK));
    out.push(B(x, size / 2, -zOff, size, size, 0.12, DARK));
  }

  function lights(out, front, back, y, z) {
    out.push(B(front, y, z, 0.05, 0.1, 0.14, 0xfff3b0));
    out.push(B(front, y, -z, 0.05, 0.1, 0.14, 0xfff3b0));
    out.push(B(back, y, z, 0.05, 0.1, 0.14, 0xd62b2b));
    out.push(B(back, y, -z, 0.05, 0.1, 0.14, 0xd62b2b));
  }

  var CAR_COLORS = [0xe8453c, 0x3f7fe0, 0x35b86b, 0x9b59d0, 0xff8c2e, 0xf06fa0, 0x2fb5b5, 0xeeeeee, 0xb7c0c9];

  var VEHICLES = {
    sedan: { len: 1.25, build: function (c) {
      var o = [];
      o.push(B(0, 0.2, 0, 1.25, 0.1, 0.76, DARK));
      o.push(B(0, 0.375, 0, 1.25, 0.25, 0.74, c));
      o.push(B(-0.08, 0.62, 0, 0.68, 0.24, 0.64, Utils.shade(c, 0.1)));
      o.push(B(-0.08, 0.62, 0, 0.72, 0.14, 0.68, GLASS));
      o.push(B(-0.08, 0.755, 0, 0.7, 0.04, 0.66, Utils.shade(c, 0.18)));
      lights(o, 0.63, -0.63, 0.36, 0.25);
      wheelPair(o, 0.4, 0.4); wheelPair(o, -0.4, 0.4);
      return o;
    } },
    taxi: { len: 1.25, build: function () {
      var o = VEHICLES.sedan.build(0xf6c026);
      o.push(B(-0.08, 0.84, 0, 0.22, 0.1, 0.36, 0xffffff));
      o.push(B(-0.08, 0.84, 0, 0.1, 0.06, 0.37, 0x222222));
      o.push(B(0, 0.375, 0.375, 0.9, 0.05, 0.02, 0x222222));
      o.push(B(0, 0.375, -0.375, 0.9, 0.05, 0.02, 0x222222));
      return o;
    } },
    police: { len: 1.3, build: function () {
      var o = [];
      o.push(B(0, 0.2, 0, 1.3, 0.1, 0.78, DARK));
      o.push(B(0, 0.375, 0, 1.3, 0.25, 0.76, 0x23272e));
      o.push(B(-0.08, 0.62, 0, 0.7, 0.24, 0.66, 0xf4f4f4));
      o.push(B(-0.08, 0.62, 0, 0.74, 0.14, 0.7, GLASS));
      o.push(B(-0.08, 0.755, 0, 0.72, 0.04, 0.68, 0xf4f4f4));
      o.push(B(-0.08, 0.83, 0.13, 0.14, 0.1, 0.2, 0xe53935));
      o.push(B(-0.08, 0.83, -0.13, 0.14, 0.1, 0.2, 0x2f6fe8));
      lights(o, 0.66, -0.66, 0.36, 0.26);
      wheelPair(o, 0.42, 0.41); wheelPair(o, -0.42, 0.41);
      return o;
    } },
    van: { len: 1.6, build: function (c) {
      var o = [];
      o.push(B(0, 0.2, 0, 1.6, 0.1, 0.8, DARK));
      o.push(B(0, 0.5, 0, 1.6, 0.5, 0.8, c));
      o.push(B(0.25, 0.82, 0, 1.1, 0.14, 0.78, Utils.shade(c, 0.12)));
      o.push(B(0.81, 0.62, 0, 0.04, 0.24, 0.66, GLASS));
      o.push(B(0.4, 0.62, 0.405, 0.6, 0.22, 0.02, GLASS));
      o.push(B(0.4, 0.62, -0.405, 0.6, 0.22, 0.02, GLASS));
      o.push(B(-0.3, 0.45, 0.405, 0.9, 0.12, 0.02, 0xffffff));
      o.push(B(-0.3, 0.45, -0.405, 0.9, 0.12, 0.02, 0xffffff));
      lights(o, 0.81, -0.81, 0.34, 0.26);
      wheelPair(o, 0.5, 0.42); wheelPair(o, -0.5, 0.42);
      return o;
    } },
    truck: { len: 3.0, build: function (c) {
      var o = [];
      var trailer = Utils.choice([0xf2f2f2, 0x3f7fe0, 0xe8453c, 0xffa726, 0x4caf50]);
      o.push(B(0, 0.22, 0, 2.95, 0.14, 0.7, 0x3a3a40));
      // cab
      o.push(B(1.1, 0.5, 0, 0.78, 0.6, 0.82, c));
      o.push(B(1.1, 0.86, 0, 0.7, 0.14, 0.8, Utils.shade(c, 0.15)));
      o.push(B(1.5, 0.66, 0, 0.04, 0.3, 0.66, GLASS));
      o.push(B(1.1, 0.66, 0.415, 0.5, 0.26, 0.02, GLASS));
      o.push(B(1.1, 0.66, -0.415, 0.5, 0.26, 0.02, GLASS));
      // container
      o.push(B(-0.35, 0.74, 0, 2.2, 0.98, 0.88, trailer));
      o.push(B(-0.35, 1.25, 0, 2.24, 0.04, 0.92, Utils.shade(trailer, -0.18)));
      for (var i = 0; i < 5; i++) {
        o.push(B(-1.15 + i * 0.4, 0.74, 0.445, 0.06, 0.9, 0.02, Utils.shade(trailer, -0.14)));
        o.push(B(-1.15 + i * 0.4, 0.74, -0.445, 0.06, 0.9, 0.02, Utils.shade(trailer, -0.14)));
      }
      lights(o, 1.5, -1.47, 0.34, 0.28);
      wheelPair(o, 1.1, 0.42, 0.3); wheelPair(o, -0.4, 0.42, 0.3); wheelPair(o, -1.0, 0.42, 0.3);
      return o;
    } },
    bus: { len: 3.2, build: function (c) {
      var o = [];
      o.push(B(0, 0.2, 0, 3.2, 0.1, 0.84, DARK));
      o.push(B(0, 0.55, 0, 3.2, 0.8, 0.86, c));
      o.push(B(0, 1.0, 0, 3.14, 0.1, 0.82, Utils.shade(c, 0.18)));
      o.push(B(0, 0.78, 0.44, 2.9, 0.3, 0.02, GLASS));
      o.push(B(0, 0.78, -0.44, 2.9, 0.3, 0.02, GLASS));
      o.push(B(1.61, 0.74, 0, 0.04, 0.4, 0.7, GLASS));
      o.push(B(0, 0.48, 0.44, 3.0, 0.08, 0.02, 0xffffff));
      o.push(B(0, 0.48, -0.44, 3.0, 0.08, 0.02, 0xffffff));
      lights(o, 1.61, -1.61, 0.38, 0.3);
      wheelPair(o, 1.05, 0.44, 0.3); wheelPair(o, -1.05, 0.44, 0.3);
      return o;
    } }
  };

  // ---- more vehicles ----
  VEHICLES.motorbike = { len: 0.95, build: function (c) {
    var o = [], jacket = Utils.choice([0xe53935, 0x3f7fe0, 0x222222, 0xffa726, 0x35b86b]);
    o.push(B(0, 0.3, 0, 0.8, 0.12, 0.16, c));
    o.push(B(0.16, 0.42, 0, 0.3, 0.14, 0.2, c));
    o.push(B(-0.25, 0.38, 0, 0.3, 0.08, 0.2, 0x222222));
    o.push(B(0.38, 0.5, 0, 0.06, 0.3, 0.06, 0x777777));
    o.push(B(0.36, 0.66, 0, 0.06, 0.06, 0.42, 0x333333));
    o.push(B(0.46, 0.46, 0, 0.05, 0.1, 0.14, 0xfff3b0));
    o.push(B(-0.5, 0.38, 0, 0.04, 0.08, 0.1, 0xd62b2b));
    o.push(B(0.38, 0.17, 0, 0.34, 0.34, 0.1, DARK));
    o.push(B(-0.38, 0.17, 0, 0.34, 0.34, 0.1, DARK));
    o.push(B(-0.16, 0.7, 0, 0.22, 0.4, 0.28, jacket));
    o.push(B(-0.14, 1.0, 0, 0.24, 0.22, 0.24, Utils.choice([0x222222, 0xf2f2f2, 0xe53935])));
    o.push(B(-0.03, 1.0, 0, 0.06, 0.1, 0.22, 0x9ad7ff));
    o.push(B(0.1, 0.66, 0.14, 0.3, 0.08, 0.07, jacket));
    o.push(B(0.1, 0.66, -0.14, 0.3, 0.08, 0.07, jacket));
    return o;
  } };
  VEHICLES.tractor = { len: 1.9, build: function () {
    var o = [], green = Utils.choice([0x3c9a3c, 0xe8453c, 0x3f7fe0]);
    o.push(B(0.35, 0.5, 0, 0.95, 0.42, 0.62, green));
    o.push(B(0.78, 0.5, 0, 0.06, 0.3, 0.5, 0x333333));
    o.push(B(-0.35, 0.85, 0, 0.56, 0.5, 0.56, Utils.shade(green, 0.1)));
    o.push(B(-0.35, 0.9, 0, 0.6, 0.3, 0.6, GLASS));
    o.push(B(-0.35, 1.15, 0, 0.7, 0.06, 0.66, Utils.shade(green, -0.2)));
    o.push(B(0.7, 0.95, 0.15, 0.07, 0.34, 0.07, 0x333333));
    o.push(B(-0.62, 0.36, 0.42, 0.72, 0.72, 0.16, DARK));
    o.push(B(-0.62, 0.36, -0.42, 0.72, 0.72, 0.16, DARK));
    o.push(B(-0.62, 0.36, 0.51, 0.3, 0.3, 0.04, 0xe0b030));
    o.push(B(-0.62, 0.36, -0.51, 0.3, 0.3, 0.04, 0xe0b030));
    o.push(B(0.7, 0.22, 0.36, 0.44, 0.44, 0.12, DARK));
    o.push(B(0.7, 0.22, -0.36, 0.44, 0.44, 0.12, DARK));
    o.push(B(0.84, 0.54, 0.2, 0.04, 0.1, 0.12, 0xfff3b0));
    o.push(B(0.84, 0.54, -0.2, 0.04, 0.1, 0.12, 0xfff3b0));
    return o;
  } };
  VEHICLES.ambulance = { len: 1.7, build: function () {
    var o = [];
    o.push(B(0, 0.2, 0, 1.7, 0.1, 0.82, DARK));
    o.push(B(0, 0.52, 0, 1.7, 0.55, 0.82, 0xffffff));
    o.push(B(0.1, 0.82, 0, 1.5, 0.08, 0.8, 0xf0f0f0));
    o.push(B(0.86, 0.64, 0, 0.04, 0.24, 0.66, GLASS));
    [-1, 1].forEach(function (sz) {
      o.push(B(0, 0.46, sz * 0.415, 1.6, 0.1, 0.02, 0xe53935));
      o.push(B(-0.3, 0.64, sz * 0.415, 0.3, 0.08, 0.02, 0xe53935));
      o.push(B(-0.3, 0.64, sz * 0.415, 0.08, 0.3, 0.02, 0xe53935));
    });
    o.push(B(0.5, 0.92, 0.18, 0.18, 0.1, 0.22, 0xe53935));
    o.push(B(0.5, 0.92, -0.18, 0.18, 0.1, 0.22, 0x2f6fe8));
    lights(o, 0.86, -0.86, 0.34, 0.27);
    wheelPair(o, 0.52, 0.42); wheelPair(o, -0.52, 0.42);
    return o;
  } };
  VEHICLES.icecream = { len: 1.8, build: function () {
    var o = [], body = Utils.choice([0xffc1d9, 0x9ad7ff, 0xfff1b0]);
    o.push(B(0, 0.2, 0, 1.8, 0.1, 0.82, DARK));
    o.push(B(0, 0.52, 0, 1.8, 0.6, 0.82, body));
    o.push(B(0, 0.86, 0, 1.7, 0.08, 0.8, 0xffffff));
    o.push(B(0.91, 0.64, 0, 0.04, 0.26, 0.66, GLASS));
    [-1, 1].forEach(function (sz) {
      o.push(B(-0.2, 0.62, sz * 0.415, 0.5, 0.28, 0.02, 0x8ad0ff));
      o.push(B(-0.2, 0.8, sz * 0.47, 0.6, 0.05, 0.14, 0xe53935));
      o.push(B(-0.2, 0.8, sz * 0.47, 0.2, 0.052, 0.142, 0xffffff));
    });
    o.push(B(-0.2, 0.96, 0, 0.12, 0.12, 0.12, 0xe0b070));
    o.push(B(-0.2, 1.06, 0, 0.22, 0.12, 0.22, 0xe0b070));
    o.push(B(-0.2, 1.2, 0, 0.32, 0.2, 0.32, 0xff9ec4));
    o.push(B(-0.2, 1.34, 0, 0.1, 0.1, 0.1, 0xe53935));
    lights(o, 0.91, -0.91, 0.34, 0.27);
    wheelPair(o, 0.55, 0.42); wheelPair(o, -0.55, 0.42);
    return o;
  } };
  VEHICLES.sports = { len: 1.35, build: function (c) {
    var o = [];
    o.push(B(0, 0.16, 0, 1.35, 0.08, 0.8, DARK));
    o.push(B(0, 0.3, 0, 1.35, 0.2, 0.78, c));
    o.push(B(-0.12, 0.47, 0, 0.55, 0.16, 0.62, Utils.shade(c, 0.1)));
    o.push(B(-0.12, 0.47, 0, 0.6, 0.1, 0.66, GLASS));
    o.push(B(-0.62, 0.5, 0, 0.1, 0.05, 0.74, DARK));
    o.push(B(-0.6, 0.42, 0.25, 0.05, 0.14, 0.05, DARK));
    o.push(B(-0.6, 0.42, -0.25, 0.05, 0.14, 0.05, DARK));
    o.push(B(0.1, 0.405, 0, 1.0, 0.02, 0.2, 0xffffff));
    lights(o, 0.68, -0.68, 0.3, 0.26);
    wheelPair(o, 0.42, 0.41, 0.26); wheelPair(o, -0.42, 0.41, 0.26);
    return o;
  } };

  function pickVehicleKind() {
    return Utils.weightedChoice([
      { value: 'sedan', weight: 0.24 }, { value: 'taxi', weight: 0.09 }, { value: 'police', weight: 0.05 },
      { value: 'van', weight: 0.1 }, { value: 'truck', weight: 0.12 }, { value: 'bus', weight: 0.08 },
      { value: 'motorbike', weight: 0.09 }, { value: 'tractor', weight: 0.06 }, { value: 'ambulance', weight: 0.04 },
      { value: 'icecream', weight: 0.04 }, { value: 'sports', weight: 0.07 }
    ]);
  }

  function buildVehicle(kind, biome) {
    var bm = biomeOf(biome);
    var def = (bm && bm.vehicles[kind]) || VEHICLES[kind];
    var palette = bm ? bm.vehicleColors : CAR_COLORS;
    var color = kind === 'bus' ? Utils.choice([0xffc933, 0xe8453c, 0x3f7fe0, 0x35b86b])
      : kind === 'truck' ? Utils.choice([0xe8453c, 0x3f7fe0, 0xffa726, 0x35b86b])
        : Utils.choice(palette);
    var variant = Utils.randInt(0, 2);
    var mesh = cachedMesh('veh:' + (biome || '') + ':' + kind + ':' + color + ':' + variant, function () { return def.build(color); });
    mesh.add(buildBeam(def.len)); // headlight glow, only drawn at night
    return mesh;
  }

  var _beamGeo = null, _beamMat = null;
  function beamAssets() {
    if (_beamGeo) return;
    var cv = document.createElement('canvas');
    cv.width = 128; cv.height = 64;
    var c = cv.getContext('2d');
    var g = c.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,238,170,0.95)');
    g.addColorStop(1, 'rgba(255,238,170,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 64);
    c.globalCompositeOperation = 'destination-in';
    var v = c.createLinearGradient(0, 0, 0, 64);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.5, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = v; c.fillRect(0, 0, 128, 64);
    _beamGeo = new THREE.PlaneGeometry(1.9, 1.0);
    _beamGeo.rotateX(-Math.PI / 2);
    _beamGeo.__shared = true;
    _beamMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    _beamMat.visible = false;
    _beamMat.__shared = true;
  }
  function buildBeam(len) {
    beamAssets();
    var m = new THREE.Mesh(_beamGeo, _beamMat);
    m.position.set(len / 2 + 0.95, 0.05, 0);
    m.renderOrder = 2;
    return m;
  }
  // 0 (day) .. 1 (night): headlights fade in, and cost nothing in daylight
  function setNight(n) {
    beamAssets();
    _beamMat.visible = n > 0.08;
    _beamMat.opacity = Math.min(1, n * 1.15);
  }

  // ---------------------------------------------------------------------
  // River floaters
  // ---------------------------------------------------------------------
  function buildLog(length, biome) {
    var bm = biomeOf(biome);
    return cachedMesh('log:' + (biome || '') + ':' + length + ':' + Utils.randInt(0, 2), function () { return bm ? bm.logBoxes(length) : logBoxes(length); });
  }

  function logBoxes(length) {
    var o = [];
    o.push(B(0, 0, 0, length, 0.34, 0.78, 0x8a5a2e));
    o.push(B(0, -0.11, 0, length + 0.02, 0.12, 0.8, 0x6e4423));
    o.push(B(0, 0.175, 0, length * 0.94, 0.02, 0.56, 0xa5723c));
    o.push(B(length / 2 + 0.01, 0, 0, 0.04, 0.36, 0.8, 0xd9a766));
    o.push(B(-length / 2 - 0.01, 0, 0, 0.04, 0.36, 0.8, 0xd9a766));
    var knots = Math.floor(length);
    for (var i = 0; i < knots; i++) {
      o.push(B(-length / 2 + (i + 0.5) * (length / knots), 0.185, Utils.randRange(-0.15, 0.15), 0.14, 0.02, 0.09, 0x6e4423));
    }
    return o;
  }

  // A group of n turtles that paddle along; the world makes them dive now and then.
  function buildTurtles(n, biome) {
    var bm = biomeOf(biome);
    if (bm) return Utils.voxelMesh(bm.turtleBoxes(n));
    var o = [];
    for (var i = 0; i < n; i++) {
      var x = (i - (n - 1) / 2) * 1.05;
      o.push(B(x, 0.0, 0, 0.86, 0.2, 0.74, 0x2e6e2c));
      o.push(B(x, 0.12, 0, 0.7, 0.14, 0.6, 0x3f8f3a));
      o.push(B(x, 0.19, 0, 0.46, 0.04, 0.4, 0x58b04a));
      o.push(B(x, 0.215, 0, 0.2, 0.03, 0.2, 0x9be07a));
      o.push(B(x + 0.5, 0.04, 0, 0.2, 0.14, 0.2, 0xb8d84a));
      o.push(B(x + 0.6, 0.08, 0.06, 0.04, 0.05, 0.04, 0x111111));
      o.push(B(x + 0.6, 0.08, -0.06, 0.04, 0.05, 0.04, 0x111111));
      o.push(B(x + 0.22, -0.04, 0.4, 0.22, 0.05, 0.14, 0xb8d84a));
      o.push(B(x + 0.22, -0.04, -0.4, 0.22, 0.05, 0.14, 0xb8d84a));
      o.push(B(x - 0.26, -0.04, 0.38, 0.2, 0.05, 0.12, 0xb8d84a));
      o.push(B(x - 0.26, -0.04, -0.38, 0.2, 0.05, 0.12, 0xb8d84a));
      o.push(B(x - 0.46, 0.0, 0, 0.1, 0.06, 0.06, 0xb8d84a));
    }
    return Utils.voxelMesh(o);
  }

  var _padGeo = null, _padMat = null, _flowerMat = null, _flowerGeo = null;
  function buildPad(withFlower, biome) {
    var bm = biomeOf(biome);
    if (bm) return bm.pad(withFlower);
    if (!_padGeo) {
      _padGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.07, 10);
      _padGeo.__shared = true;
      _padMat = new THREE.MeshLambertMaterial({ color: 0x3fb04c });
      _padMat.__shared = true;
      _flowerGeo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
      _flowerGeo.__shared = true;
      _flowerMat = new THREE.MeshLambertMaterial({ color: 0xff8fb3 });
      _flowerMat.__shared = true;
    }
    var g = new THREE.Group();
    var pad = new THREE.Mesh(_padGeo, _padMat);
    pad.castShadow = true;
    pad.receiveShadow = true;
    pad.rotation.y = Utils.randRange(0, Math.PI);
    g.add(pad);
    if (withFlower) {
      var f = new THREE.Mesh(_flowerGeo, _flowerMat);
      f.position.set(0.12, 0.09, -0.08);
      g.add(f);
    }
    return g;
  }

  // ---------------------------------------------------------------------
  // Trains and signals
  // ---------------------------------------------------------------------
  var TRAIN_SEG = 1.7;

  function buildLocomotive(biome) {
    var bm = biomeOf(biome);
    return cachedMesh('loco:' + (biome || ''), bm ? bm.locoBoxes : locomotiveBoxes);
  }

  function locomotiveBoxes() {
    var o = [];
    o.push(B(0, 0.28, 0, 1.65, 0.3, 0.9, 0x2c3038));
    o.push(B(-0.35, 0.78, 0, 0.9, 0.7, 0.92, 0xd23b2f));
    o.push(B(-0.35, 1.17, 0, 0.96, 0.08, 0.98, 0x8c231b));
    o.push(B(0.42, 0.66, 0, 0.8, 0.46, 0.86, 0x3b4048));
    o.push(B(0.42, 0.93, 0, 0.8, 0.06, 0.86, 0xf2b21c));
    o.push(B(0.6, 1.05, 0, 0.22, 0.28, 0.22, 0x1d1f24));
    o.push(B(-0.2, 0.84, 0.465, 0.5, 0.3, 0.02, GLASS));
    o.push(B(-0.2, 0.84, -0.465, 0.5, 0.3, 0.02, GLASS));
    o.push(B(0.83, 0.62, 0, 0.04, 0.16, 0.22, 0xfff3b0));
    o.push(B(0.84, 0.36, 0, 0.1, 0.1, 0.9, 0xf2b21c));
    for (var i = -1; i <= 1; i++) {
      o.push(B(i * 0.5, 0.14, 0.47, 0.3, 0.28, 0.06, 0x16181c));
      o.push(B(i * 0.5, 0.14, -0.47, 0.3, 0.28, 0.06, 0x16181c));
    }
    return o;
  }

  var TRAIN_CAR_COLORS = [0x8b4a2b, 0x3b6ea5, 0xb7791f, 0x4a7a4a, 0x6b6f78];
  function buildTrainCar(biome) {
    var bm = biomeOf(biome);
    var c = Utils.choice(bm ? bm.carColors : TRAIN_CAR_COLORS);
    return cachedMesh('car:' + (biome || '') + ':' + c, function () { return bm ? bm.carBoxes(c) : trainCarBoxes(c); });
  }

  function trainCarBoxes(c) {
    var o = [];
    o.push(B(0, 0.24, 0, 1.65, 0.16, 0.8, 0x2c3038));
    o.push(B(0, 0.7, 0, 1.6, 0.76, 0.92, c));
    o.push(B(0, 1.1, 0, 1.64, 0.06, 0.96, Utils.shade(c, -0.3)));
    for (var i = 0; i < 4; i++) {
      o.push(B(-0.6 + i * 0.4, 0.7, 0.465, 0.06, 0.7, 0.02, Utils.shade(c, -0.18)));
      o.push(B(-0.6 + i * 0.4, 0.7, -0.465, 0.06, 0.7, 0.02, Utils.shade(c, -0.18)));
    }
    o.push(B(0.85, 0.3, 0, 0.12, 0.08, 0.12, 0x1d1f24));
    for (var j = -1; j <= 1; j += 2) {
      o.push(B(j * 0.5, 0.14, 0.47, 0.3, 0.28, 0.06, 0x16181c));
      o.push(B(j * 0.5, 0.14, -0.47, 0.3, 0.28, 0.06, 0x16181c));
    }
    return o;
  }

  var _sig = null;
  function signalAssets() {
    if (_sig) return _sig;
    function basic(c) { var m = new THREE.MeshBasicMaterial({ color: c }); m.__shared = true; return m; }
    _sig = {
      geo: new THREE.BoxGeometry(0.22, 0.22, 0.05),
      redOn: basic(0xff2a2a), redOff: basic(0x4a1010), greenOn: basic(0x35ff6a), greenOff: basic(0x0f3d1a)
    };
    _sig.geo.__shared = true;
    return _sig;
  }

  // Railway signal like a little traffic light: GREEN = the track is clear,
  // flashing RED = a train is on its way. The caller swaps the lamp materials.
  function buildSignal() {
    var A = signalAssets();
    var g = new THREE.Group();
    g.add(Utils.voxelMesh([
      B(0, 0.05, 0, 0.3, 0.1, 0.3, 0x555a63),
      B(0, 0.7, 0, 0.1, 1.3, 0.1, 0x8a8d96),
      B(0, 1.4, 0, 0.36, 0.66, 0.18, 0x23262b),
      B(0, 1.76, 0, 0.42, 0.06, 0.24, 0xe53935),
      B(0, 1.73, 0, 0.06, 0.1, 0.06, 0x23262b)
    ]));
    var red = [], green = [];
    [-1, 1].forEach(function (sz) {
      var r = new THREE.Mesh(A.geo, A.redOff);
      r.position.set(0, 1.54, sz * 0.105);
      var gr = new THREE.Mesh(A.geo, A.greenOn);
      gr.position.set(0, 1.26, sz * 0.105);
      g.add(r); g.add(gr);
      red.push(r); green.push(gr);
    });
    return { group: g, red: red, green: green, mats: A };
  }

  // A dashed light bar along the front edge of a railway: GREEN while the track is
  // clear, flashing RED when a train is coming. It sits in the world and never moves,
  // so the signal is readable wherever you are on the lane.
  var _strip = null;
  function stripAssets() {
    if (_strip) return _strip;
    var cv = document.createElement('canvas');
    cv.width = 64; cv.height = 16;
    var c = cv.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(12, 2, 40, 12);
    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(CONFIG.LANE_HALF * 2, 1);
    function mat(col) { var m = new THREE.MeshBasicMaterial({ color: col, map: tex, transparent: true, alphaTest: 0.4 }); m.__shared = true; return m; }
    var geo = new THREE.BoxGeometry(CONFIG.LANE_HALF * 2, 0.05, 0.16);
    geo.__shared = true;
    _strip = { geo: geo, green: mat(0x35ff6a), red: mat(0xff2a2a), dark: mat(0x3a1010) };
    return _strip;
  }
  function buildSignalStrip() {
    var A = stripAssets();
    return { mesh: new THREE.Mesh(A.geo, A.green), mats: A };
  }

  // ---------------------------------------------------------------------
  // Coin: spins around its vertical axis and bobs (animated by the world)
  // ---------------------------------------------------------------------
  var _coinGeo = null, _coinMats = null;
  function buildCoin() {
    if (!_coinGeo) {
      _coinGeo = {
        rim: new THREE.CylinderGeometry(0.27, 0.27, 0.1, 16),
        face: new THREE.CylinderGeometry(0.19, 0.19, 0.115, 16)
      };
      _coinGeo.rim.__shared = _coinGeo.face.__shared = true;
      _coinMats = {
        rim: new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.coinDark, emissive: 0x3a2400 }),
        face: new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.coin, emissive: 0x4a3200 })
      };
      _coinMats.rim.__shared = _coinMats.face.__shared = true;
    }
    var spin = new THREE.Group();
    var rim = new THREE.Mesh(_coinGeo.rim, _coinMats.rim);
    var face = new THREE.Mesh(_coinGeo.face, _coinMats.face);
    rim.rotation.x = face.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    spin.add(rim); spin.add(face);
    var g = new THREE.Group();
    g.add(spin);
    g.userData.spin = spin;
    spin.position.y = 0.5;
    return g;
  }

  // ---------------------------------------------------------------------
  // Power-up pickups: a glossy emoji badge floating over a glowing ring
  // ---------------------------------------------------------------------
  var _puMats = {}, _ringGeo = null;
  function powerupMaterials(type) {
    if (_puMats[type]) return _puMats[type];
    var def = CONFIG.POWERUPS[type];
    var cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    var c = cv.getContext('2d');
    c.beginPath(); c.arc(64, 64, 61, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill();
    c.beginPath(); c.arc(64, 64, 53, 0, Math.PI * 2); c.fillStyle = def.color; c.fill();
    c.beginPath(); c.arc(64, 64, 53, 0, Math.PI * 2);
    var g = c.createRadialGradient(46, 40, 4, 64, 64, 56);
    g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.22)');
    c.fillStyle = g; c.fill();
    c.font = '60px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(def.icon, 64, 70);
    var tex = new THREE.CanvasTexture(cv);
    var sprite = new THREE.SpriteMaterial({ map: tex, transparent: true });
    sprite.__shared = true;
    var ring = new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color), transparent: true, opacity: 0.55, depthWrite: false });
    ring.__shared = true;
    _puMats[type] = { sprite: sprite, ring: ring };
    return _puMats[type];
  }

  function buildPowerup(type) {
    var mats = powerupMaterials(type);
    if (!_ringGeo) {
      _ringGeo = new THREE.RingGeometry(0.3, 0.46, 20);
      _ringGeo.rotateX(-Math.PI / 2);
      _ringGeo.__shared = true;
    }
    var g = new THREE.Group();
    var sprite = new THREE.Sprite(mats.sprite);
    sprite.geometry.__shared = true; // three shares one sprite geometry globally
    sprite.scale.set(0.85, 0.85, 1);
    sprite.position.y = 0.85;
    var ring = new THREE.Mesh(_ringGeo, mats.ring);
    ring.position.y = 0.04;
    g.add(ring);
    g.add(sprite);
    g.userData.sprite = sprite;
    g.userData.ring = ring;
    return g;
  }

  // One of everything with its own material, so the renderer can compile
  // every shader up front instead of hitching the first time one appears.
  function buildWarmGroup() {
    var g = new THREE.Group();
    g.add(buildCoin());
    g.add(buildSignal().group);
    g.add(buildPad(true));
    if (BIOMES.space) g.add(buildPad(true, 'space'));
    g.add(buildBeam(1.2));
    g.add(buildTurtles(2));
    g.add(Utils.voxelMesh([B(0, 0.1, 0, 0.1, 0.2, 0.1, 0x3f9f4b)], { material: sceneryMaterial() }));
    Object.keys(CONFIG.POWERUPS).forEach(function (k) { g.add(buildPowerup(k)); });
    g.position.set(0, 0, 0);
    return g;
  }

  // ---------------------------------------------------------------------
  // Eagle (idle / fell-behind death)
  // ---------------------------------------------------------------------
  function buildEagle() {
    var g = new THREE.Group();            // looks along +z
    var BROWN = 0x5b3a1e, DARKB = 0x3b2410, LIGHTB = 0x80562f, WHITE = 0xf4f1ea, YEL = 0xf2b21c;
    g.add(Utils.voxelMesh([
      B(0, 0, 0, 0.5, 0.42, 0.9, BROWN),                    // torso
      B(0, -0.1, 0.06, 0.4, 0.2, 0.7, LIGHTB),               // chest
      B(0, 0.03, 0.5, 0.4, 0.34, 0.34, WHITE),               // neck
      B(0, -0.04, 0.34, 0.36, 0.14, 0.2, LIGHTB),
      B(0, 0.12, -0.12, 0.44, 0.1, 0.5, DARKB),              // back feathers
      B(-0.16, -0.16, -0.12, 0.14, 0.2, 0.22, LIGHTB),       // feathered thighs
      B(0.16, -0.16, -0.12, 0.14, 0.2, 0.22, LIGHTB),
      B(0, 0.02, -0.6, 0.3, 0.07, 0.46, WHITE),              // tail fan
      B(-0.15, 0.02, -0.74, 0.14, 0.06, 0.46, WHITE),
      B(0.15, 0.02, -0.74, 0.14, 0.06, 0.46, WHITE),
      B(0, 0.02, -0.98, 0.5, 0.05, 0.08, 0xdcd8cc)
    ]));
    var head = new THREE.Group();
    head.position.set(0, 0.07, 0.72);
    head.add(Utils.voxelMesh([
      B(0, 0, 0, 0.34, 0.32, 0.3, WHITE),
      B(0, -0.04, 0.24, 0.15, 0.15, 0.2, YEL),               // beak
      B(0, -0.14, 0.33, 0.09, 0.1, 0.07, YEL),               // hook
      B(-0.19, 0.04, 0.06, 0.05, 0.08, 0.09, 0xffd23f),      // eyes
      B(0.19, 0.04, 0.06, 0.05, 0.08, 0.09, 0xffd23f),
      B(-0.2, 0.04, 0.1, 0.03, 0.04, 0.03, 0x111111),
      B(0.2, 0.04, 0.1, 0.03, 0.04, 0.03, 0x111111),
      B(-0.19, 0.12, 0.08, 0.06, 0.04, 0.14, 0xe4dfd0),      // stern brows
      B(0.19, 0.12, 0.08, 0.06, 0.04, 0.14, 0xe4dfd0)
    ]));
    g.add(head);

    function leg(sign) {
      var p = new THREE.Group();
      p.position.set(sign * 0.15, -0.26, -0.05);
      p.add(Utils.voxelMesh([
        B(0, -0.1, 0, 0.09, 0.22, 0.09, YEL),
        B(0, -0.23, 0.08, 0.18, 0.05, 0.22, YEL),
        B(-0.06, -0.24, 0.22, 0.03, 0.05, 0.1, 0x2b2b2b),
        B(0, -0.24, 0.24, 0.03, 0.05, 0.12, 0x2b2b2b),
        B(0.06, -0.24, 0.22, 0.03, 0.05, 0.1, 0x2b2b2b)
      ]));
      p.rotation.x = -0.9;                                   // tucked up in flight
      g.add(p);
      return p;
    }
    var legL = leg(-1), legR = leg(1);

    // A wing is two hinged parts: the arm (shoulder pivot) and the hand with
    // its finger feathers (elbow pivot), so it can bend like a real wing.
    function wing(sign) {
      var shoulder = new THREE.Group();
      shoulder.position.set(sign * 0.24, 0.14, 0.14);
      shoulder.add(Utils.voxelMesh([
        B(sign * 0.4, 0, -0.02, 0.8, 0.08, 0.7, BROWN),
        B(sign * 0.4, 0.045, 0.1, 0.8, 0.02, 0.3, LIGHTB),
        B(sign * 0.4, -0.01, -0.34, 0.8, 0.05, 0.16, DARKB)    // trailing feathers
      ]));
      var elbow = new THREE.Group();
      elbow.position.set(sign * 0.8, 0, 0);
      var o = [
        B(sign * 0.32, 0, -0.06, 0.64, 0.07, 0.54, DARKB),
        B(sign * 0.32, 0.04, 0.06, 0.6, 0.02, 0.2, BROWN)
      ];
      for (var i = 0; i < 4; i++) {                            // spread primaries
        var len = 0.5 - i * 0.06;
        o.push(B(sign * (0.64 + len / 2 - 0.02), 0, 0.16 - i * 0.15, len, 0.045, 0.12, i === 3 ? 0xf1ece0 : DARKB));
        o.push(B(sign * (0.64 + len - 0.03), 0, 0.16 - i * 0.15, 0.1, 0.05, 0.12, WHITE));
      }
      elbow.add(Utils.voxelMesh(o));
      shoulder.add(elbow);
      g.add(shoulder);
      return { shoulder: shoulder, elbow: elbow };
    }
    var wl = wing(-1), wr = wing(1);
    return {
      group: g, head: head, legL: legL, legR: legR,
      wingL: wl.shoulder, wingR: wr.shoulder, elbowL: wl.elbow, elbowR: wr.elbow
    };
  }

  // ---------------------------------------------------------------------
  // Crocodile logs: a floating croc you can ride on its back - but its head
  // snaps shut now and then. The world animates `jaw` (pivot) and decides
  // when the head is dangerous.
  // ---------------------------------------------------------------------
  var CROC_PAL = {
    forest: { body: 0x4a8f3a, belly: 0xcfd98a, dark: 0x2f6a2a, ridge: 0x3a7a2e, eye: 0xffe14d, mouth: 0xd94a4a },
    space: { body: 0x6b4fd8, belly: 0xb7a3ff, dark: 0x3a2f8f, ridge: 0x45e6a8, eye: 0x7df3ff, mouth: 0xff5fd2 }
  };
  var CROC_HEAD = 1.0; // length of the dangerous head at the front

  function buildCroc(length, biome) {
    var pal = CROC_PAL[biome] || CROC_PAL.forest;
    var g = new THREE.Group();
    var L = length, bodyLen = L - CROC_HEAD + 0.2, cx = -L / 2 + bodyLen / 2;
    var o = [];
    o.push(B(cx, 0, 0, bodyLen, 0.34, 0.74, pal.body));
    o.push(B(cx, -0.12, 0, bodyLen, 0.1, 0.72, pal.dark));
    o.push(B(cx, 0.175, 0, bodyLen * 0.94, 0.02, 0.5, Utils.shade(pal.body, 0.14)));
    o.push(B(cx, -0.04, 0.375, bodyLen * 0.9, 0.14, 0.03, pal.belly));            // pale flanks
    o.push(B(cx, -0.04, -0.375, bodyLen * 0.9, 0.14, 0.03, pal.belly));
    o.push(B(-L / 2 - 0.1, 0.0, 0, 0.3, 0.22, 0.44, pal.body));          // tapering tail
    o.push(B(-L / 2 - 0.3, -0.02, 0, 0.3, 0.14, 0.26, pal.dark));
    for (var i = 0; i < Math.floor(bodyLen / 0.34); i++) {              // back ridges
      o.push(B(-L / 2 + 0.15 + i * 0.34, 0.25, 0, 0.14, 0.14, 0.2, pal.ridge));
      o.push(B(-L / 2 + 0.15 + i * 0.34, 0.2, 0.2, 0.1, 0.06, 0.1, pal.ridge));
      o.push(B(-L / 2 + 0.15 + i * 0.34, 0.2, -0.2, 0.1, 0.06, 0.1, pal.ridge));
    }
    [-1, 1].forEach(function (s) {                                       // stubby legs
      o.push(B(cx + bodyLen * 0.25, -0.08, s * 0.42, 0.26, 0.1, 0.14, pal.dark));
      o.push(B(cx - bodyLen * 0.25, -0.08, s * 0.42, 0.26, 0.1, 0.14, pal.dark));
    });
    // upper jaw + eyes (the lower jaw is a separate pivot so it can open)
    var hx = L / 2 - CROC_HEAD / 2;
    o.push(B(hx, 0.08, 0, CROC_HEAD, 0.2, 0.56, pal.body));
    o.push(B(hx + 0.32, 0.06, 0, 0.4, 0.14, 0.4, pal.body));
    o.push(B(hx - 0.2, 0.22, 0.2, 0.12, 0.12, 0.12, pal.eye));
    o.push(B(hx - 0.2, 0.22, -0.2, 0.12, 0.12, 0.12, pal.eye));
    o.push(B(hx - 0.15, 0.22, 0.2, 0.04, 0.06, 0.05, 0x111111));
    o.push(B(hx - 0.15, 0.22, -0.2, 0.04, 0.06, 0.05, 0x111111));
    for (var t = 0; t < 4; t++) {                                        // upper teeth
      o.push(B(hx + 0.02 + t * 0.14, -0.04, 0.24, 0.06, 0.08, 0.04, 0xffffff));
      o.push(B(hx + 0.02 + t * 0.14, -0.04, -0.24, 0.06, 0.08, 0.04, 0xffffff));
    }
    g.add(Utils.voxelMesh(o));
    var jaw = new THREE.Group();
    jaw.position.set(L / 2 - CROC_HEAD, -0.06, 0);
    var j = [
      B(CROC_HEAD / 2, -0.04, 0, CROC_HEAD - 0.02, 0.1, 0.5, pal.dark),
      B(CROC_HEAD / 2, 0.02, 0, CROC_HEAD - 0.1, 0.04, 0.4, pal.mouth),
      B(CROC_HEAD - 0.04, -0.02, 0, 0.1, 0.1, 0.3, pal.dark)
    ];
    for (var u = 0; u < 4; u++) {
      j.push(B(0.2 + u * 0.18, 0.07, 0.2, 0.06, 0.09, 0.04, 0xffffff));
      j.push(B(0.2 + u * 0.18, 0.07, -0.2, 0.06, 0.09, 0.04, 0xffffff));
    }
    jaw.add(Utils.voxelMesh(j));
    g.add(jaw);
    return { group: g, jaw: jaw, length: L, headLen: CROC_HEAD };
  }

  // ---------------------------------------------------------------------
  // Moving platforms over a bottomless chasm (stone slab / hover plate)
  // ---------------------------------------------------------------------
  function buildPlatform(width, biome) {
    return cachedMesh('plat:' + (biome || 'forest') + ':' + width, function () {
      var o = [];
      if (biome === 'space') {
        o.push(B(0, 0, 0, width, 0.3, 0.78, 0x3d4470));
        o.push(B(0, 0.165, 0, width - 0.1, 0.03, 0.66, 0x5a64a0));
        o.push(B(0, -0.17, 0, width - 0.3, 0.05, 0.5, 0x4de8ff));
        o.push(B(0, 0.19, 0, width - 0.3, 0.01, 0.04, 0x7df3ff));
        o.push(B(-width / 2 + 0.2, 0.19, 0.22, 0.12, 0.02, 0.12, 0xff5fd2));
        o.push(B(width / 2 - 0.2, 0.19, -0.22, 0.12, 0.02, 0.12, 0xff5fd2));
        o.push(B(width / 2 + 0.01, 0, 0, 0.04, 0.32, 0.8, 0x7480a6));
        o.push(B(-width / 2 - 0.01, 0, 0, 0.04, 0.32, 0.8, 0x7480a6));
      } else {
        o.push(B(0, 0, 0, width, 0.34, 0.78, 0x8d8f99));
        o.push(B(0, -0.11, 0, width + 0.02, 0.12, 0.8, 0x6a6c76));
        o.push(B(0, 0.175, 0, width * 0.94, 0.02, 0.58, 0xa9abb5));
        o.push(B(-width / 2 + 0.3, 0.185, 0.1, 0.34, 0.02, 0.22, 0x5aa648));    // moss
        o.push(B(width / 2 - 0.4, 0.185, -0.15, 0.24, 0.02, 0.18, 0x5aa648));
        o.push(B(0, 0.19, 0, 0.3, 0.015, 0.3, 0xff8a3d));                       // rune
        o.push(B(width / 2 + 0.01, 0, 0, 0.04, 0.36, 0.8, 0xc4c6d0));
        o.push(B(-width / 2 - 0.01, 0, 0, 0.04, 0.36, 0.8, 0xc4c6d0));
      }
      return o;
    });
  }

  // ---------------------------------------------------------------------
  // Biome portal: two pillars that mark where the world changes
  // ---------------------------------------------------------------------
  function buildGate(biome) {
    var g = new THREE.Group();
    var cols = biome === 'space'
      ? { stone: 0x3a3e66, trim: 0x4de8ff, cap: 0xff5fd2 }
      : { stone: 0x8d8f99, trim: 0x5aa648, cap: 0xffd23f };
    [-1, 1].forEach(function (s) {
      var o = [
        B(0, 0.2, 0, 0.62, 0.4, 0.62, cols.stone),
        B(0, 1.2, 0, 0.42, 1.6, 0.42, H_shade(cols.stone, 0.12)),
        B(0, 0.5, 0, 0.46, 0.06, 0.46, cols.trim),
        B(0, 1.5, 0, 0.46, 0.06, 0.46, cols.trim),
        B(0, 2.1, 0, 0.6, 0.18, 0.6, cols.stone),
        B(0, 2.3, 0, 0.26, 0.26, 0.26, cols.cap)
      ];
      var m = Utils.voxelMesh(o);
      m.position.x = s * (CONFIG.PLAY_HALF + 1.6);
      g.add(m);
      g.userData['gem' + (s > 0 ? 'R' : 'L')] = m;
    });
    return g;
  }
  function H_shade(c, a) { return Utils.shade(c, a); }

  return {
    helpers: {
      B: B, cachedMesh: cachedMesh, shade: Utils.shade, choice: Utils.choice,
      randRange: Utils.randRange, randInt: Utils.randInt
    },
    registerBiome: function (name, def) { BIOMES[name] = def; },
    hasBiome: function (name) { return !!BIOMES[name]; },
    buildCroc: buildCroc,
    buildPlatform: buildPlatform,
    buildGate: buildGate,
    CROC_HEAD: CROC_HEAD,
    treeBoxes: treeBoxes,
    obstacleBoxes: obstacleBoxes,
    isSmallObstacle: isSmallObstacle,
    buildSignalStrip: buildSignalStrip,
    sceneryMaterial: sceneryMaterial,
    setWind: function (t) { _windU.value = t; },
    buildTurtles: buildTurtles,
    rockBoxes: rockBoxes,
    bushBoxes: bushBoxes,
    flowerBoxes: flowerBoxes,
    pickVehicleKind: pickVehicleKind,
    vehicleLength: function (kind) { return VEHICLES[kind].len; },
    buildVehicle: buildVehicle,
    buildLog: buildLog,
    buildPad: buildPad,
    buildLocomotive: buildLocomotive,
    buildTrainCar: buildTrainCar,
    buildSignal: buildSignal,
    buildCoin: buildCoin,
    buildPowerup: buildPowerup,
    buildWarmGroup: buildWarmGroup,
    setNight: setNight,
    buildEagle: buildEagle,
    TRAIN_SEG: TRAIN_SEG
  };
})();
