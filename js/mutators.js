// Run modifiers ("mutators"): an optional rule twist picked on the home screen before a run.
// One modifier at a time, and every modifier keeps its own top score (per difficulty).
// This module only describes the rules; the game reads them where they matter:
//   mul / set  tweak the difficulty numbers (Difficulty.cur in config.js)
//   tod / wx   force the time of day / weather (Weather.setForced)
//   noCoins    no coins anywhere (world.js)      scoreMult  multiplies every point scored
//   hopDur / hopH  floaty hops (player.js)       mirror     left and right swap (game.js)
//   ice        most grass lanes turn into ice (world.js)
var Mutators = (function () {
  var KEY = 'crossy_way_mutator';

  var LIST = [
    { id: 'night',   icon: '🌙', name: 'Night Shift',   desc: 'It is always night. Watch for headlights.', tod: 'night' },
    { id: 'fog',     icon: '🌫️', name: 'Pea Soup',      desc: 'Thick fog hides everything ahead.', wx: 'fog' },
    { id: 'traffic', icon: '🚗', name: 'Rush Hour',     desc: 'Twice the traffic on every road.', mul: { traffic: 2 } },
    { id: 'fast',    icon: '⚡', name: 'Speed Run',     desc: 'Traffic, logs and trains move 40% faster.', mul: { speed: 1.4, train: 0.7 } },
    { id: 'eagle',   icon: '🦅', name: 'Eagle Rush',    desc: 'The eagle shows up after only 4.5 seconds (even in Zen).', set: { eagle: 4.5 } },
    { id: 'coins',   icon: '🚫', name: 'Penniless',     desc: 'No coins at all, but every point counts 3x.', noCoins: true, scoreMult: 3 },
    { id: 'moon',    icon: '🌕', name: 'Moon Hops',     desc: 'Low gravity: slow, floaty hops that keep you in the air longer.', hopDur: 1.75, hopH: 1.9 },
    { id: 'mirror',  icon: '🪞', name: 'Mirror World',  desc: 'Left and right are swapped. Good luck!', mirror: true },
    { id: 'ice',     icon: '🧊', name: 'Slip & Slide',  desc: 'Almost every grass lane is slippery ice.', ice: true }
  ];

  var cur = null;
  try {
    var saved = localStorage.getItem(KEY);
    cur = LIST.filter(function (m) { return m.id === saved; })[0] || null;
  } catch (e) { /* private mode */ }

  var cache = {};   // derived difficulties, one per (mode, modifier)

  return {
    LIST: LIST,
    get cur() { return cur; },
    get id() { return cur ? cur.id : null; },
    byId: function (id) { return LIST.filter(function (m) { return m.id === id; })[0] || null; },
    set: function (id) {
      cur = this.byId(id);
      try { if (cur) localStorage.setItem(KEY, cur.id); else localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
    },
    // a flag of the active modifier (false when none is active)
    has: function (flag) { return !!(cur && cur[flag]); },
    // a numeric property of the active modifier, or `dflt`
    num: function (prop, dflt) { return cur && cur[prop] !== undefined ? cur[prop] : dflt; },
    // The difficulty with the modifier's changes applied (the plain object when there is none).
    apply: function (mode, d) {
      if (!cur || (!cur.mul && !cur.set)) return d;
      var key = mode + ':' + cur.id;
      if (!cache[key]) {
        var o = {};
        Object.keys(d).forEach(function (k) { o[k] = d[k]; });
        Object.keys(cur.mul || {}).forEach(function (k) { o[k] = d[k] * cur.mul[k]; });
        Object.keys(cur.set || {}).forEach(function (k) { o[k] = cur.set[k]; });
        cache[key] = o;
      }
      return cache[key];
    },
    // appended to the top-score storage key so each modifier has its own record
    bestSuffix: function () { return cur ? '_m_' + cur.id : ''; }
  };
})();
