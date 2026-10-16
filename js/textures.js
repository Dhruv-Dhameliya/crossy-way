// Procedural canvas textures for the lane surfaces. Lane dashes, rail
// sleepers, grass grain and water ripples are painted into small tileable
// textures shared by every row of that kind, so a lane is a single mesh.
// Every biome (forest, space...) has its own palette; a lane can also be a
// variant: frozen "ice" (a grass lane) or a dark "void" (a water-type lane).
var Textures = (function () {
  var materialCache = {};
  var geometryCache = {};
  var waterTextures = [];

  function hexCss(hex) {
    return 'rgb(' + ((hex >> 16) & 255) + ',' + ((hex >> 8) & 255) + ',' + (hex & 255) + ')';
  }
  function shadeCss(hex, amt) { return hexCss(Utils.shade(hex, amt)); }

  function makeTexture(w, h, paint) {
    var cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    paint(cv.getContext('2d'), w, h);
    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
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

  // Tiny stars. A texel is twice as wide as it is tall once stretched over the
  // lane, so each star is drawn s wide and 2s tall to come out square.
  function stars(ctx, w, h, seed, count, alpha) {
    var r = rng(seed);
    for (var i = 0; i < count; i++) {
      var s = r() < 0.12 ? 3 : r() < 0.4 ? 2 : 1;
      var warm = r();
      ctx.fillStyle = warm < 0.18 ? 'rgba(143,244,255,' : warm < 0.3 ? 'rgba(255,190,240,' : 'rgba(255,255,255,';
      ctx.fillStyle += (alpha * (0.45 + r() * 0.55)).toFixed(2) + ')';
      ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), s, s * 2);
    }
  }

  // Empty space instead of a river: deep blue-black, nebula haze, drifting stars.
  function spaceVoidTexture(base) {
    var tex = makeTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      var r = rng(41 + (base & 255));
      for (var i = 0; i < 3; i++) {                       // nebula wisps
        var cx = r() * w, cy = r() * h, rad = 30 + r() * 30;
        var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
        var col = i % 2 ? '120,70,230' : '40,120,220';
        g.addColorStop(0, 'rgba(' + col + ',0.22)');
        g.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      stars(ctx, w, h, 77 + (base & 255), 46, 0.95);
      // a couple of bright twinkles
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (var k = 0; k < 2; k++) {
        var sx = Math.floor(r() * (w - 8)) + 4, sy = Math.floor(r() * (h - 8)) + 4;
        ctx.fillRect(sx - 3, sy, 7, 2);
        ctx.fillRect(sx, sy - 3, 2, 7);
      }
    });
    waterTextures.push(tex);
    return tex;
  }

  // The chasm lane in space: a black hole's glowing accretion swirl.
  function blackHoleTexture(base, accent) {
    var tex = makeTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = hexCss(accent);
      ctx.lineWidth = 3;
      for (var i = 0; i < 4; i++) {
        ctx.globalAlpha = 0.5 - i * 0.1;
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, 54 - i * 12, 26 - i * 5, 0, 0.4 + i, 4.6 + i);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      stars(ctx, w, h, 5 + (base & 255), 14, 0.7);
    });
    waterTextures.push(tex);
    return tex;
  }

  // moon = true: add little craters
  function grassTexture(base, moon) {
    return makeTexture(64, 64, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, base, 26, 11 + (base & 255), 0.07);
      if (moon) {
        var r = rng(5 + (base & 255));
        for (var i = 0; i < 3; i++) {
          var cx = 8 + r() * 48, cy = 8 + r() * 48, rad = 3 + r() * 4;
          ctx.fillStyle = shadeCss(base, -0.16);
          ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = shadeCss(base, 0.1);
          ctx.beginPath(); ctx.arc(cx - 1, cy - 1, rad * 0.6, 0, Math.PI * 2); ctx.fill();
        }
      }
    });
  }

  // tech = true: panel seams like a space-station road
  function roadTexture(base, line, edge, tech) {
    return makeTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      if (tech) {
        // a glass walkway: the stars shine through, with a faint panel grid
        stars(ctx, w, h, 22 + (base & 255), 34, 0.55);
        ctx.fillStyle = 'rgba(120,220,255,0.16)';
        ctx.fillRect(0, 62, w, 2);
        ctx.fillRect(63, 0, 2, h);
        ctx.fillStyle = 'rgba(120,220,255,0.07)';
        ctx.fillRect(0, 0, w, h / 2);
      } else {
        speckle(ctx, w, h, base, 50, 23 + (base & 255), 0.06);
      }
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
  function getGroundMaterials(type, parity, edge, biome, variant) {
    biome = biome || 'forest';
    var key = 'mat:' + biome + ':' + type + ':' + parity + ':' + (edge ? 1 : 0) + ':' + (variant || '');
    if (materialCache[key]) return materialCache[key];
    var C = Biome.colors(biome);
    var space = biome === 'space';
    var tiles = CONFIG.GROUND_VISUAL_HALF * 2 + 1;
    var tex, side;
    if (type === CONFIG.ROW_TYPES.GRASS && variant === 'ice') {
      tex = iceTexture(parity ? C.iceA : C.iceB);
      tex.repeat.set(tiles, 1);
      side = C.iceSide;
    } else if (type === CONFIG.ROW_TYPES.GRASS) {
      tex = grassTexture(parity ? C.grassA : C.grassB, space);
      tex.repeat.set(tiles, 1);
      side = C.grassSide;
    } else if (type === CONFIG.ROW_TYPES.ROAD) {
      tex = roadTexture(parity ? C.roadA : C.roadB, C.roadLine, edge, space);
      tex.repeat.set(tiles / 2, 1);
      side = C.roadSide;
    } else if (type === CONFIG.ROW_TYPES.WATER && variant === 'void') {
      tex = space ? blackHoleTexture(parity ? C.voidA : C.voidB, C.voidAccent) : waterTexture(parity ? C.voidA : C.voidB, C.voidAccent);
      tex.repeat.set(tiles / 2, 1);
      side = C.voidSide;
    } else if (type === CONFIG.ROW_TYPES.WATER) {
      tex = space ? spaceVoidTexture(parity ? C.waterA : C.waterB) : waterTexture(parity ? C.waterA : C.waterB);
      tex.repeat.set(tiles / 2, 1);
      side = C.waterSide;
    } else {
      tex = railTexture(parity ? C.railBedA : C.railBedB, C.sleeper);
      tex.repeat.set(tiles, 1);
      side = C.railSide;
    }
    var top = new THREE.MeshLambertMaterial({ map: tex });
    top.__shared = true;
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

  return {
    getGroundGeometry: getGroundGeometry,
    getGroundMaterials: getGroundMaterials,
    update: update
  };
})();
