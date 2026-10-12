// Tiny pooled cube particles (feathers, splashes, sparkles) and water ripples.
var Particles = (function () {
  var scene = null;
  var geo = null;
  var pool = [];
  var active = [];
  var rings = [];
  var mats = {};
  var ringGeo = null;

  function material(color) {
    if (!mats[color]) {
      mats[color] = new THREE.MeshLambertMaterial({ color: color, emissive: color, emissiveIntensity: 0.25 });
    }
    return mats[color];
  }

  function init(sc) {
    scene = sc;
    geo = new THREE.BoxGeometry(1, 1, 1);
    ringGeo = new THREE.RingGeometry(0.28, 0.42, 20);
    ringGeo.rotateX(-Math.PI / 2);
  }

  function grab() {
    var p = pool.pop();
    if (!p) {
      var mesh = new THREE.Mesh(geo, material(0xffffff));
      mesh.castShadow = false;
      p = { mesh: mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3() };
      scene.add(mesh);
    }
    p.mesh.visible = true;
    return p;
  }

  // opts: colors[], count, speed, up, size, life, gravity, spread
  function burst(x, y, z, opts) {
    var n = opts.count || 8;
    for (var i = 0; i < n; i++) {
      var p = grab();
      var a = Math.random() * Math.PI * 2;
      var s = (opts.speed || 3) * (0.4 + Math.random() * 0.8);
      p.mesh.material = material(Utils.choice(opts.colors));
      p.mesh.position.set(x + (Math.random() - 0.5) * (opts.spread || 0.2), y, z + (Math.random() - 0.5) * (opts.spread || 0.2));
      p.vel.set(Math.cos(a) * s, (opts.up || 4) * (0.5 + Math.random() * 0.7), Math.sin(a) * s);
      p.spin.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
      p.size = (opts.size || 0.12) * (0.7 + Math.random() * 0.6);
      p.mesh.scale.setScalar(p.size);
      p.life = p.maxLife = (opts.life || 0.7) * (0.7 + Math.random() * 0.5);
      p.gravity = opts.gravity === undefined ? 14 : opts.gravity;
      p.floor = opts.floor === undefined ? -0.3 : opts.floor;
      active.push(p);
    }
  }

  function ring(x, y, z, color, grow) {
    var m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.85, depthWrite: false }));
    m.position.set(x, y, z);
    scene.add(m);
    rings.push({ mesh: m, t: 0, grow: grow || 2.6 });
  }

  function update(dt) {
    for (var i = active.length - 1; i >= 0; i--) {
      var p = active[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        pool.push(p);
        active.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < p.floor) {
        p.mesh.position.y = p.floor;
        p.vel.multiplyScalar(0.3);
      }
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.scale.setScalar(p.size * Math.min(1, p.life / (p.maxLife * 0.5)));
    }
    for (var j = rings.length - 1; j >= 0; j--) {
      var r = rings[j];
      r.t += dt / 0.7;
      if (r.t >= 1) {
        scene.remove(r.mesh);
        r.mesh.material.dispose();
        rings.splice(j, 1);
        continue;
      }
      r.mesh.scale.setScalar(1 + r.t * r.grow);
      r.mesh.material.opacity = 0.85 * (1 - r.t);
    }
  }

  function clear() {
    for (var i = 0; i < active.length; i++) {
      active[i].mesh.visible = false;
      pool.push(active[i]);
    }
    active.length = 0;
    for (var j = 0; j < rings.length; j++) {
      scene.remove(rings[j].mesh);
      rings[j].mesh.material.dispose();
    }
    rings.length = 0;
  }

  return {
    init: init,
    burst: burst,
    ring: ring,
    update: update,
    clear: clear,
    feathers: function (x, y, z, n) {
      burst(x, y, z, { colors: [0xffffff, 0xf2f2f2, 0xffe9c9], count: n || 14, speed: 3.2, up: 5, size: 0.13, life: 0.9, gravity: 9, spread: 0.3 });
    },
    splash: function (x, y, z) {
      burst(x, y, z, { colors: [0xffffff, 0xbfeaff, 0x7fd3f7], count: 16, speed: 2.6, up: 5.5, size: 0.11, life: 0.8, gravity: 16, spread: 0.2, floor: y - 0.05 });
      ring(x, y + 0.02, z, 0xdff6ff);
    },
    sparkle: function (x, y, z) {
      burst(x, y, z, { colors: [0xfff0a0, 0xffd23f, 0xffffff], count: 8, speed: 2.2, up: 3, size: 0.09, life: 0.5, gravity: 4, spread: 0.1 });
    },
    puff: function (x, y, z) {
      burst(x, y, z, { colors: [0xe8f5d8, 0xcfe8b8], count: 4, speed: 1.1, up: 1.2, size: 0.1, life: 0.35, gravity: 3, spread: 0.3, floor: y });
    }
  };
})();
