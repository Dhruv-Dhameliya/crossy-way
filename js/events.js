// The visuals of two rare events (game.js decides when they happen):
//  supply drop  - a drone flies across and drops a parachute crate on a grass lane ahead
//  fireworks    - bursts of colour over the field (game.js turns them into a short combo boost)
// The traffic jam lives in world.js (it is just lanes that stop and honk).
var Events = (function () {
  var scene = null, fx = [];
  var DRONE_Y = 4.6;
  var COLORS = [[0xff5a5f, 0xffd23f, 0xffffff], [0x3d8bff, 0x7fd6ff, 0xffffff], [0x5cb83f, 0xc8ff8a, 0xffffff], [0xc36bff, 0xff8fe0, 0xffffff], [0xff9f1c, 0xffe14d, 0xffffff]];
  var shadowGeo = null;

  function init(sc) { scene = sc; }

  // A bigger version of the pet drone, with a crate hanging underneath on a rope.
  function buildDrone() {
    var def = Pets.kinds.drone.build();
    var g = new THREE.Group();
    var body = new THREE.Group();
    body.add(Utils.voxelMesh(def.boxes));
    var rotors = [];
    def.extra.forEach(function (e) {
      var m = Utils.voxelMesh(e.boxes);
      m.position.set(e.x, e.y, e.z);
      body.add(m);
      rotors.push({ mesh: m, spin: e.spin });
    });
    body.scale.setScalar(2.1);
    g.add(body);
    var hang = new THREE.Group();
    var rope = Utils.voxelMesh([{ x: 0, y: -0.5, z: 0, w: 0.04, h: 0.8, d: 0.04, color: 0x333333 }]);
    var crate = Models.buildCrate();
    crate.userData.chute.visible = false;
    crate.position.y = -1.35;
    hang.add(rope);
    hang.add(crate);
    hang.position.y = -0.3;
    g.add(hang);
    g.userData = { rotors: rotors, body: body, hang: hang, crate: crate };
    return g;
  }

  function blob(size) {
    if (!shadowGeo) { shadowGeo = new THREE.CircleGeometry(0.5, 16); shadowGeo.rotateX(-Math.PI / 2); shadowGeo.__shared = true; }
    var m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.scale.setScalar(size);
    m.renderOrder = 1;
    return m;
  }

  function remove(f) {
    f.objs.forEach(function (o) { scene.remove(o); Utils.disposeObject3D(o); });
  }

  // Fly a drone across the lane where a crate will land. False if there is nowhere to drop one.
  function startSupplyDrop(world, player) {
    var spot = world.pickCrateSpot(Math.round(player.z));
    if (!scene || !spot) return false;
    var dir = Math.random() < 0.5 ? 1 : -1;
    var g = buildDrone(), shadow = blob(1.3);
    var x0 = spot.x - dir * 20;
    g.position.set(x0, DRONE_Y, spot.z);
    g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(g);
    scene.add(shadow);
    fx.push({ kind: 'drone', world: world, g: g, shadow: shadow, objs: [g, shadow], dir: dir, x: x0, spot: spot, released: false, t: 0 });
    if (GameAudio) GameAudio.drone(0.9);
    return true;
  }

  // A firework show: bursts every little while for `dur` seconds.
  function startFireworks(dur) {
    fx.push({ kind: 'fireworks', objs: [], t: 0, dur: dur, next: 0.15 });
  }

  function burst(player) {
    var x = player.x + Utils.randRange(-4.5, 4.5), y = Utils.randRange(2.6, 4.6), z = player.z + Utils.randRange(0.5, 5);   // (low enough to stay on screen)
    var cols = Utils.choice(COLORS);
    [[12, 5], [12, 1.2], [12, -3]].forEach(function (c) {      // three rings of sparks make a ball
      Particles.burst(x, y, z, { colors: cols, count: c[0], speed: 4, up: c[1], size: 0.2, life: 1.25, gravity: 3.5, spread: 0.15, floor: -9 });
    });
    Particles.ring(x, y, z, cols[0], 3);
    if (GameAudio) GameAudio.firework(0.8);
  }

  function update(dt, player) {
    for (var i = fx.length - 1; i >= 0; i--) {
      var f = fx[i];
      f.t += dt;
      if (f.kind === 'drone') {
        f.x += f.dir * 7 * dt;
        var u = f.g.userData;
        f.g.position.x = f.x;
        f.g.position.y = DRONE_Y + Math.sin(f.t * 3) * 0.08;
        u.body.rotation.x = 0.22;                                          // nose down: it is flying
        u.hang.rotation.z = Math.sin(f.t * 4) * 0.06;
        for (var r = 0; r < u.rotors.length; r++) u.rotors[r].mesh.rotation.y = f.t * 40 * u.rotors[r].spin;
        f.shadow.position.set(f.x, 0.03, f.spot.z);
        if (!f.released && (f.x - f.spot.x) * f.dir >= 0) {
          f.released = true;
          u.hang.visible = false;
          f.world.dropCrate(f.spot.z, f.spot.x, DRONE_Y - 1.6);
          Particles.burst(f.spot.x, DRONE_Y - 1.4, f.spot.z, { colors: [0xffffff, 0xff5a5f], count: 6, speed: 1.2, up: 1, size: 0.1, life: 0.5, gravity: 4, spread: 0.2, floor: -9 });
        }
        if (Math.abs(f.x - f.spot.x) > 22) { remove(f); fx.splice(i, 1); }
      } else if (f.kind === 'fireworks') {
        if ((f.next -= dt) <= 0 && f.t < f.dur) { f.next = Utils.randRange(0.55, 1.0); burst(player); }
        if (f.t >= f.dur) fx.splice(i, 1);
      }
    }
  }

  function clear() {
    fx.forEach(remove);
    fx.length = 0;
  }

  return { init: init, startSupplyDrop: startSupplyDrop, startFireworks: startFireworks, update: update, clear: clear };
})();
