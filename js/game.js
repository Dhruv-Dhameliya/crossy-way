// Scene/camera setup, input, scoring (combos), power-ups, shop, missions,
// weather, music, adaptive quality, game loop and UI.
(function () {
  var scene, camera, renderer, clock;
  var world, player;
  var state = 'start'; // start | playing | gameover
  var runCoins = 0;
  var totalCoins = parseInt(localStorage.getItem(CONFIG.COINS_KEY) || '0', 10) || 0;
  var bestScore = parseInt(localStorage.getItem(CONFIG.BEST_SCORE_KEY) || '0', 10) || 0;
  var lastDeath = null;

  var backdrop, ambientLight, sunLight;
  var cameraLean = localStorage.getItem(CONFIG.LEAN_KEY) || 'right';
  var settingsOpen = false;     // true while ANY modal (settings / shop / missions) is open
  var modalEl = null;
  var panelHiddenForModal = null;

  // camera rig: camX/camZ is the point the camera looks at; it simply follows
  // the chicken so the chicken stays near the middle of the screen.
  var camX = 0, camZ = CONFIG.CAMERA_LEAD;
  var idleTimer = 0;      // seconds since the chicken last reached a new row
  var shakeT = 0;
  var hurryShown = false;
  var tmpV = new THREE.Vector3();
  var startCam = { x: 0, z: CONFIG.CAMERA_LEAD }; // title-screen view (chicken parked in free screen space)

  var powers = {};        // active power-ups: type -> { left, total, pill }
  var magnetPos = { x: 0, y: 0, z: 0 };

  // scoring: every new row is worth the combo multiplier; close calls add bonus points
  var score = 0;
  var COMBO_WINDOW = 0.85; // seconds allowed between new rows to keep a combo alive
  var combo = { count: 0, mult: 1, timer: 0 };
  var runStats = { coins: 0, near: 0, maxMult: 1, maxCombo: 0 };
  var lastRow = 0;
  var lastHurryNum = -1;
  var lastComboCount = -1;
  var wxTimer = 0;

  var IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  var el = {};
  ['score', 'coins', 'bestScore', 'powerups', 'toast', 'flash', 'freezeFx', 'startPanel', 'startBest', 'startCoins',
    'playBtn', 'gameOverPanel', 'goCause', 'goMeta', 'finalScore', 'finalBest', 'finalCoins', 'newBest', 'confetti',
    'restartBtn', 'shareBtn', 'warning', 'fullscreenBtn', 'settingsBtn', 'pauseBtn', 'goSettingsBtn', 'settingsPanel', 'closeSettingsBtn', 'dpad',
    'combo', 'comboMult', 'comboCount', 'comboBar', 'pops', 'wxBadge', 'heroChick',
    'startShopBtn', 'startMissionsBtn', 'missionDot', 'goShopBtn', 'goMissionsBtn',
    'shopPanel', 'shopCoins', 'shopPreview', 'shopLook', 'shopGrid', 'shopHint', 'closeShopBtn',
    'missionsPanel', 'missionsBody', 'closeMissionsBtn', 'musicSlider', 'musicPct']
    .forEach(function (id) { el[id] = document.getElementById(id); });
  el.leanButtons = document.querySelectorAll('.lean-btn');
  el.fontButtons = document.querySelectorAll('.font-btn');
  el.soundButtons = document.querySelectorAll('.sound-btn');
  el.qualityButtons = document.querySelectorAll('.quality-btn');
  el.todButtons = document.querySelectorAll('.tod-btn');
  el.wxButtons = document.querySelectorAll('.wx-btn');
  el.shopTabs = document.querySelectorAll('.shop-tab');
  el.dpadButtons = document.querySelectorAll('.dpad-btn');
  el.dpadOptButtons = document.querySelectorAll('.dpad-opt');

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
  var quality = { mode: localStorage.getItem(CONFIG.QUALITY_KEY) || 'auto', level: 'high', scale: 1 };
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
    localStorage.setItem(CONFIG.LEAN_KEY, lean);
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

    ambientLight = new THREE.AmbientLight(0xffffff, 0.66);
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
    Weather.setModes(localStorage.getItem(CONFIG.TOD_KEY) || 'auto', localStorage.getItem(CONFIG.WEATHER_KEY) || 'auto');
    Weather.reset(true);

    Missions.init({
      onReward: function (n) { giveCoins(n); },
      onComplete: onMissionComplete
    });

    Particles.init(scene);
    world = new World(scene);
    hookWorld();
    player = new Player(scene);
    player.onCoin = function () { addCoins(1); };
    player.onItem = onItemCollected;
    player.onDeath = onPlayerDeath;
    player.onShieldPop = function () {
      if (GameAudio) GameAudio.pop();
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
      if (document.hidden) Missions.runEnd();
      clock.getDelta();
    });
    window.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    setupInput();
    applyTitleFont(localStorage.getItem(CONFIG.FONT_KEY) || 'bold');
    applySound((localStorage.getItem(CONFIG.SOUND_KEY) || 'on') !== 'off');
    applyDpad(localStorage.getItem(CONFIG.DPAD_KEY) === 'on');
    applyTod(Weather.timeMode());
    applyWx(Weather.weatherMode());
    setMusicUi(Music.getVolume());
    if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) {
      el.fullscreenBtn.classList.add('hidden');
    }
    if (!(navigator.share || (navigator.clipboard && navigator.clipboard.writeText))) el.shareBtn.classList.add('hidden');
    if (!IS_TOUCH) document.body.classList.add('no-touch');

    el.heroChick.innerHTML = Cosmetics.svg();
    refreshHud();
    clock = new THREE.Clock();
    animate();
  }

  function hookWorld() {
    world.onMagnetCoin = onMagnetCoin;
    world.onNearMiss = onNearMiss;
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
    camera.position.set(
      camX + CONFIG.CAMERA_OFFSET.x + sx,
      CONFIG.CAMERA_OFFSET.y + sy,
      camZ + CONFIG.CAMERA_OFFSET.z
    );
    camera.updateMatrixWorld(true);

    backdrop.position.x = camX;
    backdrop.position.z = camZ;
    // the sun sits on the opposite side from the camera so the faces you see are shaded
    var side = CONFIG.CAMERA_OFFSET.x > 0 ? -1 : 1;
    sunLight.position.set(camX + side * 9, 20, camZ - 11);
    sunLight.target.position.set(camX, 0, camZ + 1);
  }

  // How low the chicken sits on screen: -1 is the bottom edge.
  function playerScreenY() {
    tmpV.set(player.group.position.x, player.group.position.y + 0.3, player.group.position.z).project(camera);
    return tmpV.y;
  }

  // ---- input ------------------------------------------------------------
  function startGameIfNeeded() {
    if (state === 'start') {
      state = 'playing';
      document.body.classList.add('in-run');
      idleTimer = 0; // (the camera glides from the title view to the chicken)
      Missions.runStart();
      el.startPanel.classList.add('hidden');
    }
  }

  function attemptMove(dx, dz) {
    unlockAudio();
    if (state === 'gameover' || settingsOpen) return;
    startGameIfNeeded();
    player.requestMove(dx * CONFIG.INPUT_X_SIGN, dz, world);
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
          if (state === 'gameover') restart();
          else attemptMove(0, 1);
          break;
        case 'Enter':
          if (state === 'gameover') restart();
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
      press = { x: e.clientX, y: e.clientY, id: e.pointerId, done: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!press || press.done || press.id !== e.pointerId) return;
      var dx = e.clientX - press.x, dy = e.clientY - press.y;
      var ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < SWIPE) return;
      press.done = true;
      if (state === 'gameover') return;
      if (ax > ay) attemptMove(dx > 0 ? 1 : -1, 0);
      else attemptMove(0, dy < 0 ? 1 : -1);
    });
    window.addEventListener('pointerup', function (e) {
      if (!press || press.id !== e.pointerId) return;
      var wasSwipe = press.done;
      press = null;
      if (!wasSwipe && state !== 'gameover') attemptMove(0, 1);
    });
    window.addEventListener('pointercancel', function () { press = null; });

    el.playBtn.addEventListener('click', function () { attemptMove(0, 1); });
    el.restartBtn.addEventListener('click', restart);
    el.shareBtn.addEventListener('click', shareScore);
    el.fullscreenBtn.addEventListener('click', function () {
      var d = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        (d.requestFullscreen || d.webkitRequestFullscreen).call(d);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      }
    });

    // menus
    [el.settingsBtn, el.pauseBtn, el.goSettingsBtn].forEach(function (b) {
      b.addEventListener('click', function () {
        if (settingsOpen) closeModal(); else openModal(el.settingsPanel);
      });
    });
    el.closeSettingsBtn.addEventListener('click', closeModal);
    el.closeShopBtn.addEventListener('click', closeModal);
    el.closeMissionsBtn.addEventListener('click', closeModal);
    [el.startShopBtn, el.goShopBtn].forEach(function (b) { b.addEventListener('click', function () { openModal(el.shopPanel, renderShop); }); });
    [el.startMissionsBtn, el.goMissionsBtn].forEach(function (b) { b.addEventListener('click', function () { openModal(el.missionsPanel, renderMissions); }); });
    el.shopTabs.forEach(function (t) {
      t.addEventListener('click', function () {
        shopTab = t.getAttribute('data-tab');
        el.shopTabs.forEach(function (x) { x.classList.toggle('active', x === t); });
        el.shopHint.textContent = 'Tap an item to buy or wear it.';
        renderShop();
      });
    });
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
        localStorage.setItem(CONFIG.QUALITY_KEY, quality.mode);
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
    localStorage.setItem(CONFIG.FONT_KEY, font);
    el.fontButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-font') === font);
    });
  }

  function applySound(on) {
    if (GameAudio) GameAudio.setEnabled(on);
    localStorage.setItem(CONFIG.SOUND_KEY, on ? 'on' : 'off');
    el.soundButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-sound') === (on ? 'on' : 'off'));
    });
  }

  function applyDpad(on) {
    localStorage.setItem(CONFIG.DPAD_KEY, on ? 'on' : 'off');
    el.dpad.classList.toggle('show', on);
    el.dpadOptButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-dpad') === (on ? 'on' : 'off'));
    });
  }

  function applyTod(mode) {
    Weather.setModes(mode, Weather.weatherMode());
    localStorage.setItem(CONFIG.TOD_KEY, mode);
    el.todButtons.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tod') === mode); });
  }

  function applyWx(mode) {
    Weather.setModes(Weather.timeMode(), mode);
    localStorage.setItem(CONFIG.WEATHER_KEY, mode);
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
    if (GameAudio) GameAudio.setAmbience(0, 0);
    if (onOpen) onOpen();
    panel.classList.remove('hidden');
  }

  function closeModal() {
    if (!modalEl) return;
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
  var shopTab = 'skin';

  function setCoins(n) {
    totalCoins = n;
    try { localStorage.setItem(CONFIG.COINS_KEY, String(totalCoins)); } catch (e) { /* private mode */ }
    el.coins.textContent = totalCoins;
    el.startCoins.textContent = totalCoins;
    el.shopCoins.textContent = totalCoins;
  }

  function renderShop() {
    el.shopCoins.textContent = totalCoins;
    var look = Cosmetics.current();
    el.shopPreview.innerHTML = Cosmetics.svg(look);
    var worn = [look.head && look.head.name, look.face && look.face.name].filter(Boolean).join(' + ');
    el.shopLook.innerHTML = '<b>' + look.skin.name + '</b><small>' + (worn || 'No outfit') + '</small>' +
      '<small>' + Cosmetics.ownedCount() + ' / ' + Cosmetics.totalCount() + ' collected</small>';
    var items = shopTab === 'skin' ? Cosmetics.SKINS : Cosmetics.OUTFITS;
    var html = '';
    items.forEach(function (it) {
      var owned = Cosmetics.owned(shopTab, it.id);
      var worn2 = Cosmetics.isEquipped(shopTab, it.id);
      var preview = shopTab === 'skin'
        ? { skin: it, head: look.head, face: look.face }
        : { skin: look.skin, head: it.slot === 'head' ? it : null, face: it.slot === 'face' ? it : null };
      var label, cls = 'shop-item';
      if (owned) { cls += ' owned' + (worn2 ? ' equipped' : ''); label = worn2 ? (shopTab === 'skin' ? 'EQUIPPED' : 'WORN') : (shopTab === 'skin' ? 'OWNED' : 'OWNED'); }
      else { label = '🪙 ' + it.price; if (totalCoins < it.price) cls += ' poor'; }
      html += '<button class="' + cls + '" data-kind="' + shopTab + '" data-id="' + it.id + '">' +
        '<div class="si-prev">' + Cosmetics.svg(preview) + '</div>' +
        '<div class="si-name">' + it.name + '</div><div class="si-state">' + label + '</div></button>';
    });
    el.shopGrid.innerHTML = html;
  }

  function applyLookChange() {
    player.applyLook();
    el.heroChick.innerHTML = Cosmetics.svg();
  }

  function onShopItem(kind, id, btn) {
    var name = (kind === 'skin' ? Cosmetics.skinById(id) : Cosmetics.outfitById(id)).name;
    if (Cosmetics.owned(kind, id)) {
      var was = Cosmetics.isEquipped(kind, id);
      Cosmetics.equip(kind, id);
      if (GameAudio) GameAudio.equip();
      el.shopHint.textContent = kind === 'outfit' && was ? name + ' taken off.' : 'Wearing ' + name + '!';
      applyLookChange();
    } else {
      var price = Cosmetics.price(kind, id);
      if (totalCoins >= price) {
        setCoins(totalCoins - price);
        Cosmetics.buy(kind, id);
        Cosmetics.equip(kind, id);
        if (GameAudio) GameAudio.buy();
        vibrate(20);
        el.shopHint.textContent = 'Bought ' + name + '! Looking good.';
        applyLookChange();
        renderShop();
        var nb = el.shopGrid.querySelector('[data-id="' + id + '"]');
        if (nb) nb.classList.add('bought');
        return;
      }
      if (GameAudio) GameAudio.deny();
      el.shopHint.textContent = 'Need ' + (price - totalCoins) + ' more 🪙 for ' + name + '.';
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake');
      return;
    }
    renderShop();
  }

  // ---- missions --------------------------------------------------------------
  function renderMissions() {
    var v = Missions.view();
    var d = v.daily;
    var pct = function (p, t) { return Math.round(100 * p / t); };
    var html = '<div class="sec-title">DAILY CHALLENGE</div>' +
      '<div class="daily-card' + (d.done ? ' done' : '') + '">' +
      '<div class="dc-top"><span>' + d.icon + ' TODAY</span><span class="streak">🔥 ' + v.streak + ' day' + (v.streak === 1 ? '' : 's') + '</span></div>' +
      '<div class="dc-text">' + d.text + '</div>' +
      '<div class="dc-bottom"><div class="mbar"><i style="width:' + pct(d.progress, d.target) + '%"></i></div>' +
      '<span class="dc-count">' + (d.done ? '✓ DONE' : d.progress + ' / ' + d.target) + '</span>' +
      '<span class="mrew">+' + d.reward + ' 🪙</span></div>' +
      (d.done ? '<div class="mission-foot">Come back tomorrow to keep your streak going!</div>' : '') +
      '</div><div class="sec-title">MISSIONS</div>';
    v.missions.forEach(function (m) {
      html += '<div class="mrow"><span class="mi">' + m.icon + '</span><div class="mt"><div class="mtext">' + m.text + '</div>' +
        '<div class="mbar"><i style="width:' + pct(m.progress, m.target) + '%"></i></div>' +
        '<div class="mprog">' + m.progress + ' / ' + m.target + '</div></div><span class="mrew">+' + m.reward + ' 🪙</span></div>';
    });
    html += '<div class="mission-foot">Missions completed: ' + v.completed + '</div>';
    el.missionsBody.innerHTML = html;
  }

  function giveCoins(n) { setCoins(totalCoins + n); }

  function onMissionComplete(info) {
    if (GameAudio) GameAudio.missionDone();
    vibrate(40);
    if (info.kind === 'daily') {
      showToast('🏅 DAILY DONE! +' + info.reward + ' 🪙  🔥' + info.streak, '#ff8a1f');
    } else {
      showToast(info.icon + ' MISSION! +' + info.reward + ' 🪙', '#3d8bff');
    }
    Particles.sparkle(player.x, player.y + 0.8, player.z);
    updateMissionDot();
  }

  function updateMissionDot() {
    el.missionDot.classList.toggle('hidden', !Missions.dailyPending());
  }

  // ---- HUD, toasts, coins -------------------------------------------------
  function refreshHud() {
    el.score.textContent = score;
    el.bestScore.textContent = bestScore;
    el.startBest.textContent = bestScore;
    el.startCoins.textContent = totalCoins;
    el.coins.textContent = totalCoins;
    el.shopCoins.textContent = totalCoins;
    updateMissionDot();
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
    runCoins += value;
    runStats.coins += value;
    setCoins(totalCoins + value);
    Missions.event('coins', value);
    var box = el.coins.parentNode;
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
  }

  function onMagnetCoin() {
    if (GameAudio) GameAudio.coin();
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

  // A new row was reached.
  function onNewRow() {
    var z = player.maxZ;
    idleTimer = 0;
    if (hurryShown) hideHurry();

    combo.count = combo.timer > 0 ? combo.count + 1 : 1;
    combo.timer = COMBO_WINDOW;
    var mult = Math.min(5, 1 + Math.floor((combo.count - 1) / 5));
    if (mult > combo.mult) {
      if (GameAudio) GameAudio.comboUp(mult);
      popText('x' + mult + ' COMBO!', COMBO_COLORS[mult - 1]);
      el.combo.classList.remove('pop');
      void el.combo.offsetWidth;
      el.combo.classList.add('pop');
      Missions.event('combo', mult, true);
    }
    combo.mult = mult;
    runStats.maxMult = Math.max(runStats.maxMult, mult);
    runStats.maxCombo = Math.max(runStats.maxCombo, combo.count);

    score += mult;
    showScore();

    var row = world.getRow(z);
    if (row && row.type === CONFIG.ROW_TYPES.ROAD) Missions.event('roads', 1);
    else if (row && row.type === CONFIG.ROW_TYPES.WATER) Missions.event('rivers', 1);
    Missions.event('rows', z, true);
  }

  function onNearMiss() {
    if (state !== 'playing' || player.dying) return;
    var pts = 5;
    score += pts;
    showScore();
    runStats.near++;
    if (combo.count > 0) combo.timer = Math.max(combo.timer, COMBO_WINDOW * 1.5); // a close call keeps the streak alive
    if (GameAudio) GameAudio.nearMiss();
    vibrate(15);
    popText('CLOSE CALL! +' + pts, '#ffd23f');
    Missions.event('near', 1);
  }

  function updateComboHud(dt) {
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
    Missions.event('powerups', 1);
    activatePower(type, x, y, z);
  }

  function activatePower(type, x, y, z) {
    var def = CONFIG.POWERUPS[type];
    if (x === undefined) { x = player.x; y = player.y; z = player.z; }
    if (GameAudio) GameAudio.powerup();
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
      if (GameAudio) GameAudio.freeze();
    }
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
    if (GameAudio) GameAudio.blast();
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
    lastDeath = type;
    if (type === 'car' || type === 'train') { shakeT = 0.32; vibrate(70); }
    else if (type === 'drown') { shakeT = 0.12; vibrate(40); }
    else vibrate(50);
    hideHurry();
    resetCombo();
    Music.duck(0.2, 2.2);
  }

  var CAUSES = {
    car: 'Squashed by traffic!', train: 'Choo-choo! Hit by a train!',
    drown: 'Splash! Took a swim…', eagle: 'Snatched by the eagle!'
  };

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
    document.body.classList.remove('in-run');
    hideHurry();
    clearPowers();
    Missions.runEnd();
    var isBest = score > bestScore;
    if (isBest) {
      bestScore = score;
      localStorage.setItem(CONFIG.BEST_SCORE_KEY, String(bestScore));
    }
    el.goCause.textContent = CAUSES[lastDeath] || 'Game over';
    el.finalBest.textContent = bestScore;
    el.finalCoins.textContent = runCoins;
    el.goMeta.textContent = 'Row ' + player.maxZ + '  ·  Best combo x' + runStats.maxMult + '  ·  Close calls ' + runStats.near;
    el.newBest.classList.toggle('hidden', !isBest || score === 0);
    refreshHud();
    el.score.textContent = score;
    if (GameAudio) GameAudio.gameOver();
    setTimeout(function () {
      if (state !== 'gameover') return;
      if (settingsOpen) { panelHiddenForModal = el.gameOverPanel; return; }
      el.gameOverPanel.classList.remove('hidden');
      animateNumber(el.finalScore, score, 700);
      if (isBest && score > 0) launchConfetti(); else el.confetti.innerHTML = '';
    }, 250);
  }

  function shareScore() {
    var text = 'I scored ' + score + ' in Crossy Way! Can you beat me?';
    if (navigator.share) {
      navigator.share({ title: 'Crossy Way', text: text, url: location.href }).catch(function () { /* cancelled */ });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text + ' ' + location.href).then(function () {
        el.shareBtn.textContent = '✔ COPIED';
        setTimeout(function () { el.shareBtn.textContent = '⤴ SHARE'; }, 1600);
      });
    }
  }

  function restart() {
    state = 'start';
    document.body.classList.remove('in-run');
    runCoins = 0;
    score = 0;
    runStats = { coins: 0, near: 0, maxMult: 1, maxCombo: 0 };
    resetCombo();
    lastDeath = null;
    lastRow = 0;
    idleTimer = 0;
    hideHurry();
    clearPowers();
    el.gameOverPanel.classList.add('hidden');
    el.startPanel.classList.remove('hidden');
    el.confetti.innerHTML = '';
    el.pops.innerHTML = '';
    Particles.clear();
    world.destroy();
    world = new World(scene);
    hookWorld();
    player.reset();
    Weather.reset(false);
    snapToStart();
    world.update(0, camZ, 0);
    refreshHud();
    updateCamera(0, true);
  }

  function showHurry() {
    if (hurryShown) return;
    hurryShown = true;
    el.warning.classList.remove('hidden');
    if (GameAudio) GameAudio.eagleCry();
  }

  function hideHurry() {
    hurryShown = false;
    lastHurryNum = -1;
    el.warning.classList.add('hidden');
  }

  // Dawdling (no new row for a while) is the only thing that summons the eagle.
  function checkIdle() {
    if (state !== 'playing' || !player.alive || player.dying) return;
    if (idleTimer >= CONFIG.IDLE_EAGLE) {
      hideHurry();
      player.startDeath('eagle', world);
    } else if (idleTimer >= CONFIG.IDLE_WARN) {
      showHurry();
      var left = Math.ceil(CONFIG.IDLE_EAGLE - idleTimer);
      if (left !== lastHurryNum) { lastHurryNum = left; el.warning.textContent = 'HURRY! 🦅 ' + left; }
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
    if (GameAudio) GameAudio.setAmbience(quiet ? 0 : amb.traffic, quiet ? 0 : Weather.rain);
    var n = Weather.night;
    Music.setMood(n > 0.6 ? 'night' : n < 0.4 ? 'day' : null);
    wxTimer -= dt;
    if (wxTimer <= 0) { wxTimer = 0.6; el.wxBadge.textContent = Weather.label(); }

    if (state === 'playing' && !player.dying) idleTimer += dt;
    player.update(dt, world);
    updatePowers(dt);
    Particles.update(dt);
    updateCamera(dt);

    if (player.maxZ !== lastRow) {
      var prev = lastRow;
      lastRow = player.maxZ;
      if (state === 'playing' && player.maxZ > prev) onNewRow();
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
