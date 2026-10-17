// Missions (three rolling goals), the Daily Challenge (one goal per calendar day, the same for
// everybody, with a streak bonus) and the Weekly Challenge (one harder goal per week, Monday to
// Sunday, also the same for everybody; some are tied to a run modifier; week streak bonus).
// Progress is saved.
var Missions = (function () {
  var KEY = 'crossy_way_missions';

  // run: judged on a single run (best value) | otherwise adds up across runs. opts: [target, reward coins]
  var TPL = {
    rows:     { run: true, icon: '🛣️', text: function (n) { return 'Reach row ' + n + ' in one run'; }, opts: [[20, 12], [35, 20], [50, 30], [75, 50], [110, 90]] },
    coins:    { icon: '🪙', text: function (n) { return 'Collect ' + n + ' coins'; }, opts: [[15, 10], [30, 18], [50, 30], [80, 50]] },
    powerups: { icon: '⚡', text: function (n) { return 'Grab ' + n + ' power-ups'; }, opts: [[2, 12], [3, 18], [5, 30]] },
    rivers:   { icon: '🌊', text: function (n) { return 'Cross ' + n + ' rivers'; }, opts: [[4, 12], [8, 22], [14, 40]] },
    roads:    { icon: '🚗', text: function (n) { return 'Cross ' + n + ' roads'; }, opts: [[8, 12], [15, 22], [25, 38]] },
    combo:    { run: true, icon: '🔥', text: function (n) { return 'Reach a x' + n + ' combo'; }, opts: [[2, 12], [3, 24], [4, 40]] },
    near:     { icon: '😰', text: function (n) { return 'Pull off ' + n + ' close calls'; }, opts: [[2, 12], [4, 22], [7, 40]] }
  };

  // The daily is always about ONE run. Targets get harder through the week.
  var DAILY_KEYS = ['rows', 'coins', 'powerups', 'rivers', 'combo', 'near'];
  var DAILY_TARGET = {
    rows: [30, 40, 50, 60, 70], coins: [15, 20, 25, 30, 40], powerups: [2, 3, 3, 4, 4],
    rivers: [3, 4, 5, 6, 8], combo: [2, 3, 3, 4, 4], near: [2, 3, 4, 5, 6]
  };
  var DAILY_TEXT = {
    rows: function (n) { return 'Reach row ' + n + ' in a single run'; },
    coins: function (n) { return 'Collect ' + n + ' coins in a single run'; },
    powerups: function (n) { return 'Grab ' + n + ' power-ups in a single run'; },
    rivers: function (n) { return 'Cross ' + n + ' rivers in a single run'; },
    combo: function (n) { return 'Reach a x' + n + ' combo'; },
    near: function (n) { return 'Pull off ' + n + ' close calls in a run'; }
  };

  // The weekly goal. run: judged on one run (best value) | otherwise it adds up over the whole week.
  // mut: the goal names a run modifier ("Reach row 60 with Rush Hour on"), and only runs with it count.
  // noZen: runs on Zen don't count (it is the relaxed mode). tiers: the targets (a week picks one).
  var WEEKLY_KEYS = ['rowsMut', 'modRuns', 'coins', 'rivers', 'near', 'belts', 'events', 'powerups'];
  var WTPL = {
    rowsMut:  { stat: 'rows', run: true, mut: true, noZen: true, icon: '\uD83C\uDFB2', tiers: [35, 45, 55, 70, 85],
                text: function (n, m) { return 'Reach row ' + n + ' with ' + m.icon + ' ' + m.name + ' on'; } },
    modRuns:  { stat: 'modRuns', noZen: true, icon: '\uD83C\uDFB0', tiers: [6, 8, 10, 12, 15],
                text: function (n) { return 'Finish ' + n + ' runs with a modifier on'; } },
    coins:    { stat: 'coins', icon: '\uD83E\uDE99', tiers: [250, 350, 450, 600, 800], text: function (n) { return 'Collect ' + n + ' coins this week'; } },
    rivers:   { stat: 'rivers', icon: '\uD83C\uDF0A', tiers: [50, 70, 90, 120, 150], text: function (n) { return 'Cross ' + n + ' rivers this week'; } },
    near:     { stat: 'near', icon: '\uD83D\uDE30', tiers: [30, 45, 60, 80, 100], text: function (n) { return 'Pull off ' + n + ' close calls this week'; } },
    belts:    { stat: 'belts', icon: '\u23E9', tiers: [15, 20, 25, 30, 40], text: function (n) { return 'Cross ' + n + ' conveyor lanes this week'; } },
    events:   { stat: 'events', icon: '\u26A1', tiers: [6, 8, 10, 12, 15], text: function (n) { return 'Witness ' + n + ' rare events this week'; } },
    powerups: { stat: 'powerups', icon: '\uD83C\uDF81', tiers: [20, 30, 40, 50, 60], text: function (n) { return 'Grab ' + n + ' power-ups this week'; } }
  };

  var state, run = {}, runCtx = {}, cb = {};

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return dateStr(new Date()); }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return dateStr(d); }
  function hash(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function pickMission(exclude) {
    var keys = Object.keys(TPL).filter(function (k) { return exclude.indexOf(k) < 0; });
    var key = keys[Math.floor(Math.random() * keys.length)];
    var opts = TPL[key].opts;
    var base = Math.min(opts.length - 1, Math.floor(state.completed / 3));
    var idx = Utils.clamp(base + Utils.randInt(-1, 1), 0, opts.length - 1);
    return { key: key, target: opts[idx][0], reward: opts[idx][1], progress: 0 };
  }

  function makeDaily(date) {
    var h = hash(date);
    var key = DAILY_KEYS[h % DAILY_KEYS.length];
    var tier = Math.floor(h / 7) % 5;
    return { date: date, key: key, target: DAILY_TARGET[key][tier], progress: 0, done: false, seen: false };
  }

  function dailyReward(streakAfter) { return 60 + (Math.min(streakAfter, 5) - 1) * 10; }

  // ---- weeks (they start on Monday) ----
  function mondayOf(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  function thisWeek() { return dateStr(mondayOf(new Date())); }
  function lastWeek() { var m = mondayOf(new Date()); m.setDate(m.getDate() - 7); return dateStr(m); }
  function daysLeftInWeek() { return 7 - ((new Date().getDay() + 6) % 7); }      // 7 on Monday ... 1 on Sunday

  function makeWeekly(week) {
    var h = hash('week:' + week);
    var key = WEEKLY_KEYS[h % WEEKLY_KEYS.length];
    var T = WTPL[key];
    var mods = typeof Mutators !== 'undefined' ? Mutators.LIST : [];
    return {
      week: week, key: key, target: T.tiers[Math.floor(h / 11) % T.tiers.length], progress: 0, done: false, seen: false,
      mut: T.mut && mods.length ? mods[Math.floor(h / 53) % mods.length].id : null
    };
  }

  function weeklyReward(streakAfter) { return 150 + (Math.min(streakAfter, 5) - 1) * 25; }

  function weeklyStreakNow() {
    return state.wLast === thisWeek() || state.wLast === lastWeek() ? state.wStreak : 0;
  }

  function weeklyText(w) {
    var T = WTPL[w.key];
    var m = w.mut && typeof Mutators !== 'undefined' ? Mutators.byId(w.mut) : null;
    return T.text(w.target, m || { icon: '', name: '' });
  }

  function streakNow() {
    return state.lastDone === today() || state.lastDone === yesterday() ? state.streak : 0;
  }

  function ensureFresh() {
    if (!state.daily || state.daily.date !== today()) state.daily = makeDaily(today());
    if (!state.weekly || state.weekly.week !== thisWeek() || !WTPL[state.weekly.key]) state.weekly = makeWeekly(thisWeek());
    while (state.missions.length < 3) {
      state.missions.push(pickMission(state.missions.map(function (m) { return m.key; })));
    }
  }

  function init(callbacks) {
    cb = callbacks || {};
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* fresh */ }
    state = { missions: [], daily: null, weekly: null, streak: 0, lastDone: '', completed: 0, wStreak: 0, wLast: '' };
    if (s && typeof s === 'object') {
      if (Array.isArray(s.missions)) state.missions = s.missions;
      if (s.daily && typeof s.daily === 'object') state.daily = s.daily;
      if (s.weekly && typeof s.weekly === 'object') state.weekly = s.weekly;
      ['streak', 'completed', 'wStreak'].forEach(function (k) { if (typeof s[k] === 'number') state[k] = s[k]; });
      if (typeof s.lastDone === 'string') state.lastDone = s.lastDone;
      if (typeof s.wLast === 'string') state.wLast = s.wLast;
    }
    ensureFresh();
    save();
  }

  // A finished mission stays on the list (marked done) until the player opens the
  // Missions screen, where it fills, turns green, vanishes and gets replaced.
  function finishMission(m) {
    state.completed++;
    m.done = true;
    m.progress = m.target;
    if (cb.onReward) cb.onReward(m.reward);
    if (cb.onComplete) cb.onComplete({ kind: 'mission', icon: TPL[m.key].icon, text: TPL[m.key].text(m.target), reward: m.reward });
    save();
  }

  function finishDaily() {
    var d = state.daily;
    d.done = true;
    d.seen = false;
    state.streak = state.lastDone === yesterday() ? state.streak + 1 : 1;
    state.lastDone = today();
    var reward = dailyReward(state.streak);
    if (cb.onReward) cb.onReward(reward);
    if (cb.onComplete) cb.onComplete({ kind: 'daily', icon: '🏅', text: DAILY_TEXT[d.key](d.target), reward: reward, streak: state.streak });
    save();
  }

  function finishWeekly() {
    var w = state.weekly;
    w.done = true;
    w.seen = false;
    state.wStreak = state.wLast === lastWeek() ? state.wStreak + 1 : 1;
    state.wLast = thisWeek();
    var reward = weeklyReward(state.wStreak);
    if (cb.onReward) cb.onReward(reward);
    if (cb.onComplete) cb.onComplete({ kind: 'weekly', icon: '\uD83D\uDCC5', text: weeklyText(w), reward: reward, streak: state.wStreak });
    save();
  }

  // Does the run in progress count for this week's goal?
  function weeklyCounts(w) {
    var T = WTPL[w.key];
    if (T.mut && runCtx.mut !== w.mut) return false;
    if (T.noZen && runCtx.diff === 'zen') return false;
    return true;
  }

  // stat: rows | coins | powerups | rivers | roads | combo | near (and, for the weekly goal: belts | events | modRuns)
  // absolute: the value is the current level (rows reached, combo multiplier), not an increment
  function event(stat, amount, absolute) {
    var value = absolute ? Math.max(run[stat] || 0, amount) : (run[stat] || 0) + amount;
    run[stat] = value;
    for (var i = 0; i < state.missions.length; i++) {
      var m = state.missions[i];
      if (m.key !== stat || m.done) continue;
      m.progress = TPL[stat].run ? Math.max(m.progress, value) : m.progress + (absolute ? 0 : amount);
      if (m.progress >= m.target) finishMission(m);
    }
    var d = state.daily;
    if (d && !d.done && d.key === stat) {
      d.progress = Math.max(d.progress, value);
      if (d.progress >= d.target) finishDaily();
    }
    var w = state.weekly;
    if (w && !w.done && WTPL[w.key].stat === stat && weeklyCounts(w)) {
      w.progress = WTPL[w.key].run ? Math.max(w.progress, value) : w.progress + (absolute ? 0 : amount);
      if (w.progress >= w.target) finishWeekly();
    }
  }

  function view() {
    ensureFresh();
    var d = state.daily, w = state.weekly;
    return {
      missions: state.missions.map(function (m) {
        return { icon: TPL[m.key].icon, text: TPL[m.key].text(m.target), progress: Math.min(m.progress, m.target), target: m.target, reward: m.reward, done: !!m.done };
      }),
      daily: {
        icon: '🏅', text: DAILY_TEXT[d.key](d.target), progress: Math.min(d.progress, d.target), target: d.target, done: d.done, seen: !!d.seen,
        reward: dailyReward(d.done ? Math.max(1, state.streak) : (state.lastDone === yesterday() ? state.streak + 1 : 1))
      },
      weekly: {
        icon: WTPL[w.key].icon, text: weeklyText(w), progress: Math.min(w.progress, w.target), target: w.target, done: w.done, seen: !!w.seen,
        reward: weeklyReward(w.done ? Math.max(1, state.wStreak) : (state.wLast === lastWeek() ? state.wStreak + 1 : 1)),
        noZen: !!WTPL[w.key].noZen, daysLeft: daysLeftInWeek(), streak: weeklyStreakNow()
      },
      streak: streakNow(),
      completed: state.completed
    };
  }

  return {
    init: init,
    // ctx: {mut: the run modifier's id or null, diff: the difficulty} (the weekly goal may care)
    runStart: function (ctx) { run = {}; runCtx = ctx || {}; ensureFresh(); },
    runEnd: save,
    event: event,
    view: view,
    // anything finished that the player has not looked at yet? (drives the red dot)
    hasCompleted: function () {
      return state.missions.some(function (m) { return m.done; }) || (state.daily.done && !state.daily.seen) || (state.weekly.done && !state.weekly.seen);
    },
    // Replace every finished mission with a fresh one; returns the slots that changed.
    collectCompleted: function () {
      var replaced = [];
      for (var i = 0; i < state.missions.length; i++) {
        var m = state.missions[i];
        if (!m.done) continue;
        var others = state.missions.map(function (x, j) { return j === i ? null : x.key; }).filter(Boolean);
        others.push(m.key); // don't offer the same goal straight away
        state.missions[i] = pickMission(others);
        replaced.push(i);
      }
      if (state.daily.done) state.daily.seen = true;
      if (state.weekly.done) state.weekly.seen = true;
      save();
      return replaced;
    }
  };
})();
