/* Henriksen – szachownica 3D (kafel „Szachy 3D”). Moduł ES ładowany przez import() z index.html (import map: "three").
   Model: „A Beautiful Game” (Khronos glTF Sample Assets, CC BY 4.0) w chess/3d/chess3d.glb, zmniejszony gltf-transform.
   API: mount(el, {onTap, sound}) → Promise; sync(P, st) – pozycja {pole:"wK"} + {sel, tg, last, chk, hint, stars, flip};
   fireworks(siła), topple(pole), resize(), pause(), resume(), setSkin("classic"|"pilkarze"). Ruchy i zbicia wynikają z różnicy
   między kolejnymi sync(). Skórka „Piłkarze”: boisko zamiast planszy, figury = zawodnik „Casual Character” (Quaternius, CC0,
   skins/footballer.glb) w strojach drużyn, różnego wzrostu (pion najmniejszy), król nr 9 i hetman nr 10 na plecach; ruch = bieg,
   zbicie = strzał piłką, po którym zbity odlatuje z boiska, mat = upadek króla i cieszynka drużyny. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as CANNON from './cannon-es.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const SQ = 0.0625;                       // pole w modelu: 6,25 cm
const NODE = { K: 'King', Q: 'Queen', R: 'Castle', N: 'Knight', B: 'Bishop', P: 'Pawn_Body' };
const sqPos = (sq, y = 0) => new THREE.Vector3((3.5 - (sq.charCodeAt(0) - 97)) * SQ, y, (+sq[1] - 4.5) * SQ);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const rnd = (a, b) => a + Math.random() * (b - a);

let R, scene, cam, comp, bloom, root, ray, world, el, opts, raf = 0, last = 0, running = false;
let TOP = 0.0149;                         // wysokość blatu (podstawa figur)
const tpl = {};                           // "wK" → {obj, y}
let pieces = new Map();                   // pole → {code, obj}
let prevStars = [];
const tweens = [], shards = [], marks = [], starObjs = new Map();
let fx;                                    // cząsteczki (iskry, fajerwerki)
let shake = 0, flipped = null;
let SKIN = 'classic', boardObj = null, pitch = null, FB = null; // FB: model piłkarza {scene, clips, h}
const mixers = new Set();
// piłkarze: wzrost względem króla i stroje drużyn (białe = niebiescy, czarne = czerwoni)
const PL_SIZE = { K: 1.12, Q: 1.08, R: .86, B: .82, N: .78, P: .6 };
const KIT = { w: { shirt: 0x1c7ed6, shorts: 0xffffff, socks: 0x1c7ed6 }, b: { shirt: 0xe03131, shorts: 0x212529, socks: 0xe03131 } };

/* --- start --- */
export async function mount(container, o) {
  el = container; opts = o || {};
  if (R) { el.appendChild(R.domElement); resize(); resume(); return; }
  R = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(R.domElement);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1020);
  const pm = new THREE.PMREMGenerator(R);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  cam = new THREE.PerspectiveCamera(38, 1, 0.01, 10);
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
  sun.position.set(0.35, 0.9, -0.45); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -.35, right: .35, top: .35, bottom: -.35, near: .1, far: 2 });
  sun.shadow.bias = -0.0004; scene.add(sun, new THREE.HemisphereLight(0xbfd4ff, 0x20140a, 0.5));
  root = new THREE.Group(); scene.add(root);
  ray = new THREE.Raycaster();

  comp = new EffectComposer(R);
  comp.addPass(new RenderPass(scene, cam));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1.0, 0.45, 2.2);
  comp.addPass(bloom); comp.addPass(new OutputPass());

  world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(ground);
  world.defaultContactMaterial.restitution = 0.35; world.defaultContactMaterial.friction = 0.4;

  fx = makeParticles(3000); scene.add(fx.points);

  await loadModel();
  ground.position.set(0, TOP, 0);
  R.domElement.addEventListener('pointerup', onTap);
  new ResizeObserver(resize).observe(el);
  resize(); resume();
}
function loadModel() {
  return new Promise((ok, bad) => {
    const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
    ld.load(new URL('./chess3d.glb', import.meta.url).href, g => {
      const s = g.scene;
      s.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        const m = o.material;
        if (m && (m.transmission > 0)) { // szklane główki pionów: bez drogiego przebiegu transmisji
          o.material = m.clone(); o.material.transmission = 0; o.material.transparent = true;
          o.material.opacity = 0.85; o.material.roughness = 0.12; o.material.metalness = 0.05; o.material.envMapIntensity = 0.5;
        }
      });
      const board = s.getObjectByName('Chessboard'); board.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
      root.add(board); boardObj = board;
      for (const t in NODE) for (const c of ['W', 'B']) {
        const n = s.getObjectByName(`${NODE[t]}_${c}`) || s.getObjectByName(`${NODE[t]}_${c}1`);
        tpl[c.toLowerCase() + t] = { obj: n, y: n.position.y, rot: n.quaternion.clone() };
      }
      // blat planszy: promień z góry w środek pola d4 (znaczniki, gwiazdki, podłoga dla odłamków)
      board.updateMatrixWorld(true);
      const rc = new THREE.Raycaster(new THREE.Vector3(SQ * .5, 1, -SQ * .5), new THREE.Vector3(0, -1, 0)), h = rc.intersectObject(board, true)[0];
      TOP = h ? h.point.y : tpl.wP.y;
      ok();
    }, p => { if (opts.progress && p.total) opts.progress(p.loaded / p.total); }, bad);
  });
}

/* --- pętla --- */
export function pause() { running = false; cancelAnimationFrame(raf); }
export function resume() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
export function resize() {
  if (!R || !el) return;
  const w = el.clientWidth || 360, h = Math.round(w * 1.0);
  R.setSize(w, h); comp.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix();
  placeCam();
}
function placeCam() {
  const s = flipped ? 1 : -1;
  cam.position.set(0, 0.74, s * 0.58); cam.lookAt(0, 0, s * -0.03);
}
function loop(t) {
  if (!running) return;
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  for (let k = tweens.length - 1; k >= 0; k--) { const w = tweens[k], p = Math.min(1, (t - w.t0) / w.d); if (p < 0) continue; w.f(ease(p), p); if (p >= 1) { tweens.splice(k, 1); w.end && w.end(); } }
  world.step(1 / 60, dt, 3);
  for (let k = shards.length - 1; k >= 0; k--) {
    const s = shards[k]; s.m.position.copy(s.b.position); s.m.quaternion.copy(s.b.quaternion);
    s.life -= dt; if (s.life < 0.6) s.m.scale.setScalar(Math.max(0.01, s.life / 0.6) * s.sc);
    if (s.life <= 0) { root.remove(s.m); world.removeBody(s.b); shards.splice(k, 1); }
  }
  starObjs.forEach(o => { o.rotation.y += dt * 2; o.position.y = TOP + 0.02 + Math.sin(t / 300 + o.userData.ph) * 0.004; });
  marks.forEach(m => { if (m.userData.pulse) m.material.opacity = 0.35 + 0.3 * Math.sin(t / 160); });
  mixers.forEach(m => m.update(dt));
  stepParticles(dt);
  if (shake > 0) { shake = Math.max(0, shake - dt * 1.8); placeCam(); cam.position.x += rnd(-1, 1) * shake * 0.01; cam.position.y += rnd(-1, 1) * shake * 0.008; }
  comp.render();
  raf = requestAnimationFrame(loop);
}

/* --- dotyk --- */
function onTap(e) {
  const r = R.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
  const hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP), hit)) return;
  const f = Math.round(3.5 - hit.x / SQ), rk = Math.round(hit.z / SQ + 4.5) - 1;
  if (f < 0 || f > 7 || rk < 0 || rk > 7) return;
  opts.onTap && opts.onTap('abcdefgh'[f] + (rk + 1));
}

/* --- figury --- */
function makePiece(code, sq) {
  if (SKIN === 'pilkarze' && FB) return makePlayer(code, sq);
  const t = tpl[code]; const o = t.obj.clone(true);
  o.position.copy(sqPos(sq, t.y)); o.quaternion.copy(t.rot); o.userData.code = code; o.userData.y = t.y;
  root.add(o); return o;
}
function tween(d, f, end, delay = 0) { tweens.push({ t0: performance.now() + delay, d, f, end }); }
function slide(o, to, knight, onLand) {
  if (o.userData.player) return run(o, sqPos(to, o.userData.y), onLand);
  const a = o.position.clone(), b = sqPos(to, o.userData.y), dist = a.distanceTo(b) / SQ;
  const h = knight ? 0.05 : 0.008 + dist * 0.002, d = knight ? 520 : 260 + dist * 45;
  tween(d, (e, p) => { o.position.lerpVectors(a, b, e); o.position.y = b.y + Math.sin(Math.PI * p) * h; }, () => { opts.sound && opts.sound('tap'); onLand && onLand(); });
  return d;
}
function fade(o, out, d = 280) {
  o.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; } });
  const s0 = o.scale.x; // docelowa skala (piłkarze mają własną)
  tween(d, e => { const k = out ? 1 - e : e; o.scale.setScalar(Math.max(0.001, k) * s0); }, () => { if (out) removePiece(o); });
  if (!out) o.scale.setScalar(0.001 * s0);
}

// rozprysk zbitej figury: kawałki z fizyką + iskry + wstrząs
function explode(o, from) {
  const c = o.position.clone(); let mat = null;
  o.traverse(m => { if (m.isMesh && !mat) mat = m.material; });
  root.remove(o);
  const big = /[QR]/.test(o.userData.code[1]) ? 1.5 : /K/.test(o.userData.code[1]) ? 1.8 : 1;
  const dir = from ? c.clone().sub(from).setY(0).normalize() : new THREE.Vector3();
  const n = Math.round(22 * big);
  for (let k = 0; k < n; k++) {
    const s = rnd(0.006, 0.013) * (k < 4 ? 1.6 : 1);
    const g = k % 3 ? new THREE.TetrahedronGeometry(s) : new THREE.BoxGeometry(s, s * rnd(.6, 1.4), s * rnd(.6, 1.2));
    const m = new THREE.Mesh(g, mat); m.castShadow = true;
    const p = c.clone().add(new THREE.Vector3(rnd(-.012, .012), rnd(0.005, 0.06), rnd(-.012, .012)));
    m.position.copy(p); root.add(m);
    const b = new CANNON.Body({ mass: 0.01, shape: new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2)), position: new CANNON.Vec3(p.x, p.y, p.z), linearDamping: 0.12, angularDamping: 0.2 });
    const v = new CANNON.Vec3(dir.x * 0.7 + rnd(-.6, .6) * big, rnd(0.6, 1.5) * big, dir.z * 0.7 + rnd(-.6, .6) * big);
    b.velocity.copy(v); b.angularVelocity.set(rnd(-25, 25), rnd(-25, 25), rnd(-25, 25));
    world.addBody(b); shards.push({ m, b, life: rnd(1.8, 2.6), sc: 1 });
  }
  burst(c.clone().setY(c.y + 0.03), 150 * big, [0xffd43b, 0xff922b, 0xffffff, 0xff6b6b], 0.7 * big, 0.7);
  // błysk światła i fala uderzeniowa po planszy
  const fl = new THREE.PointLight(0xffb347, 6 * big, 0.6, 2); fl.position.copy(c).setY(c.y + 0.05); root.add(fl);
  tween(450, e => { fl.intensity = 6 * big * (1 - e); }, () => root.remove(fl));
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd8a8, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending }));
  wave.position.copy(c).setY(TOP + 0.002); root.add(wave);
  tween(600, e => { wave.scale.setScalar(0.005 + e * 0.12 * big); wave.material.opacity = 0.9 * (1 - e); }, () => root.remove(wave));
  shake = Math.min(1, 0.45 * big);
  opts.sound && opts.sound('boom');
}

/* --- znaczniki pól i gwiazdki --- */
const MK = {
  sel: new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.55, depthWrite: false }),
  lm: new THREE.MeshBasicMaterial({ color: 0xc0eb75, transparent: true, opacity: 0.35, depthWrite: false }),
  hint: new THREE.MeshBasicMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.55, depthWrite: false }),
  mv: new THREE.MeshBasicMaterial({ color: 0x51cf66, transparent: true, opacity: 0.75, depthWrite: false }),
};
const G = { sq: new THREE.PlaneGeometry(SQ * .96, SQ * .96).rotateX(-Math.PI / 2), dot: new THREE.CircleGeometry(SQ * .16, 24).rotateX(-Math.PI / 2),
  ring: new THREE.RingGeometry(SQ * .36, SQ * .46, 32).rotateX(-Math.PI / 2) };
function mark(sq, geo, mat, y = 0.0006) { const m = new THREE.Mesh(geo, mat); m.position.copy(sqPos(sq, TOP + y)); m.renderOrder = 2; root.add(m); marks.push(m); return m; }
function starMesh() {
  const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? .4 : 1; sh[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: .3, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 2 }); g.center(); g.scale(SQ * .34, SQ * .34, SQ * .34);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xff9f00, emissiveIntensity: 4, metalness: .6, roughness: .3 }));
}

/* --- synchronizacja z grą --- */
export function sync(P, st) {
  if (!R) return;
  if (flipped !== !!st.flip) { flipped = !!st.flip; placeCam(); }
  const old = new Map(pieces), next = new Map(), oldL = [], newL = [];
  for (const sq in P) { const o = old.get(sq); if (o && o.code === P[sq]) { next.set(sq, o); old.delete(sq); } else newL.push(sq); }
  old.forEach((o, sq) => oldL.push(sq));
  const big = oldL.length + newL.length > 6; // nowa pozycja (zadanie, cofnięcie wielu) – bez animacji
  if (big) {
    oldL.forEach(sq => removePiece(pieces.get(sq).obj));
    newL.forEach(sq => next.set(sq, { code: P[sq], obj: makePiece(P[sq], sq) }));
  } else {
    const [lf, lt] = st.last || [];
    const pair = (fs, ts, promo) => {
      const o = pieces.get(fs); oldL.splice(oldL.indexOf(fs), 1); newL.splice(newL.indexOf(ts), 1);
      const victim = pieces.get(ts) && oldL.includes(ts) ? pieces.get(ts) : null;
      const kn = o.code[1] === 'N', vic = pieces.get(ts) && oldL.includes(ts) && o.obj.userData.player;
      if (vic) { o.obj.userData.wait = 650; } // najpierw strzał, potem bieg na pole
      const d = slide(o.obj, ts, kn, () => {
        if (promo) { removePiece(o.obj); const n = makePiece(P[ts], ts); next.get(ts).obj = n; burst(n.position.clone().setY(TOP + .04), 90, [0xffffff, 0x74c0fc, 0xffd43b], .4, .6); opts.sound && opts.sound('cheer'); }
      });
      if (victim) { oldL.splice(oldL.indexOf(ts), 1);
        if (o.obj.userData.player) { kickOut(victim.obj, o.obj, d); } else setTimeout(() => explode(victim.obj, o.obj.position.clone()), d * 0.75); }
      next.set(ts, { code: P[ts], obj: o.obj });
    };
    // 1) ostatni ruch (też promocja: pion → figura)
    if (lf && oldL.includes(lf) && newL.includes(lt)) pair(lf, lt, pieces.get(lf).code !== P[lt]);
    // 2) reszta: ta sama figura najbliżej (roszada – wieża)
    for (const ts of [...newL]) {
      const c = P[ts]; let best = null, bd = 9;
      for (const fs of oldL) { const o = pieces.get(fs); if (o.code !== c) continue; const d = sqPos(fs).distanceTo(sqPos(ts)); if (d < bd) { bd = d; best = fs; } }
      if (best) pair(best, ts, false);
    }
    // 3) zniknęły: zbite (bicie w przelocie) albo cofnięte
    oldL.forEach(sq => { const o = pieces.get(sq); if (lt && sqPos(sq).distanceTo(sqPos(lt)) < SQ * 1.1) setTimeout(() => explode(o.obj, sqPos(lt)), 220); else fade(o.obj, true); });
    newL.forEach(sq => { const o = makePiece(P[sq], sq); fade(o, false); next.set(sq, { code: P[sq], obj: o }); });
  }
  pieces = next;
  // znaczniki
  marks.splice(0).forEach(m => root.remove(m));
  (st.last || []).forEach(s => mark(s, G.sq, MK.lm));
  if (st.sel) mark(st.sel, G.sq, MK.sel, .0008);
  (st.hint || []).forEach(s => mark(s, G.sq, MK.hint, .0009));
  (st.tg || []).forEach(s => mark(s, P[s] ? G.ring : G.dot, MK.mv, .001));
  if (st.chk) { const m = mark(st.chk, new THREE.CircleGeometry(SQ * .55, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending }), .0012); m.userData.pulse = true; }
  // gwiazdki (lekcje): zebrane = wybuch iskier
  const stars = st.stars || [];
  prevStars.filter(s => !stars.includes(s)).forEach(s => { const o = starObjs.get(s); if (o) { root.remove(o); starObjs.delete(s); burst(sqPos(s, TOP + .02), 60, [0xffd43b, 0xfff3bf, 0xff922b], .35, .5); opts.sound && opts.sound('ok'); } });
  stars.filter(s => !starObjs.has(s)).forEach(s => { const o = starMesh(); o.position.copy(sqPos(s, TOP + .02)); o.userData.ph = Math.random() * 6; root.add(o); starObjs.set(s, o); });
  [...starObjs.keys()].filter(s => !stars.includes(s)).forEach(s => { root.remove(starObjs.get(s)); starObjs.delete(s); });
  prevStars = stars.slice();
}
export function clear() { pieces.forEach(p => removePiece(p.obj)); pieces = new Map(); starObjs.forEach(o => root.remove(o)); starObjs.clear(); prevStars = []; marks.splice(0).forEach(m => root.remove(m)); }

/* --- król się przewraca (mat) --- */
export function topple(sq) {
  const p = pieces.get(sq); if (!p) return;
  if (p.obj.userData.player) {
    play(p.obj, 'Death', true);
    pieces.forEach(q => { if (q.code[0] !== p.code[0]) setTimeout(() => play(q.obj, 'Wave', false, true), 300 + Math.random() * 500); });
    setTimeout(() => { shake = 0.4; opts.sound && opts.sound('cheer'); }, 700); return;
  } const o = p.obj, q0 = o.quaternion.clone(), y0 = o.position.y;
  const ax = new THREE.Vector3(rnd(-1, 1), 0, rnd(-1, 1)).normalize(), q1 = new THREE.Quaternion().setFromAxisAngle(ax, Math.PI / 2 * 0.96).multiply(q0);
  tween(900, (e, t) => { o.quaternion.slerpQuaternions(q0, q1, Math.min(1, t * t * 1.1)); o.position.y = y0 + Math.sin(Math.PI * Math.min(1, t)) * 0.004 - t * 0.004; },
    () => { shake = 0.7; burst(o.position.clone(), 50, [0xffffff, 0xced4da], .25, .4); opts.sound && opts.sound('boom'); }, 350);
}

/* --- cząsteczki: iskry i fajerwerki (Points, mieszanie addytywne, poświata z bloom) --- */
function makeParticles(N) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const mat = new THREE.PointsMaterial({ size: 0.02, map: new THREE.CanvasTexture(cv), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  return { points: pts, pos, col, N, list: [], rockets: [] };
}
const C = new THREE.Color();
function spark(p, v, color, life, g = 1) { if (fx.list.length < fx.N) fx.list.push({ p: p.clone(), v, c: new THREE.Color(color), life, max: life, g }); }
function burst(at, n, colors, speed, life) {
  for (let k = 0; k < n; k++) { const v = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(speed * rnd(.4, 1)); spark(at, v, colors[k % colors.length], life * rnd(.6, 1.2), 0.35); }
}
function stepParticles(dt) {
  for (let k = fx.rockets.length - 1; k >= 0; k--) {
    const r = fx.rockets[k]; r.v.y -= 0.6 * dt; r.p.addScaledVector(r.v, dt); spark(r.p, new THREE.Vector3(rnd(-.02, .02), -.05, rnd(-.02, .02)), 0xffe8a3, .35, .2);
    if (r.v.y <= 0.05) { const pal = [[0xff6b6b, 0xffd43b], [0x74c0fc, 0xffffff], [0x69db7c, 0xfff3bf], [0xda77f2, 0xff8cc6], [0xffa94d, 0xffe066]][Math.floor(Math.random() * 5)];
      burst(r.p, 160, pal, 0.32, 1.4); opts.sound && opts.sound('pop'); fx.rockets.splice(k, 1); }
  }
  const L = fx.list; let n = 0;
  for (let k = L.length - 1; k >= 0; k--) { const s = L[k]; s.life -= dt; if (s.life <= 0) { L.splice(k, 1); continue; }
    s.v.y -= 0.35 * s.g * dt; s.v.multiplyScalar(1 - 1.2 * dt); s.p.addScaledVector(s.v, dt); }
  for (const s of L) { const a = Math.min(1, s.life / s.max * 1.4); fx.pos.set([s.p.x, s.p.y, s.p.z], n * 3); C.copy(s.c).multiplyScalar(a * 5); fx.col.set([C.r, C.g, C.b], n * 3); n++; }
  fx.points.geometry.setDrawRange(0, n); fx.points.geometry.attributes.position.needsUpdate = true; fx.points.geometry.attributes.color.needsUpdate = true;
}
// fajerwerki: siła 1 = kilka rakiet, 3 = pokaz na całego
export function fireworks(power = 1) {
  const n = power >= 3 ? 14 : power === 2 ? 8 : 4;
  for (let k = 0; k < n; k++) setTimeout(() => {
    fx.rockets.push({ p: new THREE.Vector3(rnd(-.3, .3), TOP, rnd(-.3, .3) + (flipped ? .25 : -.25) * 0), v: new THREE.Vector3(rnd(-.05, .05), rnd(.85, 1.1), rnd(-.05, .05)) });
    opts.sound && opts.sound('launch');
  }, k * (power >= 3 ? 260 : 340));
}

/* --- skórki --- */
function removePiece(o) { if (o.userData.mixer) { o.userData.mixer.stopAllAction(); mixers.delete(o.userData.mixer); } root.remove(o); }
export async function setSkin(name) {
  if (name === 'pilkarze' && !FB) {
    const g = await new GLTFLoader().loadAsync(new URL('./skins/footballer.glb', import.meta.url).href);
    g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const box = new THREE.Box3().setFromObject(g.scene);
    FB = { scene: g.scene, clips: g.animations, h: box.max.y - box.min.y };
  }
  if (name === SKIN) return;
  clear(); SKIN = name;
  if (boardObj) boardObj.visible = SKIN === 'classic';
  if (SKIN === 'pilkarze' && !pitch) pitch = makePitch();
  if (pitch) pitch.visible = SKIN === 'pilkarze';
}
// boisko: murawa w pasy (pola szachownicy w dwóch odcieniach), linie, bramki za liniami końcowymi
function makePitch() {
  const g = new THREE.Group(), cv = document.createElement('canvas'); cv.width = cv.height = 1024; const x = cv.getContext('2d'), u = 1024 / 10;
  x.fillStyle = '#1e6b30'; x.fillRect(0, 0, 1024, 1024);
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { x.fillStyle = (r + f) % 2 ? '#40a957' : '#2b8a3e'; x.fillRect(u + f * u, u + r * u, u, u); }
  x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 6; x.strokeRect(u, u, 8 * u, 8 * u);
  x.beginPath(); x.moveTo(u, 5 * u); x.lineTo(9 * u, 5 * u); x.stroke(); x.beginPath(); x.arc(5 * u, 5 * u, 1.1 * u, 0, 7); x.stroke();
  x.strokeRect(3 * u, u, 4 * u, 1.2 * u); x.strokeRect(3 * u, 7.8 * u, 4 * u, 1.2 * u);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(SQ * 10, SQ * 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: .95 }));
  turf.position.y = TOP; turf.receiveShadow = true; g.add(turf);
  const post = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .4 }), net = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .35 });
  for (const zs of [-1, 1]) {
    const z = zs * SQ * 4.55, gw = SQ * 2.4, gh = SQ * .9, t = SQ * .07, goal = new THREE.Group();
    const bar = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), post); m.position.set(px, py, pz); m.castShadow = true; goal.add(m); };
    bar(t, gh, t, -gw / 2, gh / 2, 0); bar(t, gh, t, gw / 2, gh / 2, 0); bar(gw + t, t, t, 0, gh, 0);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh, 8, 4), net); back.position.set(0, gh / 2, zs * SQ * .45); goal.add(back);
    goal.position.set(0, TOP, z); g.add(goal);
  }
  root.add(g); return g;
}
const clip = (o, n) => FB.clips.find(c => c.name.endsWith('|' + n));
// animacja piłkarza: once = jeden raz i zostaje w ostatniej klatce; back = potem wraca do „Idle”
function play(o, n, once, back) {
  const m = o.userData.mixer, a = m.clipAction(clip(o, n)), cur = o.userData.act;
  if (cur === a) return a;
  a.reset(); a.setLoop(once || back ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = !!once; a.play();
  if (cur) cur.crossFadeTo(a, 0.18, false); o.userData.act = a;
  if (back) { const d = clip(o, n).duration * 1000; setTimeout(() => { if (o.userData.act === a) play(o, 'Idle'); }, d * 1.6); }
  return a;
}
function makePlayer(code, sq) {
  const c = code[0], t = code[1], o = SkeletonUtils.clone(FB.scene), k = KIT[c];
  o.traverse(m => { if (!m.isMesh) return; m.material = m.material.clone(); const n = m.material.name;
    if (n === 'LightBrown') m.material.color.set(k.shirt); if (n === 'LightBlue') m.material.color.set(k.shorts);
    if (n === 'White') m.material.color.set(0x111111); if (n === 'Red_Dark') m.material.color.set(k.socks); });
  const s = SQ * 1.75 / FB.h * PL_SIZE[t]; o.scale.setScalar(s);
  if (t === 'K' || t === 'Q') { // numer na plecach: 9 = król, 10 = hetman
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    x.font = '900 92px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = 'rgba(0,0,0,.55)';
    const n = t === 'K' ? '9' : '10'; x.strokeText(n, 64, 70); x.fillStyle = '#fff'; x.fillText(n, 64, 70);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(FB.h * .24, FB.h * .24), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
    num.rotation.y = Math.PI; num.position.set(0, FB.h * .8, -FB.h * .14); num.renderOrder = 3; o.add(num);
  }
  o.position.copy(sqPos(sq, TOP)); o.rotation.y = c === 'w' ? 0 : Math.PI;
  o.userData = { code, y: TOP, player: true, face: o.rotation.y, mixer: new THREE.AnimationMixer(o) };
  mixers.add(o.userData.mixer); play(o, 'Idle').time = Math.random() * 2;
  root.add(o); return o;
}
// bieg na pole: obrót w stronę celu, „Run”, na końcu obrót z powrotem przodem do przeciwnika
function run(o, b, onLand) {
  const a = o.position.clone(), dist = a.distanceTo(b) / SQ, d = 380 + dist * 170, wait = o.userData.wait || 0; o.userData.wait = 0;
  const ang = Math.atan2(b.x - a.x, b.z - a.z), r0 = o.rotation.y;
  setTimeout(() => play(o, 'Run'), wait);
  tween(d, (e, p) => { o.position.lerpVectors(a, b, e); o.rotation.y = r0 + shortAng(r0, ang) * Math.min(1, p * 5); },
    () => { play(o, 'Idle'); const r1 = o.rotation.y; tween(250, e => { o.rotation.y = r1 + shortAng(r1, o.userData.face) * e; }); onLand && onLand(); }, wait);
  return d + wait;
}
const shortAng = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
// zbicie: strzelec kopie piłkę w zbitego, ten dostaje i wylatuje łukiem za boisko
function kickOut(v, att, dMove) {
  const from = att.position.clone(), to = v.position.clone(), dir = to.clone().sub(from).setY(0).normalize();
  const ang = Math.atan2(dir.x, dir.z); att.rotation.y = ang;
  play(att, Math.random() < .5 ? 'Kick_Right' : 'Kick_Left', false, true);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(SQ * .13, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5, flatShading: true }));
  ball.castShadow = true; root.add(ball);
  const b0 = from.clone().addScaledVector(dir, SQ * .3).setY(TOP + SQ * .13), b1 = to.clone().setY(TOP + SQ * .5);
  tween(260, (e, p) => { ball.position.lerpVectors(b0, b1, p); ball.position.y += Math.sin(Math.PI * p) * SQ * .25; ball.rotation.x += .4; }, () => {
    root.remove(ball); play(v, 'HitRecieve', true); opts.sound && opts.sound('boom'); shake = .35;
    burst(b1.clone(), 60, [0xffffff, 0xffd43b], .35, .45);
    const a = v.position.clone(), out = a.clone().addScaledVector(dir, SQ * 5).setY(TOP), spin = (Math.random() < .5 ? -1 : 1) * 9;
    tween(900, (e, p) => { v.position.lerpVectors(a, out, p); v.position.y = TOP + Math.sin(Math.PI * p) * SQ * 2.2; v.rotation.x = p * spin * .5; v.rotation.z = p * spin * .3; },
      () => { burst(v.position.clone().setY(TOP + .02), 40, [0xffffff, 0x69db7c], .25, .4); removePiece(v); });
  }, 380);
}
