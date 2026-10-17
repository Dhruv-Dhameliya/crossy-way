// Sound effects and ambience via WebAudio. The eagle cry, train horn, crossing bell,
// car horn, siren, splash and hen squawk are real recordings (js/sounds.js); everything
// else is synthesized, and any recording that is missing falls back to a synthesized
// stand-in. Nothing plays until the first tap/key creates the audio context.
// Most world sounds take a `vol` (0..1) so they fade with distance from the chicken.
var GameAudio = (function () {
  var ctx = null;
  var enabled = true;
  var master = null;
  var noiseBuf = null;
  var amb = null;
  var buffers = {};
  var decoding = {};

  function dataUriToBuffer(uri) {
    var bin = atob(uri.slice(uri.indexOf(',') + 1));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  // Decode the embedded recordings once the audio context exists.
  function loadSamples() {
    if (!ctx || typeof SoundBank === 'undefined') return;
    Object.keys(SoundBank).forEach(function (name) {
      if (buffers[name] || decoding[name]) return;
      decoding[name] = true;
      try {
        ctx.decodeAudioData(dataUriToBuffer(SoundBank[name]), function (b) { buffers[name] = b; }, function () { /* keep synth fallback */ });
      } catch (e) { /* keep synth fallback */ }
    });
  }

  // Play a recording. Returns false when it is not available (caller falls back
  // to the synthesized version). opts: gain, rate, offset, dur (seconds), delay.
  function sample(name, vol, opts) {
    var c = live();
    if (!c || !buffers[name]) return false;
    if (!enabled) return true;
    opts = opts || {};
    var v = (vol === undefined ? 1 : vol) * (opts.gain === undefined ? 1 : opts.gain);
    if (v <= 0.01) return true;
    var buf = buffers[name];
    var offset = opts.offset || 0;
    var dur = Math.min(opts.dur || buf.duration, buf.duration - offset);
    var t0 = c.currentTime + (opts.delay || 0);
    var src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate || 1;
    var g = c.createGain();
    var fade = Math.min(0.12, dur * 0.25);
    g.gain.setValueAtTime(v, t0);
    g.gain.setValueAtTime(v, t0 + Math.max(0, dur / (opts.rate || 1) - fade));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur / (opts.rate || 1));
    src.connect(g);
    g.connect(master);
    src.start(t0, offset, dur);
    return true;
  }

  function ensureCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
        loadSamples();
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // The context only exists after the first user gesture (unlock); until it is running,
  // sounds are simply skipped so they don't pile up and burst out together.
  function live() {
    if (!ctx) return null;
    if (ctx.state === 'suspended') ctx.resume();
    return ctx.state === 'running' ? ctx : null;
  }

  function getNoise() {
    if (!noiseBuf && ctx) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  function tone(freq, duration, type, gainStart, opts) {
    if (!enabled) return;
    var c = live();
    if (!c) return;
    opts = opts || {};
    var vol = opts.vol === undefined ? 1 : opts.vol;
    if (vol <= 0.01) return;
    var t0 = c.currentTime + (opts.delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t0 + duration);
    }
    if (opts.vibrato) {
      var lfo = c.createOscillator();
      var lg = c.createGain();
      lfo.frequency.value = opts.vibrato;
      lg.gain.value = freq * 0.012;
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + duration + 0.05);
    }
    var attack = opts.attack || 0.008;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainStart * vol), t0 + attack);
    if (opts.hold) gain.gain.setValueAtTime(Math.max(0.0002, gainStart * vol), t0 + opts.hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  function noise(duration, gainStart, opts) {
    if (!enabled) return;
    var c = live();
    if (!c) return;
    opts = opts || {};
    var vol = opts.vol === undefined ? 1 : opts.vol;
    if (vol <= 0.01) return;
    var t0 = c.currentTime + (opts.delay || 0);
    var src = c.createBufferSource();
    src.buffer = getNoise();
    src.loop = true;
    var filter = c.createBiquadFilter();
    filter.type = opts.filter || 'lowpass';
    filter.frequency.setValueAtTime(opts.freq || 1200, t0);
    if (opts.freqEnd) filter.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + duration);
    filter.Q.value = opts.q || 0.8;
    var gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainStart * vol), t0 + (opts.attack || 0.01));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + duration + 0.05);
  }

  // ---- looping ambience (road hum, rain) --------------------------
  function loopLayer(type, freq, q, rate) {
    var src = ctx.createBufferSource();
    src.buffer = getNoise();
    src.loop = true;
    src.playbackRate.value = rate || 1;
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    var g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
    return g;
  }

  function ensureAmb() {
    if (amb || !ctx) return amb;
    // traffic: low engine rumble
    var tA = loopLayer('lowpass', 170, 0.7, 0.6);
    // rain: hissing highpassed noise plus a softer patter
    var rainA = loopLayer('highpass', 2400, 0.5, 1.3);
    var rainB = loopLayer('bandpass', 5200, 0.7, 0.9);
    amb = { traffic: tA, rainA: rainA, rainB: rainB };
    return amb;
  }

  var hopStep = 0;
  var ambKey = '';

  // Hop sound packs (bought in the shop): each one is a different synthesized "hop".
  var hopPack = 'classic';
  var HOP_PACKS = {
    boing: function () {
      var f = 250 + Math.random() * 40;
      tone(f, 0.2, 'sine', 0.11, { freqEnd: f * 2.6, vibrato: 16 });
      tone(f * 2, 0.14, 'triangle', 0.04, { freqEnd: f * 4, delay: 0.02 });
    },
    pop: function () {
      noise(0.05, 0.2, { filter: 'bandpass', freq: 1800, freqEnd: 700, q: 1.6, attack: 0.002 });
      tone(820 + Math.random() * 120, 0.08, 'sine', 0.12, { freqEnd: 220 });
    },
    squeak: function () {
      var f = 1500 + Math.random() * 250;
      tone(f, 0.07, 'triangle', 0.08, { freqEnd: f * 1.5 });
      tone(f * 1.25, 0.06, 'sine', 0.05, { freqEnd: f * 1.9, delay: 0.06 });
    },
    chirp: function () {
      var f = 2200 + Math.random() * 400;
      tone(f, 0.05, 'sine', 0.06, { freqEnd: f * 1.35 });
      tone(f * 1.2, 0.07, 'sine', 0.055, { freqEnd: f * 0.8, delay: 0.055 });
    },
    blip: function () {
      var f = 523 * Math.pow(1.122, (hopStep++ % 4) * 2);
      tone(f, 0.05, 'square', 0.045);
      tone(f * 1.5, 0.07, 'square', 0.04, { delay: 0.045 });
    }
  };

  return {
    setEnabled: function (v) {
      enabled = v;
      if (!v) this.setAmbience(0, 0);
    },
    isEnabled: function () { return enabled; },
    unlock: function () { ensureCtx(); },
    sample: sample,   // (also used by the automated checks)
    // the synth building blocks, for themes (e.g. js/space/) that bring their own sounds
    kit: { tone: tone, noise: noise },

    // traffic: 1 while the chicken's lane (or the next) is a road; rain: weather intensity 0..1
    setAmbience: function (traffic, rain) {
      if (!ctx) return;
      var on = enabled ? 1 : 0;
      var key = Math.round(traffic * 100) + ':' + Math.round((rain || 0) * 100) + ':' + on;
      if (key === ambKey) return;            // nothing changed: don't schedule more automation
      var a = ensureAmb();
      if (!a) return;
      ambKey = key;
      var t = ctx.currentTime;
      a.traffic.gain.setTargetAtTime(traffic * 0.16 * on, t, 0.4);
      var r = rain || 0;
      a.rainA.gain.setTargetAtTime(r * 0.045 * on, t, 0.6);
      a.rainB.gain.setTargetAtTime(r * 0.03 * on, t, 0.6);
    },
    // shared with the music module
    context: function () { return ensureCtx(); },
    masterNode: function () { return master; },

    // ---- chicken ----
    setHopPack: function (id) { hopPack = HOP_PACKS[id] ? id : 'classic'; },
    hop: function () {
      if (HOP_PACKS[hopPack]) { HOP_PACKS[hopPack](); return; }
      var f = 380 + (hopStep++ % 3) * 18 + Math.random() * 30;
      tone(f, 0.09, 'square', 0.045, { freqEnd: f * 1.55 });
      tone(f * 0.5, 0.07, 'triangle', 0.05, { freqEnd: f * 0.7 });
    },
    bump: function () { tone(150, 0.07, 'triangle', 0.07, { freqEnd: 90 }); },
    coin: function () {
      tone(988, 0.09, 'square', 0.05);
      tone(1319, 0.22, 'square', 0.05, { delay: 0.07 });
      tone(1319, 0.22, 'sine', 0.06, { delay: 0.07 });
    },

    // ---- deaths ----
    squish: function () {
      sample('hen', 1, { gain: 0.55, rate: 1.25 });   // a startled squawk
      tone(180, 0.28, 'sawtooth', 0.12, { freqEnd: 40 });
      noise(0.22, 0.2, { freq: 900, freqEnd: 150 });
    },
    crash: function () {
      noise(0.45, 0.28, { freq: 1800, freqEnd: 120 });
      tone(110, 0.4, 'sawtooth', 0.16, { freqEnd: 35 });
    },
    splash: function () {
      if (sample('splash', 1, { gain: 0.9 })) return;
      noise(0.5, 0.22, { filter: 'bandpass', freq: 1800, freqEnd: 500, q: 0.7, attack: 0.03 });
      tone(330, 0.25, 'sine', 0.08, { freqEnd: 90 });
    },
    screech: function () {
      tone(2200, 0.5, 'sawtooth', 0.06, { freqEnd: 1000 });
      tone(1650, 0.5, 'square', 0.04, { freqEnd: 800, delay: 0.04 });
      noise(0.4, 0.07, { filter: 'highpass', freq: 2500 });
    },
    gameOver: function () {
      tone(392, 0.2, 'triangle', 0.09, { freqEnd: 330 });
      tone(330, 0.2, 'triangle', 0.09, { delay: 0.2, freqEnd: 262 });
      tone(262, 0.5, 'triangle', 0.09, { delay: 0.4, freqEnd: 196 });
    },

    // ---- railway ----
    bell: function (alt, vol) {
      if (sample('bell', vol, { gain: 0.8, rate: alt ? 1.05 : 1, dur: 0.5 })) return;
      var f = alt ? 1180 : 1000;
      tone(f, 0.2, 'sine', 0.09, { vol: vol, freqEnd: f * 0.98 });
      tone(f * 2.01, 0.14, 'sine', 0.04, { vol: vol });
      tone(f * 3.02, 0.08, 'sine', 0.02, { vol: vol });
    },
    // The warning whistle: a long "whoooo" then a shorter rising "wooo!"
    trainWhistle: function (vol) {
      if (sample('horn', vol, { gain: 0.7, dur: 1.45 })) return;
      tone(587, 0.65, 'sawtooth', 0.06, { vol: vol, vibrato: 6, attack: 0.05, hold: 0.45 });
      tone(740, 0.65, 'square', 0.04, { vol: vol, vibrato: 6, attack: 0.05, hold: 0.45 });
      tone(587, 0.9, 'sawtooth', 0.065, { vol: vol, delay: 0.8, freqEnd: 640, vibrato: 6, attack: 0.05, hold: 0.7 });
      tone(740, 0.9, 'square', 0.04, { vol: vol, delay: 0.8, freqEnd: 800, vibrato: 6, attack: 0.05, hold: 0.7 });
      noise(1.5, 0.03, { vol: vol, filter: 'highpass', freq: 3000, delay: 0.05 });
    },
    trainToot: function (vol) {
      if (sample('horn', vol, { gain: 0.6, offset: 0.1, dur: 0.8, rate: 1.05 })) return;
      tone(660, 0.35, 'sawtooth', 0.06, { vol: vol, attack: 0.03, hold: 0.2 });
      tone(830, 0.35, 'square', 0.04, { vol: vol, attack: 0.03, hold: 0.2 });
    },
    // The train thundering past: rumble plus rhythmic chugging.
    trainPass: function (vol) {
      noise(2.4, 0.3, { vol: vol, freq: 260, freqEnd: 140, attack: 0.5 });
      for (var i = 0; i < 12; i++) {
        noise(0.12, 0.2, { vol: vol, freq: 700, freqEnd: 250, delay: 0.1 + i * 0.17 });
      }
    },

    // ---- traffic ----
    carHorn: function (vol, big) {
      if (buffers.carhorn) {
        // the real horn: a deep blast for trucks and buses, a quick "beep beep" for cars
        if (big) sample('carhorn', vol, { gain: 0.9, rate: 0.62 });
        else {
          var r = 0.95 + Math.random() * 0.25;
          sample('carhorn', vol, { gain: 0.75, rate: r });
          sample('carhorn', vol, { gain: 0.75, rate: r, delay: 0.36 });
        }
        return;
      }
      if (big) {
        // truck / bus air horn
        tone(185, 0.75, 'sawtooth', 0.07, { vol: vol, attack: 0.03, hold: 0.5 });
        tone(233, 0.75, 'sawtooth', 0.06, { vol: vol, attack: 0.03, hold: 0.5 });
        tone(370, 0.75, 'square', 0.02, { vol: vol, attack: 0.03, hold: 0.5 });
      } else {
        // peppy two-note "beep beep"
        for (var i = 0; i < 2; i++) {
          tone(420, 0.16, 'square', 0.045, { vol: vol, delay: i * 0.22 });
          tone(528, 0.16, 'square', 0.035, { vol: vol, delay: i * 0.22 });
        }
      }
    },
    // A vehicle zooming past; big ones are a low rumble, cars a quick swish.
    whoosh: function (vol, big) {
      if (big) {
        noise(0.9, 0.22, { vol: vol, freq: 400, freqEnd: 130, attack: 0.25 });
        tone(70, 0.8, 'sawtooth', 0.06, { vol: vol, freqEnd: 55, attack: 0.25 });
      } else {
        noise(0.5, 0.14, { vol: vol, filter: 'bandpass', freq: 500, freqEnd: 1700, q: 0.8, attack: 0.12 });
      }
    },

    // springy boing for a power-up leap ('over' = hop over an obstacle, 'double' = two tiles)
    jump: function (kind) {
      var big = kind === 'double';
      tone(big ? 260 : 340, big ? 0.28 : 0.2, 'sine', 0.09, { freqEnd: big ? 900 : 620 });
      tone(big ? 520 : 680, 0.18, 'triangle', 0.05, { freqEnd: big ? 1400 : 1000, delay: 0.03 });
      noise(0.15, 0.06, { filter: 'bandpass', freq: 900, freqEnd: 2200, q: 0.9 });
    },

    // ---- power-ups ----
    powerup: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone(f, 0.16, 'square', 0.045, { delay: i * 0.055 });
        tone(f * 2, 0.12, 'sine', 0.03, { delay: i * 0.055 });
      });
    },
    blast: function () {
      noise(0.7, 0.4, { freq: 2400, freqEnd: 80, attack: 0.005 });
      tone(90, 0.6, 'sawtooth', 0.2, { freqEnd: 28 });
      tone(55, 0.5, 'square', 0.12, { freqEnd: 25 });
    },
    pop: function () {
      tone(700, 0.12, 'triangle', 0.08, { freqEnd: 200 });
      noise(0.12, 0.12, { filter: 'highpass', freq: 3000 });
    },
    freeze: function () {
      [1568, 1319, 1047, 784].forEach(function (f, i) { tone(f, 0.2, 'sine', 0.05, { delay: i * 0.05 }); });
    },
    expire: function () { tone(440, 0.1, 'triangle', 0.05, { freqEnd: 300 }); },

    // ---- combos, close calls, shop, missions ----
    nearMiss: function () {
      noise(0.28, 0.16, { filter: 'bandpass', freq: 600, freqEnd: 2600, q: 1.2, attack: 0.05 });
      tone(700, 0.16, 'sine', 0.07, { freqEnd: 1500 });
    },
    comboUp: function (level) {
      var base = 523 * Math.pow(1.122, level * 2);
      tone(base, 0.1, 'square', 0.05);
      tone(base * 1.26, 0.1, 'square', 0.05, { delay: 0.07 });
      tone(base * 1.5, 0.18, 'square', 0.055, { delay: 0.14 });
    },
    buy: function () {
      [1047, 1319, 1568, 2093].forEach(function (f, i) {
        tone(f, 0.14, 'square', 0.045, { delay: i * 0.06 });
        tone(f, 0.2, 'sine', 0.05, { delay: i * 0.06 });
      });
    },
    equip: function () {
      tone(660, 0.06, 'square', 0.04);
      tone(990, 0.09, 'square', 0.04, { delay: 0.05 });
    },
    deny: function () { tone(160, 0.18, 'sawtooth', 0.06, { freqEnd: 110 }); },
    missionDone: function () {
      [523, 659, 784, 659, 784, 1047].forEach(function (f, i) {
        tone(f, 0.16, 'square', 0.05, { delay: i * 0.085 });
        tone(f * 2, 0.14, 'sine', 0.025, { delay: i * 0.085 });
      });
    },
    // Thunder: a crack, then a long rolling rumble (delay = distance of the strike)
    thunder: function (delay) {
      noise(0.35, 0.35, { delay: delay, freq: 3000, freqEnd: 400, attack: 0.005 });
      noise(3.2, 0.5, { delay: delay + 0.05, freq: 220, freqEnd: 60, attack: 0.35 });
      tone(48, 2.6, 'sine', 0.2, { delay: delay + 0.1, freqEnd: 30, attack: 0.4 });
    },

    // The eagle diving at you: the real cry again, a touch higher and louder.
    eagleAttack: function () {
      if (sample('eagle', 1, { gain: 1, rate: 1.12 })) return;
      this.screech();
    },
    // the chicken's startled squawk as the talons close
    squawk: function () {
      if (sample('hen', 1, { gain: 0.95 })) return;
      tone(900, 0.16, 'square', 0.07, { freqEnd: 1500, vibrato: 30 });
      tone(1250, 0.14, 'triangle', 0.05, { freqEnd: 700, delay: 0.1 });
    },
    // ---- rare events and new hazards ----
    bikeBell: function (vol) {
      if (sample('bell', vol, { gain: 0.5, rate: 1.7, dur: 0.3 })) return;
      tone(1700, 0.2, 'sine', 0.06, { vol: vol });
    },
    stomp: function (vol) {
      for (var i = 0; i < 4; i++) {
        noise(0.12, 0.28, { vol: vol, freq: 220, freqEnd: 70, delay: i * 0.12 });
        tone(65, 0.12, 'sine', 0.12, { vol: vol, delay: i * 0.12 });
      }
    },
    stampede: function () {
      noise(2.4, 0.3, { freq: 200, freqEnd: 80, attack: 0.5 });
      for (var i = 0; i < 12; i++) noise(0.1, 0.22, { freq: 240, freqEnd: 70, delay: 0.1 + i * 0.16 });
    },
    crack: function (vol) {
      noise(0.2, 0.3, { vol: vol, freq: 3200, freqEnd: 500, attack: 0.002 });
      tone(150, 0.14, 'square', 0.08, { vol: vol, freqEnd: 70 });
    },
    coinRain: function () {
      [988, 1175, 1319, 1568, 1760, 2093].forEach(function (f, i) { tone(f, 0.22, 'sine', 0.06, { delay: i * 0.07 }); });
    },
    // new hazards
    slide: function () {
      noise(0.18, 0.06, { filter: 'highpass', freq: 3800, freqEnd: 6500, attack: 0.02 });
    },
    fall: function () {
      tone(700, 0.7, 'sine', 0.09, { freqEnd: 90 });
      tone(520, 0.7, 'triangle', 0.05, { freqEnd: 60, delay: 0.05 });
    },
    chomp: function () {
      noise(0.12, 0.3, { freq: 900, freqEnd: 200, attack: 0.002 });
      tone(120, 0.18, 'square', 0.12, { freqEnd: 60 });
      tone(90, 0.3, 'sawtooth', 0.1, { freqEnd: 40, delay: 0.08 });
    },
    crocGrowl: function (vol) {
      tone(95, 0.45, 'sawtooth', 0.06, { vol: vol, freqEnd: 70, vibrato: 22, attack: 0.05 });
      noise(0.3, 0.05, { vol: vol, freq: 500, freqEnd: 200, attack: 0.05 });
    },
    // ---- lane twists ----
    // a trampoline flings you two rows forward
    bounce: function () {
      tone(190, 0.32, 'sine', 0.12, { freqEnd: 950, vibrato: 12 });
      tone(380, 0.26, 'triangle', 0.06, { freqEnd: 1500, delay: 0.04 });
      noise(0.12, 0.05, { filter: 'bandpass', freq: 900, freqEnd: 2400, q: 0.9 });
    },
    // pulling a foot out of the mud
    squelch: function () {
      noise(0.2, 0.2, { filter: 'bandpass', freq: 380, freqEnd: 140, q: 1.2, attack: 0.02 });
      tone(150, 0.14, 'sine', 0.07, { freqEnd: 70 });
    },

    // ---- death animations (shop) ----
    poof: function () {
      noise(0.32, 0.14, { freq: 1000, freqEnd: 200, attack: 0.01 });
      tone(320, 0.16, 'sine', 0.08, { freqEnd: 80 });
    },
    tada: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone(f, 0.16, 'square', 0.045, { delay: i * 0.06 });
        tone(f * 2, 0.14, 'sine', 0.025, { delay: i * 0.06 });
      });
      noise(0.35, 0.06, { filter: 'highpass', freq: 5000, delay: 0.2 });
    },
    whirl: function () {
      tone(300, 0.7, 'sine', 0.09, { freqEnd: 1500, vibrato: 14 });
      tone(450, 0.7, 'triangle', 0.05, { freqEnd: 2200, delay: 0.05 });
      tone(1500, 0.14, 'sine', 0.05, { freqEnd: 400, delay: 0.72 });
    },
    ghostOoo: function () {
      tone(520, 0.95, 'sine', 0.07, { freqEnd: 260, vibrato: 8, attack: 0.12 });
      tone(780, 0.95, 'sine', 0.04, { freqEnd: 390, vibrato: 8, attack: 0.12 });
    },
    rocket: function () {
      noise(1.0, 0.2, { freq: 500, freqEnd: 3500, attack: 0.15 });
      tone(120, 0.9, 'sawtooth', 0.07, { freqEnd: 650 });
    },

    // ---- more rare events ----
    // a little drone buzzing past (vol: distance)
    drone: function (vol) {
      tone(140, 2.6, 'sawtooth', 0.035, { vol: vol, vibrato: 30, attack: 0.4, freqEnd: 175 });
      tone(280, 2.6, 'square', 0.014, { vol: vol, vibrato: 34, attack: 0.4, freqEnd: 350 });
    },
    crateLand: function () {
      noise(0.12, 0.18, { freq: 500, freqEnd: 150 });
      tone(110, 0.14, 'triangle', 0.1, { freqEnd: 60 });
    },
    crateOpen: function () {
      [784, 988, 1175, 1568].forEach(function (f, i) {
        tone(f, 0.16, 'square', 0.045, { delay: i * 0.05 });
        tone(f, 0.22, 'sine', 0.05, { delay: i * 0.05 });
      });
    },
    // a firework: a rising whistle, then the bang and the crackle
    firework: function (vol) {
      tone(520, 0.5, 'sine', 0.04, { vol: vol, freqEnd: 2200, attack: 0.05 });
      noise(0.4, 0.2, { vol: vol, delay: 0.5, freq: 3500, freqEnd: 500, attack: 0.003 });
      for (var i = 0; i < 6; i++) noise(0.05, 0.07, { vol: vol, delay: 0.55 + i * 0.06, filter: 'highpass', freq: 4000 });
    },

    portal: function () {
      [392, 523, 659, 880, 1175].forEach(function (f, i) {
        tone(f, 0.4, 'sine', 0.05, { delay: i * 0.08 });
        tone(f * 2, 0.3, 'triangle', 0.02, { delay: i * 0.08 });
      });
    },

    // The eagle's screech: three sharp, falling "kee-kee-kee" cries. It is the ONLY
    // warning you get that the eagle is coming (3 seconds before it arrives).
    eagleCry: function () {
      if (sample('eagle', 1, { gain: 0.9 })) return;
      [0, 0.3, 0.6].forEach(function (d, i) {
        tone(2500 - i * 160, 0.26, 'sawtooth', 0.06, { freqEnd: 1500 - i * 90, vibrato: 20, delay: d, attack: 0.02 });
        tone(3300 - i * 200, 0.22, 'triangle', 0.035, { freqEnd: 2200, delay: d + 0.02 });
        noise(0.2, 0.05, { filter: 'highpass', freq: 3500, delay: d });
      });
    },

    // Signature sounds of the special vehicles
    siren: function (vol) {
      if (sample('siren', vol, { gain: 0.8 })) return;
      [0, 0.45].forEach(function (d) {
        tone(650, 0.42, 'square', 0.04, { vol: vol, freqEnd: 1100, delay: d, attack: 0.04 });
        tone(1300, 0.42, 'sine', 0.025, { vol: vol, freqEnd: 2200, delay: d, attack: 0.04 });
      });
    },
    jingle: function (vol) {
      [784, 988, 1175, 988, 1175, 1568].forEach(function (f, i) {
        tone(f, 0.18, 'sine', 0.06, { vol: vol, delay: i * 0.13 });
        tone(f * 2, 0.12, 'triangle', 0.02, { vol: vol, delay: i * 0.13 });
      });
    }
  };
})();
