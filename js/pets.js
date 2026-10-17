// Pet companions (bought in the shop, cosmetic only): a little friend that trails the chicken.
// It never does anything and nothing can hurt it. It follows the exact path the chicken walked
// (a "snake" following a short trail of positions), so it never wanders into a tree or a car's
// way: it only ever stands where the chicken has just stood.
var Pets = (function () {
  function B(x, y, z, w, h, d, color) { return { x: x, y: y, z: z, w: w, h: h, d: d, color: color }; }

  var FOLLOW = 0.95;       // how far behind the chicken (along its path) the pet stays

  // Each pet: build() returns { boxes, extra: [{boxes, x, y, z, spin | flap}] }. The pet faces +z.
  // Boxes are centred like everywhere else; y = 0 is the ground (or the hover line for flyers).
  var KINDS = {
    duckling: { build: function () {
      return { boxes: [
        B(0, 0.2, 0, 0.36, 0.3, 0.4, 0xffd84a), B(0, 0.44, 0.1, 0.28, 0.26, 0.28, 0xffd84a),
        B(0, 0.4, 0.28, 0.18, 0.07, 0.1, 0xff8f1f),
        B(-0.07, 0.48, 0.245, 0.045, 0.06, 0.03, 0x222222), B(0.07, 0.48, 0.245, 0.045, 0.06, 0.03, 0x222222),
        B(-0.2, 0.22, -0.02, 0.05, 0.16, 0.2, 0xf2c230), B(0.2, 0.22, -0.02, 0.05, 0.16, 0.2, 0xf2c230),
        B(0, 0.3, -0.22, 0.1, 0.1, 0.08, 0xf2c230),
        B(-0.08, 0.02, 0.05, 0.1, 0.04, 0.14, 0xff8f1f), B(0.08, 0.02, 0.05, 0.1, 0.04, 0.14, 0xff8f1f)
      ] };
    } },
    frog: { hop: 1.4, build: function () {
      return { boxes: [
        B(0, 0.17, 0, 0.42, 0.24, 0.44, 0x5fbf4a), B(0, 0.1, 0.13, 0.3, 0.08, 0.2, 0xd8f0b0),
        B(-0.12, 0.34, 0.14, 0.13, 0.13, 0.13, 0xffffff), B(0.12, 0.34, 0.14, 0.13, 0.13, 0.13, 0xffffff),
        B(-0.12, 0.34, 0.2, 0.06, 0.07, 0.03, 0x222222), B(0.12, 0.34, 0.2, 0.06, 0.07, 0.03, 0x222222),
        B(-0.24, 0.07, -0.1, 0.1, 0.13, 0.24, 0x4aa83a), B(0.24, 0.07, -0.1, 0.1, 0.13, 0.24, 0x4aa83a),
        B(-0.16, 0.03, 0.22, 0.1, 0.05, 0.14, 0x4aa83a), B(0.16, 0.03, 0.22, 0.1, 0.05, 0.14, 0x4aa83a),
        B(0, 0.2, 0.225, 0.28, 0.02, 0.02, 0x2b5a22)
      ] };
    } },
    bunny: { hop: 1.2, build: function () {
      return { boxes: [
        B(0, 0.2, 0, 0.34, 0.3, 0.4, 0xf6f6f6), B(0, 0.44, 0.1, 0.28, 0.24, 0.26, 0xf6f6f6),
        B(-0.07, 0.68, 0.06, 0.08, 0.3, 0.06, 0xf6f6f6), B(0.07, 0.68, 0.06, 0.08, 0.3, 0.06, 0xf6f6f6),
        B(-0.07, 0.68, 0.095, 0.04, 0.22, 0.02, 0xffb6c8), B(0.07, 0.68, 0.095, 0.04, 0.22, 0.02, 0xffb6c8),
        B(0, 0.42, 0.235, 0.05, 0.04, 0.03, 0xff8fab),
        B(-0.07, 0.48, 0.235, 0.04, 0.06, 0.03, 0x222222), B(0.07, 0.48, 0.235, 0.04, 0.06, 0.03, 0x222222),
        B(0, 0.22, -0.25, 0.13, 0.13, 0.13, 0xffffff),
        B(-0.1, 0.03, 0.12, 0.1, 0.05, 0.18, 0xe6e6e6), B(0.1, 0.03, 0.12, 0.1, 0.05, 0.18, 0xe6e6e6)
      ] };
    } },
    drone: { fly: true, build: function () {
      var extra = [];
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (c) {
        extra.push({ boxes: [B(0, 0, 0, 0.36, 0.012, 0.05, 0xe8ecf2), B(0, 0, 0, 0.05, 0.012, 0.36, 0xe8ecf2)], x: c[0] * 0.26, y: 0.1, z: c[1] * 0.26, spin: c[0] * c[1] });
      });
      return { boxes: [
        B(0, 0, 0, 0.36, 0.12, 0.36, 0x7c8594), B(0, 0.09, 0, 0.22, 0.07, 0.22, 0x3ec3ff),
        B(-0.2, 0.01, -0.2, 0.2, 0.05, 0.05, 0x59606e), B(0.2, 0.01, -0.2, 0.2, 0.05, 0.05, 0x59606e),
        B(-0.2, 0.01, 0.2, 0.2, 0.05, 0.05, 0x59606e), B(0.2, 0.01, 0.2, 0.2, 0.05, 0.05, 0x59606e),
        B(-0.26, 0.04, -0.26, 0.1, 0.07, 0.1, 0x333a44), B(0.26, 0.04, -0.26, 0.1, 0.07, 0.1, 0x333a44),
        B(-0.26, 0.04, 0.26, 0.1, 0.07, 0.1, 0x333a44), B(0.26, 0.04, 0.26, 0.1, 0.07, 0.1, 0x333a44),
        B(0, 0.0, 0.2, 0.08, 0.06, 0.04, 0xff4d4d), B(0, -0.09, 0.05, 0.1, 0.07, 0.1, 0x222831)
      ], extra: extra };
    } },
    dragon: { hop: 0.9, build: function () {
      return { boxes: [
        B(0, 0.22, 0, 0.34, 0.3, 0.46, 0x4fb58a), B(0, 0.16, 0.06, 0.3, 0.12, 0.3, 0xcdf0d8),
        B(0, 0.48, 0.2, 0.26, 0.24, 0.28, 0x4fb58a), B(0, 0.43, 0.37, 0.18, 0.12, 0.1, 0x46a57c),
        B(-0.08, 0.64, 0.12, 0.05, 0.1, 0.05, 0xffe27a), B(0.08, 0.64, 0.12, 0.05, 0.1, 0.05, 0xffe27a),
        B(-0.07, 0.52, 0.34, 0.05, 0.06, 0.03, 0x222222), B(0.07, 0.52, 0.34, 0.05, 0.06, 0.03, 0x222222),
        B(0, 0.15, -0.3, 0.14, 0.14, 0.18, 0x4fb58a), B(0, 0.12, -0.44, 0.09, 0.09, 0.16, 0x4fb58a), B(0, 0.12, -0.55, 0.06, 0.12, 0.06, 0xffe27a),
        B(0, 0.4, -0.02, 0.06, 0.06, 0.08, 0xffe27a), B(0, 0.38, -0.16, 0.06, 0.06, 0.08, 0xffe27a),
        B(-0.1, 0.04, 0.14, 0.1, 0.08, 0.12, 0x46a57c), B(0.1, 0.04, 0.14, 0.1, 0.08, 0.12, 0x46a57c),
        B(-0.1, 0.04, -0.14, 0.1, 0.08, 0.12, 0x46a57c), B(0.1, 0.04, -0.14, 0.1, 0.08, 0.12, 0x46a57c)
      ], extra: [
        { boxes: [B(0.14, 0, 0, 0.28, 0.04, 0.28, 0xe86a6a)], x: 0.17, y: 0.38, z: -0.05, flap: 1 },
        { boxes: [B(-0.14, 0, 0, 0.28, 0.04, 0.28, 0xe86a6a)], x: -0.17, y: 0.38, z: -0.05, flap: -1 }
      ] };
    } }
  };

  var shadowGeo = null;

  function Pet(scene) {
    this.scene = scene;
    this.kind = null;
    this.group = null;
    this.spec = null;
    this.parts = [];
    this.trail = [];
    this.x = 0; this.y = 0; this.z = 0;
    this.facing = 0;
    this.moving = 0;       // smoothed speed
    this.t = Math.random() * 10;
    if (!shadowGeo) {
      shadowGeo = new THREE.CircleGeometry(0.5, 16);
      shadowGeo.rotateX(-Math.PI / 2);
      shadowGeo.__shared = true;
    }
    this.shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2
    }));
    this.shadow.renderOrder = 1;
    this.shadow.visible = false;
    scene.add(this.shadow);
  }

  // Wear a pet (id from the shop) or none (null).
  Pet.prototype.setKind = function (id) {
    if (this.group) { this.scene.remove(this.group); Utils.disposeObject3D(this.group); this.group = null; }
    this.parts = [];
    this.kind = id && KINDS[id] ? id : null;
    this.spec = this.kind ? KINDS[this.kind] : null;
    this.shadow.visible = !!this.spec;
    if (!this.spec) return;
    var def = this.spec.build();
    var g = new THREE.Group();
    var inner = new THREE.Group();        // squash / hop happen here, the outer group follows the path
    inner.add(Utils.voxelMesh(def.boxes));
    (def.extra || []).forEach(function (e) {
      var m = Utils.voxelMesh(e.boxes);
      m.position.set(e.x, e.y, e.z);
      inner.add(m);
      this.parts.push({ mesh: m, spin: e.spin, flap: e.flap });
    }, this);
    g.add(inner);
    g.userData.inner = inner;
    this.scene.add(g);
    this.group = g;
  };

  // Back beside the chicken (a new run, or just after buying the pet).
  Pet.prototype.reset = function (player) {
    this.trail.length = 0;
    var y = player.y - player.air;
    this.trail.push({ x: player.x + 0.9, y: y, z: player.z - 0.25 });
    this.x = player.x + 0.9; this.y = y; this.z = player.z - 0.25;
    this.facing = player.facing;
    this.moving = 0;
    if (this.group) { this.group.visible = true; this.place(0); }
  };

  Pet.prototype.update = function (dt, player) {
    if (!this.group) return;
    var py = player.y - player.air;
    var tr = this.trail;
    if (!player.dying) {
      var last = tr[tr.length - 1];
      if (!last || Math.abs(last.x - player.x) + Math.abs(last.z - player.z) > 0.12) {
        tr.push({ x: player.x, y: py, z: player.z });
        if (tr.length > 60) tr.shift();
      }
    }
    // the spot FOLLOW tiles back along the chicken's path
    var rem = FOLLOW, cx = player.x, cy = py, cz = player.z, tx = null, ty = 0, tz = 0;
    for (var i = tr.length - 1; i >= 0; i--) {
      var q = tr[i], d = Math.sqrt((q.x - cx) * (q.x - cx) + (q.z - cz) * (q.z - cz));
      if (d >= rem && d > 1e-6) {
        var k = rem / d;
        tx = cx + (q.x - cx) * k; ty = cy + (q.y - cy) * k; tz = cz + (q.z - cz) * k;
        break;
      }
      rem -= d; cx = q.x; cy = q.y; cz = q.z;
    }
    if (tx === null) { tx = cx; ty = cy; tz = cz; }   // the path is still short: wait where it starts
    var f = 1 - Math.exp(-dt * 13);
    var ox = this.x, oz = this.z;
    this.x += (tx - this.x) * f; this.y += (ty - this.y) * f; this.z += (tz - this.z) * f;
    var vx = (this.x - ox) / Math.max(dt, 1e-4), vz = (this.z - oz) / Math.max(dt, 1e-4);
    var sp = Math.sqrt(vx * vx + vz * vz);
    this.moving += (Math.min(sp, 6) - this.moving) * (1 - Math.exp(-dt * 10));
    if (sp > 0.6) this.facing = Utils.lerpAngle(this.facing, Math.atan2(vx, vz), 0.35);
    else this.facing = Utils.lerpAngle(this.facing, player.facing, 0.08);
    this.place(dt);
  };

  Pet.prototype.place = function (dt) {
    this.t += dt;
    var spec = this.spec, inner = this.group.userData.inner;
    var mv = Utils.clamp(this.moving / 2.2, 0, 1), y = this.y, sq = 1;
    if (spec.fly) {
      y += 1.15 + Math.sin(this.t * 2.6) * 0.07;
      inner.rotation.x = mv * 0.25;                       // leans into the flight
      inner.rotation.z = Math.sin(this.t * 1.7) * 0.04;
    } else {
      var hop = spec.hop || 1;
      var ph = Math.abs(Math.sin(this.t * 12 * (spec.hop ? 0.75 : 1)));
      y += mv * ph * 0.17 * hop;                          // little hops while it keeps up
      sq = 1 + (1 - ph) * mv * 0.06 + Math.sin(this.t * 2.4) * 0.012 * (1 - mv);
      inner.rotation.x = -mv * 0.12;
    }
    inner.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.group.position.set(this.x, y, this.z);
    this.group.rotation.y = this.facing;
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      if (p.spin) p.mesh.rotation.y = this.t * 38 * p.spin;
      else if (p.flap) p.mesh.rotation.z = p.flap * (0.35 + Math.sin(this.t * (6 + mv * 8)) * 0.35);
    }
    this.shadow.position.set(this.x, this.y + 0.014, this.z);
    this.shadow.scale.setScalar(spec.fly ? 0.45 : 0.55);
    this.shadow.material.opacity = spec.fly ? 0.18 : 0.26;
  };

  Pet.prototype.setVisible = function (v) {
    if (this.group) this.group.visible = v;
    this.shadow.visible = v && !!this.spec;
  };

  return { Pet: Pet, kinds: KINDS };
})();
