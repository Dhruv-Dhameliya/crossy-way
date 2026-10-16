// Space sounds: comet alarms, laser strikes and the UFO. They use only the
// synth building blocks of GameAudio (kit), so nothing in the Forest changes.
var SpaceAudio = (function () {
  var tone = GameAudio.kit.tone, noise = GameAudio.kit.noise;
  return {
      // a solar flare: a rising whoosh and a bright shimmer (the space version of a thunder strike)
      flare: function () {
        noise(1.4, 0.25, { filter: 'bandpass', freq: 400, freqEnd: 4000, q: 0.5, attack: 0.15 });
        tone(220, 1.2, 'sawtooth', 0.05, { freqEnd: 880, attack: 0.2 });
        tone(1760, 0.8, 'sine', 0.03, { delay: 0.3, freqEnd: 2200 });
      },
      cometAlarm: function (vol, short) {
        var n = short ? 2 : 4;
        for (var i = 0; i < n; i++) {
          tone(i % 2 ? 640 : 920, 0.32, 'square', 0.05, { vol: vol, delay: i * 0.34, freqEnd: i % 2 ? 900 : 640, attack: 0.02 });
          tone(i % 2 ? 320 : 460, 0.32, 'sawtooth', 0.035, { vol: vol, delay: i * 0.34, attack: 0.02 });
        }
      },
      cometPing: function (alt, vol) {
        var f = alt ? 1500 : 1250;
        tone(f, 0.18, 'sine', 0.08, { vol: vol, freqEnd: f * 0.7 });
        tone(f * 2, 0.1, 'sine', 0.025, { vol: vol });
      },
      cometPass: function (vol) {
        noise(1.6, 0.34, { vol: vol, filter: 'bandpass', freq: 500, freqEnd: 3200, q: 0.6, attack: 0.5 });
        noise(2.2, 0.2, { vol: vol, freq: 200, freqEnd: 70, attack: 0.4 });
        tone(120, 1.8, 'sawtooth', 0.05, { vol: vol, freqEnd: 40, attack: 0.5 });
      },
      laserFire: function (vol) {
        tone(1800, 0.5, 'sawtooth', 0.07, { vol: vol, freqEnd: 200, attack: 0.01 });
        noise(0.5, 0.2, { vol: vol, filter: 'highpass', freq: 2500, attack: 0.01 });
        tone(90, 0.6, 'square', 0.06, { vol: vol, freqEnd: 40 });
      },
      laserCharge: function (vol) {
        tone(300, 0.7, 'sine', 0.05, { vol: vol, freqEnd: 1400, attack: 0.1 });
      },
      zap: function () {
        noise(0.3, 0.3, { filter: 'highpass', freq: 2000, attack: 0.002 });
        tone(1400, 0.3, 'sawtooth', 0.1, { freqEnd: 120 });
      },
      // the UFO that comes for a dawdling chicken (warning 3 s before, like the eagle)
      ufoWarble: function () {
        for (var i = 0; i < 6; i++) {
          tone(i % 2 ? 520 : 780, 0.22, 'sine', 0.07, { delay: i * 0.2, freqEnd: i % 2 ? 780 : 520, vibrato: 8 });
          tone(i % 2 ? 1040 : 1560, 0.2, 'triangle', 0.03, { delay: i * 0.2 });
        }
      },
      ufoAttack: function () {
        tone(900, 0.9, 'sine', 0.08, { freqEnd: 180, vibrato: 14 });
        tone(450, 1.4, 'sawtooth', 0.04, { delay: 0.5, freqEnd: 900, vibrato: 10, attack: 0.3 });
        noise(1.2, 0.06, { filter: 'bandpass', freq: 1800, freqEnd: 600, q: 0.5, delay: 0.5, attack: 0.3 });
      }
  };
})();
