// Procedural canvas textures for the lane surfaces. Lane dashes, rail
// sleepers, grass grain and water ripples are painted into small tileable
// textures shared by every row of that kind, so a lane is a single mesh.
// Every biome has its own palette (and may paint its own textures); a lane can also be a
// variant: frozen "ice" (a grass lane) or a dark "void" (a water-type lane).
var Textures = (function () {
  var materialCache = {};
  var geometryCache = {};
  var waterTextures = [];
  var glowMaterials = [];   // lane materials with a glow layer (themes can animate them)

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
      geo.__shared = true;
      geometryCache[key] = geo;
    }
    return geometryCache[key];
  }

  // BoxGeometry material order: +x, -x, +y, -y, +z, -z
  // variant: undefined | 'ice' (on a grass lane) | 'void' (on a water-type lane)
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
    var custom = T.ground ? T.ground(kit, type, parity, edge, variant, tiles, C) : null;
    if (custom) {
      tex = custom.tex;
      side = custom.side;
    } else if (type === CONFIG.ROW_TYPES.GRASS && variant === 'ice') {
      tex = iceTexture(parity ? C.iceA : C.iceB);
      tex.repeat.set(tiles, 1);
      side = C.iceSide;
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
    if (tex.glowMap) glowMaterials.push(top);
    var s = sideMat(side);
    var set = [s, s, top, s, s, s];
    materialCache[key] = set;
    return set;
  }

  // Slow drift on the river surface (shared textures, so one write per frame).
  function update(t) {
    for (var i = 0; i < waterTextures.length; i++) {
      waterTextures[i].offset.x = (t * 0.015) % 1;
    }
  }

  // Helpers a biome theme can use to paint its own lane textures.
  var kit = {
    makeTexture: makeTexture, rng: rng, speckle: speckle, hexCss: hexCss, shadeCss: shadeCss,
    addWater: function (tex) { waterTextures.push(tex); return tex; }   // drifts like a river surface
  };

  return {
    getGroundGeometry: getGroundGeometry,
    getGroundMaterials: getGroundMaterials,
    update: update,
    kit: kit,
    glowMaterials: glowMaterials
  };
})();
