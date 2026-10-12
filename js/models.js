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

  // ---------------------------------------------------------------------
  // Scenery (box lists, positioned at tile column x on a row whose surface is y=0)
  // ---------------------------------------------------------------------
  var TRUNK = 0x7a4f2a;

  function jitter(color) { return Utils.shade(color, Utils.randRange(-0.06, 0.06)); }

  function treeBoxes(out, x, z, kind) {
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

  function rockBoxes(out, x, z) {
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

  function flowerBoxes(out, x, z) {
    var c = Utils.choice([0xffffff, 0xffe14d, 0xff8fb3, 0xc79bff]);
    var ox = Utils.randRange(-0.3, 0.3), oz = Utils.randRange(-0.3, 0.3);
    out.push(B(x + ox, 0.05, z + oz, 0.04, 0.1, 0.04, 0x3f9f4b));
    out.push(B(x + ox, 0.12, z + oz, 0.11, 0.06, 0.11, c));
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

  function pickVehicleKind() {
    return Utils.weightedChoice([
      { value: 'sedan', weight: 0.36 }, { value: 'taxi', weight: 0.12 }, { value: 'police', weight: 0.06 },
      { value: 'van', weight: 0.14 }, { value: 'truck', weight: 0.2 }, { value: 'bus', weight: 0.12 }
    ]);
  }

  function buildVehicle(kind) {
    var def = VEHICLES[kind];
    var color = kind === 'bus' ? Utils.choice([0xffc933, 0xe8453c, 0x3f7fe0, 0x35b86b])
      : kind === 'truck' ? Utils.choice([0xe8453c, 0x3f7fe0, 0xffa726, 0x35b86b])
        : Utils.choice(CAR_COLORS);
    var variant = Utils.randInt(0, 2);
    var mesh = cachedMesh('veh:' + kind + ':' + color + ':' + variant, function () { return def.build(color); });
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
  function buildLog(length) {
    return cachedMesh('log:' + length + ':' + Utils.randInt(0, 2), function () { return logBoxes(length); });
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

  var _padGeo = null, _padMat = null, _flowerMat = null, _flowerGeo = null;
  function buildPad(withFlower) {
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

  function buildLocomotive() {
    return cachedMesh('loco', locomotiveBoxes);
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
  function buildTrainCar() {
    var c = Utils.choice(TRAIN_CAR_COLORS);
    return cachedMesh('car:' + c, function () { return trainCarBoxes(c); });
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

  var _lampOn = null, _lampOff = null, _lampGeo = null;
  // Railway warning signal: returns {group, lamp}; the caller toggles lamp.material.
  function buildSignal() {
    if (!_lampOn) {
      _lampOn = new THREE.MeshBasicMaterial({ color: 0xff3030 });
      _lampOff = new THREE.MeshBasicMaterial({ color: 0x5c1414 });
      _lampOn.__shared = _lampOff.__shared = true;
      _lampGeo = new THREE.BoxGeometry(0.2, 0.2, 0.06);
      _lampGeo.__shared = true;
    }
    var g = new THREE.Group();
    var post = Utils.voxelMesh([
      B(0, 0.5, 0, 0.1, 1.0, 0.1, 0x8a8d96),
      B(0, 1.12, 0, 0.5, 0.34, 0.14, 0xf2f2f2),
      B(0, 1.12, 0.02, 0.5, 0.06, 0.16, 0xe53935),
      B(0, 1.34, 0, 0.16, 0.06, 0.16, 0x2b2b30)
    ]);
    g.add(post);
    var lampA = new THREE.Mesh(_lampGeo, _lampOff);
    lampA.position.set(-0.11, 1.12, -0.09);
    var lampB = new THREE.Mesh(_lampGeo, _lampOff);
    lampB.position.set(0.11, 1.12, -0.09);
    g.add(lampA); g.add(lampB);
    var lampA2 = lampA.clone(); lampA2.position.z = 0.09; g.add(lampA2);
    var lampB2 = lampB.clone(); lampB2.position.z = 0.09; g.add(lampB2);
    return { group: g, lamps: [[lampA, lampA2], [lampB, lampB2]], on: _lampOn, off: _lampOff };
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
    g.add(buildBeam(1.2));
    Object.keys(CONFIG.POWERUPS).forEach(function (k) { g.add(buildPowerup(k)); });
    g.position.set(0, 0, 0);
    return g;
  }

  // ---------------------------------------------------------------------
  // Eagle (idle / fell-behind death)
  // ---------------------------------------------------------------------
  function buildEagle() {
    var g = new THREE.Group();
    g.add(Utils.voxelMesh([
      B(0, 0, 0, 0.56, 0.46, 1.0, 0x5b3a1e),
      B(0, 0.04, 0.58, 0.42, 0.38, 0.42, 0xf4f1ea),
      B(0, -0.01, 0.88, 0.16, 0.16, 0.24, 0xf2b21c),
      B(0.18, 0.1, 0.72, 0.05, 0.07, 0.05, 0x111111),
      B(-0.18, 0.1, 0.72, 0.05, 0.07, 0.05, 0x111111),
      B(0, 0.02, -0.72, 0.42, 0.1, 0.5, 0xf4f1ea),
      B(0.14, -0.3, 0.05, 0.1, 0.22, 0.1, 0xf2b21c),
      B(-0.14, -0.3, 0.05, 0.1, 0.22, 0.1, 0xf2b21c),
      B(0.14, -0.43, 0.1, 0.14, 0.05, 0.22, 0xf2b21c),
      B(-0.14, -0.43, 0.1, 0.14, 0.05, 0.22, 0xf2b21c)
    ]));
    function wing(sign) {
      var pivot = new THREE.Group();
      pivot.position.set(sign * 0.26, 0.14, 0.05);
      pivot.add(Utils.voxelMesh([
        B(sign * 0.5, 0, 0, 1.0, 0.1, 0.62, 0x4a2f17),
        B(sign * 1.25, 0, -0.04, 0.55, 0.08, 0.5, 0x3a2412),
        B(sign * 1.62, 0, -0.1, 0.22, 0.06, 0.36, 0xf4f1ea)
      ]));
      g.add(pivot);
      return pivot;
    }
    return { group: g, wingL: wing(-1), wingR: wing(1) };
  }

  return {
    treeBoxes: treeBoxes,
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
