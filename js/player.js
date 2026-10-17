// The voxel chicken: grid hopping with squash & stretch, gliding on ice, riding
// logs and platforms, being carried by conveyor belts, bouncing on trampoline lanes,
// slogging through mud, coin pickup and every way to die (car, train, drowning,
// a crocodile, falling into a chasm, the eagle). Also owns the shop's companions
// (the pet and the aura) and plays the worn death animation.
function Player(scene) {
  this.scene = scene;
  this.group = new THREE.Group();
  this.themeName = 'forest';
  this.themeSuit = null;
  this.buildModel();
  this.scene.add(this.group);

  var eagle = Models.buildEagle();
  this.eagleParts = eagle;
  this.eagle = eagle.group;
  this.eagle.rotation.order = 'YXZ'; // yaw, then pitch, then bank
  this.eagle.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  this.eagle.visible = false;
  this.eagle.scale.setScalar(1.3);
  this.scene.add(this.eagle);
  this.eagleStartPos = new THREE.Vector3();
  this.eagleCtrlPos = new THREE.Vector3();
  this.eagleGrabPoint = new THREE.Vector3();
  this.eagleExitDir = new THREE.Vector3();
  this.eagleTmp = new THREE.Vector3();
  this.eagleTan = new THREE.Vector3();
  var esg = new THREE.CircleGeometry(0.5, 20);
  esg.rotateX(-Math.PI / 2);
  this.eagleShadow = new THREE.Mesh(esg, new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2
  }));
  this.eagleShadow.renderOrder = 1;
  this.eagleShadow.visible = false;
  this.scene.add(this.eagleShadow);
  this.onEagleGrab = null;
  this.suit = false;
  // A biome theme can replace the eagle with its own attacker (theme.attack).
  this.attackTheme = null;
  this.fxT = 0;
  this.fxSeq = 0;

  this.deathVelocity = new THREE.Vector3();
  this.onCoin = null;
  this.onItem = null;
  this.onDeath = null;
  this.onShieldPop = null;

  // Shield bubble (Shield power-up)
  this.bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.3, depthWrite: false })
  );
  this.bubble.position.y = 0.45;
  this.bubble.visible = false;
  this.group.add(this.bubble);
  this.ghostMats = new Map();

  // Soft blob shadow: it shrinks and fades as the chicken leaves the ground.
  var sg = new THREE.CircleGeometry(0.34, 20);
  sg.rotateX(-Math.PI / 2);
  this.shadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2
  }));
  this.shadow.renderOrder = 1;
  this.scene.add(this.shadow);
  this.onLand = null;

  // Glowing ring under the feet while a Jump power-up is active
  var rg = new THREE.RingGeometry(0.3, 0.4, 24);
  rg.rotateX(-Math.PI / 2);
  this.jumpRing = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0x6dff8a, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  this.jumpRing.renderOrder = 2;
  this.jumpRing.visible = false;
  this.scene.add(this.jumpRing);

  this.onCrate = null;
  this.onBounce = null;
  this.aura = new Flair.Aura(scene);
  this.pet = new Pets.Pet(scene);
  this.deathFx = null;
  this.deathFxData = null;
  this.reset();
  this.refreshFlair();
}

// Put on the pet and aura picked in the shop (and bring the pet back to the chicken's side).
Player.prototype.refreshFlair = function () {
  this.aura.set(Cosmetics.eqId('aura'));
  this.pet.setKind(Cosmetics.eqId('pet'));
  this.pet.reset(this);
};

// 0 = none, 1 = Jump (hop over small obstacles), 2 = Skip Lane (two tiles at once)
Player.prototype.setJump = function (level) {
  this.jumpLevel = level;
  this.jumpRing.material.color.setHex(level >= 2 ? 0xffa530 : 0x6dff8a);
  this.jumpRing.visible = level > 0 && this.alive && !this.dying;
};

// Ghost power-up: the chicken turns into a see-through, glowing ghost.
Player.prototype.setGhost = function (on) {
  if (this.ghost === on) return;
  this.ghost = on;
  var self = this;
  this.bodyGroup.traverse(function (o) {
    if (!o.isMesh) return;
    if (on) {
      o.userData.solidMat = o.material;
      var g = self.ghostMats.get(o.material);
      if (!g) {
        g = o.material.clone();
        g.transparent = true;
        g.opacity = 0.4;
        g.depthWrite = false;
        g.emissive = new THREE.Color(0x4aa0ff);
        g.emissiveIntensity = 0.45;
        self.ghostMats.set(o.material, g);
      }
      o.material = g;
    } else if (o.userData.solidMat) {
      o.material = o.userData.solidMat;
    }
  });
  if (!on) this.ghostMats.forEach(function (m) { m.opacity = 0.4; });
};

// The theme of the biome the chicken stands in: it may add a suit (e.g. a helmet).
// The Forest adds nothing.
Player.prototype.setTheme = function (name) {
  this.themeName = name;
  this.refreshTheme();
};

Player.prototype.refreshTheme = function () {
  var T = Biome.theme(this.themeName);
  if (this.themeSuit && this.bodyGroup) { this.bodyGroup.remove(this.themeSuit); Utils.disposeObject3D(this.themeSuit); }
  this.themeSuit = null;
  if (T.suit && this.bodyGroup) {
    this.themeSuit = T.suit();
    this.themeSuit.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
    this.bodyGroup.add(this.themeSuit);
    if (this.ghost) { this.setGhost(false); this.setGhost(true); }   // the new suit turns see-through too
  }
};

// The theme of the lane at row z.
Player.prototype.themeAt = function (world, z) {
  var row = world && world.getRow(Math.round(z));
  return Biome.theme(row ? row.biome : 'forest');
};

Player.prototype.setShield = function (on) {
  this.shield = on;
  this.bubble.visible = on;
};

Player.prototype.buildModel = function () {
  var look = Cosmetics.current();
  var s = look.skin;
  var body = new THREE.Group();
  // each model gets its own material so a skin can glow (Golden)
  this.bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: s.glow || 0x000000 });
  var own = { material: this.bodyMat };

  body.add(Utils.voxelMesh([
    { x: -0.12, y: 0.09, z: 0, w: 0.09, h: 0.18, d: 0.09, color: s.legs },
    { x: 0.12, y: 0.09, z: 0, w: 0.09, h: 0.18, d: 0.09, color: s.legs },
    { x: -0.12, y: 0.015, z: 0.0, w: 0.14, h: 0.03, d: 0.2, color: s.legs },
    { x: 0.12, y: 0.015, z: 0.0, w: 0.14, h: 0.03, d: 0.2, color: s.legs }
  ], own));

  var torso = [
    { x: 0, y: 0.5, z: 0, w: 0.52, h: 0.66, d: 0.5, color: s.body },
    { x: 0, y: 0.24, z: 0.0, w: 0.54, h: 0.1, d: 0.52, color: s.shade },
    // beak + wattle
    { x: 0, y: 0.6, z: 0.32, w: 0.2, h: 0.1, d: 0.16, color: s.beak },
    { x: 0, y: 0.52, z: 0.31, w: 0.1, h: 0.1, d: 0.1, color: s.comb },
    // tail
    { x: 0, y: 0.58, z: -0.31, w: 0.16, h: 0.26, d: 0.1, color: s.tail, rx: 0.3 }
  ];
  if (!look.head) { // the comb makes way for a hat
    torso.push({ x: 0, y: 0.89, z: 0.06, w: 0.1, h: 0.12, d: 0.2, color: s.comb });
    torso.push({ x: 0, y: 0.87, z: -0.1, w: 0.1, h: 0.08, d: 0.1, color: s.comb });
  }
  body.add(Utils.voxelMesh(torso, own));

  var extra = Cosmetics.outfitBoxes();
  if (extra.length) body.add(Utils.voxelMesh(extra));

  // eyes (separate so they can blink)
  var eyeMat = Utils.sharedMaterial(s.eye);
  var eyeGeo = new THREE.BoxGeometry(0.075, 0.11, 0.04);
  this.eyes = [-0.14, 0.14].map(function (ex) {
    var eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(ex, 0.68, 0.255);
    body.add(eye);
    return eye;
  });
  // wings
  var wingGeo = new THREE.BoxGeometry(0.07, 0.3, 0.3);
  var wingMat = Utils.sharedMaterial(s.wing);
  this.wingL = new THREE.Mesh(wingGeo, wingMat);
  this.wingL.position.set(-0.295, 0.45, -0.02);
  body.add(this.wingL);
  this.wingR = new THREE.Mesh(wingGeo, wingMat);
  this.wingR.position.set(0.295, 0.45, -0.02);
  body.add(this.wingR);

  body.scale.setScalar(CONFIG.CHICKEN_SCALE);
  body.traverse(function (o) { if (o.isMesh) { o.castShadow = true; } });
  this.bodyGroup = body;
  this.group.add(body);
  if (this.shadow) this.refreshTheme();   // re-apply the theme's suit after a new look
};

// Swap in the skin / outfits chosen in the shop.
Player.prototype.applyLook = function () {
  var wasGhost = this.ghost;
  if (wasGhost) this.setGhost(false);
  this.group.remove(this.bodyGroup);
  Utils.disposeObject3D(this.bodyGroup);
  this.ghostMats = new Map();
  this.buildModel();
  this.blinkT = -1;
  if (wasGhost) this.setGhost(true);
  this.refreshFlair();
};

Player.prototype.reset = function () {
  this.x = 0;
  this.z = 0;
  this.y = 0;
  this.air = 0;
  this.facing = 0;
  this.hopping = false;
  this.hopT = 0;
  this.hopFrom = { x: 0, z: 0, y: 0 };
  this.hopTo = { x: 0, z: 0, y: 0 };
  this.bouncing = false;
  this.bounceT = 0;
  this.bounceDir = { x: 0, z: 0 };
  this.queuedMove = null;
  this.maxZ = 0;
  this.alive = true;
  this.dying = false;
  this.deathTimer = 0;
  this.deathType = null;
  this.onLog = null;
  this.invuln = 0;
  if (this.ghost) this.setGhost(false);
  this.ghost = false;
  this.ghostLeft = 0;
  this.setShield(false);
  this.jumpLevel = 0;
  this.jumpRing.visible = false;
  this.hopDur = CONFIG.HOP_DURATION;
  this.hopH = CONFIG.HOP_HEIGHT;
  this.landT = 9;            // seconds since landing (drives the landing spring)
  this.fid = { type: null, t: 0, dur: 0, next: Utils.randRange(2.5, 5) };
  this.shadow.visible = true;
  this.phase = 0;
  this.blinkTimer = Utils.randRange(2, 4);
  this.blinkT = -1;
  this.eaglePhase = null;
  this.eaglePhaseT = 0;
  this.eagle.visible = false;
  this.eagleShadow.visible = false;
  if (this.attackTheme && this.attackTheme.reset) this.attackTheme.reset(this);
  this.attackTheme = null;
  this.eagleParts.legL.rotation.x = this.eagleParts.legR.rotation.x = -0.9;
  this.slideLeft = 0;
  this.hopSlide = false;
  this.deathCroc = null;
  this.group.visible = true;
  this.group.position.set(0, 0, 0);
  this.group.rotation.set(0, 0, 0);
  this.group.scale.set(1, 1, 1);
  this.bodyGroup.rotation.set(0, 0, 0);
  this.eyes[0].scale.y = this.eyes[1].scale.y = 1;
  this.deathFx = null;
  this.deathFxData = null;
  if (this.pet) this.pet.reset(this);
};

var FACING = { forward: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };

Player.prototype.face = function (dx, dz) {
  if (dz > 0) this.facing = FACING.forward;
  else if (dz < 0) this.facing = FACING.back;
  else if (dx < 0) this.facing = FACING.left;
  else if (dx > 0) this.facing = FACING.right;
};

Player.prototype.requestMove = function (dx, dz, world) {
  if (!this.alive || this.dying) return;
  if (this.hopping) {
    this.queuedMove = { dx: dx, dz: dz };
    return;
  }
  this.tryStartHop(dx, dz, world);
};

// bounce: 1 or 2 = a trampoline lane flings the chicken that many rows forward (no checks, the caller did them)
Player.prototype.tryStartHop = function (dx, dz, world, isSlide, bounce) {
  var startX = this.x, startZ = this.z;
  var targetX = Math.round(startX) + dx; // forward/back hops snap to the grid
  var targetZ = startZ + dz;

  // Jump power-ups: Skip Lane leaps two tiles over whatever is in between; Jump
  // hops over a small obstacle (stump, mushroom, bush, rock, hay bale...) that would
  // normally block the way. Either needs a free tile to land on.
  var minZ = this.maxZ - CONFIG.MAX_BACKTRACK;
  var farX = targetX + dx, farZ = targetZ + dz;
  var farOk = !world.isBlocked(farX, farZ) && farZ >= minZ;
  var leap = null;
  // (a glide on ice is a plain step: the caller already checked the tile)
  if (bounce) { leap = 'bounce'; targetX = Math.round(startX); targetZ = startZ + bounce; }
  else if (!isSlide && this.jumpLevel >= 2 && farOk) leap = 'double';
  else if (!isSlide && world.isBlocked(targetX, targetZ)) {
    if (this.jumpLevel >= 1 && world.isSmallObstacle(targetX, targetZ) && farOk) leap = 'over';
    else { this.bounce(dx, dz); return; }
  } else if (targetZ < minZ) {
    this.bounce(dx, dz);
    return;
  }
  if (leap && !bounce) { targetX = farX; targetZ = farZ; }
  // a hop that starts in mud is slow and low; the Moon Hops modifier makes every hop floaty
  var r0 = world.getRow(Math.round(startZ));
  var mudStart = !!(r0 && r0.mud) && !isSlide && !leap;
  this.hopDur = isSlide ? 0.2 : leap === 'bounce' ? 0.38 : leap === 'double' ? 0.27 : leap === 'over' ? 0.22 : mudStart ? CONFIG.MUD_HOP : CONFIG.HOP_DURATION * Mutators.num('hopDur', 1);
  this.hopH = isSlide ? 0.04 : leap === 'bounce' ? 1.5 : leap === 'double' ? 1.05 : leap === 'over' ? 0.85 : mudStart ? 0.25 : CONFIG.HOP_HEIGHT * Mutators.num('hopH', 1);
  this.hopSlide = !!isSlide;
  if (!isSlide) {
    // a hop that lands on ice keeps gliding: 2 tiles sideways, 1 forward / back
    this.slideDx = dx; this.slideDz = dz;
    this.slideLeft = leap ? 0 : dx !== 0 ? 2 : 1;
  }

  this.face(dx, dz);
  this.hopping = true;
  this.hopT = 0;
  this.hopFrom.x = startX;
  this.hopFrom.z = startZ;
  this.hopFrom.y = this.y;
  this.hopTo.x = targetX;
  this.hopTo.z = targetZ;
  this.hopTo.y = world.surfaceY(targetX, targetZ);
  this.onLog = null;
  this.fid.type = null;
  this.fxBurst(startX, this.y, startZ, 6);
  if (isSlide) {
    Particles.burst(startX, 0.06, startZ, { colors: [0xffffff, 0xcdeffa, 0x9fe9ff], count: 3, speed: 1.2, up: 0.9, size: 0.08, life: 0.35, gravity: 2, spread: 0.25, floor: 0 });
    if (GameAudio && GameAudio.slide) GameAudio.slide();
  } else {
    if (mudStart) {
      var mc = Biome.colors(r0.biome);
      Particles.burst(startX, this.y + 0.05, startZ, { colors: [mc.mudA !== undefined ? mc.mudA : 0x7a5a3a, mc.mudB !== undefined ? mc.mudB : 0x5c4328], count: 7, speed: 1.3, up: 2.4, size: 0.1, life: 0.5, gravity: 9, spread: 0.3, floor: this.y - 0.1 });
    } else if (r0 && r0.type === CONFIG.ROW_TYPES.GRASS) Particles.puff(startX, 0.02, startZ, Biome.theme(r0.biome).puffColors);
    if (leap === 'bounce') {
      Particles.ring(startX, this.y + 0.04, startZ, 0xffffff, 2.6);
      if (this.onBounce) this.onBounce();
    }
    if (GameAudio) {
      if (leap === 'bounce') GameAudio.bounce();
      else if (leap) GameAudio.jump(leap);
      else if (mudStart) GameAudio.squelch();
      else GameAudio.hop();
    }
  }
};

// Is it safe to land on tile (x, z) about `t` seconds from now? Not blocked, and over a river a
// log (or platform) must be there by then.
Player.prototype.safeLanding = function (world, x, z, t) {
  var row = world.getRow(z);
  if (!row || world.isBlocked(x, z)) return false;
  if (row.type !== CONFIG.ROW_TYPES.WATER) return true;
  for (var i = 0; i < row.logs.length; i++) {
    var l = row.logs[i];
    if (!l.submerged && Math.abs(l.x + (l.vx || 0) * t - x) < l.halfWidth - 0.05) return true;
  }
  return false;
};

// A trampoline lane flings the chicken two rows forward (one if the far tile is not safe), over
// whatever lies between: a free Skip Lane that you cannot refuse, but it never throws you into
// open water. True if it launched.
Player.prototype.trampoline = function (world) {
  var z = Math.round(this.z), row = world.getRow(z);
  if (!row || !row.bounce) return false;
  var x = Math.round(this.x);
  var n = this.safeLanding(world, x, z + 2, 0.38) ? 2 : this.safeLanding(world, x, z + 1, 0.38) ? 1 : 0;
  if (!n) return false;
  this.tryStartHop(0, 1, world, false, n);
  return true;
};

// The hop effect from the shop (sparkles, hearts, rainbow...). n particles at a spot.
Player.prototype.fxBurst = function (x, y, z, n) {
  var fx = Cosmetics.fx();
  if (!fx) return;
  for (var i = 0; i < n; i++) {
    var col = fx.seq ? fx.colors[this.fxSeq++ % fx.colors.length] : fx.colors[Math.floor(Math.random() * fx.colors.length)];
    Particles.burst(x, y + 0.25, z, { colors: [col], count: 1, speed: 1.1, up: fx.up * 1.6, size: fx.size, life: fx.life, gravity: fx.gravity * 2, spread: 0.3, floor: y - 0.1 });
  }
};

// Keep sliding while the ice continues: returns true if another glide started.
Player.prototype.glide = function (world) {
  if (this.slideLeft <= 0) return false;
  var row = world.getRow(Math.round(this.z));
  if (!row || !row.ice) { this.slideLeft = 0; return false; }
  var nx = Math.round(this.x) + this.slideDx, nz = Math.round(this.z) + this.slideDz;
  var nrow = world.getRow(nz);
  if (!nrow || !nrow.ice || world.isBlocked(nx, nz) || nz < this.maxZ - CONFIG.MAX_BACKTRACK) { this.slideLeft = 0; return false; }
  this.slideLeft--;
  this.tryStartHop(this.slideDx, this.slideDz, world, true);
  return true;
};

// Walked into a tree / the edge of the field: a little bump back.
Player.prototype.bounce = function (dx, dz) {
  if (this.bouncing) return;
  this.bouncing = true;
  this.bounceT = 0;
  this.bounceDir = { x: dx * 0.2, z: dz * 0.2 };
  this.face(dx, dz);
  if (GameAudio) GameAudio.bump();
};

Player.prototype.update = function (dt, world) {
  if (this.dying) {
    this.updateDeath(dt, world);
    this.pet.update(dt, this);
    return;
  }
  if (!this.alive) return;

  // ---- power-up visuals ----
  if (this.invuln > 0) this.invuln -= dt;
  if (this.shield) {
    var pulse = 1 + Math.sin(this.phase * 1.6) * 0.05;
    this.bubble.scale.setScalar(pulse);
    this.bubble.material.opacity = 0.26 + Math.sin(this.phase * 2.2) * 0.06;
  }
  if (this.ghost) {
    // flicker faster as the effect is about to run out
    var low = this.ghostLeft < 2;
    var o = low ? (Math.sin(this.phase * 7) > 0 ? 0.55 : 0.18) : 0.4 + Math.sin(this.phase * 1.4) * 0.06;
    this.ghostMats.forEach(function (m) { m.opacity = o; });
  }

  // ---- always-on life: breathing, tail wiggle, blinking ----
  this.phase += dt * (this.hopping ? 14 : 2.6);
  this.blinkTimer -= dt;
  if (this.blinkTimer <= 0 && this.blinkT < 0) this.blinkT = 0;
  if (this.blinkT >= 0) {
    this.blinkT += dt / 0.14;
    var k = this.blinkT < 0.5 ? this.blinkT * 2 : (1 - this.blinkT) * 2;
    this.eyes[0].scale.y = this.eyes[1].scale.y = Utils.clamp(1 - k * 0.92, 0.08, 1);
    if (this.blinkT >= 1) {
      this.blinkT = -1;
      this.blinkTimer = Utils.randRange(2, 5);
      this.eyes[0].scale.y = this.eyes[1].scale.y = 1;
    }
  }

  if (this.hopping) {
    this.hopT += dt / this.hopDur;
    var t = Math.min(1, this.hopT);
    this.x = Utils.lerp(this.hopFrom.x, this.hopTo.x, t);
    this.z = Utils.lerp(this.hopFrom.z, this.hopTo.z, t);
    this.air = Utils.hopArc(t) * this.hopH;
    this.fxT -= dt;
    if (this.fxT <= 0) { this.fxT = 0.045; this.fxBurst(this.x, this.y - this.air, this.z, 1); }   // a trail while in the air
    this.y = Utils.lerp(this.hopFrom.y, this.hopTo.y, t) + this.air;

    // squash & stretch: crouch -> stretch in the air -> crouch on landing
    var sy;
    if (t < 0.15) sy = Utils.lerp(0.78, 1.18, t / 0.15);
    else if (t > 0.85) sy = Utils.lerp(1.12, 0.8, (t - 0.85) / 0.15);
    else sy = Utils.lerp(1.18, 1.12, (t - 0.15) / 0.7);
    var sxz = Utils.lerp(1.04, 0.9, Math.sin(Math.PI * t));
    if (this.hopSlide) { sy = 1 + (sy - 1) * 0.2; sxz = 1 + (sxz - 1) * 0.2; }
    this.group.scale.set(sxz, sy, sxz);

    // lean into the hop, a little wobble, wings flapping
    var arc = Math.sin(Math.PI * t);
    this.bodyGroup.rotation.x = this.hopSlide ? -0.14 : arc * -0.2; // leans back while skating
    this.bodyGroup.rotation.z = this.hopSlide ? 0 : Math.sin(t * Math.PI * 2) * 0.07;
    this.bodyGroup.rotation.y = 0;
    var flap = arc * 1.0 + Math.sin(t * 34) * 0.18 * arc;
    this.wingL.rotation.z = flap;
    this.wingR.rotation.z = -flap;

    if (t >= 1) {
      this.hopping = false;
      this.air = 0;
      this.x = this.hopTo.x;
      this.z = this.hopTo.z;
      this.landT = 0;
      this.fxBurst(this.x, this.y, this.z, 5);
      this.onLanded(world);
      if (!this.dying && this.z > this.maxZ) this.maxZ = this.z;   // a row only counts if you survived the landing
      if (this.onLand) this.onLand();
      var launched = !this.dying && this.trampoline(world);
      var gliding = !this.dying && !launched && this.glide(world);
      if (!launched && !gliding && this.queuedMove && !this.dying) {
        var qm = this.queuedMove;
        this.queuedMove = null;
        this.tryStartHop(qm.dx, qm.dz, world);
      }
    }
  } else {
    this.bodyGroup.rotation.x = Utils.lerp(this.bodyGroup.rotation.x, 0, 0.25);
    this.bodyGroup.rotation.z = Utils.lerp(this.bodyGroup.rotation.z, 0, 0.25);

    // landing spring: squash, overshoot, settle
    var sprung = false;
    if (this.landT < 0.7) {
      this.landT += dt;
      var damp = Math.exp(-9 * this.landT), osc = Math.cos(18 * this.landT);
      this.group.scale.set(1 + 0.16 * damp * osc, 1 - 0.28 * damp * osc, 1 + 0.16 * damp * osc);
      sprung = true;
    }

    // little idle fidgets so the chicken never stands like a statue
    var fid = this.fid, fWing = null, fYaw = 0, fAir = 0, fSquash = 0;
    if (!sprung && !this.bouncing) {
      if (fid.type) {
        fid.t += dt;
        var u = fid.t / fid.dur;
        if (u >= 1) { fid.type = null; fid.next = Utils.randRange(3, 6.5); }
        else {
          var env = Math.sin(Math.PI * u);
          if (fid.type === 'flutter') fWing = Math.sin(fid.t * 42) * 0.55 * env;
          else if (fid.type === 'look') fYaw = Math.sin(u * Math.PI * 2) * 0.6;
          else { fAir = Math.abs(Math.sin(Math.PI * u)) * 0.13; fSquash = Math.sin(Math.PI * u) * 0.1; }
        }
      } else {
        fid.next -= dt;
        if (fid.next <= 0) {
          fid.type = Utils.weightedChoice([{ value: 'flutter', weight: 0.35 }, { value: 'look', weight: 0.4 }, { value: 'bounce', weight: 0.25 }]);
          fid.t = 0;
          fid.dur = fid.type === 'flutter' ? 0.7 : fid.type === 'look' ? 1.3 : 0.42;
        }
      }
    }
    if (fWing !== null) { this.wingL.rotation.z = fWing; this.wingR.rotation.z = -fWing; }
    else {
      this.wingL.rotation.z = Utils.lerp(this.wingL.rotation.z, 0, 0.25);
      this.wingR.rotation.z = Utils.lerp(this.wingR.rotation.z, 0, 0.25);
    }
    this.bodyGroup.rotation.y = Utils.lerp(this.bodyGroup.rotation.y, fYaw, 0.3);
    if (!sprung) this.group.scale.set(1 - fSquash * 0.4, 1 + Math.sin(this.phase) * 0.015 + fSquash, 1 - fSquash * 0.4);
    this.air = fAir;

    // carried along by a log (or a turtle)
    if (this.onLog) {
      var l = this.onLog;
      this.x += (l.vx !== undefined ? l.vx : l.direction * l.speed) * dt;
      this.y = (l.curTop !== undefined ? l.curTop : l.top + l.bob - l.dip) + fAir;
      if (Math.abs(this.x) > CONFIG.PLAY_HALF + 0.9 || l.submerged) {
        this.startDeath(world.drownType(Math.round(this.z)), world); // carried off the edge, or the turtle dived
      }
    } else {
      var brow = world.getRow(Math.round(this.z));
      if (brow && brow.belt && !this.bouncing) {            // a conveyor lane carries you sideways
        this.x = Utils.clamp(this.x + brow.belt * CONFIG.BELT_SPEED * dt, -CONFIG.PLAY_HALF, CONFIG.PLAY_HALF);
        this.collectHere(world, brow);
      }
      this.y = world.surfaceY(this.x, this.z) + fAir;
    }
  }

  var offsetX = 0, offsetZ = 0;
  if (this.bouncing) {
    this.bounceT += dt / 0.14;
    if (this.bounceT >= 1) {
      this.bouncing = false;
    } else {
      var bk = Math.sin(Math.PI * this.bounceT);
      offsetX = this.bounceDir.x * bk;
      offsetZ = this.bounceDir.z * bk;
    }
  }

  this.group.position.set(this.x + offsetX, this.y, this.z + offsetZ);
  this.group.rotation.y = Utils.lerpAngle(this.group.rotation.y, this.facing, 0.45);

  // blob shadow on whatever is underneath, smaller and fainter the higher we are
  var lift = Utils.clamp(this.air / 0.6, 0, 1);
  this.shadow.position.set(this.x + offsetX, this.y - this.air + 0.014, this.z + offsetZ);
  this.shadow.scale.setScalar(CONFIG.CHICKEN_SCALE * (1.15 - lift * 0.5));
  this.shadow.material.opacity = 0.3 * (1 - lift * 0.65);

  var jr = this.jumpRing;
  jr.visible = this.jumpLevel > 0;
  if (jr.visible) {
    jr.position.set(this.x + offsetX, this.y - this.air + 0.03, this.z + offsetZ);
    jr.rotation.y += dt * 3;
    jr.scale.setScalar(CONFIG.CHICKEN_SCALE * (1.25 + Math.sin(this.phase * 1.5) * 0.07 - lift * 0.3));
  }

  this.aura.update(dt, this.x + offsetX, this.y - this.air, this.z + offsetZ, this.air, true);
  this.pet.update(dt, this);

  if (!this.dying) this.checkHazards(world);
};

Player.prototype.onLanded = function (world) {
  var row = world.getRow(this.z);
  if (!row) return;
  if (row.type === CONFIG.ROW_TYPES.WATER) {
    var log = world.getLogAt(this.x, this.z);
    if (log) {
      this.onLog = log;
      log.dip = 0.11;
      if (log.pad) Particles.puff(this.x, log.top, this.z, Biome.theme(row.biome).puffColors);
      Particles.ring(this.x, (log.curTop !== undefined ? log.curTop : log.top) + 0.01, this.z, log.platform ? 0xffd9a8 : 0xdff6ff, 1.2);
    } else {
      this.startDeath(world.drownType(Math.round(this.z)), world);
      return;
    }
  } else {
    this.onLog = null;
    if (row.type === CONFIG.ROW_TYPES.GRASS) Particles.puff(this.x, 0.02, this.z, Biome.theme(row.biome).puffColors);
    Flair.trailStep(this.x, world.surfaceY(this.x, this.z), this.z, this.facing);   // the worn trail (shop)
  }
  this.collectHere(world, row);
};

// Pick up whatever lies on the tile the chicken stands on: a coin, a power-up, a supply crate.
Player.prototype.collectHere = function (world, row) {
  var coin = world.tryCollectCoin(this.x, this.z);
  if (coin) {
    if (GameAudio) GameAudio.coin();
    Particles.sparkle(coin.x, row.top + 0.55, this.z);
    if (this.onCoin) this.onCoin();
  }
  var item = world.tryCollectItem(this.x, this.z);
  if (item && this.onItem) this.onItem(item.type, item.x, row.top, this.z);
  var crate = world.tryCollectCrate(this.x, this.z);
  if (crate && this.onCrate) this.onCrate(crate, row);
};

Player.prototype.checkHazards = function (world) {
  if (!this.alive || this.dying) return;
  var row = Math.round(this.z);
  // safe while high in the air (the chicken clears a bumper mid-hop)
  if (this.air < 0.3 && !this.ghost && this.invuln <= 0) {
    var v = world.checkVehicleHit(this.x, row);
    var t = !v && world.checkTrainHit(this.x, row);
    var cr = !v && !t && world.checkCrocHit(this.x, row);
    if (v || t || cr) {
      if (this.shield) {
        // the bubble takes the hit and pops
        this.setShield(false);
        this.invuln = 1.4;
        Particles.burst(this.x, this.y + 0.45, this.z, { colors: [0x4aa3ff, 0x9ad0ff, 0xffffff], count: 14, speed: 3.5, up: 3, size: 0.12, life: 0.6, gravity: 2, spread: 0.3 });
        if (this.onShieldPop) this.onShieldPop();
        return;
      }
      this.startDeath(v ? 'car' : t ? 'train' : 'croc', world, v || cr);
      return;
    }
  }
  if (!this.hopping && world.isWater(row) && !this.onLog) {
    this.startDeath(world.drownType(row), world);
  }
};

Player.prototype.startDeath = function (type, world, hitBy) {
  if (this.dying || !this.alive || this.invincible) return;
  this.dying = true;
  this.shadow.visible = false;
  this.jumpRing.visible = false;
  this.deathType = type;
  this.deathTimer = 0;
  this.hopping = false;
  this.queuedMove = null;
  this.bouncing = false;
  this.y -= this.air;               // settle on the ground first (a death can land mid-hop)
  this.air = 0;
  this.onLog = null;
  this.bodyGroup.rotation.set(0, 0, 0);
  this.wingL.rotation.z = this.wingR.rotation.z = 0;
  this.aura.update(0, this.x, this.y, this.z, 0, false);   // the aura goes out
  // the worn death animation (shop) replaces the chicken's own for everything but the eagle / UFO
  var fx = this.deathFx = type !== 'eagle' ? Flair.deathStyle() : null;
  if (type !== 'eagle') {
    // freeze on the lane we were on, back on the ground (not mid-hop)
    this.z = Math.round(this.z);
    this.y = world ? world.surfaceY(this.x, this.z) : this.y;
    this.group.position.set(this.x, this.y, this.z);
  }

  if (type === 'car' || type === 'train') {
    if (GameAudio && !fx) { GameAudio.squish(); if (type === 'train') GameAudio.crash(); }
    else if (GameAudio && type === 'train') GameAudio.crash();
    // splat flat along the direction of travel (world X)
    this.group.rotation.y = Math.round(this.group.rotation.y / Math.PI) * Math.PI;
    this.facing = this.group.rotation.y;
    this.deathPush = hitBy ? hitBy.direction * 0.9 : 0;
    if (!fx) Particles.feathers(this.x, this.y + 0.4, this.z, 16);
  } else if (type === 'drown') {
    if (GameAudio) GameAudio.splash();
    var wy = CONFIG.ROW_TOP.water;
    Particles.splash(this.x, wy, this.z);
  } else if (type === 'fall') {
    // into the chasm: no splash, just a long drop
    if (GameAudio && GameAudio.fall) GameAudio.fall();
    var vc = this.themeAt(world, this.z).fallColors || [0xff8a3d, 0xffd23f, 0x555555];
    Particles.burst(this.x, this.y + 0.1, this.z, { colors: vc, count: 12, speed: 2, up: 3, size: 0.1, life: 0.7, gravity: 6, spread: 0.3, floor: this.y - 1 });
  } else if (type === 'croc') {
    this.deathCroc = hitBy || null;
    if (hitBy) hitBy.chomp = 0.8;                 // the croc snaps shut on its prey
    if (hitBy && hitBy.onKill) {                  // a biome's own killer (e.g. a laser strike)
      hitBy.onKill(this);
    } else {
      if (GameAudio && GameAudio.chomp) GameAudio.chomp();
      if (!fx) Particles.feathers(this.x, this.y + 0.5, this.z, 14);
    }
  } else if (type === 'eagle' && this.themeAt(world, this.z).attack) {
    this.attackTheme = this.themeAt(world, this.z).attack;   // e.g. a UFO instead of the eagle
    this.attackTheme.begin(this);
  } else if (type === 'eagle') {
    if (GameAudio && GameAudio.eagleAttack) GameAudio.eagleAttack(); else if (GameAudio) GameAudio.screech();
    var side = Math.random() < 0.5 ? -1 : 1;
    this.eagleSide = side;
    this.eagleGrabPoint.set(this.x, this.y + 0.95, this.z);
    this.eagleStartPos.set(this.x + side * 6.5, this.y + 12.5, this.z + 11.5);
    this.eagleCtrlPos.set(this.x + side * 0.4, this.y + 5.5, this.z + 4.2);
    this.eagleExitDir.set(-side * 0.35, 0.9, 0.7).normalize();
    this.eagle.position.copy(this.eagleStartPos);
    this.eagle.visible = true;
    this.eagleShadow.visible = true;
    this.eagleFeatherT = 0;
    this.eaglePhase = 'glide';
    this.eaglePhaseT = 0;
    this.updateEagleDeath(0);
  }
  if (fx) fx.begin(this, type);
  if (this.onDeath) this.onDeath(type);
};

Player.prototype.updateDeath = function (dt) {
  this.deathTimer += dt;
  var t = this.deathTimer;
  if (this.deathFx) {
    this.deathFx.update(this, t, dt);
    if (t > this.deathFx.duration) this.alive = false;
    return;
  }
  if (this.deathType === 'car' || this.deathType === 'train') {
    var flat = Utils.clamp(t / 0.08, 0, 1);
    var e = Utils.easeOutQuad(flat);
    this.group.scale.set(Utils.lerp(1, 1.75, e), Utils.lerp(1, 0.1, e), Utils.lerp(1, 1.15, e));
    this.group.position.x += this.deathPush * dt * Math.max(0, 1 - t * 5);
    this.group.position.y = this.y;
  } else if (this.deathType === 'drown') {
    var sink = Utils.clamp(t / 0.55, 0, 1);
    this.group.position.y = this.y - sink * 0.9;
    this.group.rotation.z += dt * 3;
    var s = Utils.lerp(1, 0.2, sink);
    this.group.scale.set(s, s, s);
  } else if (this.deathType === 'fall') {
    var fall = Utils.clamp(t / 0.8, 0, 1);
    this.group.position.y = this.y - fall * fall * 6;
    this.group.rotation.y += dt * 9;
    this.group.rotation.z += dt * 2.5;
    var fs = Utils.lerp(1, 0.1, Utils.easeOutQuad(fall));
    this.group.scale.set(fs, fs, fs);
  } else if (this.deathType === 'croc') {
    var c = this.deathCroc;
    if (c) {
      var hx = c.x + c.direction * (c.halfWidth - Models.CROC_HEAD / 2);
      var pull = Utils.clamp(t / 0.16, 0, 1);
      this.x = Utils.lerp(this.x, hx, 0.25 + pull * 0.4);
      this.group.position.set(this.x, (c.curTop !== undefined ? c.curTop : 0.05) + 0.12 * (1 - pull), this.z);
    }
    var ck = Utils.clamp((t - 0.1) / 0.3, 0, 1);
    var cs = Utils.lerp(1, 0.001, ck);
    this.group.scale.set(cs * (1 + 0.2 * Math.sin(t * 40)), cs, cs);
    this.group.rotation.z = Math.sin(t * 30) * 0.3 * (1 - ck);
  } else if (this.deathType === 'eagle') {
    if (this.attackTheme) this.attackTheme.update(this, dt); else this.updateEagleDeath(dt);
  }
  var duration = this.deathType === 'eagle' ? (this.attackTheme ? this.attackTheme.duration : 2.3) : this.deathType === 'drown' ? 0.75 : this.deathType === 'fall' ? 0.85 : 0.9;
  if (t > duration) this.alive = false;
};

// The eagle attack, in three beats:
//  glide - it banks in from high above, flaps, then tucks its wings and stoops
//  grab  - wings flare, talons out, the chicken is snatched (feathers + shake)
//  carry - powerful wing beats lift it away with the chicken dangling below
var EAGLE_GLIDE = 1.0;
var EAGLE_GRAB = 0.2;

function poseEagle(E, shoulder, elbow, sweep, elbowSweep) {
  E.wingR.rotation.set(0, sweep, shoulder);
  E.wingL.rotation.set(0, -sweep, -shoulder);
  E.elbowR.rotation.set(0, elbowSweep, elbow);
  E.elbowL.rotation.set(0, -elbowSweep, -elbow);
}

Player.prototype.eagleAt = function (u, out, tan) {
  var a = this.eagleStartPos, b = this.eagleCtrlPos, c = this.eagleGrabPoint, k = 1 - u;
  out.set(
    k * k * a.x + 2 * k * u * b.x + u * u * c.x,
    k * k * a.y + 2 * k * u * b.y + u * u * c.y,
    k * k * a.z + 2 * k * u * b.z + u * u * c.z
  );
  tan.set(
    2 * k * (b.x - a.x) + 2 * u * (c.x - b.x),
    2 * k * (b.y - a.y) + 2 * u * (c.y - b.y),
    2 * k * (b.z - a.z) + 2 * u * (c.z - b.z)
  ).normalize();
};

Player.prototype.updateEagleDeath = function (dt) {
  this.eaglePhaseT += dt;
  var T = this.eaglePhaseT;
  var E = this.eagleParts, eg = this.eagle, side = this.eagleSide || 1;
  var shadow = this.eagleShadow;
  var ground = this.y - this.air + 0.03;

  if (this.eaglePhase === 'glide') {
    var k = Utils.clamp(T / EAGLE_GLIDE, 0, 1);
    var u = Math.pow(k, 1.6);                         // speeds up into the stoop
    this.eagleAt(u, this.eagleTmp, this.eagleTan);
    eg.position.copy(this.eagleTmp);
    var tan = this.eagleTan;
    var pitch = Math.asin(Utils.clamp(-tan.y, -1, 1));
    eg.rotation.set(pitch, Math.atan2(tan.x, tan.z), -side * 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.15)));
    this.eagleDivePitch = pitch;

    // flapping early on, then wings sweep back for the dive
    var s = Utils.clamp((k - 0.5) / 0.3, 0, 1);
    s = s * s * (3 - 2 * s);
    var beat = Math.sin(T * 11);
    poseEagle(E, (0.12 + 0.6 * beat) * (1 - s) - 0.08 * s, 0.5 * Math.sin(T * 11 - 1.0) * (1 - s), 0.1 + 0.8 * s, 0.7 * s);
    E.legL.rotation.x = E.legR.rotation.x = -0.9;
    E.head.rotation.x = 0.15 + 0.45 * k;

    // its shadow races over the grass towards the chicken
    shadow.position.set(this.eagleTmp.x, ground, this.eagleTmp.z);
    shadow.scale.set(Utils.lerp(2.4, 0.9, u) * 1.5, 1, Utils.lerp(2.4, 0.9, u));
    shadow.material.opacity = 0.34 * Math.min(1, k * 1.4);

    // the chicken has noticed: it looks up and flaps in panic
    if (k > 0.3) {
      var f = Utils.clamp((k - 0.3) / 0.4, 0, 1);
      var flutter = Math.sin(T * 55) * 0.7 * f;
      this.wingL.rotation.z = flutter + 0.5 * f;
      this.wingR.rotation.z = -flutter - 0.5 * f;
      this.bodyGroup.rotation.x = -0.35 * f;
      this.group.position.x = this.x + Math.sin(T * 70) * 0.02 * f;
      this.group.scale.set(1 + 0.05 * f, 1 - 0.07 * f, 1 + 0.05 * f);
      this.eyes[0].scale.y = this.eyes[1].scale.y = 1 + 0.35 * f;
    }
    if (T >= EAGLE_GLIDE) {
      this.eaglePhase = 'grab';
      this.eaglePhaseT = 0;
      Particles.feathers(this.x, this.y + 0.6, this.z, 14);
      Particles.ring(this.x, this.y + 0.05, this.z, 0xffffff, 2.2);
      if (GameAudio && GameAudio.squawk) GameAudio.squawk();
      if (this.onEagleGrab) this.onEagleGrab(this.eagleGrabPoint);
    }
  } else if (this.eaglePhase === 'grab') {
    var g = Utils.clamp(T / EAGLE_GRAB, 0, 1);
    eg.position.set(this.eagleGrabPoint.x, this.eagleGrabPoint.y + 0.25 * g, this.eagleGrabPoint.z);
    eg.rotation.set(Utils.lerp(this.eagleDivePitch || 0.8, -0.4, g), eg.rotation.y, eg.rotation.z * (1 - g));
    poseEagle(E, Utils.lerp(-0.08, 1.0, g), 0.3 * g, Utils.lerp(0.9, 0, g), Utils.lerp(0.7, 0, g));
    E.legL.rotation.x = E.legR.rotation.x = Utils.lerp(-0.9, 0.55, g);
    E.head.rotation.x = Utils.lerp(0.6, -0.1, g);
    // the chicken is squashed in the talons
    var sq = Math.sin(Math.PI * Math.min(1, g * 1.2));
    this.group.position.set(this.x, this.y, this.z);
    this.group.scale.set(1 + 0.25 * sq, 1 - 0.35 * sq, 1 + 0.25 * sq);
    shadow.position.set(eg.position.x, ground, eg.position.z);
    shadow.scale.set(1.4, 1, 1.4);
    shadow.material.opacity = 0.3;
    if (T >= EAGLE_GRAB) {
      this.eaglePhase = 'carry';
      this.eaglePhaseT = 0;
      this.eagleFeatherT = 0;
      this.eagleYaw = eg.rotation.y;
    }
  } else {
    // carry: climb away, wings pumping, chicken dangling
    var c = T;
    var speed = 3.5 + c * 15;
    eg.position.addScaledVector(this.eagleExitDir, dt * speed);
    var targetYaw = Math.atan2(this.eagleExitDir.x, this.eagleExitDir.z);
    this.eagleYaw = Utils.lerpAngle(this.eagleYaw, targetYaw, Math.min(1, dt * 6));
    eg.rotation.set(Utils.lerp(eg.rotation.x, -0.45, Math.min(1, dt * 8)), this.eagleYaw, Math.sin(c * 6.5) * 0.12);
    var pump = Math.sin(c * 14);
    poseEagle(E, 0.2 + 0.85 * pump, 0.5 * Math.sin(c * 14 - 1.0), 0.15, 0.1);
    E.legL.rotation.x = E.legR.rotation.x = 0.55;
    E.head.rotation.x = -0.05;
    // the chicken hangs from the talons and swings
    var sway = Math.sin(c * 9) * 0.35 * Math.exp(-c * 0.7);
    this.group.position.set(eg.position.x + Math.sin(c * 9) * 0.12, eg.position.y - 0.85, eg.position.z);
    this.group.rotation.z = sway;
    this.group.rotation.y += dt * 5;
    var shrink = Utils.lerp(0.88, 0.7, Utils.clamp(c / 1.2, 0, 1));
    this.group.scale.setScalar(shrink);
    this.wingL.rotation.z = Math.sin(c * 40) * 0.9;
    this.wingR.rotation.z = -Math.sin(c * 40) * 0.9;
    this.bodyGroup.rotation.x = -0.2;
    this.eagleFeatherT -= dt;
    if (this.eagleFeatherT <= 0) {
      this.eagleFeatherT = 0.11;
      Particles.burst(this.group.position.x, this.group.position.y + 0.4, this.group.position.z, { colors: [0xffffff, 0xf2f2f2, 0xffe9c9], count: 2, speed: 0.8, up: 0.5, size: 0.12, life: 1.1, gravity: 2.5, spread: 0.2, floor: -9 });
    }
    // the shadow slides away and fades as it climbs
    shadow.position.set(eg.position.x, ground, eg.position.z - c * 2);
    shadow.material.opacity = Math.max(0, 0.3 - c * 0.5);
  }
};
