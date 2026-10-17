// Procedural canvas textures for the lane surfaces. Lane dashes, rail
// sleepers, grass grain and water ripples are painted into small tileable
// textures shared by every row of that kind, so a lane is a single mesh.
// Every biome has its own palette (and may paint its own textures); a lane can also be a
// variant: frozen "ice", sticky "mud", a "beltL" / "beltR" conveyor or a "bounce" trampoline
// (all grass lanes), or a dark "void" (a water-type lane).
var Textures = (function () {
  var materialCache = {};
  var geometryCache = {};
  var waterTextures = [];

  function hexCss(hex) {
    return 'rgb(' + ((hex >> 16) & 255) + ',' + ((hex >> 8) & 255) + ',' + (hex & 255) + ')';
  }
  function shadeCss(hex, amt) { return hexCss(Utils.shade(hex, amt)); }

  // withGlow: also paint a second "glow" layer (black = dark, bright = shines by
  // itself); it becomes the emissive map of the lane material (neon lines, stars).
  function makeTexture(w, h, paint, withGlow) {
    var cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    var gcv = null, gctx = null;
    if (withGlow) {
      gcv = document.createElement('canvas');
      gcv.width = w;
      gcv.height = h;
      gctx = gcv.getContext('2d');
      gctx.fillStyle = '#000';
      gctx.fillRect(0, 0, w, h);
    }
    paint(cv.getContext('2d'), w, h, gctx);
    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    if (gcv) {
      var gt = new THREE.CanvasTexture(gcv);
      gt.wrapS = gt.wrapT = THREE.RepeatWrapping;
      tex.glowMap = gt;
    }
    return tex;
  }

  // Deterministic pseudo random so every grass row of a color has the same grain.
  function rng(seed) {
    var s = seed;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function speckle(ctx, w, h, base, count, seed, amt) {
    var r = rng(seed);
    for (var i = 0; i < count; i++) {
      ctx.fillStyle = shadeCss(base, (r() < 0.5 ? -1 : 1) * (amt * (0.5 + r() * 0.5)));
      var s = 2 + Math.floor(r() * 3);
      ctx.fillRect(Math.floor(r() * w / 2) * 2, Math.floor(r() * h / 2) * 2, s, s);
    }
  }

  function grassTexture(base) {
    return makeTexture(64, 64, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, base, 26, 11 + (base & 255), 0.07);
    });
  }

  function roadTexture(base, line, edge) {
    return makeTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, base, 50, 23 + (base & 255), 0.06);
      if (edge) {
        // dashed divider on the near edge of the lane (shared with the lane in front)
        ctx.fillStyle = hexCss(line);
        ctx.fillRect(10, 0, 60, 9);
      }
    });
  }

  function railTexture(base, sleeper) {
    return makeTexture(64, 64, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, base, 30, 31 + (base & 255), 0.1);
      // one sleeper per tile, spanning the track depth
      ctx.fillStyle = hexCss(sleeper);
      ctx.fillRect(18, 6, 28, 52);
      ctx.fillStyle = shadeCss(sleeper, -0.22);
      ctx.fillRect(18, 6, 5, 52);
    });
  }

  // accent: colour of the little glints / streaks
  function waterTexture(base, accent) {
    var tex = makeTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      var r = rng(7 + (base & 255));
      ctx.fillStyle = accent === undefined ? shadeCss(base, 0.28) : hexCss(accent);
      ctx.globalAlpha = accent === undefined ? 1 : 0.55;
      for (var i = 0; i < 7; i++) {
        var x = Math.floor(r() * 16) * 8, y = Math.floor(r() * 16) * 8;
        ctx.fillRect(x, y, 14 + Math.floor(r() * 4) * 6, 4);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = shadeCss(base, -0.1);
      for (var j = 0; j < 5; j++) {
        ctx.fillRect(Math.floor(r() * 16) * 8, Math.floor(r() * 16) * 8, 10 + Math.floor(r() * 3) * 6, 3);
      }
    });
    waterTextures.push(tex);
    return tex;
  }

  // frozen ground: pale glassy streaks and hairline cracks
  function iceTexture(base) {
    return makeTexture(64, 64, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      var r = rng(13 + (base & 255));
      ctx.fillStyle = shadeCss(base, 0.5);
      for (var i = 0; i < 4; i++) ctx.fillRect(Math.floor(r() * 12) * 4, Math.floor(r() * 16) * 4, 10 + Math.floor(r() * 4) * 4, 3);
      ctx.strokeStyle = shadeCss(base, -0.18);
      ctx.lineWidth = 1;
      for (var j = 0; j < 3; j++) {
        ctx.beginPath();
        var x = r() * w, y = r() * h;
        ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 22, y + (r() - 0.5) * 22); ctx.stroke();
      }
    });
  }


  // sticky mud: churned brown ground with a few glossy puddles
  function mudTexture(base, puddle) {
    return makeTexture(64, 64, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, base, 34, 17 + (base & 255), 0.14);
      var r = rng(29 + (base & 255));
      ctx.fillStyle = shadeCss(base, -0.2);
      for (var i = 0; i < 4; i++) ctx.fillRect(Math.floor(r() * 14) * 4, Math.floor(r() * 14) * 4, 8 + Math.floor(r() * 3) * 4, 6);
      ctx.fillStyle = hexCss(puddle);
      ctx.globalAlpha = 0.6;
      ctx.fillRect(Math.floor(r() * 9) * 4 + 4, Math.floor(r() * 12) * 4 + 4, 16, 8);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.45;
      ctx.fillRect(Math.floor(r() * 9) * 4 + 6, Math.floor(r() * 12) * 4 + 6, 6, 2);
      ctx.globalAlpha = 1;
    });
  }

  // conveyor belt: dark rubber with amber chevrons that point the way it carries you
  // (the tile is one world unit square). The texture scrolls, see update().
  var beltTextures = [];
  function beltTexture(base, arrow, dir) {
    var tex = makeTexture(64, 64, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, base, 16, 41 + (base & 255), 0.06);
      ctx.fillStyle = shadeCss(base, -0.18);                         // belt edges
      ctx.fillRect(0, 0, w, 6);
      ctx.fillRect(0, h - 6, w, 6);
      ctx.fillStyle = hexCss(arrow);                                 // a chevron pointing to +u
      ctx.beginPath();
      ctx.moveTo(14, 14); ctx.lineTo(34, 32); ctx.lineTo(14, 50); ctx.lineTo(24, 50); ctx.lineTo(44, 32); ctx.lineTo(24, 14);
      ctx.closePath(); ctx.fill();
    });
    tex.__beltDir = dir;
    beltTextures.push(tex);
    return tex;
  }

  // trampoline lane: a taut bouncy surface with a ring and a spring dot on every tile
  function bounceTexture(base, ring) {
    return makeTexture(64, 64, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = shadeCss(base, -0.14);
      ctx.fillRect(0, 0, w, 3); ctx.fillRect(0, h - 3, w, 3);
      ctx.strokeStyle = hexCss(ring);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 21, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = hexCss(ring);
      ctx.fillRect(w / 2 - 5, h / 2 - 5, 10, 10);
    });
  }

  function sideMat(color) {
    var key = 'side:' + color;
    if (!materialCache[key]) {
      var m = new THREE.MeshLambertMaterial({ color: color });
      m.__shared = true;
      materialCache[key] = m;
    }
    return materialCache[key];
  }

  function getGroundGeometry(type) {
    var key = 'geo:' + type;
    if (!geometryCache[key]) {
      var top = CONFIG.ROW_TOP[type];
      var height = top - CONFIG.ROW_BOTTOM;
      var geo = new THREE.BoxGeometry((CONFIG.GROUND_VISUAL_HALF * 2 + 1) * CONFIG.TILE, height, CONFIG.TILE);
      // Two draw calls instead of six: the five side faces share one material, the top
      // face (the only one you really see) has its own. Reorder the index buffer so the
      // top comes last, then describe the two ranges as groups.
      var idx = geo.index.array, out = new idx.constructor(idx.length), o = 0, k;
      [0, 1, 3, 4, 5, 2].forEach(function (face) { for (k = 0; k < 6; k++) out[o++] = idx[face * 6 + k]; });
      geo.setIndex(new THREE.BufferAttribute(out, 1));
      geo.clearGroups();
      geo.addGroup(0, 30, 0);
      geo.addGroup(30, 6, 1);
      geo.__shared = true;
      geometryCache[key] = geo;
    }
    return geometryCache[key];
  }

  // Helpers a biome theme can use to paint its own lane textures.
  var kit = {
    makeTexture: makeTexture, rng: rng, speckle: speckle, hexCss: hexCss, shadeCss: shadeCss,
    addWater: function (tex) { waterTextures.push(tex); return tex; }   // drifts like a river surface
  };

  // The ground uses two materials: [sides, top] (see getGroundGeometry).
  // variant: undefined | 'ice' | 'mud' | 'beltL' | 'beltR' | 'bounce' (on a grass lane) | 'void' (on a water-type lane)
  // A biome theme may supply its own ground (theme.ground); returning null falls
  // back to the normal textures below.
  function getGroundMaterials(type, parity, edge, biome, variant) {
    biome = biome || 'forest';
    var key = 'mat:' + biome + ':' + type + ':' + parity + ':' + (edge ? 1 : 0) + ':' + (variant || '');
    if (materialCache[key]) return materialCache[key];
    var C = Biome.colors(biome);
    var tiles = CONFIG.GROUND_VISUAL_HALF * 2 + 1;
    var tex, side;
    var T = Biome.theme(biome);
    var P = function (k) { return C[k] !== undefined ? C[k] : CONFIG.BIOME_COLORS.forest[k]; };   // (a theme only needs to paint what it changes)
    var custom = T.ground ? T.ground(kit, type, parity, edge, variant, tiles, C) : null;
    if (custom) {
      tex = custom.tex;
      side = custom.side;
    } else if (type === CONFIG.ROW_TYPES.GRASS && variant === 'ice') {
      tex = iceTexture(parity ? C.iceA : C.iceB);
      tex.repeat.set(tiles, 1);
      side = C.iceSide;
    } else if (type === CONFIG.ROW_TYPES.GRASS && variant === 'mud') {
      tex = mudTexture(parity ? P('mudA') : P('mudB'), P('mudPuddle'));
      tex.repeat.set(tiles, 1);
      side = P('mudSide');
    } else if (type === CONFIG.ROW_TYPES.GRASS && (variant === 'beltL' || variant === 'beltR')) {
      tex = beltTexture(parity ? P('beltA') : P('beltB'), P('beltArrow'), variant === 'beltR' ? 1 : -1);
      tex.repeat.set(tiles, 1);
      side = P('beltSide');
    } else if (type === CONFIG.ROW_TYPES.GRASS && variant === 'bounce') {
      tex = bounceTexture(parity ? P('bounceA') : P('bounceB'), P('bounceRing'));
      tex.repeat.set(tiles, 1);
      side = P('bounceSide');
    } else if (type === CONFIG.ROW_TYPES.GRASS) {
      tex = grassTexture(parity ? C.grassA : C.grassB);
      tex.repeat.set(tiles, 1);
      side = C.grassSide;
    } else if (type === CONFIG.ROW_TYPES.ROAD) {
      tex = roadTexture(parity ? C.roadA : C.roadB, C.roadLine, edge);
      tex.repeat.set(tiles / 2, 1);
      side = C.roadSide;
    } else if (type === CONFIG.ROW_TYPES.WATER && variant === 'void') {
      tex = waterTexture(parity ? C.voidA : C.voidB, C.voidAccent);
      tex.repeat.set(tiles / 2, 1);
      side = C.voidSide;
    } else if (type === CONFIG.ROW_TYPES.WATER) {
      tex = waterTexture(parity ? C.waterA : C.waterB);
      tex.repeat.set(tiles / 2, 1);
      side = C.waterSide;
    } else {
      tex = railTexture(parity ? C.railBedA : C.railBedB, C.sleeper);
      tex.repeat.set(tiles, 1);
      side = C.railSide;
    }
    // a texture with a glow layer shines by itself (neon lines, stars)
    var top = tex.glowMap
      ? new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex.glowMap })
      : new THREE.MeshLambertMaterial({ map: tex });
    top.__shared = true;
    var s = sideMat(side);
    var set = [s, top];
    materialCache[key] = set;
    return set;
  }

  // Slow drift on the river surface (shared textures, so one write per frame).
  function update(t) {
    for (var i = 0; i < waterTextures.length; i++) {
      waterTextures[i].offset.x = (t * 0.015) % 1;
    }
    // conveyor chevrons slide the way the belt carries you (one tile = one texture)
    for (var j = 0; j < beltTextures.length; j++) {
      beltTextures[j].offset.x = (-beltTextures[j].__beltDir * t * CONFIG.BELT_SPEED) % 1;
    }
  }

  return {
    getGroundGeometry: getGroundGeometry,
    getGroundMaterials: getGroundMaterials,
    update: update,
    kit: kit
  };
})();
