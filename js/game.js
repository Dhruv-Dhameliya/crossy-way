// Scene/camera setup, input, scoring (combos), power-ups, run modifiers, shop, missions,
// rare events, weather, music, adaptive quality, game loop and UI.
(function () {
  // localStorage can throw (blocked site data, private mode, full): never let that stop the game.
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  var scene, camera, renderer, clock;
  var world, player;
  var state = 'start'; // start | playing | gameover
  var totalCoins = parseInt(lsGet(CONFIG.COINS_KEY) || '0', 10) || 0;
  var bestScore = readBest();

  var backdrop, ambientLight, sunLight;
  var cameraLean = lsGet(CONFIG.LEAN_KEY) || 'right';
  var settingsOpen = false;     // true while ANY modal (settings / shop / missions) is open
  var modalEl = null;
  var panelHiddenForModal = null;

  // camera rig: camX/camZ is the point the camera looks at; it simply follows
  // the chicken so the chicken stays near the middle of the screen.
  var camX = 0, camZ = CONFIG.CAMERA_LEAD;
  var shopTab = 'skin';
  var runTrophies = [];       // trophies unlocked during the current run (shown on the game-over card)
  var wasThemeMood = false;  // the music was playing a biome's own mood a moment ago
  var gameOverAt = 0;     // when the last run ended (a held key must not skip the game-over card)
  var idleTimer = 0;      // seconds since the chicken last reached a new row
  var shakeT = 0;
  var eagleCried = false;   // the eagle's screech has been played for this idle spell
  var curBiome = 'forest';  // biome of the row the chicken stands on (sky, helmet, music follow it)
  var shareBlob = null, shareUrl = null, shareReq = 0;
  var bdMix = -1, bdColor = new THREE.Color();   // backdrop colour follows the active biome theme
  var camKick = 0;          // little camera dip on every landing
  var tmpV = new THREE.Vector3();
  var startCam = { x: 0, z: CONFIG.CAMERA_LEAD }; // title-screen view (chicken parked in free screen space)

  var powers = {};        // active power-ups: type -> { left, total, pill }
  var magnetPos = { x: 0, y: 0, z: 0 };

  // scoring: every new row is worth the combo multiplier; close calls add bonus points
  var score = 0;
  var scoreRaw = 0;       // score before rounding (a modifier can multiply points by a fraction)
  var runTime = 0;        // seconds the chicken has been alive in this run (for the Stats page)
  var lastDeath = null;   // how the last run ended
  var COMBO_WINDOW = 0.85; // seconds allowed between new rows to keep a combo alive
  var combo = { count: 0, mult: 1, timer: 0 };
  var runStats = { coins: 0, near: 0, maxMult: 1, maxCombo: 0 };
  var lastRow = 0;
  var lastComboCount = -1;
  var wxTimer = 0;
  var swipeStyle = lsGet(CONFIG.SWIPE_KEY) || 'cam'; // 'cam' = follow the camera, 'classic'
  var dpadOn = false;

  var IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  var el = {};
  ['score', 'coins', 'bestScore', 'powerups', 'toast', 'flash', 'freezeFx', 'startPanel', 'modeBtn', 'infoBtn', 'infoPanel', 'closeInfoBtn', 'diffNote', 'bestMode', 'goMode', 'goBest', 'goCoins', 'goCombo', 'goNear', 'goTitle', 'homeBtn',
    'playBtn', 'gameOverPanel', 'finalScore', 'confetti',
    'restartBtn', 'shareBtn', 'fullscreenBtn', 'settingsBtn', 'pauseBtn', 'settingsPanel', 'closeSettingsBtn', 'dpad',
    'startHint', 'combo', 'comboMult', 'comboCount', 'comboBar', 'pops', 'wxBadge', 'heroChick',
    'startShopBtn', 'startMissionsBtn', 'missionDot',
    'shopPanel', 'shopCoins', 'shopPreview', 'shopLook', 'shopGrid', 'shopHint', 'closeShopBtn',
    'mutBtn', 'mutPanel', 'mutBody', 'closeMutBtn',
    'chestBtn', 'chestReveal', 'trophiesPanel', 'trophiesBody', 'trophyCount', 'trophyBar', 'closeTrophiesBtn', 'startTrophiesBtn', 'trophyDot', 'goTrophies', 'ttTitle', 'trophyPane', 'statsPane', 'statsBody',
    'sharePanel', 'shareImg', 'shareNativeBtn', 'shareSaveBtn', 'shareCopyBtn', 'closeShareBtn',
    'missionsPanel', 'missionsBody', 'closeMissionsBtn', 'musicSlider', 'musicPct', 'dpadSizeSlider', 'dpadSizePct', 'dpadSizeReset']
    .forEach(function (id) { el[id] = document.getElementById(id); });
  el.leanButtons = document.querySelectorAll('.lean-btn');
  el.fontButtons = document.querySelectorAll('.font-btn');
  el.soundButtons = document.querySelectorAll('.sound-btn');
  el.qualityButtons = document.querySelectorAll('.quality-btn');
  el.todButtons = document.querySelectorAll('.tod-btn');
  el.wxButtons = document.querySelectorAll('.wx-btn');
  el.biomeButtons = document.querySelectorAll('.biome-btn');
  el.shopTabs = document.querySelectorAll('.shop-tab');
  el.ttTabs = document.querySelectorAll('.tt-tab');
  el.dpadButtons = document.querySelectorAll('.dpad-btn');
  el.dpadOptButtons = document.querySelectorAll('.dpad-opt');
  el.diffButtons = document.querySelectorAll('.diff-btn');
  el.dswapButtons = document.querySelectorAll('.dswap-btn');
  el.swipeButtons = document.querySelectorAll('.swipe-btn');
  el.setTabs = document.querySelectorAll('.set-tab');
  el.setSecs = document.querySelectorAll('.set-sec');

  function vibrate(ms) {
    if (navigator.vibrate && GameAudio.isEnabled()) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }
  }

  function unlockAudio() {
    GameAudio.unlock();
    Music.start();
  }

  // ===================================================================
  // Adaptive quality: pick a sensible level for the device, then keep an
  // eye on the frame rate and trade resolution / shadows for smoothness.
  // ===================================================================
  var LEVELS = ['low', 'medium', 'high'];
  var quality = { mode: lsGet(CONFIG.QUALITY_KEY) || 'auto', level: 'high', scale: 1 };
  var fps = { acc: 0, n: 0, warm: 0, cooldown: 0 };

  function currentLevel() { return quality.mode === 'auto' ? quality.level : quality.mode; }

  function detectLevel() {
    var small = Math.min(window.innerWidth, window.innerHeight) < 600;
    var mobile = IS_TOUCH || small || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    var weak = (navigator.deviceMemory && navigator.deviceMemory <= 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    if (!mobile) return weak ? 'medium' : 'high';
    return weak ? 'low' : 'medium';
  }

  function applyQuality() {
    var level = currentLevel();
    var dpr = window.devicePixelRatio || 1;
    var cap = { low: 1.25, medium: 1.75, high: 2 }[level];
    renderer.setPixelRatio(Math.max(0.6, Math.min(dpr, cap) * quality.scale));
    sunLight.castShadow = level !== 'low';
    var size = level === 'high' ? 2048 : 1024;
    if (sunLight.shadow.mapSize.x !== size) {
      sunLight.shadow.mapSize.set(size, size);
      if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; }
    }
    el.qualityButtons.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-quality') === quality.mode); });
  }

  // Called every frame with the real frame time.
  function governFps(rawDt) {
    if (quality.mode !== 'auto' || rawDt > 0.3) return; // ignore tab switches / hitches
    fps.warm += rawDt;
    if (fps.warm < 3) return; // shader compiles and first rows skew the first seconds
    fps.acc += rawDt;
    fps.n++;
    if (fps.acc < 1.5) return;
    var avg = fps.n / fps.acc;
    fps.acc = 0; fps.n = 0;
    if (fps.cooldown > 0) { fps.cooldown--; return; }
    if (avg < 40) {
      var i = LEVELS.indexOf(quality.level);
      if (i > 0) quality.level = LEVELS[i - 1];
      else if (quality.scale > 0.7) quality.scale = Math.max(0.7, quality.scale - 0.15);
      else return;
      applyQuality();
      fps.cooldown = 1;
    }
  }

  // ===================================================================
  function applyCameraLean(lean) {
    cameraLean = lean;
    CONFIG.CAMERA_OFFSET.x = (lean === 'right' ? -1 : 1) * CONFIG.CAMERA_OFFSET_X_MAGNITUDE;
    lsSet(CONFIG.LEAN_KEY, lean);
    if (camera) {
      camera.position.set(camX + CONFIG.CAMERA_OFFSET.x, CONFIG.CAMERA_OFFSET.y, camZ + CONFIG.CAMERA_OFFSET.z);
      camera.lookAt(camX, 0, camZ);
    }
    el.leanButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lean') === lean);
    });
    if (camera) { computeStartCam(); if (state === 'start') snapToStart(); }
  }

  // The welcome overlay covers the middle of the screen, so on the title
  // screen we look at the world from an offset that parks the chicken in the
  // free area (bottom-right on wide screens, bottom-centre on phones).
  function computeStartCam() {
    camera.updateMatrixWorld(true);
    var e = camera.matrixWorld.elements; // right = col 0, up = col 1
    var Rx = e[0], Rz = e[2], Ux = e[4], Uz = e[6];
    var aspect = window.innerWidth / window.innerHeight;
    var ndc = aspect < 0.9 ? { x: 0, y: -0.78 } : { x: 0.7, y: -0.42 };
    var sx = ndc.x * camera.right, sy = ndc.y * camera.top;
    var det = Rx * Uz - Rz * Ux;
    startCam.x = (-sx * Uz + Rz * sy) / det;
    startCam.z = (Rx * -sy - Ux * -sx) / det;
  }

  function snapToStart() {
    camX = startCam.x;
    camZ = startCam.z;
  }

  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.COLORS.sky);
    scene.fog = new THREE.Fog(CONFIG.COLORS.sky, 30, 56);

    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
    scene.add(camera);
    applyFrustum();
    applyCameraLean(cameraLean);
    snapToStart();

    backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.grassB })
    );
    backdrop.rotation.x = -Math.PI / 2;
    backdrop.position.y = CONFIG.ROW_BOTTOM - 0.02;
    scene.add(backdrop);

    quality.level = detectLevel();
    var dpr = window.devicePixelRatio || 1;
    renderer = new THREE.WebGLRenderer({
      antialias: dpr < 1.5 || (dpr < 2 && quality.level === 'high'),
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    ambientLight = new THREE.HemisphereLight(0xffffff, 0x9aa87a, 0.7);
    scene.add(ambientLight);
    sunLight = new THREE.DirectionalLight(0xfff6e0, 0.62);
    sunLight.castShadow = true;
    var sc = sunLight.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22;
    sc.near = 1; sc.far = 70;
    sunLight.shadow.bias = -0.0006;
    scene.add(sunLight);
    scene.add(sunLight.target);
    applyQuality();

    Weather.init(scene, ambientLight, sunLight);
    Weather.setModes(lsGet(CONFIG.TOD_KEY) || 'auto', lsGet(CONFIG.WEATHER_KEY) || 'auto');
    Weather.reset(true);

    Achievements.init({ onUnlock: onTrophy });
    Stats.init();
    syncShopTrophies();
    GameAudio.setHopPack(Cosmetics.eqId('hsound'));
    Missions.init({
      onReward: function (n) { giveCoins(n); },
      onComplete: onMissionComplete
    });

    Particles.init(scene);
    Flair.init(scene);
    Events.init(scene);
    world = new World(scene);
    hookWorld();
    player = new Player(scene);
    player.onCoin = function () { addCoins(1); };
    player.onItem = onItemCollected;
    player.onCrate = onCrate;
    player.onBounce = function () {
      Achievements.event('bounces', 1);
      Stats.bump('lanes', 'bounces');
      popText('BOING!', '#ff6fd8');
      vibrate(20);
    };
    player.onDeath = onPlayerDeath;
    player.onLand = function () { camKick = 0.05; Achievements.event('hops', 1); Stats.add('hops'); };
    player.onEagleGrab = function () {
      shakeT = 0.4; vibrate([30, 40, 60]);
      el.flash.classList.remove('on'); void el.flash.offsetWidth; el.flash.classList.add('on');
    };
    player.onShieldPop = function () {
      GameAudio.pop();
      vibrate(30);
      endPower('shield', true);
      showToast('🛡️ SHIELD BROKE!', '#3d8bff');
    };

    world.update(0, camZ, 0);
    updateCamera(0, true);

    // Compile every shader now (including ones only needed later, like power-up
    // badges and the eagle) so nothing hitches mid-run.
    var warm = Models.buildWarmGroup();
    scene.add(warm);
    renderer.compile(scene, camera);
    scene.remove(warm);

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () { setTimeout(onResize, 200); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state === 'playing' && !settingsOpen) openModal(el.settingsPanel);
      if (document.hidden) { Missions.runEnd(); Achievements.flush(); Stats.flush(); }
      clock.getDelta();
    });
    window.addEventListener('pagehide', function () { Achievements.flush(); Stats.flush(); });
    window.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    setupInput();
    applyTitleFont(lsGet(CONFIG.FONT_KEY) || 'bold');
    applySound((lsGet(CONFIG.SOUND_KEY) || 'on') !== 'off');
    applyDpad(lsGet(CONFIG.DPAD_KEY) === 'on');
    applyDpadSwap(lsGet(CONFIG.DPAD_SWAP_KEY) === 'on');
    var savedSize = parseInt(lsGet(CONFIG.DPAD_SIZE_KEY), 10);
    applyDpadSize(isNaN(savedSize) ? defaultDpadSize() : savedSize, false);
    applySwipe(swipeStyle);
    showSection(lsGet(CONFIG.TAB_KEY) || 'game');
    applyDifficulty(Difficulty.mode, true);
    applyMutator(Mutators.id, true);
    // the stage picker only offers biomes that are installed
    el.biomeButtons.forEach(function (b) {
      var v = b.getAttribute('data-biome');
      if (v !== 'auto' && !Biome.themes[v]) b.classList.add('hidden');
    });
    if (Biome.list().length < 2) document.querySelector('.stage-pick').classList.add('hidden');
    applyBiome(Biome.mode, true);
    syncBiome(true);
    applyTod(Weather.timeMode());
    applyWx(Weather.weatherMode());
    setMusicUi(Music.getVolume());
    if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) {
      el.fullscreenBtn.classList.add('hidden');
    }
    document.body.classList.add(IS_TOUCH ? 'touch' : 'no-touch');

    el.heroChick.innerHTML = Cosmetics.svg();
    refreshHud();
    clock = new THREE.Clock();
    animate();
  }

  function hookWorld() {
    world.onMagnetCoin = onMagnetCoin;
    world.onNearMiss = onNearMiss;
    world.onEvent = onWorldEvent;
    world.listener = { x: 0, z: 0, ghost: false };
  }

  function applyFrustum() {
    var aspect = window.innerWidth / window.innerHeight;
    // landscape: fixed height; portrait: zoom out until enough width is visible
    var half = Math.max(CONFIG.CAMERA_FRUSTUM_HALF, CONFIG.CAMERA_MIN_HALF_WIDTH / aspect);
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
  }

  function onResize() {
    applyFrustum();
    renderer.setSize(window.innerWidth, window.innerHeight);
    computeStartCam();
    if (state === 'start') snapToStart();
  }

  // ---- camera ------------------------------------------------------------
  // Orientation is fixed; each frame we only translate it.
  function updateCamera(dt, snap) {
    // Follow the chicken in both directions. On death the view holds still
    // (so the eagle can carry the chicken away across a steady screen).
    var follow = state === 'start' || (state === 'playing' && !player.dying);
    if (follow) {
      var tx = state === 'start' ? startCam.x : player.x;
      var tz = state === 'start' ? startCam.z : player.z + CONFIG.CAMERA_LEAD;
      if (snap) {
        camX = tx;
        camZ = tz;
      } else {
        camX += (tx - camX) * (1 - Math.exp(-CONFIG.CAMERA_FOLLOW_X * dt));
        camZ += (tz - camZ) * (1 - Math.exp(-CONFIG.CAMERA_FOLLOW_Z * dt));
      }
    }

    var sx = 0, sy = 0;
    if (shakeT > 0) {
      shakeT = Math.max(0, shakeT - dt);
      var mag = shakeT * 0.55;
      sx = (Math.random() - 0.5) * mag;
      sy = (Math.random() - 0.5) * mag;
    }
    camKick *= Math.exp(-14 * dt);
    camera.position.set(
      camX + CONFIG.CAMERA_OFFSET.x + sx,
      CONFIG.CAMERA_OFFSET.y + sy - camKick,
      camZ + CONFIG.CAMERA_OFFSET.z
    );
    camera.updateMatrixWorld(true);

    backdrop.position.x = camX;
    backdrop.position.z = camZ;
    updateSun();
  }

  var sunOff = new THREE.Vector3(), sunDir = new THREE.Vector3(), sunR = new THREE.Vector3();
  var sunU = new THREE.Vector3(), sunT = new THREE.Vector3(), Y_UP = new THREE.Vector3(0, 1, 0);

  // The sun sits on the opposite side from the camera so the faces you see are
  // shaded. It follows the camera, but in whole shadow-map pixels - otherwise
  // the shadows slowly crawl across the ground while you move.
  function updateSun() {
    var side = CONFIG.CAMERA_OFFSET.x > 0 ? -1 : 1;
    sunOff.set(side * 9, 20, -11);
    sunDir.copy(sunOff).normalize();
    sunR.crossVectors(Y_UP, sunDir).normalize();   // the shadow camera's own axes
    sunU.crossVectors(sunDir, sunR);
    sunT.set(camX, 0, camZ + 1);
    var sc = sunLight.shadow.camera;
    var texel = (sc.right - sc.left) / sunLight.shadow.mapSize.x;
    var a = sunT.dot(sunR), b = sunT.dot(sunU);
    sunT.addScaledVector(sunR, Math.round(a / texel) * texel - a);
    sunT.addScaledVector(sunU, Math.round(b / texel) * texel - b);
    sunLight.target.position.copy(sunT);
    sunLight.position.copy(sunT).add(sunOff);
  }

  // ---- input ------------------------------------------------------------
  function startGameIfNeeded() {
    if (state === 'start') {
      state = 'playing';
      document.body.classList.add('in-run');
      announceMutator();
      idleTimer = 0; // (the camera glides from the title view to the chicken)
      runTime = 0;
      Missions.runStart({ mut: Mutators.id, diff: Difficulty.mode });
      Achievements.runStart();
      runTrophies = [];
      el.startPanel.classList.add('hidden');
    }
  }

  function attemptMove(dx, dz) {
    unlockAudio();
    if (state === 'gameover' || settingsOpen) return;
    startGameIfNeeded();
    player.requestMove(dx * CONFIG.INPUT_X_SIGN * (Mutators.has('mirror') ? -1 : 1), dz, world);   // (Mirror World swaps left and right)
  }

  // A move in WORLD terms (used by camera-aware swipes).
  function attemptWorldMove(wx, wz) {
    unlockAudio();
    if (state === 'gameover' || settingsOpen) return;
    startGameIfNeeded();
    player.requestMove(Mutators.has('mirror') ? -wx : wx, wz, world);
  }

  var WORLD_MOVES = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // forward, back, +x, -x

  // Swipes. In "follow camera" mode the four hops lie along the diagonals you
  // actually SEE (the world is rotated), and that depends on whether the camera
  // leans left or right. Near-vertical / near-horizontal swipes stay simple:
  // up/down = forward/back, left/right = sidestep.
  function swipeMove(dx, dy) {
    var ax = Math.abs(dx), ay = Math.abs(dy);
    if (swipeStyle === 'classic') {
      if (ax > ay) attemptMove(dx > 0 ? 1 : -1, 0);
      else attemptMove(0, dy < 0 ? 1 : -1);
      return;
    }
    var ang = Math.abs(Math.atan2(-dy, dx) * 180 / Math.PI); // 0 = right, 90 = up/down axis, 180 = left
    if (Math.abs(ang - 90) < 16) { attemptMove(0, dy < 0 ? 1 : -1); return; }
    if (ang < 16 || ang > 164) { attemptMove(dx > 0 ? 1 : -1, 0); return; }
    var e = camera.matrixWorld.elements; // screen right = col 0, screen up = col 1
    var best = null, bestScore = -2, len = Math.sqrt(dx * dx + dy * dy);
    WORLD_MOVES.forEach(function (m) {
      var vx = e[0] * m[0] + e[2] * m[1];
      var vy = -(e[4] * m[0] + e[6] * m[1]); // pixel space: y grows downward
      var sc = (dx * vx + dy * vy) / (Math.sqrt(vx * vx + vy * vy) * len);
      if (sc > bestScore) { bestScore = sc; best = m; }
    });
    attemptWorldMove(best[0], best[1]);
  }

  function setupInput() {
    window.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (settingsOpen) closeModal(); else openModal(el.settingsPanel);
        return;
      }
      if (settingsOpen) return; // menus handle their own input
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          e.preventDefault(); attemptMove(0, 1); break;
        case 'ArrowDown': case 's': case 'S':
          e.preventDefault(); attemptMove(0, -1); break;
        case 'ArrowLeft': case 'a': case 'A':
          e.preventDefault(); attemptMove(-1, 0); break;
        case 'ArrowRight': case 'd': case 'D':
          e.preventDefault(); attemptMove(1, 0); break;
        case ' ':
          e.preventDefault();
          if (state === 'gameover') { if (!e.repeat && performance.now() - gameOverAt > 600) restart(true); }
          else attemptMove(0, 1);
          break;
        case 'Enter':
          if (state === 'gameover' && !e.repeat && performance.now() - gameOverAt > 600) restart(true);
          break;
      }
    });

    el.dpadButtons.forEach(function (btn) {
      var dir = btn.getAttribute('data-dir');
      var map = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] };
      btn.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        attemptMove(map[dir][0], map[dir][1]);
      });
    });

    // Tap / click = hop forward. Swipes fire the moment the finger has moved
    // far enough (not on release), which feels much snappier on phones.
    var press = null;
    var SWIPE = IS_TOUCH ? 16 : 24;
    window.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary) return;
      unlockAudio();
      if (e.target.closest && e.target.closest('button, .modal, .go-card')) { press = null; return; }
      if (dpadOn) { press = null; return; } // D-pad mode: screen taps / swipes do nothing
      press = { x: e.clientX, y: e.clientY, id: e.pointerId, done: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!press || press.done || press.id !== e.pointerId) return;
      var dx = e.clientX - press.x, dy = e.clientY - press.y;
      var ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < SWIPE) return;
      press.done = true;
      if (state === 'gameover') return;
      swipeMove(dx, dy);
    });
    window.addEventListener('pointerup', function (e) {
      if (!press || press.id !== e.pointerId) return;
      var wasSwipe = press.done;
      press = null;
      if (!wasSwipe && state !== 'gameover') attemptMove(0, 1);
    });
    window.addEventListener('pointercancel', function () { press = null; });

    el.playBtn.addEventListener('click', function () { attemptMove(0, 1); });
    el.restartBtn.addEventListener('click', function () { restart(true); }); // play again: skip the home screen
    el.homeBtn.addEventListener('click', function () { restart(false); });
    el.shareBtn.addEventListener('click', openShare);
    el.closeShareBtn.addEventListener('click', closeModal);
    el.shareNativeBtn.addEventListener('click', shareNative);
    el.shareSaveBtn.addEventListener('click', saveShareImage);
    el.shareCopyBtn.addEventListener('click', copyShare);
    el.biomeButtons.forEach(function (b) {
      b.addEventListener('click', function () { applyBiome(b.getAttribute('data-biome')); });
    });
    el.fullscreenBtn.addEventListener('click', function () {
      var d = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        (d.requestFullscreen || d.webkitRequestFullscreen).call(d);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      }
    });

    // menus
    [el.settingsBtn, el.pauseBtn].forEach(function (b) {
      b.addEventListener('click', function () {
        if (settingsOpen) closeModal(); else openModal(el.settingsPanel);
      });
    });
    el.closeSettingsBtn.addEventListener('click', closeModal);
    el.closeShopBtn.addEventListener('click', closeModal);
    el.closeInfoBtn.addEventListener('click', closeModal);
    el.infoBtn.addEventListener('click', function () { openModal(el.infoPanel); });
    el.modeBtn.addEventListener('click', function () { showSection('game'); openModal(el.settingsPanel); });
    el.diffButtons.forEach(function (b) {
      b.addEventListener('click', function () {
        if (state !== 'start') { el.diffNote.textContent = 'Difficulty can only be changed from the home screen.'; return; }   // scores belong to one mode
        applyDifficulty(b.getAttribute('data-diff'));
      });
    });
    el.closeMissionsBtn.addEventListener('click', closeModal);
    el.mutBtn.addEventListener('click', function () {
      openModal(el.mutPanel, renderMutators);
      var on = el.mutBody.querySelector('.mut-card.active');
      if (on) on.scrollIntoView({ block: 'center' });        // (the picked one may be far down the list)
    });
    el.closeMutBtn.addEventListener('click', closeModal);
    el.mutBody.addEventListener('click', function (e) {
      var b = e.target.closest('.mut-card');
      if (!b) return;
      applyMutator(b.getAttribute('data-mut') || null);
      GameAudio.equip();
      renderMutators();
    });
    el.closeTrophiesBtn.addEventListener('click', closeModal);
    el.startTrophiesBtn.addEventListener('click', function () { openModal(el.trophiesPanel, function () { showTrophyPane('trophies'); }); });
    el.ttTabs.forEach(function (t) {
      t.addEventListener('click', function () { showTrophyPane(t.getAttribute('data-pane')); });
    });
    el.startShopBtn.addEventListener('click', function () { openModal(el.shopPanel, renderShop); });
    el.startMissionsBtn.addEventListener('click', function () { openModal(el.missionsPanel, openMissionsScreen); });
    el.shopTabs.forEach(function (t) {
      t.addEventListener('click', function () {
        shopTab = t.getAttribute('data-tab');
        el.shopTabs.forEach(function (x) { x.classList.toggle('active', x === t); });
        el.shopHint.textContent = 'Tap an item to buy or wear it.';
        renderShop();
      });
    });
    el.chestBtn.addEventListener('click', openChest);
    el.chestReveal.addEventListener('click', function () { el.chestReveal.classList.add('hidden'); });
    el.shopGrid.addEventListener('click', function (e) {
      var b = e.target.closest('.shop-item');
      if (b) onShopItem(b.getAttribute('data-kind'), b.getAttribute('data-id'), b);
    });

    // settings
    el.leanButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { applyCameraLean(btn.getAttribute('data-lean')); });
    });
    el.fontButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { applyTitleFont(btn.getAttribute('data-font')); });
    });
    el.soundButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        unlockAudio();
        applySound(btn.getAttribute('data-sound') === 'on');
      });
    });
    el.qualityButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        quality.mode = btn.getAttribute('data-quality');
        lsSet(CONFIG.QUALITY_KEY, quality.mode);
        fps.warm = 0; fps.acc = 0; fps.n = 0;
        applyQuality();
      });
    });
    el.todButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { applyTod(btn.getAttribute('data-tod')); previewWeather(); });
    });
    el.wxButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { applyWx(btn.getAttribute('data-wx')); previewWeather(); });
    });
    el.dpadOptButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { applyDpad(btn.getAttribute('data-dpad') === 'on'); });
    });
    el.swipeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { applySwipe(btn.getAttribute('data-swipe')); });
    });
    el.dswapButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { applyDpadSwap(btn.getAttribute('data-dswap') === 'on'); });
    });
    // D-pad size: dragging shows the real D-pad over the (dimmed) settings screen
    el.dpadSizeSlider.addEventListener('input', function () {
      applyDpadSize(parseInt(el.dpadSizeSlider.value, 10), true);
      showDpadPreview(900);
    });
    el.dpadSizeSlider.addEventListener('pointerdown', function () { showDpadPreview(0); });
    ['pointerup', 'pointercancel', 'change'].forEach(function (ev) {
      el.dpadSizeSlider.addEventListener(ev, function () { showDpadPreview(900); });
    });
    el.dpadSizeReset.addEventListener('click', function () {
      applyDpadSize(defaultDpadSize(), true);
      showDpadPreview(900);
    });
    el.setTabs.forEach(function (t) {
      t.addEventListener('click', function () { showSection(t.getAttribute('data-sec')); });
    });
    el.musicSlider.addEventListener('input', function () {
      unlockAudio();
      var v = parseInt(el.musicSlider.value, 10) / 100;
      Music.setVolume(v);
      setMusicUi(v);
    });
  }

  function setMusicUi(v) {
    var pct = Math.round(v * 100);
    el.musicSlider.value = pct;
    el.musicSlider.style.setProperty('--fill', pct + '%');
    el.musicPct.textContent = pct === 0 ? 'OFF' : pct + '%';
  }

  function applyTitleFont(font) {
    document.documentElement.setAttribute('data-title-font', font);
    lsSet(CONFIG.FONT_KEY, font);
    el.fontButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-font') === font);
    });
  }

  function applySound(on) {
    GameAudio.setEnabled(on);
    lsSet(CONFIG.SOUND_KEY, on ? 'on' : 'off');
    el.soundButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-sound') === (on ? 'on' : 'off'));
    });
  }

  function applyDpad(on) {
    dpadOn = on;
    lsSet(CONFIG.DPAD_KEY, on ? 'on' : 'off');
    el.dpad.classList.toggle('show', on);
    el.startHint.textContent = on ? 'use the D-pad or press PLAY' : 'or tap anywhere · press an arrow key';
    el.dpadOptButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-dpad') === (on ? 'on' : 'off'));
    });
  }

  // ---- D-pad size ------------------------------------------------------------------
  // Tablets get a bigger D-pad by default; phones keep the normal size.
  function defaultDpadSize() {
    return IS_TOUCH && Math.min(window.innerWidth, window.innerHeight) >= 700 ? 130 : 100;
  }

  function applyDpadSize(v, save) {
    v = Utils.clamp(Math.round(v / 5) * 5, 60, 160);
    document.documentElement.style.setProperty('--dpad-scale', String(v / 100));
    el.dpadSizeSlider.value = v;
    el.dpadSizeSlider.style.setProperty('--fill', (v - 60) + '%');
    el.dpadSizePct.textContent = v + '%';
    if (save) {
      lsSet(CONFIG.DPAD_SIZE_KEY, String(v));
    }
  }

  // While you adjust the size the real D-pad appears on screen (even if it is switched
  // off) and the settings card fades out around the slider, so nothing hides it.
  var dpadPreviewTimer = null;
  function showDpadPreview(hideAfterMs) {
    clearTimeout(dpadPreviewTimer);
    document.body.classList.add('dpad-previewing');
    el.settingsPanel.classList.add('previewing');
    el.dpad.classList.add('show');
    if (hideAfterMs > 0) dpadPreviewTimer = setTimeout(endDpadPreview, hideAfterMs);
  }
  function endDpadPreview() {
    clearTimeout(dpadPreviewTimer);
    document.body.classList.remove('dpad-previewing');
    el.settingsPanel.classList.remove('previewing');
    el.dpad.classList.toggle('show', dpadOn);
  }

  function applyDpadSwap(swap) {
    lsSet(CONFIG.DPAD_SWAP_KEY, swap ? 'on' : 'off');
    document.body.classList.toggle('dpad-swap', swap);
    el.dswapButtons.forEach(function (b) { b.classList.toggle('active', (b.getAttribute('data-dswap') === 'on') === swap); });
  }

  function applySwipe(style) {
    swipeStyle = style;
    lsSet(CONFIG.SWIPE_KEY, style);
    el.swipeButtons.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-swipe') === style); });
  }

  // Settings page is split into sections (tabs); remember the last one used.
  function showSection(sec) {
    lsSet(CONFIG.TAB_KEY, sec);
    el.setTabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-sec') === sec); });
    el.setSecs.forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-sec') === sec); });
  }

  // ---- difficulty ------------------------------------------------------------
  // Each difficulty keeps its own top score (Medium keeps the original one).
  // A run modifier keeps its own record too (the key gets a suffix; no modifier = the plain key).
  function bestKeyOf(mode, mutId) {
    return (mode === 'medium' ? CONFIG.BEST_SCORE_KEY : CONFIG.BEST_SCORE_KEY + '_' + mode) + (mutId ? '_m_' + mutId : '');
  }
  function bestKey() { return bestKeyOf(Difficulty.mode, Mutators.id); }
  function readBest(mode, mutId) {
    var key = !mode ? bestKey() : bestKeyOf(mode, mutId === undefined ? Mutators.id : mutId);
    return parseInt(lsGet(key) || '0', 10) || 0;
  }
  // Top score of every difficulty, shown on the difficulty buttons and the HUD chip.
  function refreshBests() {
    var D = Difficulty.cur;
    el.bestScore.textContent = bestScore;
    var M = Mutators.cur, tag = D.icon + ' ' + D.label.toUpperCase() + (M ? ' ' + M.icon : '');
    el.bestMode.textContent = tag;
    el.goMode.textContent = tag;
    el.goBest.textContent = bestScore;
    el.diffButtons.forEach(function (b) {
      var m = b.getAttribute('data-diff');
      b.querySelector('.diff-best').textContent = 'TOP ' + (m === Difficulty.mode ? bestScore : readBest(m));
    });
  }

  function applyDifficulty(mode, silent) {
    if (!CONFIG.DIFFICULTY[mode]) mode = 'medium';
    Difficulty.mode = mode;
    lsSet(CONFIG.DIFF_KEY, mode);
    var D = Difficulty.cur;
    el.diffButtons.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-diff') === mode); });
    el.diffNote.textContent = D.blurb;
    el.modeBtn.textContent = D.icon + ' ' + D.label.toUpperCase();
    el.modeBtn.setAttribute('data-mode', mode);
    bestScore = readBest();
    refreshBests();
    // the road ahead is built for the new difficulty (mid-run it applies to rows built from now on)
    if (!silent && state === 'start') rebuildWorld();
  }

  // ---- run modifiers ----------------------------------------------------------
  // Picked on the home screen. The world ahead is rebuilt with the new rules.
  function applyMutator(id, silent) {
    Mutators.set(id);
    var M = Mutators.cur;
    Weather.setForced(M && M.tod, M && M.wx);
    el.mutBtn.innerHTML = '<span class="mi">' + (M ? M.icon : '\uD83C\uDFB2') + '</span> ' + (M ? M.name.toUpperCase() : 'MODIFIERS');
    el.mutBtn.classList.toggle('on', !!M);
    bestScore = readBest();
    refreshBests();
    if (!silent && state === 'start') rebuildWorld();
  }

  function renderMutators() {
    var cur = Mutators.id, html = '';
    function card(id, icon, name, desc, top) {
      return '<button class="mut-card' + (cur === id ? ' active' : '') + '" data-mut="' + (id || '') + '">' +
        '<span class="mc-ico">' + icon + '</span><span class="mc-txt"><b>' + name + '</b><small>' + desc + '</small></span>' +
        '<span class="mc-top">' + (top === null ? '' : 'TOP ' + top) + '</span></button>';
    }
    html += card(null, '\uD83D\uDEAB', 'No modifier', 'The normal game.', readBest(Difficulty.mode, null));
    Mutators.LIST.forEach(function (m) { html += card(m.id, m.icon, m.name, m.desc, readBest(Difficulty.mode, m.id)); });
    el.mutBody.innerHTML = html;
  }

  // a toast at the start of a run with a modifier on
  function announceMutator() {
    var M = Mutators.cur;
    if (M) showToast(M.icon + ' ' + M.name.toUpperCase() + '!', '#ff8a1f');
  }

  function rebuildWorld() {
    world.destroy();
    world = new World(scene);
    hookWorld();
    world.update(0, camZ, 0);
    syncBiome(true);
    previewWeather();
  }

  // Auto walks through the installed biomes in turn; the others lock one in.
  function applyBiome(mode, silent) {
    if (!Biome.valid(mode)) mode = 'auto';
    Biome.mode = mode;
    lsSet(CONFIG.BIOME_KEY, mode);
    el.biomeButtons.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-biome') === mode); });
    if (!silent && state === 'start') rebuildWorld();
  }

  // The sky, the astronaut helmet and the music follow the biome under the chicken's feet.
  function syncBiome(snap) {
    if (!world || !player) return;
    var z = Math.round(player.z);
    var row = world.getRow(z);
    var b = row ? row.biome : Biome.forRow(z);
    if (b === curBiome && !snap) return;
    var changed = b !== curBiome;
    curBiome = b;
    Weather.setBiome(b, snap);
    player.setTheme(b);
    document.body.setAttribute('data-biome', b);   // lets a theme restyle the page (css/space.css)
    if (changed && !snap && state === 'playing') {
      var enter = Biome.theme(b).enter;
      if (enter) showToast(enter.text, enter.color);
      GameAudio.portal();
    }
  }

  function applyTod(mode) {
    Weather.setModes(mode, Weather.weatherMode());
    lsSet(CONFIG.TOD_KEY, mode);
    el.todButtons.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tod') === mode); });
  }

  function applyWx(mode) {
    Weather.setModes(Weather.timeMode(), mode);
    lsSet(CONFIG.WEATHER_KEY, mode);
    el.wxButtons.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-wx') === mode); });
  }

  // Jump the lighting / weather to the new setting right away (the game is paused
  // behind the menu, so the normal per-frame update isn't running).
  function previewWeather() {
    if (player) Weather.update(1.6, player.maxZ, camX, camZ, currentLevel());
  }

  // ---- modals (settings / shop / missions) -------------------------------------
  function openModal(panel, onOpen) {
    if (modalEl === panel) return;
    if (modalEl) modalEl.classList.add('hidden'); // switching straight between menus
    else {
      panelHiddenForModal = null;
      if (!el.startPanel.classList.contains('hidden')) panelHiddenForModal = el.startPanel;
      else if (!el.gameOverPanel.classList.contains('hidden')) panelHiddenForModal = el.gameOverPanel;
      if (panelHiddenForModal) panelHiddenForModal.classList.add('hidden');
    }
    settingsOpen = true;
    modalEl = panel;
    document.body.classList.add('modal-open');
    GameAudio.setAmbience(0, 0);
    if (onOpen) onOpen();
    panel.classList.remove('hidden');
  }

  function closeModal() {
    if (!modalEl) return;
    if (modalEl === el.missionsPanel) finishMissionsScreen();
    el.chestReveal.classList.add('hidden');
    endDpadPreview();
    modalEl.classList.add('hidden');
    modalEl = null;
    settingsOpen = false;
    document.body.classList.remove('modal-open');
    if (panelHiddenForModal) {
      panelHiddenForModal.classList.remove('hidden');
      panelHiddenForModal = null;
    }
    refreshHud();
    clock.getDelta();
  }

  // ---- shop ------------------------------------------------------------------

  function setCoins(n) {
    totalCoins = n;
    lsSet(CONFIG.COINS_KEY, String(totalCoins));
    el.coins.textContent = totalCoins;
    el.shopCoins.textContent = totalCoins;
  }

  // Tabs whose items are shown as an emoji card instead of a pixel chicken.
  function isIconTab(kind) { return kind !== 'skin' && kind !== 'outfit'; }
  var WORN_LABEL = { skin: 'EQUIPPED', pet: 'FOLLOWING', trail: 'ON', aura: 'ON', death: 'EQUIPPED', hsound: 'EQUIPPED' };

  // Tell the trophies what the wardrobe looks like now.
  function syncShopTrophies() {
    Achievements.event('owned', Cosmetics.wardrobeCount(), true);
    Achievements.event('shopItems', Cosmetics.boughtCount(), true);
    if (Cosmetics.list('pet').some(function (it) { return Cosmetics.owned('pet', it.id); })) Achievements.event('pets', 1, true);
  }

  function renderShop() {
    el.shopCoins.textContent = totalCoins;
    var look = Cosmetics.current();
    el.shopPreview.innerHTML = Cosmetics.svg(look);
    var worn = [look.head && look.head.name, look.face && look.face.name].filter(Boolean).join(' + ');
    var friends = ['pet', 'trail', 'aura'].map(function (k) { return Cosmetics.eq(k); }).filter(Boolean)
      .map(function (it) { return it.icon + ' ' + it.name; }).join(' · ');
    el.shopLook.innerHTML = '<b>' + look.skin.name + '</b><small>' + (worn || 'No outfit') + '</small>' +
      (friends ? '<small>' + friends + '</small>' : '') +
      '<small>' + Cosmetics.ownedCount() + ' / ' + Cosmetics.totalCount() + ' collected</small>';
    el.chestBtn.classList.toggle('poor', totalCoins < Cosmetics.CHEST_PRICE);
    var items = Cosmetics.list(shopTab);
    var html = '';
    items.forEach(function (it) {
      var owned = Cosmetics.owned(shopTab, it.id);
      var worn2 = Cosmetics.isEquipped(shopTab, it.id);
      var preview = shopTab === 'skin'
        ? { skin: it, head: look.head, face: look.face }
        : { skin: look.skin, head: it.slot === 'head' ? it : null, face: it.slot === 'face' ? it : null };
      var prevHtml = isIconTab(shopTab) ? '<div class="si-prev fxprev">' + it.icon + '</div>' : '<div class="si-prev">' + Cosmetics.svg(preview) + '</div>';
      var label, cls = 'shop-item';
      if (owned) { cls += ' owned' + (worn2 ? ' equipped' : ''); label = worn2 ? (WORN_LABEL[shopTab] || 'WORN') : 'OWNED'; }
      else { label = '🪙 ' + it.price; if (totalCoins < it.price) cls += ' poor'; }
      html += '<button class="' + cls + '" data-kind="' + shopTab + '" data-id="' + it.id + '">' +
        prevHtml +
        '<div class="si-name">' + it.name + '</div><div class="si-state">' + label + '</div></button>';
    });
    el.shopGrid.innerHTML = html;
  }

  // Mystery chest: pay coins, get a random item you don't own, and wear it.
  function openChest() {
    if (!el.chestReveal.classList.contains('hidden')) return;
    var pick = Cosmetics.chestPick();
    if (!pick) { el.shopHint.textContent = 'You already own everything!'; return; }
    if (totalCoins < Cosmetics.CHEST_PRICE) {
      GameAudio.deny();
      el.shopHint.textContent = 'Need ' + (Cosmetics.CHEST_PRICE - totalCoins) + ' more \uD83E\uDE99 for a chest.';
      el.chestBtn.classList.remove('shake'); void el.chestBtn.offsetWidth; el.chestBtn.classList.add('shake');
      return;
    }
    setCoins(totalCoins - Cosmetics.CHEST_PRICE);
    Cosmetics.buy(pick.kind, pick.id);
    Cosmetics.equip(pick.kind, pick.id);
    syncShopTrophies();
    Achievements.event('chests', 1);
    var it = Cosmetics.itemOf(pick.kind, pick.id);
    var look = Cosmetics.current();
    var prev = isIconTab(pick.kind) ? '<div class="cr-prev fxprev">' + it.icon + '</div>'
      : '<div class="cr-prev">' + Cosmetics.svg(pick.kind === 'skin' ? { skin: it, head: null, face: null } : { skin: look.skin, head: it.slot === 'head' ? it : null, face: it.slot === 'face' ? it : null }) + '</div>';
    var rar = Cosmetics.rarity(it.price);
    el.chestReveal.innerHTML = '<div class="cr-box">\uD83C\uDF81</div><div class="cr-item">' + prev +
      '<div class="cr-name">' + it.name + '</div><div class="cr-rar ' + rar + '">' + rar.toUpperCase() + '</div><small>Now wearing it! Tap to continue</small></div>';
    el.chestReveal.classList.remove('hidden');
    if (GameAudio) { GameAudio.equip(); setTimeout(function () { GameAudio.buy(); }, 850); }
    vibrate([20, 40, 60]);
    applyLookChange();
    renderShop();
    el.shopHint.textContent = 'Tap an item to buy or wear it.';
  }

  function applyLookChange() {
    GameAudio.setHopPack(Cosmetics.eqId('hsound'));
    player.applyLook();                          // (also puts on the pet and the aura)
    el.heroChick.innerHTML = Cosmetics.svg();
  }

  // what the hint line says after you pick something in a tab
  var SHOP_TIPS = {
    pet: function (name, was) { return was ? name + ' went home.' : 'Say hi to ' + name + '!'; },
    trail: function (name, was) { return was ? 'Trail off.' : name + ' trail on! Hop to see it.'; },
    aura: function (name, was) { return was ? 'Aura off.' : name + ' aura on!'; },
    death: function (name) { return name + ' will play whenever you lose (not on an eagle or UFO grab).'; },
    hsound: function (name) { return name + ' hops!'; }
  };

  function onShopItem(kind, id, btn) {
    var name = Cosmetics.itemOf(kind, id).name;
    if (Cosmetics.owned(kind, id)) {
      var was = Cosmetics.isEquipped(kind, id);
      Cosmetics.equip(kind, id);
      GameAudio.equip();
      el.shopHint.textContent = SHOP_TIPS[kind] ? SHOP_TIPS[kind](name, was) : kind !== 'skin' && was ? name + ' taken off.' : (kind === 'fx' ? name + ' on!' : 'Wearing ' + name + '!');
      applyLookChange();
      if (kind === 'hsound') GameAudio.hop();      // a taste of the new hop sound
    } else {
      var price = Cosmetics.price(kind, id);
      if (totalCoins >= price) {
        setCoins(totalCoins - price);
        Cosmetics.buy(kind, id);
        Cosmetics.equip(kind, id);
        syncShopTrophies();
        GameAudio.buy();
        vibrate(20);
        el.shopHint.textContent = 'Bought ' + name + '! Looking good.';
        applyLookChange();
        renderShop();
        var nb = el.shopGrid.querySelector('[data-id="' + id + '"]');
        if (nb) nb.classList.add('bought');
        return;
      }
      GameAudio.deny();
      el.shopHint.textContent = 'Need ' + (price - totalCoins) + ' more 🪙 for ' + name + '.';
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake');
      return;
    }
    renderShop();
  }

  // ---- missions --------------------------------------------------------------
  var missionTimers = [];
  function clearMissionTimers() { missionTimers.forEach(clearTimeout); missionTimers = []; }
  function later(fn, ms) { missionTimers.push(setTimeout(fn, ms)); }

  function openMissionsScreen() {
    renderMissions();
    el.missionDot.classList.add('hidden'); // you're looking at it now
  }

  // If the screen is closed mid-animation, finish the job right away.
  function finishMissionsScreen() {
    clearMissionTimers();
    Missions.collectCompleted();
    updateMissionDot();
  }

  // The weekly challenge card (same look as the daily one, in purple).
  function weeklyCardHtml(wk) {
    var fresh = wk.done && !wk.seen;
    var pct = Math.round(100 * wk.progress / wk.target);
    return '<div class="sec-title">WEEKLY CHALLENGE</div>' +
      '<div class="daily-card weekly-card' + (wk.done && !fresh ? ' done' : '') + (fresh ? ' pending' : '') + '">' +
      '<div class="dc-top"><span>' + wk.icon + ' THIS WEEK</span><span class="streak">\uD83D\uDCC5 ' + wk.streak + ' week' + (wk.streak === 1 ? '' : 's') + '</span></div>' +
      '<div class="dc-text">' + wk.text + '</div>' +
      '<div class="dc-bottom"><div class="mbar"><i style="width:' + (fresh ? 0 : pct) + '%"></i></div>' +
      '<span class="dc-count">' + (wk.done ? '\u2713 DONE' : wk.progress + ' / ' + wk.target) + '</span>' +
      '<span class="mrew">+' + wk.reward + ' \uD83E\uDE99</span></div>' +
      '<div class="mission-foot">' + (wk.done ? 'A new challenge starts on Monday!' : 'Ends in ' + wk.daysLeft + ' day' + (wk.daysLeft === 1 ? '' : 's') + (wk.noZen ? ' \u00B7 Zen runs do not count' : '')) + '</div>' +
      '</div>';
  }

  // enterIdx: slots that just received a brand-new mission (they slide in)
  function renderMissions(enterIdx) {
    var v = Missions.view();
    var d = v.daily;
    var pct = function (p, t) { return Math.round(100 * p / t); };
    var dailyFresh = d.done && !d.seen; // finished, not yet shown
    var html = '<div class="sec-title">DAILY CHALLENGE</div>' +
      '<div class="daily-card' + (d.done && !dailyFresh ? ' done' : '') + (dailyFresh ? ' pending' : '') + '">' +
      '<div class="dc-top"><span>' + d.icon + ' TODAY</span><span class="streak">🔥 ' + v.streak + ' day' + (v.streak === 1 ? '' : 's') + '</span></div>' +
      '<div class="dc-text">' + d.text + '</div>' +
      '<div class="dc-bottom"><div class="mbar"><i style="width:' + (dailyFresh ? 0 : pct(d.progress, d.target)) + '%"></i></div>' +
      '<span class="dc-count">' + (d.done ? '✓ DONE' : d.progress + ' / ' + d.target) + '</span>' +
      '<span class="mrew">+' + d.reward + ' 🪙</span></div>' +
      (d.done ? '<div class="mission-foot">Come back tomorrow to keep your streak going!</div>' : '') +
      '</div>' + weeklyCardHtml(v.weekly) + '<div class="sec-title">MISSIONS</div>';
    var anyDone = false;
    v.missions.forEach(function (m, i) {
      if (m.done) anyDone = true;
      var cls = 'mrow' + (m.done ? ' completing' : '') + (enterIdx && enterIdx.indexOf(i) >= 0 ? ' enter' : '');
      html += '<div class="' + cls + '"><span class="mi">' + m.icon + '</span><div class="mt"><div class="mtext">' + m.text + '</div>' +
        '<div class="mbar"><i style="width:' + (m.done ? 0 : pct(m.progress, m.target)) + '%"></i></div>' +
        '<div class="mprog">' + (m.done ? '✓ COMPLETE!' : m.progress + ' / ' + m.target) + '</div></div><span class="mrew">+' + m.reward + ' 🪙</span></div>';
    });
    html += '<div class="mission-foot">Missions completed: ' + v.completed + '</div>';
    el.missionsBody.innerHTML = html;

    var weeklyFresh = v.weekly.done && !v.weekly.seen;
    if (!anyDone && !dailyFresh && !weeklyFresh) return;
    // 1) the bar fills up  2) it turns green  3) the finished mission slides away  4) a new one arrives
    var fills = el.missionsBody.querySelectorAll('.mrow.completing .mbar i, .daily-card.pending .mbar i');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { for (var k = 0; k < fills.length; k++) fills[k].style.width = '100%'; });
    });
    later(function () {
      var rows = el.missionsBody.querySelectorAll('.mrow.completing, .daily-card.pending');
      for (var k = 0; k < rows.length; k++) rows[k].classList.add('green');
      GameAudio.missionDone();
    }, 900);
    if (anyDone) {
      later(function () {
        var rows = el.missionsBody.querySelectorAll('.mrow.completing');
        for (var k = 0; k < rows.length; k++) rows[k].classList.add('vanish');
      }, 1700);
      later(function () {
        var replaced = Missions.collectCompleted();
        renderMissions(replaced);
        updateMissionDot();
      }, 2300);
    } else {
      later(function () { Missions.collectCompleted(); updateMissionDot(); }, 1700);
    }
  }

  function giveCoins(n) { setCoins(totalCoins + n); }

  // ---- trophies ----------------------------------------------------------------
  var trophyToastAt = 0;      // when the last trophy toast was shown (so they don't overlap)

  function onTrophy(d) {
    giveCoins(d.reward);
    runTrophies.push(d);
    var wait = Math.max(0, trophyToastAt + 2300 - Date.now());
    trophyToastAt = Date.now() + wait;
    if (state === 'gameover') { renderGoTrophies(); updateTrophyDot(); return; }   // the card shows it instead
    var thisRun = runTrophies;
    setTimeout(function () {
      if (state !== 'playing' || thisRun !== runTrophies) return;   // that run is over
      showToast('\uD83C\uDFC6 ' + d.name + '! +' + d.reward + ' \uD83E\uDE99', '#f0a500');
      GameAudio.missionDone();
      vibrate(40);
    }, wait);
    updateTrophyDot();
  }

  // the "new trophy" line on the game-over card
  function renderGoTrophies() {
    if (!runTrophies.length) { el.goTrophies.classList.add('hidden'); return; }
    el.goTrophies.innerHTML = '\uD83C\uDFC6 ' + (runTrophies.length === 1 ? 'New trophy: ' : 'New trophies: ') +
      runTrophies.slice(0, 2).map(function (t) { return t.icon + ' ' + t.name; }).join(', ') +
      (runTrophies.length > 2 ? ' +' + (runTrophies.length - 2) + ' more' : '');
    el.goTrophies.classList.remove('hidden');
  }

  function updateTrophyDot() {
    el.trophyDot.classList.toggle('hidden', !Achievements.hasNew());
  }

  // The Trophies screen has two tabs: the trophies and the lifetime stats.
  function showTrophyPane(pane) {
    el.ttTabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-pane') === pane); });
    el.trophyPane.classList.toggle('hidden', pane !== 'trophies');
    el.statsPane.classList.toggle('hidden', pane !== 'stats');
    el.ttTitle.textContent = pane === 'stats' ? 'STATS' : 'TROPHIES';
    if (pane === 'stats') renderStats(); else renderTrophies();
    el.statsBody.scrollTop = 0;
  }

  function renderStats() {
    el.statsBody.innerHTML = Stats.html(function (diff, mutId) { return readBest(diff, mutId); });
  }

  function renderTrophies() {
    var list = Achievements.view(), c = Achievements.counts();
    el.trophyCount.textContent = c.done + ' / ' + c.total;
    el.trophyBar.style.width = Math.round(100 * c.done / c.total) + '%';
    function row(t) {
      var pct = Math.round(100 * t.progress / t.target);
      return '<div class="trow ' + (t.done ? 'done' : 'locked') + (t.isNew ? ' fresh' : '') + '">' +
        '<span class="ti">' + t.icon + '</span><div class="tt"><div class="tn">' + t.name + '</div><div class="td">' + t.desc + '</div>' +
        (t.done ? '' : '<div class="tp"><div class="mbar"><i style="width:' + pct + '%"></i></div></div>') + '</div>' +
        '<span class="tr">' + (t.done ? '\u2713 +' + t.reward : t.progress + ' / ' + t.target) + '</span></div>';
    }
    var todo = list.filter(function (t) { return !t.done; }).sort(function (a, b) { return b.progress / b.target - a.progress / a.target; });
    var done = list.filter(function (t) { return t.done; });
    var html = '';
    if (todo.length) html += '<div class="sec-title">IN PROGRESS</div>' + todo.map(row).join('');
    if (done.length) html += '<div class="sec-title">UNLOCKED</div>' + done.map(row).join('');
    el.trophiesBody.innerHTML = html;
    Achievements.markSeen();
    updateTrophyDot();
  }

  function onMissionComplete(info) {
    GameAudio.missionDone();
    vibrate(40);
    if (info.kind === 'daily') {
      Achievements.event('daily', 1);
      Achievements.event('streak', info.streak, true);
      showToast('🏅 DAILY DONE! +' + info.reward + ' 🪙  🔥' + info.streak, '#ff8a1f');
    } else if (info.kind === 'weekly') {
      Achievements.event('weekly', 1);
      Achievements.event('wstreak', info.streak, true);
      showToast('\uD83D\uDCC5 WEEKLY DONE! +' + info.reward + ' \uD83E\uDE99  \uD83D\uDCC5' + info.streak, '#8f6bff');
    } else {
      showToast(info.icon + ' MISSION! +' + info.reward + ' 🪙', '#3d8bff');
    }
    Particles.sparkle(player.x, player.y + 0.8, player.z);
    updateMissionDot();
  }

  function updateMissionDot() {
    el.missionDot.classList.toggle('hidden', !Missions.hasCompleted()); // only when something was completed
  }

  // ---- HUD, toasts, coins -------------------------------------------------
  function refreshHud() {
    el.score.textContent = score;
    el.bestScore.textContent = bestScore;
    el.coins.textContent = totalCoins;
    el.shopCoins.textContent = totalCoins;
    updateMissionDot();
  }

  // Points go through here: a modifier may multiply them (Penniless counts 3x).
  function addScore(pts) {
    scoreRaw += pts * Mutators.num('scoreMult', 1);
    score = Math.floor(scoreRaw + 1e-6);
    showScore();
  }

  function showScore() {
    el.score.textContent = score;
    el.score.classList.remove('bump');
    void el.score.offsetWidth;
    el.score.classList.add('bump');
  }

  // Floating text over the chicken ("CLOSE CALL! +5").
  function popText(text, glow) {
    if (el.pops.children.length > 4) return;
    tmpV.set(player.x, player.y + 1.0, player.z).project(camera);
    var d = document.createElement('div');
    d.className = 'pop-text';
    d.textContent = text;
    d.style.left = ((tmpV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    d.style.top = ((-tmpV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    if (glow) d.style.textShadow = '0 0 14px ' + glow + ', 0 4px 0 rgba(0,0,0,0.25)';
    el.pops.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1150);
  }

  function showToast(text, color) {
    el.toast.textContent = text;
    el.toast.style.setProperty('--c', color || '#fff');
    el.toast.classList.remove('show');
    void el.toast.offsetWidth; // restart the animation
    el.toast.classList.add('show');
  }

  function addCoins(base) {
    var value = base * (powers.double ? 2 : 1);
    runStats.coins += value;
    Stats.add('coins', value);
    setCoins(totalCoins + value);
    Missions.event('coins', value);
    Achievements.event('coins', value);
    var box = el.coins.parentNode;
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
  }

  function onMagnetCoin() {
    GameAudio.coin();
    Particles.sparkle(player.x, player.y + 0.6, player.z);
    addCoins(1);
  }

  // ---- combos & close calls -------------------------------------------------
  const COMBO_COLORS = ['#ffb02e', '#ff9a3d', '#ff7a4a', '#ff5fa8', '#a56bff'];

  function resetCombo() {
    combo.count = 0; combo.mult = 1; combo.timer = 0;
    el.combo.classList.add('hidden');
    lastComboCount = -1;
  }

  // ---- rare events: thunderstorm / solar flare, coin rain, supply drop, traffic jam, fireworks ----
  var evt = { cooldown: 40, strikesLeft: 0, strikeT: 0 };

  // A rare event happened (kind: storm | rain | drone | jam | fireworks | stampede).
  function noteEvent(kind) {
    Achievements.event('events', 1);
    Missions.event('events', 1);
    Stats.bump('events', kind);
  }

  function maybeEvent(z) {
    if (z < 25 || evt.strikesLeft > 0) return;
    if (--evt.cooldown > 0 || Math.random() > 0.07) return;
    evt.cooldown = 45 + Utils.randInt(0, 25);
    var noCoins = Mutators.has('noCoins');       // (Penniless: nothing that hands out coins)
    var kind = Utils.weightedChoice([
      { value: 'storm', weight: 0.28 }, { value: 'rain', weight: noCoins ? 0 : 0.2 }, { value: 'drone', weight: noCoins ? 0 : 0.18 },
      { value: 'jam', weight: 0.17 }, { value: 'fireworks', weight: 0.17 }
    ]);
    if (kind === 'storm') {
      noteEvent('storm');
      var st = Biome.theme(curBiome).storm;
      showToast(st ? st.toast : '\u26A1 THUNDERSTORM!', '#7f9dff');
      evt.strikesLeft = 3; evt.strikeT = 0.9;
    } else if (kind === 'rain') {
      var n = world.coinRain(Math.round(player.z));
      if (n) {
        noteEvent('rain');
        showToast('\uD83E\uDE99 COIN RAIN!', '#ffc107');
        GameAudio.coinRain();
      }
    } else if (kind === 'drone') {
      if (Events.startSupplyDrop(world, player)) {
        noteEvent('drone');
        showToast('\uD83D\uDE81 SUPPLY DROP!', '#3d8bff');
      } else evt.cooldown = 6;
    } else if (kind === 'jam') {
      if (world.startJam(Math.round(player.z))) {
        noteEvent('jam');
        showToast('\uD83D\uDEA8 TRAFFIC JAM!', '#ff5a5f');
      } else evt.cooldown = 6;
    } else {
      noteEvent('fireworks');
      Achievements.event('fireworks', 1);
      Events.startFireworks(6.5);
      activatePower('fireworks');
    }
  }

  // A supply crate picked up: coins (and sometimes a power-up).
  function onCrate(crate, row) {
    var n = Utils.randInt(8, 16);
    GameAudio.crateOpen();
    vibrate(25);
    Particles.burst(crate.x, row.top + 0.5, row.z, { colors: [0xffd23f, 0xfff0a0, 0xffffff, 0xc08a50], count: 18, speed: 3.2, up: 5, size: 0.12, life: 0.8, gravity: 9, spread: 0.3, floor: row.top });
    Particles.ring(crate.x, row.top + 0.05, row.z, 0xffd23f, 3);
    addCoins(n);
    Stats.add('crates');
    popText('\uD83D\uDCE6 +' + n * (powers.double ? 2 : 1) + ' \uD83E\uDE99', '#ffc107');
    Achievements.event('crates', 1);
    if (Math.random() < 0.3) {
      var type = Utils.weightedChoice(Object.keys(CONFIG.POWERUPS).map(function (k) { return { value: k, weight: CONFIG.POWERUPS[k].weight }; }));
      activatePower(type, crate.x, row.top, row.z);
    }
  }

  function updateEvents(dt) {
    if (evt.strikesLeft <= 0 || state !== 'playing' || player.dying) return;
    evt.strikeT -= dt;
    if (evt.strikeT > 0) return;
    evt.strikesLeft--;
    evt.strikeT = Utils.randRange(0.9, 1.7);
    var st = Biome.theme(curBiome).storm;
    Weather.strike(st && st.color);
    if (st && st.sound) st.sound(); else GameAudio.thunder(0.12);
    shakeT = Math.max(shakeT, 0.12);
  }

  function onWorldEvent(kind) {
    if (kind === 'stampede') {
      showToast('\uD83E\uDD94 STAMPEDE AHEAD!', '#ff8a1f');
      GameAudio.stampede();
      noteEvent('stampede');
    }
  }

  // The Stats page counts every kind of lane you cross and the world it was in.
  function countLanes(row) {
    var T = CONFIG.ROW_TYPES;
    Stats.bump('worlds', row.biome);
    if (row.bikes) Stats.bump('lanes', 'bikes');
    if (row.stampede) Stats.bump('lanes', 'stampedes');
    if (row.crumbly) Stats.bump('lanes', 'crumbles');
    if (row.dual) Stats.bump('lanes', 'dualRails');
    if (row.belt) Stats.bump('lanes', 'belts');
    if (row.mud) Stats.bump('lanes', 'muds');
    if (row.ice) Stats.bump('lanes', 'ice');
    if (row.type === T.ROAD) Stats.bump('lanes', 'roads');
    else if (row.type === T.RAIL) Stats.bump('lanes', 'rails');
    else if (row.type === T.WATER) {
      Stats.bump('lanes', 'rivers');
      if (row.void) Stats.bump('lanes', 'voids');
      else if (row.logs.some(function (l) { return l.croc; })) Stats.bump('lanes', 'crocs');
    }
  }

  // A new row was reached.
  var runBiome = null;                 // the world of the furthest row reached this run

  function onNewRow(z) {
    maybeEvent(z);
    if (eagleCried) Achievements.event('eagleEscape', 1);   // moved on after hearing the warning
    idleTimer = 0;
    eagleCried = false;

    combo.count = combo.timer > 0 ? combo.count + 1 : 1;
    combo.timer = COMBO_WINDOW;
    var mult = Math.min(5, 1 + Math.floor((combo.count - 1) / 5));
    if (mult > combo.mult) {
      GameAudio.comboUp(mult);
      popText('x' + mult + ' COMBO!', COMBO_COLORS[mult - 1]);
      el.combo.classList.remove('pop');
      void el.combo.offsetWidth;
      el.combo.classList.add('pop');
      Missions.event('combo', mult, true);
      Achievements.event('combo', mult, true);
    }
    combo.mult = mult;
    runStats.maxMult = Math.max(runStats.maxMult, mult);
    runStats.maxCombo = Math.max(runStats.maxCombo, combo.count);
    Stats.add('rows');
    Stats.max('bestRow', z);
    Stats.max('maxCombo', combo.count);
    Stats.max('maxMult', mult);

    addScore(mult + (powers.fireworks ? 2 : 0));     // (a firework show adds +2 to every row)

    var row = world.getRow(z);
    if (row && row.type === CONFIG.ROW_TYPES.ROAD) Missions.event('roads', 1);
    else if (row && row.type === CONFIG.ROW_TYPES.WATER) Missions.event('rivers', 1);
    Missions.event('rows', z, true);
    Achievements.event('rows', z, true);
    if (Mutators.cur) {
      Achievements.event('mutRows', z, true);
      if (z === 10) Achievements.mark('mutKinds', Mutators.id);
    }
    Achievements.event('rows_' + Difficulty.mode, z, true);
    if (row) {
      countLanes(row);
      if (row.bikes) Achievements.event('bikes', 1);
      if (row.stampede) Achievements.event('stampedes', 1);
      if (row.crumbly) Achievements.event('crumbles', 1);
      if (row.dual) Achievements.event('dualRails', 1);
      if (row.belt) { Achievements.event('belts', 1); Missions.event('belts', 1); }
      if (row.mud) Achievements.event('muds', 1);
      if (row.jam > 0) Achievements.event('jamCross', 1);
      if (row.type === CONFIG.ROW_TYPES.ROAD) Achievements.event('roads', 1);
      else if (row.type === CONFIG.ROW_TYPES.WATER) {
        Achievements.event('rivers', 1);
        if (row.void) Achievements.event('voids', 1);
        else if (row.logs.some(function (l) { return l.croc; })) Achievements.event('crocs', 1);
      } else if (row.type === CONFIG.ROW_TYPES.RAIL) Achievements.event('rails', 1);
      else if (row.ice) Achievements.event('ice', 1);
      if (row.biome !== runBiome) {                       // the frontier crossed into another world
        if (runBiome) Achievements.event('swaps', 1);
        runBiome = row.biome;
      }
      var biomeStat = Biome.theme(row.biome).stat;   // a theme may count "reached this world" as a trophy stat
      if (biomeStat) Achievements.event(biomeStat, 1, true);
    }
  }

  function onNearMiss() {
    if (state !== 'playing' || player.dying) return;
    var pts = 5;
    addScore(pts);
    runStats.near++;
    Stats.add('near');
    if (combo.count > 0) combo.timer = Math.max(combo.timer, COMBO_WINDOW * 1.5); // a close call keeps the streak alive
    GameAudio.nearMiss();
    vibrate(15);
    popText('CLOSE CALL! +' + pts, '#ffd23f');
    Missions.event('near', 1);
    Achievements.event('near', 1);
    Achievements.event('nearAll', 1);
  }

  function updateComboHud(dt) {
    if (state === 'playing' && powers.fireworks && combo.count > 0 && !player.dying) combo.timer = COMBO_WINDOW;   // the show keeps the combo alive
    if (state === 'playing' && combo.timer > 0 && !player.dying) {
      combo.timer -= dt;
      if (combo.timer <= 0) resetCombo();
    }
    var show = state === 'playing' && combo.count >= 3 && combo.timer > 0;
    el.combo.classList.toggle('hidden', !show);
    if (!show) return;
    if (combo.count !== lastComboCount) {
      lastComboCount = combo.count;
      el.combo.setAttribute('data-m', combo.mult);
      el.comboMult.textContent = 'x' + combo.mult;
      el.comboCount.textContent = combo.count + ' hops';
    }
    el.comboBar.style.transform = 'scaleX(' + Utils.clamp(combo.timer / COMBO_WINDOW, 0, 1).toFixed(3) + ')';
  }

  // ---- power-ups -----------------------------------------------------------
  function hexNum(css) { return parseInt(css.slice(1), 16); }

  function onItemCollected(type, x, y, z) {
    Stats.bump('powers', type);
    Stats.add('powerups');
    Missions.event('powerups', 1);
    Achievements.event('powerups', 1);
    Achievements.mark('powerKinds', type);
    activatePower(type, x, y, z);
  }

  function activatePower(type, x, y, z) {
    var def = CONFIG.POWERUPS[type] || CONFIG.BOOSTS[type];     // (a boost, like the firework combo boost, never appears as a pick-up)
    if (x === undefined) { x = player.x; y = player.y; z = player.z; }
    GameAudio.powerup();
    vibrate(25);
    Particles.burst(x, y + 0.8, z, { colors: [hexNum(def.color), 0xffffff, 0xfff3b0], count: 18, speed: 3.6, up: 5, size: 0.12, life: 0.8, gravity: 6, spread: 0.2 });
    Particles.ring(x, y + 0.05, z, hexNum(def.color), 3.2);

    if (type === 'blast') { doBlast(); return; }
    showToast(def.icon + ' ' + def.label + '!', def.color);

    if (powers[type]) {
      powers[type].left = powers[type].total = def.dur; // already running: refresh
      return;
    }
    var pill = document.createElement('div');
    pill.className = 'pill';
    pill.style.setProperty('--c', def.color);
    pill.innerHTML = '<span class="pi">' + def.icon + '</span><span class="pb"><i></i></span>';
    el.powerups.appendChild(pill);
    powers[type] = { left: def.dur, total: def.dur, pill: pill, bar: pill.querySelector('i') };

    if (type === 'ghost') player.setGhost(true);
    else if (type === 'shield') player.setShield(true);
    else if (type === 'freeze') {
      world.frozen = true;
      el.freezeFx.classList.add('on');
      GameAudio.freeze();
    } else if (type === 'jump' || type === 'skiplane') refreshJump();
  }

  // Jump = hop over small obstacles; Skip Lane (the stronger one) = leap over a whole lane, two tiles at once.
  function refreshJump() {
    player.setJump(powers.skiplane ? 2 : powers.jump ? 1 : 0);
  }

  function endPower(type, silent) {
    var p = powers[type];
    if (!p) return;
    delete powers[type];
    if (p.pill.parentNode) p.pill.parentNode.removeChild(p.pill);
    if (type === 'ghost') player.setGhost(false);
    else if (type === 'shield') player.setShield(false);
    else if (type === 'freeze') {
      world.frozen = false;
      el.freezeFx.classList.remove('on');
    } else if (type === 'magnet') world.magnet = null;
    else if (type === 'jump' || type === 'skiplane') refreshJump();
    if (!silent && GameAudio) GameAudio.expire();
  }

  function clearPowers() {
    Object.keys(powers).forEach(function (t) { endPower(t, true); });
    world.frozen = false;
    world.magnet = null;
    el.freezeFx.classList.remove('on');
  }

  function updatePowers(dt) {
    var types = Object.keys(powers);
    for (var i = 0; i < types.length; i++) {
      var t = types[i], p = powers[t];
      p.left -= dt;
      if (p.left <= 0) { endPower(t); continue; }
      p.bar.style.transform = 'scaleX(' + (p.left / p.total).toFixed(3) + ')';
      p.pill.classList.toggle('low', p.left < 2.5);
    }
    player.ghostLeft = powers.ghost ? powers.ghost.left : 0;
    if (powers.magnet) {
      magnetPos.x = player.x; magnetPos.y = player.y + 0.4; magnetPos.z = player.z;
      world.magnet = magnetPos;
    }
  }

  function doBlast() {
    var z = Math.round(player.z);
    var n = world.blast(player.x, z, 8);
    GameAudio.blast();
    vibrate(80);
    shakeT = 0.5;
    Particles.ring(player.x, player.y + 0.1, player.z, 0xffa530, 7);
    Particles.ring(player.x, player.y + 0.1, player.z, 0xfff3b0, 4);
    el.flash.classList.remove('on');
    void el.flash.offsetWidth;
    el.flash.classList.add('on');
    var bonus = Math.min(n, 6);
    if (bonus) addCoins(bonus);
    showToast('💥 BLAST!' + (bonus ? '  +' + bonus + ' 🪙' : ''), '#ff7a1a');
  }

  // ---- game flow ----------------------------------------------------------
  function onPlayerDeath(type) {
    Achievements.mark('deathKinds', type);
    Stats.bump('deaths', type);
    lastDeath = type;
    if (type === 'car' || type === 'train') { shakeT = 0.32; vibrate(70); }
    else if (type === 'drown' || type === 'fall') { shakeT = 0.12; vibrate(40); }
    else if (type === 'croc') { shakeT = 0.25; vibrate(60); }
    else vibrate(50);
    resetCombo();
    Music.duck(0.2, 2.2);
  }

  function animateNumber(node, to, ms) {
    if (to <= 0) { node.textContent = '0'; return; }
    var t0 = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - t0) / ms);
      node.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  function launchConfetti() {
    var colors = ['#ff5a5f', '#ffd93d', '#5cb83f', '#3d8bff', '#ff8a1f', '#c36bff', '#ffffff'];
    el.confetti.innerHTML = '';
    for (var i = 0; i < 46; i++) {
      var c = document.createElement('i');
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.6) + 's';
      c.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
      c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      el.confetti.appendChild(c);
    }
  }

  function triggerGameOver() {
    state = 'gameover';
    gameOverAt = performance.now();
    document.body.classList.remove('in-run');
    clearPowers();
    Missions.runEnd();
    if (Mutators.cur && score > 0) { Achievements.event('mutRuns', 1); Missions.event('modRuns', 1); }
    Stats.runDone({ score: score, rows: player.maxZ, diff: Difficulty.mode, mut: Mutators.id, death: lastDeath, time: runTime });
    Achievements.runEnd();
    var isBest = score > bestScore;
    if (isBest) {
      bestScore = score;
      lsSet(bestKey(), String(bestScore));
    }
    var record = isBest && score > 0;
    refreshBests();
    el.goCoins.textContent = runStats.coins;
    el.goCombo.textContent = 'x' + runStats.maxMult;
    el.goNear.textContent = runStats.near;
    renderGoTrophies();
    updateTrophyDot();
    el.goTitle.textContent = record ? '🏆 NEW TOP SCORE!' : 'GAME OVER';
    el.gameOverPanel.classList.toggle('is-record', record);
    refreshHud();
    el.score.textContent = score;
    el.finalScore.textContent = score;
    GameAudio.gameOver();
    setTimeout(function () {
      if (state !== 'gameover') return;
      if (settingsOpen) { panelHiddenForModal = el.gameOverPanel; return; }
      el.gameOverPanel.classList.remove('hidden');
      animateNumber(el.finalScore, score, 700);
      if (record) launchConfetti(); else el.confetti.innerHTML = '';
    }, 250);
  }

  // ---- share card ------------------------------------------------------------
  // The share button makes a picture: a snapshot of the final scene, the score,
  // the mode and the biome, ready for a post. It can be shared, saved or copied.
  // The share card's look. The Forest's is here; a biome theme supplies its own (theme.card).
  var FOREST_CARD = {
    bg: [[0, '#8fd8ff'], [0.5, '#c4efa0'], [1, '#58b64a']],
    deco: function (c, W) {
      c.globalAlpha = 0.5; c.fillStyle = '#ffffff';
      [[120, 120, 150], [900, 90, 120], [520, 60, 90]].forEach(function (q) {
        c.beginPath(); c.arc(q[0], q[1], q[2] * 0.5, 0, 7); c.arc(q[0] + q[2] * 0.4, q[1] + 10, q[2] * 0.4, 0, 7); c.arc(q[0] - q[2] * 0.4, q[1] + 14, q[2] * 0.36, 0, 7); c.fill();
      });
      c.globalAlpha = 1;
    },
    label: '#2d5a22', tagBg: '#2f8f3a', chipFill: 'rgba(255,255,255,0.7)', chipStroke: null, chipText: null, foot: null, host: '#2d5a22'
  };

  function shareText() {
    return 'I scored ' + score + ' on ' + Difficulty.cur.label + (Mutators.cur ? ' (' + Mutators.cur.name + ')' : '') + ' in Crossy Way! Can you beat me?';
  }

  function snapshotScene() {
    renderer.render(scene, camera);          // draw right now so the canvas can be read back
    var src = renderer.domElement, sw = src.width, sh = src.height;
    var OW = 960, OH = 540, aspect = OW / OH;
    var ch = Math.min(sh, sw / aspect) * 0.8, cw = ch * aspect;
    if (cw > sw) { cw = sw; ch = cw / aspect; }
    var p = new THREE.Vector3(player.x, 0.5, player.z).project(camera);
    var px = (p.x * 0.5 + 0.5) * sw, py = (1 - (p.y * 0.5 + 0.5)) * sh;
    var sx = Utils.clamp(px - cw / 2, 0, sw - cw), sy = Utils.clamp(py - ch / 2, 0, sh - ch);
    var out = document.createElement('canvas');
    out.width = OW; out.height = OH;
    out.getContext('2d').drawImage(src, sx, sy, cw, ch, 0, 0, OW, OH);
    return out;
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function strokedText(c, text, x, y, fill, ink, lw) {
    c.lineJoin = 'round';
    c.lineWidth = lw; c.strokeStyle = ink; c.strokeText(text, x, y);
    c.fillStyle = fill; c.fillText(text, x, y);
  }

  function loadChickenImage() {
    return new Promise(function (resolve) {
      try {
        var svg = Cosmetics.svg();
        if (svg.indexOf('xmlns') < 0) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { resolve(null); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      } catch (e) { resolve(null); }
    });
  }

  function buildShareCard(snap) {
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    return Promise.all([fontsReady, loadChickenImage()]).then(function (res) {
      var chick = res[1];
      var W = 1080, H = 1350, INK = '#2b2b3a';
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var c = cv.getContext('2d');
      var K = Biome.theme(curBiome).card || FOREST_CARD;
      var font = (getComputedStyle(document.documentElement).getPropertyValue('--title-font') || '').trim() || 'Arial, sans-serif';

      // background
      var g = c.createLinearGradient(0, 0, 0, H);
      K.bg.forEach(function (stop) { g.addColorStop(stop[0], stop[1]); });
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      var seed = 7;
      function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
      K.deco(c, W, H, rnd);

      // title
      var letters = [['C', '#ff5a5f'], ['R', '#ff9f1c'], ['O', '#ffd23f'], ['S', '#5cb83f'], ['S', '#2ec4b6'], ['Y', '#3d8bff'], [' ', '#fff'], ['W', '#c36bff'], ['A', '#ff5a5f'], ['Y', '#ffd23f']];
      c.font = '400 118px ' + font;
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      var total = letters.reduce(function (a, l) { return a + c.measureText(l[0]).width + 4; }, 0);
      var lx = (W - total) / 2;
      letters.forEach(function (l) {
        strokedText(c, l[0], lx, 160, l[1], INK, 18);
        lx += c.measureText(l[0]).width + 4;
      });
      c.textAlign = 'center';
      c.font = '700 30px ' + font;
      c.fillStyle = K.label;
      c.fillText('H O P  ·  D O D G E  ·  S U R V I V E', W / 2, 218);

      // snapshot of the final scene
      var bx = 60, by = 250, bw = 960, bh = 540;
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 30; c.shadowOffsetY = 14;
      roundRect(c, bx - 12, by - 12, bw + 24, bh + 24, 44);
      c.fillStyle = INK; c.fill();
      c.restore();
      c.save();
      roundRect(c, bx, by, bw, bh, 34); c.clip();
      c.drawImage(snap, bx, by, bw, bh);
      c.restore();
      roundRect(c, bx, by, bw, bh, 34); c.lineWidth = 8; c.strokeStyle = '#ffffff'; c.stroke();

      // biome tag + a chicken sticker
      c.font = '400 40px ' + font;
      var tag = Biome.theme(curBiome).label;
      var tw = c.measureText(tag).width + 56;
      roundRect(c, bx + 24, by + 24, tw, 70, 35);
      c.fillStyle = K.tagBg; c.fill();
      c.lineWidth = 6; c.strokeStyle = '#ffffff'; c.stroke();
      c.fillStyle = '#ffffff'; c.textAlign = 'left';
      c.fillText(tag, bx + 52, by + 76);
      if (chick) {
        var cs = 230;
        c.save();
        c.translate(bx + bw - cs * 0.55, by + bh - cs * 0.5);
        c.rotate(0.12);
        c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 18; c.shadowOffsetY = 8;
        c.drawImage(chick, -cs / 2, -cs / 2, cs, cs);
        c.restore();
      }

      // score
      var record = el.gameOverPanel.classList.contains('is-record');
      c.textAlign = 'center';
      if (!record) {
        c.font = '700 34px ' + font;
        c.fillStyle = K.label;
        c.fillText('S C O R E', W / 2, 880);
      }
      c.font = '400 250px ' + font;
      strokedText(c, String(score), W / 2, 1100, '#ffffff', INK, 30);
      if (record) {
        c.save();
        c.translate(W / 2, 875); c.rotate(-0.04);
        c.font = '400 46px ' + font;
        var rw = c.measureText('🏆 NEW TOP SCORE!').width + 70;
        roundRect(c, -rw / 2, -52, rw, 84, 42);
        c.fillStyle = '#ffc107'; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
        c.fillStyle = INK; c.fillText('🏆 NEW TOP SCORE!', 0, 10);
        c.restore();
      }

      // chips: mode, top score, coins
      var chips = [
        Difficulty.cur.icon + ' ' + Difficulty.cur.label.toUpperCase() + (Mutators.cur ? ' ' + Mutators.cur.icon : ''),
        '🏆 TOP ' + bestScore,
        '🪙 ' + runStats.coins
      ];
      var chipFont = 40, widths, gap = 22, sumW;
      do {
        c.font = '400 ' + chipFont + 'px ' + font;
        widths = chips.map(function (t) { return c.measureText(t).width + 56; });
        sumW = widths.reduce(function (a, b2) { return a + b2; }, 0) + gap * (chips.length - 1);
        chipFont -= 2;
      } while (sumW > W - 80 && chipFont > 20);
      c.font = '400 ' + (chipFont + 2) + 'px ' + font;
      var cx = (W - sumW) / 2;
      chips.forEach(function (t, k) {
        roundRect(c, cx, 1150, widths[k], 80, 40);
        c.fillStyle = K.chipFill; c.fill();
        c.lineWidth = 5; c.strokeStyle = K.chipStroke || INK; c.stroke();
        c.fillStyle = K.chipText || INK; c.textAlign = 'left';
        c.fillText(t, cx + 28, 1204);
        cx += widths[k] + gap;
      });

      // footer
      c.textAlign = 'center';
      c.font = '700 40px ' + font;
      c.fillStyle = K.foot || INK;
      c.fillText('Can you beat me?', W / 2, 1292);
      var host = location.protocol.indexOf('http') === 0 ? location.host : '';
      if (host) { c.font = '700 26px ' + font; c.fillStyle = K.host; c.fillText(host, W / 2, 1330); }
      return cv;
    });
  }

  function openShare() {
    if (state !== 'gameover' || !player) return;
    var mine = ++shareReq;
    var snap = snapshotScene();
    buildShareCard(snap).then(function (cv) {
      if (mine !== shareReq || state !== 'gameover') return;
      cv.toBlob(function (blob) {
        if (!blob || mine !== shareReq || state !== 'gameover') return;
        Achievements.event('shares', 1);
        shareBlob = blob;
        if (shareUrl) URL.revokeObjectURL(shareUrl);
        shareUrl = URL.createObjectURL(blob);
        el.shareImg.src = shareUrl;
        el.shareNativeBtn.classList.toggle('hidden', !navigator.share);
        el.shareCopyBtn.classList.toggle('hidden', !(navigator.clipboard && (window.ClipboardItem || navigator.clipboard.writeText)));
        openModal(el.sharePanel);
      }, 'image/png');
    }).catch(function () { /* the card could not be drawn: stay on the game-over screen */ });
  }

  function flashLabel(btn, text) {
    var label = btn.querySelector('span:last-child');
    if (!label.hasAttribute('data-orig')) label.setAttribute('data-orig', label.textContent);
    label.textContent = text;
    clearTimeout(btn._flashT);
    btn._flashT = setTimeout(function () { label.textContent = label.getAttribute('data-orig'); }, 1600);
  }

  function shareNative() {
    if (!shareBlob || !navigator.share) return;
    var file = null;
    try { file = new File([shareBlob], 'crossy-way-score.png', { type: 'image/png' }); } catch (e) { /* old browser */ }
    var data = { title: 'Crossy Way', text: shareText() };
    if (location.protocol.indexOf('http') === 0) data.url = location.href;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file];
    navigator.share(data).catch(function () { /* cancelled */ });
  }

  function saveShareImage() {
    if (!shareUrl) return;
    var a = document.createElement('a');
    a.href = shareUrl;
    a.download = 'crossy-way-score-' + score + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    flashLabel(el.shareSaveBtn, 'SAVED!');
  }

  function copyShare() {
    if (!shareBlob) return;
    var done = function () { flashLabel(el.shareCopyBtn, 'COPIED!'); };
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': shareBlob })]).then(done, function () {
        navigator.clipboard.writeText(shareText()).then(done, function () { /* clipboard denied */ });
      });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText() + (location.protocol.indexOf('http') === 0 ? ' ' + location.href : '')).then(done, function () { /* clipboard denied */ });
    }
  }

  // autoStart = true: "Play again" - straight into a new run, no home screen.
  // false: back to the home screen.
  function restart(autoStart) {
    autoStart = autoStart === true;
    state = 'start';
    document.body.classList.remove('in-run');
    score = 0;
    scoreRaw = 0;
    runTime = 0;
    lastDeath = null;
    runStats = { coins: 0, near: 0, maxMult: 1, maxCombo: 0 };
    resetCombo();
    evt.cooldown = 40; evt.strikesLeft = 0; evt.strikeT = 0;
    runBiome = null;
    shareReq++;                       // a share card still being built is for the old run
    lastRow = 0;
    idleTimer = 0;
    eagleCried = false;
    clearPowers();
    el.gameOverPanel.classList.add('hidden');
    el.gameOverPanel.classList.remove('is-record');
    el.confetti.innerHTML = '';
    el.pops.innerHTML = '';
    Particles.clear();
    Events.clear();
    Flair.clear();
    world.destroy();
    world = new World(scene);
    hookWorld();
    player.reset();
    Weather.reset(false);
    if (autoStart) {
      state = 'playing';
      document.body.classList.add('in-run');
      el.startPanel.classList.add('hidden');
      announceMutator();
      Missions.runStart({ mut: Mutators.id, diff: Difficulty.mode });
      Achievements.runStart();
      runTrophies = [];
      camX = 0;
      camZ = CONFIG.CAMERA_LEAD;
    } else {
      el.startPanel.classList.remove('hidden');
      snapToStart();
    }
    world.update(0, camZ, 0);
    syncBiome(true);
    refreshHud();
    updateCamera(0, true);
  }

  // Not reaching a new row for a while summons the eagle (hopping sideways or back does
  // not count). There is no on-screen alert: its screech plays 3 seconds before it
  // arrives (the wait depends on the difficulty: Easy 12 s ... Extreme 6 s; Zen has no eagle).
  function checkIdle() {
    if (state !== 'playing' || !player.alive || player.dying) return;
    var wait = Difficulty.cur.eagle;
    if (idleTimer >= wait) {
      player.startDeath('eagle', world);
    } else if (idleTimer >= wait - 3 && !eagleCried) {
      eagleCried = true;
      if (GameAudio) { var warn = Biome.theme(curBiome).idleWarn; if (warn) warn(); else GameAudio.eagleCry(); }
    }
  }

  // One simulation step (the render loop calls this every frame).
  function tick(dt) {
    if (settingsOpen) return;
    var ls = world.listener;
    ls.x = player.x; ls.z = player.z; ls.ghost = !!powers.ghost;
    world.update(dt, camZ, Math.round(player.z));

    Weather.update(dt, player.maxZ, camX, camZ, currentLevel());
    var quiet = state !== 'playing' || player.dying;
    var amb = world.amb;
    GameAudio.setAmbience(quiet ? 0 : amb.traffic, quiet ? 0 : Weather.rain);
    syncBiome(false);
    var n = Weather.night;
    var tm = Weather.themeMix, tname = Weather.themeName;
    var themeMood = tm > 0.5 && tname ? Biome.theme(tname).musicMood : null;
    // (leaving a themed world must hand the music back, even in the dusk band where the day/night mood has hysteresis)
    Music.setMood(themeMood || (n > 0.6 ? 'night' : n < 0.4 ? 'day' : (wasThemeMood ? (n >= 0.5 ? 'night' : 'day') : null)));
    wasThemeMood = !!themeMood;
    if (tm !== bdMix) {
      bdMix = tm;
      backdrop.material.color.setHex(CONFIG.COLORS.grassB);
      var bdT = tname ? Biome.theme(tname).backdrop : undefined;
      if (bdT !== undefined) backdrop.material.color.lerp(bdColor.setHex(bdT), tm);
    }
    wxTimer -= dt;
    if (wxTimer <= 0) { wxTimer = 0.6; el.wxBadge.textContent = Weather.label(); }

    if (state === 'playing' && !player.dying) { idleTimer += dt; runTime += dt; }
    player.update(dt, world);
    updatePowers(dt);
    updateEvents(dt);
    Particles.update(dt);
    Events.update(dt, player);
    Flair.update(dt);
    updateCamera(dt);

    if (player.maxZ !== lastRow) {
      var prev = lastRow;
      lastRow = player.maxZ;
      if (state === 'playing') for (var nz = prev + 1; nz <= player.maxZ; nz++) onNewRow(nz);
    }
    updateComboHud(dt);
    checkIdle();
    if (!player.alive && state === 'playing') triggerGameOver();
  }

  function animate() {
    requestAnimationFrame(animate);
    var raw = clock.getDelta();
    governFps(raw);
    tick(Math.min(raw, 1 / 20));
    renderer.render(scene, camera);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
