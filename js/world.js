// Procedural endless world: bands of grass / road / river / railway lanes with
// their trees, traffic, logs, lily pads, trains and coins.
function World(scene) {
  this.scene = scene;
  this.rows = new Map(); // z -> row data
  this.group = new THREE.Group();
  this.scene.add(this.group);
  this.band = null;      // the band currently being generated
  this.pathCol = 0;      // a column that is always passable, carried upward row by row
  this.time = 0;
  this.sinceItem = 10;   // rows since the last power-up spawned
  this.frozen = false;   // Time Freeze power-up: traffic and trains stand still
  this.magnet = null;    // {x, y, z} while the Magnet power-up pulls coins in
  this.onMagnetCoin = null;
  this.listener = null;  // {x, z, ghost}: where the chicken is (for sounds and close calls)
  this.onNearMiss = null;
  this.hornCool = 0;
  this.amb = { traffic: 0 }; // 1 while the chicken's lane (or the next) is a road, drives the road hum
}

World.prototype.difficultyProgress = function (z) {
  return Utils.clamp(z / 180, 0, 1);
};

// ---------------------------------------------------------------------------
// Band planning. Lanes come in runs: 1-3 grass rows, then a
// run of road / river / rail (occasionally two hazards back to back).
// ---------------------------------------------------------------------------
World.prototype.nextBand = function (z) {
  var T = CONFIG.ROW_TYPES;
  var p = this.difficultyProgress(z);
  var prev = this.band;
  var hazardNext = !prev || prev.type === T.GRASS || Math.random() < 0.2;
  var band;
  if (!hazardNext) {
    band = { type: T.GRASS, left: Utils.weightedChoice([
      { value: 1, weight: 0.38 }, { value: 2, weight: 0.34 }, { value: 3, weight: 0.2 }, { value: 4, weight: 0.08 }
    ]) };
  } else {
    var options = [
      { value: T.ROAD, weight: 0.5 },
      { value: T.WATER, weight: 0.3 },
      { value: T.RAIL, weight: 0.2 }
    ];
    if (prev && prev.type !== T.GRASS) {
      options = options.filter(function (o) { return o.value !== prev.type; });
    }
    var type = Utils.weightedChoice(options);
    var left;
    if (type === T.ROAD) left = Utils.randInt(1, 2 + Math.floor(p * 3));
    else if (type === T.WATER) left = Utils.randInt(1, 2 + Math.floor(p * 1.5));
    else left = Math.random() < 0.35 ? 2 : 1;
    band = {
      type: type,
      left: left,
      dir: Math.random() < 0.5 ? 1 : -1,
      pads: type === T.WATER && z > 14 && Math.random() < 0.3
    };
  }
  this.band = band;
};

// budget caps how many new rows are built in one call so a frame never
// hitches on generation (rows are built bottom-up, so order is preserved).
World.prototype.ensureRange = function (fromZ, toZ, budget) {
  for (var z = fromZ; z <= toZ; z++) {
    if (!this.rows.has(z)) {
      if (budget-- <= 0) return;
      this.generateRow(z);
    }
  }
};

World.prototype.pruneBefore = function (z) {
  var rows = this.rows;
  var group = this.group;
  rows.forEach(function (row, key) {
    if (key < z) {
      group.remove(row.group);
      Utils.disposeObject3D(row.group);
      rows.delete(key);
    }
  });
};

World.prototype.generateRow = function (z) {
  var T = CONFIG.ROW_TYPES;
  var type;
  if (z <= 3) {
    // safe start: grass only
    type = T.GRASS;
    this.band = { type: T.GRASS, left: 0 };
  } else {
    if (!this.band || this.band.left <= 0) this.nextBand(z);
    this.band.left--;
    type = this.band.type;
  }
  var band = this.band;
  var p = this.difficultyProgress(z);
  var parity = ((z % 2) + 2) % 2;
  var below = this.rows.get(z - 1);
  var edge = type === T.ROAD && below && below.type === T.ROAD;

  var group = new THREE.Group();
  group.position.z = z * CONFIG.TILE;
  this.group.add(group);

  var top = CONFIG.ROW_TOP[type];
  var ground = new THREE.Mesh(Textures.getGroundGeometry(type), Textures.getGroundMaterials(type, parity, edge));
  ground.position.y = (top + CONFIG.ROW_BOTTOM) / 2;
  ground.receiveShadow = true;
  group.add(ground);

  var row = { z: z, type: type, top: top, group: group, blocked: {}, vehicles: [], logs: [], coins: [], items: [], train: null };

  var dir = band.dir || 1;
  if (type !== T.GRASS && type !== T.RAIL) band.dir = Math.random() < 0.85 ? -dir : dir;

  if (type === T.GRASS) this.populateGrass(row, z, p);
  else if (type === T.ROAD) this.populateRoad(row, dir, p);
  else if (type === T.WATER) this.populateWater(row, dir, p, band.pads);
  else this.populateRail(row);

  this.rows.set(z, row);
};

// ---------------------------------------------------------------------------
// Grass: forest border, trees / rocks / bushes, coins. A "path column" that is
// never blocked is carried upward so every grass row can always be crossed.
// ---------------------------------------------------------------------------
World.prototype.populateGrass = function (row, z, p) {
  var PH = CONFIG.PLAY_HALF;
  var forbid = {};
  if (z <= 0) {
    this.pathCol = 0;
    if (z === 0) forbid[0] = true;
  } else {
    var from = this.pathCol, to = from;
    if (Math.random() < 0.5) to = Utils.clamp(from + Utils.randInt(-3, 3), -(PH - 1), PH - 1);
    for (var c = Math.min(from, to); c <= Math.max(from, to); c++) forbid[c] = true;
    this.pathCol = to;
  }

  var density;
  if (z <= -3) density = 1;
  else if (z < 0) density = 0.35;
  else if (z === 0) density = 0.1;
  else density = Utils.lerp(0.12, 0.2, p);

  var boxes = [];
  var x;
  for (x = -PH; x <= PH; x++) {
    if (forbid[x]) {
      if (Math.random() < 0.06) Models.flowerBoxes(boxes, x, 0);
      continue;
    }
    if (Math.random() < density) {
      var r = Math.random();
      if (r < 0.55) Models.treeBoxes(boxes, x, 0, Utils.randInt(0, 3));
      else if (r < 0.75) Models.rockBoxes(boxes, x, 0);
      else Models.bushBoxes(boxes, x, 0);
      row.blocked[x] = true;
    } else if (Math.random() < 0.07) {
      Models.flowerBoxes(boxes, x, 0);
    }
  }

  // The forest outside the playable strip.
  var span = CONFIG.TREE_HALF - PH;
  for (var d = 1; d <= span; d++) {
    var chance = d === 1 ? 1 : Utils.lerp(0.92, 0.5, d / span);
    [-1, 1].forEach(function (side) {
      if (Math.random() < chance) {
        var kind = Math.random() < 0.65 ? Utils.choice([1, 1, 2, 2, 0]) : 3;
        Models.treeBoxes(boxes, side * (PH + d), 0, kind);
      } else if (Math.random() < 0.15) {
        Models.rockBoxes(boxes, side * (PH + d), 0);
      }
    });
  }
  if (boxes.length) row.group.add(Utils.voxelMesh(boxes));

  if (z > 0) {
    var r = Math.random();
    if (r < 0.07) this.placeCoinTrail(row);
    else if (r < 0.36) this.placeCoin(row, true);
    if (Math.random() < 0.12) this.placeCoin(row, true);
    this.maybePlaceItem(row, z, true);
  }
};

// A short run of 3 coins along the lane - a little reward for a detour.
World.prototype.placeCoinTrail = function (row) {
  var PH = CONFIG.PLAY_HALF;
  for (var tries = 0; tries < 6; tries++) {
    var x0 = Utils.randInt(-PH, PH - 2);
    if (row.blocked[x0] || row.blocked[x0 + 1] || row.blocked[x0 + 2]) continue;
    for (var i = 0; i < 3; i++) this.addCoin(row, x0 + i);
    return;
  }
};

World.prototype.addCoin = function (row, x) {
  var coin = Models.buildCoin();
  coin.position.set(x, row.top, 0);
  row.group.add(coin);
  row.coins.push({ x: x, mesh: coin, collected: false, pulled: false, phase: Math.random() * 6 });
};

// Rarely drops a power-up: never in the first rows, never too often, and
// more likely the longer it has been since the last one.
World.prototype.maybePlaceItem = function (row, z, onlyFree, pads) {
  this.sinceItem++;
  if (z < 8) return;
  var chance = this.sinceItem < 6 ? 0 : this.sinceItem < 12 ? 0.12 : 0.55;
  if (Math.random() >= chance) return;
  var PH = CONFIG.PLAY_HALF;
  for (var tries = 0; tries < 8; tries++) {
    var x = Utils.randInt(-PH + 1, PH - 1);
    if (onlyFree && row.blocked[x]) continue;
    if (pads && !pads[x]) continue;
    var opts = Object.keys(CONFIG.POWERUPS).map(function (k) { return { value: k, weight: CONFIG.POWERUPS[k].weight }; });
    var type = Utils.weightedChoice(opts);
    var mesh = Models.buildPowerup(type);
    mesh.position.set(x, row.top, 0);
    row.group.add(mesh);
    row.items.push({ type: type, x: x, mesh: mesh, collected: false, phase: Math.random() * 6 });
    this.sinceItem = 0;
    return;
  }
};

// Drops a coin on a random free tile of the row. onlyFree: avoid blocked tiles.
World.prototype.placeCoin = function (row, onlyFree, pads) {
  var PH = CONFIG.PLAY_HALF;
  for (var tries = 0; tries < 8; tries++) {
    var x = Utils.randInt(-PH, PH);
    if (onlyFree && row.blocked[x]) continue;
    if (pads && !pads[x]) continue;
    this.addCoin(row, x);
    return;
  }
};

// ---------------------------------------------------------------------------
// Looping lanes (traffic and logs): evenly-ish spaced items on a closed loop
// that wraps off-screen, never closer than minGap.
// ---------------------------------------------------------------------------
function layoutLoop(lengths, loopLen, minGap) {
  var sum = function () { return lengths.reduce(function (a, b) { return a + b; }, 0); };
  while (lengths.length > 1 && sum() + lengths.length * minGap > loopLen) lengths.pop();
  var n = lengths.length;
  var slack = Math.max(0, loopLen - sum() - n * minGap);
  var weights = [], wsum = 0, i;
  for (i = 0; i < n; i++) { var w = Math.pow(Math.random(), 1.5) + 0.15; weights.push(w); wsum += w; }
  var centers = [];
  var cursor = -loopLen / 2 + Utils.randRange(0, 2);
  for (i = 0; i < n; i++) {
    centers.push(cursor + lengths[i] / 2);
    cursor += lengths[i] + minGap + slack * weights[i] / wsum;
  }
  return centers;
}

// Relative pace by vehicle type: big rigs are a bit slower, taxis and cops hurry.
var VEHICLE_PACE = { truck: 0.85, bus: 0.8, van: 0.95, sedan: 1.1, taxi: 1.25, police: 1.4 };
var SPEED_FLOOR = 2.8;   // nothing crawls
var SPEED_CEIL = 11;

// Every vehicle gets its own speed when it enters the lane and keeps it until
// it leaves: no slowing down, no speeding up, no braking near the chicken.
World.prototype.rollVehicle = function (row) {
  var kind = Models.pickVehicleKind();
  var speed = Utils.clamp(row.laneBase * VEHICLE_PACE[kind] * Utils.randRange(0.6, 1.55), SPEED_FLOOR, SPEED_CEIL);
  return { kind: kind, len: Models.vehicleLength(kind), speed: speed };
};

// With different constant speeds a faster vehicle could catch a slower one,
// so a new vehicle only enters once there is enough room that it cannot catch
// the one ahead before that one leaves the lane. Returns that required gap.
World.prototype.requiredGap = function (row, lead, cand) {
  var minGap = 2.2 + 0.18 * cand.speed;
  if (!lead || cand.speed <= lead.speed) return minGap;
  var L = row.laneLen;
  var tLead = Math.max(0, (L + lead.halfWidth - lead.s) / lead.speed);
  var tSelf = (L + cand.len) / cand.speed;
  return minGap + (cand.speed - lead.speed) * Math.min(tLead, tSelf);
};

World.prototype.populateRoad = function (row, dir, p) {
  row.dir = dir;
  row.laneLen = CONFIG.LANE_HALF * 2;
  row.laneBase = Utils.randRange(3.2 + p * 1.2, 6.4 + p * 2.6); // lane tempo
  row.density = 1 - p * 0.25;
  row.wantGap = Utils.randRange(3.4, 9.5) * row.density;
  row.pending = null;
  row.live = false;
  // Run the lane offline for a while so it starts already full of traffic.
  for (var i = 0; i < 175; i++) this.laneStep(row, 0.2);
  row.live = true;
  for (var j = 0; j < row.vehicles.length; j++) this.attachVehicleMesh(row, row.vehicles[j]);
  if (Math.random() < 0.12) this.placeCoin(row, false);
};

World.prototype.attachVehicleMesh = function (row, v) {
  var mesh = Models.buildVehicle(v.kind);
  mesh.position.set(v.x, row.top, 0);
  mesh.rotation.y = row.dir > 0 ? 0 : Math.PI;
  row.group.add(mesh);
  v.mesh = mesh;
};

World.prototype.laneStep = function (row, dt) {
  var vs = row.vehicles, dir = row.dir, L = row.laneLen, wrap = CONFIG.LANE_HALF;
  var frozen = this.frozen && row.live;
  var k = 1 - Math.exp(-dt * 10);
  for (var i = vs.length - 1; i >= 0; i--) {
    var v = vs[i];
    var target = frozen ? 0 : v.speed; // only Time Freeze ever changes a vehicle's speed
    if (v.cur !== target) {
      v.cur += (target - v.cur) * k;
      if (Math.abs(target - v.cur) < 0.02) v.cur = target;
    }
    v.s += v.cur * dt;
    if (v.s - v.halfWidth > L) {
      if (v.mesh) row.group.remove(v.mesh);
      vs.splice(i, 1);
      continue;
    }
    v.x = dir > 0 ? v.s - wrap : wrap - v.s;
    if (v.mesh) v.mesh.position.x = v.x;
  }
  if (frozen) return; // no new traffic while time is frozen

  if (!row.pending) row.pending = this.rollVehicle(row);
  var cand = row.pending;
  var lead = vs.length ? vs[vs.length - 1] : null; // the most recent arrival
  var gap0 = lead ? lead.s - lead.halfWidth : Infinity; // room between the entry line and the last vehicle
  var need = lead ? Math.max(row.wantGap, this.requiredGap(row, lead, cand)) : 0;
  if (gap0 >= need) {
    var v2 = {
      kind: cand.kind, speed: cand.speed, cur: cand.speed, halfWidth: cand.len / 2,
      s: -cand.len / 2, x: 0, mesh: null, heard: 0
    };
    v2.x = dir > 0 ? v2.s - wrap : wrap - v2.s;
    vs.push(v2);
    if (row.live) this.attachVehicleMesh(row, v2);
    row.pending = null;
    row.wantGap = Utils.randRange(3.4, 9.5) * row.density;
  }
};

var HORN_CHANCE = { truck: 0.6, bus: 0.5, taxi: 0.5, police: 0.3, van: 0.25, sedan: 0.2 };

World.prototype.updateRoad = function (row, dt) {
  this.laneStep(row, dt);
  this.vehicleAudio(row);
};

// Horns as a vehicle bears down on the chicken, and a whoosh as it passes.
World.prototype.vehicleAudio = function (row) {
  var ls = this.listener;
  if (!ls || !GameAudio) return;
  var dz = Math.abs(row.z - ls.z);
  // only the chicken's own lane and the one just ahead make noise
  var rel = Math.round(row.z - ls.z);
  if (rel !== 0 && rel !== 1) return;
  var vol = rel === 0 ? 1 : 0.7;
  for (var i = 0; i < row.vehicles.length; i++) {
    var v = row.vehicles[i];
    var dx = v.x - ls.x, adx = Math.abs(dx);
    if (adx > 10) { v.heard = 0; v.tracked = false; v.nm = false; v.minD = undefined; continue; }
    // close call: you stood in the lane and a vehicle swept by with only a sliver to spare
    if (dz < 0.5 && !ls.ghost && this.onNearMiss && !v.nm) {
      var clear = adx - (v.halfWidth + CONFIG.HIT_MARGIN);
      var passedBy = dx * row.dir > 0;
      if (!passedBy && clear > 0 && clear < 0.9) { v.tracked = true; v.minD = Math.min(v.minD === undefined ? 9 : v.minD, clear); }
      else if (passedBy && v.tracked && v.minD < 0.55) { v.nm = true; v.tracked = false; this.onNearMiss(v, row); }
    }
    var big = v.kind === 'truck' || v.kind === 'bus';
    if (dx * row.dir < 0 && adx < 6 && !(v.heard & 1)) { // approaching
      v.heard |= 1;
      if (this.hornCool <= 0 && Math.random() < HORN_CHANCE[v.kind]) {
        this.hornCool = 0.8;
        GameAudio.carHorn(vol, big);
      }
    }
    if (adx < 1.8 && !(v.heard & 2)) { // passing right by
      v.heard |= 2;
      GameAudio.whoosh(vol * Utils.clamp(0.4 + v.speed / 9, 0.4, 1), big);
    }
  }
};

World.prototype.populateWater = function (row, dir, p, pads) {
  if (pads) return this.populatePads(row);
  var wrap = CONFIG.LANE_HALF;
  var loopLen = wrap * 2;
  var speed = Utils.randRange(1.1 + p * 1.2, 2.0 + p * 1.8);
  var spacing = Utils.randRange(5.5, 8.5);
  var count = Math.max(4, Math.round(loopLen / spacing));
  var lengths = [];
  for (var i = 0; i < count; i++) {
    lengths.push(Utils.weightedChoice([{ value: 2, weight: 0.36 }, { value: 3, weight: 0.4 }, { value: 4, weight: 0.24 }]));
  }
  var centers = layoutLoop(lengths, loopLen, 1.4);
  row.loop = { wrap: wrap, len: loopLen };
  for (var j = 0; j < centers.length; j++) {
    var mesh = Models.buildLog(lengths[j]);
    mesh.position.set(centers[j], -0.12, 0);
    row.group.add(mesh);
    row.logs.push({
      mesh: mesh, x: centers[j], halfWidth: lengths[j] / 2, speed: speed, direction: dir,
      baseY: -0.12, top: 0.05, dip: 0, bob: 0, phase: Math.random() * 6.28
    });
  }
};

// Lily-pad river: static pads. The carried path column is always paddable.
World.prototype.populatePads = function (row) {
  var PH = CONFIG.PLAY_HALF;
  var cols = {};
  var from = this.pathCol, to = from;
  if (Math.random() < 0.45) to = Utils.clamp(from + (Math.random() < 0.5 ? -1 : 1), -(PH - 1), PH - 1);
  cols[from] = true;
  cols[to] = true;
  this.pathCol = to;
  for (var x = -PH; x <= PH; x++) {
    if (!cols[x] && Math.random() < 0.42) cols[x] = true;
  }
  row.loop = null;
  for (var c = -PH; c <= PH; c++) {
    if (!cols[c]) continue;
    var mesh = Models.buildPad(Math.random() < 0.18);
    mesh.position.set(c, -0.2, 0);
    row.group.add(mesh);
    row.logs.push({
      mesh: mesh, x: c, halfWidth: 0.45, speed: 0, direction: 0,
      baseY: -0.2, top: -0.165, dip: 0, bob: 0, phase: Math.random() * 6.28, pad: true
    });
  }
  if (Math.random() < 0.3) this.placeCoin(row, false, cols);
  this.maybePlaceItem(row, row.z, false, cols);
};

// ---------------------------------------------------------------------------
// Railway
// ---------------------------------------------------------------------------
World.prototype.populateRail = function (row) {
  var PH = CONFIG.PLAY_HALF;
  var vh = CONFIG.GROUND_VISUAL_HALF;
  row.group.add(Utils.voxelMesh([
    { x: 0, y: row.top + 0.04, z: 0.28, w: vh * 2, h: 0.07, d: 0.07, color: CONFIG.COLORS.rail },
    { x: 0, y: row.top + 0.04, z: -0.28, w: vh * 2, h: 0.07, d: 0.07, color: CONFIG.COLORS.rail }
  ], { castShadow: false }));

  var sig = Models.buildSignal();
  sig.group.position.set(-PH - 1.4, row.top, -0.42);
  var sig2 = Models.buildSignal();
  sig2.group.position.set(PH + 1.4, row.top, -0.42);
  row.group.add(sig.group);
  row.group.add(sig2.group);

  row.train = {
    phase: 'idle',
    timer: Utils.randRange(1.5, 5.0),
    direction: Utils.choice([-1, 1]),
    mesh: null,
    signals: [sig, sig2],
    warnPulse: 0,
    ding: -1
  };
  if (Math.random() < 0.16) this.placeCoin(row, false);
};

World.prototype.setSignals = function (train, lampAOn, lampBOn) {
  train.signals.forEach(function (s) {
    s.lamps[0].forEach(function (m) { m.material = lampAOn ? s.on : s.off; });
    s.lamps[1].forEach(function (m) { m.material = lampBOn ? s.on : s.off; });
  });
};

World.prototype.spawnTrain = function (row) {
  var g = new THREE.Group();
  var seg = Models.TRAIN_SEG;
  var segCount = Utils.randInt(5, 9);
  for (var i = 0; i < segCount; i++) {
    var part = i === 0 ? Models.buildLocomotive() : Models.buildTrainCar();
    part.position.x = -i * seg;
    g.add(part);
  }
  var t = row.train;
  var wrap = CONFIG.LANE_HALF + 4;
  var length = segCount * seg;
  t.length = length;
  t.speed = Utils.randRange(17, 24);
  t.x = t.direction > 0 ? -wrap : wrap;
  g.position.set(t.x, row.top, 0);
  g.rotation.y = t.direction > 0 ? 0 : Math.PI;
  row.group.add(g);
  t.mesh = g;
};

// ---------------------------------------------------------------------------
// Per-frame simulation
// ---------------------------------------------------------------------------
World.prototype.update = function (dt, centerZ, playerZ, budget) {
  this.time += dt;
  centerZ = Math.round(centerZ);
  if (budget === undefined) budget = this.rows.size === 0 ? Infinity : 3;
  this.ensureRange(centerZ - CONFIG.ROWS_BEHIND, centerZ + CONFIG.ROWS_AHEAD, budget);
  this.pruneBefore(centerZ - CONFIG.ROWS_BEHIND - 2);
  Textures.update(this.time);

  var T = CONFIG.ROW_TYPES;
  var self = this;
  var time = this.time;
  var mg = this.magnet;
  var nearRoad = 99;
  this.hornCool -= dt;

  this.rows.forEach(function (row) {
    var rel = row.z - playerZ; // playerZ is the chicken's row
    // road hum: only your own lane and the one just ahead
    if ((rel === 0 || rel === 1) && row.type === T.ROAD) nearRoad = 0;
    // trains are a safety warning, so they reach a little further:
    // the lane behind you, your own, and up to three lanes ahead
    var vol = rel >= -1 && rel <= 3 ? 1 - Math.max(0, rel) * 0.2 : 0;

    var c, i;
    for (c = row.coins.length - 1; c >= 0; c--) {
      var coin = row.coins[c];
      if (coin.collected) continue;
      var spin = coin.mesh.userData.spin;
      spin.rotation.y += dt * 3.2;
      spin.position.y = 0.5 + Math.sin(time * 3 + coin.phase) * 0.06;
      if (mg) self.pullCoin(row, coin, mg, dt);
      else if (coin.pulled) { coin.pulled = false; coin.mesh.position.set(coin.x, row.top, 0); }
    }
    for (i = 0; i < row.items.length; i++) {
      var it = row.items[i];
      if (it.collected) continue;
      var bob = Math.sin(time * 3.2 + it.phase);
      it.mesh.userData.sprite.position.y = 0.85 + bob * 0.09;
      var sc = 0.85 + Math.sin(time * 5 + it.phase) * 0.04;
      it.mesh.userData.sprite.scale.set(sc, sc, 1);
      it.mesh.userData.ring.scale.setScalar(1 + (bob * 0.5 + 0.5) * 0.35);
    }

    if (row.type === T.ROAD) {
      self.updateRoad(row, dt);
    } else if (row.type === T.WATER) {
      var w2 = row.loop ? row.loop.wrap : 0, l2 = row.loop ? row.loop.len : 0;
      for (var j = 0; j < row.logs.length; j++) {
        var l = row.logs[j];
        if (l.speed) {
          l.x += l.direction * l.speed * dt;
          if (l.x > w2) l.x -= l2;
          else if (l.x < -w2) l.x += l2;
          l.mesh.position.x = l.x;
        }
        l.dip += (0 - l.dip) * (1 - Math.exp(-dt * 9));
        l.bob = Math.sin(time * 2.1 + l.phase) * 0.018;
        l.mesh.position.y = l.baseY + l.bob - l.dip;
      }
    } else if (row.type === T.RAIL) {
      self.updateTrain(row, dt, vol);
    }
  });

  this.amb.traffic = nearRoad === 0 ? 1 : 0;
};

// Magnet: coins near the player fly in, and are collected on arrival.
World.prototype.pullCoin = function (row, coin, mg, dt) {
  var m = coin.mesh.position;
  var dx = mg.x - m.x, dz = (mg.z - row.z) - m.z, dy = mg.y - m.y;
  var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (!coin.pulled) {
    if (Math.abs(row.z - mg.z) > 6 || Math.sqrt(dx * dx + dz * dz) > 6.5) return;
    coin.pulled = true;
  }
  if (dist < 0.5) {
    coin.collected = true;
    row.group.remove(coin.mesh);
    Utils.disposeObject3D(coin.mesh);
    if (this.onMagnetCoin) this.onMagnetCoin(coin, row);
    return;
  }
  var step = Math.min(dist, (8 + Math.max(0, 7 - dist) * 3) * dt);
  m.x += dx / dist * step;
  m.y += dy / dist * step;
  m.z += dz / dist * step;
};

// Blast power-up: wipes out every vehicle (and train) within `radius` tiles.
// Vehicles come back later from the edge of the lane. Returns how many died.
World.prototype.blast = function (px, pz, radius) {
  var T = CONFIG.ROW_TYPES;
  var destroyed = 0;
  var blastColors = [0xff7a1a, 0xffc233, 0xfff3b0, 0x555555];
  var self = this;
  this.rows.forEach(function (row) {
    var dz = row.z - pz;
    if (Math.abs(dz) > radius) return;
    if (row.type === T.ROAD) {
      for (var vi = row.vehicles.length - 1; vi >= 0; vi--) {
        var v = row.vehicles[vi];
        if (Math.hypot(v.x - px, dz) > radius + 1.5) continue;
        if (v.mesh) row.group.remove(v.mesh);
        row.vehicles.splice(vi, 1);
        destroyed++;
        Particles.burst(v.x, row.top + 0.5, row.z, { colors: blastColors, count: 16, speed: 4.5, up: 7, size: 0.2, life: 0.9, gravity: 12, spread: 0.5, floor: row.top });
      }
    } else if (row.type === T.RAIL && row.train && row.train.phase !== 'idle') {
      var t = row.train;
      if (t.phase === 'crossing' && t.mesh) {
        var far = Math.abs(t.x - px) > radius + 10 && Math.abs(t.x - t.direction * t.length - px) > radius + 10;
        if (far) return;
        for (var k = 0; k < t.length; k += 2) {
          Particles.burst(t.x - t.direction * k, row.top + 0.6, row.z, { colors: blastColors, count: 8, speed: 4, up: 6, size: 0.2, life: 0.9, gravity: 12, spread: 0.4, floor: row.top });
        }
        row.group.remove(t.mesh);
        Utils.disposeObject3D(t.mesh);
        t.mesh = null;
        destroyed += 3;
      }
      t.phase = 'idle';
      t.timer = Utils.randRange(4, 8);
      self.setSignals(t, false, false);
    }
  });
  return destroyed;
};

// A train's timeline: the whistle and the signal bells start about 2 s before
// it appears, and it needs ~2 s more to reach the playing field - so you get
// a 3-4 second heads-up.
World.prototype.updateTrain = function (row, dt, vol) {
  var t = row.train;
  if (this.frozen) return; // Time Freeze: the whole railway holds its breath
  t.timer -= dt;
  if (t.phase === 'idle') {
    if (t.timer <= 0) {
      t.phase = 'warning';
      t.timer = 1.9;
      t.warnPulse = 0;
      t.ding = -1;
      t.toot = false;
      if (vol > 0 && GameAudio) GameAudio.trainWhistle(vol);
    }
  } else if (t.phase === 'warning') {
    t.warnPulse += dt;
    var step = Math.floor(t.warnPulse * 3);
    var blink = step % 2 === 0;
    this.setSignals(t, blink, !blink);
    if (step !== t.ding) {
      t.ding = step;
      if (vol > 0 && GameAudio) GameAudio.bell(blink, vol);
    }
    if (!t.toot && t.warnPulse > 1.5) {
      t.toot = true;
      if (vol > 0 && GameAudio) GameAudio.trainToot(vol);
    }
    if (t.timer <= 0) {
      t.phase = 'crossing';
      t.passed = false;
      this.spawnTrain(row);
    }
  } else if (t.phase === 'crossing') {
    var flash = Math.floor(this.time * 6) % 2 === 0;
    this.setSignals(t, flash, !flash);
    if (vol > 0 && GameAudio && Math.floor(this.time * 3) !== t.ding) {
      t.ding = Math.floor(this.time * 3);
      GameAudio.bell(flash, vol * 0.7);
    }
    t.x += t.direction * t.speed * dt;
    t.mesh.position.x = t.x;
    var ls = this.listener;
    if (!t.passed && ls && vol > 0 && (t.direction > 0 ? t.x > ls.x - 8 : t.x < ls.x + 8)) {
      t.passed = true;
      GameAudio.trainPass(vol);
    }
    var edge = CONFIG.LANE_HALF + 4;
    var gone = t.direction > 0 ? t.x - t.length > edge : t.x + t.length < -edge;
    if (gone) {
      row.group.remove(t.mesh);
      Utils.disposeObject3D(t.mesh);
      t.mesh = null;
      t.phase = 'idle';
      t.timer = Utils.randRange(4, 9);
      t.direction = Utils.choice([-1, 1]);
      this.setSignals(t, false, false);
    }
  }
};

// ---------------------------------------------------------------------------
// Queries used by the player
// ---------------------------------------------------------------------------
World.prototype.getRow = function (z) {
  return this.rows.get(z);
};

World.prototype.isBlocked = function (x, z) {
  var row = this.rows.get(z);
  if (!row) return true;
  if (Math.abs(x) > CONFIG.PLAY_HALF) return true;
  return !!row.blocked[x];
};

// Returns the vehicle that is hitting a chicken standing at (x, z), or null.
World.prototype.checkVehicleHit = function (x, z) {
  var row = this.rows.get(z);
  if (!row || row.type !== CONFIG.ROW_TYPES.ROAD) return null;
  for (var i = 0; i < row.vehicles.length; i++) {
    var v = row.vehicles[i];
    if (Math.abs(v.x - x) < v.halfWidth + CONFIG.HIT_MARGIN) return v;
  }
  return null;
};

World.prototype.checkTrainHit = function (x, z) {
  var row = this.rows.get(z);
  if (!row || row.type !== CONFIG.ROW_TYPES.RAIL || !row.train) return false;
  var t = row.train;
  if (t.phase !== 'crossing' || !t.mesh) return false;
  var seg = Models.TRAIN_SEG;
  var minX = t.x - (t.direction > 0 ? t.length - seg / 2 : seg / 2);
  var maxX = t.x + (t.direction > 0 ? seg / 2 : t.length - seg / 2);
  return x >= minX - CONFIG.HIT_MARGIN && x <= maxX + CONFIG.HIT_MARGIN;
};

// A log or lily pad that carries a chicken standing at x on this water row.
World.prototype.getLogAt = function (x, z) {
  var row = this.rows.get(z);
  if (!row || row.type !== CONFIG.ROW_TYPES.WATER) return null;
  for (var i = 0; i < row.logs.length; i++) {
    var l = row.logs[i];
    if (Math.abs(l.x - x) < l.halfWidth + 0.1) return l;
  }
  return null;
};

World.prototype.isWater = function (z) {
  var row = this.rows.get(z);
  return !!row && row.type === CONFIG.ROW_TYPES.WATER;
};

// Surface height a chicken lands on at (x, z).
World.prototype.surfaceY = function (x, z) {
  var row = this.rows.get(z);
  if (!row) return 0;
  if (row.type === CONFIG.ROW_TYPES.WATER) {
    var l = this.getLogAt(x, z);
    return l ? l.top : row.top;
  }
  return row.top;
};

World.prototype.tryCollectCoin = function (x, z) {
  var row = this.rows.get(z);
  if (!row) return null;
  for (var i = 0; i < row.coins.length; i++) {
    var c = row.coins[i];
    if (!c.collected && Math.round(x) === c.x) {
      c.collected = true;
      row.group.remove(c.mesh);
      Utils.disposeObject3D(c.mesh);
      return c;
    }
  }
  return null;
};

World.prototype.tryCollectItem = function (x, z) {
  var row = this.rows.get(z);
  if (!row) return null;
  for (var i = 0; i < row.items.length; i++) {
    var it = row.items[i];
    if (!it.collected && Math.round(x) === it.x) {
      it.collected = true;
      row.group.remove(it.mesh);
      Utils.disposeObject3D(it.mesh);
      return it;
    }
  }
  return null;
};

World.prototype.trainWarningActive = function (z) {
  var row = this.rows.get(z);
  return !!row && !!row.train && row.train.phase === 'warning';
};

World.prototype.destroy = function () {
  Utils.disposeObject3D(this.group);
  this.scene.remove(this.group);
  this.rows.clear();
};
