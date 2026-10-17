// Trophies: long-term achievements that sit next to the missions. Progress and
// unlocks are saved on the device. The game just reports what happens
// (event / mark / runStart / runEnd) and this module decides what unlocks.
var Achievements = (function () {
  var KEY = 'crossy_way_achievements';

  // stat: what is counted. run: true = the best value reached in ONE run (otherwise it
  // adds up over all runs). set: a collection (counts distinct things).
  // reward: coins on unlock.
  var DEFS = [
    // --- distance (single run)
    { id: 'rows25',  icon: '👣', name: 'Getting Started', desc: 'Reach row 25 in one run',  stat: 'rows', run: true, target: 25,  reward: 10 },
    { id: 'rows50',  icon: '🛣️', name: 'Road Warrior',    desc: 'Reach row 50 in one run',  stat: 'rows', run: true, target: 50,  reward: 20 },
    { id: 'rows100', icon: '💯', name: 'Centurion',        desc: 'Reach row 100 in one run', stat: 'rows', run: true, target: 100, reward: 50 },
    { id: 'rows200', icon: '🏔️', name: 'Marathon',         desc: 'Reach row 200 in one run', stat: 'rows', run: true, target: 200, reward: 120 },
    // --- lifetime totals
    { id: 'hops100',   icon: '🐇', name: 'Hopper',      desc: 'Hop 100 times',   stat: 'hops', target: 100,  reward: 10 },
    { id: 'hops1000',  icon: '🦘', name: 'Hop Machine', desc: 'Hop 1,000 times', stat: 'hops', target: 1000, reward: 30 },
    { id: 'hops5000',  icon: '🚀', name: 'Hop Legend',  desc: 'Hop 5,000 times', stat: 'hops', target: 5000, reward: 80 },
    { id: 'coins100',  icon: '🪙', name: 'Pocket Change', desc: 'Collect 100 coins',   stat: 'coins', target: 100,  reward: 10 },
    { id: 'coins500',  icon: '💰', name: 'Rich Chicken',  desc: 'Collect 500 coins',   stat: 'coins', target: 500,  reward: 30 },
    { id: 'coins2000', icon: '🏦', name: 'Gold Hoarder',  desc: 'Collect 2,000 coins', stat: 'coins', target: 2000, reward: 100 },
    { id: 'runs25',    icon: '🔁', name: 'Regular',       desc: 'Play 25 runs',        stat: 'runs',  target: 25,   reward: 30 },
    // --- crossing things
    { id: 'roads50',   icon: '🚗', name: 'Road Crosser',     desc: 'Cross 50 roads',     stat: 'roads',  target: 50,  reward: 15 },
    { id: 'roads250',  icon: '🚦', name: 'Highway Hero',     desc: 'Cross 250 roads',    stat: 'roads',  target: 250, reward: 50 },
    { id: 'rivers25',  icon: '🌊', name: 'River Hopper',     desc: 'Cross 25 rivers',    stat: 'rivers', target: 25,  reward: 15 },
    { id: 'rivers100', icon: '🏞️', name: 'Master of Waters', desc: 'Cross 100 rivers',   stat: 'rivers', target: 100, reward: 50 },
    { id: 'rails15',   icon: '🚆', name: 'Track Star',       desc: 'Cross 15 railways',  stat: 'rails',  target: 15,  reward: 20 },
    { id: 'ice30',     icon: '⛸️', name: 'Ice Skater',       desc: 'Cross 30 ice lanes', stat: 'ice',    target: 30,  reward: 20 },
    { id: 'crocs10',   icon: '🐊', name: 'Croc Hopper',      desc: 'Cross 10 crocodile rivers or laser rocks', stat: 'crocs', target: 10, reward: 30 },
    { id: 'belt15',   icon: '⏩', name: 'Conveyor Surfer', desc: 'Cross 15 conveyor-belt lanes',    stat: 'belts',    target: 15, reward: 25 },
    { id: 'mud15',    icon: '🟤', name: 'Mud Wader',     desc: 'Cross 15 mud (or moon dust) lanes', stat: 'muds',   target: 15, reward: 25 },
    { id: 'bounce10', icon: '🍄', name: 'Bouncer',       desc: 'Get flung by 10 trampolines',       stat: 'bounces', target: 10, reward: 30 },
    { id: 'bikes10',   icon: '🚲', name: 'Slalom',          desc: 'Cross 10 bike (or scooter) lanes', stat: 'bikes',    target: 10, reward: 25 },
    { id: 'crumble10', icon: '🪵', name: 'Rotten Luck',     desc: 'Cross 10 crumbling-log rivers',    stat: 'crumbles', target: 10, reward: 25 },
    { id: 'dual3',     icon: '🚆', name: 'Double Trouble',  desc: 'Cross 3 double railways',          stat: 'dualRails', target: 3, reward: 30 },
    { id: 'stampede3', icon: '🦬', name: 'Stampede Survivor', desc: 'Cross 3 stampede lanes',         stat: 'stampedes', target: 3, reward: 40 },
    { id: 'void10',    icon: '🕳️', name: 'Chasm Crosser',    desc: 'Cross 10 chasms',    stat: 'voids',  target: 10,  reward: 30 },
    // --- skill
    { id: 'near5',   icon: '😰', name: 'Daredevil',       desc: '5 close calls in one run', stat: 'near', run: true, target: 5,  reward: 25 },
    { id: 'near50',  icon: '😎', name: 'Nerves of Steel', desc: 'Pull off 50 close calls',  stat: 'nearAll', target: 50, reward: 40 },
    { id: 'combo5',  icon: '🔥', name: 'Combo King',      desc: 'Reach a x5 combo',         stat: 'combo', run: true, target: 5, reward: 30 },
    { id: 'eagle5',  icon: '🦅', name: 'Eagle Eye',       desc: 'Hop away 5 times after hearing the eagle (or UFO) warning', stat: 'eagleEscape', target: 5, reward: 30 },
    { id: 'power25', icon: '⚡', name: 'Power Hungry',    desc: 'Grab 25 power-ups',        stat: 'powerups', target: 25, reward: 25 },
    { id: 'powerAll', icon: '🎁', name: 'Collector',      desc: 'Grab every kind of power-up', stat: 'powerKinds', set: true, target: 8, reward: 50 },
    // --- modifiers and new rare events
    { id: 'mut1',    icon: '🎲', name: 'Rule Bender',     desc: 'Finish a run with a modifier on',            stat: 'mutRuns',  target: 1,  reward: 25 },
    { id: 'mut50',   icon: '🧪', name: 'Mad Scientist',   desc: 'Reach row 50 with a modifier on',            stat: 'mutRows', run: true, target: 50, reward: 60 },
    { id: 'mut9',    icon: '🎰', name: 'Mutant',          desc: 'Try every modifier (reach row 10 with each)', stat: 'mutKinds', set: true, target: 9, reward: 80 },
    { id: 'crate3',  icon: '📦', name: 'Supply Chain',    desc: 'Grab 3 supply crates dropped by the drone',  stat: 'crates',   target: 3,  reward: 35 },
    { id: 'fw3',     icon: '🎆', name: 'Fireworks Fan',   desc: 'Enjoy 3 firework shows',                     stat: 'fireworks', target: 3, reward: 30 },
    { id: 'jam3',    icon: '🚨', name: 'Jam Session',     desc: 'Cross a road during a traffic jam 3 times',  stat: 'jamCross', target: 3,  reward: 35 },
    // --- worlds and modes
    { id: 'zen100', icon: '🧘', name: 'Inner Peace', desc: 'Reach row 100 in Zen mode', stat: 'rows_zen', run: true, target: 100, reward: 30 },
    { id: 'space',   biome: 'space', icon: '🌌', name: 'Space Cadet',   desc: 'Reach Space',                      stat: 'space', target: 1, reward: 40 },
    { id: 'round',   biome: 'space', icon: '🔄', name: 'Round Trip',    desc: 'Forest to Space and back in one run', stat: 'swaps', run: true, target: 2, reward: 60 },
    { id: 'hard50',  icon: '🔥', name: 'Brave',         desc: 'Reach row 50 on Hard',    stat: 'rows_hard',    run: true, target: 50, reward: 50 },
    { id: 'ext50',   icon: '💀', name: 'Fearless',      desc: 'Reach row 50 on Extreme', stat: 'rows_extreme', run: true, target: 50, reward: 100 },
    // --- meta
    { id: 'daily1',  icon: '🏅', name: 'Daily Driver',  desc: 'Finish a daily challenge',        stat: 'daily', target: 1, reward: 30 },
    { id: 'streak5', icon: '📅', name: 'On a Roll',     desc: 'Reach a 5 day daily streak',      stat: 'streak', run: true, target: 5, reward: 60 },
    { id: 'wardrobe', icon: '🎩', name: 'Fashionista',  desc: 'Own 5 chickens or outfits',       stat: 'owned', run: true, target: 5, reward: 40 },
    { id: 'events10', icon: '⚡', name: 'Weather Watcher', desc: 'Witness 10 rare events (storms, coin rain, stampedes, supply drops, jams, fireworks)', stat: 'events', target: 10, reward: 40 },
    { id: 'pet1',    icon: '🐥', name: 'Best Friend',   desc: 'Adopt a pet companion',           stat: 'pets', run: true, target: 1, reward: 30 },
    { id: 'shop15',  icon: '🛍️', name: 'Shopaholic', desc: 'Own 15 things from the shop',     stat: 'shopItems', run: true, target: 15, reward: 60 },
    { id: 'weekly1', icon: '📅', name: 'Weekly Warrior',   desc: 'Finish a weekly challenge',                    stat: 'weekly',  target: 1, reward: 60 },
    { id: 'weekly3', icon: '🗓️', name: 'Week After Week', desc: 'Finish weekly challenges 3 weeks in a row', stat: 'wstreak', run: true, target: 3, reward: 120 },
    { id: 'chests3', icon: '🎁', name: 'Lucky Dip',     desc: 'Open 3 mystery chests',           stat: 'chests', target: 3, reward: 30 },
    { id: 'share1',  icon: '📸', name: 'Show Off',      desc: 'Share a score card',              stat: 'shares', target: 1, reward: 20 },
    { id: 'deaths6', icon: '☠️', name: 'Seen It All',   desc: 'Lose in every possible way (car, train, river, eagle, croc and the void)', stat: 'deathKinds', set: true, target: 6, reward: 50 }
  ];

  var state = null, run = {}, cb = {};
  var dirty = false;
  var known = {}, runStat = {};      // which stats have a trophy, and which of those are per-run
  DEFS.forEach(function (d) { known[d.stat] = true; if (d.run) runStat[d.stat] = true; });

  // Progress is written lazily (every counted hop would otherwise hit localStorage):
  // on unlock, at the end of a run, and when the page is hidden.
  function save() { dirty = true; }
  function flush() {
    if (!dirty || !state) return;
    dirty = false;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  // A trophy that belongs to a biome only exists while that biome is installed.
  function available(d) { return !d.biome || (typeof Biome !== 'undefined' && !!Biome.themes[d.biome]); }

  function init(callbacks) {
    cb = callbacks || {};
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* fresh */ }
    state = { stats: {}, sets: {}, unlocked: {}, seen: {} };
    if (s && typeof s === 'object') {
      Object.keys(state).forEach(function (k) { if (s[k] && typeof s[k] === 'object') state[k] = s[k]; });
    }
    run = {};
  }

  function value(stat) { return state.stats[stat] || 0; }

  function check(stat) {
    for (var i = 0; i < DEFS.length; i++) {
      var d = DEFS[i];
      if (d.stat !== stat || state.unlocked[d.id]) continue;
      if (value(stat) >= d.target) {
        state.unlocked[d.id] = Date.now();
        save(); flush();
        if (cb.onUnlock) cb.onUnlock(d);
      }
    }
  }

  // Count something. Lifetime stats add up; "run" stats keep the best single-run value.
  // max = true: v is a level reached (not an amount to add).
  function event(stat, v, max) {
    if (!state || !known[stat]) return;      // only stats that a trophy cares about are kept
    v = v === undefined ? 1 : v;
    if (runStat[stat]) {
      run[stat] = max ? Math.max(run[stat] || 0, v) : (run[stat] || 0) + v;
      if (run[stat] > value(stat)) { state.stats[stat] = run[stat]; save(); check(stat); }
    } else {
      state.stats[stat] = max ? Math.max(value(stat), v) : value(stat) + v;
      save();
      check(stat);
    }
  }

  // Collections: counts each distinct key once (power-up kinds, ways to die).
  function mark(statSet, key) {
    if (!state) return;
    var s = state.sets[statSet] = state.sets[statSet] || {};
    if (s[key]) return;
    s[key] = 1;
    state.stats[statSet] = Object.keys(s).length;
    save();
    check(statSet);
  }

  function runStart() { run = {}; }
  function runEnd() {
    if (!state) return;
    event('runs', 1);
    flush();
  }

  function progress(d) {
    var v = value(d.stat);
    return Math.min(v, d.target);
  }

  function view() {
    return DEFS.filter(available).map(function (d) {
      return {
        id: d.id, icon: d.icon, name: d.name, desc: d.desc, reward: d.reward, target: d.target,
        progress: progress(d), done: !!state.unlocked[d.id], isNew: !!state.unlocked[d.id] && !state.seen[d.id]
      };
    });
  }

  function counts() {
    var done = 0;
    var total = 0;
    DEFS.forEach(function (d) { if (!available(d)) return; total++; if (state.unlocked[d.id]) done++; });
    return { done: done, total: total };
  }
  function hasNew() {
    return DEFS.some(function (d) { return available(d) && state.unlocked[d.id] && !state.seen[d.id]; });
  }
  function markSeen() {
    Object.keys(state.unlocked).forEach(function (k) { state.seen[k] = 1; });
    save();
  }

  return { init: init, flush: flush, event: event, mark: mark, runStart: runStart, runEnd: runEnd, view: view, counts: counts, hasNew: hasNew, markSeen: markSeen };
})();
