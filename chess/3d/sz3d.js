/* Henriksen – szachownica 3D (kafel „Szachy 3D”). Moduł ES ładowany przez import() z index.html (import map: "three").
   Model: „A Beautiful Game” (Khronos glTF Sample Assets, CC BY 4.0) w chess/3d/chess3d.glb, zmniejszony gltf-transform.
   API: mount(el, {onTap, sound}) → Promise; sync(P, st) – pozycja {pole:"wK"} + {sel, tg, last, chk, hint, stars, flip};
   fireworks(siła), topple(pole), resize(), pause(), resume(), setSkin("classic"|"pilkarze"|"dino"|"roboty"), view("tilt"|"top"|"reset").
   Kamera: OrbitControls – jeden palec obraca (zmienia kąt patrzenia), dwa palce przybliżają i przesuwają. Rysowanie tylko, gdy coś
   się zmienia (render na żądanie); bez poświaty (bloom) i z ograniczoną rozdzielczością – płynniej na telefonie. Ruchy i zbicia wynikają z różnicy
   między kolejnymi sync(). Skórka „Piłkarze”: boisko zamiast planszy, figury = zawodnik „Casual Character” (Quaternius, CC0,
   skins/footballer.glb) w strojach drużyn, różnego wzrostu (pion najmniejszy), król nr 9 i hetman nr 10 na plecach; ruch = bieg,
   zbicie = strzał piłką, po którym zbity odlatuje z boiska, mat = upadek króla i cieszynka drużyny.
   Skórka „Dinozaury”: dżungla z wulkanem, figury = dinozaury z „Animated Dinosaur Pack” (Quaternius, CC0, skins/dino/*.glb);
   drużyny różnią się odcieniem i kółkiem pod nogami, zbicie = atak (Attack), zbity pada (Death) i zapada się w ziemię.
   Skórka „Roboty”: hala z metalową podłogą, roboty z brył w kodzie według projektu z Claude Design (makeRobot, RB) – każda część ma
   pozycję i rozmiar robota oraz pojazdu, więc przy ruchu robot składa się w ciężarówkę/auto/czołg/myśliwiec, jedzie i rozkłada z powrotem;
   zbicie = strzał laserem, po którym zbity rozpada się na części. Białe = Gwardia Pulsara, czarne = Legion Cienia (kolce, wizjer V). */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as CANNON from './cannon-es.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const SQ = 0.0625;                       // pole w modelu: 6,25 cm
const NODE = { K: 'King', Q: 'Queen', R: 'Castle', N: 'Knight', B: 'Bishop', P: 'Pawn_Body' };
const sqPos = (sq, y = 0) => new THREE.Vector3((3.5 - (sq.charCodeAt(0) - 97)) * SQ, y, (+sq[1] - 4.5) * SQ);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const rnd = (a, b) => a + Math.random() * (b - a);

let R, scene, cam, ctl, root, ray, world, el, opts, raf = 0, last = 0, running = false;
let dirty = true, idleT = 0, lastSt = {};    // dirty = narysuj następną klatkę; idleT = rzadsze klatki, gdy ruszają się tylko piłkarze
let TOP = 0.0149;                         // wysokość blatu (podstawa figur)
const tpl = {};                           // "wK" → {obj, y}
let pieces = new Map();                   // pole → {code, obj}
let prevStars = [];
const tweens = [], shards = [], marks = [], starObjs = new Map();
let fx;                                    // cząsteczki (iskry, fajerwerki)
let shake = 0, flipped = null;
let SKIN = 'classic', boardObj = null, pitch = null, FB = null; // FB: model piłkarza {scene, clips, h}
let jungle = null, arena = null, DN = null;                    // DN: modele dinozaurów {K: {scene, clips, box}}
const BG = { classic: 0x0d1020, pilkarze: 0x0d1020, dino: 0x7fb8c9, roboty: 0x0a0f1c };
const mixers = new Set();
// piłkarze: wzrost względem króla i stroje drużyn (białe = niebiescy, czarne = czerwoni)
const PL_SIZE = { K: 1.12, Q: 1.08, R: .86, B: .82, N: .78, P: .6 };
const KIT = { w: { shirt: 0x1c7ed6, shorts: 0xffffff, socks: 0x1c7ed6, gk: 0x94d82d, team: '#1c7ed6' }, b: { shirt: 0xe03131, shorts: 0x212529, socks: 0xe03131, gk: 0xfcc419, team: '#e03131' } };
const BADGE = {}; // "#1c7ed6wN" → tekstura plakietki nad głową (figura szachowa w kółku w kolorze drużyny)
const TEAMC = { pilkarze: KIT.w.team + ',' + KIT.b.team, dino: KIT.w.team + ',' + KIT.b.team, roboty: '#3da5ff,#a04dff' };
const teamCol = c => (TEAMC[SKIN] || TEAMC.pilkarze).split(',')[c === 'w' ? 0 : 1];
// plakietka nad postacią: y = wysokość w jednostkach modelu, sc = skala modelu
function addBadge(o, code, y, sc) {
  const t = BADGE[teamCol(code[0]) + code]; if (!t) return;
  const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  b.renderOrder = 20; b.scale.setScalar(SQ * .5 / sc); b.position.set(0, y, 0); b.userData.badge = true; b.visible = badgesOn; o.add(b);
}
async function makeBadges() {
  const img = opts.img || {}, todo = [];
  for (const code of Object.keys(img)) { const col = teamCol(code[0]); if (!BADGE[col + code]) todo.push([col, code]); }
  await Promise.all(todo.map(([col, code]) => new Promise(ok => { const im = new Image(); im.onload = () => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fillStyle = col; x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
    x.drawImage(im, 18, 16, 92, 92); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; BADGE[col + code] = t; ok(); };
    im.onerror = ok; im.src = img[code]; })));
}
let badgesOn = true;
// plakietki z figurami nad piłkarzami – do włączania i wyłączania (PREFS.szBadges)
export function setBadges(on) { badgesOn = !!on; root && root.traverse(o => { if (o.userData && o.userData.badge) o.visible = badgesOn; }); dirty = true; }

/* --- start --- */
export async function mount(container, o) {
  el = container; opts = o || {};
  if (R) { el.appendChild(R.domElement); resize(); resume(); return; }
  R = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
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
  ctl = new OrbitControls(cam, R.domElement);
  Object.assign(ctl, { enableDamping: true, dampingFactor: 0.12, minDistance: 0.3, maxDistance: 1.4, minPolarAngle: 0.02, maxPolarAngle: 1.3, screenSpacePanning: true, rotateSpeed: 0.7 });
  ctl.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  ctl.addEventListener('change', () => { dirty = true; const t = ctl.target; t.x = THREE.MathUtils.clamp(t.x, -.25, .25); t.z = THREE.MathUtils.clamp(t.z, -.25, .25); t.y = TOP; });

  world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(ground);
  world.defaultContactMaterial.restitution = 0.35; world.defaultContactMaterial.friction = 0.4;

  fx = makeParticles(3000); scene.add(fx.points);

  await loadModel();
  ground.position.set(0, TOP, 0);
  R.domElement.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
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
  R.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix();
  if (!camSet) placeCam(); dirty = true;
}
// widoki kamery: tilt = skos (domyślny), top = z góry jak w 2D; strona zależy od tego, kim gra dziecko
let camSet = false, VIEW = 'tilt';
function placeCam(v) {
  if (v) VIEW = v; const s = flipped ? 1 : -1;
  if (VIEW === 'top') cam.position.set(0, 0.92, s * 0.02); else cam.position.set(0, 0.78, s * 0.5);
  ctl.target.set(0, TOP, s * -0.02); ctl.update(); camSet = true; dirty = true;
}
export function view(v) { placeCam(v === 'reset' ? 'tilt' : v); }
function loop(t) {
  if (!running) return;
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  ctl.update();
  for (let k = tweens.length - 1; k >= 0; k--) { const w = tweens[k], p = Math.min(1, (t - w.t0) / w.d); if (p < 0) continue; w.f(ease(p), p); if (p >= 1) { tweens.splice(k, 1); w.end && w.end(); } }
  if (shards.length) world.step(1 / 60, dt, 3);
  for (let k = shards.length - 1; k >= 0; k--) {
    const s = shards[k]; s.m.position.copy(s.b.position); s.m.quaternion.copy(s.b.quaternion);
    s.life -= dt; if (s.life < 0.6) s.m.scale.setScalar(Math.max(0.01, s.life / 0.6) * s.sc);
    if (s.life <= 0) { root.remove(s.m); world.removeBody(s.b); shards.splice(k, 1); }
  }
  starObjs.forEach(o => { o.rotation.y += dt * 2; o.position.y = TOP + 0.02 + Math.sin(t / 300 + o.userData.ph) * 0.004; });
  marks.forEach(m => { if (m.userData.pulse) m.material.opacity = 0.35 + 0.3 * Math.sin(t / 160); });
  mixers.forEach(m => m.update(dt));
  const sparks = fx.list.length || fx.rockets.length; if (sparks || fx.points.geometry.drawRange.count) stepParticles(dt);
  if (shake > 0) { shake = Math.max(0, shake - dt * 1.8); root.position.set(rnd(-1, 1) * shake * 0.006, rnd(-1, 1) * shake * 0.004, 0); if (!shake) root.position.set(0, 0, 0); }
  // rysuj tylko, gdy coś się dzieje; same piłkarze w spoczynku – co drugą klatkę
  const busy = dirty || tweens.length || shards.length || sparks || shake > 0 || starObjs.size || marks.some(m => m.userData.pulse);
  idleT += dt;
  if (busy || (mixers.size && idleT > 1 / 30)) { R.render(scene, cam); dirty = false; idleT = 0; }
  raf = requestAnimationFrame(loop);
}

/* --- dotyk: krótkie dotknięcie bez przesuwania = wybór pola (przeciąganie obraca kamerę) --- */
let downAt = null;
function onTap(e) {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 10 || performance.now() - downAt.t > 600) return;
  const r = R.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
  // pole pod palcem na planszy
  const hit = new THREE.Vector3(); let plane = null;
  if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP), hit)) {
    const f = Math.round(3.5 - hit.x / SQ), rk = Math.round(hit.z / SQ + 4.5) - 1;
    if (f >= 0 && f <= 7 && rk >= 0 && rk <= 7) plane = 'abcdefgh'[f] + (rk + 1);
  }
  // trafiona figura (łatwiej trafić wysoką figurę niż pole pod nią); wolne pole-cel ma pierwszeństwo przed figurą zasłaniającą
  let piece = null; const objs = []; pieces.forEach((p, sq) => { p.obj.userData.sq = sq; objs.push(p.obj); });
  for (const h of ray.intersectObjects(objs, true)) { let o = h.object; while (o && !o.userData.sq) o = o.parent; if (o) { piece = o.userData.sq; break; } }
  const sq = plane && (lastSt.tg || []).includes(plane) && !pieces.has(plane) ? plane : piece || plane;
  if (sq && opts.onTap) opts.onTap(sq);
}

/* --- figury --- */
function makePiece(code, sq) {
  if (SKIN === 'pilkarze' && FB) return makePlayer(code, sq);
  if (SKIN === 'dino' && DN) return makeDino(code, sq);
  if (SKIN === 'roboty') return makeRobot(code, sq);
  const t = tpl[code]; const o = t.obj.clone(true);
  o.position.copy(sqPos(sq, t.y)); o.quaternion.copy(t.rot); o.userData.code = code; o.userData.y = t.y;
  root.add(o); return o;
}
function tween(d, f, end, delay = 0) { tweens.push({ t0: performance.now() + delay, d, f, end }); }
function slide(o, to, knight, onLand) {
  if (o.userData.player) return run(o, sqPos(to, o.userData.y), onLand);
  if (o.userData.robot) return drive(o, sqPos(to, o.userData.y), knight, onLand);
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
  lastSt = st; dirty = true;
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
      const kn = o.code[1] === 'N', cap = victim && o.obj.userData.cap;
      if (cap) { oldL.splice(oldL.indexOf(ts), 1); o.obj.userData.wait = cap(victim.obj, o.obj); } // postacie: najpierw atak (strzał, ugryzienie, laser), potem ruch na pole
      const d = slide(o.obj, ts, kn, () => {
        if (promo) { removePiece(o.obj); const n = makePiece(P[ts], ts); next.get(ts).obj = n; burst(n.position.clone().setY(TOP + .04), 90, [0xffffff, 0x74c0fc, 0xffd43b], .4, .6); opts.sound && opts.sound('cheer'); }
      });
      if (victim && !cap) { oldL.splice(oldL.indexOf(ts), 1); setTimeout(() => kill(victim.obj, o.obj.position.clone()), d * 0.75); }
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
    oldL.forEach(sq => { const o = pieces.get(sq); if (lt && sqPos(sq).distanceTo(sqPos(lt)) < SQ * 1.1) setTimeout(() => kill(o.obj, sqPos(lt)), 220); else fade(o.obj, true); });
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
// ile ms zostało do końca animacji (komputer czeka z odpowiedzią, aż figura dojedzie)
export function busy() { const n = performance.now(); return tweens.reduce((m, w) => Math.max(m, w.t0 + w.d - n), 0); }
export function clear() { dirty = true; pieces.forEach(p => removePiece(p.obj)); pieces = new Map(); starObjs.forEach(o => root.remove(o)); starObjs.clear(); prevStars = []; marks.splice(0).forEach(m => root.remove(m)); }

const kill = (o, from) => o.userData.die ? o.userData.die(o, from) : explode(o, from);

/* --- król się przewraca (mat) --- */
export function topple(sq) {
  const p = pieces.get(sq); if (!p) return;
  if (p.obj.userData.robot) { // król robotów rozpada się, a zwycięzcy podskakują
    setTimeout(() => breakApart(p.obj, null, true), 300);
    pieces.forEach(q => { if (q.code[0] !== p.code[0]) for (let k = 0; k < 3; k++) hop(q.obj, 700 + k * 420 + Math.random() * 200); });
    setTimeout(() => opts.sound && opts.sound('cheer'), 900); return;
  }
  if (p.obj.userData.player) {
    play(p.obj, 'Death', true);
    pieces.forEach(q => { if (q.code[0] !== p.code[0]) setTimeout(() => play(q.obj, q.obj.userData.cheer || 'Wave', false, true), 300 + Math.random() * 500); });
    setTimeout(() => { shake = 0.4; opts.sound && opts.sound('cheer'); }, 700); return;
  } const o = p.obj, q0 = o.quaternion.clone(), y0 = o.position.y;
  const ax = new THREE.Vector3(rnd(-1, 1), 0, rnd(-1, 1)).normalize(), q1 = new THREE.Quaternion().setFromAxisAngle(ax, Math.PI / 2 * 0.96).multiply(q0);
  tween(900, (e, t) => { o.quaternion.slerpQuaternions(q0, q1, Math.min(1, t * t * 1.1)); o.position.y = y0 + Math.sin(Math.PI * Math.min(1, t)) * 0.004 - t * 0.004; },
    () => { shake = 0.7; burst(o.position.clone(), 50, [0xffffff, 0xced4da], .25, .4); opts.sound && opts.sound('boom'); }, 350);
}

/* --- cząsteczki: iskry i fajerwerki (Points, mieszanie addytywne) --- */
function makeParticles(N) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const mat = new THREE.PointsMaterial({ size: 0.026, map: new THREE.CanvasTexture(cv), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
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
  for (const s of L) { const a = Math.min(1, s.life / s.max * 1.4); fx.pos.set([s.p.x, s.p.y, s.p.z], n * 3); C.copy(s.c).multiplyScalar(a * 1.6); fx.col.set([C.r, C.g, C.b], n * 3); n++; }
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
  if (name === 'pilkarze' && !FB) { const g = await loadChar('./skins/footballer.glb'); FB = { scene: g.scene, clips: g.clips, h: g.box.max.y - g.box.min.y }; }
  if (name === 'dino' && !DN) { const L = await Promise.all(Object.values(DINO).map(f => loadChar(`./skins/dino/${f}.glb`))); DN = {}; Object.keys(DINO).forEach((t, k) => { DN[t] = L[k]; }); }
  if (name === SKIN) return;
  clear(); SKIN = name; await makeBadges();
  scene.background.set(BG[SKIN] || BG.classic); scene.fog = SKIN === 'dino' ? new THREE.Fog(BG.dino, 1.2, 3) : null;
  if (boardObj) boardObj.visible = SKIN === 'classic';
  if (SKIN === 'pilkarze' && !pitch) pitch = makePitch();
  if (pitch) pitch.visible = SKIN === 'pilkarze';
  if (SKIN === 'dino' && !jungle) jungle = makeJungle();
  if (jungle) jungle.visible = SKIN === 'dino';
  if (SKIN === 'roboty' && !arena) arena = makeArena();
  if (arena) arena.visible = SKIN === 'roboty';
}
async function loadChar(file) {
  const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
  const g = await ld.loadAsync(new URL(file, import.meta.url).href);
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  // wymiary liczone w pozie „Idle” (precyzyjnie, z kośćmi) – poza spoczynkowa modelu bywa inna (triceratops miał coś pod ziemią i wisiał w powietrzu)
  const idle = g.animations.find(c => /[|_]Idle$/.test(c.name));
  if (idle) { const m = new THREE.AnimationMixer(g.scene); m.clipAction(idle).play(); m.update(0); g.scene.updateMatrixWorld(true); }
  return { scene: g.scene, clips: g.animations, box: new THREE.Box3().setFromObject(g.scene, !!idle) };
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
const clip = (o, n) => { const C = o.userData.clips || FB.clips; return C.find(c => c.name.endsWith('|' + n)) || C.find(c => c.name.endsWith('_' + n)); };
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
    if (n === 'LightBrown') m.material.color.set(t === 'R' ? k.gk : k.shirt); if (n === 'LightBlue') m.material.color.set(k.shorts);
    if (n === 'White') m.material.color.set(0x111111); if (n === 'Red_Dark') m.material.color.set(k.socks); });
  const s = SQ * 1.75 / FB.h * PL_SIZE[t]; o.scale.setScalar(s);
  const sc = SQ * 1.75 / FB.h * PL_SIZE[t];
  if (t === 'K' || t === 'Q') { // numer na plecach i na piersi: 9 = król, 10 = hetman
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'), n = t === 'K' ? '9' : '10';
    x.font = '900 190px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.lineWidth = 26; x.strokeStyle = '#111'; x.strokeText(n, 128, 140); x.fillStyle = '#fff'; x.fillText(n, 128, 140);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false });
    for (const z of [-1, 1]) { const num = new THREE.Mesh(new THREE.PlaneGeometry(FB.h * .3, FB.h * .3), mat);
      num.rotation.y = z < 0 ? Math.PI : 0; num.position.set(0, FB.h * .93, z * FB.h * .15); num.renderOrder = 3; o.add(num); }
  }
  addBadge(o, code, FB.h * 1.18, sc); // plakietka z figurą nad głową
  o.position.copy(sqPos(sq, TOP)); o.rotation.y = c === 'w' ? 0 : Math.PI;
  o.userData = { code, y: TOP, player: true, face: o.rotation.y, mixer: new THREE.AnimationMixer(o), cap: (v, att) => { kickOut(v, att); return 650; } };
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

/* --- Dinozaury --- */
// król = tyranozaur, hetman = apatozaur, wieża = triceratops, goniec = parazaurolof, skoczek = welociraptor, pion = stegozaur
const DINO = { K: 'trex', Q: 'apato', R: 'trice', B: 'para', N: 'raptor', P: 'stego' };
const DINO_L = { K: 1.9, Q: 2.1, R: 1.55, B: 1.45, N: 1.4, P: 1.1 }; // długość względem pola
const DINO_TINT = { w: [0xd8f5a2, .2], b: [0x4a1010, .45] }; // białe jaśniejsze, czarne ciemniejsze (czerwonawe)
function makeDino(code, sq) {
  const c = code[0], t = code[1], M = DN[t], inner = SkeletonUtils.clone(M.scene), o = new THREE.Group(), b = M.box;
  const len = Math.max(b.max.z - b.min.z, b.max.x - b.min.x), s = SQ * DINO_L[t] / len, [tint, mix] = DINO_TINT[c];
  inner.traverse(m => { if (!m.isMesh) return; m.material = m.material.clone(); if (!/black|eye/i.test(m.material.name)) m.material.color.lerp(new THREE.Color(tint), mix); });
  inner.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); o.add(inner); o.scale.setScalar(s);
  const ring = new THREE.Mesh(new THREE.RingGeometry(SQ * .34 / s, SQ * .4 / s, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: teamCol(c), transparent: true, opacity: .6, depthWrite: false }));
  ring.position.y = .0008 / s; ring.renderOrder = 1; o.add(ring);
  addBadge(o, code, (b.max.y - b.min.y) * 1.15, s);
  o.position.copy(sqPos(sq, TOP)); o.rotation.y = c === 'w' ? 0 : Math.PI;
  const mixer = new THREE.AnimationMixer(inner);
  o.userData = { code, y: TOP, player: true, face: o.rotation.y, mixer, clips: M.clips, cheer: 'Jump', cap: bite,
    die: (v, from) => { play(v, 'Death', true); sinkAway(v, 900); } };
  mixers.add(mixer); play(o, 'Idle').time = Math.random() * 2;
  root.add(o); return o;
}
// zbicie dinozaurem: obrót do ofiary, atak, ofiara pada i zapada się w ziemię; potem bieg na pole
function bite(v, att) {
  const d = v.position.clone().sub(att.position); att.rotation.y = Math.atan2(d.x, d.z);
  play(att, 'Attack', false, true); opts.sound && opts.sound('roar');
  setTimeout(() => { play(v, 'Death', true); shake = .3; opts.sound && opts.sound('boom'); burst(v.position.clone().setY(TOP + .02), 50, [0xd9c38c, 0x8d6e4a, 0xffffff], .25, .5); sinkAway(v, 700); }, 450);
  return 1100;
}
function sinkAway(v, delay) {
  const y0 = v.position.y, s0 = v.scale.x;
  tween(600, e => { v.position.y = y0 - e * SQ * .5; v.scale.setScalar(s0 * (1 - e * .6)); }, () => removePiece(v), delay);
}
// dżungla: plansza z piasku i trawy, kamienie, paprocie i palmy dookoła, wulkan w tle
function makeJungle() {
  const g = new THREE.Group(), cv = document.createElement('canvas'); cv.width = cv.height = 1024; const x = cv.getContext('2d'), u = 1024 / 10;
  x.fillStyle = '#4f6b2a'; x.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(${30 + Math.random() * 60},${70 + Math.random() * 60},${20 + Math.random() * 30},.5)`; x.fillRect(Math.random() * 1024, Math.random() * 1024, 6, 6); }
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const lt = (r + f) % 2; x.fillStyle = lt ? '#e3cf9a' : '#7f9c47'; x.fillRect(u + f * u, u + r * u, u, u);
    for (let k = 0; k < 40; k++) { x.fillStyle = lt ? `rgba(160,130,80,${Math.random() * .35})` : `rgba(40,80,20,${Math.random() * .4})`; x.fillRect(u + f * u + Math.random() * u, u + r * u + Math.random() * u, 4, 4); }
  }
  x.strokeStyle = '#5c3d1e'; x.lineWidth = 10; x.strokeRect(u - 5, u - 5, 8 * u + 10, 8 * u + 10);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(SQ * 10, SQ * 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  gr.position.y = TOP; gr.receiveShadow = true; g.add(gr);
  const far = new THREE.Mesh(new THREE.CircleGeometry(3, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3f5a22, roughness: 1 }));
  far.position.y = TOP - .001; far.receiveShadow = true; g.add(far);
  const rock = new THREE.MeshStandardMaterial({ color: 0x7d7468, roughness: .9, flatShading: true }), trunk = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1, flatShading: true });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: .8, flatShading: true, side: THREE.DoubleSide }), fern = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: .8, flatShading: true, side: THREE.DoubleSide });
  const ring = (rMin, rMax) => { let px, pz; do { px = rnd(-rMax, rMax); pz = rnd(-rMax, rMax); } while (Math.max(Math.abs(px), Math.abs(pz)) < rMin); return [px, pz]; };
  for (let k = 0; k < 16; k++) { const [px, pz] = ring(SQ * 4.6, SQ * 6.5), m = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(.008, .02), 0), rock);
    m.position.set(px, TOP + .004, pz); m.rotation.set(rnd(0, 3), rnd(0, 3), 0); m.scale.y = .6; m.castShadow = true; g.add(m); }
  for (let k = 0; k < 14; k++) { const [px, pz] = ring(SQ * 4.7, SQ * 6.5), f = new THREE.Group();
    for (let j = 0; j < 6; j++) { const l = new THREE.Mesh(new THREE.ConeGeometry(.006, .045, 3), fern); l.rotation.set(0, j * 1.05, 0); l.rotateX(1.1); l.position.y = .012; f.add(l); }
    f.position.set(px, TOP, pz); f.scale.setScalar(rnd(.8, 1.3)); g.add(f); }
  for (let k = 0; k < 9; k++) { const [px, pz] = ring(SQ * 5.3, SQ * 7.5), p = new THREE.Group(), h = rnd(.16, .26);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.005, .009, h, 6), trunk); tr.position.y = h / 2; tr.rotation.z = rnd(-.15, .15); tr.castShadow = true; p.add(tr);
    for (let j = 0; j < 7; j++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.022, .1, 1, 3), leaf), q = l.geometry.attributes.position;
      for (let i = 0; i < q.count; i++) q.setZ(i, -Math.pow(q.getY(i) + .05, 2) * 4);
      l.geometry.translate(0, .05, 0); l.position.y = h; l.rotation.y = j * .9; l.rotateX(1.2); l.castShadow = true; p.add(l); }
    p.position.set(px, TOP, pz); g.add(p); }
  // wulkan z dymiącym kraterem po stronie czarnych
  const vol = new THREE.Mesh(new THREE.ConeGeometry(.55, .5, 9, 1, true), new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 1, flatShading: true }));
  vol.position.set(.3, TOP + .25, 1.6); g.add(vol);
  const lava = new THREE.Mesh(new THREE.CircleGeometry(.07, 9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7b00 }));
  lava.position.set(.3, TOP + .43, 1.6); g.add(lava);
  root.add(g); return g;
}

/* --- Roboty (transformersy z brył, projekt z Claude Design: Gwardia Pulsara kontra Legion Cienia) --- */
// robot ma ok. 1,1 jednostki wzrostu, przód = +z; pojazd stoi na y = 0, przód też +z.
// część: [kształt, materiał, wymiar robota, pozycja robota, obrót robota, wymiar pojazdu (0 = ten sam), pozycja pojazdu, obrót pojazdu];
// pozycja null = część schowana w tej postaci (wysuwa się albo chowa w trakcie przemiany). Nazwa kończąca się na L = para lewa/prawa.
const H = Math.PI / 2;
// paleta z projektu: P lakier główny, S lakier drugi, A biel/stal, C chrom, M mechanika, T opony, G szyby, E oczy, L reflektory, K kolce, X znak, O kontur
const RB_PAL = {
  w: { P: 0xC8102E, S: 0x1F5FD6, A: 0xD9DEE6, C: 0xC9D1DC, M: 0x2B3038, T: 0x1B1D22, G: 0x1A2E46, E: 0x8FE6FF, L: 0xFFF3D1, K: 0x9B6BEA, X: 0x11141A, O: 0x3DA5FF },
  b: { P: 0x3A3F48, S: 0x6B2FB8, A: 0x857C9C, C: 0x5C6270, M: 0x1C1F25, T: 0x141518, G: 0x1E0F2E, E: 0xFF5A4A, L: 0xFF7A9A, K: 0x9B6BEA, X: 0x0E0B14, O: 0xA04DFF },
};
const RB_COL = { w: { E: RB_PAL.w.E }, b: { E: RB_PAL.b.E } };
// szkielet robota (lewa strona; prawa = lustro)
const RB_BASE = {
  footL: ['b', 'M', [.14, .07, .2], [.11, .035, .02]],
  shinL: ['b', 'S', [.14, .27, .16], [.11, .205, 0]],
  kneeL: ['b', 'P', [.12, .08, .06], [.11, .33, .08]],
  thighL: ['b', 'M', [.1, .16, .11], [.11, .43, 0]],
  pelvis: ['b', 'S', [.3, .1, .17], [0, .55, 0]],
  abs: ['b', 'M', [.2, .09, .13], [0, .64, 0]],
  chest: ['b', 'P', [.42, .26, .22], [0, .81, 0]],
  winL: ['b', 'G', [.16, .08, .015], [.095, .86, .112]],
  grill: ['b', 'C', [.12, .08, .015], [0, .75, .112]],
  lightL: ['b', 'L', [.05, .028, .015], [.15, .75, .112]],
  emb: ['x', 'X', .028, [0, .86, .113], [H, 0, 0]],
  shL: ['b', 'P', [.15, .13, .19], [.29, .89, 0]],
  uarmL: ['b', 'M', [.07, .14, .08], [.29, .75, 0]],
  farmL: ['b', 'S', [.1, .19, .12], [.29, .58, 0]],
  handL: ['b', 'M', [.07, .07, .07], [.29, .45, 0]],
  neck: ['b', 'M', [.06, .05, .06], [0, .96, 0]],
  head: ['b', 'S', [.13, .13, .13], [0, 1.04, 0]],
  face: ['b', 'A', [.09, .06, .012], [0, 1.02, .066]],
  eyes: ['b', 'E', [.085, .02, .01], [0, 1.04, .073]],
  crest: ['b', 'C', [.025, .06, .07], [0, 1.13, 0]],
};
// figury: o = zmiany szkieletu (null = bez tej części), v = postać pojazdu {nazwa: [wymiar|0, pozycja, obrót?]}, x = dodatkowe części, vk = skala pojazdu
const RB = {
  K: { size: 1.12, vk: .62, // TYTAN / GROMOWŁAD: ciężarówka z naczepą
    o: { chest: { s: [.46, .26, .24] }, shL: { s: [.17, .14, .21], p: [.32, .9, 0] }, uarmL: { p: [.32, .75, 0] }, farmL: { p: [.32, .58, 0], s: [.11, .19, .13] }, handL: { p: [.32, .45, 0] },
      winL: { p: [.1, .86, .122] }, grill: { s: [.14, .1, .015], p: [0, .74, .122] }, lightL: { p: [.17, .74, .122] }, emb: { p: [0, .86, .123] }, shinL: { s: [.15, .27, .17] } },
    v: { chest: [[.4, .2, .2], [0, .17, .44]], winL: [[.15, .08, .015], [.085, .36, .545]], shL: [[.19, .14, .16], [.1, .35, .46]], grill: [[.14, .1, .015], [0, .17, .545]],
      lightL: [0, [.15, .12, .545]], emb: [0, [0, .27, .546]], shinL: [[.06, .08, .2], [.17, .13, .12]], kneeL: [[.06, .05, .16], [.17, .15, .42]], thighL: [[.05, .04, .95], [.08, .06, -.1]],
      pelvis: [[.3, .03, .3], [0, .09, .18]], abs: [[.16, .03, .12], [0, .11, .08]], farmL: [[.06, .07, .14], [.19, .09, .28]], crest: [[.04, .03, .08], [0, .45, .44]] },
    x: [['stackL', 'c', 'C', [.018, .28], [.22, 1.0, -.08], 0, 0, [.19, .42, .33]],
      ['plateL', 'b', 'C', [.22, .4, .04], [.14, .88, -.17], [0, 0, 0], [.2, .32, .66], [.1, .27, -.25]],
      ['stripeL', 'b', 'P', [.004, .025, .66], null, 0, 0, [.201, .21, -.25]], ['stripe2L', 'b', 'S', [.004, .015, .66], null, 0, 0, [.201, .18, -.25]],
      ['twheelL', 'w', 'T', [.07, .05], null, 0, 0, [.16, .07, -.47], [0, 0, H]], ['twheel2L', 'w', 'T', [.07, .05], null, 0, 0, [.16, .07, -.32], [0, 0, H]],
      ['fwheelL', 'w', 'T', [.07, .05], [.21, .08, .04], [0, 0, H], 0, [.17, .07, .42], [0, 0, H]], ['dwheelL', 'w', 'T', [.07, .05], [.21, .22, -.04], [0, 0, H], 0, [.17, .07, .12], [0, 0, H]],
      ['guardL', 'b', 'C', [.1, .08, .015], [.11, .17, .088], 0, [.18, .05, .03], [.09, .05, .565]], ['antL', 'c', 'C', [.008, .12], [.09, 1.1, 0], 0, [.008, .06], [.23, .34, .5]]] },
  Q: { size: 1.08, vk: .7, // ZEFIR / ŻMIJA: supersamochód
    o: { chest: { m: 'S', s: [.34, .22, .18], p: [0, .84, 0] }, shL: { m: 'S', s: [.13, .11, .16], p: [.24, .91, 0] }, uarmL: { p: [.24, .77, 0], s: [.06, .14, .07] },
      farmL: { m: 'M', p: [.24, .61, 0], s: [.08, .18, .1] }, handL: { p: [.24, .48, 0], s: [.06, .06, .06] }, shinL: { s: [.11, .32, .13], p: [.09, .23, 0] }, kneeL: { p: [.09, .38, .07], s: [.1, .07, .05] },
      thighL: { s: [.09, .2, .1], p: [.09, .49, 0], m: 'S' }, footL: { p: [.09, .035, .02], s: [.12, .07, .18] }, pelvis: { s: [.24, .1, .14], p: [0, .64, 0] }, abs: { s: [.16, .08, .11], p: [0, .73, 0] },
      winL: { s: [.12, .09, .015], p: [.065, .87, .092] }, grill: { m: 'P', s: [.12, .06, .015], p: [0, .71, .058] }, lightL: { p: [.12, .79, .092] }, emb: { p: [0, .8, .093] },
      neck: { p: [0, .98, 0] }, head: { p: [0, 1.05, 0], s: [.11, .12, .12] }, face: { p: [0, 1.03, .061], s: [.08, .055, .012] }, eyes: { p: [0, 1.045, .068], s: [.075, .02, .01] }, crest: { p: [0, 1.14, 0] } },
    v: { chest: [[.36, .07, .34], [0, .11, .3]], winL: [[.14, .06, .015], [.075, .19, .08], [-1.0, 0, 0]], head: [[.26, .04, .2], [0, .23, -.06]], abs: [[.28, .06, .24], [0, .17, -.3]],
      kneeL: [[.03, .05, .1], [.185, .12, -.15]], pelvis: [[.38, .08, .3], [0, .1, -.32]], thighL: [[.04, .08, .34], [.175, .1, -.3]], shL: [[.05, .08, .24], [.17, .1, .28]],
      shinL: [[.03, .04, .5], [.195, .05, 0]], lightL: [0, [.13, .11, .475]], emb: [0, [0, .15, .476]], grill: [[.34, .02, .05], [0, .07, .45]], crest: [[.36, .02, .08], [0, .27, -.44]] },
    x: [['doorL', 'b', 'S', [.06, .34, .03], [.15, 1.06, -.1], [0, 0, -.3], [.015, .09, .3], [.2, .15, -.02]],
      ['fwheelL', 'w', 'T', [.065, .05], [.31, .91, 0], [0, 0, H], 0, [.19, .065, .28], [0, 0, H]], ['rwheelL', 'w', 'T', [.065, .05], [.15, .2, 0], [0, 0, H], 0, [.19, .065, -.3], [0, 0, H]],
      ['postL', 'b', 'M', [.02, .05, .02], null, 0, 0, [.12, .24, -.44]]] },
  R: { size: 1.02, vk: .7, // BASTION / KRUSZYCIEL: czołg
    o: { chest: { s: [.5, .3, .26], p: [0, .78, 0] }, winL: null, grill: null, lightL: null, emb: { p: [0, .8, .133] }, shL: { s: [.17, .17, .24], p: [.33, .82, 0] },
      uarmL: { p: [.33, .66, 0] }, farmL: { s: [.14, .16, .16], p: [.33, .55, 0] }, handL: { p: [.33, .43, 0] }, pelvis: { s: [.42, .1, .2], p: [0, .58, 0] }, abs: null,
      shinL: { m: 'T', s: [.15, .32, .2], p: [.12, .2, 0] }, kneeL: { m: 'S', s: [.13, .14, .03], p: [.12, .25, .11] }, thighL: { p: [.12, .45, 0] }, footL: { s: [.17, .07, .22], p: [.12, .035, .02] },
      neck: null, head: { m: 'P', s: [.11, .09, .1], p: [0, .96, .05] }, face: { p: [0, .955, .102], s: [.08, .05, .012] }, eyes: { p: [0, .96, .109], s: [.07, .018, .01] }, crest: null },
    v: { chest: [[.3, .12, .3], [0, .28, 0]], shL: [[.06, .1, .3], [.18, .27, 0]], head: [[.08, .04, .08], [.06, .36, -.05]], pelvis: [[.4, .08, .8], [0, .16, 0]],
      farmL: [[.13, .06, .14], [.1, .17, .38], [.4, 0, 0]], shinL: [[.1, .11, .9], [.23, .06, 0]], kneeL: [[.1, .03, .86], [.23, .125, 0]], emb: [0, [0, .28, .152]] },
    x: [['gunL', 'c', 'C', [.025, .3], [.33, 1.06, -.02], 0, [.018, .3], [.035, .28, .3], [H, 0, 0]],
      ['mountL', 'b', 'M', [.07, .08, .08], [.33, .94, -.02], 0, [.07, .07, .08], [.04, .28, .16]],
      ['rw1L', 'w', 'C', [.03, .01], null, 0, 0, [.282, .06, -.3], [0, 0, H]], ['rw2L', 'w', 'C', [.03, .01], null, 0, 0, [.282, .06, -.1], [0, 0, H]],
      ['rw3L', 'w', 'C', [.03, .01], null, 0, 0, [.282, .06, .1], [0, 0, H]], ['rw4L', 'w', 'C', [.03, .01], null, 0, 0, [.282, .06, .3], [0, 0, H]],
      ['hatch', 'b', 'S', [.12, .08, .015], [0, .8, .131], 0, [.1, .02, .1], [0, .345, .05]]] },
  B: { size: .98, vk: .7, // SOKOLE OKO / SZAKAL: terenówka
    o: { chest: { m: 'S', s: [.4, .24, .2] }, shL: { m: 'A', s: [.16, .15, .19], p: [.28, .89, 0] }, farmL: { m: 'A', s: [.11, .18, .12], p: [.28, .58, 0] }, uarmL: { p: [.28, .75, 0] },
      handL: { p: [.28, .45, 0] }, kneeL: { m: 'A' }, winL: { s: [.15, .07, .015], p: [.09, .87, .102] }, grill: { s: [.14, .08, .015], p: [0, .75, .102] }, lightL: { p: [.15, .75, .102] }, emb: { p: [0, .87, .103] } },
    v: { chest: [[.4, .12, .3], [0, .18, .32]], winL: [[.17, .09, .015], [.09, .29, .16], [-.25, 0, 0]], grill: [[.16, .08, .015], [0, .17, .475]], lightL: [0, [.14, .17, .475]], emb: [0, [0, .23, .476]],
      head: [[.38, .03, .62], [0, .35, -.13]], farmL: [[.02, .11, .55], [.2, .28, -.13]], shL: [[.06, .05, .2], [.2, .15, .3]], pelvis: [[.4, .14, .62], [0, .17, -.13]],
      abs: [[.36, .03, .8], [0, .07, 0]], kneeL: [[.04, .03, .18], [.21, .08, 0]], thighL: [[.05, .06, .2], [.2, .15, -.3]] },
    x: [['rifle', 'b', 'M', [.03, .62, .03], [-.38, .55, .06], 0, [.32, .02, .5], [0, .37, -.12]], ['scope', 'b', 'C', [.03, .1, .03], [-.38, .72, .1], 0, [.025, .2, .025], [.2, .26, .34]],
      ['spare', 'w', 'T', [.08, .05], [0, 1.0, -.15], [H, 0, 0], 0, [0, .26, .33], [0, 0, 0]], ['bar', 'b', 'M', [.3, .03, .04], [0, .98, -.05], 0, 0, [0, .37, .18]],
      ['mono', 'c', 'C', [.022, .03], [.04, 1.05, .075], [H, 0, 0], 0, [.12, .38, .1]], ['swinL', 'b', 'G', [.005, .07, .45], null, 0, 0, [.205, .29, -.13]],
      ['fwheelL', 'w', 'T', [.08, .05], [.2, .08, 0], [0, 0, H], 0, [.2, .08, .3], [0, 0, H]], ['rwheelL', 'w', 'T', [.08, .05], [.2, .23, 0], [0, 0, H], 0, [.2, .08, -.3], [0, 0, H]]] },
  N: { size: .96, vk: .62, // HURAGAN / SZPON: myśliwiec
    o: { chest: { m: 'A', s: [.36, .24, .2] }, winL: null, grill: null, lightL: null, emb: { p: [0, .74, .103] }, shL: { s: [.13, .12, .17], p: [.26, .88, 0] },
      uarmL: { p: [.26, .75, 0] }, farmL: { m: 'A', p: [.26, .58, 0] }, handL: { p: [.26, .45, 0] }, pelvis: { m: 'A' }, shinL: { m: 'A' }, footL: { m: 'C', s: [.12, .08, .16] },
      head: { m: 'A' }, face: { m: 'M' }, crest: null },
    v: { chest: [[.2, .12, .5], [0, .14, .12]], pelvis: [[.2, .12, .4], [0, .14, -.3]], shL: [[.06, .08, .14], [.12, .12, .15]], farmL: [[.025, .025, .2], [.22, .1, -.05]],
      shinL: [[.08, .08, .3], [.06, .12, -.33]], footL: [[.07, .07, .06], [.06, .12, -.52]], thighL: [[.015, .06, .12], [.06, .06, -.25]], kneeL: [[.02, .12, .14], [.09, .24, -.4], [0, 0, -.2]],
      emb: [0, [0, .15, .376]] },
    x: [['cockpit', 'b', 'G', [.15, .13, .015], [0, .85, .103], 0, [.1, .07, .2], [0, .22, .22]], ['nose', 'b', 'P', [.12, .07, .03], [0, .66, .08], 0, [.08, .06, .2], [0, .13, .47]],
      ['wingL', 'b', 'P', [.38, .03, .13], [.22, 1.08, -.14], [0, 0, .95], [.36, .015, .3], [.24, .14, -.05], [0, -.35, 0]],
      ['finL', 'b', 'P', [.02, .07, .05], [.035, 1.12, 0], [0, 0, -.25], [.14, .012, .1], [.12, .14, -.46]], ['bandL', 'b', 'P', [.102, .03, .122], [.26, .62, 0], 0, [.002, .03, .5], [.101, .14, 0]]] },
  P: { size: .8, vk: .8, // ISKRA / ZGRZYT: rajdówka
    o: { chest: { s: [.34, .2, .18], p: [0, .76, 0] }, winL: { s: [.09, .07, .015], p: [.05, .8, .092] }, grill: null, lightL: { p: [.12, .72, .092] }, emb: { p: [0, .72, .093] },
      shL: { m: 'S', s: [.12, .1, .15], p: [.23, .83, 0] }, uarmL: { p: [.24, .72, 0] }, farmL: { p: [.24, .6, 0], s: [.1, .15, .11] }, handL: { p: [.24, .49, 0], s: [.06, .06, .06] },
      pelvis: { s: [.26, .09, .15], p: [0, .56, 0] }, abs: { s: [.18, .08, .12], p: [0, .64, 0] }, neck: { p: [0, .88, 0] },
      head: { s: [.17, .16, .16], p: [0, .97, 0] }, face: { s: [.12, .07, .012], p: [0, .95, .081] }, eyes: { s: [.1, .022, .01], p: [0, .96, .088] }, crest: { s: [.02, .07, .02], p: [0, 1.08, 0] } },
    v: { chest: [[.34, .1, .26], [0, .14, .22]], winL: [[.12, .07, .015], [.065, .24, .06], [-.6, 0, 0]], lightL: [0, [.12, .14, .355]], emb: [0, [0, .1, .355]],
      head: [[.3, .12, .26], [0, .25, -.1]], shL: [[.06, .07, .2], [.16, .12, .22]], pelvis: [[.34, .12, .28], [0, .13, -.2]], abs: [[.32, .03, .04], [0, .06, .36]],
      kneeL: [[.03, .03, .36], [.17, .05, 0]], shinL: [[.05, .07, .18], [.16, .12, -.22]], crest: [[.3, .015, .06], [0, .33, -.32]] },
    x: [['blaster', 'b', 'C', [.04, .04, .16], [-.3, .6, .08], 0, [.18, .03, .03], [0, .33, .03]], ['swinL', 'b', 'G', [.005, .06, .18], null, 0, 0, [.152, .26, -.1]],
      ['fwheelL', 'w', 'T', [.07, .05], [.3, .84, 0], [0, 0, H], 0, [.18, .07, .22], [0, 0, H]], ['rwheelL', 'w', 'T', [.07, .05], [.14, .2, -.02], [0, 0, H], 0, [.18, .07, -.22], [0, 0, H]]] },
};
// Legion Cienia: kolce na barkach i kolanach, rogi i wizjer V zamiast oczu (tylko w postaci robota)
const RB_EVIL = [['spikeL', 'k', 'K', [.03, .1], 'shL', [.5, .2, 0], [0, 0, -H]], ['kspikeL', 'k', 'K', [.022, .07], 'kneeL', [.6, 0, 0], [0, 0, -H]],
  ['hornL', 'k', 'K', [.018, .09], 'head', [.4, .5, 0], [0, 0, -.35]]];
const RB_MAT = {};
function rbMat(c, k) {
  const key = c + k; if (RB_MAT[key]) return RB_MAT[key];
  const col = RB_PAL[c][k], S = THREE.MeshStandardMaterial;
  const m = 'PSAK'.includes(k) ? new S({ color: col, metalness: .35, roughness: .3 }) : k === 'C' ? new S({ color: col, metalness: 1, roughness: .14 }) :
    k === 'M' ? new S({ color: col, metalness: .5, roughness: .6 }) : k === 'T' ? new S({ color: col, roughness: .9 }) :
    k === 'G' ? new S({ color: col, metalness: .9, roughness: .06 }) : k === 'X' ? new S({ color: col, roughness: .5 }) :
    new S({ color: col, emissive: col, emissiveIntensity: 2.2 });
  return RB_MAT[key] = m;
}
// bryła z fazowanymi krawędziami (jak w projekcie), w pamięci po wymiarach
const RB_GEO = {};
function rbBox(w, h, d) {
  const key = [w, h, d].join(); if (RB_GEO[key]) return RB_GEO[key];
  const b = Math.min(w, h, d) * .18, cw = w / 2 - b, ch = h / 2 - b, k = Math.min(cw, ch) * .3, s = new THREE.Shape();
  s.moveTo(-cw + k, -ch); s.lineTo(cw - k, -ch); s.lineTo(cw, -ch + k); s.lineTo(cw, ch - k); s.lineTo(cw - k, ch); s.lineTo(-cw + k, ch); s.lineTo(-cw, ch - k); s.lineTo(-cw, -ch + k); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, -(d - 2 * b) / 2); return RB_GEO[key] = g;
}
function rbMesh(shape, c, mk, a) {
  let g;
  if (shape === 'b') g = rbBox(...a);
  else if (shape === 'c') g = RB_GEO['c' + a] || (RB_GEO['c' + a] = new THREE.CylinderGeometry(a[0], a[0], a[1], 12));
  else if (shape === 'k') g = RB_GEO['k' + a] || (RB_GEO['k' + a] = new THREE.ConeGeometry(a[0], a[1], 6).translate(0, a[1] / 2, 0));
  else if (shape === 'x') g = RB_GEO['x' + a] || (RB_GEO['x' + a] = new THREE.CylinderGeometry(a, a, .012, 6));
  else g = RB_GEO['w' + a] || (RB_GEO['w' + a] = new THREE.CylinderGeometry(a[0], a[0], a[1], 18));
  const m = new THREE.Mesh(g, rbMat(c, mk)); m.castShadow = true;
  if (shape === 'w' && mk === 'T') { const h = new THREE.Mesh(RB_GEO['h' + a] || (RB_GEO['h' + a] = new THREE.CylinderGeometry(a[0] * .55, a[0] * .55, a[1] * 1.08, 10)), rbMat(c, 'C')); m.add(h); }
  if (shape === 'x') { const d = new THREE.Mesh(RB_GEO['xd' + a] || (RB_GEO['xd' + a] = new THREE.CylinderGeometry(a * .5, a * .5, .014, 4)), new THREE.MeshBasicMaterial({ color: c === 'w' ? RB_PAL.w.O : RB_PAL.b.E })); m.add(d); }
  return m;
}
// lista części figury: szkielet z poprawkami + dodatki, pary L/R rozpisane
function rbParts(c, t) {
  const R = RB[t], out = [], q = e => new THREE.Quaternion().setFromEuler(new THREE.Euler(...(e || [0, 0, 0])));
  const add = (name, shape, mk, size, rp, rr, vs, vp, vr) => {
    const pair = /L$/.test(name), one = (sx, nm) => {
      const fx = v => v && [v[0] * sx, v[1], v[2]], fr = r => r && (sx > 0 ? r : [r[0], -r[1], -r[2]]);
      out.push({ name: nm, shape, mk, size, rp: rp && new THREE.Vector3(...fx(rp)), rq: q(fr(rr)), vp: vp && new THREE.Vector3(...fx(vp)), vq: q(fr(vr)),
        vs: vs && shape === 'b' ? new THREE.Vector3(vs[0] / size[0], vs[1] / size[1], vs[2] / size[2]) : vs && shape !== 'b' ? new THREE.Vector3(vs[0] / size[0], vs[1] / size[1], vs[0] / size[0]) : new THREE.Vector3(1, 1, 1) }); };
    one(1, name); if (pair) one(-1, name.slice(0, -1) + 'R');
  };
  for (const [name, base] of Object.entries(RB_BASE)) {
    const o = R.o[name]; if (o === null) continue;
    const [shape, mk0, size0, rp0, rr0] = base, mk = o && o.m || mk0, size = o && o.s || size0, rp = o && o.p || rp0, v = R.v[name];
    add(name, shape, mk, size, rp, rr0, v && v[0] || null, v ? v[1] : null, v && v[2] || (shape === 'x' ? [H, 0, 0] : null));
  }
  for (const [name, shape, mk, size, rp, rr, vs, vp, vr] of R.x) add(name, shape, mk, size, rp, rr || null, vs || null, vp, vr || null);
  if (c === 'b') {
    for (const [name, shape, mk, size, at, off, rr] of RB_EVIL) { const B = out.find(p => p.name === at); if (!B) continue;
      const bs = (R.o[at] && R.o[at].s) || RB_BASE[at][2], p = [B.rp.x + bs[0] * off[0], B.rp.y + bs[1] * off[1], B.rp.z + bs[2] * off[2]];
      add(name, shape, mk, size, p, rr, null, null, null); }
    const E = out.find(p => p.name === 'eyes'); if (E) { const i = out.indexOf(E), [w, h, d] = RB_BASE.eyes[2], p = E.rp;
      out.splice(i, 1); add('visL', 'b', 'E', [w * .55, h, d], [w * .24, p.y - .006, p.z], [0, 0, .35], null, null, null); }
  }
  return out;
}
function makeRobot(code, sq) {
  const c = code[0], t = code[1], R = RB[t], o = new THREE.Group(), body = new THREE.Group(), s = SQ * 1.4 * R.size, parts = [];
  for (const P of rbParts(c, t)) {
    const m = rbMesh(P.shape, c, P.mk, P.size); P.m = m; P.wheel = P.shape === 'w' && P.mk === 'T';
    P.d = (P.rp ? THREE.MathUtils.clamp(P.rp.y / 1.15, 0, 1) : .5) * .4; // nogi ruszają pierwsze, głowa ostatnia
    body.add(m); parts.push(P);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(SQ * .34 / s, SQ * .4 / s, 40).rotateX(-H), new THREE.MeshBasicMaterial({ color: RB_PAL[c].O, transparent: true, opacity: .7, depthWrite: false }));
  ring.position.y = .0008 / s; ring.renderOrder = 1; o.add(ring);
  o.add(body); o.scale.setScalar(s);
  addBadge(o, code, 1.38, s);
  o.position.copy(sqPos(sq, TOP)); o.rotation.y = c === 'w' ? 0 : Math.PI;
  o.userData = { code, y: TOP, robot: true, face: o.rotation.y, parts, body, vk: R.vk, form: 0, cap: laser, die: (v, from) => breakApart(v, from) };
  setForm(o, 0); root.add(o); return o;
}
// przemiana: k = 0 robot, 1 pojazd; każda część rusza po swoim czasie, leci łukiem w górę i obraca się,
// części tylko jednej postaci wysuwają się ze środka albo chowają (skala 0)
const RB_IN = { r: new THREE.Vector3(0, .7, 0), v: new THREE.Vector3(0, .12, 0) }, RB_V = new THREE.Vector3();
function setForm(o, k) {
  const U = o.userData; U.form = k;
  for (const P of U.parts) {
    const e = ease(THREE.MathUtils.clamp((k - P.d) / .6, 0, 1)), a = P.rp || RB_IN.r, b = P.vp || RB_IN.v;
    P.m.position.lerpVectors(a, b, e); P.m.position.y += Math.sin(Math.PI * e) * .12;
    P.m.quaternion.slerpQuaternions(P.rq, P.vq, e);
    const vis = !P.rp ? e : !P.vp ? 1 - e : 1;
    RB_V.set(1, 1, 1).lerp(P.vs, e).multiplyScalar(Math.max(.001, vis)); P.m.scale.copy(RB_V); P.m.visible = vis > .01;
  }
  U.body.scale.setScalar(1 - k * (1 - U.vk));
}
function transform(o, to, d, delay = 0) {
  const k0 = o.userData.form;
  setTimeout(() => opts.sound && opts.sound('tf'), delay);
  tween(d, (e, p) => setForm(o, k0 + (to - k0) * p), null, delay);
}
// ruch robota: składa się w auto, jedzie (skoczek – skacze z obrotem), rozkłada się z powrotem przodem do przeciwnika
function drive(o, b, knight, onLand) {
  const a = o.position.clone(), dist = a.distanceTo(b) / SQ, T = 380, d = 260 + dist * 110, wait = o.userData.wait || 0; o.userData.wait = 0;
  const ang = Math.atan2(b.x - a.x, b.z - a.z), r0 = o.rotation.y, U = o.userData;
  tween(T, e => { o.rotation.y = r0 + shortAng(r0, ang) * e; }, null, wait);
  transform(o, 1, T, wait);
  tween(d, (e, p) => { o.position.lerpVectors(a, b, e); if (knight) { o.position.y = b.y + Math.sin(Math.PI * p) * SQ * 1.3; U.body.rotation.z = p * Math.PI * 2; } // skoczek = myśliwiec: beczka w locie
      U.parts.forEach(P => { if (P.wheel) P.m.rotateY(.5); }); },
    () => { U.body.rotation.z = 0; opts.sound && opts.sound('tap'); const r1 = o.rotation.y; tween(T, e => { o.rotation.y = r1 + shortAng(r1, U.face) * e; }); onLand && onLand(); }, wait + T);
  transform(o, 0, T, wait + T + d);
  return wait + T * 2 + d;
}
// zbicie robotem: obrót do celu, strzał laserem z piersi, cel rozpada się na części
function laser(v, att) {
  const d = v.position.clone().sub(att.position), ang = Math.atan2(d.x, d.z), r0 = att.rotation.y;
  tween(220, e => { att.rotation.y = r0 + shortAng(r0, ang) * e; });
  setTimeout(() => {
    const from = att.localToWorld(new THREE.Vector3(0, .78, .2)), to = v.position.clone().setY(TOP + SQ * .7), len = from.distanceTo(to);
    root.worldToLocal(from); root.worldToLocal(to);
    const col = RB_COL[att.userData.code[0]].E, beam = new THREE.Mesh(new THREE.CylinderGeometry(.0025, .0025, len, 6).rotateX(H), new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending }));
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, len, 8).rotateX(H), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
    for (const m of [beam, glow]) { m.position.copy(from).lerp(to, .5); m.lookAt(root.localToWorld(to.clone())); root.add(m); }
    opts.sound && opts.sound('zap');
    tween(260, e => { beam.material.opacity = 1 - e; glow.material.opacity = .35 * (1 - e); glow.scale.set(1 + e, 1 + e, 1); }, () => { root.remove(beam); root.remove(glow); });
    burst(to, 40, [col, 0xffffff], .3, .35); breakApart(v, att.position.clone());
  }, 260);
  return 750;
}
// rozpad robota: części lecą łukiem we wszystkie strony, wirują i znikają; slow = mat (król rozsypuje się wolniej)
function breakApart(o, from, slow) {
  const U = o.userData, c = o.position.clone(), dir = from ? c.clone().sub(from).setY(0).normalize() : new THREE.Vector3();
  opts.sound && opts.sound('boom'); shake = slow ? .7 : .45;
  burst(c.clone().setY(TOP + SQ * .6), 120, [0xffd43b, 0xff922b, 0xffffff, RB_COL[U.code[0]].E], .5, .6);
  o.traverse(m => { if (m.isSprite) m.visible = false; });
  U.parts.forEach(P => {
    const p0 = P.m.position.clone(), v = new THREE.Vector3(rnd(-1, 1) + dir.x * 1.5, rnd(.6, 1.6), rnd(-1, 1) + dir.z * 1.5).multiplyScalar(slow ? .5 : 1), spin = new THREE.Vector3(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8));
    const r0 = P.m.rotation.clone(), T = slow ? 1.6 : 1.1, ground = 0.05;
    tween(T * 1000, (e, p) => { const t = p * T; P.m.position.set(p0.x + v.x * t, Math.max(ground, p0.y + v.y * t - 2.2 * t * t), p0.z + v.z * t);
      P.m.rotation.set(r0.x + spin.x * t, r0.y + spin.y * t, r0.z + spin.z * t); if (p > .75) P.m.scale.setScalar(Math.max(.01, (1 - p) * 4)); });
  });
  setTimeout(() => removePiece(o), (slow ? 1.6 : 1.1) * 1000 + 50);
}
function hop(o, delay) { const y = o.position.y; tween(380, (e, p) => { o.position.y = y + Math.sin(Math.PI * p) * SQ * .5; }, null, delay); }
// hala robotów: stalowe płyty, świecące linie, pas ostrzegawczy dookoła
function makeArena() {
  const g = new THREE.Group(), cv = document.createElement('canvas'); cv.width = cv.height = 1024; const x = cv.getContext('2d'), u = 1024 / 10;
  for (let r = 0; r < 10; r++) for (let f = 0; f < 10; f++) { x.fillStyle = (r + f) % 2 ? '#d9b100' : '#1c1c1c'; x.fillRect(f * u, r * u, u, u); }
  x.save(); x.beginPath(); x.rect(0, 0, 1024, 1024); x.rect(u, u, 8 * u, 8 * u); x.clip('evenodd');
  for (let k = -20; k < 30; k++) { x.fillStyle = k % 2 ? '#f2c200' : '#151515'; x.beginPath(); x.moveTo(k * 50, 0); x.lineTo(k * 50 + 50, 0); x.lineTo(k * 50 + 50 - 1024, 1024); x.lineTo(k * 50 - 1024, 1024); x.fill(); }
  x.restore();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const lt = (r + f) % 2, X = u + f * u, Y = u + r * u, gr = x.createLinearGradient(X, Y, X + u, Y + u);
    gr.addColorStop(0, lt ? '#b7c1cc' : '#3a4350'); gr.addColorStop(1, lt ? '#8b96a3' : '#262d37'); x.fillStyle = gr; x.fillRect(X, Y, u, u);
    x.fillStyle = lt ? '#6c7783' : '#555f6c'; for (const [a, b] of [[8, 8], [u - 12, 8], [8, u - 12], [u - 12, u - 12]]) x.fillRect(X + a, Y + b, 4, 4); // nity
  }
  x.strokeStyle = '#22d3ee'; x.lineWidth = 3; x.shadowColor = '#22d3ee'; x.shadowBlur = 10;
  for (let k = 0; k <= 8; k++) { x.beginPath(); x.moveTo(u + k * u, u); x.lineTo(u + k * u, 9 * u); x.stroke(); x.beginPath(); x.moveTo(u, u + k * u); x.lineTo(9 * u, u + k * u); x.stroke(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(SQ * 10, SQ * 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: .55, metalness: .5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .12 }));
  fl.position.y = TOP; fl.receiveShadow = true; g.add(fl);
  const far = new THREE.Mesh(new THREE.CircleGeometry(3, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: .7, metalness: .4 }));
  far.position.y = TOP - .001; g.add(far);
  // słupy z lampami w rogach
  const pole = new THREE.MeshStandardMaterial({ color: 0x3a4350, metalness: .8, roughness: .3 }), lamp = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(.02, .22, .02), pole); p.position.set(px * SQ * 5.4, TOP + .11, pz * SQ * 5.4); p.castShadow = true; g.add(p);
    const l = new THREE.Mesh(new THREE.BoxGeometry(.026, .012, .026), lamp); l.position.set(px * SQ * 5.4, TOP + .225, pz * SQ * 5.4); g.add(l);
  }
  root.add(g); return g;
}
