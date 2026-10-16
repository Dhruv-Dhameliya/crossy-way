// Space music: a synthwave groove - pulsing bass, a bright arpeggio, a gated pad and
// a gliding lead over a soft four-on-the-floor beat. Registered as the "space" mood.
(function () {
  Music.registerMood('space', {
    prob: 0.55,
    cfg: {
      bpm: 108,
      chords: [[62, 65, 69, 38], [58, 62, 65, 34], [60, 64, 67, 36], [57, 60, 64, 33]],
      scale: [62, 65, 67, 69, 72, 74, 77, 79, 81]
    },
    step: function (P, s, t, chord, lead, kit) {
      var d = P.stepDur;
      if (s % 4 === 0) kit.kick(t, 0.55);                                   // soft four-on-the-floor
      if (s === 4 || s === 12) kit.noiseHit(t, 0.12, 0.16, 'bandpass', 2400); // clap
      if (s % 2 === 1) kit.noiseHit(t, 0.03, 0.05, 'highpass', 8000);       // off-beat hat
      kit.note(chord[3] + (s % 4 === 2 ? 12 : 0), t, d * 1.5, 'sawtooth', 0.1);   // pulsing bass
      kit.note(chord[[0, 1, 2, 1][s % 4]] + 12, t, d * 0.9, 'square', 0.026);    // neon arpeggio
      if (s === 0) {                                                        // wide pad
        for (var i = 0; i < 3; i++) kit.note(chord[i] + 12, t, d * 15, 'sawtooth', 0.02);
      }
      if (lead) kit.note(lead, t, d * 3, 'sawtooth', 0.045);                // glide lead
    }
  });
})();
