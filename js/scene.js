/* 3D meadow: hatched pencil-sketch world.
   Scroll: ground view -> bee dance at the hive -> rises into a top-down view of the field.
   Always alive: a swarm of bees flies hive <-> flowers, butterflies, drifting seeds, clouds. */
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
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

  var seed = 7;
  function r() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function hgt(x, z) { return Math.sin(x * 0.12) * 0.8 + Math.cos(z * 0.1) * 0.9 + Math.sin((x + z) * 0.05) * 1.2; }
  function smooth(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };

  // ---------- hatching material ----------
  var UF = { near: { value: 14 }, far: { value: 75 } };      // shared fog (grows in top view)
  var LIGHT = new THREE.Vector3(0.45, 0.8, 0.4).normalize();
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
    'uniform float uHatch; uniform float uNear; uniform float uFar; uniform float uDark;',
    'varying vec3 vN; varying float vDepth;',
    'float ln(float v, float w){ float f = fract(v); return smoothstep(0.0,0.1,f) * (1.0 - smoothstep(w,w+0.1,f)); }',
    'void main(){',
    '  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;',
    '  float d = dot(n, uLight) * 0.5 + 0.5 - uDark;',
    '  vec2 p = gl_FragCoord.xy; float s = 5.0; float h = 0.0;',
    '  if (d < 0.82) h = max(h, ln((p.x + p.y) / s, 0.35));',
    '  if (d < 0.58) h = max(h, ln((p.x - p.y) / s, 0.35));',
    '  if (d < 0.36) h = max(h, ln(p.x / s, 0.45));',
    '  vec3 col = mix(uColor * (0.78 + 0.22 * d), uInk, h * 0.6 * uHatch);',
    '  float f = smoothstep(uNear, uFar, vDepth);',
    '  gl_FragColor = vec4(mix(col, uFog, f), 1.0);',
    '}'
  ].join('\n');
  function mat(color, hatch, side, dark, poly) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) }, uInk: { value: new THREE.Color(0x24262b) },
        uFog: { value: new THREE.Color(BG) }, uLight: { value: LIGHT },
        uHatch: { value: hatch == null ? 1 : hatch }, uDark: { value: dark || 0 },
        uNear: UF.near, uFar: UF.far
      },
      vertexShader: VERT, fragmentShader: FRAG, side: side || THREE.FrontSide,
      polygonOffset: !!poly, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    });
  }
  var dummy = new THREE.Object3D();
  var INK = new THREE.MeshBasicMaterial({ color: 0x1d1e22, side: THREE.BackSide });

  // ---------- ground ----------
  var gg = new THREE.PlaneGeometry(170, 180, 120, 120);
  gg.rotateX(-Math.PI / 2); gg.translate(0, 0, -35);
  var gp = gg.attributes.position;
  for (var i = 0; i < gp.count; i++) gp.setY(i, hgt(gp.getX(i), gp.getZ(i)));
  gg.computeVertexNormals();
  scene.add(new THREE.Mesh(gg, mat(0xe4e2db, 0.3, null, 0.1)));

  // flat ribbon that follows the ground (river shadow band / paths)
  function ribbon(curve, width, n, yoff, material) {
    var pos = [], nor = [], idx = [];
    for (var k = 0; k <= n; k++) {
      var t = k / n, p = curve.getPoint(t), tg = curve.getTangent(t);
      var nx = -tg.z, nz = tg.x, L = Math.sqrt(nx * nx + nz * nz) || 1; nx /= L; nz /= L;
      for (var s = -1; s <= 1; s += 2) {
        var x = p.x + nx * s * width / 2, z = p.z + nz * s * width / 2;
        pos.push(x, hgt(x, z) + yoff, z); nor.push(0, 1, 0);
      }
    }
    for (k = 0; k < n; k++) { var a = 2 * k; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    return new THREE.Mesh(g, material);
  }
  // hatched "stream" band across the field (the dark diagonal patch seen from above)
  var riverCurve = new THREE.CatmullRomCurve3([V(34, 0, -62), V(22, 0, -42), V(15, 0, -28), V(17, 0, -12), V(26, 0, 2), V(38, 0, 16)]);
  scene.add(ribbon(riverCurve, 11, 70, 0.1, mat(0xd2d0c7, 1, THREE.DoubleSide, 0.5, true)));
  var river2 = new THREE.CatmullRomCurve3([V(-34, 0, -70), V(-24, 0, -52), V(-18, 0, -38)]);
  scene.add(ribbon(river2, 7, 30, 0.1, mat(0xd8d6cd, 1, THREE.DoubleSide, 0.42, true)));

  // ---------- grass ----------
  var GN = 6500;
  var gGeo = new THREE.ConeGeometry(0.045, 1, 3); gGeo.translate(0, 0.5, 0);
  var grass = new THREE.InstancedMesh(gGeo, mat(0x8f8e87, 0.5), GN);
  for (i = 0; i < GN; i++) {
    var gx = (r() - 0.5) * 90, gz = -85 + r() * 105;
    dummy.position.set(gx, hgt(gx, gz), gz);
    dummy.rotation.set((r() - 0.5) * 0.45, r() * 6.3, (r() - 0.5) * 0.45);
    dummy.scale.set(1, 0.6 + r() * 1.1, 1);
    dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
  }
  scene.add(grass);

  // ---------- daisies (also stored as landing spots for bees) ----------
  var FN = 230, PET = 8, FP = [];
  var stemG = new THREE.CylinderGeometry(0.03, 0.045, 1, 5); stemG.translate(0, 0.5, 0);
  var stems = new THREE.InstancedMesh(stemG, mat(0x77766f, 0.6), FN);
  var petals = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 7, 5), mat(0xf6f5f0, 1), FN * PET);
  var centers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), mat(0xe0a92a, 0.5), FN);
  var fl = new THREE.Object3D(), pt = new THREE.Object3D(), mm = new THREE.Matrix4();
  for (i = 0; i < FN; i++) {
    var fx = (r() - 0.5) * 64, fz = -48 + r() * 56, fh = 1.1 + r() * 1.6, fs = 0.55 + r() * 0.5;
    var fy = hgt(fx, fz);
    dummy.position.set(fx, fy, fz);
    dummy.rotation.set((r() - 0.5) * 0.2, 0, (r() - 0.5) * 0.2);
    dummy.scale.set(1, fh, 1); dummy.updateMatrix(); stems.setMatrixAt(i, dummy.matrix);
    fl.position.set(fx, fy + fh, fz);
    fl.rotation.set(-0.35 - r() * 0.5, (r() - 0.5) * 1.2, 0); fl.scale.set(fs, fs, fs); fl.updateMatrix();
    FP.push(V(fx, fy + fh, fz));
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
  var TN = 30;
  var tStemG = new THREE.CylinderGeometry(0.06, 0.09, 1, 6); tStemG.translate(0, 0.5, 0);
  var tStems = new THREE.InstancedMesh(tStemG, mat(0x9a9992, 0.7), TN);
  var tHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), mat(0xe2e0d9, 1), TN);
  for (i = 0; i < TN; i++) {
    var side = r() < 0.5 ? -1 : 1;
    var tx = side * (9 + r() * 30), tz = -4 - r() * 62, th = 3 + r() * 4, tr = 0.9 + r() * 1.1, ty = hgt(tx, tz);
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
  var doorM = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), new THREE.MeshBasicMaterial({ color: 0x1d1e22 }));
  doorM.scale.set(1, 1.25, 1); doorM.position.set(0, 1.0, 2.43); hive.add(doorM);
  hive.position.set(HX, HY, HZ); hive.scale.setScalar(1.8);
  scene.add(hive);
  var DOOR = V(HX, HY + 1.7, HZ + 4.5);

  // ---------- landing pad: red dashed ring + hatched disc ----------
  var PX = -13, PZ = -11, PY = hgt(PX, PZ);
  var padG = new THREE.CircleGeometry(3.4, 40); padG.rotateX(-Math.PI / 2);
  var pp = padG.attributes.position;
  for (i = 0; i < pp.count; i++) pp.setY(i, hgt(PX + pp.getX(i), PZ + pp.getZ(i)) + 0.12);
  var pad = new THREE.Mesh(padG, mat(0xcfcdc4, 1, THREE.DoubleSide, 0.5, true)); pad.position.set(PX, 0, PZ); scene.add(pad);
  var DN = 30, dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.07, 0.16), mat(0xe2431f, 0, null, 0, true), DN);
  for (i = 0; i < DN; i++) {
    var da = i / DN * Math.PI * 2, dx = PX + Math.cos(da) * 3.5, dz = PZ + Math.sin(da) * 3.5;
    dummy.position.set(dx, hgt(dx, dz) + 0.16, dz); dummy.rotation.set(0, -(da + Math.PI / 2), 0); dummy.scale.set(1, 1, 1);
    dummy.updateMatrix(); dashes.setMatrixAt(i, dummy.matrix);
  }
  scene.add(dashes);

  // ---------- dotted yellow trail on the ground (hive -> pad -> beyond) ----------
  var pathCurve = new THREE.CatmullRomCurve3([V(HX, 0, HZ + 5), V(0, 0, -13), V(-6, 0, -12), V(PX + 3.4, 0, PZ - 0.5)]);
  var PDN = Math.floor(pathCurve.getLength() / 0.8);
  var pathDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 6, 4), mat(0xf2b632, 0), PDN);
  for (i = 0; i < PDN; i++) {
    var pv = pathCurve.getPointAt(i / PDN);
    dummy.position.set(pv.x, hgt(pv.x, pv.z) + 0.2, pv.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 0.4, 1);
    dummy.updateMatrix(); pathDots.setMatrixAt(i, dummy.matrix);
  }
  scene.add(pathDots);

  // ---------- red mushrooms ----------
  var MN = 9;
  var mStem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 7), mat(0xf1efe8, 0.8), MN);
  var mCap = new THREE.InstancedMesh(new THREE.SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe2431f, 0.5), MN);
  var mPos = [[5.5, -13], [7.5, -15], [-1, -14.5], [-2.5, -11], [-9, -5], [-5.5, -3], [4, -4], [1, -2], [8, -9]];
  for (i = 0; i < MN; i++) {
    var mx = mPos[i][0], mz = mPos[i][1], my = hgt(mx, mz), ms = 0.55 + r() * 0.5;
    dummy.position.set(mx, my + 0.3 * ms, mz); dummy.rotation.set(0, 0, 0); dummy.scale.set(ms, ms, ms);
    dummy.updateMatrix(); mStem.setMatrixAt(i, dummy.matrix);
    dummy.position.set(mx, my + 0.6 * ms, mz); dummy.scale.set(ms, ms * 0.8, ms);
    dummy.updateMatrix(); mCap.setMatrixAt(i, dummy.matrix);
  }
  scene.add(mStem, mCap);

  // ---------- clouds (ground view only) ----------
  var clouds = new THREE.Group(), cm = mat(0xf4f3ee, 0.8);
  for (i = 0; i < 6; i++) {
    var cg = new THREE.Group();
    for (j = 0; j < 4; j++) {
      var cb = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), cm);
      cb.position.set(j * 1.6 - 2.4, Math.sin(j * 1.7) * 0.4, 0); cb.scale.set(1.8 + r(), 0.8 + r() * 0.3, 1.2);
      cg.add(cb);
    }
    cg.position.set(-60 + i * 24, 22 + r() * 8, -70 - r() * 30); clouds.add(cg);
  }
  scene.add(clouds);

  // ---------- sun ----------
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

  // ---------- bee factory ----------
  var YEL = mat(0xf4b92f, 0.6), BLK = mat(0x2a2b30, 0.2);
  var sph = new THREE.SphereGeometry(0.5, 14, 10);
  var wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  var wingG = new THREE.PlaneGeometry(1.15, 0.5); wingG.rotateX(-Math.PI / 2); wingG.translate(0.58, 0, 0);
  var wingEdge = new THREE.LineSegments(new THREE.EdgesGeometry(wingG), new THREE.LineBasicMaterial({ color: 0x1d1e22 }));
  var ringG = new THREE.TorusGeometry(0.47, 0.08, 6, 20), stingG = new THREE.ConeGeometry(0.08, 0.3, 6);
  function makeBee(scale) {
    var g = new THREE.Group();
    function part(geo, m, x, y, z, sx, sy, sz) {
      var pg = new THREE.Group(); pg.add(new THREE.Mesh(geo, m));
      var o = new THREE.Mesh(geo, INK); o.scale.setScalar(1.09); pg.add(o);
      pg.position.set(x, y, z); pg.scale.set(sx, sy, sz); g.add(pg);
    }
    part(sph, YEL, 0, 0, 0, 0.8, 0.8, 0.85);
    part(sph, YEL, 0, -0.02, -0.72, 0.95, 0.9, 1.35);
    part(sph, BLK, 0, 0.02, 0.58, 0.58, 0.58, 0.55);
    [-0.12, -0.5, -0.9].forEach(function (z, k) {
      var s = 0.93 - k * 0.09, ring = new THREE.Mesh(ringG, BLK);
      ring.position.set(0, -0.02, -0.55 + z * 0.72); ring.scale.set(s, s * 0.95, 1); g.add(ring);
    });
    var st = new THREE.Mesh(stingG, BLK); st.rotation.x = -Math.PI / 2; st.position.set(0, -0.02, -1.5); g.add(st);
    var wL = new THREE.Group(), wR = new THREE.Group();
    wL.add(new THREE.Mesh(wingG, wingMat), wingEdge.clone());
    wR.add(new THREE.Mesh(wingG, wingMat), wingEdge.clone()); wR.scale.x = -1;
    wL.position.set(0.15, 0.38, 0.05); wR.position.set(-0.15, 0.38, 0.05);
    g.add(wL, wR); g.scale.setScalar(scale); scene.add(g);
    return { g: g, wL: wL, wR: wR };
  }
  function flap(b, speed, amp, now) { var f = Math.sin(now * speed) * amp; b.wL.rotation.z = f; b.wR.rotation.z = -f; }

  var main = makeBee(0.8);

  // ---------- swarm: bees fly hive <-> flowers all the time ----------
  var TAGS = ['React', 'Py', 'AI', 'Flutter', 'Azure', 'SQL', 'Git', 'Node'];
  function badgeTex(txt) {
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
    g.fillStyle = '#2a2b30'; g.beginPath(); g.arc(64, 64, 58, 0, 6.3); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 52, 0, 6.3); g.stroke();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = '700 ' + (txt.length > 4 ? 28 : 38) + 'px sans-serif'; g.fillText(txt, 64, txt.length > 4 ? 74 : 78);
    return new THREE.CanvasTexture(c);
  }
  var SW = 8, swarm = [], TH = 14, sTrail = new Float32Array(SW * TH * 3);
  function pickFlower(s) {
    var f, n = 0;
    do { f = FP[(Math.random() * FP.length) | 0]; n++; } while ((f.distanceTo(DOOR) > 24 || f.distanceTo(DOOR) < 4) && n < 60);
    s.to.copy(f); s.to.y += 0.5;
  }
  function flyDur(s) { return Math.max(1.2, s.from.distanceTo(s.to) / (2.6 + Math.random() * 1.6)); }
  for (i = 0; i < SW; i++) {
    var sb = makeBee(0.5 + (i % 3) * 0.04);
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(TAGS[i % TAGS.length]), transparent: true, opacity: 0, depthWrite: false }));
    spr.scale.set(1.5, 1.5, 1); scene.add(spr);
    var s = { b: sb, spr: spr, k: i, mode: 3, wait: i * 0.9, t: 0, dur: 2, p: DOOR.clone(), prev: DOOR.clone(), from: DOOR.clone(), to: DOOR.clone(), hist: [] };
    swarm.push(s);
  }
  var sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sTrail, 3));
  var cv = document.createElement('canvas'); cv.width = cv.height = 32;
  var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(16, 16, 15, 0, 6.3); cx.fill();
  var dotTex = new THREE.CanvasTexture(cv);
  var sPoints = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.2, map: dotTex, color: 0xf2b632, transparent: true, opacity: 0.8, depthWrite: false }));
  sPoints.frustumCulled = false; scene.add(sPoints);

  function stepSwarm(s, dt, now) {
    s.prev.copy(s.p);
    if (s.mode === 0 || s.mode === 2) {
      s.t += dt / s.dur; var t = Math.min(1, s.t), e = t * t * (3 - 2 * t), arc = Math.sin(Math.PI * t);
      s.p.lerpVectors(s.from, s.to, e);
      s.p.y += arc * 2.4 + Math.sin(now * 3 + s.k) * 0.12;
      s.p.x += Math.sin(now * 2.1 + s.k * 2) * 0.5 * arc; s.p.z += Math.cos(now * 1.7 + s.k) * 0.5 * arc;
      if (t >= 1) { s.mode = s.mode === 0 ? 1 : 3; s.wait = s.mode === 1 ? 1.4 + Math.random() * 2 : 0.5 + Math.random() * 1.5; s.t = 0; }
    } else {
      s.wait -= dt; s.p.y += Math.sin(now * 5 + s.k) * 0.01;
      if (s.wait <= 0) {
        if (s.mode === 1) { s.from.copy(s.to); s.to.copy(DOOR); s.mode = 2; }
        else { s.from.copy(DOOR); pickFlower(s); s.mode = 0; }
        s.dur = flyDur(s); s.t = 0;
      }
    }
    s.b.g.position.copy(s.p);
    var moving = s.mode === 0 || s.mode === 2;
    var vel = s.p.clone().sub(s.prev);
    if (moving && vel.lengthSq() > 1e-8) { var aim = s.p.clone().add(vel.multiplyScalar(40)); s.b.g.lookAt(aim); }
    flap(s.b, moving ? 75 : 40, 0.55, now + s.k);
    s.spr.position.set(s.p.x + 0.7, s.p.y + 1.0, s.p.z - 0.6);
    // trail history
    s.hist.unshift(s.p.x, s.p.y, s.p.z); if (s.hist.length > TH * 3) s.hist.length = TH * 3;
    for (var q = 0; q < TH * 3; q++) sTrail[s.k * TH * 3 + q] = s.hist[q] !== undefined ? s.hist[q] : s.hist[q % 3];
  }

  // ---------- butterflies ----------
  var bflies = [], bCols = [0xe2431f, 0xf2b632, 0xffffff];
  var wingShape = new THREE.CircleGeometry(0.32, 10); wingShape.scale(1, 0.85, 1); wingShape.translate(0.3, 0, 0);
  for (i = 0; i < 4; i++) {
    var bg = new THREE.Group(), bm = new THREE.MeshBasicMaterial({ color: bCols[i % 3], side: THREE.DoubleSide });
    var wl = new THREE.Group(), wr = new THREE.Group();
    wl.add(new THREE.Mesh(wingShape, bm)); wr.add(new THREE.Mesh(wingShape, bm)); wr.scale.x = -1;
    bg.add(wl, wr); var body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), new THREE.MeshBasicMaterial({ color: 0x1d1e22 }));
    body.rotation.x = Math.PI / 2; bg.add(body);
    bg.scale.setScalar(1.1); scene.add(bg);
    bflies.push({ g: bg, wl: wl, wr: wr, k: i, cx: -14 + i * 9, cz: -4 - i * 7 });
  }

  // ---------- drifting seeds / pollen ----------
  var SN = 170, sPos = new Float32Array(SN * 3), sSeed = [];
  for (i = 0; i < SN; i++) { sPos[i * 3] = (r() - 0.5) * 60; sPos[i * 3 + 1] = 0.5 + r() * 10; sPos[i * 3 + 2] = -45 + r() * 55; sSeed.push(r() * 6.3); }
  var seedGeo = new THREE.BufferGeometry(); seedGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  var seeds = new THREE.Points(seedGeo, new THREE.PointsMaterial({ size: 0.1, map: dotTex, color: 0x3a3b40, transparent: true, opacity: 0.55, depthWrite: false }));
  seeds.frustumCulled = false; scene.add(seeds);

  // ---------- chat bubbles above the hive ----------
  function bubbleTex() {
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
    g.fillStyle = '#fbfaf6'; g.strokeStyle = '#1d1e22'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(24, 26); g.lineTo(104, 26); g.quadraticCurveTo(116, 26, 116, 38); g.lineTo(116, 70); g.quadraticCurveTo(116, 82, 104, 82);
    g.lineTo(60, 82); g.lineTo(38, 102); g.lineTo(42, 82); g.lineTo(24, 82); g.quadraticCurveTo(12, 82, 12, 70); g.lineTo(12, 38); g.quadraticCurveTo(12, 26, 24, 26); g.fill(); g.stroke();
    g.fillStyle = '#1d1e22'; [38, 64, 90].forEach(function (x) { g.beginPath(); g.arc(x, 54, 6, 0, 6.3); g.fill(); });
    return new THREE.CanvasTexture(c);
  }
  var bub = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex(), transparent: true, depthWrite: false }));
  bub.scale.set(2.6, 2.6, 1); scene.add(bub);

  // ---------- camera paths ----------
  var camGround = new THREE.CatmullRomCurve3([V(0, 4.8, 15), V(2, 4.4, 9), V(-3, 3.8, 4), V(1.5, 4.2, 1), V(6, 4.6, -1), V(5, HY + 5.6, 8)]);
  var lookGround = new THREE.CatmullRomCurve3([V(3, HY + 3.4, -17), V(3, 3.2, -14), V(1.5, 3, -13), V(3, HY + 3.6, -17), V(3, HY + 3.6, -17), V(3, HY + 4.2, -15)]);
  // top-down pan: hive -> landing pad -> wide view
  var camTop = new THREE.CatmullRomCurve3([V(HX + 3, 36, HZ + 7), V(-9, 32, 0), V(2, 42, -3)]);
  var lookTop = new THREE.CatmullRomCurve3([V(HX + 3, HY, HZ + 1), V(-9, 0, -8), V(2, 0, -11)]);

  var target = 0, cur = 0, extra = 0, extraCur = 0, last = performance.now() / 1000, tTrail = 0, tAcc = 0;
  var camPos = new THREE.Vector3(), lookPos = new THREE.Vector3(), tp = new THREE.Vector3(), tl = new THREE.Vector3(),
      dir = new THREE.Vector3(), side3 = new THREE.Vector3(), ahead = new THREE.Vector3(), bp = new THREE.Vector3(),
      dance = new THREE.Vector3(), tdance = new THREE.Vector3(), prev = new THREE.Vector3(), vel = new THREE.Vector3(), aim = new THREE.Vector3();
  var UP = new THREE.Vector3(0, 1, 0);
  var mainHist = [], TR = 70, tArr = new Float32Array(TR * 3);
  var tGeo = new THREE.BufferGeometry(); tGeo.setAttribute('position', new THREE.BufferAttribute(tArr, 3));
  var mTrail = new THREE.Points(tGeo, new THREE.PointsMaterial({ size: 0.28, map: dotTex, color: 0xf2b632, transparent: true, opacity: 0.85, depthWrite: false }));
  mTrail.frustumCulled = false; scene.add(mTrail);

  window.__setProgress = function (p) { target = p; };
  window.__setExtra = function (e) { extra = e; };

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w < 700 ? 58 : 45; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  function loop() {
    requestAnimationFrame(loop);
    var now = performance.now() / 1000, dt = Math.min(0.05, now - last); last = now;
    cur += (target - cur) * Math.min(1, dt * 4);
    extraCur += (extra - extraCur) * Math.min(1, dt * 3);
    var c = Math.min(1, Math.max(0, cur));
    var top = smooth(0.5, 0.6, c);

    // camera: ground path, then lift into the top-down path
    camGround.getPoint(Math.min(1, c / 0.5), camPos); lookGround.getPoint(Math.min(1, c / 0.5), lookPos);
    var v = Math.min(0.999, Math.max(0, (c - 0.5) / 0.5));
    camTop.getPoint(v, tp); lookTop.getPoint(v, tl);
    camPos.lerp(tp, top); lookPos.lerp(tl, top);
    camPos.x += extraCur * 9; lookPos.x += extraCur * 9; camPos.z -= extraCur * 4; lookPos.z -= extraCur * 4;
    camPos.y += Math.sin(now * 0.6) * 0.06 * (1 - top);
    camera.position.copy(camPos); camera.lookAt(lookPos);
    UF.near.value = 14 + 50 * top; UF.far.value = 75 + 80 * top;
    clouds.visible = top < 0.4;
    clouds.children.forEach(function (cg, k) { cg.position.x += dt * (0.4 + k * 0.05); if (cg.position.x > 70) cg.position.x = -70; });

    // main bee: flies ahead of camera; dances at the hive; then circles the hive from above
    dir.copy(lookPos).sub(camPos).normalize();
    side3.crossVectors(dir, UP).normalize();
    ahead.copy(camPos).addScaledVector(dir, 11);
    bp.copy(ahead).addScaledVector(side3, Math.sin(now * 0.9) * 1.8 + 0.9);
    bp.y += Math.sin(now * 1.7) * 0.5 + 0.5;
    var w = smooth(0.36, 0.5, c) * (1 - top);
    var a = now * 1.5, den = 1 + Math.sin(a) * Math.sin(a), lx = Math.cos(a) / den, ly = Math.sin(a) * Math.cos(a) / den;
    dance.set(HX + 3.2 + 3.2 * lx, HY + 3.4 + 1.8 * ly, HZ + 6);
    tdance.set(HX + 7 * lx, HY + 10, HZ + 7 * ly);
    bp.lerp(dance, w); bp.lerp(tdance, top);
    prev.copy(main.g.position);
    main.g.position.lerp(bp, Math.min(1, dt * 5));
    vel.copy(main.g.position).sub(prev);
    if (vel.lengthSq() > 1e-7) { aim.copy(main.g.position).add(vel.multiplyScalar(30)); main.g.lookAt(aim); }
    main.g.rotateZ(Math.sin(now * 28) * 0.06 * (0.4 + w));
    main.g.scale.setScalar(0.8 + 0.55 * w + 0.5 * top);
    flap(main, 70, 0.55, now);
    tTrail += dt;
    if (tTrail > 0.045) {
      tTrail = 0; mainHist.unshift(main.g.position.x, main.g.position.y, main.g.position.z);
      if (mainHist.length > TR * 3) mainHist.length = TR * 3;
      for (var k = 0; k < TR * 3; k++) tArr[k] = mainHist[k] !== undefined ? mainHist[k] : mainHist[k % 3];
      tGeo.attributes.position.needsUpdate = true;
    }

    // swarm
    var badge = smooth(0.46, 0.58, c);
    tAcc += dt;
    for (var si = 0; si < swarm.length; si++) { stepSwarm(swarm[si], dt, now); swarm[si].spr.material.opacity = badge; }
    sGeo.attributes.position.needsUpdate = true;
    sPoints.material.size = 0.2 + 0.16 * top;
    mTrail.material.size = 0.28 + 0.2 * top;

    // butterflies
    bflies.forEach(function (b) {
      var t = now * 0.25 + b.k * 2;
      var x = b.cx + Math.sin(t * 1.3) * 7, z = b.cz + Math.cos(t * 0.9) * 7, y = hgt(x, z) + 2.4 + Math.sin(t * 3.1) * 0.6;
      var dx = x - b.g.position.x, dz = z - b.g.position.z;
      b.g.position.set(x, y, z);
      if (dx * dx + dz * dz > 1e-8) b.g.rotation.y = Math.atan2(dx, dz);
      var f = 0.9 + Math.sin(now * 14 + b.k) * 0.7;
      b.wl.rotation.z = f; b.wr.rotation.z = -f;
      b.g.rotation.x = 0.2;
    });

    // seeds
    for (var q = 0; q < SN; q++) {
      sPos[q * 3] += Math.sin(now * 0.5 + sSeed[q]) * dt * 0.5 + dt * 0.25;
      sPos[q * 3 + 1] += dt * (0.18 + 0.1 * Math.sin(sSeed[q] + now));
      sPos[q * 3 + 2] += Math.cos(now * 0.4 + sSeed[q]) * dt * 0.3;
      if (sPos[q * 3 + 1] > 11) sPos[q * 3 + 1] = 0.4;
      if (sPos[q * 3] > 34) sPos[q * 3] = -30;
    }
    seedGeo.attributes.position.needsUpdate = true;

    // chat bubble bob
    bub.position.set(HX - 0.5, HY + 9.4 + Math.sin(now * 2) * 0.25, HZ);
    renderer.render(scene, camera);
  }
  loop();
})();
