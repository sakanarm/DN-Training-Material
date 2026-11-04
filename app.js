/* DA Training Academy — แกนหลัก: สถานะ การบันทึกคะแนน การเชื่อมต่อฐานข้อมูล และหน้าจอผู้เรียน */
(function () {
'use strict';
const C = window.COURSE;
const DA = window.DA = { engines: {}, acts: {} };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEYS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];
const PASS = C.passMark || 80;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
const pct = v => Math.max(0, Math.min(100, Math.round(num(v))));
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
Object.assign(DA, { $, $$, esc, shuffle, KEYS, PASS });

/* ── ไอคอน ── */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  chart: '<path d="M4 20V11M10 20V4M16 20v-6M21 20H3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 2h14v-4"/>',
  video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-3.5v11L16 14"/>',
  puzzle: '<path d="M10 3h4v3a2 2 0 1 0 4 0V3h3v7h-3a2 2 0 1 0 0 4h3v7h-7v-3a2 2 0 1 0-4 0v3H3v-7h3a2 2 0 1 0 0-4H3V3z"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4M9 11.5l2 2 4-4M9 17h6"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
  warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  upload: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  tooth: '<path d="M7 3C4.5 3 3 5 3 7.5c0 3 1.5 4.5 2 7 .5 3 1 6.5 2.5 6.5S9.5 17 10 15c.4-1.4 1.1-2 2-2s1.6.6 2 2c.5 2 1 6 2.5 6s2-3.5 2.5-6.5c.5-2.5 2-4 2-7C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  seq: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 4h1.5v4M3.5 8h3M3.5 14.6a1.3 1.3 0 0 1 2.5.5c0 1-2.5 2-2.5 2.9H6"/>',
  match: '<circle cx="5.5" cy="6" r="2.5"/><circle cx="5.5" cy="18" r="2.5"/><rect x="16" y="3.5" width="5" height="5" rx="1"/><rect x="16" y="15.5" width="5" height="5" rx="1"/><path d="M8 6.8 16 17M8 17.2 16 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  tray: '<path d="M3 13h18l-2 6H5z"/><path d="M7 13V6M11 13V4M15 13V7M18 13l1-6"/>',
  present: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  download: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  chair: '<path d="M7 3v9h9"/><path d="M7 12l-2 4h12l1-4"/><path d="M9 16v4M15 16v4M16 12V8h3"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-5-2.7L2.6 15.4a1.6 1.6 0 0 1 2.6-1.9L8 16"/>',
  heart: '<path d="M12 20s-7.5-4.6-9-9.5C2 7 4.4 4 7.5 4c2 0 3.5 1.2 4.5 2.6C13 5.2 14.5 4 16.5 4 19.6 4 22 7 21 10.5 19.5 15.4 12 20 12 20z"/><path d="M7 11h2.5l1.5-2.5 2 5 1.5-2.5H17"/>'
};
const ic = (n, cls) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${ICONS[n] || ''}</svg>`;
DA.ic = ic;

const PTYPE = {
  tray: { name: 'จัดถาดเครื่องมือ', icon: 'tray', desc: 'เลือกเครื่องมือจากภาพจริงของคลินิกลงถาดให้ครบ จับเวลาเหมือนเตรียมห้องจริง แล้วเทียบกับถาดมาตรฐานของสาขา' },
  tooth: { name: 'แผนภูมิฟัน FDI', icon: 'tooth', desc: 'แตะฟันตามเลขที่ทันตแพทย์บอก ฝึกจำตำแหน่งแบบเห็นภาพ' },
  clock: { name: 'ตำแหน่งตามหน้าปัดนาฬิกา', icon: 'clock', desc: 'แตะโซนนั่งและโซนส่งเครื่องมือรอบเก้าอี้ทำฟัน' },
  scenario: { name: 'สถานการณ์จำลอง', icon: 'chat', desc: 'ตัดสินใจทีละขั้นเหมือนอยู่ข้างเก้าอี้จริง' },
  sequence: { name: 'เรียงลำดับขั้นตอน', icon: 'seq', desc: 'เรียงขั้นตอน เช่น สวม-ถอด PPE ให้ถูกลำดับ' },
  match: { name: 'จับคู่', icon: 'match', desc: 'จับคู่ภาพเครื่องมือกับชื่อ หรือศัพท์กับความหมาย' },
  spot: { name: 'จับผิด', icon: 'search', desc: 'หาการกระทำที่ผิดในสถานการณ์ประจำวัน' }
};
DA.PTYPE = PTYPE;

/* ── สถานะ ── */
const S = DA.S = {
  mode: 'connecting', why: '', sync: 'connecting', uid: null, canEdit: false,
  db: null, user: null, assets: null, downloads: null,
  prog: null, localUid: null, signoff: null, media: {},
  route: { name: 'home' }, present: false, writing: false, dirty: false,
  curBlocks: [], railOpen: false
};
const LS_KEY = 'da-training:v1', LS_PREFS = 'da-training:prefs';
function lsGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ใช้ต่อได้แม้เก็บไม่ได้ */ } }
DA.lsGet = lsGet; DA.lsSet = lsSet;

const DRAFT = C.modules.filter(m => m.status === 'draft');
const modNo = m => parseInt(m.id.slice(1), 10);
const modById = id => C.modules.find(m => m.id === id);
DA.DRAFT = DRAFT; DA.modNo = modNo; DA.modById = modById;

function blankProg() { return { v: 1, profile: { name: '', nickname: '', branch: '', startDate: '', at: 0 }, modules: {}, updatedAt: 0 }; }
/* ทำความสะอาดข้อมูลที่อ่านมา (จากเครื่องหรือฐานข้อมูล) ให้อยู่ในรูปที่หน้าเว็บคาดไว้ */
function cleanProg(x) {
  const p = blankProg();
  if (!x || typeof x !== 'object') return p;
  const pr = x.profile && typeof x.profile === 'object' ? x.profile : {};
  p.profile = { name: str(pr.name, 60), nickname: str(pr.nickname, 30), branch: str(pr.branch, 60), startDate: str(pr.startDate, 10), at: num(pr.at) };
  const mods = x.modules && typeof x.modules === 'object' ? x.modules : {};
  for (const m of DRAFT) {
    const s = mods[m.id];
    if (!s || typeof s !== 'object') continue;
    const o = { pre: null, lessons: {}, practice: {}, post: null };
    if (s.pre && typeof s.pre === 'object' && isFinite(s.pre.score)) o.pre = { score: pct(s.pre.score), at: num(s.pre.at) };
    if (s.lessons && typeof s.lessons === 'object') for (const l of m.lessons) if (s.lessons[l.key]) o.lessons[l.key] = num(s.lessons[l.key]) || 1;
    if (s.practice && typeof s.practice === 'object') for (const q of m.practice) {
      const r = s.practice[q.id];
      if (r && typeof r === 'object' && isFinite(r.best)) o.practice[q.id] = { best: pct(r.best), last: pct(r.last), tries: Math.max(1, num(r.tries) | 0), at: num(r.at), timeSec: num(r.timeSec) };
    }
    if (s.post && typeof s.post === 'object' && isFinite(s.post.best)) o.post = { best: pct(s.post.best), last: pct(s.post.last), attempts: Math.max(1, num(s.post.attempts) | 0), at: num(s.post.at), passedAt: num(s.post.passedAt) };
    p.modules[m.id] = o;
  }
  p.updatedAt = num(x.updatedAt);
  return p;
}
function mergeProg(a, b) {
  const o = blankProg();
  o.profile = (b.profile.at || 0) >= (a.profile.at || 0) ? b.profile : a.profile;
  if (!o.profile.name) o.profile = a.profile.name ? a.profile : b.profile;
  const later = (u, v) => (u.at >= v.at ? u : v);
  for (const m of DRAFT) {
    const x = a.modules[m.id], y = b.modules[m.id];
    if (!x && !y) continue;
    if (!x || !y) { o.modules[m.id] = JSON.parse(JSON.stringify(x || y)); continue; }
    const r = { pre: null, lessons: Object.assign({}, x.lessons, y.lessons), practice: {}, post: null };
    r.pre = !x.pre ? y.pre : !y.pre ? x.pre : (x.pre.at <= y.pre.at ? x.pre : y.pre);
    for (const k of new Set([...Object.keys(x.practice), ...Object.keys(y.practice)])) {
      const u = x.practice[k], v = y.practice[k];
      r.practice[k] = !u ? v : !v ? u : { best: Math.max(u.best, v.best), last: later(u, v).last, tries: Math.max(u.tries, v.tries), at: Math.max(u.at, v.at), timeSec: later(u, v).timeSec };
    }
    const u = x.post, v = y.post;
    if (!u || !v) r.post = u || v;
    else {
      const pa = [u.passedAt, v.passedAt].filter(Boolean);
      r.post = { best: Math.max(u.best, v.best), last: later(u, v).last, attempts: Math.max(u.attempts, v.attempts), at: Math.max(u.at, v.at), passedAt: pa.length ? Math.min(...pa) : 0 };
    }
    o.modules[m.id] = r;
  }
  o.updatedAt = Math.max(a.updatedAt, b.updatedAt);
  return o;
}
function cleanSignoff(x) {
  const o = { modules: {} };
  if (!x || typeof x !== 'object' || !x.modules || typeof x.modules !== 'object') return o;
  for (const m of DRAFT) {
    const s = x.modules[m.id];
    if (!s || typeof s !== 'object') continue;
    o.modules[m.id] = { items: m.checklist.map((_, i) => !!(Array.isArray(s.items) && s.items[i] === true)), by: str(s.by, 60), at: num(s.at) };
  }
  return o;
}
Object.assign(DA, { blankProg, cleanProg, mergeProg, cleanSignoff });

/* ── คำนวณความคืบหน้า ── */
const EMPTY_MD = { pre: null, lessons: {}, practice: {}, post: null };
const gm = (id, prog) => (prog || S.prog).modules[id] || EMPTY_MD;
function wm(id) { const ms = S.prog.modules; return ms[id] || (ms[id] = { pre: null, lessons: {}, practice: {}, post: null }); }
const postPassed = md => !!(md.post && md.post.best >= PASS);
const signedAll = (m, so) => { const s = so && so.modules && so.modules[m.id]; return !!(s && m.checklist.every((_, i) => s.items[i])); };
function modPct(m, prog) {
  const md = gm(m.id, prog);
  const units = 2 + m.lessons.length + m.practice.length;
  const done = (md.pre ? 1 : 0) + m.lessons.filter(l => md.lessons[l.key]).length + m.practice.filter(p => md.practice[p.id]).length + (postPassed(md) ? 1 : 0);
  return Math.round(done / units * 100);
}
function modStatus(m, prog, so) {
  const md = gm(m.id, prog), p = modPct(m, prog);
  if (postPassed(md) && signedAll(m, so)) return { key: 'done', label: 'ผ่านสมบูรณ์', pct: 100, chip: 'chip-ok' };
  if (postPassed(md)) return { key: 'wait', label: 'ผ่านทฤษฎี · รอประเมินหน้างาน', short: 'รอประเมินหน้างาน', pct: p, chip: 'chip-warn' };
  if (p > 0) return { key: 'prog', label: `กำลังเรียน ${p}%`, short: 'กำลังเรียน', pct: p, chip: 'chip-brand' };
  return { key: 'none', label: 'ยังไม่เริ่ม', pct: 0, chip: '' };
}
function learnerStatus(prog, so) {
  const st = DRAFT.map(m => modStatus(m, prog, so).key);
  if (st.every(k => k === 'done')) return 'done';
  if (st.every(k => k === 'done' || k === 'wait')) return 'wait';
  if (st.some(k => k !== 'none')) return 'prog';
  return 'none';
}
Object.assign(DA, { modPct, modStatus, learnerStatus, postPassed, signedAll, gm });

function modSteps(m) {
  const s = [{ id: 'pre', kind: 'pre', title: 'แบบทดสอบก่อนเรียน' }];
  m.lessons.forEach((l, i) => s.push({ id: 'L:' + l.key, kind: 'lesson', title: l.title, n: i + 1, l }));
  m.practice.forEach((p, i) => s.push({ id: 'P:' + p.id, kind: 'practice', title: p.title, n: i + 1, p }));
  s.push({ id: 'post', kind: 'post', title: 'แบบทดสอบหลังเรียน' });
  s.push({ id: 'check', kind: 'check', title: 'ประเมินหน้างาน' });
  return s;
}
function stepDone(m, st) {
  const md = gm(m.id);
  if (st.kind === 'pre') return !!md.pre;
  if (st.kind === 'lesson') return !!md.lessons[st.l.key];
  if (st.kind === 'practice') return !!md.practice[st.p.id];
  if (st.kind === 'post') return postPassed(md);
  return signedAll(m, S.signoff);
}
function lockReason(m, st) {
  if (S.present || S.route.peek) return '';
  const md = gm(m.id);
  if (st.kind === 'lesson' || st.kind === 'practice') return md.pre ? '' : 'pre';
  if (st.kind === 'post') {
    if (!md.pre) return 'pre';
    if (!m.lessons.every(l => md.lessons[l.key]) || !m.practice.every(p => md.practice[p.id])) return 'learn';
  }
  return '';
}
function firstOpenStep(m) {
  const steps = modSteps(m);
  const st = steps.find(s => s.kind !== 'check' && !stepDone(m, s) && !lockReason(m, s));
  return st ? st.id : (postPassed(gm(m.id)) ? 'check' : 'pre');
}
function nextAction() {
  for (const m of DRAFT) if (!postPassed(gm(m.id))) {
    const sid = firstOpenStep(m), st = modSteps(m).find(s => s.id === sid);
    return { m, sid, title: st.title, sub: `บทที่ ${modNo(m)} · ${m.title}` };
  }
  return null;
}

/* ── บันทึกในเครื่อง + ฐานข้อมูล ── */
function persistLocal() { lsSet(LS_KEY, { uid: S.localUid, prog: S.prog }); }
let saveT = null;
function save(now) {
  S.prog.updatedAt = Date.now();
  persistLocal();
  if (S.mode !== 'cloud') return;
  S.dirty = true; setSync('pending');
  clearTimeout(saveT); saveT = setTimeout(flush, now ? 0 : 500);
}
const errCode = e => (e && typeof e.code === 'string' ? e.code : 'unavailable');
async function retryOnce(fn) {
  try { return await fn(); }
  catch (e) { const c = errCode(e); if (c === 'unavailable' || c === 'store_unavailable' || !KNOWN.has(c)) { await sleep(600 + Math.random() * 900); return fn(); } throw e; }
}
const KNOWN = new Set(['invalid_argument', 'resource_exhausted', 'quota_exceeded', 'unavailable', 'revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'transform_error']);
DA.retryOnce = retryOnce; DA.errCode = errCode;
async function flush() {
  if (S.mode !== 'cloud' || !S.db || S.writing) return;
  S.writing = true; S.dirty = false; setSync('saving');
  const data = JSON.parse(JSON.stringify(S.prog));
  try {
    await retryOnce(() => S.db.doc('progress/' + S.uid).set(data));
    S.writing = false;
    if (S.dirty) return flush();
    setSync('cloud');
  } catch (e) { S.writing = false; dbErr(e, 'write'); }
}
function dbErr(e, ctx) {
  const c = errCode(e);
  if (c === 'quota_exceeded' || c === 'resource_exhausted') { setSync('pending'); if (ctx === 'write') toast('ระบบรับข้อมูลไม่ได้ชั่วคราว คะแนนยังเก็บไว้ในเครื่องนี้'); return; }
  if (c === 'invalid_argument' || c === 'transform_error' || c === 'not_granted') return goLocal('denied');
  if (c === 'revoked' || c === 'capability_disabled' || c === 'capability_removed') return goLocal('off');
  setSync('pending');
  if (ctx === 'write') toast('เชื่อมต่อระบบไม่ได้ชั่วคราว คะแนนเก็บไว้ในเครื่องแล้ว');
}
DA.dbErr = dbErr;
function goLocal(why) { S.mode = 'local'; S.why = why; persistLocal(); renderSync(); if (S.route.name === 'results') renderMain(); }

async function connect() {
  const c = window.claude;
  if (!c || typeof c.use !== 'function') return goLocal('nohost');
  const use = n => Promise.resolve().then(() => c.use(n)).catch(() => null);
  const [db, user, assets, downloads] = await Promise.all(['db', 'user', 'assets', 'downloads'].map(use));
  S.user = user; S.assets = assets; S.downloads = downloads;
  if (user) { try { S.canEdit = !!(await user.canEdit()); } catch (e) { S.canEdit = false; } }
  if (!db) { renderNav(); return goLocal(user ? 'nodb' : 'signedout'); }
  S.db = db;
  let uid = null;
  try { uid = user ? await user.id() : null; } catch (e) { uid = null; }
  subscribeMedia();
  renderNav();
  if (!uid) return goLocal('signedout');
  S.uid = uid;
  let w = null;
  try { w = await user.can('data.write'); } catch (e) { w = null; }
  if (w === false) return goLocal('readonly');
  subscribeProgress();
  subscribeSignoff();
  if (S.route.name === 'hr' || S.route.name === 'person') renderMain();
}
function subscribeProgress() {
  S.mode = 'cloud'; setSync('connecting');
  let settled = false;
  const timer = setTimeout(() => { if (!settled) { setSync('pending'); toast('ยังเชื่อมต่อฐานข้อมูลไม่ได้ คะแนนจะเก็บในเครื่องก่อน'); } }, 10000);
  try {
    S.db.doc('progress/' + S.uid).onSnapshot(snap => {
      if (snap.metadata && snap.metadata.hasPendingWrites) return;
      const cloud = snap.exists ? cleanProg(snap.data()) : null;
      if (!settled) {
        if (S.localUid && S.localUid !== S.uid) S.prog = blankProg();
        S.localUid = S.uid;
      }
      const before = JSON.stringify(S.prog);
      S.prog = cloud ? mergeProg(S.prog, cloud) : S.prog;
      persistLocal();
      const fresh = !(snap.metadata && snap.metadata.fromCache);
      if (fresh && !settled) {
        settled = true; clearTimeout(timer);
        const needWrite = hasAny(S.prog) && (!cloud || JSON.stringify(S.prog) !== JSON.stringify(cloud));
        if (needWrite) save(true); else if (!S.writing) setSync('cloud');
      }
      if (JSON.stringify(S.prog) !== before) softRender();
    }, err => { settled = true; clearTimeout(timer); dbErr(err, 'sub'); });
  } catch (e) { clearTimeout(timer); dbErr(e, 'sub'); }
}
const hasAny = p => !!(p.profile.name || Object.keys(p.modules).length);
function subscribeSignoff() {
  try {
    S.db.doc('signoffs/' + S.uid).onSnapshot(s => {
      S.signoff = s.exists ? cleanSignoff(s.data()) : null;
      const r = S.route;
      if (r.name === 'home' || r.name === 'results' || (r.name === 'mod' && r.step === 'check')) renderMain();
    }, () => {});
  } catch (e) { /* ไม่มีผลประเมินก็ใช้งานต่อได้ */ }
}
function cleanMedia(x) {
  const o = {};
  if (!x || typeof x !== 'object') return o;
  for (const k of Object.keys(x)) {
    if (!/^m\d\d_l\d+$/.test(k)) continue;
    const v = x[k];
    if (v && v.kind === 'asset' && typeof v.id === 'string' && /^[\w-]{1,128}$/.test(v.id)) o[k] = { kind: 'asset', id: v.id, name: str(v.name, 120) };
    else if (v && v.kind === 'link' && typeof v.url === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(v.url)) o[k] = { kind: 'link', url: v.url.slice(0, 500) };
  }
  return o;
}
function subscribeMedia() {
  try {
    S.db.doc('media/videos').onSnapshot(s => { S.media = cleanMedia(s.exists ? s.data() : null); refreshVideo(); }, () => {});
  } catch (e) { /* วิดีโอแสดงเป็นตัวอย่างฉากแทน */ }
}

/* ── ส่วนประกอบหน้าจอ ── */
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 3200);
}
DA.toast = toast;
function ring(p, o) {
  o = o || {};
  const size = o.size || 96, sw = o.sw || 9, r = (size - sw) / 2, c = 2 * Math.PI * r, h = size / 2;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${o.track || 'var(--surface-3)'}" stroke-width="${sw}"/><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${o.col || 'var(--brand-text)'}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - pct(p) / 100)).toFixed(2)}" transform="rotate(-90 ${h} ${h})"/></svg><div class="ring-v"><b style="font-size:${Math.round(size * .26)}px">${pct(p)}%</b>${o.label ? `<small>${esc(o.label)}</small>` : ''}</div></div>`;
}
DA.ring = ring;
function confetti() {
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#E0232E', '#002D73', '#527CEB', '#CC3366', '#25A9E0', '#ffc94d'];
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + 'vw'; s.style.background = cols[i % cols.length];
    s.style.animationDelay = Math.random() * .6 + 's'; s.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
    box.appendChild(s);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3600);
}
DA.confetti = confetti;
const srcChip = s => s === 'clinic' ? `<span class="chip chip-pink">เอกสารคลินิก</span>` : `<span class="chip">มาตรฐานสากล</span>`;
const fmtDate = t => t ? new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
DA.fmtDate = fmtDate;

/* ── โครงหน้าเว็บ ── */
const LOGO = `<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M7 3C4.5 3 3 5 3 7.5c0 3 1.5 4.5 2 7 .5 3 1 6.5 2.5 6.5S9.5 17 10 15c.4-1.4 1.1-2 2-2s1.6.6 2 2c.5 2 1 6 2.5 6s2-3.5 2.5-6.5c.5-2.5 2-4 2-7C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z"/><circle cx="16.5" cy="7.5" r="1.6" fill="#E0232E"/></svg>`;
/* น้องฟันยิ้ม: มาสคอตของหลักสูตร (วาดเอง) + เมฆ/ประกายตกแต่ง */
const MASCOT = `<svg class="mascot" viewBox="0 0 130 132" aria-hidden="true">
  <ellipse class="arm" cx="27" cy="80" rx="7" ry="12" transform="rotate(-28 27 80)"/>
  <g class="wave"><ellipse class="arm" cx="106" cy="54" rx="7" ry="13" transform="rotate(32 106 54)"/></g>
  <path class="body" d="M30 34C30 16 46 10 65 16C84 10 100 16 100 34C100 56 92 64 90 82C88 102 84 126 74 126C66 126 66 104 65 98C64 104 64 126 56 126C46 126 42 102 40 82C38 64 30 56 30 34Z"/>
  <path class="cap" d="M47 19L83 19L79 6Q65 1 51 6Z"/><rect class="cross" x="63" y="7" width="4" height="9" rx="1"/><rect class="cross" x="60.5" y="9.5" width="9" height="4" rx="1"/>
  <ellipse class="ink" cx="52" cy="52" rx="5" ry="7"/><ellipse class="ink" cx="78" cy="52" rx="5" ry="7"/>
  <circle class="hi" cx="54" cy="49" r="2"/><circle class="hi" cx="80" cy="49" r="2"/>
  <ellipse class="blush" cx="43" cy="66" rx="7" ry="4"/><ellipse class="blush" cx="87" cy="66" rx="7" ry="4"/>
  <path class="mouth" d="M57 65Q65 79 73 65Z"/><path class="tongue" d="M61 70Q65 76 69 70Q65 68 61 70Z"/>
</svg>`;
const cloud = (cls, style) => `<svg class="cloud ${cls || ''}" style="${style}" viewBox="0 0 200 100" aria-hidden="true"><path d="M38 86C14 86 12 60 34 56C30 34 60 24 76 40C84 18 120 16 128 42C150 30 176 46 168 64C186 68 184 90 162 86Z"/></svg>`;
const twinkle = style => `<svg class="twinkle" style="${style}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>`;
DA.MASCOT = MASCOT; DA.cloud = cloud;
function renderShell() {
  $('#app').innerHTML = `
  <div class="ribbon"><div class="wrap"><span><span class="dot"></span><b>ต้นแบบ (Demo)</b> เพื่อนำเสนอผู้บริหาร · เนื้อหารอทันตแพทย์ตรวจทาน</span><span>Smile Gallery Dental Clinic</span></div></div>
  <header class="topbar"><div class="wrap">
    <button class="brand" data-act="go" data-r="home" aria-label="หน้าหลัก DA Academy">
      <span class="brand-logo"><img src="img/logo-smile-gallery.png" alt="Smile Gallery Dental Clinic" width="133" height="38"></span>
      <span class="brand-pill">${ic('award')}DA Academy</span>
    </button>
    <nav class="nav" aria-label="เมนูหลัก">
      <button data-act="go" data-r="home" data-nav="home">${ic('home')}หน้าหลัก</button>
      <button data-act="go" data-r="results" data-nav="results">${ic('award')}ผลการเรียน</button>
      <button data-act="go" data-r="hr" data-nav="hr">${ic('chart')}สำหรับ HR</button>
    </nav>
    <div class="tb-right">
      <button class="sync" id="sync" data-act="go" data-r="results"><i></i><span></span></button>
      <button class="switch" id="present" role="switch" aria-checked="false" data-act="present" title="เปิดดูทุกบทและทุกแบบฝึกได้ทันที ไม่ต้องทำตามลำดับ"><span class="tr"></span><span class="lbl-long">โหมดนำเสนอ</span></button>
    </div>
  </div></header>
  <main id="main"></main>
  <footer class="footer"><div class="wrap">
    <div><b>Smile Gallery · DA Academy</b><br>ต้นแบบระบบฝึกอบรมผู้ช่วยทันตแพทย์ เพื่อการนำเสนอ</div>
    <div>ไม่ใช่ระบบทางการของคลินิก · เนื้อหาอยู่ระหว่างรอทันตแพทย์ตรวจทาน<br>ข้อมูลใน HR Dashboard โหมดตัวอย่างเป็นข้อมูลสมมติทั้งหมด</div>
  </div></footer>
  <nav class="tabbar" aria-label="เมนูหลัก">
    <button data-act="go" data-r="home" data-nav="home">${ic('home')}หน้าหลัก</button>
    <button data-act="go" data-r="results" data-nav="results">${ic('award')}ผลการเรียน</button>
    <button data-act="go" data-r="hr" data-nav="hr">${ic('chart')}HR</button>
  </nav>`;
  renderSync(); renderPresent();
}
function renderNav() {
  const n = S.route.name, cur = n === 'results' ? 'results' : (n === 'hr' || n === 'person') ? 'hr' : 'home';
  $$('[data-nav]').forEach(b => b.setAttribute('aria-current', b.dataset.nav === cur ? 'page' : 'false'));
}
const SYNC_T = { connecting: 'กำลังเชื่อมต่อ…', cloud: 'บันทึกขึ้นระบบแล้ว', saving: 'กำลังบันทึก…', pending: 'รอส่งขึ้นระบบ', local: 'บันทึกในเครื่องนี้' };
const WHY_T = {
  nohost: 'เปิดนอก claude.ai คะแนนจึงเก็บในเบราว์เซอร์นี้เท่านั้น',
  signedout: 'ยังไม่ได้ลงชื่อเข้าใช้ claude.ai คะแนนจึงเก็บในเครื่องนี้',
  nodb: 'ฐานข้อมูลยังไม่พร้อมใช้งานในหน้านี้ คะแนนเก็บในเครื่องนี้',
  readonly: 'บัญชีนี้มีสิทธิ์ดูอย่างเดียว ต้องได้สิทธิ์ Contributor จึงจะส่งคะแนนถึง HR ได้',
  denied: 'ระบบไม่อนุญาตให้บัญชีนี้บันทึกคะแนน คะแนนเก็บในเครื่องนี้',
  off: 'การบันทึกขึ้นระบบถูกปิด คะแนนเก็บในเครื่องนี้'
};
function syncWhy() {
  if (S.mode === 'local') return WHY_T[S.why] || WHY_T.nohost;
  if (S.mode === 'cloud') return S.sync === 'pending' ? 'มีคะแนนที่ยังส่งไม่ถึงระบบ จะส่งอัตโนมัติเมื่อเชื่อมต่อได้' : 'คะแนนส่งถึงหัวหน้าและ HR อัตโนมัติ';
  return 'กำลังตรวจสอบการเชื่อมต่อ';
}
function setSync(s) { S.sync = s; renderSync(); }
function renderSync() {
  const el = $('#sync'); if (!el) return;
  const s = S.mode === 'local' ? 'local' : S.sync;
  el.dataset.s = s; el.querySelector('span').textContent = SYNC_T[s];
  el.title = syncWhy(); el.setAttribute('aria-label', SYNC_T[s] + ': ' + syncWhy());
}
function renderPresent() {
  const b = $('#present'); if (!b) return;
  b.setAttribute('aria-checked', S.present ? 'true' : 'false');
  b.setAttribute('aria-label', 'โหมดนำเสนอ ' + (S.present ? 'เปิด' : 'ปิด'));
}

/* ── นำทาง ── */
function go(r) {
  S.route = r;
  renderMain();
  window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
}
DA.go = go;
function renderMain() {
  const main = $('#main'), r = S.route;
  S.curBlocks = [];
  if (r.name === 'mod') renderModule(main);
  else if (r.name === 'profile') main.innerHTML = profileHTML();
  else if (r.name === 'results') main.innerHTML = resultsHTML();
  else if (r.name === 'hr' && DA.hr) DA.hr.render(main);
  else if (r.name === 'person' && DA.hr) DA.hr.renderPerson(main, r.id);
  else { S.route = { name: 'home' }; main.innerHTML = homeHTML(); }
  renderNav();
}
DA.renderMain = renderMain;
function softRender() {
  const n = S.route.name;
  if (n === 'home' || n === 'results') renderMain();
  else if (n === 'mod') { const rail = $('#rail'); if (rail) rail.outerHTML = railHTML(modById(S.route.id)); }
}
function openModule(id, step, peek) {
  const m = modById(id); if (!m || m.status !== 'draft') return;
  if (!S.present && !peek && !S.prog.profile.name) return go({ name: 'profile', next: { name: 'mod', id, step } });
  go({ name: 'mod', id, step: step || firstOpenStep(m), peek: !!peek });
}

/* ── หน้าหลัก ── */
function homeHTML() {
  const nLessons = DRAFT.reduce((a, m) => a + m.lessons.length, 0);
  const nPractice = DRAFT.reduce((a, m) => a + m.practice.length, 0);
  const nQ = DRAFT.reduce((a, m) => a + m.test.length, 0);
  const passed = DRAFT.filter(m => postPassed(gm(m.id))).length;
  const pDone = DRAFT.reduce((a, m) => a + m.practice.filter(p => gm(m.id).practice[p.id]).length, 0);
  const posts = DRAFT.map(m => gm(m.id).post).filter(Boolean);
  const avgPost = posts.length ? Math.round(posts.reduce((a, p) => a + p.best, 0) / posts.length) : null;
  const overall = Math.round(DRAFT.reduce((a, m) => a + modPct(m), 0) / DRAFT.length);
  const pf = S.prog.profile, na = nextAction();
  const who = pf.name ? `${esc(pf.name)}${pf.nickname ? ` (${esc(pf.nickname)})` : ''}` : 'ยินดีต้อนรับ ผู้ช่วยทันตแพทย์ใหม่';
  const nextBtn = !pf.name && !S.present
    ? `<button class="next" data-act="go" data-r="profile"><span><small>เริ่มต้นใช้งาน</small><b>กรอกชื่อและสาขาของคุณ</b></span><span class="arr">${ic('arrowR')}</span></button>`
    : na ? `<button class="next" data-act="resume"><span><small>${esc(na.sub)}</small><b>ต่อไป: ${esc(na.title)}</b></span><span class="arr">${ic('arrowR')}</span></button>`
      : `<button class="next" data-act="go" data-r="results"><span><small>เรียนครบทุกบทแล้ว</small><b>ดูผลการเรียนทั้งหมด</b></span><span class="arr">${ic('arrowR')}</span></button>`;
  const types = ['tray', 'tooth', 'clock', 'scenario', 'sequence', 'match', 'spot'];
  const showcase = types.map(t => {
    const m = DRAFT.find(x => x.practice.some(p => p.type === t)); if (!m) return '';
    const p = m.practice.find(x => x.type === t), T = PTYPE[t];
    return `<button class="sc${t === 'tray' ? ' feat' : ''}" data-act="peek" data-id="${m.id}" data-s="P:${p.id}">
      <span class="ic">${ic(T.icon)}</span><h4>${esc(T.name)}</h4><p>${esc(T.desc)}</p>
      <span class="go">ลองเลย: ${esc(p.title)} ${ic('arrowR')}</span></button>`;
  }).join('');
  const levels = C.levels.map(lv => `
    <div class="level">
      <div class="level-head"><span class="level-badge">${lv.id}</span><div><h3>${esc(lv.title)}</h3><p>${esc(lv.desc)}</p></div></div>
      <div class="mods">${C.modules.filter(m => m.level === lv.id).map(modCard).join('')}</div>
    </div>`).join('');
  return `
  <section class="hero">
    ${cloud('drift', 'left:-40px;top:36px;width:210px')}
    ${cloud('drift slow', 'right:5%;top:18px;width:150px')}
    ${cloud('drift', 'left:40%;bottom:34px;width:170px')}
    ${twinkle('left:47%;top:64px;width:26px')}
    ${twinkle('right:2.5%;top:55%;width:20px')}
    <div class="wrap">
    <div class="fade-in">
      <div class="eyebrow">${ic('sparkle')}Smile Gallery · DA Academy</div>
      <h1>เรียนรู้งาน<span class="hl-b">ผู้ช่วยทันตแพทย์</span><br>ให้เหมือน<span class="hl">ได้ลงมือทำจริง!</span></h1>
      <p class="lead">หลักสูตรออนไลน์สำหรับผู้ช่วยทันตแพทย์ใหม่ เรียนผ่านวิดีโอสาธิตและภาพเครื่องมือจริงของคลินิก ฝึกจัดถาด หาตำแหน่งฟัน ตัดสินใจในสถานการณ์จำลอง แล้ววัดผลก่อน-หลังเรียน คะแนนส่งถึงหัวหน้าและ HR อัตโนมัติ</p>
      <div class="ctas">
        <button class="btn btn-cta btn-pill" data-act="${na ? 'resume' : 'go'}" data-r="results">${hasAny(S.prog) ? 'เรียนต่อ' : 'เริ่มเรียนเลย'} ${ic('arrowR')}</button>
        <button class="btn btn-line-w btn-pill" data-act="go" data-r="hr">${ic('chart')} ดูภาพรวมสำหรับ HR</button>
      </div>
      <p class="hint">${ic('present')} เปิด “โหมดนำเสนอ” มุมขวาบน เพื่อเปิดดูทุกบทได้ทันทีโดยไม่ต้องทำตามลำดับ</p>
    </div>
    <div class="hero-art fade-in">
    <div class="mascot-row"><div class="bob">${MASCOT}</div><div class="bubble">สวัสดี! น้องฟันยิ้มเอง<br>จะพาเรียนทีละขั้นนะ</div></div>
    <div class="pcard">
      <div class="pcard-top">
        ${ring(overall, { size: 104, sw: 10, col: 'var(--accent)', label: 'ทั้งหลักสูตร' })}
        <div><h3>${who}</h3><div class="who">${pf.branch ? esc(pf.branch) : 'ความคืบหน้าของคุณ'}</div></div>
      </div>
      ${nextBtn}
      <div class="mini">
        <div><b>${passed}/${DRAFT.length}</b><span>บทที่สอบผ่าน</span></div>
        <div><b>${pDone}/${nPractice}</b><span>แบบฝึกที่ทำแล้ว</span></div>
        <div><b>${avgPost == null ? '–' : avgPost + '%'}</b><span>คะแนนหลังเรียน</span></div>
      </div>
    </div>
    </div>
  </div></section>

  <div class="wrap"><div class="stats">
    <div class="stat"><span class="ic">${ic('book')}</span><div><b>${DRAFT.length} บท</b><span>${C.modules.length > DRAFT.length ? `พร้อมทดลอง (+${C.modules.length - DRAFT.length} บทวางโครงแล้ว)` : 'พร้อมทดลองครบทุกบท'}</span></div></div>
    <div class="stat"><span class="ic">${ic('video')}</span><div><b>${nLessons}</b><span>บทเรียนย่อย ทุกบทมีวิดีโอ + คำถามโต้ตอบ</span></div></div>
    <div class="stat"><span class="ic">${ic('puzzle')}</span><div><b>${nPractice}</b><span>แบบฝึกปฏิบัติ ${types.length} รูปแบบ</span></div></div>
    <div class="stat"><span class="ic">${ic('clipboard')}</span><div><b>${nQ}</b><span>ข้อสอบวัดผลก่อน-หลังเรียน</span></div></div>
  </div></div>

  <section class="section"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">เส้นทางการเรียนแต่ละบท</div><h2>จากไม่มีพื้นฐาน สู่พร้อมทำงานจริง</h2><p>ทุกบทเรียนใช้ขั้นตอนเดียวกัน วัดผลได้ทุกขั้น และจบด้วยการประเมินโดยหัวหน้าที่หน้างาน</p></div></div>
    <div class="journey">
      ${[['วัดพื้นฐานก่อนเรียน', 'แบบทดสอบสั้น ๆ เพื่อดูว่าเริ่มจากตรงไหน'], ['เรียน + ดูวิดีโอสาธิต', 'เนื้อหาย่อยทีละบท มีคำถามเช็กความเข้าใจระหว่างทาง'], ['ฝึกเหมือนทำจริง', 'จัดถาด หาฟัน สถานการณ์จำลอง ทำซ้ำได้ไม่จำกัด'], ['สอบหลังเรียน', `ผ่านที่ ${PASS}% และเห็นพัฒนาการเทียบก่อนเรียน`], ['ประเมินหน้างาน', 'หัวหน้าหรือทันตแพทย์พี่เลี้ยงรับรองทักษะในคลินิก']]
        .map((s, i) => `<div class="jstep"><span class="n">${i + 1}</span><div><h4>${s[0]}</h4><p>${s[1]}</p></div>${ic('arrowR', 'arrow')}</div>`).join('')}
    </div>
  </div></section>

  <section class="section alt"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">ฝึกปฏิบัติแบบ Interactive</div><h2>${types.length} รูปแบบการฝึก ที่ทำให้เรียนแล้วจำได้จริง</h2><p>แตะเพื่อลองได้ทันที ทุกแบบฝึกให้คะแนนและคำอธิบายเมื่อทำเสร็จ</p></div></div>
    <div class="showcase">${showcase}</div>
  </div></section>

  <section class="section"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">หลักสูตร</div><h2>${C.modules.length} บทเรียน ใน 3 ระดับ</h2><p>เนื้อหาเรียบเรียงจากเอกสารปฐมนิเทศของคลินิกและแนวทางมาตรฐานสากล ${C.modules.length > DRAFT.length ? 'บทที่ยังวางโครงจะเติมเนื้อหาในระยะถัดไป' : 'ทุกบทพร้อมให้ทดลองเรียน และรอทันตแพทย์ตรวจทานก่อนใช้จริง'}</p></div></div>
    ${levels}
  </div></section>`;
}
function modCard(m) {
  const no = modNo(m);
  if (m.status !== 'draft') return `
    <div class="mod planned">
      <div class="mod-top"><span class="mod-no">บทที่ ${no}</span><span class="chip chip-dash">วางโครงแล้ว · รอเนื้อหา</span></div>
      <h4>${esc(m.title)}</h4><p>${esc(m.summary)}</p>
      <ul class="outline">${(m.outline || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>`;
  const st = modStatus(m, S.prog, S.signoff);
  return `
    <button class="mod${st.key === 'done' ? ' done' : ''}" data-act="mod" data-id="${m.id}">
      <div class="mod-top"><span class="mod-no">บทที่ ${no}</span>${st.key === 'none' ? m.source.map(srcChip).join('') : `<span class="chip ${st.chip}">${esc(st.short || st.label)}</span>`}</div>
      <h4>${esc(m.title)}</h4><p>${esc(m.summary)}</p>
      <div class="meta"><span>${ic('clock')}${m.minutes} นาที</span><span>${ic('book')}${m.lessons.length} บทเรียน</span><span>${ic('puzzle')}${m.practice.length} แบบฝึก</span></div>
      <div class="prog"><div class="bar${st.key === 'done' ? ' ok' : ''}"><i style="width:${st.pct}%"></i></div><span>${st.pct}%</span></div>
    </button>`;
}

/* ── หน้าบทเรียน ── */
function renderModule(main) {
  const r = S.route, m = modById(r.id);
  if (!m || m.status !== 'draft') { S.route = { name: 'home' }; main.innerHTML = homeHTML(); return; }
  const steps = modSteps(m);
  if (!steps.some(s => s.id === r.step)) r.step = firstOpenStep(m);
  const st = modStatus(m, S.prog, S.signoff);
  const lv = C.levels.find(l => l.id === m.level);
  main.innerHTML = `
  <section class="mhead"><div class="wrap">
    <div class="crumb"><button data-act="go" data-r="home">หน้าหลัก</button><span>›</span><span>${esc(lv ? lv.title : '')}</span></div>
    <h1>บทที่ ${modNo(m)} · ${esc(m.title)}</h1>
    <p>${esc(m.summary)}</p>
    <div class="meta"><span class="chip">${ic('clock')}${m.minutes} นาที</span>${st.key !== 'none' ? `<span class="chip ${st.chip}">${esc(st.label)}</span>` : ''}${m.source.map(srcChip).join('')}${r.peek && !S.present ? `<span class="chip">${ic('eye')}โหมดทดลองดู</span>` : ''}</div>
  </div></section>
  <div class="wrap mgrid">
    ${railHTML(m)}
    <div class="pane" id="pane"></div>
  </div>`;
  renderStep(m, steps.find(s => s.id === r.step));
}
function railHTML(m) {
  const steps = modSteps(m), r = S.route;
  const done = steps.filter(s => stepDone(m, s)).length;
  const open = S.railOpen || window.innerWidth > 900;
  const item = s => {
    const ok = stepDone(m, s), lock = !!lockReason(m, s);
    const md = gm(m.id);
    const sc = s.kind === 'pre' && md.pre ? md.pre.score + '%' : s.kind === 'post' && md.post ? md.post.best + '%' : s.kind === 'practice' && md.practice[s.p.id] ? md.practice[s.p.id].best + '%' : '';
    const mark = ok ? ic('check') : lock ? ic('lock') : s.kind === 'lesson' || s.kind === 'practice' ? s.n : s.kind === 'check' ? ic('flag') : ic('clipboard');
    return `<button class="ri${ok ? ' ok' : ''}${lock ? ' lock' : ''}" data-act="step" data-s="${esc(s.id)}" aria-current="${r.step === s.id ? 'step' : 'false'}"><span class="st">${mark}</span><span>${esc(s.title)}</span>${sc ? `<span class="sc-badge">${sc}</span>` : ''}</button>`;
  };
  const group = (t, k) => { const g = steps.filter(s => k.includes(s.kind)); return g.length ? `<div class="rail-group">${t}</div>${g.map(item).join('')}` : ''; };
  return `<details class="rail" id="rail"${open ? ' open' : ''}>
    <summary>${ic('list')}<span>ขั้นตอนในบทนี้ ${done}/${steps.length}</span><span class="bar"><i style="width:${Math.round(done / steps.length * 100)}%"></i></span>${ic('chevD')}</summary>
    <div class="rail-body">
      ${group('เริ่มต้น', ['pre'])}${group('บทเรียน', ['lesson'])}${group('ฝึกปฏิบัติ', ['practice'])}${group('วัดผล', ['post', 'check'])}
    </div></details>`;
}
ICONS.list = '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>';
function stepNav(m, st) {
  const steps = modSteps(m), i = steps.findIndex(s => s.id === st.id);
  const prev = steps[i - 1], next = steps[i + 1];
  return `<div class="stepnav">
    ${prev ? `<button class="btn btn-ghost" data-act="step" data-s="${esc(prev.id)}">${ic('arrowL')} ก่อนหน้า</button>` : '<span></span>'}
    ${next ? `<button class="btn btn-ghost" data-act="step" data-s="${esc(next.id)}">ถัดไป ${ic('arrowR')}</button>` : `<button class="btn btn-ghost" data-act="go" data-r="home">กลับหน้าหลัก</button>`}
  </div>`;
}
function renderStep(m, st) {
  const pane = $('#pane');
  const why = lockReason(m, st);
  if (why) {
    const tgt = why === 'pre' ? 'pre' : firstOpenStep(m);
    pane.innerHTML = `<div class="card fade-in"><div class="qintro"><div class="big">${ic('lock')}</div><div>
      <h2>${esc(st.title)}</h2>
      <p class="intro">${why === 'pre' ? 'ทำแบบทดสอบก่อนเรียนก่อน เพื่อใช้วัดพัฒนาการของคุณ (ใช้เวลาไม่กี่นาที)' : 'เรียนให้ครบทุกบทเรียน และลองทำแบบฝึกปฏิบัติทุกแบบก่อน จึงจะสอบหลังเรียนได้'}</p>
      <div class="qfacts"></div>
      <button class="btn btn-cta" data-act="step" data-s="${esc(tgt)}">ไปที่ขั้นตอนที่ต้องทำ ${ic('arrowR')}</button>
    </div></div></div>${stepNav(m, st)}`;
    return;
  }
  if (st.kind === 'pre') renderPre(m, st, pane);
  else if (st.kind === 'lesson') renderLesson(m, st, pane);
  else if (st.kind === 'practice') renderPractice(m, st, pane);
  else if (st.kind === 'post') renderPost(m, st, pane);
  else renderCheck(m, st, pane);
}
function gotoStep(sid) {
  const m = modById(S.route.id); if (!m) return;
  S.route.step = sid;
  const rail = $('#rail');
  if (rail && window.innerWidth <= 900) S.railOpen = false;
  if (rail) rail.outerHTML = railHTML(m);
  renderStep(m, modSteps(m).find(s => s.id === sid));
  const grid = $('.mgrid');
  if (grid) { const y = grid.getBoundingClientRect().top + window.scrollY - 76; if (window.scrollY > y) window.scrollTo({ top: y }); }
}

/* แบบทดสอบ (ใช้ทั้งก่อนและหลังเรียน) */
function quiz(host, items, opt) {
  const qs = shuffle(items.map(q => { const ord = shuffle(q.c.map((_, i) => i)); return { q: q.q, img: q.img, c: ord.map(i => q.c[i]), a: ord.indexOf(q.a), why: q.why }; }));
  let k = 0, right = 0; const log = [];
  function show() {
    const q = qs[k];
    host.innerHTML = `<div class="fade-in">
      <div class="qtop"><div class="bar"><i style="width:${k / qs.length * 100}%"></i></div><span class="n">ข้อ ${k + 1} / ${qs.length}</span></div>
      ${q.img ? `<div class="qimg"><img src="${esc(q.img)}" alt=""></div>` : ''}
      <div class="qq">${esc(q.q)}</div>
      <div class="choices">${q.c.map((c, i) => `<button class="choice" data-i="${i}"><span class="k">${KEYS[i]}</span><span>${esc(c)}</span></button>`).join('')}</div>
      <div class="whyslot" aria-live="polite"></div></div>`;
    $$('.choice', host).forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
  }
  function pick(i) {
    const q = qs[k], btns = $$('.choice', host);
    if (btns[0].disabled) return;
    btns.forEach(b => { b.disabled = true; });
    const ok = i === q.a; if (ok) right++;
    log.push({ q: q.q, c: q.c, a: q.a, pick: i, why: q.why });
    if (!opt.feedback) { btns[i].classList.add('pick'); setTimeout(next, 260); return; }
    btns[q.a].classList.add('ok'); if (!ok) btns[i].classList.add('no');
    btns.forEach((b, j) => { if (j !== q.a && j !== i) b.classList.add('dim'); });
    const last = k === qs.length - 1;
    $('.whyslot', host).innerHTML = `<div class="why ${ok ? 'ok' : 'no'}">${ic(ok ? 'check' : 'info')}<div><b>${ok ? 'ถูกต้อง' : 'ยังไม่ถูก'}</b> ${esc(q.why || '')}</div></div>
      <div class="stepnav" style="justify-content:flex-end"><button class="btn btn-brand" id="qnext">${last ? 'ดูผลคะแนน' : 'ข้อต่อไป'} ${ic('arrowR')}</button></div>`;
    const nb = $('#qnext', host); nb.addEventListener('click', next); nb.focus({ preventScroll: true });
  }
  function next() { k++; if (k < qs.length) show(); else opt.onDone(Math.round(right / qs.length * 100), log); }
  show();
}
function renderPre(m, st, pane) {
  const md = gm(m.id);
  const head = `<div class="step-kicker"><span class="chip chip-brand">${ic('clipboard')}เริ่มต้น</span>${md.pre ? `<span class="chip chip-ok">${ic('check')}ทำแล้ว ${md.pre.score}%</span>` : ''}</div>`;
  const firstL = 'L:' + m.lessons[0].key;
  if (md.pre && !S.present) {
    pane.innerHTML = `<div class="card fade-in">${head}<h2>แบบทดสอบก่อนเรียน</h2>
      <div class="result"><div>${ring(md.pre.score, { size: 92 })}</div><div><h3>คะแนนพื้นฐานของคุณ</h3><p>เราจะใช้คะแนนนี้เทียบกับคะแนนหลังเรียน เพื่อดูพัฒนาการ (ทำได้ครั้งเดียว)</p>
      <div class="acts"><button class="btn btn-cta" data-act="step" data-s="${firstL}">เริ่มบทเรียนแรก ${ic('arrowR')}</button></div></div></div></div>${stepNav(m, st)}`;
    return;
  }
  pane.innerHTML = `<div class="card fade-in">${head}
    <div class="qintro"><div class="big">${ic('clipboard')}</div><div>
      <h2>แบบทดสอบก่อนเรียน</h2>
      <p class="intro">ยังไม่ต้องรู้คำตอบก็ได้ แบบทดสอบนี้ใช้วัดพื้นฐาน เพื่อให้เห็นพัฒนาการหลังเรียน และไม่มีผลต่อการผ่านบทเรียน</p>
      <div class="qfacts"><div><b>${m.test.length} ข้อ</b>ปรนัย</div><div><b>~${Math.ceil(m.test.length * .5)} นาที</b>โดยประมาณ</div><div><b>ไม่เฉลย</b>ระหว่างทำ</div></div>
      <button class="btn btn-cta btn-pill" id="go-pre">เริ่มทำแบบทดสอบ ${ic('arrowR')}</button>
      ${md.pre ? `<p class="small muted" style="margin-top:10px">โหมดนำเสนอ: ทำซ้ำได้ แต่ไม่บันทึกทับคะแนนเดิม</p>` : ''}
    </div></div></div>`;
  $('#go-pre').addEventListener('click', () => {
    const card = $('.card', pane);
    quiz(card, m.test, {
      feedback: false, onDone: score => {
        if (!gm(m.id).pre) { wm(m.id).pre = { score, at: Date.now() }; save(); }
        const msg = score >= 80 ? 'พื้นฐานดีมาก! บทเรียนนี้จะช่วยทบทวนและเติมรายละเอียดของคลินิก' : score >= 50 ? 'มีพื้นฐานอยู่บ้างแล้ว ไปเติมส่วนที่ขาดในบทเรียนกัน' : 'ไม่เป็นไร นี่คือจุดเริ่มต้น บทเรียนถัดไปจะพาไปทีละขั้น';
        card.innerHTML = `${head.replace(/chip-ok[^<]*<\/span>/, '')}<h2>เสร็จแล้ว!</h2>
          <div class="result"><div>${ring(score, { size: 92 })}</div><div><h3>คะแนนก่อนเรียน ${score}%</h3><p>${msg}</p>
          <div class="acts"><button class="btn btn-cta" data-act="step" data-s="${firstL}">เริ่มบทเรียนแรก ${ic('arrowR')}</button></div></div></div>`;
        refreshRail(m);
      }
    });
  });
}
function refreshRail(m) { const rail = $('#rail'); if (rail) { S.railOpen = rail.open; rail.outerHTML = railHTML(m); } }

function renderLesson(m, st, pane) {
  const l = st.l, md = gm(m.id), done = !!md.lessons[l.key];
  S.curBlocks = l.blocks;
  S.curLesson = { m, l };
  const nChk = l.blocks.filter(b => b.t === 'check').length;
  pane.innerHTML = `<div class="card fade-in">
    <div class="step-kicker"><span class="chip chip-brand">${ic('book')}บทเรียน ${st.n}/${m.lessons.length}</span><span class="chip chip-sun">${ic('video')}มีวิดีโอสาธิต</span>${nChk ? `<span class="chip chip-pink">${ic('target')}มีคำถามโต้ตอบ ${nChk} ข้อ</span>` : ''}${done ? `<span class="chip chip-ok">${ic('check')}เรียนจบแล้ว</span>` : ''}</div>
    <h2>${esc(l.title)}</h2>
    <div class="blocks">
      <div id="vslot">${videoHTML(m, l)}</div>
      ${blocksHTML(l.blocks)}
    </div>
    <div class="stepnav" style="margin-top:28px;justify-content:flex-end">
      ${done ? `<span class="chip chip-ok" style="align-self:center">${ic('check')}บันทึกแล้ว</span>` : `<button class="btn btn-cta btn-pill" data-act="lesson-done">เรียนจบบทนี้ ${ic('arrowR')}</button>`}
    </div>
  </div>${stepNav(m, st)}`;
}
function blocksHTML(blocks) {
  return blocks.map((b, i) => {
    switch (b.t) {
      case 'p': return `<p>${esc(b.x)}</p>`;
      case 'list': return `<div>${b.title ? `<h4>${esc(b.title)}</h4>` : ''}<ul>${b.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
      case 'steps': return `<div>${b.title ? `<h4>${esc(b.title)}</h4>` : ''}<ol>${b.items.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>`;
      case 'tip': return `<div class="callout tip">${ic('bulb')}<div><b>เคล็ดลับ</b> ${esc(b.x)}</div></div>`;
      case 'warn': return `<div class="callout warn">${ic('warn')}<div><b>ข้อควรระวัง</b> ${esc(b.x)}</div></div>`;
      case 'img': return `<figure><img src="${esc(b.src)}" alt="${esc(b.cap || '')}" loading="lazy"><figcaption>${esc(b.cap || '')}</figcaption></figure>`;
      case 'inst': return `<div class="inst-grid">${b.items.map(k => { const t = C.INSTRUMENTS[k]; return t ? `<div class="inst"><div class="ph"><img src="${esc(t.img)}" alt="${esc(t.name)}" loading="lazy"></div><div class="tx"><b>${esc(t.name)}</b><small>${esc(t.th)}</small><p>${esc(t.use)}</p></div></div>` : ''; }).join('')}</div>`;
      case 'check': return `<div class="qcheck"><div class="qh">${ic('target')}เช็กความเข้าใจ · ไม่คิดคะแนน</div><div class="q">${esc(b.q)}</div>
        <div class="choices">${b.c.map((c, j) => `<button class="choice" data-act="chk" data-b="${i}" data-i="${j}"><span class="k">${KEYS[j]}</span><span>${esc(c)}</span></button>`).join('')}</div><div class="whyslot" aria-live="polite"></div></div>`;
      default: return '';
    }
  }).join('');
}
function videoHTML(m, l) {
  const key = m.id + '_' + l.key, v = S.media[key];
  let body;
  if (v && v.kind === 'asset') body = `<div class="video"><video controls preload="metadata" playsinline src="/_blob/${encodeURIComponent(v.id)}"></video></div>`;
  else if (v && v.kind === 'link') body = `<a class="vlink" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer"><span class="play">${ic('play')}</span><span><b>เปิดวิดีโอสาธิต</b><small>${esc(v.url)}</small></span></a>`;
  else body = storyboardHTML(m, l);
  let ed = '';
  if (S.canEdit && S.db) {
    ed = `<div class="vedit"><span class="lbl">${ic('edit')}ผู้ดูแล:</span>
      ${S.assets ? `<button class="btn btn-ghost btn-sm" data-act="vupl">${ic('upload')}อัปโหลดวิดีโอ (mp4/webm ≤ 20 MB)</button><input type="file" id="vfile" accept="video/mp4,video/webm" hidden>` : ''}
      <input type="url" id="vurl" placeholder="หรือวางลิงก์วิดีโอ https://…" aria-label="ลิงก์วิดีโอ">
      <button class="btn btn-ghost btn-sm" data-act="vlink">${ic('link')}ใช้ลิงก์</button>
      ${v ? `<button class="btn btn-danger btn-sm" data-act="vdel">${ic('trash')}เอาวิดีโอออก</button>` : ''}</div>`;
  }
  return body + ed;
}
/* สตอรีบอร์ดวิดีโอ: เล่นภาพประกอบจากบทถ่ายทำ จนกว่าจะมีวิดีโอจริงมาแทน */
const SB_ART = [
  [/ล้างมือ|ที่มือ|นิ้ว/, 'hand', 't3'],
  [/PPE|ถุงมือ|หน้ากาก/, 'shield', 't4'],
  [/ฉุกเฉิน|AED|ออกซิเจน|อาการ|เข็ม/, 'heart', 't3'],
  [/Suction|HVE|Peroxide|น้ำยา|Preclean|ฆ่าเชื้อ|เช็ด/, 'drop', ''],
  [/เก้าอี้|ท่านั่ง|โซน|มุมสูง/, 'chair', 't2'],
  [/ถาด/, 'tray', 't2'],
  [/X-ray|รังสี|ตะกั่ว/, 'shield', 't2'],
  [/ล็อกหน้าจอ|รักษาข้อมูล/, 'lock', 't3'],
  [/กระดูกทดแทน|เมมเบรน/, 'puzzle', 't2'],
  [/สต็อก|สั่งซื้อ|สินค้า|เวชระเบียน|แบบฟอร์ม|ฉลาก/, 'clipboard', 't4'],
  [/FEFO|หมดอายุ/, 'clock', 't2'],
  [/ฟอกสี|วีเนียร์|Shade|ฉายแสง/, 'sparkle', 't2'],
  [/น้ำเกลือ|ผสม|ซีเมนต์/, 'drop', 't2'],
  [/ปลอดเชื้อ/, 'shield', 't4'],
  [/ถ่ายรูป/, 'eye', 't3'],
  [/Tell-Show-Do/, 'star', 't3'],
  [/คำพูด/, 'chat', 't4'],
  [/ฟัน|Quadrant/, 'tooth', ''],
  [/คำแนะนำ|ต้อนรับ|บทบาทสมมติ|คำศัพท์|อธิบาย|ทักทาย/, 'chat', 't4'],
  [/HR|สวัสดิการ|เติบโต/, 'award', 't2'],
  [/แต่งกาย/, 'user', 't3']
];
const SB_INST = { sickle: /Sickle/i, luxator: /Luxator/i, forceps: /Forceps/i, curette: /Curette/i, composite: /Composite/i, syringe: /Triple Syringe/i };
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
function sbScenes(m, l) {
  const shots = (l.video && l.video.shots) || [];
  const keys = (l.blocks.find(b => b.t === 'list' || b.t === 'steps') || { items: [] }).items.slice(0, 3);
  const hasChk = l.blocks.some(b => b.t === 'check');
  const sc = [{ k: 'intro', d: 4, cap: 'วิดีโอสาธิต: ' + l.title }];
  shots.forEach(s => sc.push({ k: 'shot', d: 6, cap: s }));
  if (keys.length) sc.push({ k: 'keys', d: 7, cap: 'สรุปสิ่งที่ต้องจำจากบทนี้', items: keys });
  sc.push({ k: 'outro', d: 4, cap: hasChk ? 'ถึงตาคุณแล้ว! ลองตอบคำถามเช็กความเข้าใจด้านล่าง' : 'ถึงตาคุณแล้ว! อ่านสรุปด้านล่าง แล้วกดเรียนจบบทนี้' });
  return sc;
}
function sbArt(s, i, m, l, n) {
  const pop = MASCOT.replace('class="mascot"', 'class="mascot sb-pop"');
  if (s.k === 'intro') return `${pop}<div class="sb-title sb-pop"><small>วิดีโอสาธิต · ${n} ฉาก</small><b>${esc(l.title)}</b><span>${esc(m.title)}</span></div>`;
  if (s.k === 'keys') return `<div class="sb-list sb-pop">${s.items.map(x => `<div><i>${ic('check')}</i><span>${esc(cut(x, 72))}</span></div>`).join('')}</div>`;
  if (s.k === 'outro') return `${pop}<div class="sb-title sb-pop"><small>จบวิดีโอ</small><b>ถึงตาคุณแล้ว!</b><span>${l.blocks.some(b => b.t === 'check') ? 'มีคำถามรอให้ลองตอบด้านล่าง' : 'อ่านสรุปด้านล่างได้เลย'}</span></div>`;
  let ins = /เครื่องมือพื้นฐาน/.test(s.cap) ? ['mirror', 'explorer', 'cotton'] : Object.keys(SB_INST).filter(k => SB_INST[k].test(s.cap));
  ins = ins.filter(k => C.INSTRUMENTS[k]).slice(0, 3);
  if (ins.length) return `<div class="sb-insts sb-pop">${ins.map(k => `<span><img src="${esc(C.INSTRUMENTS[k].img)}" alt="${esc(C.INSTRUMENTS[k].name)}"></span>`).join('')}</div>`;
  const a = SB_ART.find(r => r[0].test(s.cap)) || [null, 'video', ''];
  return `<div class="sb-tile ${a[2]} sb-pop">${ic(a[1])}</div>`;
}
function storyboardHTML(m, l) {
  const sc = sbScenes(m, l), total = sc.reduce((a, s) => a + s.d, 0);
  return `<div class="sb" data-t="0">
    <div class="sb-screen" data-act="sb-toggle">
      ${cloud('drift', 'left:3%;top:13%;width:15%')}${cloud('drift slow', 'right:5%;top:22%;width:11%')}
      <span class="sb-badge"><i></i>สตอรีบอร์ดวิดีโอ · รอถ่ายทำจริง</span>
      <span class="sb-count">ฉาก <b class="sb-n">1</b>/${sc.length}</span>
      ${sc.map((s, i) => `<div class="sb-scene${i ? '' : ' on'}" aria-hidden="${i ? 'true' : 'false'}"><div class="sb-stage">${sbArt(s, i, m, l, sc.length)}</div><div class="sb-cap">${esc(s.cap)}</div></div>`).join('')}
      <button class="sb-big" data-act="sb-toggle" aria-label="เล่นวิดีโอสาธิต">${ic('play')}</button>
    </div>
    <div class="sb-ctrl">
      <button class="sb-pp" data-act="sb-toggle" aria-label="เล่นหรือหยุดวิดีโอ">${ic('play', 'i-play')}${ic('pause', 'i-pause')}</button>
      <div class="sb-track">${sc.map((s, i) => `<button class="sb-seg" data-act="sb-go" data-i="${i}" data-d="${s.d}" aria-label="ไปฉากที่ ${i + 1}"><span><i></i></span></button>`).join('')}</div>
      <span class="sb-time">0:00 / ${mmss(total)}</span>
    </div>
    <div class="sb-note">${ic('info')}ภาพประกอบชั่วคราวจากบทถ่ายทำ · เมื่อถ่ายวิดีโอจริงแล้ว ผู้ดูแลอัปโหลดมาแทนที่ได้ทันที</div>
  </div>`;
}
const SB = { el: null, t: 0, tick: null };
function sbDurs(el) { return [...el.querySelectorAll('.sb-seg')].map(s => +s.dataset.d); }
function sbRender(el, t) {
  const ds = sbDurs(el), total = ds.reduce((a, b) => a + b, 0);
  let acc = 0, cur = ds.length - 1;
  for (let i = 0; i < ds.length; i++) { if (t < acc + ds[i]) { cur = i; break; } acc += ds[i]; }
  acc = 0;
  el.querySelectorAll('.sb-seg').forEach((s, i) => {
    s.querySelector('i').style.width = Math.max(0, Math.min(1, (t - acc) / ds[i])) * 100 + '%'; acc += ds[i];
    s.setAttribute('aria-current', i === cur ? 'true' : 'false');
  });
  el.querySelectorAll('.sb-scene').forEach((s, i) => { s.classList.toggle('on', i === cur); s.setAttribute('aria-hidden', i === cur ? 'false' : 'true'); });
  el.querySelector('.sb-n').textContent = cur + 1;
  el.querySelector('.sb-time').textContent = `${mmss(t)} / ${mmss(total)}`;
  el.dataset.t = t;
}
function sbStop() { clearInterval(SB.tick); SB.tick = null; if (SB.el) SB.el.dataset.playing = '0'; }
function sbPlay(el) {
  sbStop(); SB.el = el; SB.t = +el.dataset.t || 0;
  const total = sbDurs(el).reduce((a, b) => a + b, 0);
  if (SB.t >= total - 0.05) SB.t = 0;
  el.dataset.playing = '1'; el.dataset.started = '1';
  sbRender(el, SB.t);
  SB.tick = setInterval(() => {
    if (!SB.el || !SB.el.isConnected) return sbStop();
    SB.t = Math.min(total, SB.t + 0.1); sbRender(SB.el, SB.t);
    if (SB.t >= total) sbStop();
  }, 100);
}
DA.acts['sb-toggle'] = el => { const sb = el.closest('.sb'); if (sb.dataset.playing === '1') sbStop(); else sbPlay(sb); };
DA.acts['sb-go'] = el => {
  const sb = el.closest('.sb'), ds = sbDurs(sb), i = +el.dataset.i;
  const t = ds.slice(0, i).reduce((a, b) => a + b, 0);
  sb.dataset.started = '1';
  if (SB.el === sb) SB.t = t;
  sbRender(sb, t);
};
function refreshVideo() {
  const el = $('#vslot'), cl = S.curLesson;
  if (!el || !cl) return;
  const sig = JSON.stringify(S.media[cl.m.id + '_' + cl.l.key] || null) + S.canEdit;
  if (el.dataset.sig === sig) return;
  if (document.activeElement && el.contains(document.activeElement) && document.activeElement.id === 'vurl') return;
  el.dataset.sig = sig; el.innerHTML = videoHTML(cl.m, cl.l);
}
async function setVideo(val) {
  const cl = S.curLesson; if (!cl || !S.db) return;
  const key = cl.m.id + '_' + cl.l.key;
  const next = Object.assign({}, S.media);
  if (val) next[key] = val; else delete next[key];
  await retryOnce(() => S.db.doc('media/videos').set(next));
  S.media = next; refreshVideo();
}
async function uploadVideo(file) {
  if (!file) return;
  if (!/^video\/(mp4|webm)$/.test(file.type)) return toast('รองรับไฟล์ mp4 หรือ webm เท่านั้น');
  if (file.size > 20 * 1024 * 1024) return toast('ไฟล์ใหญ่เกิน 20 MB ลองบีบอัดไฟล์ หรือใช้ลิงก์แทน');
  toast('กำลังอัปโหลดวิดีโอ…');
  try {
    const up = async () => S.assets.upload(file, { type: file.type });
    let r;
    try { r = await up(); } catch (e) { if (errCode(e) === 'store_unavailable') { await sleep(1200); r = await up(); } else throw e; }
    await setVideo({ kind: 'asset', id: r.id, name: str(file.name, 120) });
    toast('อัปโหลดวิดีโอเรียบร้อย');
  } catch (e) {
    const c = errCode(e);
    toast(c === 'too_large' ? 'ไฟล์ใหญ่เกินกำหนด' : c === 'unsupported_type' ? 'ไม่รองรับไฟล์ชนิดนี้' : c === 'rate_limited' ? 'อัปโหลดถี่เกินไป รอสักครู่แล้วลองใหม่' : c === 'quota_or_state' ? 'พื้นที่เก็บไฟล์เต็ม' : 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
  }
}

function renderPractice(m, st, pane) {
  const p = st.p, T = PTYPE[p.type] || { name: p.type, icon: 'puzzle' }, rec = gm(m.id).practice[p.id];
  pane.innerHTML = `<div class="card fade-in">
    <div class="pr-head"><span class="ic">${ic(T.icon)}</span><div>
      <div class="step-kicker"><span class="chip chip-brand">ฝึกปฏิบัติ ${st.n}/${m.practice.length} · ${esc(T.name)}</span>${rec ? `<span class="chip chip-ok">${ic('star')}ดีที่สุด ${rec.best}% · ${rec.tries} ครั้ง</span>` : ''}</div>
      <h2>${esc(p.title)}</h2><p class="intro">${esc(p.intro || '')}</p></div></div>
    <div class="stage" id="stage"></div>
    <div id="pres"></div>
  </div>${stepNav(m, st)}`;
  runPractice(m, st);
}
function runPractice(m, st) {
  const p = st.p, host = $('#stage'), res = $('#pres');
  res.innerHTML = '';
  const eng = DA.engines[p.type];
  if (!eng) { host.innerHTML = `<div class="note">${ic('info')}<div>แบบฝึกนี้กำลังพัฒนา</div></div>`; return; }
  const t0 = Date.now();
  eng(host, p, {
    I: C.INSTRUMENTS, ic, esc, toast, shuffle,
    done(score, extra) {
      extra = extra || {};
      score = pct(score);
      const timeSec = extra.timeSec != null ? Math.round(extra.timeSec) : Math.round((Date.now() - t0) / 1000);
      const md = wm(m.id), old = md.practice[p.id];
      md.practice[p.id] = { best: Math.max(score, old ? old.best : 0), last: score, tries: (old ? old.tries : 0) + 1, at: Date.now(), timeSec };
      save();
      const best = md.practice[p.id].best;
      const msg = score >= 80 ? 'เยี่ยมมาก! พร้อมใช้งานจริง' : score >= 50 ? 'ใกล้แล้ว ลองอีกครั้งให้คล่องมือ' : 'ลองทบทวนบทเรียนแล้วฝึกใหม่อีกครั้ง';
      const steps = modSteps(m), nx = steps[steps.findIndex(s => s.id === st.id) + 1];
      res.innerHTML = `<div class="result${score >= 80 ? ' pass' : ''} fade-in">
        <div>${ring(score, { size: 92, col: score >= 80 ? 'var(--ok)' : 'var(--brand-text)' })}</div>
        <div><h3>${msg}</h3><p>${extra.note ? esc(extra.note) + ' · ' : ''}ใช้เวลา ${fmtTime(timeSec)} · คะแนนดีที่สุด ${best}%</p>
        <div class="acts"><button class="btn btn-ghost" id="p-retry">${ic('refresh')}ลองอีกครั้ง</button>${nx ? `<button class="btn btn-cta" data-act="step" data-s="${esc(nx.id)}">ถัดไป: ${esc(nx.title)} ${ic('arrowR')}</button>` : ''}</div></div></div>`;
      $('#p-retry').addEventListener('click', () => { runPractice(m, st); $('#stage').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      refreshRail(m);
      if (score >= 80) confetti();
      res.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
}
const fmtTime = s => s >= 60 ? `${Math.floor(s / 60)} นาที ${s % 60} วินาที` : `${s} วินาที`;
DA.fmtTime = fmtTime;

function renderPost(m, st, pane) {
  const md = gm(m.id), pass = postPassed(md);
  const head = `<div class="step-kicker"><span class="chip chip-brand">${ic('award')}วัดผล</span>${md.post ? `<span class="chip ${pass ? 'chip-ok' : ''}">ดีที่สุด ${md.post.best}% · ${md.post.attempts} ครั้ง</span>` : ''}</div>`;
  pane.innerHTML = `<div class="card fade-in">${head}
    <div class="qintro"><div class="big">${ic('award')}</div><div>
      <h2>แบบทดสอบหลังเรียน</h2>
      <p class="intro">${pass ? 'คุณสอบผ่านบทนี้แล้ว ทำซ้ำเพื่อทบทวนได้ ระบบเก็บคะแนนที่ดีที่สุด' : 'ทุกข้อจะเฉลยทันทีพร้อมเหตุผล ทำซ้ำได้จนกว่าจะผ่าน ระบบเก็บคะแนนที่ดีที่สุด'}</p>
      <div class="qfacts"><div><b>${m.test.length} ข้อ</b>สลับลำดับทุกครั้ง</div><div><b>${PASS}%</b>เกณฑ์ผ่าน</div>${md.pre ? `<div><b>${md.pre.score}%</b>คะแนนก่อนเรียน</div>` : ''}</div>
      <button class="btn btn-cta btn-pill" id="go-post">${md.post ? 'ทำแบบทดสอบอีกครั้ง' : 'เริ่มทำแบบทดสอบ'} ${ic('arrowR')}</button>
    </div></div></div>${stepNav(m, st)}`;
  $('#go-post').addEventListener('click', () => {
    const card = $('.card', pane);
    quiz(card, m.test, {
      feedback: true, onDone: (score, log) => {
        const d = wm(m.id), o = d.post, ok = score >= PASS;
        d.post = { best: Math.max(score, o ? o.best : 0), last: score, attempts: (o ? o.attempts : 0) + 1, at: Date.now(), passedAt: o && o.passedAt ? o.passedAt : ok ? Date.now() : 0 };
        save();
        const pre = d.pre ? d.pre.score : null;
        card.innerHTML = `${head.replace(/<span class="chip (chip-ok|)">ดีที่สุด[^<]*<\/span>/, '')}<h2>${ok ? 'ยินดีด้วย สอบผ่านแล้ว!' : 'ยังไม่ถึงเกณฑ์ ลองอีกครั้งนะ'}</h2>
          <div class="result${ok ? ' pass' : ''}"><div>${ring(score, { size: 100, col: ok ? 'var(--ok)' : 'var(--accent)' })}</div><div>
            <h3>คะแนนหลังเรียน ${score}%</h3>
            <p>${pre != null ? `ก่อนเรียน ${pre}% → หลังเรียน ${score}% (${score - pre >= 0 ? '+' : ''}${score - pre} คะแนน) · ` : ''}เกณฑ์ผ่าน ${PASS}%</p>
            <div class="acts">${ok ? `<button class="btn btn-cta" data-act="step" data-s="check">ขั้นต่อไป: ประเมินหน้างาน ${ic('arrowR')}</button>` : `<button class="btn btn-cta" data-act="step" data-s="${esc('L:' + m.lessons[0].key)}">${ic('book')}ทบทวนบทเรียน</button>`}
            <button class="btn btn-ghost" data-act="step" data-s="post">${ic('refresh')}ทำอีกครั้ง</button></div>
          </div></div>
          <h4 style="margin-top:26px;font-weight:500">ทบทวนคำตอบ</h4>
          <div class="review">${log.map((r, i) => `<details${r.pick !== r.a ? ' open' : ''}><summary><span class="mk ${r.pick === r.a ? 'ok' : 'no'}">${r.pick === r.a ? '✓' : '✕'}</span><span>${i + 1}. ${esc(r.q)}</span></summary>
            <div class="ans">${r.pick !== r.a ? `คุณตอบ: ${esc(r.c[r.pick])}<br>` : ''}<b>คำตอบที่ถูก: ${esc(r.c[r.a])}</b><br>${esc(r.why || '')}</div></details>`).join('')}</div>`;
        refreshRail(m);
        if (ok) confetti();
        card.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
  });
}
function renderCheck(m, st, pane) {
  const s = S.signoff && S.signoff.modules[m.id], md = gm(m.id), all = signedAll(m, S.signoff);
  pane.innerHTML = `<div class="card fade-in">
    <div class="step-kicker"><span class="chip chip-brand">${ic('flag')}ขั้นสุดท้าย</span>${all ? `<span class="chip chip-ok">${ic('check')}ผ่านสมบูรณ์</span>` : postPassed(md) ? '<span class="chip chip-warn">รอประเมินหน้างาน</span>' : ''}</div>
    <h2>ประเมินหน้างาน (On-the-job)</h2>
    <p class="intro">หัวหน้าสาขาหรือทันตแพทย์พี่เลี้ยงจะสังเกตการทำงานจริงของคุณ แล้วติ๊กรับรองในระบบ HR เมื่อทำได้ครบทุกข้อ บทนี้จึงจะ “ผ่านสมบูรณ์”</p>
    <div class="cl">${m.checklist.map((c, i) => { const ok = !!(s && s.items[i]); return `<div class="cl-item${ok ? ' ok' : ''}"><span class="bx">${ok ? ic('check') : ''}</span><div>${esc(c)}${ok && s.by ? `<small>รับรองโดย ${esc(s.by)}${s.at ? ' · ' + fmtDate(s.at) : ''}</small>` : ''}</div></div>`; }).join('')}</div>
    ${S.mode !== 'cloud' ? `<div class="note" style="margin-top:16px">${ic('info')}<div>ผลการประเมินจะแสดงที่นี่เมื่อเชื่อมต่อระบบ (${esc(syncWhy())})</div></div>` : ''}
  </div>${stepNav(m, st)}`;
}

/* ── ข้อมูลผู้เรียน ── */
function profileHTML() {
  const p = S.prog.profile;
  return `<section class="section-tight"><div class="wrap" style="max-width:760px">
    <div class="card fade-in">
      <div class="prof"><span class="avatar">${ic('user')}</span><div><div class="eyebrow">ข้อมูลผู้เรียน</div><h2 style="color:var(--brand-text)">${p.name ? 'แก้ไขข้อมูลของคุณ' : 'ก่อนเริ่มเรียน แนะนำตัวหน่อย'}</h2></div></div>
      <div class="form">
        <div class="field"><label for="f-name">ชื่อ-นามสกุล *</label><input id="f-name" maxlength="60" autocomplete="name" value="${esc(p.name)}"></div>
        <div class="field"><label for="f-nick">ชื่อเล่น</label><input id="f-nick" maxlength="30" value="${esc(p.nickname)}"></div>
        <div class="field"><label for="f-branch">สาขาที่ประจำ</label><input id="f-branch" maxlength="60" value="${esc(p.branch)}" placeholder="ชื่อสาขา"></div>
        <div class="field"><label for="f-start">วันที่เริ่มงาน</label><input id="f-start" type="date" value="${esc(p.startDate)}"></div>
      </div>
      <div class="note" style="margin-top:20px">${ic('info')}<div>ชื่อและสาขาใช้แสดงผลคะแนนให้หัวหน้าและ HR เท่านั้น ไม่มีการเก็บเลขบัตรประชาชนหรือข้อมูลส่วนตัวอื่น</div></div>
      <div class="stepnav"><button class="btn btn-ghost" data-act="go" data-r="home">ยกเลิก</button><button class="btn btn-cta btn-pill" data-act="profile-save">บันทึกและเริ่มเรียน ${ic('arrowR')}</button></div>
    </div></div></section>`;
}
function saveProfile() {
  const v = id => ($('#' + id).value || '').trim();
  const name = v('f-name');
  if (!name) { toast('กรุณากรอกชื่อ-นามสกุล'); $('#f-name').focus(); return; }
  S.prog.profile = { name: name.slice(0, 60), nickname: v('f-nick').slice(0, 30), branch: v('f-branch').slice(0, 60), startDate: v('f-start').slice(0, 10), at: Date.now() };
  save();
  toast('บันทึกข้อมูลแล้ว');
  const nx = S.route.next;
  if (nx && nx.name === 'mod') openModule(nx.id, nx.step);
  else { const na = nextAction(); if (na) openModule(na.m.id, na.sid); else go({ name: 'home' }); }
}

/* ── ผลการเรียน ── */
function resultsHTML() {
  const p = S.prog.profile;
  const rows = DRAFT.map(m => {
    const md = gm(m.id), st = modStatus(m, S.prog, S.signoff);
    const pd = m.practice.filter(x => md.practice[x.id]).length;
    return `<tr class="click" data-act="mod" data-id="${m.id}"><td><b style="font-weight:500">บทที่ ${modNo(m)}</b> ${esc(m.title)}</td>
      <td class="num">${md.pre ? md.pre.score + '%' : '–'}</td><td class="num">${pd}/${m.practice.length}</td>
      <td class="num">${md.post ? `<b style="font-weight:500">${md.post.best}%</b>` : '–'}</td>
      <td><span class="chip ${st.chip}">${esc(st.label)}</span></td></tr>`;
  }).join('');
  const pres = DRAFT.map(m => gm(m.id).pre).filter(Boolean), posts = DRAFT.map(m => gm(m.id).post).filter(Boolean);
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
  const aPre = avg(pres.map(x => x.score)), aPost = avg(posts.map(x => x.best));
  const note = S.mode === 'cloud'
    ? `<div class="note ok">${ic('cloud')}<div><b style="font-weight:500">คะแนนส่งถึงหัวหน้าและ HR อัตโนมัติ</b><br>${esc(syncWhy())}</div></div>`
    : `<div class="note warn">${ic('info')}<div><b style="font-weight:500">${S.mode === 'connecting' ? 'กำลังเชื่อมต่อระบบ' : 'คะแนนเก็บในเครื่องนี้'}</b><br>${esc(syncWhy())}${S.mode === 'local' ? '<br>ใช้ปุ่ม “คัดลอกสรุปผล” เพื่อส่งให้หัวหน้าได้' : ''}</div></div>`;
  return `<section class="section-tight"><div class="wrap">
    <div class="sec-head"><div><div class="eyebrow">ผลการเรียนของฉัน</div><h2>${p.name ? esc(p.name) : 'ผู้เรียน'}</h2></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-ghost" data-act="go" data-r="profile">${ic('edit')}แก้ไขข้อมูล</button><button class="btn btn-ghost" data-act="copy-sum">${ic('copy')}คัดลอกสรุปผล</button></div></div>
    <div class="kpis" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi"><span>สาขา</span><b style="font-size:20px">${p.branch ? esc(p.branch) : '–'}</b><small>${p.startDate ? 'เริ่มงาน ' + esc(fmtDate(new Date(p.startDate).getTime())) : '&nbsp;'}</small></div>
      <div class="kpi"><span>บทที่สอบผ่าน</span><b>${posts.filter(x => x.best >= PASS).length}/${DRAFT.length}</b><small>เกณฑ์ ${PASS}%</small></div>
      <div class="kpi"><span>เฉลี่ยก่อนเรียน</span><b>${aPre == null ? '–' : aPre + '%'}</b><small>${pres.length} บท</small></div>
      <div class="kpi"><span>เฉลี่ยหลังเรียน</span><b class="${aPost != null && aPre != null && aPost > aPre ? 'up' : ''}">${aPost == null ? '–' : aPost + '%'}</b><small>${aPost != null && aPre != null ? (aPost - aPre >= 0 ? '+' : '') + (aPost - aPre) + ' คะแนน' : '&nbsp;'}</small></div>
    </div>
    ${note}
    <div class="tbl-wrap" style="margin-top:16px"><table>
      <thead><tr><th>บทเรียน</th><th class="num">ก่อนเรียน</th><th class="num">แบบฝึก</th><th class="num">หลังเรียน</th><th>สถานะ</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div style="margin-top:22px;display:flex;justify-content:flex-end"><button class="btn btn-text" data-act="reset">${ic('trash')}เริ่มใหม่ทั้งหมด</button></div>
  </div></section>`;
}
function summaryText() {
  const p = S.prog.profile;
  const lines = ['สรุปผลการเรียน · Smile Gallery DA Academy', `ชื่อ: ${p.name || '-'}${p.nickname ? ' (' + p.nickname + ')' : ''} · สาขา: ${p.branch || '-'}`, ''];
  for (const m of DRAFT) {
    const md = gm(m.id), st = modStatus(m, S.prog, S.signoff);
    lines.push(`บทที่ ${modNo(m)} ${m.title}: ก่อนเรียน ${md.pre ? md.pre.score + '%' : '-'} · หลังเรียน ${md.post ? md.post.best + '%' : '-'} · ${st.label}`);
  }
  lines.push('', 'ส่งออกเมื่อ ' + new Date().toLocaleString('th-TH'));
  return lines.join('\n');
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('คัดลอกแล้ว วางในแชตหรืออีเมลถึงหัวหน้าได้เลย'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove(); toast(ok ? 'คัดลอกแล้ว' : 'คัดลอกไม่ได้ในเบราว์เซอร์นี้');
  }
}
DA.copyText = copyText;

/* ── เหตุการณ์ ── */
function onClick(e) {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (DA.acts[a]) return DA.acts[a](el, e);
  switch (a) {
    case 'go': go({ name: el.dataset.r }); break;
    case 'mod': openModule(el.dataset.id); break;
    case 'peek': openModule(el.dataset.id, el.dataset.s, true); break;
    case 'resume': { const na = nextAction(); if (na) openModule(na.m.id, na.sid); else go({ name: 'results' }); break; }
    case 'step': gotoStep(el.dataset.s); break;
    case 'present':
      S.present = !S.present; lsSet(LS_PREFS, { present: S.present }); renderPresent();
      toast(S.present ? 'เปิดโหมดนำเสนอ: เปิดดูทุกบทได้ทันที' : 'ปิดโหมดนำเสนอ: กลับไปเรียนตามลำดับ');
      if (S.route.name === 'mod') { const m = modById(S.route.id); refreshRail(m); renderStep(m, modSteps(m).find(s => s.id === S.route.step)); }
      else if (S.route.name === 'home') renderMain();
      break;
    case 'lesson-done': {
      const m = modById(S.route.id), st = modSteps(m).find(s => s.id === S.route.step);
      if (st && st.kind === 'lesson') { wm(m.id).lessons[st.l.key] = Date.now(); save(); }
      const steps = modSteps(m), nx = steps[steps.findIndex(s => s.id === S.route.step) + 1];
      toast('บันทึกว่าเรียนจบบทนี้แล้ว');
      gotoStep(nx ? nx.id : 'post');
      break;
    }
    case 'chk': {
      const b = S.curBlocks[+el.dataset.b], i = +el.dataset.i, box = el.closest('.qcheck');
      if (!b || box.dataset.done) return;
      if (i === b.a) {
        el.classList.add('ok'); box.dataset.done = '1';
        $$('.choice', box).forEach(x => { x.disabled = true; if (x !== el) x.classList.add('dim'); });
        $('.whyslot', box).innerHTML = `<div class="why ok">${ic('check')}<div><b>ถูกต้อง</b> ${esc(b.why || '')}</div></div>`;
      } else {
        el.classList.add('no'); el.disabled = true;
        $('.whyslot', box).innerHTML = `<div class="why no">${ic('info')}<div>ยังไม่ใช่ ลองเลือกข้ออื่นอีกครั้ง</div></div>`;
      }
      break;
    }
    case 'profile-save': saveProfile(); break;
    case 'copy-sum': copyText(summaryText()); break;
    case 'reset':
      if (el.dataset.armed) {
        S.prog = Object.assign(blankProg(), { profile: S.prog.profile }); save(true); toast('ล้างความคืบหน้าแล้ว'); renderMain();
      } else { el.dataset.armed = '1'; el.innerHTML = `${ic('warn')}กดอีกครั้งเพื่อยืนยันการล้างคะแนนทั้งหมด`; setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.innerHTML = `${ic('trash')}เริ่มใหม่ทั้งหมด`; } }, 4000); }
      break;
    case 'vupl': { const f = $('#vfile'); if (f) f.click(); break; }
    case 'vlink': {
      const u = ($('#vurl').value || '').trim();
      if (!/^https:\/\/[^\s"'<>]+$/i.test(u)) { toast('ใส่ลิงก์ที่ขึ้นต้นด้วย https://'); return; }
      setVideo({ kind: 'link', url: u }).then(() => toast('บันทึกลิงก์วิดีโอแล้ว'), e => toast('บันทึกไม่สำเร็จ (' + errCode(e) + ')'));
      break;
    }
    case 'vdel':
      if (!el.dataset.armed) { el.dataset.armed = '1'; el.lastChild.textContent = 'กดอีกครั้งเพื่อยืนยัน'; return; }
      {
        const cl = S.curLesson, v = cl && S.media[cl.m.id + '_' + cl.l.key];
        setVideo(null).then(() => { toast('เอาวิดีโอออกแล้ว'); if (v && v.kind === 'asset' && S.assets) S.assets.delete(v.id).catch(() => {}); }, e => toast('ทำรายการไม่สำเร็จ (' + errCode(e) + ')'));
      }
      break;
  }
}
function onChange(e) {
  if (e.target && e.target.id === 'vfile') { uploadVideo(e.target.files && e.target.files[0]); e.target.value = ''; }
}
document.addEventListener('toggle', e => { if (e.target && e.target.id === 'rail') S.railOpen = e.target.open; }, true);

DA.boot = function () {
  const st = lsGet(LS_KEY);
  S.prog = st && st.prog ? cleanProg(st.prog) : blankProg();
  S.localUid = st && typeof st.uid === 'string' ? st.uid : null;
  const pr = lsGet(LS_PREFS); S.present = !!(pr && pr.present);
  renderShell();
  renderMain();
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  connect().catch(() => goLocal('nohost'));
};
})();
