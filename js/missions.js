// Missions (three rolling goals) and the Daily Challenge (one goal per calendar
// day, the same for everybody, with a streak bonus). Progress is saved.
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

  var state, run = {}, cb = {};

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

  function streakNow() {
    return state.lastDone === today() || state.lastDone === yesterday() ? state.streak : 0;
  }

  function ensureFresh() {
    if (!state.daily || state.daily.date !== today()) state.daily = makeDaily(today());
    while (state.missions.length < 3) {
      state.missions.push(pickMission(state.missions.map(function (m) { return m.key; })));
    }
  }

  function init(callbacks) {
    cb = callbacks || {};
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* fresh */ }
    state = s && s.missions ? s : { missions: [], daily: null, streak: 0, lastDone: '', completed: 0 };
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

  // stat: rows | coins | powerups | rivers | roads | combo | near
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
  }

  function view() {
    var d = state.daily;
    return {
      missions: state.missions.map(function (m) {
        return { icon: TPL[m.key].icon, text: TPL[m.key].text(m.target), progress: Math.min(m.progress, m.target), target: m.target, reward: m.reward, done: !!m.done };
      }),
      daily: {
        icon: '🏅', text: DAILY_TEXT[d.key](d.target), progress: Math.min(d.progress, d.target), target: d.target, done: d.done, seen: !!d.seen,
        reward: dailyReward(d.done ? Math.max(1, state.streak) : (state.lastDone === yesterday() ? state.streak + 1 : 1))
      },
      streak: streakNow(),
      completed: state.completed
    };
  }

  return {
    init: init,
    runStart: function () { run = {}; ensureFresh(); },
    runEnd: save,
    event: event,
    view: view,
    // anything finished that the player has not looked at yet? (drives the red dot)
    hasCompleted: function () {
      return state.missions.some(function (m) { return m.done; }) || (state.daily.done && !state.daily.seen);
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
      save();
      return replaced;
    }
  };
})();
