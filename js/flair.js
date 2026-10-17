// Shop "flair" that is drawn in the 3D world: trails (marks left on the ground you hopped
// on), auras (little things circling the chicken) and death animations. Which one is worn comes
// from Cosmetics; all of it is cosmetic only and never changes how the game plays.
var Flair = (function () {
  var scene = null;
  function B(x, y, z, w, h, d, color) { return { x: x, y: y, z: z, w: w, h: h, d: d, color: color }; }
  function sharedGeo(cache, key, boxes) {
    if (!cache[key]) { cache[key] = Utils.voxelGeometry(boxes()); cache[key].__shared = true; }
    return cache[key];
  }

  // =====================================================================
  // Trails: short-lived decals on the tile you landed on.
  // =====================================================================
  var POOL = 28;
  var decals = [], liveDecals = [], trailGeos = {}, trailSeq = 0;
  var NEON = [0x00e5ff, 0xff3df2, 0x7dff3d, 0xffe14d];
  var RAINBOW = [0xff5a5f, 0xff9f1c, 0xffd23f, 0x5cb83f, 0x3d8bff, 0xc36bff];
  var PETAL = [0xff8fb8, 0xffffff, 0xffc84a, 0xb98aff];

  function tile(color) { return [B(0, 0.012, 0, 0.84, 0.014, 0.84, color), B(0, 0.016, 0, 0.58, 0.012, 0.58, Utils.shade(color, 0.3))]; }

  // spec: boxes(seq) -> the shape, life seconds, anim(t01, d) updates one decal, glow = emissive strength
  var TRAILS = {
    prints: {
      life: 2.4, glow: 0,
      key: function (seq) { return 'prints' + (seq & 1); },
      boxes: function (seq) {
        var x = (seq & 1) ? 0.13 : -0.13, c = 0x4e3d2c;
        return [B(x, 0.01, 0, 0.13, 0.012, 0.1, c), B(x - 0.07, 0.01, 0.1, 0.05, 0.012, 0.05, c), B(x, 0.01, 0.13, 0.05, 0.012, 0.05, c), B(x + 0.07, 0.01, 0.1, 0.05, 0.012, 0.05, c)];
      },
      anim: function (d, t) { d.mesh.scale.setScalar(1); d.mat.opacity = 0.75 * (1 - Math.max(0, t - 0.4) / 0.6); }
    },
    flowers: {
      life: 2.6, glow: 0,
      key: function (seq) { return 'flowers' + (seq % 4); },
      boxes: function (seq) {
        var pet = PETAL[seq % 4], o = [B(0, 0.1, 0, 0.03, 0.2, 0.03, 0x4caf50), B(0, 0.22, 0, 0.075, 0.05, 0.075, 0xffd23f)];
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (c) { o.push(B(c[0] * 0.075, 0.22, c[1] * 0.075, 0.075, 0.05, 0.075, pet)); });
        o.push(B(0.18, 0.06, 0.12, 0.02, 0.12, 0.02, 0x4caf50), B(0.18, 0.13, 0.12, 0.06, 0.04, 0.06, pet));
        return o;
      },
      anim: function (d, t) {
        var grow = Math.min(1, t / 0.1), wilt = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
        d.mesh.scale.set(grow * wilt, Math.max(0.01, grow * wilt), grow * wilt);
        d.mat.opacity = 1;
      }
    },
    stars: {
      life: 1.5, glow: 0.7,
      key: function () { return 'stars'; },
      boxes: function () { return [B(0, 0, 0, 0.26, 0.06, 0.06, 0xfff3a0), B(0, 0, 0, 0.06, 0.26, 0.06, 0xfff3a0), B(0, 0, 0, 0.06, 0.06, 0.26, 0xfff3a0), B(0, 0, 0, 0.12, 0.12, 0.12, 0xffffff)]; },
      anim: function (d, t) {
        d.mesh.position.y = d.y0 + 0.2 + t * 0.7;
        d.mesh.rotation.y = t * 7;
        d.mesh.scale.setScalar(Math.min(1, t / 0.08) * (1 - t * 0.5));
        d.mat.opacity = 1 - Math.max(0, t - 0.5) / 0.5;
      }
    },
    neon: {
      life: 1.9, glow: 0.9,
      key: function (seq) { return 'neon' + (seq % 4); },
      boxes: function (seq) { return tile(NEON[seq % 4]); },
      anim: function (d, t) { d.mesh.scale.setScalar(1); d.mat.opacity = 1 - t * t; }
    },
    rainbow: {
      life: 2.5, glow: 0.45,
      key: function (seq) { return 'rainbow' + (seq % 6); },
      boxes: function (seq) { return tile(RAINBOW[seq % 6]); },
      anim: function (d, t) { d.mesh.scale.setScalar(1); d.mat.opacity = 1 - Math.max(0, t - 0.45) / 0.55; }
    }
  };

  function initTrails() {
    var group = new THREE.Group();
    scene.add(group);
    for (var i = 0; i < POOL; i++) {
      var mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      var mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      group.add(mesh);
      decals.push({ mesh: mesh, mat: mat, age: 0, life: 1, spec: null, y0: 0 });
    }
  }

  // A mark on the tile the chicken just landed on (never on water: nothing stays there).
  function trailStep(x, y, z, facing) {
    var id = Cosmetics.eqId('trail'), spec = id && TRAILS[id];
    if (!spec || !scene) return;
    var d = null, i;
    for (i = 0; i < decals.length; i++) if (!decals[i].mesh.visible) { d = decals[i]; break; }
    if (!d) d = liveDecals.shift();                     // all busy: recycle the oldest
    if (!d) return;
    var idx = liveDecals.indexOf(d);
    if (idx >= 0) liveDecals.splice(idx, 1);
    var seq = trailSeq++;
    d.spec = spec; d.age = 0; d.life = spec.life; d.y0 = y;
    d.mesh.geometry = sharedGeo(trailGeos, spec.key(seq), function () { return spec.boxes(seq); });
    d.mat.emissive.setHex(spec.glow ? 0xffffff : 0x000000);
    d.mat.emissiveIntensity = spec.glow ? 0.35 : 0;
    d.mat.opacity = 1;
    d.mesh.position.set(Math.round(x), y + 0.012, z);
    d.mesh.rotation.set(0, id === 'prints' ? facing : 0, 0);
    d.mesh.visible = true;
    liveDecals.push(d);
    spec.anim(d, 0);
  }

  function updateTrails(dt) {
    for (var i = liveDecals.length - 1; i >= 0; i--) {
      var d = liveDecals[i];
      d.age += dt;
      if (d.age >= d.life) { d.mesh.visible = false; liveDecals.splice(i, 1); continue; }
      d.spec.anim(d, d.age / d.life);
    }
  }

  // =====================================================================
  // Auras: things that orbit the chicken. Drawn unlit so they glow.
  // =====================================================================
  var auraMat = null, auraGeos = {}, pulseGeo = null;
  function glowMaterial() {
    if (!auraMat) { auraMat = new THREE.MeshBasicMaterial({ vertexColors: true }); auraMat.__shared = true; }
    return auraMat;
  }
  function glowMesh(key, boxes) {
    return new THREE.Mesh(sharedGeo(auraGeos, key, boxes), glowMaterial());
  }
  function cross(size, thick, color, core) {
    return [B(0, 0, 0, size, thick, thick, color), B(0, 0, 0, thick, size, thick, color), B(0, 0, 0, thick, thick, size, color), B(0, 0, 0, thick * 2, thick * 2, thick * 2, core)];
  }

  // n: how many orbit, r: radius, h: height over the feet, w: angular speed, wob: bobbing, make(i): a mesh
  var AURAS = {
    coins: { n: 5, r: 0.78, h: 0.55, w: 2.3, make: function () {
      var c = Models.buildCoin(); c.scale.setScalar(0.5); c.userData.spin.position.y = 0; return c;
    } },
    frost: { n: 6, r: 0.72, h: 0.55, w: 3.1, wob: 0.22, make: function () {
      return glowMesh('frost', function () { return cross(0.2, 0.045, 0xbfeaff, 0xffffff); });
    } },
    fire: { n: 6, r: 0.7, h: 0.35, w: 3.6, wob: 0.1, make: function () {
      return glowMesh('fire', function () { return [B(0, 0, 0, 0.14, 0.14, 0.14, 0xff7a1a), B(0, 0.12, 0, 0.09, 0.12, 0.09, 0xffc233), B(0, 0.2, 0, 0.05, 0.08, 0.05, 0xfff3b0)]; });
    } },
    magnet: { n: 2, r: 0.8, h: 0.55, w: 2.6, pulse: true, make: function () {
      return glowMesh('magnet', function () {
        return [B(-0.1, 0, 0, 0.07, 0.22, 0.07, 0xff4d4d), B(0.1, 0, 0, 0.07, 0.22, 0.07, 0xff4d4d), B(0, -0.11, 0, 0.27, 0.07, 0.07, 0xff4d4d),
          B(-0.1, 0.13, 0, 0.07, 0.06, 0.07, 0xf2f2f2), B(0.1, 0.13, 0, 0.07, 0.06, 0.07, 0xf2f2f2)];
      });
    } },
    star: { n: 5, r: 0.85, h: 0.95, w: 1.9, wob: 0.06, make: function () {
      return glowMesh('star', function () { return cross(0.24, 0.06, 0xffe14d, 0xffffff); });
    } }
  };

  function Aura(sc) {
    this.group = new THREE.Group();
    this.group.visible = false;
    sc.add(this.group);
    this.kind = null;
    this.spec = null;
    this.items = [];
    this.pulses = [];
    this.t = Math.random() * 10;
    this.pulseT = 0;
  }

  Aura.prototype.clear = function () {
    for (var i = this.group.children.length - 1; i >= 0; i--) {
      var c = this.group.children[i];
      this.group.remove(c);
      Utils.disposeObject3D(c);
    }
    this.items = [];
    this.pulses = [];
  };

  Aura.prototype.set = function (id) {
    this.clear();
    this.kind = id && AURAS[id] ? id : null;
    this.spec = this.kind ? AURAS[this.kind] : null;
    this.group.visible = !!this.spec;
    if (!this.spec) return;
    for (var i = 0; i < this.spec.n; i++) {
      var m = this.spec.make(i);
      this.group.add(m);
      this.items.push(m);
    }
    if (this.spec.pulse) {
      if (!pulseGeo) { pulseGeo = new THREE.RingGeometry(0.55, 0.6, 32); pulseGeo.rotateX(-Math.PI / 2); pulseGeo.__shared = true; }
      for (var k = 0; k < 3; k++) {
        var ring = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: k % 2 ? 0x4d9dff : 0xff4d4d, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        ring.visible = false;
        this.group.add(ring);
        this.pulses.push({ mesh: ring, t: 1 });
      }
    }
  };

  // (x, ground, z): where the chicken's feet are, air: how high it hops. show: false hides it.
  Aura.prototype.update = function (dt, x, ground, z, air, show) {
    this.group.visible = !!this.spec && show;
    if (!this.spec || !show) return;
    this.t += dt;
    var sp = this.spec, n = this.items.length, i;
    this.group.position.set(x, ground, z);
    for (i = 0; i < n; i++) {
      var a = this.t * sp.w + i * Math.PI * 2 / n, m = this.items[i];
      m.position.set(Math.cos(a) * sp.r, sp.h + air + Math.sin(this.t * 2.3 + i * 1.7) * (sp.wob || 0.07), Math.sin(a) * sp.r);
      m.rotation.y = -a + Math.PI / 2;
      if (m.userData.spin) m.userData.spin.rotation.y += dt * 4;      // (the coins spin on the spot)
      else m.rotation.x = this.t * 3 + i;
    }
    if (sp.pulse) {                                   // magnetic waves ripple out from the chicken
      this.pulseT -= dt;
      if (this.pulseT <= 0) {
        this.pulseT = 0.85;
        var p = this.pulses.filter(function (q) { return q.t >= 1; })[0];
        if (p) { p.t = 0; p.mesh.visible = true; }
      }
      for (i = 0; i < this.pulses.length; i++) {
        var q = this.pulses[i];
        if (q.t >= 1) continue;
        q.t += dt / 0.85;
        if (q.t >= 1) { q.mesh.visible = false; continue; }
        q.mesh.position.y = 0.04;
        q.mesh.scale.setScalar(0.6 + q.t * 1.7);
        q.mesh.material.opacity = 0.7 * (1 - q.t);
      }
    }
  };

  Aura.prototype.dispose = function () { this.clear(); scene && scene.remove(this.group); };

  // =====================================================================
  // Death animations. A style takes over the chicken's body for every way to lose except the
  // eagle / UFO grab: begin(player, type), update(player, t, dt), duration (seconds).
  // =====================================================================
  var CONFETTI = [0xff5a5f, 0xffd93d, 0x5cb83f, 0x3d8bff, 0xff8a1f, 0xc36bff, 0xffffff];

  var DEATH = {
    poof: {
      duration: 0.7,
      begin: function (p) {
        Particles.burst(p.x, p.y + 0.4, p.z, { colors: [0xffffff, 0xe6e6e6, 0xcfcfcf], count: 26, speed: 2.2, up: 1.8, size: 0.34, life: 0.8, gravity: -0.6, spread: 0.3, floor: p.y - 0.1 });
        Particles.feathers(p.x, p.y + 0.5, p.z, 8);
        Particles.ring(p.x, p.y + 0.05, p.z, 0xffffff, 2.4);
        p.group.visible = false;
        if (GameAudio) GameAudio.poof();
      },
      update: function () { }
    },
    confetti: {
      duration: 1.0,
      begin: function (p) {
        p.deathFxData = { burst2: false };
        Particles.burst(p.x, p.y + 0.5, p.z, { colors: CONFETTI, count: 40, speed: 3.4, up: 8, size: 0.1, life: 1.3, gravity: 8, spread: 0.2, floor: p.y - 0.2 });
        Particles.ring(p.x, p.y + 0.05, p.z, 0xffd93d, 3);
        if (GameAudio) GameAudio.tada();
      },
      update: function (p, t) {
        if (t < 0.12) { var s = 1 + t * 5; p.group.scale.set(s, s, s); }       // puffs up like a party popper...
        else {
          if (p.group.visible) {
            p.group.visible = false;                                          // ...and pops
            Particles.burst(p.x, p.y + 0.8, p.z, { colors: CONFETTI, count: 30, speed: 3.8, up: 6, size: 0.11, life: 1.2, gravity: 7, spread: 0.3, floor: p.y - 0.2 });
            if (GameAudio) GameAudio.pop();
          }
        }
      }
    },
    spin: {
      duration: 1.05,
      begin: function (p) { p.deathFxData = { star: 0 }; if (GameAudio) GameAudio.whirl(); },
      update: function (p, t, dt) {
        var k = Math.min(1, t / 0.95);
        p.group.position.set(p.x, p.y + t * 1.2 + t * t * 6, p.z);
        p.group.rotation.y += 22 * dt;
        p.group.rotation.z = Math.sin(t * 9) * 0.25;
        var s = Utils.lerp(1, 0.12, k * k);
        p.group.scale.set(s, s, s);
        if ((p.deathFxData.star -= dt) <= 0) {
          p.deathFxData.star = 0.05;
          Particles.burst(p.group.position.x, p.group.position.y + 0.3, p.group.position.z, { colors: [0xffe14d, 0xffffff, 0xff9f1c], count: 1, speed: 1.2, up: 0.5, size: 0.13, life: 0.5, gravity: 1, spread: 0.3, floor: -9 });
        }
      }
    },
    ghost: {
      duration: 1.35,
      begin: function (p) {
        p.deathFxData = null;
        if (!p.ghost) p.setGhost(true);
        if (GameAudio) GameAudio.ghostOoo();
      },
      update: function (p, t) {
        var k = Math.min(1, t / 1.25);
        p.group.position.set(p.x + Math.sin(t * 5) * 0.12, p.y + 0.1 + t * 1.5, p.z);
        p.group.rotation.y += 0.04;
        p.group.scale.set(1, 1 + Math.sin(t * 7) * 0.05, 1);
        p.ghostMats.forEach(function (m) { m.opacity = 0.5 * (1 - k * k); });
      }
    },
    rocket: {
      duration: 1.15,
      begin: function (p) { p.deathFxData = { flame: 0, boom: false }; if (GameAudio) GameAudio.rocket(); },
      update: function (p, t, dt) {
        var y = p.y + 0.25 * t * t * 16 + t * 0.6;
        p.group.position.set(p.x, y, p.z);
        p.group.rotation.x = -0.25;
        p.group.rotation.y += 9 * dt;
        var s = Utils.lerp(1, 0.55, Math.min(1, t / 0.9));
        p.group.scale.set(s, s, s);
        if ((p.deathFxData.flame -= dt) <= 0 && t < 0.9) {
          p.deathFxData.flame = 0.03;
          Particles.burst(p.x, y - 0.1, p.z, { colors: [0xff7a1a, 0xffc233, 0xfff3b0, 0xffffff], count: 2, speed: 0.7, up: -2, size: 0.17, life: 0.45, gravity: 2, spread: 0.2, floor: -9 });
        }
        if (t > 0.9 && !p.deathFxData.boom) {
          p.deathFxData.boom = true;
          p.group.visible = false;
          Particles.burst(p.x, y, p.z, { colors: CONFETTI.concat([0xffe14d]), count: 34, speed: 4.2, up: 2, size: 0.12, life: 1, gravity: 3, spread: 0.2, floor: -9 });
          Particles.ring(p.x, y, p.z, 0xffe14d, 3.4);
        }
      }
    }
  };

  return {
    init: function (sc) { scene = sc; initTrails(); },
    update: function (dt) { updateTrails(dt); },
    // forget every mark (a new run)
    clear: function () {
      for (var i = 0; i < liveDecals.length; i++) liveDecals[i].mesh.visible = false;
      liveDecals.length = 0;
    },
    trailStep: trailStep,
    Aura: Aura,
    // the style for the worn death animation (null = the normal one)
    deathStyle: function () { return DEATH[Cosmetics.eqId('death')] || null; }
  };
})();
