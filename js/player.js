// The voxel chicken: grid hopping with squash & stretch, riding logs, coin
// pickup and every way to die (car, train, drowning, the eagle).
function Player(scene) {
  this.scene = scene;
  this.group = new THREE.Group();
  this.buildModel();
  this.scene.add(this.group);

  var eagle = Models.buildEagle();
  this.eagle = eagle.group;
  this.eagleWingL = eagle.wingL;
  this.eagleWingR = eagle.wingR;
  this.eagle.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  this.eagle.visible = false;
  this.eagle.scale.setScalar(1.25);
  this.scene.add(this.eagle);
  this.eagleStartPos = new THREE.Vector3();
  this.eagleGrabPoint = new THREE.Vector3();
  this.eagleExitDir = new THREE.Vector3();

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
  this.reset();
}

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
  this.landT = 9;            // seconds since landing (drives the landing spring)
  this.fid = { type: null, t: 0, dur: 0, next: Utils.randRange(2.5, 5) };
  this.shadow.visible = true;
  this.phase = 0;
  this.blinkTimer = Utils.randRange(2, 4);
  this.blinkT = -1;
  this.eaglePhase = null;
  this.eaglePhaseT = 0;
  this.eagle.visible = false;
  this.group.visible = true;
  this.group.position.set(0, 0, 0);
  this.group.rotation.set(0, 0, 0);
  this.group.scale.set(1, 1, 1);
  this.bodyGroup.rotation.set(0, 0, 0);
  this.eyes[0].scale.y = this.eyes[1].scale.y = 1;
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

Player.prototype.tryStartHop = function (dx, dz, world) {
  var startX = this.x, startZ = this.z;
  var targetX = Math.round(startX) + dx; // forward/back hops snap to the grid
  var targetZ = startZ + dz;

  if (world.isBlocked(targetX, targetZ) || targetZ < this.maxZ - CONFIG.MAX_BACKTRACK) {
    this.bounce(dx, dz);
    return;
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
  var r0 = world.getRow(Math.round(startZ));
  if (r0 && r0.type === CONFIG.ROW_TYPES.GRASS) Particles.puff(startX, 0.02, startZ);
  if (GameAudio) GameAudio.hop();
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
    this.hopT += dt / CONFIG.HOP_DURATION;
    var t = Math.min(1, this.hopT);
    this.x = Utils.lerp(this.hopFrom.x, this.hopTo.x, t);
    this.z = Utils.lerp(this.hopFrom.z, this.hopTo.z, t);
    this.air = Utils.hopArc(t) * CONFIG.HOP_HEIGHT;
    this.y = Utils.lerp(this.hopFrom.y, this.hopTo.y, t) + this.air;

    // squash & stretch: crouch -> stretch in the air -> crouch on landing
    var sy;
    if (t < 0.15) sy = Utils.lerp(0.78, 1.18, t / 0.15);
    else if (t > 0.85) sy = Utils.lerp(1.12, 0.8, (t - 0.85) / 0.15);
    else sy = Utils.lerp(1.18, 1.12, (t - 0.15) / 0.7);
    var sxz = Utils.lerp(1.04, 0.9, Math.sin(Math.PI * t));
    this.group.scale.set(sxz, sy, sxz);

    // lean into the hop, a little wobble, wings flapping
    var arc = Math.sin(Math.PI * t);
    this.bodyGroup.rotation.x = arc * -0.2;
    this.bodyGroup.rotation.z = Math.sin(t * Math.PI * 2) * 0.07;
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
      if (this.z > this.maxZ) this.maxZ = this.z;
      this.onLanded(world);
      if (this.onLand) this.onLand();
      if (this.queuedMove && !this.dying) {
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
      this.x += l.direction * l.speed * dt;
      this.y = (l.curTop !== undefined ? l.curTop : l.top + l.bob - l.dip) + fAir;
      if (Math.abs(this.x) > CONFIG.PLAY_HALF + 0.9 || l.submerged) {
        this.startDeath('drown', world); // carried off the edge, or the turtle dived
      }
    } else {
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
      if (log.pad) Particles.puff(this.x, log.top, this.z);
      Particles.ring(this.x, (log.curTop !== undefined ? log.curTop : log.top) + 0.01, this.z, 0xdff6ff, 1.2);
    } else {
      this.startDeath('drown', world);
      return;
    }
  } else {
    this.onLog = null;
    if (row.type === CONFIG.ROW_TYPES.GRASS) Particles.puff(this.x, 0.02, this.z);
  }
  var coin = world.tryCollectCoin(this.x, this.z);
  if (coin) {
    if (GameAudio) GameAudio.coin();
    Particles.sparkle(coin.x, row.top + 0.55, this.z);
    if (this.onCoin) this.onCoin();
  }
  var item = world.tryCollectItem(this.x, this.z);
  if (item && this.onItem) this.onItem(item.type, item.x, row.top, this.z);
};

Player.prototype.checkHazards = function (world) {
  if (!this.alive || this.dying) return;
  var row = Math.round(this.z);
  // safe while high in the air (the chicken clears a bumper mid-hop)
  if (this.air < 0.3 && !this.ghost && this.invuln <= 0) {
    var v = world.checkVehicleHit(this.x, row);
    var t = !v && world.checkTrainHit(this.x, row);
    if (v || t) {
      if (this.shield) {
        // the bubble takes the hit and pops
        this.setShield(false);
        this.invuln = 1.4;
        Particles.burst(this.x, this.y + 0.45, this.z, { colors: [0x4aa3ff, 0x9ad0ff, 0xffffff], count: 14, speed: 3.5, up: 3, size: 0.12, life: 0.6, gravity: 2, spread: 0.3 });
        if (this.onShieldPop) this.onShieldPop();
        return;
      }
      this.startDeath(v ? 'car' : 'train', world, v);
      return;
    }
  }
  if (!this.hopping && world.isWater(row) && !this.onLog) {
    this.startDeath('drown', world);
  }
};

Player.prototype.startDeath = function (type, world, hitBy) {
  if (this.dying || !this.alive || this.invincible) return;
  this.dying = true;
  this.shadow.visible = false;
  this.deathType = type;
  this.deathTimer = 0;
  this.hopping = false;
  this.queuedMove = null;
  this.bouncing = false;
  this.air = 0;
  this.onLog = null;
  this.bodyGroup.rotation.set(0, 0, 0);
  this.wingL.rotation.z = this.wingR.rotation.z = 0;
  if (type !== 'eagle') {
    // freeze on the lane we were on, back on the ground (not mid-hop)
    this.z = Math.round(this.z);
    this.y = world ? world.surfaceY(this.x, this.z) : this.y;
    this.group.position.set(this.x, this.y, this.z);
  }

  if (type === 'car' || type === 'train') {
    if (GameAudio) { GameAudio.squish(); if (type === 'train') GameAudio.crash(); }
    // splat flat along the direction of travel (world X)
    this.group.rotation.y = Math.round(this.group.rotation.y / Math.PI) * Math.PI;
    this.facing = this.group.rotation.y;
    this.deathPush = hitBy ? hitBy.direction * 0.9 : 0;
    Particles.feathers(this.x, this.y + 0.4, this.z, 16);
  } else if (type === 'drown') {
    if (GameAudio) GameAudio.splash();
    var wy = CONFIG.ROW_TOP.water;
    Particles.splash(this.x, wy, this.z);
  } else if (type === 'eagle') {
    if (GameAudio) { GameAudio.screech(); }
    var side = Math.random() < 0.5 ? -1 : 1;
    this.eagleGrabPoint.set(this.x, this.y + 0.9, this.z);
    this.eagleStartPos.set(this.x + side * 3.5, this.y + 11, this.z + 9);
    this.eagleExitDir.set(-side * 0.3, 1, 0.9).normalize();
    this.eagle.position.copy(this.eagleStartPos);
    this.eagle.rotation.y = Math.atan2(
      this.eagleGrabPoint.x - this.eagleStartPos.x,
      this.eagleGrabPoint.z - this.eagleStartPos.z
    );
    this.eagle.visible = true;
    this.eaglePhase = 'swoop';
    this.eaglePhaseT = 0;
  }
  if (this.onDeath) this.onDeath(type);
};

Player.prototype.updateDeath = function (dt) {
  this.deathTimer += dt;
  var t = this.deathTimer;
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
  } else if (this.deathType === 'eagle') {
    this.updateEagleDeath(dt);
  }
  var duration = this.deathType === 'eagle' ? 1.5 : this.deathType === 'drown' ? 0.75 : 0.9;
  if (t > duration) this.alive = false;
};

Player.prototype.updateEagleDeath = function (dt) {
  this.eaglePhaseT += dt;
  var flap = Math.sin(this.eaglePhaseT * (this.eaglePhase === 'swoop' ? 34 : 22)) * 0.7;
  this.eagleWingL.rotation.z = flap;
  this.eagleWingR.rotation.z = -flap;

  if (this.eaglePhase === 'swoop') {
    var t = Utils.clamp(this.eaglePhaseT / 0.5, 0, 1);
    this.eagle.position.lerpVectors(this.eagleStartPos, this.eagleGrabPoint, Utils.easeOutQuad(t));
    // the chicken cowers while the shadow grows
    this.group.scale.setScalar(Utils.lerp(1, 0.88, t));
    if (t >= 1) {
      this.eaglePhase = 'carry';
      this.eaglePhaseT = 0;
      Particles.feathers(this.x, this.y + 0.6, this.z, 10);
    }
  } else if (this.eaglePhase === 'carry') {
    this.eagle.position.addScaledVector(this.eagleExitDir, dt * (6 + this.eaglePhaseT * 22));
    this.group.position.set(this.eagle.position.x, this.eagle.position.y - 0.75, this.eagle.position.z);
    this.group.rotation.z = Math.sin(this.eaglePhaseT * 14) * 0.25;
    this.group.scale.setScalar(0.88);
  }
};
