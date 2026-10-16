// Space atmosphere: faint meteors streak across the sky and pale dust drifts by.
// (Plugged into Weather through the theme's `fx` hook; invisible outside space.)
var SpaceFx = (function () {
  var METEOR_MAX = 20, DUST_MAX = 170;
  var scene = null;
  var sets = [];                 // the meteor line sets (one today; the loop below handles any number)
  var dust = null, dustPos = null;
  var meteorAmt = 0;

  function init(sc) {
    scene = sc;
    [0xffd9b0].forEach(function (color) {
      var pos = new Float32Array(METEOR_MAX * 6);
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      var lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.NormalBlending }));
      lines.frustumCulled = false;
      lines.visible = false;
      scene.add(lines);
      var vel = [];
      for (var i = 0; i < METEOR_MAX; i++) vel.push({ vx: 0, vy: 0, vz: 0, alive: false, wait: Utils.randRange(0, 3) });
      sets.push({ lines: lines, pos: pos, vel: vel });
    });

    dustPos = new Float32Array(DUST_MAX * 3);
    var colors = new Float32Array(DUST_MAX * 3);
    var palette = [new THREE.Color(0xffffff), new THREE.Color(0xc8d4f0), new THREE.Color(0xffffff), new THREE.Color(0xe8e0d0)];
    for (var d = 0; d < DUST_MAX; d++) {
      dustPos[d * 3] = Utils.randRange(-18, 18); dustPos[d * 3 + 1] = Utils.randRange(0.2, 9); dustPos[d * 3 + 2] = Utils.randRange(-18, 18);
      var c = palette[d % palette.length];
      colors[d * 3] = c.r; colors[d * 3 + 1] = c.g; colors[d * 3 + 2] = c.b;
    }
    var dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dustPos, 3).setUsage(THREE.DynamicDrawUsage));
    dg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    dust = new THREE.Points(dg, new THREE.PointsMaterial({ vertexColors: true, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    dust.frustumCulled = false;
    dust.visible = false;
    scene.add(dust);
  }

  // mix: 0..1 how much of the space sky is showing; rainAmt: the weather's rain (-> meteor shower)
  function update(dt, camX, camZ, level, mix, rainAmt, time) {
    meteorAmt = Math.max(rainAmt, 0.25 * mix);
    var showDust = mix > 0.02;
    dust.visible = showDust;
    if (showDust) {
      dust.material.opacity = (0.4 + 0.1 * Math.sin(time * 2.3)) * mix;
      var nd = level === 'high' ? DUST_MAX : level === 'medium' ? 110 : 60;
      for (var d = 0; d < nd; d++) {
        var o = d * 3;
        dustPos[o + 1] += dt * 0.12;
        if (dustPos[o + 1] > 9.5) dustPos[o + 1] = 0.2;
        // keep the field centred on the camera as it moves
        dustPos[o] = camX + ((dustPos[o] - camX + 18) % 36 + 36) % 36 - 18;         // wraps however far the camera jumped
        dustPos[o + 2] = camZ + ((dustPos[o + 2] - camZ + 18) % 36 + 36) % 36 - 18;
      }
      dust.geometry.setDrawRange(0, nd);
      dust.geometry.attributes.position.needsUpdate = true;
    }
    var on = meteorAmt > 0.02 && mix > 0.02;
    for (var si = 0; si < sets.length; si++) {
      var set = sets[si];
      set.lines.visible = on;
      if (!on) continue;
      set.lines.material.opacity = Math.min(0.6, 0.25 + meteorAmt * 0.4);
      var count = Math.max(2, Math.round(METEOR_MAX * meteorAmt * (level === 'low' ? 0.5 : 1)));
      var p = set.pos;
      for (var i = 0; i < METEOR_MAX; i++) {
        var m = set.vel[i], k = i * 6;
        if (i >= count && !m.alive) { p[k] = p[k + 1] = p[k + 2] = p[k + 3] = p[k + 4] = p[k + 5] = 0; continue; }
        if (!m.alive) {
          m.wait -= dt;
          if (m.wait > 0) continue;
          m.alive = true;
          m.x = camX + Utils.randRange(-6, 22); m.y = Utils.randRange(7, 13); m.z = camZ + Utils.randRange(4, 20);
          var sp = Utils.randRange(14, 24);
          m.vx = -sp * 0.8; m.vy = -sp * 0.45; m.vz = -sp * 0.5;
        }
        m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
        p[k] = m.x; p[k + 1] = m.y; p[k + 2] = m.z;
        p[k + 3] = m.x - m.vx * 0.11; p[k + 4] = m.y - m.vy * 0.11; p[k + 5] = m.z - m.vz * 0.11;
        if (m.y < 0.2) { m.alive = false; m.wait = Utils.randRange(0.2, 2.5) / Math.max(0.3, meteorAmt); p[k] = p[k + 1] = p[k + 2] = p[k + 3] = p[k + 4] = p[k + 5] = 0; }
      }
      set.lines.geometry.attributes.position.needsUpdate = true;
    }
  }

  function label(info) {
    return '🌌' + (meteorAmt > 0.3 ? '☄️' : info.fog > 0.3 ? '🌫️' : '');
  }

  return { init: init, update: update, label: label };
})();
