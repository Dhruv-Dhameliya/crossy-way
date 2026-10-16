// Procedural endless world: bands of grass / road / river / railway lanes with
// their trees, traffic, logs, lily pads, trains and coins. Every row belongs to a
// biome. The Forest is handled right here; any other biome only plugs in through
// the optional hooks of its theme (Biome.theme(row.biome), see config.js), so this
// file never mentions a particular biome. Extra hazards: sliding
// ice lanes, crocodile logs and moving platforms over a chasm.
function World(scene) {
  this.scene = scene;
  this.rows = new Map(); // z -> row data
  this.group = new THREE.Group();
  this.scene.add(this.group);
  this.band = null;      // the band currently being generated
  this.pathCol = 0;      // a column that is always passable, carried upward row by row
  this.genZ = null;      // the next row to generate (rows are only ever built strictly upward)
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
  return Utils.clamp(z / Difficulty.cur.ramp, 0, 1);
};

// ---------------------------------------------------------------------------
// Band planning. Lanes come in runs: 1-4 grass rows, then a
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
    // slippery ice patch: needs a couple of rows to be worth sliding on
    band.ice = z > 12 && band.left >= 2 && Math.random() < 0.17 * Difficulty.cur.special;
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
    // a rare stampede lane (one row), fast bike lanes, and double railways
    var sp = Difficulty.cur.special;
    band.stampede = type === T.ROAD && z > 30 && Math.random() < 0.05 * sp;
    if (band.stampede) band.left = 1;
    band.bikes = type === T.ROAD && !band.stampede && z > 20 && Math.random() < 0.16 * sp;
    band.dual = type === T.RAIL && band.left === 2 && z > 35 && Math.random() < 0.6 * sp;
    // some rivers are full of turtles that dive now and then
    band.turtles = type === T.WATER && !band.pads && z > 22 && Math.random() < 0.26 * Difficulty.cur.special;
    var plainRiver = type === T.WATER && !band.pads && !band.turtles;
    // crocodile logs, and a chasm crossed on moving platforms
    band.crocs = plainRiver && z > 16 && Math.random() < 0.26 * Difficulty.cur.special;
    band.voidLane = plainRiver && !band.crocs && z > 26 && Math.random() < 0.22 * Difficulty.cur.special;
    if (band.voidLane) band.left = Math.min(band.left, 2);
    // rotten logs that crumble under your feet
    band.crumble = plainRiver && !band.crocs && !band.voidLane && z > 20 && Math.random() < 0.22 * Difficulty.cur.special;
  }
  this.band = band;
};

// budget caps how many new rows are built in one call so a frame never
// hitches on generation (rows are built bottom-up, so order is preserved).
// Generation always continues from the top row built so far: rebuilding a row that
// was already pruned (after stepping back) would corrupt the band and the pathCol
// corridor, which both describe the TOP of the world.
World.prototype.ensureRange = function (fromZ, toZ, budget) {
  if (this.genZ === null) this.genZ = fromZ;
  while (this.genZ <= toZ) {
    if (budget-- <= 0) return;
    this.generateRow(this.genZ);
    this.genZ++;
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
  var biome = Biome.forRow(z);
  var variant = type === T.GRASS && band.ice ? 'ice' : type === T.WATER && band.voidLane ? 'void' : undefined;
  var ground = new THREE.Mesh(Textures.getGroundGeometry(type), Textures.getGroundMaterials(type, parity, edge, biome, variant));
  ground.position.y = (top + CONFIG.ROW_BOTTOM) / 2;
  ground.receiveShadow = true;
  group.add(ground);

  var row = {
    z: z, type: type, top: top, group: group, blocked: {}, small: {}, vehicles: [], logs: [], coins: [], items: [], train: null,
    biome: biome, ice: variant === 'ice', void: variant === 'void',
    bikes: type === T.ROAD && !!band.bikes, stampede: type === T.ROAD && !!band.stampede
  };
  if (z > 0 && Biome.mode === 'auto' && Biome.forRow(z - 1) !== biome) {
    // the world changes here: a pair of gate pillars marks the border
    var gate = Models.buildGate(biome);
    gate.position.y = top;
    group.add(gate);
  }

  var dir = band.dir || 1;
  if (type !== T.GRASS && type !== T.RAIL) band.dir = Math.random() < 0.85 ? -dir : dir;

  if (type === T.GRASS) this.populateGrass(row, z, p);
  else if (type === T.ROAD) this.populateRoad(row, dir, p);
  else if (type === T.WATER) this.populateWater(row, dir, p, band);
  else {
    this.populateRail(row);
    if (band.dual) {                       // two railways that warn and fire together, in opposite directions
      if (band.twinTrain) { row.train.twin = band.twinTrain; band.twinTrain.twin = row.train; row.train.direction = -band.twinTrain.direction; }
      else band.twinTrain = row.train;
      row.dual = true;
    }
  }

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
      if (Math.random() < 0.06) Models.flowerBoxes(boxes, x, 0, row.biome);
      continue;
    }
    if (Math.random() < density) {
      var kind = Models.obstacleBoxes(boxes, x, 0, row.biome); // tree, rock, bush, hay bale, fence, scarecrow, stump, barrels, sunflower, mushroom (or a biome's own twins of them)
      row.blocked[x] = true;
      if (Models.isSmallObstacle(kind)) row.small[x] = true; // the Jump power-up can hop over these
    } else if (Math.random() < 0.07) {
      Models.flowerBoxes(boxes, x, 0, row.biome);
    }
  }

  // The forest outside the playable strip.
  var span = CONFIG.TREE_HALF - PH;
  for (var d = 1; d <= span; d++) {
    var chance = d === 1 ? 1 : Utils.lerp(0.92, 0.5, d / span);
    [-1, 1].forEach(function (side) {
      if (Math.random() < chance) {
        var kind = Math.random() < 0.65 ? Utils.choice([1, 1, 2, 2, 0]) : 3;
        Models.treeBoxes(boxes, side * (PH + d), 0, kind, row.biome);
      } else if (Math.random() < 0.15) {
        Models.rockBoxes(boxes, side * (PH + d), 0, row.biome);
      }
    });
  }
  if (boxes.length) row.group.add(Utils.voxelMesh(boxes, { material: Biome.theme(row.biome).sceneryMaterial ? Biome.theme(row.biome).sceneryMaterial() : Models.sceneryMaterial() })); // trees sway in the wind

  if (z > 0) {
    var r = Math.random();
    var cm = Difficulty.cur.coins || 1;   // Zen scatters extra coins
    if (r < 0.07 * cm) this.placeCoinTrail(row);
    else if (r < 0.36 * cm) this.placeCoin(row, true);
    if (Math.random() < 0.12 * cm) this.placeCoin(row, true);
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
  for (var i = 0; i < row.coins.length; i++) if (!row.coins[i].collected && row.coins[i].x === x) return;   // one coin per tile
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
// Looping lanes (logs and turtles): evenly-ish spaced items on a closed loop
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
var DEFAULT_DUST = [0xb89a6a, 0x9c8056];    // the dust under a stampede (a theme may set dustColors)
var VEHICLE_PACE = { bicycle: 1.9, herd: 1, truck: 0.85, bus: 0.8, van: 0.95, sedan: 1.1, taxi: 1.25, police: 1.4, motorbike: 1.5, tractor: 0.55, ambulance: 1.4, icecream: 0.8, sports: 1.8 };
var SPEED_FLOOR = 2.8;   // nothing crawls
var SPEED_CEIL = 11;

// Every vehicle gets its own speed when it enters the lane and keeps it until
// it leaves: no slowing down, no speeding up, no braking near the chicken.
World.prototype.rollVehicle = function (row) {
  var D = Difficulty.cur;
  if (row.stampede) return { kind: 'herd', len: Models.vehicleLength('herd', row.biome), speed: row.herdSpeed };   // the whole herd runs at one speed
  if (row.bikes) {
    var bs = Utils.clamp(row.laneBase * VEHICLE_PACE.bicycle * Utils.randRange(0.9, 1.15), Math.max(3, SPEED_FLOOR * D.speed * 1.3), SPEED_CEIL * D.speed * 1.15);
    return { kind: 'bicycle', len: Models.vehicleLength('bicycle', row.biome), speed: bs };
  }
  var kind = Models.pickVehicleKind();
  var speed = Utils.clamp(row.laneBase * VEHICLE_PACE[kind] * Utils.randRange(1.075 - 0.475 * (D.spread || 1), 1.075 + 0.475 * (D.spread || 1)), Math.max(2.0, SPEED_FLOOR * D.speed), SPEED_CEIL * D.speed);
  return { kind: kind, len: Models.vehicleLength(kind, row.biome), speed: speed };
};

// With different constant speeds a faster vehicle could catch a slower one,
// so a new vehicle only enters once there is enough room that it cannot catch
// the one ahead before that one leaves the lane. Returns that required gap.
World.prototype.requiredGap = function (row, lead, cand) {
  var D = Difficulty.cur;
  var minGap = (2.2 + 0.18 * cand.speed) / Math.sqrt(D.traffic) * (row.bikes ? 0.6 : 1);
  if (!lead || cand.speed <= lead.speed) return minGap;
  var L = row.laneLen;
  var tLead = Math.max(0, (L + lead.halfWidth - lead.s) / lead.speed);
  var tSelf = (L + cand.len) / cand.speed;
  return minGap + (cand.speed - lead.speed) * Math.min(tLead, tSelf); // never scaled down: this is what keeps vehicles from ever overlapping
};

World.prototype.populateRoad = function (row, dir, p) {
  row.dir = dir;
  row.laneLen = CONFIG.LANE_HALF * 2;
  row.laneBase = Utils.randRange(3.2 + p * 1.2, 6.4 + p * 2.6) * Difficulty.cur.speed; // lane tempo
  row.density = (1 - p * 0.25) / Difficulty.cur.traffic; // smaller = more crowded
  row.herdSpeed = Utils.randRange(7.5, 10) * Math.sqrt(Difficulty.cur.speed);
  row.wantGap = this.nextGap(row);
  row.pending = null;
  row.live = false;
  // Run the lane offline for a while so it starts already full of traffic.
  for (var i = 0; i < 175; i++) this.laneStep(row, 0.2);
  row.live = true;
  for (var j = 0; j < row.vehicles.length; j++) this.attachVehicleMesh(row, row.vehicles[j]);
  if (Math.random() < 0.12) this.placeCoin(row, false);
};

// Space to leave before the next vehicle: bikes come in tight streams, a herd in packs.
World.prototype.nextGap = function (row) {
  if (row.stampede) return Math.random() < 0.72 ? Utils.randRange(0.25, 0.8) : Utils.randRange(6, 11) * row.density;
  if (row.bikes) return Utils.randRange(1.8, 4.5) * row.density;
  return Utils.randRange(3.4, 9.5) * row.density;
};

World.prototype.attachVehicleMesh = function (row, v) {
  var mesh = Models.buildVehicle(v.kind, row.biome);
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
    if (v.mesh) {
      v.mesh.position.x = v.x;
      // a little suspension bounce and body roll, livelier the faster they go
      var tm = this.time, sp = Math.min(1.5, v.cur / 4);
      var Th = Biome.theme(row.biome);
      if (row.stampede && this.listener && Math.abs(v.x - this.listener.x) < 10 && (v.dust = (v.dust || 0) - dt) <= 0) {
        v.dust = 0.1;                                         // a cloud of dust under every hoof
        Particles.puff(v.x - row.dir * 0.5, row.top + 0.05, row.z, Th.dustColors || DEFAULT_DUST);
      }
      if (Th.vehicleBob) Th.vehicleBob(v, row, tm);   // e.g. floating spaceships
      else {
        v.mesh.position.y = row.top + Math.sin(tm * (7 + v.cur * 0.8) + v.ph) * 0.012 * sp;
        v.mesh.rotation.z = Math.sin(tm * (5 + v.cur * 0.5) + v.ph * 1.7) * 0.014 * sp;
      }
    }
  }
  if (frozen) return; // no new traffic while time is frozen

  if (!row.pending) row.pending = this.rollVehicle(row);
  var cand = row.pending;
  var lead = vs.length ? vs[vs.length - 1] : null; // the most recent arrival
  // a newcomer may only be a little faster than the vehicle ahead (keeps roads busy, not empty)
  if (lead && cand.speed > lead.speed * 1.35) cand.speed = Math.max(Math.max(2.0, SPEED_FLOOR * Difficulty.cur.speed), lead.speed * 1.35);
  var gap0 = lead ? lead.s - lead.halfWidth : Infinity; // room between the entry line and the last vehicle
  var need = lead ? (row.stampede ? Math.max(0.2, row.wantGap) : Math.max(row.wantGap, this.requiredGap(row, lead, cand))) : 0;
  if (gap0 >= need) {
    var v2 = {
      kind: cand.kind, speed: cand.speed, cur: cand.speed, halfWidth: cand.len / 2, direction: dir,
      s: -cand.len / 2, x: 0, mesh: null, heard: 0, ph: Math.random() * 6.28
    };
    v2.x = dir > 0 ? v2.s - wrap : wrap - v2.s;
    vs.push(v2);
    if (row.live) this.attachVehicleMesh(row, v2);
    row.pending = null;
    row.wantGap = this.nextGap(row);
  }
};

var HORN_CHANCE = { truck: 0.6, bus: 0.5, taxi: 0.5, police: 0.3, van: 0.25, sedan: 0.2, motorbike: 0.35, tractor: 0.5, sports: 0.4 };
var SPECIAL_SOUND = { ambulance: 'siren', icecream: 'jingle', bicycle: 'bikeBell', herd: 'stomp' }; // signature sounds

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
    var big = v.kind === 'truck' || v.kind === 'bus' || v.kind === 'tractor';
    if (dx * row.dir < 0 && adx < 6 && !(v.heard & 1)) { // approaching
      v.heard |= 1;
      var special = SPECIAL_SOUND[v.kind];
      if (special) {
        if (this.hornCool <= 0) { this.hornCool = 1.4; GameAudio[special](vol); }
      } else if (this.hornCool <= 0 && Math.random() < HORN_CHANCE[v.kind]) {
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

World.prototype.populateWater = function (row, dir, p, band) {
  if (band.pads) return this.populatePads(row);
  if (band.turtles) return this.populateTurtles(row, dir, p);
  if (band.voidLane) return this.populatePlatforms(row, p);
  var wrap = CONFIG.LANE_HALF;
  var loopLen = wrap * 2;
  var speed = Utils.randRange(1.1 + p * 1.2, 2.0 + p * 1.8) * Difficulty.cur.speed;
  var spacing = Utils.randRange(5.5, 8.5);
  var count = Math.max(4, Math.round(loopLen / spacing));
  var lengths = [];
  for (var i = 0; i < count; i++) {
    lengths.push(Utils.weightedChoice([{ value: 2, weight: 0.36 }, { value: 3, weight: 0.4 }, { value: 4, weight: 0.24 }]));
  }
  var centers = layoutLoop(lengths, loopLen, 1.4);
  row.loop = { wrap: wrap, len: loopLen };
  // crocodile rivers: some of the longer logs are crocodiles
  var crocLeft = band.crocs ? Utils.randInt(2, 3) : 0;
  for (var j = 0; j < centers.length; j++) {
    var entry;
    if (crocLeft > 0 && lengths[j] >= 3) {
      crocLeft--;
      var croc = Models.buildCroc(lengths[j], row.biome);
      croc.group.position.set(centers[j], -0.12, 0);
      croc.group.rotation.y = dir > 0 ? 0 : Math.PI;   // (a laser strike is symmetrical)
      row.group.add(croc.group);
      var cyc = Utils.randRange(3.4, 4.6);
      entry = {
        mesh: croc.group, x: centers[j], halfWidth: lengths[j] / 2, speed: speed, direction: dir,
        baseY: -0.12, top: 0.05, dip: 0, bob: 0, phase: Math.random() * 6.28,
        croc: true, jaw: croc.jaw, fx: croc.fx, onFire: croc.onFire, onKill: croc.onKill, cycle: cyc, t0: Utils.randRange(0, cyc), open: 0, snapped: false
      };
    } else {
      var rot = !!band.crumble && Math.random() < 0.7;
      var mesh = Models.buildLog(lengths[j], row.biome, rot ? 'rotten' : undefined);
      mesh.position.set(centers[j], -0.12, 0);
      row.group.add(mesh);
      entry = {
        mesh: mesh, x: centers[j], halfWidth: lengths[j] / 2, speed: speed, direction: dir,
        baseY: -0.12, top: 0.05, dip: 0, bob: 0, phase: Math.random() * 6.28,
        crumble: rot ? { state: 'idle', t: 0, warned: false } : null, sink: 0, wob: 0, submerged: false
      };
      if (rot) row.crumbly = true;
    }
    row.logs.push(entry);
  }
};

// A chasm: nothing to stand on but a few platforms that slide back and forth.
World.prototype.populatePlatforms = function (row, p) {
  var PH = CONFIG.PLAY_HALF;
  row.loop = null;
  var n = 4;
  var step = (PH * 2) / (n - 1);
  var base = Utils.randRange(0.55, 0.8) + p * 0.25;
  for (var i = 0; i < n; i++) {
    var w = Utils.weightedChoice([{ value: 2, weight: 0.6 }, { value: 3, weight: 0.4 }]);
    var cx = -PH + i * step + Utils.randRange(-0.3, 0.3);
    var amp = Utils.randRange(1.5, 2.2);
    var omega = base * Utils.randRange(0.85, 1.2) * Math.sqrt(Difficulty.cur.speed);
    var mesh = Models.buildPlatform(w, row.biome);
    mesh.position.set(cx, -0.12, 0);
    row.group.add(mesh);
    row.logs.push({
      mesh: mesh, x: cx, halfWidth: w / 2, speed: 0, direction: 0, vx: 0,
      baseY: -0.12, top: 0.05, dip: 0, bob: 0, phase: Math.random() * 6.28,
      platform: true, sway: { cx: cx, amp: amp, w: omega, ph: Utils.randRange(0, 6.28) }
    });
  }
  if (Math.random() < 0.25) this.placeCoin(row, false);
};

// Turtle river: groups of turtles paddle along, but every so often they
// shake (a warning), then dive underwater for a couple of seconds - get off!
World.prototype.populateTurtles = function (row, dir, p) {
  var wrap = CONFIG.LANE_HALF;
  var loopLen = wrap * 2;
  var speed = Utils.randRange(1.0 + p * 0.8, 1.7 + p * 1.2) * Difficulty.cur.speed;
  var count = Math.max(5, Math.round(loopLen / Utils.randRange(5.5, 7.5)));
  var lengths = [];
  for (var i = 0; i < count; i++) lengths.push(Utils.weightedChoice([{ value: 2, weight: 0.55 }, { value: 3, weight: 0.45 }]));
  var centers = layoutLoop(lengths, loopLen, 1.6);
  row.loop = { wrap: wrap, len: loopLen };
  for (var j = 0; j < centers.length; j++) {
    var n = lengths[j];
    var mesh = Models.buildTurtles(n, row.biome);
    mesh.position.set(centers[j], -0.12, 0);
    mesh.rotation.y = dir > 0 ? 0 : Math.PI;
    row.group.add(mesh);
    var cycle = Utils.randRange(7, 11);
    row.logs.push({
      mesh: mesh, x: centers[j], halfWidth: n * 1.05 / 2, speed: speed, direction: dir,
      baseY: -0.12, top: 0.08, dip: 0, bob: 0, phase: Math.random() * 6.28,
      turtle: true, cycle: cycle, t0: Utils.randRange(0, cycle), sink: 0, wob: 0, submerged: false, bubbled: false
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
    var mesh = Models.buildPad(Math.random() < 0.18, row.biome);
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
  if (!Biome.theme(row.biome).noRails) {
    var rails = Models.buildRails(Biome.colors(row.biome).rail);
    rails.position.y = row.top;
    row.group.add(rails);
  }

  var sig = Models.buildSignal(row.biome);
  sig.group.position.set(-PH - 1.4, row.top, -0.5); // fixed in the world: signals never move
  var sig2 = Models.buildSignal(row.biome);
  sig2.group.position.set(PH + 1.4, row.top, -0.5);
  row.group.add(sig.group);
  row.group.add(sig2.group);

  row.train = {
    phase: 'idle',
    timer: Utils.randRange(1.5, 5.0) * Difficulty.cur.train,
    direction: Utils.choice([-1, 1]),
    mesh: null,
    signals: [sig, sig2],
    warnPulse: 0,
    ding: -1
  };
  row.train.strip = Models.buildSignalStrip();
  row.train.strip.mesh.position.set(0, row.top + 0.03, -0.43);
  row.group.add(row.train.strip.mesh);
  if (Math.random() < 0.16) this.placeCoin(row, false);
};

// mode 'clear' = green (no train), 'red' = red lamps lit or dark (flashing = a train is coming)
World.prototype.setSignals = function (train, mode, blinkOn) {
  var clear = mode === 'clear';
  for (var i = 0; i < train.signals.length; i++) {
    var sg = train.signals[i];
    for (var k = 0; k < sg.green.length; k++) {
      sg.green[k].material = clear ? sg.mats.greenOn : sg.mats.greenOff;
      sg.red[k].material = !clear && blinkOn ? sg.mats.redOn : sg.mats.redOff;
    }
  }
  if (train.strip) train.strip.mesh.material = clear ? train.strip.mats.green : (blinkOn ? train.strip.mats.red : train.strip.mats.dark);
};

// A small, hoppable obstacle on this tile (Jump power-up)?
World.prototype.isSmallObstacle = function (x, z) {
  var row = this.rows.get(z);
  return !!row && !!row.small[x];
};

World.prototype.spawnTrain = function (row) {
  var g = new THREE.Group();
  var seg = Models.TRAIN_SEG;
  var segCount = Utils.randInt(5, 9);
  for (var i = 0; i < segCount; i++) {
    var part = i === 0 ? Models.buildLocomotive(row.biome) : Models.buildTrainCar(row.biome);
    part.position.x = -i * seg;
    g.add(part);
  }
  var t = row.train;
  var wrap = CONFIG.LANE_HALF + 4;
  var length = segCount * seg;
  t.length = length;
  t.speed = Utils.randRange(17, 24) * Math.sqrt(Difficulty.cur.speed);
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
  Models.setWind(time);

  this.rows.forEach(function (row) {
    var rel = row.z - playerZ; // playerZ is the chicken's row
    // road hum: only your own lane and the one just ahead
    if ((rel === 0 || rel === 1) && row.type === T.ROAD) nearRoad = 0;
    // trains are a safety warning, so they reach a little further:
    // the lane behind you, your own, and up to three lanes ahead
    var vol = rel >= -1 && rel <= 3 ? 1 - Math.max(0, rel) * 0.2 : 0;

    if (row.stampede && !row.heralded && rel >= 0 && rel <= 5 && row.vehicles.length) {
      row.heralded = true;
      if (self.onEvent) self.onEvent('stampede', row);
    }
    var c, i;
    for (c = row.coins.length - 1; c >= 0; c--) {
      var coin = row.coins[c];
      if (coin.collected) continue;
      if (coin.fall) {                        // coin rain: falls from the sky
        coin.delay -= dt;
        if (coin.delay > 0) continue;
        coin.mesh.visible = true;
        coin.vy += 16 * dt;
        coin.fall -= coin.vy * dt;
        if (coin.fall <= 0) { coin.fall = 0; coin.mesh.position.y = row.top; Particles.sparkle(coin.x, row.top + 0.3, row.z); }
        else coin.mesh.position.y = row.top + coin.fall;
      }
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
        if (l.sway) {
          // ping-pong platform: the velocity is what carries the chicken along
          var sw = l.sway;
          l.x = sw.cx + sw.amp * Math.sin(time * sw.w + sw.ph);
          l.vx = sw.amp * sw.w * Math.cos(time * sw.w + sw.ph);
          l.mesh.position.x = l.x;
        } else if (l.speed) {
          l.x += l.direction * l.speed * dt;
          if (l.x > w2) l.x -= l2;
          else if (l.x < -w2) l.x += l2;
          l.mesh.position.x = l.x;
          l.vx = l.direction * l.speed;
        } else l.vx = 0;
        l.dip += (0 - l.dip) * (1 - Math.exp(-dt * 9));
        l.bob = Math.sin(time * 2.1 + l.phase) * 0.018;
        if (l.turtle) self.updateTurtle(row, l, dt, time);
        else if (l.croc) self.updateCroc(row, l, dt, time, vol);
        else if (l.crumble) self.updateCrumble(row, l, dt, time, vol);
        l.mesh.position.y = l.baseY + l.bob - l.dip - (l.sink || 0) + (l.wob || 0);
        l.curTop = l.top + l.bob - l.dip - (l.sink || 0) + (l.wob || 0); // what the chicken stands on
        if (l.pad || l.turtle || l.platform) l.mesh.rotation.z = Math.sin(time * 1.6 + l.phase) * 0.02;
        else if (!l.croc && Biome.theme(row.biome).logSway) Biome.theme(row.biome).logSway(l, time);
      }
    } else if (row.type === T.RAIL) {
      self.updateTrain(row, dt, vol);
    }
  });

  this.amb.traffic = nearRoad === 0 ? 1 : 0;
};

// One turtle group: surface -> shake (warning) -> dive -> pop back up.
World.prototype.updateTurtle = function (row, l, dt, time) {
  var tt = (time + l.t0) % l.cycle;
  var warnStart = l.cycle - 3.2, diveStart = l.cycle - 2.0, riseStart = l.cycle - 0.6;
  var target = 0;
  l.wob = 0;
  if (tt >= warnStart && tt < diveStart) { target = 0.06; l.wob = Math.sin(time * 38) * 0.022; }
  else if (tt >= diveStart && tt < riseStart) target = 0.62;
  l.sink += (target - l.sink) * (1 - Math.exp(-dt * 9));
  l.submerged = l.sink > 0.3;
  if (tt >= diveStart && tt < riseStart && !l.bubbled) {
    l.bubbled = true;
    Particles.burst(l.x, row.top + 0.02, row.z, { colors: Biome.theme(row.biome).diveColors || [0xffffff, 0xcfeeff, 0x9be0ff], count: 8, speed: 1.4, up: 2.2, size: 0.09, life: 0.6, gravity: 2, spread: l.halfWidth, floor: row.top });
  } else if (tt < warnStart) l.bubbled = false;
};

// A rotten log: it shakes when you stand on it, then breaks up and sinks for a few
// seconds before floating back up.
World.prototype.updateCrumble = function (row, l, dt, time, vol) {
  var c = l.crumble, ls = this.listener, target = 0;
  l.wob = 0;
  if (c.state === 'idle') {
    var on = ls && Math.round(ls.z) === row.z && Math.abs(ls.x - l.x) < l.halfWidth + 0.1;
    if (on) c.t += dt; else c.t = Math.max(0, c.t - dt * 0.7);
    if (c.t > 0.6) {
      target = 0.05; l.wob = Math.sin(time * 46) * 0.03;
      if (!c.warned) { c.warned = true; if (vol > 0 && GameAudio && GameAudio.crack) GameAudio.crack(vol); }
    } else c.warned = false;
    if (c.t >= 1.5) {
      c.state = 'down'; c.t = 0;
      Particles.burst(l.x, row.top + 0.05, row.z, { colors: Biome.theme(row.biome).crumbleColors || [0x6b5a48, 0x4f4236, 0x5f8a3f], count: 10, speed: 2.4, up: 3, size: 0.12, life: 0.7, gravity: 12, spread: l.halfWidth, floor: row.top });
      if (vol > 0 && GameAudio && GameAudio.crack) GameAudio.crack(vol);
    }
  } else {
    target = 0.62; c.t += dt;
    if (c.t > 3) { c.state = 'idle'; c.t = 0; c.warned = false; }
  }
  l.sink += (target - l.sink) * (1 - Math.exp(-dt * 9));
  l.submerged = l.sink > 0.3;
};

// A crocodile: it dozes, opens its mouth a little (warning), then SNAPS. The head
// is only dangerous while the mouth is wide open.
World.prototype.updateCroc = function (row, l, dt, time, vol) {
  var tt = (time + l.t0) % l.cycle;
  var warn = l.cycle - 1.7, snap = l.cycle - 0.95, shut = l.cycle - 0.3;
  var target = 0;
  if (l.chomp > 0) { l.chomp -= dt; target = 0; }               // just ate the chicken: jaws clamp shut
  else if (tt >= warn && tt < snap) target = 0.32 + (tt - warn) / (snap - warn) * 0.18;
  else if (tt >= snap && tt < shut) target = 1;
  l.open += (target - l.open) * (1 - Math.exp(-dt * (target === 0 && l.chomp > 0 ? 30 : 13)));
  if (l.fx) l.fx(l.open); else l.jaw.rotation.z = -l.open * 0.78;
  if (tt >= snap && tt < shut && !l.snapped) {
    l.snapped = true;
    if (vol > 0) {
      if (l.onFire) l.onFire(vol);
      else if (GameAudio && GameAudio.crocGrowl) GameAudio.crocGrowl(vol);
    }
  } else if (tt < warn) l.snapped = false;
};

// The croc's dangerous head, if the chicken at (x, z) is standing in its open mouth.
World.prototype.checkCrocHit = function (x, z) {
  var row = this.rows.get(z);
  if (!row || row.type !== CONFIG.ROW_TYPES.WATER) return null;
  for (var i = 0; i < row.logs.length; i++) {
    var l = row.logs[i];
    if (!l.croc || l.open < 0.62) continue;
    var headX = l.x + l.direction * (l.halfWidth - Models.CROC_HEAD / 2);
    if (Math.abs(x - headX) < Models.CROC_HEAD / 2 + 0.12) return l;
  }
  return null;
};

// What happens to a chicken that ends up in this water lane: drown, or fall into the chasm.
World.prototype.drownType = function (z) {
  var row = this.rows.get(z);
  return row && (row.void || Biome.theme(row.biome).fallsInWater) ? 'fall' : 'drown';
};

World.prototype.isIce = function (x, z) {
  var row = this.rows.get(z);
  return !!row && row.ice;
};

// Coin rain: a shower of coins falls on the rows ahead. Returns how many.
World.prototype.coinRain = function (z0) {
  var PH = CONFIG.PLAY_HALF, n = 0;
  for (var z = z0 + 1; z <= z0 + 9; z++) {
    var row = this.rows.get(z);
    if (!row || row.type === CONFIG.ROW_TYPES.WATER) continue;
    for (var k = 0; k < 2; k++) {
      var x = Utils.randInt(-PH, PH);
      if (row.blocked[x]) continue;
      this.addCoin(row, x);
      var c = row.coins[row.coins.length - 1];
      c.fall = Utils.randRange(5, 8); c.delay = Utils.randRange(0, 1.8); c.vy = 0;
      c.mesh.visible = false;
      n++;
    }
  }
  return n;
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
      t.timer = Utils.randRange(4, 8) * Difficulty.cur.train;
      self.setSignals(t, 'clear');
    }
  });
  return destroyed;
};

// The Forest's railway sounds; a biome theme can replace them (theme.trainAudio).
var FOREST_TRAIN_AUDIO = {
  warn: function (v) { GameAudio.trainWhistle(v); },
  ping: function (b, v) { GameAudio.bell(b, v); },
  toot: function (v) { GameAudio.trainToot(v); },
  pass: function (v) { GameAudio.trainPass(v); }
};

// A train's timeline: the warning (whistle / alarm and flashing signals) starts
// `trainWarn` seconds before the train appears, and it needs about 2 s more to reach
// the playing field - so you always get a few seconds' heads-up.
World.prototype.updateTrain = function (row, dt, vol) {
  var t = row.train;
  var A = Biome.theme(row.biome).trainAudio || FOREST_TRAIN_AUDIO;
  if (this.frozen) return; // Time Freeze: the whole railway holds its breath
  t.timer -= dt;
  if (t.phase === 'idle') {
    if (t.timer <= 0) {
      if (t.twin && t.twin.phase === 'idle') { t.twin.timer = 0; t.twin.direction = -t.direction; }   // the other track fires too
      t.phase = 'warning';
      t.timer = Difficulty.cur.trainWarn;
      t.warnPulse = 0;
      t.ding = -1;
      t.toot = false;
      if (vol > 0 && GameAudio) A.warn(vol);
    }
  } else if (t.phase === 'warning') {
    t.warnPulse += dt;
    var step = Math.floor(t.warnPulse * 3);
    var blink = step % 2 === 0;
    this.setSignals(t, 'red', blink); // flashing red: a train is coming
    if (step !== t.ding) {
      t.ding = step;
      if (vol > 0 && GameAudio) A.ping(blink, vol);
    }
    if (!t.toot && t.warnPulse > 1.5) {
      t.toot = true;
      if (vol > 0 && GameAudio) A.toot(vol);
    }
    if (t.timer <= 0) {
      t.phase = 'crossing';
      t.passed = false;
      this.spawnTrain(row);
    }
  } else if (t.phase === 'crossing') {
    var flash = Math.floor(this.time * 6) % 2 === 0;
    this.setSignals(t, 'red', flash);
    if (vol > 0 && GameAudio && Math.floor(this.time * 3) !== t.ding) {
      t.ding = Math.floor(this.time * 3);
      A.ping(flash, vol * 0.7);
    }
    t.x += t.direction * t.speed * dt;
    t.mesh.position.x = t.x;
    var ls = this.listener;
    if (!t.passed && ls && vol > 0 && (t.direction > 0 ? t.x > ls.x - 8 : t.x < ls.x + 8)) {
      t.passed = true;
      A.pass(vol);
    }
    var edge = CONFIG.LANE_HALF + 4;
    var gone = t.direction > 0 ? t.x - t.length > edge : t.x + t.length < -edge;
    if (gone) {
      row.group.remove(t.mesh);
      Utils.disposeObject3D(t.mesh);
      t.mesh = null;
      t.phase = 'idle';
      t.timer = Utils.randRange(4, 9) * Difficulty.cur.train;
      t.direction = Utils.choice([-1, 1]);
      this.setSignals(t, 'clear'); // green again
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
    if (!l.submerged && Math.abs(l.x - x) < l.halfWidth + 0.1) return l;
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
    if (!c.collected && !c.fall && Math.round(x) === c.x) {          // (a coin still in the sky can't be picked up)
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
