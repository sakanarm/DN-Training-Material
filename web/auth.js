/* DA Training Academy — เวอร์ชันเว็บบน Firebase (โหลดหลัง app.js / hr.js / skills.js / daily.js)
   หน้าที่: เข้าสู่ระบบ (Google หรืออีเมลและรหัสผ่าน) · ลงทะเบียนพนักงาน · รอ HR อนุมัติ · HR จัดการผู้ใช้
   ตั้ง DA.platform ให้หน้าตาเหมือน window.claude (มี use(name) → db / user / downloads) แล้วเรียก DA.boot()
   ส่วนอื่นของแอปจึงทำงานเหมือนใน claude.ai ทุกอย่าง ใน claude.ai ไฟล์นี้ไม่ถูกโหลดเลย
   ข้อมูลใน Firestore: users/{uid} ทะเบียนผู้ใช้ · progress/{uid} · signoffs/{uid} · media/videos
   สิทธิ์จริงบังคับด้วย firestore.rules (web/firestore.rules) ส่วนในไฟล์นี้แค่ซ่อนปุ่มที่ใช้ไม่ได้ */
(function () {
'use strict';
const DA = window.DA, W = window.DA_WEB || {};
const { $, $$, esc, ic, toast, lsGet, lsSet, S } = DA;
const LS_KEY = 'da-training:v1', LS_PREFS = 'da-training:prefs', EVAL_KEY = 'da-training:evaluator', SHARED_KEY = 'da-web:shared';
/* หน้าเว็บรู้แค่ SHA-256 ของอีเมลผู้ดูแล (build_web.py) ไม่เผยอีเมลจริงในไฟล์สาธารณะ
   สิทธิ์จริงตรวจที่ firestore.rules ซึ่งไม่ถูกส่งไปที่เบราว์เซอร์ */
const ADMIN_H = (W.adminHashes || []).map(s => String(s).trim().toLowerCase()).filter(Boolean);
const ADM = {};
function adminCheck(u) {
  const e = String((u && u.email) || '').trim().toLowerCase();
  if (!e || e in ADM || !ADMIN_H.length || !(window.crypto && crypto.subtle)) return Promise.resolve();
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(e))
    .then(b => { ADM[e] = ADMIN_H.includes(Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('')); })
    .catch(() => {});
}
const BRANCHES = (W.branches || []).map(s => String(s).trim()).filter(Boolean);
const ROLES = ['learner', 'hr', 'admin'], STATUSES = ['pending', 'active', 'disabled', 'rejected'];
const ROLE_T = { learner: 'ผู้เรียน', hr: 'HR / หัวหน้า', admin: 'ผู้ดูแลระบบ' };
const STATUS_T = { pending: ['รออนุมัติ', 'chip-warn'], active: ['ใช้งานอยู่', 'chip-ok'], disabled: ['ปิดการใช้งาน', 'chip-dash'], rejected: ['ไม่อนุมัติ', 'chip-bad'] };
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
const isoOK = v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
/* รหัสพนักงาน: ตัวพิมพ์ใหญ่ ไม่มีช่องว่าง เพื่อให้ HR ค้นและเทียบรหัสซ้ำได้ตรงกัน */
const normEmp = v => String(v || '').toUpperCase().replace(/\s+/g, '').slice(0, 20);
const initial = s => { const t = String(s || '').trim().replace(/^(นาย|นางสาว|นาง|น\.ส\.)\s*/, ''); return t ? [...t][0].toUpperCase() : '?'; };
const fmtD = t => (t ? new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '–');
const fmtIso = v => (v ? fmtD(new Date(v + 'T00:00:00').getTime()) : '–');

/* ไอคอนเฉพาะเวอร์ชันเว็บ (ชุดหลักอยู่ใน app.js) */
const SVG = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/>',
  out: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9 16.5 4.5 12 9 7.5M5 12h10"/>',
  wait: '<path d="M6 3h12M6 21h12"/><path d="M7 3v3.5a5 5 0 0 0 10 0V3M7 21v-3.5a5 5 0 0 1 10 0V21"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v4"/>',
  wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14.5 8.5l2 2"/>'
};
const si = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[n] || ''}</svg>`;
const GOOGLE = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

/* ── Firebase ── */
let auth = null, fs = null;
function init() {
  firebase.initializeApp(W.firebase);
  auth = firebase.auth(); auth.languageCode = 'th';
  fs = firebase.firestore();
  if (W.useEmulators) {
    auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
    fs.useEmulator('127.0.0.1', 8080);
  }
}
const rawCode = e => String((e && e.code) || '').replace(/^(auth|firestore)\//, '');
/* รหัสข้อผิดพลาดของ Firestore → รหัสที่แอปรู้จัก (ดู dbErr / retryOnce ใน app.js) */
const CODE_MAP = { 'permission-denied': 'not_granted', unauthenticated: 'not_granted', 'resource-exhausted': 'resource_exhausted', 'invalid-argument': 'invalid_argument' };
function appErr(e) {
  const err = new Error((e && e.message) || 'firestore error');
  err.code = CODE_MAP[rawCode(e)] || 'unavailable'; err.raw = rawCode(e);
  return err;
}
const pass = p => p.catch(e => { throw appErr(e); });
const plain = d => JSON.parse(JSON.stringify(d == null ? {} : d));
function wrapDoc(path) {
  const ref = fs.doc(path);
  return {
    id: ref.id, path,
    get: () => pass(ref.get()),
    set: d => pass(ref.set(plain(d))),
    update: d => pass(ref.update(plain(d))),
    delete: () => pass(ref.delete()),
    onSnapshot: (next, err) => ref.onSnapshot({ includeMetadataChanges: true }, next, e => { if (err) err(appErr(e)); })
  };
}
function wrapCol(path) {
  const ref = fs.collection(path);
  return {
    id: ref.id, path,
    doc: id => wrapDoc(path + '/' + id),
    get: () => pass(ref.get()),
    onSnapshot: (next, err) => ref.onSnapshot(next, e => { if (err) err(appErr(e)); })
  };
}
/* ดาวน์โหลดไฟล์ (CSV ของ HR / ใบประกาศ) ผ่านลิงก์ในเบราว์เซอร์ */
const DOWNLOADS = {
  save: async ({ filename, data }) => {
    const type = /\.csv$/i.test(filename) ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true };
  }
};

/* ── ข้อความภาษาไทย ── */
const AUTH_T = {
  'invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (ถ้าเคยสมัครด้วย Google ให้กดปุ่ม "เข้าสู่ระบบด้วย Google")',
  'invalid-login-credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (ถ้าเคยสมัครด้วย Google ให้กดปุ่ม "เข้าสู่ระบบด้วย Google")',
  'wrong-password': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (ถ้าเคยสมัครด้วย Google ให้กดปุ่ม "เข้าสู่ระบบด้วย Google")',
  'user-not-found': 'ไม่พบบัญชีนี้ ถ้ายังไม่เคยสมัคร กดแท็บ "สมัครใหม่"',
  'invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
  'missing-email': 'กรอกอีเมลก่อน',
  'missing-password': 'กรอกรหัสผ่านก่อน',
  'email-already-in-use': 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบ (ถ้าเคยสมัครด้วย Google ให้กดปุ่ม Google) หรือกด "ลืมรหัสผ่าน"',
  'weak-password': 'รหัสผ่านสั้นเกินไป ต้องมีอย่างน้อย 6 ตัวอักษร',
  'too-many-requests': 'ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่',
  'network-request-failed': 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ ตรวจสัญญาณแล้วลองใหม่',
  'popup-blocked': 'เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ อนุญาตป๊อปอัปสำหรับเว็บนี้ หรือใช้อีเมลแทน',
  'account-exists-with-different-credential': 'อีเมลนี้เคยสมัครด้วยรหัสผ่าน ลองเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน',
  'user-disabled': 'บัญชีนี้ถูกระงับในระบบ ติดต่อ HR ของคลินิก',
  'operation-not-allowed': 'วิธีเข้าสู่ระบบนี้ยังไม่ได้เปิดใช้ (ผู้ดูแลต้องเปิด Google และ Email/Password ใน Firebase Console > Authentication > Sign-in method)',
  'configuration-not-found': 'ระบบเข้าสู่ระบบยังไม่ได้ตั้งค่า (ผู้ดูแลต้องกด Get started แล้วเปิด Google และ Email/Password ใน Firebase Console > Authentication)',
  'unauthorized-domain': 'โดเมนนี้ยังไม่ได้รับอนุญาตให้เข้าสู่ระบบ (เพิ่มใน Firebase Console > Authentication > Settings)',
  'internal-error': 'ระบบเข้าสู่ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้ง'
};
/* ผู้ใช้ปิดหน้าต่าง Google เอง ไม่ต้องแสดงข้อผิดพลาด */
const SILENT = new Set(['popup-closed-by-user', 'cancelled-popup-request', 'user-cancelled']);
/* เบราว์เซอร์ในแอป (LINE, Facebook, Instagram) Google ไม่ยอมให้เข้าสู่ระบบ */
const IN_APP = /\bLine\/|FBAN|FBAV|Instagram/i.test(navigator.userAgent || '');
const authMsg = e => AUTH_T[rawCode(e)] || `ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง${rawCode(e) ? ` (${rawCode(e)})` : ''}`;
function dbMsg(e) {
  const c = rawCode(e);
  if (c === 'permission-denied') return 'ระบบไม่อนุญาตให้ทำรายการนี้ (permission-denied)';
  if (c === 'unavailable' || c === 'deadline-exceeded') return 'เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่';
  if (c === 'resource-exhausted') return 'ระบบใช้งานเกินโควตาของวันนี้ ลองใหม่พรุ่งนี้ หรือแจ้งผู้ดูแลระบบ';
  if (c === 'not-found') return 'ไม่พบข้อมูลนี้แล้ว อาจถูกลบไปก่อนหน้า';
  return `ทำรายการไม่สำเร็จ${c ? ` (${c})` : ''}`;
}

/* ── ทะเบียนผู้ใช้ ── */
function normUser(x) {
  x = x && typeof x === 'object' ? x : {};
  return {
    email: str(x.email, 120), name: str(x.name, 60), nickname: str(x.nickname, 30), empCode: str(x.empCode, 20),
    branch: str(x.branch, 60), startDate: isoOK(str(x.startDate, 10)),
    role: ROLES.includes(x.role) ? x.role : 'learner', status: STATUSES.includes(x.status) ? x.status : 'pending',
    createdAt: num(x.createdAt), updatedAt: num(x.updatedAt), profileAt: num(x.profileAt),
    reviewedBy: str(x.reviewedBy, 60), reviewedAt: num(x.reviewedAt)
  };
}
const isAdminEmail = u => !!(u && u.email && ADM[u.email.trim().toLowerCase()]);
const isAdminU = u => isAdminEmail(u) && !!u.emailVerified;
/* วิธีเข้าสู่ระบบที่เว็บนี้รับ (ตรงกับ signedIn() ใน firestore.rules) */
const viaAllowed = u => !!u && (u.providerData || []).some(p => p && (p.providerId === 'password' || p.providerId === 'google.com'));
const isMgr = d => !!d && d.status === 'active' && (d.role === 'hr' || d.role === 'admin');

/* ── สถานะของหน้าเข้าสู่ระบบ ── */
const G = { u: null, d: null, unsub: null, booted: false, bootRole: '', bootStatus: '', view: 'loading', tab: 'in', err: '', info: '', editing: false, upTried: false, busy: false, shared: !!lsGet(SHARED_KEY), verifySent: false, kick: "" };

function stopMe() { if (G.unsub) { try { G.unsub(); } catch (e) { /* ปิดไปแล้ว */ } G.unsub = null; } }
function watchMe(u) {
  stopMe();
  G.unsub = fs.doc('users/' + u.uid).onSnapshot({ includeMetadataChanges: true }, s => {
    if (s.metadata.hasPendingWrites) return;
    if (!s.exists && s.metadata.fromCache) return; /* ยังไม่ได้คำตอบจากเซิร์ฟเวอร์ */
    onMe(u, s.exists ? normUser(s.data()) : null);
  }, e => {
    if (G.booted) return;
    G.err = dbMsg(e); gate('error');
  });
}
function onMe(u, d) {
  G.d = d;
  if (G.booted) return afterBootChange(d);
  if (!d) { G.editing = false; return gate('register'); }
  /* อีเมลผู้ดูแลระบบ (ตั้งไว้ใน site.json) ได้สิทธิ์ admin อัตโนมัติ */
  if (isAdminU(u) && !(d.role === 'admin' && d.status === 'active') && !G.upTried) {
    G.upTried = true;
    fs.doc('users/' + u.uid).update({ role: 'admin', status: 'active', updatedAt: Date.now() }).catch(() => route(u, d));
    return;
  }
  route(u, d);
}
function route(u, d) {
  if (d.status === 'active') return bootApp(u, d);
  gate(d.status === 'rejected' ? 'rejected' : d.status === 'disabled' ? 'disabled' : 'pending');
}
function afterBootChange(d) {
  if (!d || d.status !== G.bootStatus || d.role !== G.bootRole) {
    toast(d && d.status === 'active' ? `สิทธิ์ของคุณเปลี่ยนเป็น "${ROLE_T[d.role]}" กำลังโหลดหน้าใหม่…` : 'สถานะบัญชีของคุณเปลี่ยนไป กำลังโหลดหน้าใหม่…');
    setTimeout(() => location.reload(), 1600);
    return;
  }
  /* HR แก้ชื่อหรือสาขาให้ → อัปเดตโปรไฟล์ในความคืบหน้าด้วย */
  const p = S.prog && S.prog.profile;
  if (p && d.profileAt > (p.at || 0)) {
    S.prog.profile = { name: d.name, nickname: d.nickname, branch: d.branch, startDate: d.startDate, at: d.profileAt };
    DA.save();
    const n = S.route.name;
    if (n === 'home' || n === 'results') DA.renderMain();
  }
  refreshAcct();
}

function onAuth(u) {
  if (G.booted) { if (!u || !G.u || u.uid !== G.u.uid) location.reload(); return; }
  stopMe();
  G.u = u; G.d = null; G.upTried = false; G.editing = false; G.err = G.kick || ''; G.kick = ''; G.verifySent = false;
  if (!u) return gate('signin');
  /* เว็บนี้รับเฉพาะ Google หรืออีเมล/รหัสผ่าน ถ้าเข้ามาด้วยวิธีอื่นให้ออกจากระบบทันที · firestore.rules ก็บล็อกซ้ำ */
  if (!viaAllowed(u)) {
    G.u = null; G.kick = 'เว็บนี้เข้าสู่ระบบด้วย Google หรืออีเมลและรหัสผ่านเท่านั้น';
    gate('loading');
    auth.signOut().catch(() => { G.err = G.kick; G.kick = ''; gate('signin'); });
    return;
  }
  gate('loading');
  adminCheck(u).then(() => { if (G.u === u) watchMe(u); });
}

/* ── หน้าเข้าสู่ระบบ ── */
function heroHTML() {
  const D = DA.DRAFT, nL = D.reduce((a, m) => a + m.lessons.length, 0), nP = D.reduce((a, m) => a + m.practice.length, 0);
  return `<aside class="gate-hero">
    ${DA.cloud('', 'width:190px;right:-40px;top:26px;opacity:.16')}${DA.cloud('', 'width:130px;left:-36px;bottom:120px;opacity:.12')}
    <div class="gate-brand">
      <span class="gate-logo"><img src="img/logo-smile-gallery.png" alt="Smile Gallery Dental Clinic" width="133" height="38"></span>
      <span class="brand-pill">${ic('award')}DA Academy</span>
    </div>
    <h1>ก้าวแรกสู่<br><span class="hl">ผู้ช่วยทันตแพทย์</span><br>มืออาชีพ</h1>
    <p>หลักสูตรฝึกอบรมของ Smile Gallery เรียนจากวิดีโอสั้น ฝึกกับสถานการณ์ข้างเก้าอี้ทำฟัน และวัดผลก่อนลงหน้างานจริง</p>
    <ul class="gate-pts">
      <li>${ic('book')}<span><b>${D.length}</b> บทเรียน · ${nL} หัวข้อ</span></li>
      <li>${ic('puzzle')}<span><b>${nP}</b> แบบฝึกโต้ตอบ</span></li>
      <li>${ic('award')}<span>ใบประกาศเมื่อเรียนครบ</span></li>
    </ul>
    <div class="gate-denta">${DA.MASCOT}<span class="bubble">สวัสดี! น้องเดนต้าเอง<br>เข้าสู่ระบบแล้วไปเรียนกัน</span></div>
  </aside>`;
}
const msgHTML = () => `<div class="g-msg${G.err ? ' on' : ''}" id="g-msg" role="alert">${G.err ? `${ic('warn')}<span>${esc(G.err)}</span>` : ''}</div>
  <div class="g-info${G.info ? ' on' : ''}" id="g-info" role="status">${G.info ? `${ic('check')}<span>${esc(G.info)}</span>` : ''}</div>`;
function acctLine() {
  const u = G.u || {};
  return `<div class="g-acct"><span class="acct-av">${esc(initial(u.displayName || u.email))}</span><div><small>เข้าสู่ระบบด้วย</small><b>${esc(u.email || '')}</b></div><button class="btn btn-text btn-sm" data-gate="out">ใช้บัญชีอื่น</button></div>`;
}
function signinHTML() {
  const up = G.tab === 'up';
  return `<div class="g-head">
      <h2>${up ? 'สมัครใช้งาน' : 'เข้าสู่ระบบ'}</h2>
      <p>${up ? 'สมัครแล้วกรอกข้อมูลพนักงาน รอ HR อนุมัติก็เริ่มเรียนได้' : 'ใช้บัญชี Google หรืออีเมลที่สมัครไว้'}</p>
    </div>
    <div class="seg g-tabs" role="group" aria-label="เลือกการทำรายการ">
      <button type="button" data-gate="tab" data-v="in" aria-pressed="${!up}">เข้าสู่ระบบ</button>
      <button type="button" data-gate="tab" data-v="up" aria-pressed="${up}">สมัครใหม่</button>
    </div>
    <button type="button" class="btn g-google" data-gate="google">${GOOGLE}${up ? 'สมัครด้วยบัญชี Google' : 'เข้าสู่ระบบด้วย Google'}</button>
    ${IN_APP ? '<p class="g-hint">เปิดจากแอป LINE หรือ Facebook ปุ่ม Google อาจใช้ไม่ได้ ให้เปิดลิงก์ใน Chrome หรือ Safari หรือใช้อีเมลด้านล่าง</p>' : ''}
    <div class="g-or"><span>หรือใช้อีเมล</span></div>
    <form id="g-form" class="g-form" novalidate>
      <div class="field"><label for="g-email">อีเมล</label><input id="g-email" name="email" type="email" autocomplete="${up ? 'email' : 'username'}" inputmode="email" required></div>
      <div class="field"><label for="g-pass">รหัสผ่าน</label>
        <div class="g-pw"><input id="g-pass" name="pass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="6" required><button type="button" class="g-eye" data-gate="eye" aria-label="แสดงรหัสผ่าน" aria-pressed="false">${ic('eye')}</button></div>
        ${up ? '<small>อย่างน้อย 6 ตัวอักษร</small>' : ''}</div>
      ${up ? '<div class="field"><label for="g-pass2">ยืนยันรหัสผ่าน</label><input id="g-pass2" name="pass2" type="password" autocomplete="new-password" minlength="6" required></div>' : ''}
      ${msgHTML()}
      <button type="submit" class="btn btn-cta btn-pill g-submit">${up ? `${ic('user')}สมัครด้วยอีเมล` : `${si('mail')}เข้าสู่ระบบ`}</button>
    </form>
    <div class="g-row">
      <label class="g-check"><input type="checkbox" id="g-shared"${G.shared ? ' checked' : ''}> เครื่องส่วนกลาง <span>(ไม่จำการเข้าสู่ระบบ)</span></label>
      ${up ? '' : '<button type="button" class="btn btn-text btn-sm" data-gate="forgot">ลืมรหัสผ่าน?</button>'}
    </div>`;
}
function branchField(val, id) {
  const list = BRANCHES.slice(); if (val && !list.includes(val)) list.push(val);
  return list.length
    ? `<select id="${id}" name="branch" required><option value="">เลือกสาขา</option>${list.map(b => `<option${b === val ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`
    : `<input id="${id}" name="branch" maxlength="60" required value="${esc(val)}" placeholder="เช่น สาขาสยาม">`;
}
function registerHTML() {
  const d = G.d || {}, u = G.u || {}, edit = !!G.d;
  const name = d.name || (edit ? '' : str(u.displayName, 60));
  return `<div class="g-head">
      ${edit ? '' : '<span class="g-step">ขั้นตอนสุดท้าย</span>'}
      <h2>${edit ? 'แก้ไขข้อมูลพนักงาน' : 'ลงทะเบียนพนักงาน'}</h2>
      <p>${edit ? 'แก้ได้จนกว่า HR จะอนุมัติ หลังจากนั้นแก้ได้ที่หน้า "ข้อมูลของฉัน"' : 'กรอกข้อมูลให้ HR ตรวจสอบ ใช้เวลาไม่ถึงนาที'}</p>
    </div>
    ${acctLine()}
    ${!edit && isAdminU(u) ? `<div class="note ok g-note">${ic('shield')}<div><b>บัญชีผู้ดูแลระบบของคลินิก</b><br>ลงทะเบียนแล้วใช้งานได้ทันที พร้อมสิทธิ์จัดการผู้ใช้ทั้งหมด</div></div>` : ''}
    <form id="g-reg" class="form g-reg" novalidate>
      <div class="field g-span"><label for="r-name">ชื่อ-นามสกุล <i class="req">*</i></label><input id="r-name" name="name" maxlength="60" required autocomplete="name" value="${esc(name)}"></div>
      <div class="field"><label for="r-nick">ชื่อเล่น</label><input id="r-nick" name="nickname" maxlength="30" autocomplete="nickname" value="${esc(d.nickname || '')}"></div>
      <div class="field"><label for="r-emp">รหัสพนักงาน${isAdminEmail(u) ? '' : ' <i class="req">*</i>'}</label><input id="r-emp" name="empCode" maxlength="20" autocapitalize="characters" spellcheck="false" ${isAdminEmail(u) ? '' : 'required '}value="${esc(d.empCode || '')}" placeholder="เช่น DA-104"><small>${isAdminEmail(u) ? 'บัญชีผู้ดูแลระบบเว้นว่างได้' : 'ดูจากบัตรพนักงาน หรือถาม HR'}</small></div>
      <div class="field"><label for="r-branch">สาขา <i class="req">*</i></label>${branchField(d.branch || '', 'r-branch')}</div>
      <div class="field"><label for="r-start">วันเริ่มงาน</label><input id="r-start" name="startDate" type="date" value="${esc(d.startDate || '')}"></div>
      <div class="g-span">${msgHTML()}</div>
      <div class="g-span g-acts">
        <button type="submit" class="btn btn-cta btn-pill">${edit ? `${ic('check')}บันทึกการแก้ไข` : isAdminU(u) ? `${ic('check')}เริ่มใช้งานระบบ` : `${ic('arrowR') || ''}ส่งข้อมูลให้ HR`}</button>
        ${edit ? '<button type="button" class="btn btn-ghost" data-gate="edit-cancel">ยกเลิก</button>' : ''}
      </div>
    </form>`;
}
function statusHTML(kind) {
  const d = G.d || {}, u = G.u || {};
  if (kind === 'pending' && G.editing) return registerHTML();
  const T = {
    pending: ['wait', 'warn', 'รอ HR อนุมัติ', 'ได้รับข้อมูลของคุณแล้ว เมื่อ HR อนุมัติ หน้านี้จะเปิดบทเรียนให้เองโดยไม่ต้องรีเฟรช'],
    rejected: ['ban', 'bad', 'ยังไม่ได้รับอนุมัติ', 'HR ยังไม่อนุมัติบัญชีนี้ ถ้าคิดว่าเป็นความผิดพลาด ติดต่อ HR ของคลินิกได้เลย'],
    disabled: ['ban', 'bad', 'บัญชีนี้ถูกปิดการใช้งาน', 'ถ้าต้องการกลับมาใช้งาน ติดต่อ HR ของคลินิก ข้อมูลการเรียนเดิมยังเก็บไว้ครบ']
  }[kind];
  const row = (k, v) => `<div><dt>${k}</dt><dd>${v ? esc(v) : '<span class="muted">–</span>'}</dd></div>`;
  const verify = kind === 'pending' && isAdminEmail(u) && !u.emailVerified;
  return `<div class="g-status">
      <div class="g-ico ${T[1]}">${si(T[0])}</div>
      <h2>${T[2]}</h2>
      <p>${T[3]}</p>
    </div>
    ${kind === 'pending' ? `<dl class="g-sum">
      ${row('ชื่อ-นามสกุล', d.name)}${row('ชื่อเล่น', d.nickname)}${row('รหัสพนักงาน', d.empCode)}${row('สาขา', d.branch)}${row('วันเริ่มงาน', d.startDate ? fmtIso(d.startDate) : '')}${row('อีเมล', u.email || d.email)}
    </dl>` : acctLine()}
    ${verify ? `<div class="note g-note">${si('key')}<div><b>อีเมลนี้เป็นบัญชีผู้ดูแลระบบ</b><br>${G.verifySent ? 'ส่งลิงก์ยืนยันไปที่อีเมลแล้ว เปิดลิงก์ในอีเมล แล้วกด "ยืนยันแล้ว"' : 'ยืนยันอีเมลก่อน ระบบจึงให้สิทธิ์ผู้ดูแลอัตโนมัติ (หรือออกจากระบบแล้วเข้าใหม่ด้วยปุ่ม Google ได้ทันที)'}
      <div class="g-acts sm">${G.verifySent ? '<button class="btn btn-brand btn-sm" data-gate="verified">ยืนยันแล้ว</button>' : '<button class="btn btn-brand btn-sm" data-gate="verify">ส่งลิงก์ยืนยันอีเมล</button>'}</div></div></div>` : ''}
    ${msgHTML()}
    <div class="g-acts center">
      ${kind === 'pending' ? `<button class="btn btn-ghost btn-sm" data-gate="edit">${ic('edit')}แก้ไขข้อมูล</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-gate="out">${si('out')}ออกจากระบบ</button>
    </div>`;
}
function simpleHTML(icon, tone, title, body, acts) {
  return `<div class="g-status"><div class="g-ico ${tone}">${icon}</div><h2>${title}</h2><p>${body}</p></div>${acts ? `<div class="g-acts center">${acts}</div>` : ''}`;
}
function gate(view) {
  G.view = view;
  let inner;
  if (view === 'loading') inner = `<div class="g-load" role="status"><span class="g-spin" aria-hidden="true"></span>กำลังตรวจสอบบัญชี…</div>`;
  else if (view === 'signin') inner = signinHTML();
  else if (view === 'register') inner = registerHTML();
  else if (view === 'pending' || view === 'rejected' || view === 'disabled') inner = statusHTML(view);
  else if (view === 'setup') inner = simpleHTML(si('plug'), 'warn', 'ยังไม่ได้ตั้งค่า Firebase', 'ใส่ค่าโปรเจกต์ Firebase ของคลินิกใน <code>web/site.json</code> แล้วสั่ง <code>python scripts/build_web.py</code> ใหม่ ดูขั้นตอนใน <code>web/README.md</code>');
  else inner = simpleHTML(si('wifi'), 'bad', 'เชื่อมต่อระบบไม่ได้', esc(G.err || 'ลองใหม่อีกครั้ง'), `<button class="btn btn-brand btn-sm" data-gate="retry">${ic('refresh')}ลองใหม่</button>${G.u ? `<button class="btn btn-ghost btn-sm" data-gate="out">${si('out')}ออกจากระบบ</button>` : ''}`);
  $('#app').innerHTML = `<div class="gate" id="gate"><div class="gate-in">${heroHTML()}<section class="gate-card" aria-labelledby="g-title">${inner.replace('<h2>', '<h2 id="g-title">')}</section></div>
    <p class="gate-foot">Smile Gallery Dental Clinic · ระบบฝึกอบรมผู้ช่วยทันตแพทย์ · ข้อมูลใช้ภายในคลินิกเท่านั้น</p></div>`;
  G.info = '';
}
function setMsg(err, info) {
  G.err = err || ''; G.info = info || '';
  const m = $('#g-msg'), n = $('#g-info');
  if (m) { m.className = 'g-msg' + (G.err ? ' on' : ''); m.innerHTML = G.err ? `${ic('warn')}<span>${esc(G.err)}</span>` : ''; }
  if (n) { n.className = 'g-info' + (G.info ? ' on' : ''); n.innerHTML = G.info ? `${ic('check')}<span>${esc(G.info)}</span>` : ''; }
}
function setBusy(b) {
  G.busy = b;
  const g = $('#gate'); if (!g) return;
  g.toggleAttribute('aria-busy', b);
  $$('button, input, select', g).forEach(x => { x.disabled = b; });
}
async function persist() {
  const P = firebase.auth.Auth.Persistence;
  try { await auth.setPersistence(G.shared ? P.SESSION : P.LOCAL); } catch (e) { /* ใช้ค่าเดิม */ }
}
async function withBusy(fn) {
  if (G.busy) return;
  setBusy(true); setMsg('');
  try { await fn(); } finally { if ($('#gate')) setBusy(false); }
}

function onGateClick(e) {
  const el = e.target.closest('[data-gate]'); if (!el || !$('#gate')) return;
  const a = el.dataset.gate;
  if (a === 'tab') { G.tab = el.dataset.v === 'up' ? 'up' : 'in'; G.err = ''; gate('signin'); const f = $('#g-email'); if (f) f.focus(); }
  else if (a === 'google') withBusy(async () => {
    await persist();
    const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await auth.signInWithPopup(p); } catch (err) { if (!SILENT.has(rawCode(err))) setMsg(authMsg(err)); }
  });
  else if (a === 'eye') {
    const i = $('#g-pass'), on = i.type === 'password';
    i.type = on ? 'text' : 'password'; el.setAttribute('aria-pressed', String(on)); el.setAttribute('aria-label', on ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
  }
  else if (a === 'forgot') {
    const email = ($('#g-email').value || '').trim();
    if (!email) { setMsg('กรอกอีเมลในช่องด้านบนก่อน แล้วกด "ลืมรหัสผ่าน?" อีกครั้ง'); $('#g-email').focus(); return; }
    withBusy(async () => {
      try { await auth.sendPasswordResetEmail(email); setMsg('', `ถ้ามีบัญชี ${email} ในระบบ เราส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว ตรวจกล่องจดหมาย (และโฟลเดอร์จดหมายขยะ)`); }
      catch (err) { setMsg(authMsg(err)); }
    });
  }
  else if (a === 'out') signOut();
  else if (a === 'edit') { G.editing = true; G.err = ''; gate('pending'); }
  else if (a === 'edit-cancel') { G.editing = false; G.err = ''; gate('pending'); }
  else if (a === 'retry') { if (G.u) { gate('loading'); watchMe(G.u); } else location.reload(); }
  else if (a === 'verify') withBusy(async () => {
    try { await G.u.sendEmailVerification(); G.verifySent = true; gate('pending'); } catch (err) { setMsg(authMsg(err)); }
  });
  else if (a === 'verified') withBusy(async () => {
    try {
      await G.u.reload(); await G.u.getIdToken(true);
      if (!G.u.emailVerified) { setMsg('ยังไม่พบการยืนยัน เปิดลิงก์ในอีเมลก่อน แล้วกดอีกครั้ง'); return; }
      G.upTried = false; gate('loading'); onMe(G.u, G.d);
    } catch (err) { setMsg(authMsg(err)); }
  });
}
function onGateChange(e) {
  if (e.target && e.target.id === 'g-shared') { G.shared = e.target.checked; lsSet(SHARED_KEY, G.shared); }
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function onGateSubmit(e) {
  const f = e.target;
  if (f.id === 'g-form') {
    e.preventDefault();
    const up = G.tab === 'up', email = f.elements.email.value.trim(), pw = f.elements.pass.value;
    if (!EMAIL_RE.test(email)) { setMsg('กรอกอีเมลให้ถูกต้อง'); f.elements.email.focus(); return; }
    if (pw.length < 6) { setMsg(up ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : 'กรอกรหัสผ่าน'); f.elements.pass.focus(); return; }
    if (up && pw !== f.elements.pass2.value) { setMsg('รหัสผ่านสองช่องไม่ตรงกัน'); f.elements.pass2.focus(); return; }
    withBusy(async () => {
      await persist();
      try { if (up) await auth.createUserWithEmailAndPassword(email, pw); else await auth.signInWithEmailAndPassword(email, pw); }
      catch (err) { setMsg(authMsg(err)); }
    });
  } else if (f.id === 'g-reg') {
    e.preventDefault();
    const v = n => (f.elements[n] ? f.elements[n].value : '').trim();
    const name = v('name').slice(0, 60), branch = v('branch').slice(0, 60);
    if (!name) { setMsg('กรอกชื่อ-นามสกุล'); f.elements.name.focus(); return; }
    const empCode = normEmp(v('empCode'));
    if (!empCode && !isAdminEmail(G.u)) { setMsg('กรอกรหัสพนักงาน'); f.elements.empCode.focus(); return; }
    if (!branch) { setMsg(BRANCHES.length ? 'เลือกสาขาที่ทำงาน' : 'กรอกสาขาที่ทำงาน'); f.elements.branch.focus(); return; }
    const now = Date.now(), u = G.u;
    const data = { name, nickname: v('nickname').slice(0, 30), empCode, branch, startDate: isoOK(v('startDate')), profileAt: now, updatedAt: now };
    withBusy(async () => {
      const ref = fs.doc('users/' + u.uid);
      try {
        if (G.d) await ref.update(data);
        else {
          const adm = isAdminU(u);
          await ref.set(Object.assign({ email: (u.email || '').toLowerCase(), role: adm ? 'admin' : 'learner', status: adm ? 'active' : 'pending', createdAt: now, reviewedBy: '', reviewedAt: 0 }, data));
        }
        G.editing = false;
        if (G.d) toast('บันทึกข้อมูลแล้ว');
      } catch (err) { setMsg(dbMsg(err)); }
    });
  }
}

async function signOut() {
  stopMe(); stopUsers();
  try { await auth.signOut(); } catch (e) { /* ออกต่อได้ */ }
  /* เครื่องส่วนกลาง: ไม่ทิ้งคะแนนและชื่อผู้ประเมินของคนก่อนไว้ในเบราว์เซอร์ */
  [LS_KEY, LS_PREFS, EVAL_KEY].forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* ไม่มีที่เก็บ */ } });
  location.reload();
}

/* ── หลังเข้าสู่ระบบ: เปิดแอปหลัก ── */
function bootApp(u, d) {
  G.booted = true; G.bootRole = d.role; G.bootStatus = d.status;
  const mgr = isMgr(d);
  if (mgr && !lsGet(EVAL_KEY)) lsSet(EVAL_KEY, d.name);
  DA.platform = makePlatform(u, d, mgr);
  DA.boot();
  $$('[data-nav="hr"]').forEach(b => { if (!b.querySelector('.ndot')) b.insertAdjacentHTML('beforeend', '<i class="ndot" aria-hidden="true"></i>'); });
  document.addEventListener('click', closePopOutside);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && popOpen()) { closePop(); const b = $('.acct-btn'); if (b) b.focus(); } });
  if (mgr) watchUsers();
}
function makePlatform(u, d, mgr) {
  const db = { doc: wrapDoc, collection: wrapCol };
  const user = {
    id: async () => u.uid,
    canEdit: async () => mgr,
    can: async n => (n === 'data.write' ? true : null),
    isOwner: async () => d.role === 'admin',
    me: async () => ({ id: u.uid, name: (G.d && G.d.name) || d.name })
  };
  return {
    uid: u.uid, role: d.role, manager: mgr,
    use: n => (n === 'db' ? db : n === 'user' ? user : n === 'downloads' ? DOWNLOADS : null),
    why: {
      nohost: 'เชื่อมต่อระบบไม่ได้ คะแนนเก็บในเครื่องนี้ก่อน',
      signedout: 'ยังไม่ได้เข้าสู่ระบบ คะแนนเก็บในเครื่องนี้',
      nodb: 'เชื่อมต่อฐานข้อมูลไม่ได้ คะแนนเก็บในเครื่องนี้ก่อน',
      denied: 'ระบบไม่อนุญาตให้บัญชีนี้บันทึกคะแนน (บัญชีอาจถูกปิดการใช้งาน) ติดต่อ HR · คะแนนเก็บในเครื่องนี้ก่อน',
      off: 'การเชื่อมต่อฐานข้อมูลถูกปิด คะแนนเก็บในเครื่องนี้'
    },
    ribbon: '<b>DA Academy</b> ระบบฝึกอบรมผู้ช่วยทันตแพทย์ · เนื้อหารอทันตแพทย์ตรวจทาน',
    footer: `<div><b>Smile Gallery · DA Academy</b><br>ระบบฝึกอบรมผู้ช่วยทันตแพทย์ของคลินิก</div>
      <div>เนื้อหาอยู่ระหว่างรอทันตแพทย์ตรวจทาน<br>ข้อมูลผู้เรียนใช้ภายในคลินิกเท่านั้น</div>`,
    shellRight: acctBtnHTML,
    onBoot(St) {
      const x = G.d, p = St.prog.profile;
      if (x && (x.profileAt > (p.at || 0) || !p.name)) St.prog.profile = { name: x.name, nickname: x.nickname, branch: x.branch, startDate: x.startDate, at: x.profileAt || Date.now() };
    },
    /* ผู้เรียนแก้ "ข้อมูลของฉัน" → อัปเดตทะเบียนผู้ใช้ให้ HR เห็นตรงกัน (ความยาวตรงกับ firestore.rules) */
    onProfile(p) {
      const name = str(p.name, 60); if (!name) return;
      fs.doc('users/' + u.uid).update({ name, nickname: str(p.nickname, 30), branch: str(p.branch, 60), startDate: isoOK(str(p.startDate, 10)), profileAt: num(p.at) || Date.now(), updatedAt: Date.now() })
        .catch(() => toast('อัปเดตทะเบียนผู้ใช้ไม่สำเร็จ ข้อมูลในหน้านี้ยังบันทึกไว้'));
    },
    /* HR เห็นชื่อ/สาขาล่าสุดจากทะเบียนผู้ใช้ และไม่เห็นบัญชีที่ปิดหรือไม่อนุมัติ */
    overlay(id, p) {
      const x = UL.map[id];
      if (!x) return p;
      if (x.status === 'disabled' || x.status === 'rejected') return null;
      if (x.role === 'admin' || (x.role === 'hr' && !Object.keys(p.modules).length)) return null;
      return Object.assign({}, p, { profile: Object.assign({}, p.profile, { name: x.name || p.profile.name, nickname: x.nickname, empCode: x.empCode || '', branch: x.branch || p.profile.branch, startDate: x.startDate || p.profile.startDate }) });
    }
  };
}

/* ── ปุ่มบัญชีมุมขวาบน ── */
function acctBtnHTML() {
  const d = G.d || {};
  return `<span class="acct"><button class="acct-btn" data-act="acct" aria-haspopup="true" aria-expanded="false" aria-controls="acct-pop" aria-label="บัญชีของฉัน: ${esc(d.name || G.u.email)}"><span class="acct-av">${esc(initial(d.name || G.u.email))}</span></button><div class="acct-pop" id="acct-pop" hidden></div></span>`;
}
function acctPopHTML() {
  const d = G.d || {}, mgr = isMgr(d);
  return `<div class="acct-me"><span class="acct-av lg">${esc(initial(d.name || G.u.email))}</span><div><b>${esc(d.name || '–')}${d.nickname ? ` <span class="muted">(${esc(d.nickname)})</span>` : ''}</b><small>${esc(G.u.email || '')}</small></div></div>
    <div class="acct-tags"><span class="chip chip-brand">${esc(ROLE_T[d.role] || '')}</span>${d.branch ? `<span class="chip">${esc(d.branch)}</span>` : ''}</div>
    <div class="acct-list" role="menu">
      <button role="menuitem" data-act="go" data-r="profile">${ic('user')}ข้อมูลของฉัน</button>
      ${mgr ? `<button role="menuitem" data-act="acct-users">${ic('users')}จัดการผู้ใช้${pendingCount() ? `<span class="hr-badge">${pendingCount()}</span>` : ''}</button>` : ''}
      <button role="menuitem" class="danger" data-act="acct-out">${si('out')}<span>ออกจากระบบ</span></button>
    </div>`;
}
const popOpen = () => { const p = $('#acct-pop'); return !!(p && !p.hidden); };
function closePop() { const p = $('#acct-pop'), b = $('.acct-btn'); if (p) p.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }
function closePopOutside(e) {
  if (!popOpen()) return;
  const inAcct = e.target.closest('.acct');
  if (!inAcct || e.target.closest('.acct-list [data-act]:not([data-act="acct-out"])')) closePop();
}
function refreshAcct() {
  const b = $('.acct-btn'); if (!b) return;
  const d = G.d || {};
  b.querySelector('.acct-av').textContent = initial(d.name || G.u.email);
  b.setAttribute('aria-label', 'บัญชีของฉัน: ' + (d.name || G.u.email));
  if (popOpen()) $('#acct-pop').innerHTML = acctPopHTML();
}
Object.assign(DA.acts, {
  acct: el => {
    const p = $('#acct-pop'); if (!p) return;
    if (!p.hidden) return closePop();
    p.innerHTML = acctPopHTML(); p.hidden = false; el.setAttribute('aria-expanded', 'true');
    const f = p.querySelector('[role="menuitem"]'); if (f) f.focus();
  },
  'acct-users': () => DA.go({ name: 'hr', view: 'users' }),
  'acct-out': el => {
    const busy = S.dirty || S.writing || S.sync === 'pending' || S.sync === 'saving';
    if (busy && !el.dataset.armed) {
      el.dataset.armed = '1'; el.querySelector('span').textContent = 'คะแนนยังส่งไม่ครบ กดอีกครั้งเพื่อออก';
      setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.querySelector('span').textContent = 'ออกจากระบบ'; } }, 5000);
      return;
    }
    closePop(); signOut();
  }
});

/* ── รายชื่อผู้ใช้ (เฉพาะ HR / ผู้ดูแลระบบ) ── */
const UL = { map: {}, list: [], ready: false, err: '', unsub: null, sig: '', nPend: -1 };
function stopUsers() { if (UL.unsub) { try { UL.unsub(); } catch (e) { /* ปิดไปแล้ว */ } UL.unsub = null; } }
function watchUsers() {
  UL.unsub = fs.collection('users').onSnapshot(q => {
    const map = {};
    q.docs.forEach(x => { map[x.id] = Object.assign({ id: x.id }, normUser(x.data())); });
    UL.map = map; UL.list = Object.values(map); UL.ready = true; UL.err = '';
    onUsers();
  }, e => { UL.ready = true; UL.err = rawCode(e) || 'unavailable'; onUsers(); });
}
const pendingCount = () => UL.list.filter(x => x.status === 'pending').length;
function onUsers() {
  const n = pendingCount();
  $$('[data-nav="hr"]').forEach(b => b.classList.toggle('need', n > 0));
  if (popOpen()) $('#acct-pop').innerHTML = acctPopHTML();
  const sig = UL.list.map(x => [x.id, x.name, x.nickname, x.branch, x.startDate, x.status, x.role].join('|')).sort().join('\n');
  const changed = sig !== UL.sig, pendChanged = n !== UL.nPend;
  UL.sig = sig; UL.nPend = n;
  if (S.route.name !== 'hr') return;
  if (pendChanged && DA.hr && DA.hr.refreshHead) DA.hr.refreshHead();
  if (S.route.view === 'users') drawUsers();
  else if (changed && $('#hr-body') && DA.hr && DA.hr.api) DA.hr.api.redraw();
}

const UI = { f: null, q: '', edit: null, stale: false };
const meIsAdmin = () => !!(G.d && G.d.role === 'admin' && G.d.status === 'active');
const canManage = x => x.id !== G.u.uid && (meIsAdmin() || x.role === 'learner');
const myName = () => ((G.d && G.d.name) || G.u.email || '').slice(0, 60);
const FILTERS = [
  ['pending', 'รออนุมัติ', x => x.status === 'pending', 'warn'],
  ['active', 'ใช้งานอยู่', x => x.status === 'active', 'ok'],
  ['off', 'ปิด / ไม่อนุมัติ', x => x.status === 'disabled' || x.status === 'rejected', 'off'],
  ['all', 'ทั้งหมด', () => true, 'all']
];
function statsHTML() {
  return FILTERS.map(([k, t, fn, tone]) => `<button class="u-stat u-${tone}" data-act="u-f" data-v="${k}" aria-pressed="${UI.f === k}"><span>${t}</span><b>${UL.list.filter(fn).length}</b></button>`).join('');
}
function matchQ(x, q) {
  if (!q) return true;
  return [x.name, x.nickname, x.email, x.empCode, x.branch].some(v => String(v || '').toLowerCase().includes(q));
}
const ST_ORDER = { pending: 0, active: 1, disabled: 2, rejected: 3 };
function listHTML() {
  if (!UL.ready) return `<div class="u-empty"><span class="g-spin" aria-hidden="true"></span>กำลังโหลดรายชื่อ…</div>`;
  if (UL.err) return `<div class="note warn">${ic('warn')}<div><b>โหลดรายชื่อผู้ใช้ไม่ได้</b><br>${UL.err === 'permission-denied' ? 'บัญชีนี้ไม่มีสิทธิ์ดูรายชื่อ หรือยังไม่ได้ deploy กฎความปลอดภัยล่าสุด' : 'ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้า'} (${esc(UL.err)})</div></div>`;
  const fl = FILTERS.find(x => x[0] === UI.f) || FILTERS[3], q = UI.q.trim().toLowerCase();
  const rows = UL.list.filter(fl[2]).filter(x => matchQ(x, q)).sort((a, b) =>
    (ST_ORDER[a.status] - ST_ORDER[b.status]) || (a.status === 'pending' ? a.createdAt - b.createdAt : 0) || a.name.localeCompare(b.name, 'th'));
  if (!rows.length) {
    const t = q ? 'ไม่พบผู้ใช้ที่ตรงกับคำค้น' : UI.f === 'pending' ? 'ไม่มีคำขอที่รออนุมัติ' : 'ยังไม่มีผู้ใช้ในกลุ่มนี้';
    return `<div class="u-empty">${ic(UI.f === 'pending' && !q ? 'check' : 'search')}${t}</div>`;
  }
  const brs = [...new Set(BRANCHES.concat(UL.list.map(x => x.branch).filter(Boolean)))];
  /* รหัสพนักงานซ้ำกัน (ไม่นับบัญชีที่ไม่อนุมัติ) ให้ HR ตรวจก่อนอนุมัติ */
  const seen = {};
  UL.list.forEach(x => { const k = normEmp(x.empCode); if (k && x.status !== 'rejected') seen[k] = (seen[k] || 0) + 1; });
  UI.dups = seen;
  return `<div class="tbl-wrap u-wrap"><table class="u-tbl">
    <thead><tr><th>ผู้ใช้</th><th>รหัสพนักงาน</th><th>สาขา</th><th>เริ่มงาน</th><th>ลงทะเบียน</th><th>สิทธิ์</th><th>สถานะ</th><th class="u-actc"><span class="sr">จัดการ</span></th></tr></thead>
    <tbody>${rows.map(rowHTML).join('')}</tbody></table></div>
    <datalist id="u-brs">${brs.map(b => `<option value="${esc(b)}">`).join('')}</datalist>
    <p class="u-foot">${ic('info')}การลบบัญชีถาวรทำได้ใน Firebase Console เท่านั้น ส่วนคนที่ลาออกให้กด "ปิดการใช้งาน" ประวัติการเรียนจะยังอยู่ครบ</p>`;
}
const ubtn = (act, id, label, cls, icon) => `<button class="btn btn-sm ${cls}" data-act="${act}" data-uid="${esc(id)}">${icon}<span>${label}</span></button>`;
function rowHTML(x) {
  const mine = x.id === G.u.uid, can = canManage(x), [st, tone] = STATUS_T[x.status];
  const acts = [];
  if (can) {
    if (x.status === 'pending') acts.push(ubtn('u-ok', x.id, 'อนุมัติ', 'btn-brand', ic('check')), ubtn('u-no', x.id, 'ไม่อนุมัติ', 'btn-ghost', ic('x')));
    else if (x.status === 'active') acts.push(ubtn('u-edit', x.id, 'แก้ไข', 'btn-ghost', ic('edit')), ubtn('u-off', x.id, 'ปิดการใช้งาน', 'btn-danger', si('ban')));
    else if (x.status === 'disabled') acts.push(ubtn('u-on', x.id, 'เปิดใช้งาน', 'btn-brand', ic('refresh')), ubtn('u-edit', x.id, 'แก้ไข', 'btn-ghost', ic('edit')));
    else acts.push(ubtn('u-ok', x.id, 'อนุมัติ', 'btn-brand', ic('check')), ubtn('u-edit', x.id, 'แก้ไข', 'btn-ghost', ic('edit')));
  } else if (mine) acts.push(ubtn('u-edit', x.id, 'แก้ไข', 'btn-ghost', ic('edit')));
  else acts.push('<span class="u-ro">แก้ได้เฉพาะผู้ดูแลระบบ</span>');
  const reviewed = x.reviewedBy && x.status !== 'pending' ? `<small>${x.status === 'active' ? 'อนุมัติ' : x.status === 'rejected' ? 'ไม่อนุมัติ' : 'ปิด'}โดย ${esc(x.reviewedBy)} · ${fmtD(x.reviewedAt)}</small>` : '';
  const row = `<tr class="u-row${UI.edit === x.id ? ' editing' : ''}${x.status === 'pending' ? ' is-pend' : ''}">
    <td data-label="ผู้ใช้"><div class="u-who"><span class="acct-av">${esc(initial(x.name || x.email))}</span><div><b>${esc(x.name || 'ไม่ระบุชื่อ')}${x.nickname ? ` <span class="muted">(${esc(x.nickname)})</span>` : ''}${mine ? ' <span class="chip chip-sun">คุณ</span>' : ''}</b><small>${esc(x.email)}</small></div></div></td>
    <td data-label="รหัสพนักงาน">${x.empCode ? esc(x.empCode) + ((UI.dups || {})[normEmp(x.empCode)] > 1 && x.status !== 'rejected' ? ' <span class="chip chip-bad" title="มีบัญชีอื่นใช้รหัสนี้ด้วย ตรวจก่อนอนุมัติ">รหัสซ้ำ</span>' : '') : '<span class="muted">–</span>'}</td>
    <td data-label="สาขา">${x.branch ? esc(x.branch) : '<span class="muted">–</span>'}</td>
    <td data-label="เริ่มงาน">${fmtIso(x.startDate)}</td>
    <td data-label="ลงทะเบียน">${fmtD(x.createdAt)}</td>
    <td data-label="สิทธิ์"><span class="chip ${x.role === 'learner' ? '' : 'chip-brand'}">${ROLE_T[x.role]}</span></td>
    <td data-label="สถานะ"><span class="chip ${tone}">${st}</span>${reviewed}</td>
    <td class="u-actc"><div class="u-acts">${acts.join('')}</div></td></tr>`;
  return UI.edit === x.id ? row + editHTML(x, mine) : row;
}
function editHTML(x, mine) {
  const roleSel = meIsAdmin() && !mine
    ? `<div class="field"><label for="e-role">สิทธิ์ในระบบ</label><select id="e-role" name="role">${ROLES.map(r => `<option value="${r}"${r === x.role ? ' selected' : ''}>${ROLE_T[r]}</option>`).join('')}</select><small>HR / หัวหน้า: ดูคะแนนทุกคน ประเมินหน้างาน อนุมัติผู้เรียน</small></div>` : '';
  const br = BRANCHES.length
    ? branchField(x.branch, 'e-branch')
    : `<input id="e-branch" name="branch" maxlength="60" list="u-brs" value="${esc(x.branch)}">`;
  return `<tr class="u-editrow"><td colspan="8"><form id="u-form" class="form u-form" data-uid="${esc(x.id)}" novalidate>
    <div class="u-ftitle g-span">${ic('edit')}<b>แก้ไขข้อมูลของ ${esc(x.name || x.email)}</b></div>
    <div class="field"><label for="e-name">ชื่อ-นามสกุล <i class="req">*</i></label><input id="e-name" name="name" maxlength="60" required value="${esc(x.name)}"></div>
    <div class="field"><label for="e-nick">ชื่อเล่น</label><input id="e-nick" name="nickname" maxlength="30" value="${esc(x.nickname)}"></div>
    <div class="field"><label for="e-emp">รหัสพนักงาน</label><input id="e-emp" name="empCode" maxlength="20" value="${esc(x.empCode)}"></div>
    <div class="field"><label for="e-branch">สาขา</label>${br}</div>
    <div class="field"><label for="e-start">วันเริ่มงาน</label><input id="e-start" name="startDate" type="date" value="${esc(x.startDate)}"></div>
    ${roleSel}
    <div class="g-span u-fbtns"><button type="submit" class="btn btn-brand btn-sm">${ic('check')}บันทึก</button><button type="button" class="btn btn-ghost btn-sm" data-act="u-cancel">ยกเลิก</button></div>
  </form></td></tr>`;
}
function renderUsers(box) {
  if (UI.f == null) UI.f = pendingCount() ? 'pending' : 'all';
  box.innerHTML = `<div class="u-stats" id="u-stats" role="group" aria-label="กรองตามสถานะ">${statsHTML()}</div>
    <div class="hr-bar u-bar">
      <input id="u-q" type="search" placeholder="ค้นหาชื่อ อีเมล รหัสพนักงาน หรือสาขา" aria-label="ค้นหาผู้ใช้" value="${esc(UI.q)}" autocomplete="off">
      <span class="u-hint">${ic('info')}${meIsAdmin() ? 'คุณเป็นผู้ดูแลระบบ: กำหนดสิทธิ์ HR ได้จากปุ่ม "แก้ไข"' : 'คุณจัดการได้เฉพาะบัญชีผู้เรียน'}</span>
    </div>
    <div id="u-list" aria-live="polite">${listHTML()}</div>`;
  $('#u-q').addEventListener('input', e => { UI.q = e.target.value; if (!UI.edit) $('#u-list').innerHTML = listHTML(); });
}
function drawUsers() {
  const st = $('#u-stats'), li = $('#u-list'); if (!li) return;
  st.innerHTML = statsHTML();
  if (UI.edit && $('#u-form')) { UI.stale = true; return; } /* ไม่ลบสิ่งที่กำลังพิมพ์ */
  UI.stale = false; li.innerHTML = listHTML();
}
async function setStatus(el, status, done) {
  const uid = el.dataset.uid, x = UL.map[uid]; if (!x) return;
  el.disabled = true;
  try {
    await fs.doc('users/' + uid).update({ status, reviewedBy: myName(), reviewedAt: Date.now(), updatedAt: Date.now() });
    toast(done.replace('{n}', x.name || x.email));
  } catch (e) { el.disabled = false; toast(dbMsg(e)); }
}
function arm(el, label) {
  if (el.dataset.armed) return true;
  el.dataset.armed = '1'; const s = el.querySelector('span'), was = s.textContent; s.textContent = label;
  setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; s.textContent = was; } }, 4000);
  return false;
}
Object.assign(DA.acts, {
  'u-f': el => { UI.f = el.dataset.v; UI.edit = null; drawUsers(); },
  'u-ok': el => setStatus(el, 'active', 'อนุมัติ {n} แล้ว เริ่มเรียนได้ทันที'),
  'u-on': el => setStatus(el, 'active', 'เปิดใช้งานบัญชี {n} อีกครั้งแล้ว'),
  'u-no': el => { if (arm(el, 'ยืนยันไม่อนุมัติ')) setStatus(el, 'rejected', 'ไม่อนุมัติ {n} แล้ว'); },
  'u-off': el => { if (arm(el, 'ยืนยันปิดบัญชี')) setStatus(el, 'disabled', 'ปิดการใช้งาน {n} แล้ว'); },
  'u-edit': el => { UI.edit = el.dataset.uid; UI.stale = false; $('#u-list').innerHTML = listHTML(); const i = $('#e-name'); if (i) i.focus(); },
  'u-cancel': () => { UI.edit = null; $('#u-list').innerHTML = listHTML(); }
});
async function saveEdit(f) {
  const uid = f.dataset.uid, x = UL.map[uid]; if (!x) return;
  const v = n => (f.elements[n] ? f.elements[n].value : '').trim();
  const name = v('name').slice(0, 60);
  if (!name) { toast('กรอกชื่อ-นามสกุล'); f.elements.name.focus(); return; }
  const empCode = normEmp(v('empCode'));
  if (!empCode && (f.elements.role ? f.elements.role.value : x.role) === 'learner') { toast('กรอกรหัสพนักงาน'); f.elements.empCode.focus(); return; }
  const now = Date.now();
  const patch = { name, nickname: v('nickname').slice(0, 30), empCode, branch: v('branch').slice(0, 60), startDate: isoOK(v('startDate')), profileAt: now, updatedAt: now };
  if (f.elements.role && ROLES.includes(f.elements.role.value) && f.elements.role.value !== x.role) patch.role = f.elements.role.value;
  const btn = f.querySelector('[type="submit"]'); btn.disabled = true;
  try {
    await fs.doc('users/' + uid).update(patch);
    UI.edit = null; $('#u-list').innerHTML = listHTML();
    toast(patch.role ? `บันทึกแล้ว · สิทธิ์ใหม่: ${ROLE_T[patch.role]}` : 'บันทึกข้อมูลแล้ว');
  } catch (e) { btn.disabled = false; toast(dbMsg(e)); }
}
document.addEventListener('submit', e => { if (e.target && e.target.id === 'u-form') { e.preventDefault(); saveEdit(e.target); } });

/* ── เริ่มทำงาน (แทน DA.boot) ── */
function start() {
  document.addEventListener('click', onGateClick);
  document.addEventListener('change', onGateChange);
  document.addEventListener('submit', onGateSubmit);
  const cfg = W.firebase || {};
  if (!cfg.apiKey || !cfg.projectId) return gate('setup');
  if (!window.firebase || typeof firebase.initializeApp !== 'function') { G.err = 'โหลดระบบเข้าสู่ระบบไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่'; return gate('error'); }
  try { init(); } catch (e) { G.err = 'ตั้งค่า Firebase ไม่ถูกต้อง: ' + ((e && e.message) || e); return gate('error'); }
  gate('loading');
  auth.onAuthStateChanged(onAuth, () => { G.err = 'ตรวจสอบการเข้าสู่ระบบไม่ได้'; gate('error'); });
}
DA.auth = { start, renderUsers, pendingCount };
})();
