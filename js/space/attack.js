// In space the thing that comes for a dawdling chicken is a UFO with a tractor
// beam. It plugs into the Player through the theme's `attack` hooks, so the Forest's
// eagle code is never touched.
//  glide - it glides in from the sky and hovers over the chicken
//  beam  - the tractor beam switches on and the chicken floats up, spinning
//  carry - the saucer zips away
var SpaceAttack = (function () {
  var ufo = null, beam = null;

  function ensure(p) {
    if (ufo) return;
    var m = SpaceModels.buildUfo();
    ufo = m.group;
    beam = m.beam;
    ufo.traverse(function (o) { if (o.isMesh && o !== beam) o.castShadow = true; });
    ufo.visible = false;
    ufo.scale.setScalar(1.2);
    p.scene.add(ufo);
  }

  function begin(p) {
    ensure(p);
    SpaceAudio.ufoAttack();
    var side = Math.random() < 0.5 ? -1 : 1;
    p.eagleSide = side;
    p.eagleGrabPoint.set(p.x, p.y + 3.7, p.z);                 // where it hovers
    p.eagleStartPos.set(p.x + side * 7, p.y + 12, p.z + 10);
    p.eagleCtrlPos.set(p.x + side * 2.5, p.y + 8, p.z + 3.5);
    p.eagleExitDir.set(-side * 0.5, 0.7, 0.6).normalize();
    ufo.position.copy(p.eagleStartPos);
    ufo.visible = true;
    beam.visible = false;
    p.eagleShadow.visible = true;
    p.eagleFeatherT = 0;
    p.eaglePhase = 'glide';
    p.eaglePhaseT = 0;
    update(p, 0);
  }

  function update(p, dt) {
    p.eaglePhaseT += dt;
    var T = p.eaglePhaseT, U = ufo, side = p.eagleSide || 1, sh = p.eagleShadow;
    var ground = p.y - p.air + 0.03;
    var hover = p.eagleGrabPoint;

    if (p.eaglePhase === 'glide') {
      var k = Utils.clamp(T / 1.0, 0, 1);
      var u = 1 - (1 - k) * (1 - k);
      p.eagleAt(u, p.eagleTmp, p.eagleTan);
      U.position.copy(p.eagleTmp);
      U.rotation.set(Math.sin(T * 6) * 0.05, T * 3, side * 0.3 * (1 - k));
      sh.position.set(p.eagleTmp.x, ground, p.eagleTmp.z);
      sh.scale.set(Utils.lerp(2.8, 1.5, u), 1, Utils.lerp(2.8, 1.5, u));
      sh.material.opacity = 0.3 * Math.min(1, k * 1.4);
      if (k > 0.5) {                                   // the chicken has noticed it
        var f = Utils.clamp((k - 0.5) / 0.5, 0, 1), fl = Math.sin(T * 55) * 0.7 * f;
        p.wingL.rotation.z = fl + 0.5 * f;
        p.wingR.rotation.z = -fl - 0.5 * f;
        p.bodyGroup.rotation.x = -0.3 * f;
        p.eyes[0].scale.y = p.eyes[1].scale.y = 1 + 0.35 * f;
      }
      if (T >= 1.0) {
        p.eaglePhase = 'beam';
        p.eaglePhaseT = 0;
        beam.visible = true;
        Particles.ring(p.x, p.y + 0.05, p.z, 0x9ff6ff, 2.4);
        if (GameAudio && GameAudio.squawk) GameAudio.squawk();
        if (p.onEagleGrab) p.onEagleGrab(p.eagleGrabPoint);
      }
    } else if (p.eaglePhase === 'beam') {
      var b = Utils.clamp(T / 1.0, 0, 1);
      U.position.set(hover.x, hover.y + Math.sin(T * 8) * 0.06, hover.z);
      U.rotation.set(Math.sin(T * 7) * 0.04, T * 4, 0);
      var len = U.position.y - ground;
      beam.scale.set(1, len, 1);
      beam.material.opacity = 0.5 * Math.min(1, T / 0.2) * (0.85 + Math.sin(T * 40) * 0.15);
      // the chicken floats up the beam, spinning and shrinking
      var rise = Math.pow(b, 1.5);
      var yy = Utils.lerp(p.y, hover.y - 0.45, rise);
      p.group.position.set(p.x + Math.sin(T * 9) * 0.06 * (1 - b), yy, p.z);
      p.group.rotation.y += dt * 9;
      p.group.rotation.z = Math.sin(T * 6) * 0.2;
      p.group.scale.setScalar(Utils.lerp(1, 0.45, b));
      p.wingL.rotation.z = Math.sin(T * 40) * 0.9;
      p.wingR.rotation.z = -Math.sin(T * 40) * 0.9;
      p.bodyGroup.rotation.x = 0;
      p.eagleFeatherT -= dt;
      if (p.eagleFeatherT <= 0) {
        p.eagleFeatherT = 0.05;
        Particles.burst(p.x + Utils.randRange(-0.4, 0.4), yy - 0.3, p.z + Utils.randRange(-0.4, 0.4), { colors: [0xffffff, 0x9ff6ff, 0x00e5ff, 0xff2bd6], count: 1, speed: 0.4, up: 1.5, size: 0.09, life: 0.7, gravity: -2, spread: 0.1, floor: -9 });
      }
      sh.position.set(hover.x, ground, hover.z);
      sh.scale.set(1.5, 1, 1.5);
      sh.material.opacity = 0.3;
      if (T >= 1.0) {
        p.eaglePhase = 'carry';
        p.eaglePhaseT = 0;
        p.group.visible = false;
      }
    } else {
      var c = T;
      U.position.addScaledVector(p.eagleExitDir, dt * (3 + c * 26));
      U.rotation.y += dt * 8;
      beam.material.opacity = Math.max(0, 0.5 - c * 3);
      if (beam.material.opacity <= 0) beam.visible = false;
      else beam.scale.set(1, U.position.y - ground, 1);
      sh.position.set(U.position.x, ground, U.position.z);
      sh.material.opacity = Math.max(0, 0.3 - c * 0.6);
    }
  }

  function reset() {
    if (ufo) { ufo.visible = false; beam.visible = false; }
  }

  return { duration: 2.5, begin: begin, update: update, reset: reset };
})();
