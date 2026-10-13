// Day / night cycle (driven by how far you've run) and weather (clear, rain
// with lightning, fog). It owns the sky, fog and light colours. In the Space
// biome the sky is always a starry dusk, rain becomes a meteor shower and fog
// a purple nebula haze; drifting space dust fills the air.
var Weather = (function () {
  var DAY = { sky: 0xb7e4f7, ambC: 0xffffff, ambI: 0.66, sunC: 0xfff6e0, sunI: 0.62, night: 0 };
  var DUSK = { sky: 0xf5a86b, ambC: 0xffd9b8, ambI: 0.56, sunC: 0xffa86b, sunI: 0.55, night: 0.35 };
  var NIGHT = { sky: 0x101a3d, ambC: 0x8fa8ff, ambI: 0.46, sunC: 0x7f9dff, sunI: 0.3, night: 1 };
  var DAWN = { sky: 0xf7b6c8, ambC: 0xffe0e6, ambI: 0.58, sunC: 0xffc9a8, sunI: 0.55, night: 0.3 };
  var SPACE = { sky: 0x120f2e, ambC: 0xb9a8ff, ambI: 0.64, sunC: 0xcfd8ff, sunI: 0.5, night: 0.62 };
  var NEBULA = 0x4a2a8c;
  var TRACK = [[0, DAY], [0.36, DAY], [0.48, DUSK], [0.6, NIGHT], [0.86, NIGHT], [0.94, DAWN], [1, DAY]];
  var CYCLE_ROWS = 220;      // one full day/night cycle
  var RAIN_MAX = 480;

  var scene, ambient, sun, bgColor;
  var timeMode = 'auto', weatherMode = 'auto';
  var cur = null;            // smoothed values actually applied
  var rain = 0, fog = 0;     // current intensities 0..1
  var target = { rain: 0, fog: 0 };
  var nextChange = 30;       // row at which auto weather picks something new
  var flash = 0, thunderTimer = 8, flickerT = -1;
  var rainLines = null, rainPos = null, rainVel = null;
  var rainCount = 400;
  var tmpA = new THREE.Color(), tmpB = new THREE.Color();
  var spaceMix = 0, spaceTarget = 0;   // 0 = forest sky, 1 = space sky
  var meteors = null, meteorPos = null, meteorVel = null, meteorAmt = 0;
  var dust = null, dustPos = null, METEOR_MAX = 18, DUST_MAX = 150;
  var GRAY = new THREE.Color(0x93a1ad);

  function sample(t) {
    for (var i = 0; i < TRACK.length - 1; i++) {
      var a = TRACK[i], b = TRACK[i + 1];
      if (t <= b[0]) {
        var k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
        return {
          sky: tmpA.setHex(a[1].sky).lerp(tmpB.setHex(b[1].sky), k).clone(),
          ambC: tmpA.setHex(a[1].ambC).lerp(tmpB.setHex(b[1].ambC), k).clone(),
          sunC: tmpA.setHex(a[1].sunC).lerp(tmpB.setHex(b[1].sunC), k).clone(),
          ambI: Utils.lerp(a[1].ambI, b[1].ambI, k), sunI: Utils.lerp(a[1].sunI, b[1].sunI, k),
          night: Utils.lerp(a[1].night, b[1].night, k)
        };
      }
    }
    return sample(0);
  }

  function init(sc, amb, sunLight) {
    scene = sc; ambient = amb; sun = sunLight;
    bgColor = scene.background;
    cur = { sky: new THREE.Color(DAY.sky), ambC: new THREE.Color(DAY.ambC), sunC: new THREE.Color(DAY.sunC), ambI: DAY.ambI, sunI: DAY.sunI, night: 0 };

    rainPos = new Float32Array(RAIN_MAX * 6);
    rainVel = new Float32Array(RAIN_MAX);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage));
    rainLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, depthWrite: false }));
    rainLines.frustumCulled = false;
    rainLines.visible = false;
    scene.add(rainLines);
    for (var i = 0; i < RAIN_MAX; i++) rainVel[i] = Utils.randRange(20, 28);
    initClouds();
    initSpace();
  }

  // Meteor streaks and floating dust (only visible in the Space biome).
  function initSpace() {
    meteorPos = new Float32Array(METEOR_MAX * 6);
    meteorVel = [];
    var mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(meteorPos, 3).setUsage(THREE.DynamicDrawUsage));
    meteors = new THREE.LineSegments(mg, new THREE.LineBasicMaterial({ color: 0xffc28a, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    meteors.frustumCulled = false;
    meteors.visible = false;
    scene.add(meteors);
    for (var i = 0; i < METEOR_MAX; i++) meteorVel.push({ vx: 0, vy: 0, vz: 0, alive: false, wait: Utils.randRange(0, 3) });

    dustPos = new Float32Array(DUST_MAX * 3);
    for (var d = 0; d < DUST_MAX; d++) { dustPos[d * 3] = Utils.randRange(-18, 18); dustPos[d * 3 + 1] = Utils.randRange(0.2, 9); dustPos[d * 3 + 2] = Utils.randRange(-18, 18); }
    var dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dustPos, 3).setUsage(THREE.DynamicDrawUsage));
    dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    dust.frustumCulled = false;
    dust.visible = false;
    scene.add(dust);
  }

  // Drifting cloud SHADOWS: invisible boxes high up that only cast shadows, so soft
  // dark patches roll across the fields (they never block the view).
  var clouds = [], cloudGroup = null, cloudT = 0;
  function initClouds() {
    cloudGroup = new THREE.Group();
    var mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    for (var i = 0; i < 7; i++) {
      var boxes = [];
      var w = Utils.randRange(4, 7), d = Utils.randRange(3, 5);
      boxes.push({ x: 0, y: 0, z: 0, w: w, h: 1, d: d, color: 0xffffff });
      boxes.push({ x: w * 0.3, y: 0.2, z: d * 0.2, w: w * 0.55, h: 1, d: d * 0.7, color: 0xffffff });
      boxes.push({ x: -w * 0.28, y: 0.1, z: -d * 0.25, w: w * 0.5, h: 1, d: d * 0.6, color: 0xffffff });
      var mesh = new THREE.Mesh(Utils.voxelGeometry(boxes), mat);
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      mesh.position.y = Utils.randRange(9, 12);
      cloudGroup.add(mesh);
      clouds.push({ mesh: mesh, ox: Utils.randRange(-26, 26), oz: Utils.randRange(-26, 26), vx: Utils.randRange(0.5, 1.0), vz: Utils.randRange(0.15, 0.5) });
    }
    scene.add(cloudGroup);
  }
  function wrap52(v) { return ((v + 26) % 52 + 52) % 52 - 26; }

  function pickAutoWeather(rows) {
    var r = Math.random();
    if (r < 0.45) { target.rain = 0; target.fog = 0; nextChange = rows + Utils.randInt(45, 90); }
    else if (r < 0.75) { target.rain = Utils.randRange(0.65, 1); target.fog = Math.random() < 0.4 ? 0.4 : 0; nextChange = rows + Utils.randInt(50, 100); }
    else { target.rain = 0; target.fog = Utils.randRange(0.6, 1); nextChange = rows + Utils.randInt(50, 90); }
  }

  function setModes(tod, wx) {
    timeMode = tod; weatherMode = wx;
  }

  // Which biome the chicken is in; the sky blends over about a second.
  function setBiome(name, snap) {
    spaceTarget = name === 'space' ? 1 : 0;
    if (snap) spaceMix = spaceTarget;
  }

  // Back to a clear morning (new run). snap = jump there instantly.
  function reset(snap) {
    rain = fog = 0;
    target.rain = target.fog = 0;
    nextChange = Utils.randInt(25, 40);
    flash = 0; thunderTimer = 8;
    if (snap) { cur = null; spaceMix = spaceTarget; }
  }

  function timeOfDay(rows) {
    if (timeMode === 'day') return 0.08;
    if (timeMode === 'night') return 0.74;
    return (rows % CYCLE_ROWS) / CYCLE_ROWS;
  }

  function update(dt, rows, camX, camZ, level) {
    if (!scene) return;
    rainCount = level === 'high' ? 480 : level === 'medium' ? 300 : 180;

    // ---- weather schedule ----
    if (weatherMode === 'clear') { target.rain = 0; target.fog = 0; }
    else if (weatherMode === 'rain') { target.rain = 1; target.fog = 0.25; }
    else if (weatherMode === 'fog') { target.rain = 0; target.fog = 1; }
    else if (rows >= nextChange) pickAutoWeather(rows);
    var rate = 0.3 * dt;
    rain += Utils.clamp(target.rain - rain, -rate, rate);
    fog += Utils.clamp(target.fog - fog, -rate, rate);
    spaceMix += Utils.clamp(spaceTarget - spaceMix, -0.7 * dt, 0.7 * dt);
    var rainReal = rain * (1 - spaceMix);     // in space the "rain" is a meteor shower
    meteorAmt = Math.max(rain * spaceMix, 0.2 * spaceMix);

    // ---- lightning ----
    if (rainReal > 0.55) {
      thunderTimer -= dt;
      if (thunderTimer <= 0) {
        thunderTimer = Utils.randRange(7, 16);
        flash = 1; flickerT = 0.14;
        if (GameAudio) GameAudio.thunder(Utils.randRange(0.25, 1.1));
      }
    }
    if (flickerT > 0) { flickerT -= dt; if (flickerT <= 0) flash = 0.8; }
    flash = Math.max(0, flash - dt * 3.5);

    // ---- time of day ----
    var t = timeOfDay(rows);
    var goal = sample(t);
    if (spaceMix > 0.001) {
      goal.sky.lerp(tmpA.setHex(SPACE.sky), spaceMix);
      goal.ambC.lerp(tmpA.setHex(SPACE.ambC), spaceMix);
      goal.sunC.lerp(tmpA.setHex(SPACE.sunC), spaceMix);
      goal.ambI = Utils.lerp(goal.ambI, SPACE.ambI, spaceMix);
      goal.sunI = Utils.lerp(goal.sunI, SPACE.sunI, spaceMix);
      goal.night = Utils.lerp(goal.night, SPACE.night, spaceMix);
    }
    if (!cur) { cur = goal; } else {
      var k = 1 - Math.exp(-dt * 2.2);
      cur.sky.lerp(goal.sky, k); cur.ambC.lerp(goal.ambC, k); cur.sunC.lerp(goal.sunC, k);
      cur.ambI += (goal.ambI - cur.ambI) * k; cur.sunI += (goal.sunI - cur.sunI) * k;
      cur.night += (goal.night - cur.night) * k;
    }

    // ---- apply (weather darkens and greys the day) ----
    var gloom = Math.max(rainReal, fog * 0.85);
    GRAY.setHex(0x93a1ad);
    tmpA.copy(GRAY).multiplyScalar(0.22 + 0.78 * (1 - cur.night));
    if (spaceMix > 0.001) tmpA.lerp(tmpB.setHex(NEBULA), spaceMix);   // fog is a purple nebula in space
    bgColor.copy(cur.sky).lerp(tmpA, 0.6 * gloom);
    if (flash > 0) bgColor.lerp(tmpB.setHex(0xe8f0ff), flash * 0.5);
    scene.fog.color.copy(bgColor);
    var fogAmt = Math.max(fog, rainReal * 0.45);
    scene.fog.near = Utils.lerp(30, 11, fogAmt);
    scene.fog.far = Utils.lerp(56, 32, fogAmt);
    ambient.color.copy(cur.ambC);
    // hemisphere light: the sky colour on top faces, a darker warm bounce below
    if (ambient.groundColor) ambient.groundColor.setRGB(ambient.color.r * 0.55, ambient.color.g * 0.62, ambient.color.b * 0.5);
    ambient.intensity = cur.ambI * (ambient.groundColor ? 1.1 : 1) * (1 - 0.16 * rainReal - 0.1 * fog) + flash * 0.9;
    sun.color.copy(cur.sunC);
    sun.intensity = cur.sunI * (1 - 0.55 * rainReal - 0.3 * fog) + flash * 0.5;
    if (Models.setNight) Models.setNight(cur.night);

    // ---- cloud shadows drift past (only worth drawing when shadows are on) ----
    cloudT += dt;
    cloudGroup.visible = !!sun.castShadow && sun.intensity > 0.2 && spaceMix < 0.5;
    if (cloudGroup.visible) {
      for (var ci = 0; ci < clouds.length; ci++) {
        var c = clouds[ci];
        // Each cloud has a fixed place in the WORLD and drifts at its own speed. The wrap
        // only picks which copy of the (repeating) cloud field is nearest the camera, so
        // moving around never drags the clouds along.
        var wx = c.ox + cloudT * c.vx, wz = c.oz + cloudT * c.vz;
        c.mesh.position.x = camX + wrap52(wx - camX);
        c.mesh.position.z = camZ + wrap52(wz - camZ);
      }
    }

    updateSpaceFx(dt, camX, camZ, level);

    // ---- rain streaks ----
    var on = rainReal > 0.03;
    rainLines.visible = on;
    if (on) {
      rainLines.material.opacity = 0.5 * rainReal;
      var n = Math.floor(rainCount * (0.4 + 0.6 * rainReal));
      var i, p = rainPos;
      for (i = 0; i < n; i++) {
        var o = i * 6;
        if (p[o + 1] === 0 && p[o + 4] === 0) { // first use: scatter
          p[o] = camX + Utils.randRange(-16, 16); p[o + 1] = Utils.randRange(0, 13); p[o + 2] = camZ + Utils.randRange(-16, 16);
        }
        p[o + 1] -= rainVel[i] * dt;
        if (p[o + 1] < 0) {
          p[o] = camX + Utils.randRange(-16, 16); p[o + 1] = 13 + Math.random() * 2; p[o + 2] = camZ + Utils.randRange(-16, 16);
        }
        // keep the shower centred on the camera as it moves
        if (p[o] < camX - 17) p[o] += 34; else if (p[o] > camX + 17) p[o] -= 34;
        if (p[o + 2] < camZ - 17) p[o + 2] += 34; else if (p[o + 2] > camZ + 17) p[o + 2] -= 34;
        p[o + 3] = p[o] + 0.05; p[o + 4] = p[o + 1] - 0.75; p[o + 5] = p[o + 2];
      }
      rainLines.geometry.setDrawRange(0, n * 2);
      rainLines.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Meteors streak across the sky and dust drifts by (cheap: a few lines and points).
  function updateSpaceFx(dt, camX, camZ, level) {
    var showDust = spaceMix > 0.02;
    dust.visible = showDust;
    if (showDust) {
      dust.material.opacity = (0.55 + 0.25 * Math.sin(cloudT * 2.3)) * spaceMix;
      var nd = level === 'high' ? DUST_MAX : level === 'medium' ? 100 : 60;
      for (var d = 0; d < nd; d++) {
        var o = d * 3;
        dustPos[o + 1] += dt * 0.12;
        if (dustPos[o + 1] > 9.5) dustPos[o + 1] = 0.2;
        // keep the field centred on the camera as it moves
        if (dustPos[o] < camX - 18) dustPos[o] += 36; else if (dustPos[o] > camX + 18) dustPos[o] -= 36;
        if (dustPos[o + 2] < camZ - 18) dustPos[o + 2] += 36; else if (dustPos[o + 2] > camZ + 18) dustPos[o + 2] -= 36;
      }
      dust.geometry.setDrawRange(0, nd);
      dust.geometry.attributes.position.needsUpdate = true;
    }
    var on = meteorAmt > 0.02 && spaceMix > 0.02;
    meteors.visible = on;
    if (!on) return;
    meteors.material.opacity = Math.min(0.9, 0.35 + meteorAmt * 0.6);
    var count = Math.max(2, Math.round(METEOR_MAX * meteorAmt * (level === 'low' ? 0.5 : 1)));
    for (var i = 0; i < METEOR_MAX; i++) {
      var m = meteorVel[i], p = meteorPos, k = i * 6;
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
      p[k + 3] = m.x - m.vx * 0.09; p[k + 4] = m.y - m.vy * 0.09; p[k + 5] = m.z - m.vz * 0.09;
      if (m.y < 0.2) { m.alive = false; m.wait = Utils.randRange(0.2, 2.5) / Math.max(0.3, meteorAmt); p[k] = p[k + 1] = p[k + 2] = p[k + 3] = p[k + 4] = p[k + 5] = 0; }
    }
    meteors.geometry.attributes.position.needsUpdate = true;
  }

  return {
    init: init,
    setModes: setModes,
    setBiome: setBiome,
    reset: reset,
    update: update,
    timeMode: function () { return timeMode; },
    weatherMode: function () { return weatherMode; },
    get rain() { return rain * (1 - spaceMix); },
    get space() { return spaceMix; },
    get fog() { return fog; },
    get night() { return cur ? cur.night : 0; },
    label: function () {
      var n = cur ? cur.night : 0;
      if (spaceMix > 0.5) return '🌌' + (meteorAmt > 0.3 ? '☄️' : fog > 0.3 ? '🌫️' : '');
      return (n > 0.6 ? '🌙' : n > 0.15 ? '🌆' : '☀️') + (rain > 0.3 ? '🌧️' : fog > 0.3 ? '🌫️' : '');
    }
  };
})();
