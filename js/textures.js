// Procedural canvas textures for the lane surfaces. Lane dashes, rail
// sleepers, grass grain and water ripples are painted into small tileable
// textures shared by every row of that kind, so a lane is a single mesh.
var Textures = (function () {
  var textureCache = {};
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

  function waterTexture(base) {
    var tex = makeTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = hexCss(base);
      ctx.fillRect(0, 0, w, h);
      var r = rng(7 + (base & 255));
      ctx.fillStyle = shadeCss(base, 0.28);
      for (var i = 0; i < 7; i++) {
        var x = Math.floor(r() * 16) * 8, y = Math.floor(r() * 16) * 8;
        ctx.fillRect(x, y, 14 + Math.floor(r() * 4) * 6, 4);
      }
      ctx.fillStyle = shadeCss(base, -0.1);
      for (var j = 0; j < 5; j++) {
        ctx.fillRect(Math.floor(r() * 16) * 8, Math.floor(r() * 16) * 8, 10 + Math.floor(r() * 3) * 6, 3);
      }
    });
    waterTextures.push(tex);
    return tex;
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
  function getGroundMaterials(type, parity, edge) {
    var key = 'mat:' + type + ':' + parity + ':' + (edge ? 1 : 0);
    if (materialCache[key]) return materialCache[key];
    var C = CONFIG.COLORS;
    var tiles = CONFIG.GROUND_VISUAL_HALF * 2 + 1;
    var tex, side;
    if (type === CONFIG.ROW_TYPES.GRASS) {
      tex = grassTexture(parity ? C.grassA : C.grassB);
      tex.repeat.set(tiles, 1);
      side = C.grassSide;
    } else if (type === CONFIG.ROW_TYPES.ROAD) {
      tex = roadTexture(parity ? C.roadA : C.roadB, C.roadLine, edge);
      tex.repeat.set(tiles / 2, 1);
      side = C.roadSide;
    } else if (type === CONFIG.ROW_TYPES.WATER) {
      tex = waterTexture(parity ? C.waterA : C.waterB);
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
