// Background music, generated live with WebAudio (no files): a bouncy chiptune
// by day and a slower, softer minor groove at night. The melody is re-composed
// every four bars so it never gets stale. Volume is user-controlled and saved.
var Music = (function () {
  var KEY = 'crossy_way_music_volume';
  var ctx = null, out = null, timer = null, started = false;
  var vol = loadVol();
  var mood = 'day';
  var duck = 1;                 // temporary dip (e.g. when you die)
  var duckTimer = null;
  var i = 0, nextTime = 0;      // 16th-note counter and its scheduled time
  var plan = null;

  var DAY = {
    bpm: 128,
    chords: [[60, 64, 67, 36], [57, 60, 64, 33], [53, 57, 60, 29], [55, 59, 62, 31]],
    scale: [60, 62, 64, 67, 69, 72, 74, 76, 79]
  };
  var NIGHT = {
    bpm: 94,
    chords: [[57, 60, 64, 33], [53, 57, 60, 29], [60, 64, 67, 36], [55, 59, 62, 31]],
    scale: [57, 60, 62, 64, 67, 69, 72, 74, 76]
  };

  // Space: slow, floaty and a little mysterious (D minor, shimmering high notes)
  var SPACE = {
    bpm: 82,
    chords: [[62, 65, 69, 38], [58, 62, 65, 34], [60, 64, 67, 36], [57, 60, 64, 33]],
    scale: [62, 65, 67, 69, 72, 74, 77, 79, 81]
  };

  function loadVol() {
    var v = parseFloat(localStorage.getItem(KEY));
    return isNaN(v) ? 0.5 : Utils.clamp(v, 0, 1);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function level() { return vol * vol * 0.55 * duck; }

  function note(m, t, dur, type, gain) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = hz(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.03);
  }

  var noiseBuf = null;
  function noiseHit(t, dur, gain, type, freq) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
    }
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t); s.stop(t + dur + 0.02);
  }

  function kick(t, gain) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.2);
  }

  // A fresh 4-bar melody: chord tones on strong beats, a random walk in between.
  function makePlan() {
    var night = mood === 'night';
    var space = mood === 'space';
    var cfg = space ? SPACE : night ? NIGHT : DAY;
    var spots = [0, 2, 3, 6, 8, 10, 11, 14];
    var prob = space ? 0.4 : night ? 0.5 : 0.75;
    var idx = Utils.randInt(2, 5);
    var melody = [];
    for (var b = 0; b < 4; b++) {
      var bar = [];
      var chord = cfg.chords[b];
      for (var s = 0; s < 16; s++) bar.push(0);
      spots.forEach(function (s) {
        if (Math.random() > prob && s !== 0) return;
        if (s === 0 || s === 8) {
          // snap to the scale tone nearest a chord tone
          var want = chord[Utils.randInt(0, 2)] + 12;
          var best = 0, bd = 99;
          cfg.scale.forEach(function (m, k) { var d = Math.abs(m - want); if (d < bd) { bd = d; best = k; } });
          idx = best;
        } else {
          idx = Utils.clamp(idx + Utils.choice([-2, -1, -1, 0, 1, 1, 2]), 0, cfg.scale.length - 1);
        }
        bar[s] = cfg.scale[idx];
      });
      melody.push(bar);
    }
    return { cfg: cfg, melody: melody, night: night, space: space, stepDur: 60 / cfg.bpm / 4 };
  }

  function playStep(n, t) {
    var s = n % 16, bar = Math.floor(n / 16) % 4;
    var P = plan, chord = P.cfg.chords[bar];
    var lead = P.melody[bar][s];
    if (P.space) {
      // floaty pad, a soft heartbeat and twinkling high notes
      if (s === 0) {
        for (var sc = 0; sc < 3; sc++) note(chord[sc], t, P.stepDur * 15, 'sine', 0.06);
        note(chord[3], t, P.stepDur * 14, 'sine', 0.26);
      }
      if (s === 0 || s === 8) kick(t, 0.35);
      if (s % 2 === 0) note(chord[[0, 1, 2, 1][(s / 2) % 4]] + 24, t, P.stepDur * 1.6, 'sine', 0.03);
      if (s === 6 || s === 14) note(chord[1] + 12, t, P.stepDur * 3, 'triangle', 0.04);
      if (lead) note(lead, t, P.stepDur * 4, 'sine', 0.08);
    } else if (!P.night) {
      // drums
      if (s % 4 === 0) kick(t, 0.9);
      if (s === 4 || s === 12) noiseHit(t, 0.13, 0.32, 'bandpass', 1900);
      if (s % 2 === 0) noiseHit(t, 0.035, s % 4 === 2 ? 0.2 : 0.09, 'highpass', 7000);
      // bass
      if (s === 0 || s === 6 || s === 8) note(chord[3], t, P.stepDur * 2.2, 'triangle', 0.3);
      if (s === 11 || s === 14) note(chord[3] + 12, t, P.stepDur * 1.5, 'triangle', 0.22);
      // sparkly arpeggio
      if (s % 2 === 0) note(chord[[0, 1, 2, 1][(s / 2) % 4]] + 12, t, P.stepDur * 1.2, 'square', 0.035);
      if (lead) note(lead, t, P.stepDur * (s % 4 === 0 ? 3 : 1.8), 'square', 0.07);
    } else {
      if (s === 0 || s === 10) kick(t, 0.55);
      if (s % 4 === 2) noiseHit(t, 0.05, 0.07, 'highpass', 6000);
      if (s === 0) { // slow pad chord
        for (var c = 0; c < 3; c++) note(chord[c], t, P.stepDur * 15, 'triangle', 0.05);
        note(chord[3], t, P.stepDur * 7, 'sine', 0.28);
      }
      if (s === 8) note(chord[3] + 7, t, P.stepDur * 7, 'sine', 0.2);
      if (s % 4 === 0) note(chord[[0, 1, 2, 1][(s / 4) % 4]] + 12, t, P.stepDur * 3, 'sine', 0.05);
      if (lead) note(lead, t, P.stepDur * 3, 'triangle', 0.09);
    }
  }

  function pump() {
    if (!ctx) return;
    var now = ctx.currentTime;
    if (nextTime < now - 0.5) nextTime = now + 0.05; // tab was asleep: don't replay the backlog
    while (nextTime < now + 0.3) {
      if (i % 64 === 0 || !plan) plan = makePlan();
      playStep(i, nextTime);
      nextTime += plan.stepDur;
      i++;
    }
  }

  function applyLevel(fast) {
    if (!out) return;
    out.gain.setTargetAtTime(level(), ctx.currentTime, fast ? 0.03 : 0.25);
  }

  function run() {
    if (timer || !started || vol <= 0) return;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(pump, 50);
  }

  return {
    // Needs a user gesture first (browser autoplay rules), so the game calls this on the first input.
    start: function () {
      if (started) return;
      var c = GameAudio.context();
      if (!c) return;
      ctx = c;
      out = ctx.createGain();
      out.gain.value = level();
      out.connect(GameAudio.masterNode());
      started = true;
      run();
    },
    setVolume: function (v) {
      vol = Utils.clamp(v, 0, 1);
      try { localStorage.setItem(KEY, String(vol)); } catch (e) { /* private mode */ }
      if (!started) return;
      if (vol <= 0) { clearInterval(timer); timer = null; } else run();
      applyLevel(true);
    },
    getVolume: function () { return vol; },
    // 'day' | 'night' | 'space': changes at the next four-bar phrase
    setMood: function (m) {
      if (!m || m === mood) return;
      mood = m;
      i = Math.ceil(i / 64) * 64; // finish this phrase, then switch
    },
    // briefly dip the music (death), then come back
    duck: function (to, seconds) {
      duck = to;
      applyLevel();
      clearTimeout(duckTimer);
      duckTimer = setTimeout(function () { duck = 1; applyLevel(); }, (seconds || 1.5) * 1000);
    }
  };
})();
