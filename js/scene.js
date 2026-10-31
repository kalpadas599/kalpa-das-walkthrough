/* 3D meadow: a hatched, pencil-sketch world. Scroll moves the camera,
   a bee flies ahead of it and finally dances in front of the hive. */
(function () {
  var canvas = document.getElementById('scene');
  if (!canvas || !window.THREE) { document.body.classList.add('no-webgl'); return; }

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true }); }
  catch (e) { document.body.classList.add('no-webgl'); return; }

  var BG = 0xecebe6;
  renderer.setClearColor(BG);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);

  // seeded random so the meadow looks the same every visit
  var seed = 7;
  function r() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function hgt(x, z) { return Math.sin(x * 0.12) * 0.8 + Math.cos(z * 0.1) * 0.9 + Math.sin((x + z) * 0.05) * 1.2; }
  function smooth(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

  // ---------- hatching material ----------
  var VERT = [
    'varying vec3 vN; varying float vDepth;',
    'void main(){',
    '  mat4 m = modelMatrix;',
    '  #ifdef USE_INSTANCING',
    '    m = m * instanceMatrix;',
    '  #endif',
    '  vec4 wp = m * vec4(position,1.0);',
    '  vN = normalize(mat3(m) * normal);',
    '  vec4 mv = viewMatrix * wp;',
    '  vDepth = -mv.z;',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  var FRAG = [
    'uniform vec3 uColor; uniform vec3 uInk; uniform vec3 uFog; uniform vec3 uLight;',
    'uniform float uHatch; uniform float uNear; uniform float uFar;',
    'varying vec3 vN; varying float vDepth;',
    'float ln(float v, float w){ float f = fract(v); return smoothstep(0.0,0.1,f) * (1.0 - smoothstep(w,w+0.1,f)); }',
    'void main(){',
    '  float d = dot(normalize(vN), uLight) * 0.5 + 0.5;',
    '  vec2 p = gl_FragCoord.xy; float s = 5.0; float h = 0.0;',
    '  if (d < 0.82) h = max(h, ln((p.x + p.y) / s, 0.35));',
    '  if (d < 0.58) h = max(h, ln((p.x - p.y) / s, 0.35));',
    '  if (d < 0.36) h = max(h, ln(p.x / s, 0.45));',
    '  vec3 col = mix(uColor * (0.78 + 0.22 * d), uInk, h * 0.6 * uHatch);',
    '  float f = smoothstep(uNear, uFar, vDepth);',
    '  gl_FragColor = vec4(mix(col, uFog, f), 1.0);',
    '}'
  ].join('\n');
  function mat(color, hatch, side) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) }, uInk: { value: new THREE.Color(0x24262b) },
        uFog: { value: new THREE.Color(BG) }, uLight: { value: new THREE.Vector3(0.45, 0.8, 0.4).normalize() },
        uHatch: { value: hatch == null ? 1 : hatch }, uNear: { value: 14 }, uFar: { value: 75 }
      },
      vertexShader: VERT, fragmentShader: FRAG, side: side || THREE.FrontSide
    });
  }
  var dummy = new THREE.Object3D();
  var INK = new THREE.MeshBasicMaterial({ color: 0x1d1e22, side: THREE.BackSide });

  // ---------- ground ----------
  var gg = new THREE.PlaneGeometry(150, 160, 110, 110);
  gg.rotateX(-Math.PI / 2); gg.translate(0, 0, -35);
  var gp = gg.attributes.position;
  for (var i = 0; i < gp.count; i++) gp.setY(i, hgt(gp.getX(i), gp.getZ(i)));
  gg.computeVertexNormals();
  scene.add(new THREE.Mesh(gg, mat(0xe3e1da, 0.9)));

  // ---------- grass ----------
  var GN = 6500;
  var gGeo = new THREE.ConeGeometry(0.045, 1, 3); gGeo.translate(0, 0.5, 0);
  var grass = new THREE.InstancedMesh(gGeo, mat(0x8f8e87, 0.5), GN);
  for (i = 0; i < GN; i++) {
    var gx = (r() - 0.5) * 80, gz = -75 + r() * 95;
    dummy.position.set(gx, hgt(gx, gz), gz);
    dummy.rotation.set((r() - 0.5) * 0.45, r() * 6.3, (r() - 0.5) * 0.45);
    dummy.scale.set(1, 0.6 + r() * 1.1, 1);
    dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
  }
  scene.add(grass);

  // ---------- daisies ----------
  var FN = 70, PET = 8;
  var stemG = new THREE.CylinderGeometry(0.03, 0.045, 1, 5); stemG.translate(0, 0.5, 0);
  var stems = new THREE.InstancedMesh(stemG, mat(0x77766f, 0.6), FN);
  var petals = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 7, 5), mat(0xf6f5f0, 1), FN * PET);
  var centers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), mat(0xe0a92a, 0.5), FN);
  var fl = new THREE.Object3D(), pt = new THREE.Object3D(), mm = new THREE.Matrix4();
  for (i = 0; i < FN; i++) {
    var fx = (r() - 0.5) * 36, fz = -34 + r() * 38, fh = 1.1 + r() * 1.6, fs = 0.5 + r() * 0.45;
    dummy.position.set(fx, hgt(fx, fz), fz);
    dummy.rotation.set((r() - 0.5) * 0.2, 0, (r() - 0.5) * 0.2);
    dummy.scale.set(1, fh, 1); dummy.updateMatrix(); stems.setMatrixAt(i, dummy.matrix);
    fl.position.set(fx, hgt(fx, fz) + fh, fz);
    fl.rotation.set(-0.5 - r() * 0.7, (r() - 0.5) * 1.2, 0); fl.scale.set(fs, fs, fs); fl.updateMatrix();
    for (var j = 0; j < PET; j++) {
      var a = j / PET * Math.PI * 2;
      pt.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
      pt.rotation.set(0, -a, 0); pt.scale.set(0.55, 0.08, 0.2); pt.updateMatrix();
      mm.multiplyMatrices(fl.matrix, pt.matrix); petals.setMatrixAt(i * PET + j, mm);
    }
    centers.setMatrixAt(i, fl.matrix);
  }
  scene.add(stems, petals, centers);

  // ---------- puffball trees ----------
  var TN = 22;
  var tStemG = new THREE.CylinderGeometry(0.06, 0.09, 1, 6); tStemG.translate(0, 0.5, 0);
  var tStems = new THREE.InstancedMesh(tStemG, mat(0x9a9992, 0.7), TN);
  var tHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), mat(0xe2e0d9, 1), TN);
  for (i = 0; i < TN; i++) {
    var side = r() < 0.5 ? -1 : 1;
    var tx = side * (7 + r() * 24), tz = -5 - r() * 55, th = 3 + r() * 4, tr = 0.9 + r() * 1.1, ty = hgt(tx, tz);
    dummy.position.set(tx, ty, tz); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, th, 1);
    dummy.updateMatrix(); tStems.setMatrixAt(i, dummy.matrix);
    dummy.position.set(tx, ty + th, tz); dummy.scale.set(tr, tr * 0.85, tr);
    dummy.updateMatrix(); tHeads.setMatrixAt(i, dummy.matrix);
  }
  scene.add(tStems, tHeads);

  // ---------- hive ----------
  var HX = 3, HZ = -18, HY = hgt(HX, HZ);
  var prof = [];
  for (i = 0; i <= 28; i++) {
    var yy = i / 28 * 4.4, rr = 2.5 * Math.sqrt(Math.max(0, 1 - Math.pow(yy / 4.4, 2))) * (1 + 0.05 * Math.sin(yy * 9));
    prof.push(new THREE.Vector2(Math.max(rr, 0.001), yy));
  }
  var hiveG = new THREE.LatheGeometry(prof, 36);
  var hive = new THREE.Group();
  hive.add(new THREE.Mesh(hiveG, mat(0xdcd9cf, 1)));
  var hiveOut = new THREE.Mesh(hiveG, INK); hiveOut.scale.set(1.025, 1.012, 1.025); hive.add(hiveOut);
  var door = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), new THREE.MeshBasicMaterial({ color: 0x1d1e22 }));
  door.scale.set(1, 1.25, 1); door.position.set(0, 1.0, 2.43); hive.add(door);
  hive.position.set(HX, HY, HZ); hive.scale.setScalar(1.8);
  scene.add(hive);

  // ---------- sun (line art, far away) ----------
  var sun = new THREE.Group();
  [4, 5.3, 6.6].forEach(function (rad, k) {
    sun.add(new THREE.Mesh(new THREE.RingGeometry(rad, rad + 0.07, 72), new THREE.MeshBasicMaterial({ color: 0x2a2b30, transparent: true, opacity: 0.45 - k * 0.1 })));
  });
  var rp = [];
  for (i = 0; i < 48; i++) { var ra = i / 48 * Math.PI * 2, r0 = 7.6 + (i % 2) * 0.6, r1 = 9 + (i % 3) * 0.5; rp.push(Math.cos(ra) * r0, Math.sin(ra) * r0, 0, Math.cos(ra) * r1, Math.sin(ra) * r1, 0); }
  var rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  sun.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x2a2b30, transparent: true, opacity: 0.35 })));
  sun.position.set(-18, 16, -85); sun.scale.setScalar(1.3);
  scene.add(sun);

  // ---------- bee ----------
  var bee = new THREE.Group(), YEL = mat(0xf4b92f, 0.6), BLK = mat(0x2a2b30, 0.2);
  function part(geo, m, x, y, z, sx, sy, sz, outline) {
    var g = new THREE.Group(), me = new THREE.Mesh(geo, m); g.add(me);
    if (outline) { var o = new THREE.Mesh(geo, INK); o.scale.setScalar(1.09); g.add(o); }
    g.position.set(x, y, z); g.scale.set(sx, sy, sz); bee.add(g); return g;
  }
  var sph = new THREE.SphereGeometry(0.5, 14, 10);
  part(sph, YEL, 0, 0, 0, 0.8, 0.8, 0.85, true);
  part(sph, YEL, 0, -0.02, -0.72, 0.95, 0.9, 1.35, true);
  part(sph, BLK, 0, 0.02, 0.58, 0.58, 0.58, 0.55, true);
  [-0.12, -0.5, -0.9].forEach(function (z, k) {
    var s = 0.93 - k * 0.09;
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.08, 6, 20), BLK);
    ring.position.set(0, -0.02, -0.55 + z * 0.72 - 0.0); ring.scale.set(s, s * 0.95, 1); bee.add(ring);
  });
  var sting = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), BLK); sting.rotation.x = -Math.PI / 2; sting.position.set(0, -0.02, -1.5); bee.add(sting);
  var wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  var wingG = new THREE.PlaneGeometry(1.15, 0.5); wingG.rotateX(-Math.PI / 2); wingG.translate(0.58, 0, 0);
  var wingEdge = new THREE.LineSegments(new THREE.EdgesGeometry(wingG), new THREE.LineBasicMaterial({ color: 0x1d1e22 }));
  var wL = new THREE.Group(), wR = new THREE.Group();
  wL.add(new THREE.Mesh(wingG, wingMat), wingEdge.clone());
  wR.add(new THREE.Mesh(wingG, wingMat), wingEdge.clone()); wR.scale.x = -1;
  wL.position.set(0.15, 0.38, 0.05); wR.position.set(-0.15, 0.38, 0.05);
  bee.add(wL, wR);
  bee.scale.setScalar(0.8);
  scene.add(bee);

  // dotted trail
  var TR = 70, trailPts = [], tArr = new Float32Array(TR * 3);
  var tGeo = new THREE.BufferGeometry(); tGeo.setAttribute('position', new THREE.BufferAttribute(tArr, 3));
  var cv = document.createElement('canvas'); cv.width = cv.height = 32;
  var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(16, 16, 15, 0, 6.3); cx.fill();
  var trail = new THREE.Points(tGeo, new THREE.PointsMaterial({ size: 0.28, map: new THREE.CanvasTexture(cv), color: 0xf2b632, transparent: true, opacity: 0.85, depthWrite: false }));
  trail.frustumCulled = false; scene.add(trail);

  // ---------- camera path (driven by scroll) ----------
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var camCurve = new THREE.CatmullRomCurve3([
    V(0, 4.8, 15), V(2, 4.4, 9), V(-3, 3.8, 4), V(1.5, 4.2, 1), V(6, 4.6, -1), V(5, HY + 5.6, 8)
  ]);
  var lookCurve = new THREE.CatmullRomCurve3([
    V(3, HY + 3.4, -17), V(3, 3.2, -14), V(1.5, 3, -13), V(3, HY + 3.6, -17), V(3, HY + 3.6, -17), V(3, HY + 4.2, -15)
  ]);

  var target = 0, cur = 0, active = true, last = performance.now() / 1000, tTrail = 0;
  var camPos = new THREE.Vector3(), lookPos = new THREE.Vector3(), dir = new THREE.Vector3(),
      side3 = new THREE.Vector3(), ahead = new THREE.Vector3(), bp = new THREE.Vector3(),
      dance = new THREE.Vector3(), prev = new THREE.Vector3(), vel = new THREE.Vector3(), aim = new THREE.Vector3();
  var UP = new THREE.Vector3(0, 1, 0);

  window.__setProgress = function (p) { target = p; };
  window.__sceneActive = function (on) { active = on; };

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // narrower screens: pull back a little so scene still reads
    camera.fov = w < 700 ? 58 : 45; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  function loop() {
    requestAnimationFrame(loop);
    if (!active) return;
    var now = performance.now() / 1000, dt = Math.min(0.05, now - last); last = now;
    cur += (target - cur) * Math.min(1, dt * 4);
    var c = Math.min(0.999, Math.max(0, cur));

    camCurve.getPoint(c, camPos); lookCurve.getPoint(c, lookPos);
    camPos.y += Math.sin(now * 0.6) * 0.06;
    camera.position.copy(camPos); camera.lookAt(lookPos);

    // bee flies ahead of the camera, then dances in front of the hive
    dir.copy(lookPos).sub(camPos).normalize();
    side3.crossVectors(dir, UP).normalize();
    ahead.copy(camPos).addScaledVector(dir, 11);
    bp.copy(ahead).addScaledVector(side3, Math.sin(now * 0.9) * 1.3 + 0.9);
    bp.y += Math.sin(now * 1.7) * 0.35 + 0.5;
    var w = smooth(0.62, 0.9, cur);
    var a = now * 1.5, den = 1 + Math.sin(a) * Math.sin(a);
    dance.set(HX + 3.2 + 3.2 * Math.cos(a) / den, HY + 3.4 + 1.8 * Math.sin(a) * Math.cos(a) / den, HZ + 6);
    bp.lerp(dance, w);
    prev.copy(bee.position);
    bee.position.lerp(bp, Math.min(1, dt * 5));
    vel.copy(bee.position).sub(prev);
    if (vel.lengthSq() > 1e-7) { aim.copy(bee.position).add(vel.multiplyScalar(30)); bee.lookAt(aim); }
    bee.scale.setScalar(0.8 + 0.55 * w);
    bee.rotateZ(Math.sin(now * 28) * 0.06 * (0.4 + w));
    var flap = Math.sin(now * 70) * 0.55;
    wL.rotation.z = flap; wR.rotation.z = -flap;

    // trail
    tTrail += dt;
    if (tTrail > 0.045) {
      tTrail = 0; trailPts.unshift(bee.position.x, bee.position.y, bee.position.z - 0.0);
      if (trailPts.length > TR * 3) trailPts.length = TR * 3;
      for (var k = 0; k < TR * 3; k++) tArr[k] = trailPts[k] !== undefined ? trailPts[k] : trailPts[k % 3];
      tGeo.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  loop();
})();
