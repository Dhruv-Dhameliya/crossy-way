// The Space biome theme. Everything space-specific is in js/space/ and css/space.css;
// this file registers it with the game through Biome.register (see config.js for the
// list of hooks). Nothing in the shared game code mentions space, and if this folder
// were removed the game would simply be the Forest.
(function () {
  // ---- calm palette: dark steel and slate, muted accents ----
  var colors = {
    grassA: 0x2b3148, grassB: 0x262c42, grassSide: 0x12162a, neonA: 0x3b4463, neonB: 0x353d5a,
    roadA: 0x3a4052, roadB: 0x343a4b, roadSide: 0x181c28, roadLine: 0x9aa4bf,
    waterA: 0x06081a, waterB: 0x050716, waterSide: 0x02030c,
    railBedA: 0x2c2523, railBedB: 0x272120, railSide: 0x14100f, sleeper: 0xa8662a,
    iceA: 0xa8d8e8, iceB: 0x93c8dc, iceSide: 0x4a88a8,
    voidA: 0x030308, voidB: 0x020206, voidSide: 0x000000, voidAccent: 0xc8742a,
    // lane twists: grey moon dust, a magnetic conveyor and glowing jump pads
    mudA: 0x5c5f6b, mudB: 0x54576a, mudSide: 0x2a2c38, mudPuddle: 0x7a86b4,
    beltA: 0x30364a, beltB: 0x2b3144, beltSide: 0x181c28, beltArrow: 0x6fd6ff,
    bounceA: 0x4a3f8f, bounceB: 0x42387f, bounceSide: 0x1e1944, bounceRing: 0x9ff3ff
  };

  // an astronaut helmet: a see-through bubble with a light collar (geometry and material are shared)
  var glassGeo = null, glassMat = null;
  function suit() {
    if (!glassGeo) {
      glassGeo = new THREE.BoxGeometry(0.74, 0.66, 0.82);
      glassMat = new THREE.MeshLambertMaterial({ color: 0xbdf4ff, transparent: true, opacity: 0.26, depthWrite: false });
      glassGeo.__shared = glassMat.__shared = true;
    }
    var helmet = new THREE.Group();
    var glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 0.74, 0.1);
    helmet.add(glass);
    helmet.add(Utils.voxelMesh([
      { x: 0, y: 0.45, z: 0.02, w: 0.64, h: 0.07, d: 0.62, color: 0xdfe6f5 },
      { x: 0, y: 0.45, z: 0.02, w: 0.66, h: 0.03, d: 0.64, color: 0x8c96b0 }
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

  // share card: a quiet night sky
  var card = {
    bg: [[0, '#0e1226'], [0.55, '#1a2140'], [1, '#080a18']],
    deco: function (c, W, H, rnd) {
      for (var i = 0; i < 90; i++) {                          // stars
        c.globalAlpha = 0.25 + rnd() * 0.6;
        c.fillStyle = '#ffffff';
        var s = 2 + rnd() * 4;
        c.fillRect(rnd() * W, rnd() * H, s, s);
      }
      var g = c.createRadialGradient(W * 0.86, 120, 10, W * 0.86, 120, 170);   // a pale planet
      g.addColorStop(0, 'rgba(150,170,220,0.5)'); g.addColorStop(1, 'rgba(150,170,220,0)');
      c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(W * 0.86, 120, 170, 0, 7); c.fill();
    },
    label: '#9aa6cc', tagBg: '#34406e', chipFill: 'rgba(255,255,255,0.08)', chipStroke: '#5a678f', chipText: '#ffffff', foot: '#ffffff', host: '#9aa6cc'
  };

  Biome.register('space', {
    label: '🚀 SPACE',
    enter: { text: '🚀 WELCOME TO SPACE!', color: '#8f6bff' },
    colors: colors,
    backdrop: 0x070914,
    musicMood: 'space',
    stat: 'space',                // trophy stat: counts rows run in this world (the "Space Cadet" trophy)
    idleWarn: function () { SpaceAudio.ufoWarble(); },
    sky: { sky: 0x070a18, ambC: 0xb4bedc, ambI: 0.72, sunC: 0xe4eaff, sunI: 0.58, night: 0.6, fog: 0x1c2244 },
    fx: SpaceFx,
    ground: SpaceTextures.ground,
    sceneryMaterial: function () { return SpaceModels.neonMaterial(); },
    vehicleBob: vehicleBob,
    logSway: logSway,
    diveColors: [0xffffff, 0xb8c8e0, 0xe0883a],
    crumbleColors: [0x4f4a63, 0xe0883a, 0xffc233],
    dustColors: [0x8a90a8, 0x6b7592],
    storm: { toast: '☀️ SOLAR FLARE!', color: 0xfff0d0, sound: function () { SpaceAudio.flare(); } },
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
    puffColors: [0xc8d0e4, 0x9aa4c0, 0xffffff],
    fallColors: [0x8c96b8, 0xc8d0e4, 0xffffff],
    card: card
  });
})();
