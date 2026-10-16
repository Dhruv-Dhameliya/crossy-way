// The Space biome theme. Everything space-specific is in js/space/ and css/space.css;
// this file registers it with the game through Biome.register (see config.js for the
// list of hooks). Nothing in the shared game code mentions space, and if this folder
// were removed the game would simply be the Forest.
(function () {
  // ---- neon palette ----
  var colors = {
    sky: 0x120f2e,
    grassA: 0x231f52, grassB: 0x1d1a47, grassSide: 0x0b0922, neonA: 0x00e5ff, neonB: 0xff2bd6,
    roadA: 0x0f4a60, roadB: 0x0c4058, roadSide: 0x04141f, roadLine: 0x00e5ff,
    waterA: 0x070a26, waterB: 0x050820, waterSide: 0x02030f, waterAccent: 0x8ff4ff,
    railBedA: 0x2e1a2a, railBedB: 0x28142a, railSide: 0x120810, sleeper: 0xff7a00, rail: 0xaef6ff,
    iceA: 0x7defff, iceB: 0x5fe0ff, iceSide: 0x1d8fc0,
    voidA: 0x030308, voidB: 0x020206, voidSide: 0x000000, voidAccent: 0xff7a00,
    coin: CONFIG.COLORS.coin, coinDark: CONFIG.COLORS.coinDark, coinShine: CONFIG.COLORS.coinShine,
    backdrop: 0x050314
  };

  // an astronaut helmet: a see-through bubble with a neon collar
  function suit() {
    var helmet = new THREE.Group();
    var glass = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.66, 0.82), new THREE.MeshLambertMaterial({
      color: 0xbdf4ff, transparent: true, opacity: 0.26, depthWrite: false
    }));
    glass.position.set(0, 0.74, 0.1);
    helmet.add(glass);
    helmet.add(Utils.voxelMesh([
      { x: 0, y: 0.45, z: 0.02, w: 0.64, h: 0.07, d: 0.62, color: 0xdfe6f5 },
      { x: 0, y: 0.45, z: 0.02, w: 0.66, h: 0.03, d: 0.64, color: 0x00e5ff },
      { x: 0, y: 0.5, z: 0.02, w: 0.66, h: 0.02, d: 0.64, color: 0xff2bd6 }
    ], { castShadow: false, material: SpaceModels.neonMaterial() }));
    return helmet;
  }

  // slow lazy roll of the drifting asteroids
  function logSway(l, time) {
    l.mesh.rotation.z = Math.sin(time * 0.7 + l.phase) * 0.035;
    l.mesh.rotation.x = Math.sin(time * 0.5 + l.phase * 1.3) * 0.02;
  }

  // ships float: a slow bob and roll instead of road bumps
  function vehicleBob(v, row, tm) {
    v.mesh.position.y = row.top + 0.1 + Math.sin(tm * 2.4 + v.ph) * 0.05;
    v.mesh.rotation.z = Math.sin(tm * 1.7 + v.ph * 1.7) * 0.03;
  }

  // the neon pulses gently: lane lines and props breathe in and out
  function update(dt, time) {
    SpaceModels.setPulse(0.9 + 0.2 * (0.5 + 0.5 * Math.sin(time * 2.2)));
    var mats = Textures.glowMaterials;
    for (var i = 0; i < mats.length; i++) mats[i].emissiveIntensity = 0.78 + 0.32 * (0.5 + 0.5 * Math.sin(time * 1.8 + i * 0.9));
  }

  // share card: a neon night sky
  var card = {
    bg: [[0, '#150d46'], [0.55, '#2a1a78'], [1, '#0a0724']],
    deco: function (c, W, H, rnd) {
      for (var i = 0; i < 110; i++) {                         // stars
        c.globalAlpha = 0.3 + rnd() * 0.7;
        c.fillStyle = rnd() < 0.25 ? '#00e5ff' : rnd() < 0.4 ? '#ff2bd6' : '#ffffff';
        var s = 3 + rnd() * 6;
        c.fillRect(rnd() * W, rnd() * H, s, s);
      }
      var g = c.createRadialGradient(W * 0.86, 120, 10, W * 0.86, 120, 200);   // a glowing planet
      g.addColorStop(0, 'rgba(255,43,214,0.75)'); g.addColorStop(1, 'rgba(255,43,214,0)');
      c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(W * 0.86, 120, 200, 0, 7); c.fill();
      c.strokeStyle = 'rgba(0,229,255,0.35)'; c.lineWidth = 3;                  // neon grid floor
      for (var x = -10; x <= 10; x++) { c.beginPath(); c.moveTo(W / 2 + x * 40, 1000); c.lineTo(W / 2 + x * 230, H); c.stroke(); }
      for (var y = 0; y < 8; y++) { var yy = 1000 + y * y * 5.5 + y * 8; c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); }
      c.globalAlpha = 1;
    },
    label: '#b7a8ff', tagBg: '#3b2cb0', chipFill: 'rgba(255,255,255,0.12)', chipStroke: '#00e5ff', chipText: '#ffffff', foot: '#ffffff', host: '#b7a8ff'
  };

  Biome.register('space', {
    label: '🚀 SPACE',
    enter: { text: '🚀 WELCOME TO SPACE!', color: '#8f6bff' },
    colors: colors,
    backdrop: 0x050314,
    musicMood: 'space',
    idleWarn: function () { SpaceAudio.ufoWarble(); },
    sky: { sky: 0x050212, ambC: 0xb5a6ff, ambI: 0.72, sunC: 0xe0d0ff, sunI: 0.55, night: 0.62, fog: 0x3a1a7a },
    fx: SpaceFx,
    ground: SpaceTextures.ground,
    sceneryMaterial: function () { return SpaceModels.neonMaterial(); },
    vehicleBob: vehicleBob,
    logSway: logSway,
    diveColors: [0xffffff, 0x00e5ff, 0xff2bd6],
    fallsInWater: true,           // empty space: anything that falls off a rock drifts away
    noRails: true,                // no railways: comets cross the lane instead
    trainAudio: {
      warn: function (v) { SpaceAudio.cometAlarm(v); },
      ping: function (b, v) { SpaceAudio.cometPing(b, v); },
      toot: function (v) { SpaceAudio.cometAlarm(v * 0.7, true); },
      pass: function (v) { SpaceAudio.cometPass(v); }
    },
    attack: SpaceAttack,          // a UFO instead of the eagle
    suit: suit,
    shadowGlow: { color: 0x00e5ff, opacity: 0.55 },
    puffColors: [0x00e5ff, 0xff2bd6, 0xffffff],
    fallColors: [0xa24dff, 0x00e5ff, 0xffffff],
    card: card,
    update: update
  });
})();
