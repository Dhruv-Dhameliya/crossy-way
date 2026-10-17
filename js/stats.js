// Lifetime statistics for the Stats page (the second tab of the Trophies screen). The trophies
// only remember what a trophy needs; this keeps everything worth showing: distance, time played,
// the ways you lose, combos, power-ups, worlds, lanes crossed, modifiers and your last runs.
// The game just reports what happens (add / max / bump / runDone); the page is built by html().
// Saved lazily (on game over and when the page is hidden), like the trophies.
var Stats = (function () {
  var KEY = 'crossy_way_stats';
  var RECENT = 10;
  var s = null, dirty = false;

  function fresh() {
    return { n: {}, deaths: {}, powers: {}, mods: {}, diffs: {}, worlds: {}, lanes: {}, events: {}, recent: [], since: Date.now() };
  }

  function init() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* fresh start */ }
    s = fresh();
    if (saved && typeof saved === 'object') {
      Object.keys(s).forEach(function (k) {
        if (k === 'since') { if (typeof saved.since === 'number') s.since = saved.since; }
        else if (k === 'recent') { if (Array.isArray(saved.recent)) s.recent = saved.recent.slice(-RECENT); }
        else if (saved[k] && typeof saved[k] === 'object') s[k] = saved[k];
      });
    } else {
      seedFromTrophies();          // first time: take over what the trophies already counted
    }
  }

  // Players who already have progress keep their lifetime totals: copy them from the trophy counters.
  function seedFromTrophies() {
    var a = null;
    try { a = JSON.parse(localStorage.getItem('crossy_way_achievements')); } catch (e) { return; }
    if (!a || !a.stats) return;
    var t = a.stats;
    var map = { hops: 'hops', coins: 'coins', runs: 'runs', nearAll: 'near', powerups: 'powerups', crates: 'crates', rows: 'bestRow' };
    Object.keys(map).forEach(function (k) { if (t[k]) s.n[map[k]] = t[k]; });
    ['roads', 'rivers', 'rails', 'ice', 'voids', 'crocs', 'bikes', 'crumbles', 'dualRails', 'stampedes', 'belts', 'muds', 'bounces'].forEach(function (k) {
      if (t[k]) s.lanes[k] = t[k];
    });
    s.seeded = true;
    dirty = true;
  }

  function flush() {
    if (!dirty || !s) return;
    dirty = false;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
  }

  function add(key, n) { if (!s) return; s.n[key] = (s.n[key] || 0) + (n === undefined ? 1 : n); dirty = true; }
  function max(key, v) { if (!s) return; if (v > (s.n[key] || 0)) { s.n[key] = v; dirty = true; } }
  function bump(group, key, n) { if (!s) return; var g = s[group]; g[key] = (g[key] || 0) + (n === undefined ? 1 : n); dirty = true; }

  // A run ended: info {score, rows, diff, mut, death, time}.
  function runDone(info) {
    if (!s) return;
    s.n.runs = (s.n.runs || 0) + 1;
    s.n.time = (s.n.time || 0) + info.time;
    s.diffs[info.diff] = (s.diffs[info.diff] || 0) + 1;
    if (info.mut) s.mods[info.mut] = (s.mods[info.mut] || 0) + 1;
    s.recent.push({ score: info.score, rows: info.rows, diff: info.diff, mut: info.mut || null, death: info.death || null, at: Date.now() });
    if (s.recent.length > RECENT) s.recent.shift();
    dirty = true;
    flush();
  }

  // ---------------------------------------------------------------- the page
  var DEATH = {
    car:   ['🚗', 'Cars'],
    train: ['🚆', 'Trains & comets'],
    drown: ['🌊', 'Rivers & space'],
    fall:  ['🕳️', 'Chasms'],
    croc:  ['🐊', 'Crocs & lasers'],
    eagle: ['🦅', 'Eagle & UFO']
  };
  var LANES = [
    ['roads', '🚗', 'Roads'], ['rivers', '🌊', 'Rivers'], ['rails', '🚆', 'Railways'],
    ['ice', '🧊', 'Ice lanes'], ['belts', '⏩', 'Conveyors'], ['muds', '🟤', 'Mud lanes'],
    ['bounces', '🍄', 'Trampoline bounces'], ['voids', '🕳️', 'Chasms'], ['crocs', '🐊', 'Croc rivers'],
    ['bikes', '🚲', 'Bike lanes'], ['crumbles', '🪵', 'Rotten logs'], ['dualRails', '🚆', 'Double tracks'],
    ['stampedes', '🦬', 'Stampedes']
  ];
  var EVENTS = { storm: ['⚡', 'Storms'], rain: ['🪙', 'Coin rain'], drone: ['🚁', 'Supply drops'], jam: ['🚨', 'Traffic jams'], fireworks: ['🎆', 'Fireworks'], stampede: ['🦬', 'Stampedes'] };

  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function dur(sec) {
    sec = Math.round(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h ? h + 'h ' + m + 'm' : m ? m + 'm ' + (sec % 60) + 's' : sec + 's';
  }
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' d ago';
  }
  function top(group) {            // the key with the biggest count, or null
    var best = null;
    Object.keys(group).forEach(function (k) { if (group[k] > 0 && (best === null || group[k] > group[best])) best = k; });
    return best;
  }
  function sum(group) { return Object.keys(group).reduce(function (a, k) { return a + group[k]; }, 0); }
  function tile(icon, value, label) {
    return '<div class="st-tile"><span class="st-ico">' + icon + '</span><b>' + value + '</b><small>' + label + '</small></div>';
  }
  function bars(rows) {            // rows: [{icon, label, n}] sorted by the caller
    var mx = rows.reduce(function (a, r) { return Math.max(a, r.n); }, 1);
    return rows.map(function (r) {
      return '<div class="st-bar"><span class="sb-l">' + r.icon + ' ' + r.label + '</span><span class="sb-t"><i style="width:' + Math.round(100 * r.n / mx) + '%"></i></span><span class="sb-n">' + fmt(r.n) + (r.extra || '') + '</span></div>';
    }).join('');
  }

  // bestOf(diffMode, mutatorId|null) -> the saved top score (supplied by the game)
  function html(bestOf) {
    var n = s.n, out = '';
    var runs = n.runs || 0;
    if (!runs && !n.hops) return '<p class="setting-note">Play a run and your stats will show up here.</p>';

    out += '<div class="sec-title">HIGHLIGHTS</div><div class="st-grid">' +
      tile('🏃', fmt(runs), 'RUNS') +
      tile('⏱️', dur(n.time || 0), 'TIME PLAYED') +
      tile('📏', fmt(n.rows || 0), 'ROWS TRAVELLED') +
      tile('🏆', fmt(n.bestRow || 0), 'FURTHEST ROW') +
      tile('🐇', fmt(n.hops || 0), 'HOPS') +
      tile('🪙', fmt(n.coins || 0), 'COINS COLLECTED') + '</div>';

    var favPower = top(s.powers), cfg = (typeof CONFIG !== 'undefined' && CONFIG.POWERUPS) || {};
    out += '<div class="sec-title">SKILL</div><div class="st-grid">' +
      tile('🔥', fmt(n.maxCombo || 0), 'LONGEST COMBO (HOPS)') +
      tile('✖️', 'x' + (n.maxMult || 1), 'BEST MULTIPLIER') +
      tile('😰', fmt(n.near || 0), 'CLOSE CALLS') +
      tile(favPower && cfg[favPower] ? cfg[favPower].icon : '⚡', fmt(n.powerups || sum(s.powers)), favPower && cfg[favPower] ? 'POWER-UPS · FAVOURITE: ' + cfg[favPower].label : 'POWER-UPS') + '</div>';

    var dTotal = sum(s.deaths);
    out += '<div class="sec-title">HOW YOU LOSE</div>';
    if (dTotal) {
      var fav = top(s.deaths), dk = DEATH[fav] || ['❓', fav];
      out += '<div class="st-fav">Favourite way to go: <b>' + dk[0] + ' ' + dk[1] + '</b> (' + Math.round(100 * s.deaths[fav] / dTotal) + '%)</div>';
      out += bars(Object.keys(s.deaths).sort(function (a, b) { return s.deaths[b] - s.deaths[a]; }).map(function (k) {
        var d = DEATH[k] || ['❓', k];
        return { icon: d[0], label: d[1], n: s.deaths[k], extra: ' · ' + Math.round(100 * s.deaths[k] / dTotal) + '%' };
      }));
    } else out += '<p class="setting-note">No finished runs counted yet.</p>';

    // worlds
    var wk = Object.keys(s.worlds).filter(function (k) { return s.worlds[k] > 0; });
    if (wk.length) {
      out += '<div class="sec-title">WORLDS (ROWS REACHED)</div>' + bars(wk.sort(function (a, b) { return s.worlds[b] - s.worlds[a]; }).map(function (k) {
        var th = typeof Biome !== 'undefined' && Biome.themes[k];
        var label = th && th.label ? th.label : k;
        return { icon: '', label: label, n: s.worlds[k] };
      }));
    }

    // lanes crossed
    var lanes = LANES.filter(function (l) { return s.lanes[l[0]] > 0; });
    if (lanes.length) {
      out += '<div class="sec-title">LANES CROSSED</div>' + bars(lanes.sort(function (a, b) { return s.lanes[b[0]] - s.lanes[a[0]]; }).map(function (l) {
        return { icon: l[1], label: l[2], n: s.lanes[l[0]] };
      }));
    }

    // events
    var ev = Object.keys(s.events).filter(function (k) { return EVENTS[k] && s.events[k] > 0; });
    if (ev.length) {
      out += '<div class="sec-title">RARE EVENTS SEEN</div>' + bars(ev.sort(function (a, b) { return s.events[b] - s.events[a]; }).map(function (k) {
        return { icon: EVENTS[k][0], label: EVENTS[k][1], n: s.events[k] };
      }));
    }

    // modifiers
    var MUT = (typeof Mutators !== 'undefined') ? Mutators.LIST : [];
    var diffs = (typeof CONFIG !== 'undefined') ? Object.keys(CONFIG.DIFFICULTY) : [];
    var modRows = MUT.map(function (m) {
      var best = diffs.reduce(function (a, d) { return Math.max(a, bestOf(d, m.id)); }, 0);
      return { icon: m.icon, label: m.name, n: s.mods[m.id] || 0, extra: best ? ' · TOP ' + fmt(best) : '', best: best };
    });
    var played = modRows.filter(function (r) { return r.n > 0; });
    out += '<div class="sec-title">MODIFIERS</div>';
    if (played.length) {
      var fm = played.slice().sort(function (a, b) { return b.n - a.n; })[0];
      out += '<div class="st-fav">Most played: <b>' + fm.icon + ' ' + fm.label + '</b> (' + fm.n + ' run' + (fm.n === 1 ? '' : 's') + ')</div>';
      out += bars(played.sort(function (a, b) { return b.n - a.n; }));
      var untried = modRows.length - played.length;
      if (untried) out += '<p class="setting-note">' + untried + ' modifier' + (untried === 1 ? '' : 's') + ' not tried yet.</p>';
    } else out += '<p class="setting-note">You have not played with a modifier yet. Try one from the home screen!</p>';

    // difficulties
    if (diffs.length) {
      out += '<div class="sec-title">DIFFICULTY</div>' + bars(diffs.map(function (d) {
        var D = CONFIG.DIFFICULTY[d];
        var b = bestOf(d, null);
        return { icon: D.icon, label: D.label, n: s.diffs[d] || 0, extra: b ? ' · TOP ' + fmt(b) : '' };
      }));
    }

    // recent runs
    if (s.recent.length) {
      out += '<div class="sec-title">LAST RUNS</div>' + s.recent.slice().reverse().map(function (r) {
        var D = typeof CONFIG !== 'undefined' && CONFIG.DIFFICULTY[r.diff], m = r.mut && MUT.filter(function (x) { return x.id === r.mut; })[0], d = r.death && DEATH[r.death];
        return '<div class="st-run"><b>' + fmt(r.score) + '</b><span>row ' + fmt(r.rows) + ' · ' + (D ? D.icon : '') + (m ? ' ' + m.icon : '') + (d ? ' · ' + d[0] : '') + '</span><small>' + ago(r.at) + '</small></div>';
      }).join('');
    }

    out += '<p class="setting-note">' + (s.seeded ? 'Hops, coins, runs and lane counts were carried over from your trophies. ' : '') + 'Deaths, time played and distance are counted from ' + new Date(s.since).toLocaleDateString() + '.</p>';
    return out;
  }

  return { init: init, flush: flush, add: add, max: max, bump: bump, runDone: runDone, html: html };
})();
