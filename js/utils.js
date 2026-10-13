// Small shared helper functions used across game modules.
var Utils = {
  randRange: function (min, max) {
    return min + Math.random() * (max - min);
  },
  randInt: function (min, max) {
    return Math.floor(Utils.randRange(min, max + 1));
  },
  choice: function (arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },
  weightedChoice: function (items) {
    // items: [{value, weight}]
    var total = 0;
    for (var i = 0; i < items.length; i++) total += items[i].weight;
    var r = Math.random() * total;
    for (var j = 0; j < items.length; j++) {
      r -= items[j].weight;
      if (r <= 0) return items[j].value;
    }
    return items[items.length - 1].value;
  },
  clamp: function (v, min, max) {
    return Math.max(min, Math.min(max, v));
  },
  lerp: function (a, b, t) {
    return a + (b - a) * t;
  },
  lerpAngle: function (a, b, t) {
    var diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    diff = diff < -Math.PI ? diff + Math.PI * 2 : diff;
    return a + diff * t;
  },
  easeOutQuad: function (t) {
    return t * (2 - t);
  },
  // arc-shaped ease for a hop: 0 -> 0, 0.5 -> 1, 1 -> 0
  hopArc: function (t) {
    return Math.sin(Math.PI * Utils.clamp(t, 0, 1));
  },

  // amt > 0 lightens toward white, amt < 0 darkens toward black. Returns a hex number.
  shade: function (hex, amt) {
    var r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    var target = amt > 0 ? 255 : 0, k = Math.abs(amt);
    function adj(v) { return Math.round(v + (target - v) * k); }
    return (adj(r) << 16) | (adj(g) << 8) | adj(b);
  },

  // One MeshLambertMaterial per color/opacity combo, shared by every mesh.
  _sharedMatCache: {},
  sharedMaterial: function (color, opts) {
    opts = opts || {};
    var key = color + ':' + (opts.transparent ? 1 : 0) + ':' + (opts.opacity !== undefined ? opts.opacity : 1);
    var cache = Utils._sharedMatCache;
    if (!cache[key]) {
      var mat = new THREE.MeshLambertMaterial({ color: color, transparent: !!opts.transparent, opacity: opts.opacity !== undefined ? opts.opacity : 1 });
      mat.__shared = true;
      cache[key] = mat;
    }
    return cache[key];
  },
  makeBoxMesh: function (w, h, d, color, opts) {
    opts = opts || {};
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Utils.sharedMaterial(color, opts));
    mesh.castShadow = opts.castShadow !== false;
    mesh.receiveShadow = opts.receiveShadow !== false;
    return mesh;
  },

  // ---- voxel meshes ---------------------------------------------------
  // Every prop (tree, car, train, eagle...) is described as a list of colored
  // boxes {x,y,z,w,h,d,color} (centered) and baked into ONE vertex-colored
  // mesh: the chunky voxel look at one draw call per object.
  _voxelMat: null,
  voxelMaterial: function () {
    if (!Utils._voxelMat) {
      Utils._voxelMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      Utils._voxelMat.__shared = true;
    }
    return Utils._voxelMat;
  },
  voxelGeometry: function (boxes) {
    var geos = boxes.map(function (b) {
      var g = new THREE.BoxGeometry(b.w, b.h, b.d);
      if (b.rx || b.ry || b.rz) {
        g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(b.rx || 0, b.ry || 0, b.rz || 0)));
      }
      var c = new THREE.Color(b.color);
      var n = g.attributes.position.count;
      var arr = new Float32Array(n * 3);
      // baked "ambient occlusion": the bottom of every box is a touch darker, which
      // grounds objects and gives the voxels more depth
      var pos = g.attributes.position;
      for (var i = 0; i < n; i++) {
        var k = 0.84 + 0.16 * Math.min(1, Math.max(0, (pos.getY(i) + b.h / 2) / b.h));
        arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k;
      }
      g.translate(b.x || 0, b.y || 0, b.z || 0);
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      return g;
    });
    var merged = THREE.BufferGeometryUtils.mergeBufferGeometries(geos);
    geos.forEach(function (g) { g.dispose(); });
    return merged;
  },
  voxelMesh: function (boxes, opts) {
    opts = opts || {};
    var mesh = new THREE.Mesh(Utils.voxelGeometry(boxes), opts.material || Utils.voxelMaterial());
    mesh.castShadow = opts.castShadow !== false;
    mesh.receiveShadow = opts.receiveShadow !== false;
    return mesh;
  },

  // Frees GPU resources for an Object3D subtree. Anything flagged __shared
  // (cached materials / geometries) is deliberately left alone.
  disposeObject3D: function (obj) {
    if (!obj) return;
    obj.traverse(function (o) {
      if (o.geometry && !o.geometry.__shared) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(function (m) { if (!m.__shared) m.dispose(); });
        else if (!o.material.__shared) o.material.dispose();
      }
    });
  }
};
