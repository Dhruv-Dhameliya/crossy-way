// Chicken skins and outfits for the coin shop: what exists, what you own, what
// you're wearing, plus the 3D parts and the little pixel previews.
var Cosmetics = (function () {
  var KEY = 'crossy_way_cosmetics';

  function B(x, y, z, w, h, d, color) {
    return { x: x, y: y, z: z, w: w, h: h, d: d, color: color };
  }

  // ---------------------------------------------------------------- skins
  var SKINS = [
    { id: 'classic', name: 'Classic', price: 0, body: 0xfafafa, shade: 0xe9eef2, wing: 0xe9eef2, tail: 0xeef2f5, beak: 0xf7a823, legs: 0xf7a823, comb: 0xe53935, eye: 0x1d1d22 },
    { id: 'brownie', name: 'Brownie', price: 40, body: 0xc98a4e, shade: 0xb0733a, wing: 0xa8672f, tail: 0xb77a3e, beak: 0xf7a823, legs: 0xf7a823, comb: 0xd32f2f, eye: 0x1d1d22 },
    { id: 'rosy', name: 'Rosy', price: 60, body: 0xffb6d0, shade: 0xf29ab8, wing: 0xf08fb0, tail: 0xf6a5c3, beak: 0xffa000, legs: 0xffa000, comb: 0xff4f8b, eye: 0x1d1d22 },
    { id: 'sky', name: 'Sky', price: 80, body: 0x8fd0ff, shade: 0x6fb8f0, wing: 0x62aee8, tail: 0x7cc2f6, beak: 0xffb300, legs: 0xffb300, comb: 0xff7043, eye: 0x1d1d22 },
    { id: 'lime', name: 'Lime', price: 100, body: 0xa5e05a, shade: 0x8ac444, wing: 0x7bb83a, tail: 0x92d04c, beak: 0xff9800, legs: 0xff9800, comb: 0xff5252, eye: 0x1d1d22 },
    { id: 'fire', name: 'Fire', price: 160, body: 0xff7043, shade: 0xe64a19, wing: 0xd84315, tail: 0xf4511e, beak: 0xffd54f, legs: 0xffd54f, comb: 0xffd54f, eye: 0x1d1d22 },
    { id: 'midnight', name: 'Midnight', price: 220, body: 0x3a3f55, shade: 0x2d3145, wing: 0x262a3b, tail: 0x30354a, beak: 0xffb300, legs: 0xffb300, comb: 0x7e57c2, eye: 0xffe14d },
    { id: 'golden', name: 'Golden', price: 400, body: 0xffd54f, shade: 0xf2b92a, wing: 0xe8a91a, tail: 0xf6c13a, beak: 0xff8f00, legs: 0xff8f00, comb: 0xff6f00, eye: 0x1d1d22, glow: 0x4a3300 }
  ];

  // -------------------------------------------------------------- outfits
  // boxes(): 3D parts in the chicken's local space. px: pixel-art overlay for previews (14x15 grid).
  var OUTFITS = [
    { id: 'shades', name: 'Shades', slot: 'face', price: 50, boxes: function () {
      return [B(0, 0.68, 0.29, 0.44, 0.11, 0.04, 0x111111), B(-0.24, 0.68, 0.12, 0.04, 0.04, 0.3, 0x111111), B(0.24, 0.68, 0.12, 0.04, 0.04, 0.3, 0x111111),
        B(-0.1, 0.7, 0.315, 0.1, 0.03, 0.01, 0x5a6b7a)];
    }, px: [[3, 6, 3, 2, '#111'], [8, 6, 3, 2, '#111'], [6, 6, 2, 1, '#111'], [4, 6, 1, 1, '#5a6b7a']] },
    { id: 'stache', name: 'Mustache', slot: 'face', price: 70, boxes: function () {
      return [B(0, 0.55, 0.325, 0.26, 0.05, 0.06, 0x4e342e), B(-0.14, 0.52, 0.325, 0.06, 0.08, 0.06, 0x4e342e), B(0.14, 0.52, 0.325, 0.06, 0.08, 0.06, 0x4e342e)];
    }, px: [[4, 10, 6, 1, '#4e342e'], [3, 10, 1, 1, '#4e342e'], [10, 10, 1, 1, '#4e342e']] },
    { id: 'bowtie', name: 'Bow Tie', slot: 'face', price: 60, boxes: function () {
      return [B(0, 0.28, 0.27, 0.08, 0.08, 0.06, 0xb71c1c), B(-0.1, 0.28, 0.27, 0.12, 0.13, 0.05, 0xe53935), B(0.1, 0.28, 0.27, 0.12, 0.13, 0.05, 0xe53935)];
    }, px: [[4, 11, 2, 2, '#e53935'], [8, 11, 2, 2, '#e53935'], [6, 11, 2, 2, '#b71c1c']] },
    { id: 'partyhat', name: 'Party Hat', slot: 'head', price: 60, boxes: function () {
      return [B(0, 0.93, 0, 0.34, 0.08, 0.34, 0xff4fa0), B(0, 1.01, 0, 0.26, 0.08, 0.26, 0x4fc3f7), B(0, 1.09, 0, 0.18, 0.08, 0.18, 0xff4fa0),
        B(0, 1.17, 0, 0.1, 0.08, 0.1, 0x4fc3f7), B(0, 1.25, 0, 0.1, 0.1, 0.1, 0xffe14d)];
    }, px: [[6, 0, 2, 1, '#ffe14d'], [6, 1, 2, 1, '#4fc3f7'], [5, 2, 4, 1, '#ff4fa0'], [4, 3, 6, 1, '#4fc3f7'], [4, 4, 6, 1, '#ff4fa0']] },
    { id: 'cap', name: 'Red Cap', slot: 'head', price: 90, boxes: function () {
      return [B(0, 0.9, 0, 0.56, 0.12, 0.54, 0xe53935), B(0, 0.87, 0.33, 0.4, 0.04, 0.22, 0xb71c1c), B(0, 0.97, 0, 0.08, 0.05, 0.08, 0xb71c1c)];
    }, px: [[3, 3, 8, 2, '#e53935'], [4, 2, 6, 1, '#e53935'], [3, 5, 8, 1, '#b71c1c']] },
    { id: 'cowboy', name: 'Cowboy Hat', slot: 'head', price: 140, boxes: function () {
      return [B(0, 0.88, 0.02, 0.86, 0.05, 0.72, 0x8d5a2b), B(0, 1.0, 0, 0.42, 0.2, 0.4, 0xa0692f), B(0, 0.93, 0, 0.44, 0.05, 0.42, 0x4e342e), B(0, 1.12, 0, 0.34, 0.05, 0.32, 0x8d5a2b)];
    }, px: [[5, 1, 4, 2, '#a0692f'], [4, 3, 6, 1, '#4e342e'], [1, 4, 12, 1, '#8d5a2b']] },
    { id: 'wizard', name: 'Wizard Hat', slot: 'head', price: 180, boxes: function () {
      return [B(0, 0.88, 0.02, 0.72, 0.05, 0.66, 0x4527a0), B(0, 1.0, 0, 0.44, 0.2, 0.42, 0x5e35b1), B(0, 1.18, 0, 0.32, 0.18, 0.3, 0x5e35b1),
        B(0, 1.34, 0.02, 0.2, 0.16, 0.18, 0x673ab7), B(0.05, 1.48, 0.03, 0.1, 0.14, 0.1, 0x7e57c2), B(0, 0.93, 0, 0.46, 0.05, 0.44, 0xffd54f), B(0, 1.0, 0.22, 0.08, 0.08, 0.03, 0xffd54f)];
    }, px: [[7, 0, 2, 1, '#7e57c2'], [6, 1, 3, 1, '#673ab7'], [5, 2, 4, 1, '#5e35b1'], [4, 3, 6, 1, '#ffd54f'], [2, 4, 10, 1, '#4527a0'], [7, 2, 1, 1, '#ffd54f']] },
    { id: 'crown', name: 'Royal Crown', slot: 'head', price: 350, boxes: function () {
      var o = [B(0, 0.9, 0, 0.44, 0.1, 0.42, 0xffd54f), B(0, 0.99, 0.17, 0.08, 0.14, 0.08, 0xffd54f), B(0, 0.99, -0.17, 0.08, 0.14, 0.08, 0xffd54f), B(0, 0.9, 0.22, 0.07, 0.07, 0.03, 0xe53935)];
      [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { o.push(B(sx * 0.17, 0.99, sz * 0.16, 0.08, 0.1, 0.08, 0xffd54f)); }); });
      return o;
    }, px: [[4, 3, 6, 2, '#ffd54f'], [4, 2, 1, 1, '#ffd54f'], [6, 1, 2, 2, '#ffd54f'], [9, 2, 1, 1, '#ffd54f'], [6, 4, 2, 1, '#e53935']] }
  ];

  // ---------------------------------------------------------------- state
  var state = load();

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* fresh start */ }
    if (!s || !s.skins) s = { skins: ['classic'], outfits: [], skin: 'classic', head: null, face: null };
    return s;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function skinById(id) { return SKINS.filter(function (s) { return s.id === id; })[0] || SKINS[0]; }
  function outfitById(id) { return OUTFITS.filter(function (o) { return o.id === id; })[0] || null; }

  function hex(c) { return '#' + ('000000' + c.toString(16)).slice(-6); }
  function rect(x, y, w, h, fill) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"/>';
  }

  // Pixel preview of a look (defaults to what you are wearing now).
  function svg(look) {
    look = look || current();
    var s = look.skin;
    var out = '<svg viewBox="0 0 14 15" shape-rendering="crispEdges" aria-hidden="true">';
    out += rect(3, 14, 8, 1, 'rgba(0,0,0,.25)');
    out += rect(4, 12, 1, 2, hex(s.legs)) + rect(9, 12, 1, 2, hex(s.legs)) + rect(3, 13, 3, 1, hex(s.legs)) + rect(8, 13, 3, 1, hex(s.legs));
    out += rect(3, 5, 8, 8, hex(s.body)) + rect(3, 11, 8, 2, hex(s.shade));
    out += rect(2, 7, 1, 4, hex(s.wing)) + rect(11, 7, 1, 4, hex(s.wing));
    if (!look.head) out += rect(6, 3, 2, 1, hex(s.comb)) + rect(5, 4, 4, 1, hex(s.comb));
    out += rect(4, 6, 1, 2, hex(s.eye)) + rect(9, 6, 1, 2, hex(s.eye));
    out += rect(5, 8, 4, 2, hex(s.beak)) + rect(6, 10, 2, 1, hex(s.comb));
    [look.face, look.head].forEach(function (o) {
      if (o) o.px.forEach(function (r) { out += rect(r[0], r[1], r[2], r[3], r[4]); });
    });
    return out + '</svg>';
  }

  function current() {
    return { skin: skinById(state.skin), head: outfitById(state.head), face: outfitById(state.face) };
  }

  return {
    SKINS: SKINS,
    OUTFITS: OUTFITS,
    skinById: skinById,
    outfitById: outfitById,
    current: current,
    svg: svg,
    // 3D accessories for whatever is equipped
    outfitBoxes: function () {
      var look = current(), out = [];
      [look.face, look.head].forEach(function (o) { if (o) out = out.concat(o.boxes()); });
      return out;
    },
    owned: function (kind, id) {
      return kind === 'skin' ? state.skins.indexOf(id) >= 0 : state.outfits.indexOf(id) >= 0;
    },
    isEquipped: function (kind, id) {
      if (kind === 'skin') return state.skin === id;
      var o = outfitById(id);
      return !!o && state[o.slot] === id;
    },
    price: function (kind, id) {
      return (kind === 'skin' ? skinById(id) : outfitById(id)).price;
    },
    buy: function (kind, id) {
      if (this.owned(kind, id)) return;
      (kind === 'skin' ? state.skins : state.outfits).push(id);
      save();
    },
    // Skins: pick one. Outfits: one per slot; equipping the worn one takes it off.
    equip: function (kind, id) {
      if (!this.owned(kind, id)) return;
      if (kind === 'skin') state.skin = id;
      else {
        var o = outfitById(id);
        state[o.slot] = state[o.slot] === id ? null : id;
      }
      save();
    },
    ownedCount: function () { return state.skins.length + state.outfits.length; },
    totalCount: function () { return SKINS.length + OUTFITS.length; }
  };
})();
