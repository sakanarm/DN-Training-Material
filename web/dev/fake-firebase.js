/* Firebase จำลองสำหรับทดสอบในเครื่องเท่านั้น (python scripts/build_web.py --fake --serve)
   ทำหน้าที่แทน firebase-app/auth/firestore-compat เฉพาะส่วนที่ web/auth.js และแอปใช้
   - เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน หรือปุ่ม Google จำลอง (หน้าต่างเลือกบัญชี ไม่ใช่ Google จริง) · บัญชีตัวอย่างใช้รหัสผ่าน test1234
   - Firestore เก็บใน localStorage ซิงก์ข้ามแท็บ และตรวจสิทธิ์ตาม web/firestore.rules แบบย่อ
   - URL: ?reset=1 ล้างข้อมูลจำลอง · ?as=<key> เข้าสู่ระบบทันที (admin, admin2, hr, learner, pending, new)
     ?as=google จำลองบัญชี Google ใหม่ที่ยังไม่ลงทะเบียน
   ห้าม deploy ไฟล์นี้ขึ้นเว็บจริง (build_web.py --fake เขียนไปที่ .preview-web/ เท่านั้น) */
(function () {
'use strict';
const K_DB = 'fakefb:db', K_ACC = 'fakefb:accounts', K_AUTH = 'fakefb:auth';
const LAT = 140; /* หน่วงเหมือนเครือข่าย */
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const later = (fn, ms) => setTimeout(fn, ms == null ? LAT : ms);
const lsRead = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const lsWrite = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* เต็ม */ } };
const err = (code, message) => Object.assign(new Error(message || code), { code });
const admins = () => ((window.DA_WEB && window.DA_WEB.admins) || []).map(s => String(s).toLowerCase());
const DAY = 864e5;

/* ── ข้อมูลตั้งต้น ── */
function seed() {
  const t = Date.now();
  const u = (email, name, nickname, branch, role, status, ago, extra) => Object.assign({
    email, name, nickname, empCode: '', branch, startDate: '', role, status,
    createdAt: t - ago * DAY, updatedAt: t - ago * DAY, profileAt: t - ago * DAY, reviewedBy: '', reviewedAt: 0
  }, extra || {});
  const db = {
    'users/u_hr': u('hr.siam@example.com', 'วรรณา ใจดี', 'วรรณ', 'สาขาสยาม', 'hr', 'active', 40, { empCode: 'HR-001', reviewedBy: 'ผู้ดูแลระบบ', reviewedAt: t - 39 * DAY }),
    'users/u_learn': u('learner@example.com', 'พิมพ์ชนก ตั้งใจ', 'พิม', 'สาขาสยาม', 'learner', 'active', 12, { empCode: 'DA-104', startDate: '2026-10-26', reviewedBy: 'วรรณา ใจดี', reviewedAt: t - 11 * DAY }),
    'users/u_pend': u('pending@example.com', 'กานดา มีสุข', 'ดา', 'สาขาบางนา', 'learner', 'pending', 1, { empCode: 'DA-118', startDate: '2026-11-09' }),
    /* ใส่รหัสซ้ำกับ u_learn ไว้โชว์ป้าย "รหัสซ้ำ" ในหน้าจัดการผู้ใช้ */
    'users/u_pend2': u('thanapon@example.com', 'ธนพล รักงาน', 'ต้น', 'สาขาสยาม', 'learner', 'pending', 0.2, { empCode: 'DA-104' }),
    'users/u_off': u('left@example.com', 'สุดา ลาออก', 'ดา', 'สาขาบางนา', 'learner', 'disabled', 90, { empCode: 'DA-087', reviewedBy: 'วรรณา ใจดี', reviewedAt: t - 20 * DAY })
  };
  const acc = {
    u_hr: { uid: 'u_hr', email: 'hr.siam@example.com', displayName: '', emailVerified: true, provider: 'password', password: 'test1234' },
    u_learn: { uid: 'u_learn', email: 'learner@example.com', displayName: '', emailVerified: true, provider: 'password', password: 'test1234' },
    u_pend: { uid: 'u_pend', email: 'pending@example.com', displayName: '', emailVerified: false, provider: 'password', password: 'test1234' },
    u_pend2: { uid: 'u_pend2', email: 'thanapon@example.com', displayName: '', emailVerified: true, provider: 'password', password: 'test1234' },
    u_off: { uid: 'u_off', email: 'left@example.com', displayName: '', emailVerified: true, provider: 'password', password: 'test1234' }
  };
  lsWrite(K_DB, db); lsWrite(K_ACC, acc);
}
const qs = new URLSearchParams(location.search);
if (qs.get('reset')) { [K_DB, K_ACC, K_AUTH].forEach(k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { /* */ } }); }
if (!lsRead(K_DB)) seed();

/* ── บัญชีผู้ใช้ ── */
const accounts = () => lsRead(K_ACC) || {};
const saveAcc = a => lsWrite(K_ACC, a);
const uidOf = email => 'u_' + Array.from(email).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
function ensureAcc(email, displayName, provider, extra) {
  const a = accounts();
  const found = Object.values(a).find(x => x.email === email);
  if (found) return found;
  const x = Object.assign({ uid: uidOf(email), email, displayName: displayName || '', emailVerified: provider === 'google', provider }, extra || {});
  a[x.uid] = x; saveAcc(a);
  return x;
}
/* อีเมลผู้ดูแลระบบอ่านจาก web/site.json ที่ build_web.py --fake ส่งมา (ไม่เขียนไว้ในไฟล์นี้ เพราะไฟล์นี้ขึ้น git)
   ผู้ดูแลคนแรกคือ ?as=admin คนที่สองคือ ?as=admin2 ต่อไปเรื่อย ๆ */
const SAMPLES = [
  { key: 'hr', email: 'hr.siam@example.com', name: 'Wanna Jaidee', tag: 'HR สาขาสยาม (ตัวอย่าง)' },
  { key: 'learner', email: 'learner@example.com', name: 'Pimchanok', tag: 'ผู้เรียนที่อนุมัติแล้ว (ตัวอย่าง)' },
  { key: 'pending', email: 'thanapon@example.com', name: 'Thanapon', tag: 'รอ HR อนุมัติ (ตัวอย่าง)' },
  { key: 'new', email: 'new.staff@example.com', name: '', tag: 'พนักงานใหม่ ยังไม่ลงทะเบียน' },
  { key: 'google', email: 'someone@gmail.com', name: 'Someone', tag: 'บัญชี Google ใหม่ ยังไม่ลงทะเบียน', provider: 'google' }
];
const presets = () => admins().map((email, i) => ({ key: i ? 'admin' + (i + 1) : 'admin', email, name: email.split('@')[0], tag: 'อีเมลผู้ดูแลระบบใน site.json' })).concat(SAMPLES);

/* ── Auth ── */
let persistence = 'local', current = null;
const authLs = [];
function readAuthUid() {
  try { return sessionStorage.getItem(K_AUTH) || localStorage.getItem(K_AUTH) || null; } catch (e) { return null; }
}
function writeAuthUid(uid) {
  try {
    localStorage.removeItem(K_AUTH); sessionStorage.removeItem(K_AUTH);
    if (uid) (persistence === 'session' ? sessionStorage : localStorage).setItem(K_AUTH, uid);
  } catch (e) { /* */ }
}
function makeUser(rec) {
  const u = {
    uid: rec.uid, email: rec.email, displayName: rec.displayName || null, emailVerified: !!rec.emailVerified,
    providerData: [{ providerId: rec.provider === 'google' ? 'google.com' : 'password' }],
    getIdToken: () => Promise.resolve('fake-token-' + rec.uid),
    reload: () => new Promise(r => later(() => { const x = accounts()[rec.uid]; if (x) u.emailVerified = !!x.emailVerified; r(); })),
    /* จำลองว่าผู้ใช้เปิดลิงก์ยืนยันในอีเมลแล้ว */
    sendEmailVerification: () => new Promise(r => later(() => { const a = accounts(); if (a[rec.uid]) { a[rec.uid].emailVerified = true; saveAcc(a); } console.info('[fake] ส่งลิงก์ยืนยันอีเมลไปที่', rec.email); r(); }))
  };
  return u;
}
function setCurrent(rec) {
  current = rec ? makeUser(rec) : null;
  writeAuthUid(rec ? rec.uid : null);
  authLs.slice().forEach(fn => later(() => fn(current), 0));
}
function initAuth() {
  const uid = readAuthUid(), a = accounts();
  current = uid && a[uid] ? makeUser(a[uid]) : null;
  const as = qs.get('as');
  if (as) {
    const p = presets().find(x => x.key === as);
    if (p) { const rec = ensureAcc(p.email, p.name, p.provider || 'password', p.provider ? { emailVerified: true } : { password: 'test1234', emailVerified: true }); current = makeUser(rec); writeAuthUid(rec.uid); }
  }
  if (as || qs.get('reset')) {
    qs.delete('as'); qs.delete('reset');
    history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash);
  }
}
function chooser() {
  return new Promise((resolve, reject) => {
    const wrap = document.createElement('div');
    wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', 'เลือกบัญชี Google (จำลอง)');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(10,20,40,.55);display:grid;place-items:center;padding:16px;font-family:inherit';
    const row = p => `<button type="button" data-k="${p.key}" style="display:flex;gap:12px;align-items:center;width:100%;text-align:left;padding:10px 12px;border:0;border-top:1px solid #e6e8ef;background:#fff;cursor:pointer;font:inherit;color:#1c2333">
      <span style="flex:none;width:34px;height:34px;border-radius:50%;background:#2F368F;color:#fff;display:grid;place-items:center;font-weight:700">${p.name[0]}</span>
      <span style="min-width:0"><b style="display:block;font-size:14px">${p.name}</b><small style="display:block;color:#5b6478;font-size:12.5px;overflow:hidden;text-overflow:ellipsis">${p.email} · ${p.tag}</small></span></button>`;
    wrap.innerHTML = `<div style="width:min(420px,100%);background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)">
      <div style="padding:16px 16px 12px"><b style="font-size:16px;color:#1c2333">เลือกบัญชี Google</b>
        <div style="margin-top:4px;font-size:12.5px;color:#b3261e">โหมดทดสอบในเครื่อง ไม่ใช่ Google จริง</div></div>
      ${presets().map(row).join('')}
      <form style="display:flex;gap:8px;padding:12px;border-top:1px solid #e6e8ef"><input type="email" placeholder="อีเมลอื่น" aria-label="อีเมลอื่น" style="flex:1;min-width:0;padding:8px 10px;border:1px solid #c9cedb;border-radius:8px;font:inherit">
        <button style="padding:8px 12px;border:0;border-radius:8px;background:#2F368F;color:#fff;font:inherit;cursor:pointer">ใช้อีเมลนี้</button></form>
      <div style="padding:0 12px 12px;text-align:right"><button type="button" data-k="cancel" style="padding:8px 12px;border:0;background:none;color:#2F368F;font:inherit;cursor:pointer">ยกเลิก</button></div></div>`;
    const done = (fn, v) => { wrap.remove(); fn(v); };
    wrap.addEventListener('click', e => {
      const b = e.target.closest('[data-k]');
      if (!b && e.target !== wrap) return;
      if (!b || b.dataset.k === 'cancel') return done(reject, err('auth/popup-closed-by-user'));
      const p = presets().find(x => x.key === b.dataset.k);
      done(resolve, ensureAcc(p.email, p.name, 'google'));
    });
    wrap.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const v = wrap.querySelector('input').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return;
      done(resolve, ensureAcc(v, v.split('@')[0], 'google'));
    });
    document.body.appendChild(wrap);
    wrap.querySelector('[data-k]').focus();
  });
}
const AUTH = {
  languageCode: null,
  get currentUser() { return current; },
  useEmulator() { /* ไม่ใช้ */ },
  setPersistence(p) { persistence = p === 'session' ? 'session' : 'local'; return Promise.resolve(); },
  onAuthStateChanged(next) { authLs.push(next); later(() => next(current), 60); return () => { const i = authLs.indexOf(next); if (i >= 0) authLs.splice(i, 1); }; },
  createUserWithEmailAndPassword(email, pw) {
    return new Promise((resolve, reject) => later(() => {
      email = String(email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reject(err('auth/invalid-email'));
      if (String(pw || '').length < 6) return reject(err('auth/weak-password'));
      if (Object.values(accounts()).some(x => x.email === email)) return reject(err('auth/email-already-in-use'));
      const rec = ensureAcc(email, '', 'password', { password: pw, emailVerified: false });
      setCurrent(rec); resolve({ user: current });
    }));
  },
  signInWithEmailAndPassword(email, pw) {
    return new Promise((resolve, reject) => later(() => {
      email = String(email || '').trim().toLowerCase();
      const rec = Object.values(accounts()).find(x => x.email === email);
      if (!rec || rec.provider !== 'password' || rec.password !== pw) return reject(err('auth/invalid-credential'));
      setCurrent(rec); resolve({ user: current });
    }));
  },
  signInWithPopup() { return chooser().then(rec => new Promise(r => later(() => { setCurrent(rec); r({ user: current }); })))},
  sendPasswordResetEmail(email) { console.info('[fake] ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่', email); return new Promise(r => later(r)); },
  signOut() { return new Promise(r => later(() => { setCurrent(null); r(); }, 40)); }
};

/* ── Firestore ── */
let DB = lsRead(K_DB) || {};
const docLs = [], colLs = [];
const colOf = path => path.split('/')[0];
const idOf = path => path.split('/')[1];
function snapOf(path, pending) {
  const d = DB[path];
  return { id: idOf(path), ref: { path }, exists: d !== undefined, data: () => clone(d), metadata: { hasPendingWrites: !!pending, fromCache: false } };
}
function qsnapOf(col, pending) {
  const docs = Object.keys(DB).filter(p => colOf(p) === col).sort().map(p => snapOf(p));
  return { docs, size: docs.length, empty: !docs.length, forEach: fn => docs.forEach(fn), metadata: { hasPendingWrites: !!pending, fromCache: false } };
}

/* กฎแบบย่อ (ให้ตรงกับ web/firestore.rules) */
const ROLES = ['learner', 'hr', 'admin'], STATUSES = ['pending', 'active', 'disabled', 'rejected'];
const USER_KEYS = ['email', 'name', 'nickname', 'empCode', 'branch', 'startDate', 'role', 'status', 'createdAt', 'updatedAt', 'profileAt', 'reviewedBy', 'reviewedAt'];
const isStr = (v, n) => typeof v === 'string' && v.length <= n;
const profOK = d => isStr(d.name, 60) && d.name.length > 0 && isStr(d.nickname, 30) && isStr(d.empCode, 20) && isStr(d.branch, 60) && isStr(d.startDate, 10);
const hasOnly = (keys, allow) => keys.every(k => allow.includes(k));
function changedKeys(a, b) {
  const ks = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
  return [...ks].filter(k => JSON.stringify((a || {})[k]) !== JSON.stringify((b || {})[k]));
}
function who() {
  const rec0 = current ? accounts()[current.uid] : null;
  /* เหมือน signedIn() ใน firestore.rules: รับเฉพาะบัญชีอีเมล/รหัสผ่าน หรือ Google */
  const c = current && rec0 && (rec0.provider === 'password' || rec0.provider === 'google') ? current : null;
  const me = c ? DB['users/' + c.uid] : null, rec = rec0;
  const active = !!(me && me.status === 'active');
  return {
    uid: c && c.uid, email: c ? String(c.email || '').toLowerCase() : '',
    adminEmail: !!(c && rec && rec.emailVerified && admins().includes(String(c.email).toLowerCase())),
    active, hr: active && (me.role === 'hr' || me.role === 'admin'), admin: active && me.role === 'admin'
  };
}
function allowed(op, path, before, after) {
  const w = who(); if (!w.uid) return false;
  const col = colOf(path), id = idOf(path), self = !!id && id === w.uid;
  if (op === 'list') return col === 'media' ? w.active : w.hr;
  if (col === 'users') {
    if (op === 'read') return self || w.hr;
    if (op === 'delete') return w.admin && !self;
    if (op === 'create') {
      const ks = Object.keys(after);
      return self && hasOnly(ks, USER_KEYS) && USER_KEYS.every(k => k in after) && after.email === w.email && profOK(after)
        && after.reviewedBy === '' && after.reviewedAt === 0
        && ((after.role === 'learner' && after.status === 'pending' && (after.empCode.length > 0 || admins().includes(w.email))) || (w.adminEmail && after.role === 'admin' && after.status === 'active'));
    }
    const ch = changedKeys(before, after);
    return (self && hasOnly(ch, ['name', 'nickname', 'empCode', 'branch', 'startDate', 'updatedAt', 'profileAt']) && profOK(after)
        && (before.role !== 'learner' || after.empCode.length > 0 || admins().includes(w.email)))
      || (self && w.adminEmail && hasOnly(ch, ['role', 'status', 'updatedAt']) && after.role === 'admin' && after.status === 'active')
      || (!self && w.hr && hasOnly(ch, ['status', 'role', 'name', 'nickname', 'empCode', 'branch', 'startDate', 'updatedAt', 'profileAt', 'reviewedBy', 'reviewedAt'])
        && ROLES.includes(after.role) && STATUSES.includes(after.status) && profOK(after) && isStr(after.reviewedBy, 60)
        && (w.admin || (before.role === 'learner' && after.role === 'learner')));
  }
  if (col === 'progress') {
    if (op === 'read') return (self && w.active) || w.hr;
    if (op === 'delete') return (self && w.active) || w.admin;
    return self && w.active;
  }
  if (col === 'signoffs') return op === 'read' ? (self && w.active) || w.hr : w.hr;
  if (col === 'media') return op === 'read' ? w.active : w.hr;
  return false;
}
const denied = () => err('permission-denied', 'Missing or insufficient permissions.');

function notify(paths, pending) {
  const cols = new Set(paths.map(colOf));
  docLs.slice().forEach(l => {
    if (!paths.includes(l.path) || (pending === false && !l.meta)) return;
    if (!allowed('read', l.path)) { l.stop(); if (l.err) l.err(denied()); return; }
    l.next(snapOf(l.path, pending));
  });
  if (pending === false) return; /* คอลเลกชันไม่ได้ขอ metadata changes */
  colLs.slice().forEach(l => {
    if (!cols.has(l.col)) return;
    if (!allowed('list', l.col + '/_')) { l.stop(); if (l.err) l.err(denied()); return; }
    l.next(qsnapOf(l.col, pending));
  });
}
/* ทุก snapshot หลังเขียนในแท็บนี้: pending ก่อน แล้วยืนยันจาก "เซิร์ฟเวอร์" */
function write(op, path, fn) {
  return new Promise((resolve, reject) => {
    const before = DB[path], after = fn(clone(before));
    if (op === 'update' && before === undefined) return later(() => reject(err('not-found', 'No document to update: ' + path)));
    const kind = op === 'delete' ? 'delete' : before === undefined ? 'create' : 'update';
    if (!allowed(kind, path, before, after)) { console.warn('[fake] permission-denied', kind, path, after); return later(() => reject(denied())); }
    if (after === undefined) delete DB[path]; else DB[path] = after;
    lsWrite(K_DB, DB);
    later(() => notify([path], true), 0);
    later(() => { notify([path], false); resolve(); });
  });
}
function listenDoc(path, opts, next, onErr) {
  const l = { path, meta: !!(opts && opts.includeMetadataChanges), next, err: onErr, stop: () => { const i = docLs.indexOf(l); if (i >= 0) docLs.splice(i, 1); } };
  docLs.push(l);
  later(() => {
    if (docLs.indexOf(l) < 0) return;
    if (!allowed('read', path)) { l.stop(); if (onErr) onErr(denied()); return; }
    next(snapOf(path, false));
  });
  return l.stop;
}
function docRef(path) {
  return {
    id: idOf(path), path,
    get: () => new Promise((res, rej) => later(() => (allowed('read', path) ? res(snapOf(path)) : rej(denied())))),
    set: d => write('set', path, () => clone(d)),
    update: d => write('update', path, b => Object.assign(b || {}, clone(d))),
    delete: () => write('delete', path, () => undefined),
    onSnapshot(a, b, c) { return typeof a === 'function' ? listenDoc(path, {}, a, b) : listenDoc(path, a, b, c); }
  };
}
function colRef(col) {
  return {
    id: col, path: col,
    doc: id => docRef(col + '/' + id),
    get: () => new Promise((res, rej) => later(() => (allowed('list', col + '/_') ? res(qsnapOf(col)) : rej(denied())))),
    onSnapshot(a, b, c) {
      const next = typeof a === 'function' ? a : b, onErr = typeof a === 'function' ? b : c;
      const l = { col, next, err: onErr, stop: () => { const i = colLs.indexOf(l); if (i >= 0) colLs.splice(i, 1); } };
      colLs.push(l);
      later(() => {
        if (colLs.indexOf(l) < 0) return;
        if (!allowed('list', col + '/_')) { l.stop(); if (onErr) onErr(denied()); return; }
        next(qsnapOf(col));
      });
      return l.stop;
    }
  };
}
const FS = {
  useEmulator() { /* ไม่ใช้ */ },
  /* ของจริงเก็บข้อมูลใน IndexedDB ให้เปิดได้ตอนออฟไลน์ · ของปลอมเก็บใน localStorage อยู่แล้ว */
  enablePersistence: () => { FS.persisted = true; return Promise.resolve(); },
  terminate: () => Promise.resolve(),
  clearPersistence: () => Promise.resolve(),
  doc: path => docRef(String(path)),
  collection: path => colRef(String(path))
};

/* ซิงก์ข้ามแท็บ (เช่น แท็บ HR อนุมัติ → แท็บผู้เรียนเปิดบทเรียนเอง) */
window.addEventListener('storage', e => {
  if (e.key === K_DB) {
    const old = DB; DB = lsRead(K_DB) || {};
    const paths = [...new Set(Object.keys(old).concat(Object.keys(DB)))].filter(p => JSON.stringify(old[p]) !== JSON.stringify(DB[p]));
    if (paths.length) notify(paths, false), notifyCols(paths);
  } else if (e.key === K_AUTH && persistence === 'local') {
    const uid = readAuthUid(), a = accounts();
    if ((uid || null) !== (current ? current.uid : null)) { current = uid && a[uid] ? makeUser(a[uid]) : null; authLs.slice().forEach(fn => fn(current)); }
  }
});
function notifyCols(paths) {
  const cols = new Set(paths.map(colOf));
  colLs.slice().forEach(l => { if (cols.has(l.col)) { if (!allowed('list', l.col + '/_')) { l.stop(); if (l.err) l.err(denied()); return; } l.next(qsnapOf(l.col, false)); } });
}

/* ── namespace แบบ compat ── */
const authFn = () => AUTH;
authFn.Auth = { Persistence: { LOCAL: 'local', SESSION: 'session', NONE: 'none' } };
function GoogleAuthProvider() { this.params = {}; }
GoogleAuthProvider.prototype.setCustomParameters = function (p) { this.params = p; return this; };
GoogleAuthProvider.prototype.addScope = function () { return this; };
authFn.GoogleAuthProvider = GoogleAuthProvider;
let inited = false;
window.firebase = {
  apps: [],
  initializeApp(cfg) { if (!inited) { inited = true; initAuth(); } const app = { name: '[DEFAULT]', options: cfg }; this.apps = [app]; return app; },
  auth: authFn,
  firestore: () => FS
};
window.FAKEFB = {
  reset() { [K_DB, K_ACC, K_AUTH].forEach(k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { /* */ } }); location.reload(); },
  db: () => clone(DB),
  accounts: () => clone(accounts())
};

/* ป้ายโหมดทดสอบ */
document.addEventListener('DOMContentLoaded', () => {
  const b = document.createElement('div');
  b.textContent = 'Firebase จำลอง · ทดสอบในเครื่อง';
  b.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9998;padding:3px 8px;border-radius:6px;background:#b3261e;color:#fff;font:600 11px/1.4 sans-serif;opacity:.85;pointer-events:none';
  document.body.appendChild(b);
});
})();
