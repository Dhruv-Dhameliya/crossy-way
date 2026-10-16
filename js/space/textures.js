// Space ground textures: a neon tech floor, a glowing light-bridge, a starfield void
// and a black hole. Painted with the helpers the shared Textures module offers.
var SpaceTextures = (function () {
  var kit = Textures.kit;

  // Tiny stars. A texel is twice as wide as it is tall once stretched over the
  // lane, so each star is drawn s wide and 2s tall to come out square. gctx is the
  // glow layer (what shines by itself); stars are drawn there too.
  function stars(ctx, w, h, seed, count, alpha, gctx) {
    var r = kit.rng(seed);
    for (var i = 0; i < count; i++) {
      var s = r() < 0.12 ? 3 : r() < 0.4 ? 2 : 1;
      var warm = r();
      var rgb = warm < 0.15 ? '190,210,255' : warm < 0.25 ? '255,225,200' : '255,255,255';
      var col = 'rgba(' + rgb + ',' + (alpha * (0.45 + r() * 0.55)).toFixed(2) + ')';
      var x = Math.floor(r() * w), y = Math.floor(r() * h);
      ctx.fillStyle = col;
      ctx.fillRect(x, y, s, s * 2);
      if (gctx) { gctx.fillStyle = col; gctx.fillRect(x, y, s, s * 2); }
    }
  }

  // Dark metal deck plates with faint seams: the "grass" of space.
  function techGroundTexture(base, seam) {
    return kit.makeTexture(64, 64, function (ctx, w, h) {
      ctx.fillStyle = kit.hexCss(base);
      ctx.fillRect(0, 0, w, h);
      kit.speckle(ctx, w, h, base, 24, 11 + (base & 255), 0.1);
      ctx.fillStyle = kit.hexCss(seam);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, 0, 2, h);
      ctx.fillRect(0, 0, w, 2);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(0, 0, 4, 4);                                      // rivet
      ctx.globalAlpha = 1;
    });
  }

  // Space has no roads: ships fly past a steel walkway.
  function energyBridgeTexture(base, line) {
    return kit.makeTexture(128, 128, function (ctx, w, h) {
      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, kit.hexCss(Utils.shade(base, 0.08)));
      grad.addColorStop(1, kit.hexCss(base));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      kit.speckle(ctx, w, h, base, 40, 19 + (base & 255), 0.08);
      ctx.fillStyle = 'rgba(190,200,225,0.10)';
      for (var x = 0; x < w; x += 32) ctx.fillRect(x, 0, 2, h);
      ctx.fillStyle = kit.hexCss(line);                              // thin edge lines
      ctx.globalAlpha = 0.7;
      ctx.fillRect(0, 0, w, 3);
      ctx.fillRect(0, h - 3, w, 3);
      ctx.globalAlpha = 1;
    });
  }

  // The lane a comet streaks across: scorched ground with a glowing dashed orbit path.
  function cometLaneTexture(base, accent) {
    return kit.makeTexture(64, 64, function (ctx, w, h, g) {
      ctx.fillStyle = kit.hexCss(base);
      ctx.fillRect(0, 0, w, h);
      kit.speckle(ctx, w, h, base, 30, 31 + (base & 255), 0.14);
      stars(ctx, w, h, 8 + (base & 255), 6, 0.4);
      var col = kit.hexCss(accent);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.7;
      for (var x = 4; x < w; x += 32) ctx.fillRect(x, 28, 14, 4);
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, 0, w, 3);                                       // hazard edge lines
      ctx.fillRect(0, h - 3, w, 3);
      ctx.globalAlpha = 1;
    }, true);
  }

  // Empty space instead of a river: deep blue-black, neon nebula haze, shining stars.
  function spaceVoidTexture(base) {
    var tex = kit.makeTexture(128, 128, function (ctx, w, h, g) {
      ctx.fillStyle = kit.hexCss(base);
      ctx.fillRect(0, 0, w, h);
      var r = kit.rng(41 + (base & 255));
      var cols = ['110,80,170', '60,100,170', '90,70,150'];
      for (var i = 0; i < 3; i++) {                       // nebula wisps
        var cx = r() * w, cy = r() * h, rad = 30 + r() * 30;
        var gr = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
        gr.addColorStop(0, 'rgba(' + cols[i] + ',0.2)');
        gr.addColorStop(1, 'rgba(' + cols[i] + ',0)');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, w, h);
        var gg = g.createRadialGradient(cx, cy, 2, cx, cy, rad);
        gg.addColorStop(0, 'rgba(' + cols[i] + ',0.08)');
        gg.addColorStop(1, 'rgba(' + cols[i] + ',0)');
        g.fillStyle = gg;
        g.fillRect(0, 0, w, h);
      }
      stars(ctx, w, h, 77 + (base & 255), 46, 0.95, g);
      ctx.fillStyle = g.fillStyle = 'rgba(255,255,255,0.95)';
      for (var k = 0; k < 2; k++) {                       // bright twinkles
        var sx = Math.floor(r() * (w - 8)) + 4, sy = Math.floor(r() * (h - 8)) + 4;
        ctx.fillRect(sx - 3, sy, 7, 2); ctx.fillRect(sx, sy - 3, 2, 7);
        g.fillRect(sx - 3, sy, 7, 2); g.fillRect(sx, sy - 3, 2, 7);
      }
    }, true);
    kit.addWater(tex);
    return tex;
  }

  // The chasm lane in space: a black hole's glowing accretion swirl.
  function blackHoleTexture(base, accent) {
    var tex = kit.makeTexture(128, 128, function (ctx, w, h, g) {
      ctx.fillStyle = kit.hexCss(base);
      ctx.fillRect(0, 0, w, h);
      var col = kit.hexCss(accent);
      ctx.strokeStyle = col; g.strokeStyle = col;
      ctx.lineWidth = g.lineWidth = 3;
      for (var i = 0; i < 4; i++) {
        ctx.globalAlpha = g.globalAlpha = 0.6 - i * 0.12;
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, 54 - i * 12, 26 - i * 5, 0, 0.4 + i, 4.6 + i);
        ctx.stroke();
        g.beginPath();
        g.ellipse(w / 2, h / 2, 54 - i * 12, 26 - i * 5, 0, 0.4 + i, 4.6 + i);
        g.stroke();
      }
      ctx.globalAlpha = g.globalAlpha = 1;
      stars(ctx, w, h, 5 + (base & 255), 14, 0.7, g);
    }, true);
    kit.addWater(tex);
    return tex;
  }

  // theme.ground hook: which texture a lane gets in space. Ice uses the shared ice texture.
  var cache = {};
  function ground(_kit, type, parity, edge, variant, tiles, C) {
    var key = type + ':' + parity + ':' + (variant || '');       // (the divider flag `edge` doesn't change the look here)
    if (cache[key] !== undefined) return cache[key];
    return (cache[key] = build(type, parity, variant, tiles, C));
  }

  function build(type, parity, variant, tiles, C) {
    var T = CONFIG.ROW_TYPES, tex, side;
    if (type === T.GRASS && variant === 'ice') return null;
    if (type === T.GRASS) { tex = techGroundTexture(parity ? C.grassA : C.grassB, parity ? C.neonA : C.neonB); tex.repeat.set(tiles, 1); side = C.grassSide; }
    else if (type === T.ROAD) { tex = energyBridgeTexture(parity ? C.roadA : C.roadB, C.roadLine); tex.repeat.set(tiles / 2, 1); side = C.roadSide; }
    else if (type === T.WATER && variant === 'void') { tex = blackHoleTexture(parity ? C.voidA : C.voidB, C.voidAccent); tex.repeat.set(tiles / 2, 1); side = C.voidSide; }
    else if (type === T.WATER) { tex = spaceVoidTexture(parity ? C.waterA : C.waterB); tex.repeat.set(tiles / 2, 1); side = C.waterSide; }
    else { tex = cometLaneTexture(parity ? C.railBedA : C.railBedB, C.sleeper); tex.repeat.set(tiles, 1); side = C.railSide; }
    return { tex: tex, side: side };
  }

  return { ground: ground };
})();
