/* DA Training Academy — ติดตั้งเป็นแอป (PWA) เฉพาะเวอร์ชันเว็บ · โหลดหลัง auth.js ก่อน DA.auth.start()
   - ลงทะเบียน service worker (public/sw.js ที่ build_web.py สร้าง) ให้เปิดได้เร็วและเปิดได้ตอนสัญญาณอ่อน
   - ปุ่ม "ติดตั้งเป็นแอป": Android / คอม (Chrome, Edge) ใช้หน้าต่างติดตั้งของเบราว์เซอร์
     iPhone / iPad แสดงวิธีเพิ่มไปยังหน้าจอโฮม · LINE / Facebook แนะนำให้เปิดในเบราว์เซอร์ก่อน
   - แถบชวนติดตั้งบนมือถือหลังเข้าสู่ระบบ (ปิดแล้วไม่ถามอีก 14 วัน) และแถบ "มีเนื้อหาเวอร์ชันใหม่"
   เปิดหน้าเว็บด้วย ?nosw=1 เพื่อยกเลิก service worker และล้างแคชของเว็บนี้ (ใช้ตอนแก้ปัญหา)
   ใน claude.ai ไฟล์นี้ไม่ถูกโหลด */
(function () {
'use strict';
const DA = window.DA;
const { $, $$, esc, ic, toast, lsGet, lsSet } = DA;
const KEY = 'da-pwa', LATER_DAYS = 14, ICON = 'icons/icon-192.png';
const UA = navigator.userAgent || '';
const IN_APP = /\bLine\/|FBAN|FBAV|Instagram/i.test(UA);
const IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ANDROID = /Android/i.test(UA);
const LINE = /\bLine\//i.test(UA);
const mq = q => !!(window.matchMedia && matchMedia(q).matches);
const standalone = () => mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)') || mq('(display-mode: minimal-ui)') || navigator.standalone === true;
const small = () => mq('(max-width: 900px)') || mq('(pointer: coarse)');
const st = () => Object.assign({ later: 0, installed: 0 }, lsGet(KEY) || {});
const put = p => lsSet(KEY, Object.assign(st(), p));

const SVG = {
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v6.5M9.2 10.8 12 13.6l2.8-2.8M10.5 18.3h3"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16"/>',
  plus: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  dots: '<circle cx="12" cy="5.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'
};
const si = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[n] || ''}</svg>`;
const key = n => `<span class="pwa-key">${si(n)}</span>`;

/* ── service worker ── */
const SW_OK = 'serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname));
if (SW_OK && /[?&]nosw=1\b/.test(location.search)) {
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  if (window.caches) caches.keys().then(ks => ks.filter(k => k.startsWith('da-')).forEach(k => caches.delete(k))).catch(() => {});
} else if (SW_OK) {
  /* เลขเวอร์ชันของหน้านี้ (build_web.py ใส่ไว้) เทียบกับ service worker ตัวใหม่
     หน้าเว็บโหลดจากเน็ตก่อนเสมอ ส่วนใหญ่จึงเป็นเวอร์ชันล่าสุดอยู่แล้ว แถบ "เวอร์ชันใหม่" ขึ้นเฉพาะตอนที่ต่างกันจริง */
  const BUILD = ((document.querySelector('meta[name="da-build"]') || {}).content) || '';
  let reg = null, checkedAt = Date.now();
  const register = () => navigator.serviceWorker.register('sw.js').then(r => { reg = r; }).catch(() => {});
  if (document.readyState === 'complete') register(); else window.addEventListener('load', register);
  /* ครั้งแรกที่ service worker เริ่มคุมหน้า ฟอนต์ของหน้านี้โหลดไปก่อนแล้วจึงยังไม่อยู่ในแคช
     ขอซ้ำอีกรอบ (ได้จากแคชของเบราว์เซอร์ ไม่เปลืองเน็ต) ให้ service worker เก็บไว้ เปิดออฟไลน์ครั้งแรกจะได้ฟอนต์เดิม */
  let hadCtl = !!navigator.serviceWorker.controller;
  const warm = () => {
    try {
      performance.getEntriesByType('resource').map(r => r.name)
        .filter(u => /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u))
        .forEach(u => fetch(u, { mode: 'cors', credentials: 'omit' }).catch(() => {}));
    } catch (e) { /* ไม่รองรับ */ }
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const c = navigator.serviceWorker.controller; if (!c) return;
    c.postMessage('version');
    if (!hadCtl) { hadCtl = true; warm(); }
  });
  navigator.serviceWorker.addEventListener('message', e => {
    const d = e.data || {};
    if (d.type === 'da-sw' && BUILD && d.version && d.version !== BUILD) showUpdate();
  });
  /* แอปที่ติดตั้งแล้วมักเปิดค้างไว้หลายวัน: กลับมาที่แอปหลังผ่านไป 1 ชั่วโมง ให้ตรวจเวอร์ชันใหม่ */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !reg || Date.now() - checkedAt < 36e5) return;
    checkedAt = Date.now(); reg.update().catch(() => {});
  });
}

/* ── ติดตั้งได้แบบไหน ── */
let deferred = null, booted = false, lastFocus = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferred = e;
  if (st().installed) put({ installed: 0 });   /* เบราว์เซอร์บอกว่ายังไม่ได้ติดตั้ง (อาจลบแอปไปแล้ว) */
  refresh();
});
window.addEventListener('appinstalled', () => {
  deferred = null; put({ installed: Date.now() });
  closeBar('pwa-bar'); refresh();
  toast('ติดตั้งแอปแล้ว เปิด DA Academy ได้จากหน้าจอโฮม');
});
/* '' = ไม่ต้องแสดงอะไร · prompt = ใช้หน้าต่างติดตั้งของเบราว์เซอร์ · ios / android = บอกวิธี · inapp = ให้เปิดในเบราว์เซอร์ */
function mode() {
  if (standalone()) return '';
  if (IN_APP) return 'inapp';
  if (deferred) return 'prompt';
  if (st().installed) return '';
  if (IOS) return 'ios';
  if (ANDROID) return 'android';
  return '';
}

/* ── ปุ่มในหน้าเข้าสู่ระบบและในเมนูบัญชี ── */
function slotHTML(m) {
  if (!m) return '';
  return `<button type="button" class="pwa-pill" data-pwa="open">${si(m === 'inapp' ? 'globe' : 'phone')}${m === 'inapp' ? 'เปิดในเบราว์เซอร์เพื่อติดตั้งเป็นแอป' : 'ติดตั้งเป็นแอปบนเครื่องนี้'}</button>`;
}
function gateHTML() { return `<div class="pwa-gate" data-pwa-slot>${slotHTML(mode())}</div>`; }
function menuHTML() {
  const m = mode(); if (!m) return '';
  return `<button role="menuitem" data-act="pwa">${si(m === 'inapp' ? 'globe' : 'phone')}<span>${m === 'inapp' ? 'เปิดในเบราว์เซอร์' : 'ติดตั้งเป็นแอป'}</span></button>`;
}
function refresh() {
  const m = mode();
  $$('[data-pwa-slot]').forEach(el => { el.innerHTML = slotHTML(m); });
  if (!m) closeBar('pwa-bar');
}

/* ── ติดตั้ง ── */
async function open() {
  const m = mode();
  closeBar('pwa-bar');
  if (m === 'prompt') {
    const e = deferred; deferred = null;   /* ใช้ได้ครั้งเดียว */
    try {
      await e.prompt();
      const r = await e.userChoice;
      if (r && r.outcome === 'dismissed') put({ later: Date.now() });
    } catch (err) { /* เบราว์เซอร์ไม่ยอมเปิดหน้าต่าง */ }
    refresh();
    return;
  }
  if (m) sheet(m);
}

const STEPS = {
  ios: {
    title: 'ติดตั้งบน iPhone / iPad',
    sub: 'เพิ่ม DA Academy ไว้บนหน้าจอโฮม เปิดได้เหมือนแอป',
    steps: [
      `แตะปุ่มแชร์ ${key('share')}<small>Safari: แถบด้านล่าง (ถ้าไม่เห็น แตะ ${key('more')} ก่อน) · Chrome: มุมขวาบน</small>`,
      `เลื่อนลงแล้วเลือก <b>"เพิ่มไปยังหน้าจอโฮม"</b> ${key('plus')}`,
      'แตะ <b>"เพิ่ม"</b> มุมขวาบน แล้วเปิด DA Academy จากหน้าจอโฮม'
    ],
    note: 'แอปบนหน้าจอโฮมของ iPhone แยกการเข้าสู่ระบบจาก Safari ครั้งแรกที่เปิดต้องเข้าสู่ระบบอีกครั้ง'
  },
  android: {
    title: 'ติดตั้งบนมือถือ Android',
    sub: 'เพิ่ม DA Academy ไว้บนหน้าจอหลัก เปิดได้เหมือนแอป',
    steps: [
      `แตะเมนู ${key('dots')} มุมขวาบนของ Chrome`,
      'เลือก <b>"ติดตั้งแอป"</b> หรือ <b>"เพิ่มไปยังหน้าจอหลัก"</b>',
      'แตะ <b>"ติดตั้ง"</b> แล้วเปิด DA Academy จากหน้าจอหลัก'
    ],
    note: 'ถ้าเมนูไม่มีคำว่าติดตั้ง แสดงว่าติดตั้งไว้แล้ว ลองหาไอคอนน้องเดนต้าบนหน้าจอหลัก'
  },
  inapp: {
    title: 'เปิดในเบราว์เซอร์ก่อน',
    sub: 'LINE / Facebook / Instagram ติดตั้งเว็บเป็นแอปไม่ได้ และปุ่ม Google ใช้ไม่ได้',
    steps: [
      `แตะเมนู ${key('dots')} หรือ ${key('more')} ของแอปที่เปิดอยู่ (มุมขวาบนหรือขวาล่าง)`,
      'เลือก <b>"เปิดในเบราว์เซอร์"</b> (Chrome หรือ Safari)<small>หรือกด "คัดลอกลิงก์" ด้านล่าง แล้ววางในเบราว์เซอร์</small>',
      'ในเบราว์เซอร์ กดปุ่ม <b>"ติดตั้งเป็นแอป"</b> อีกครั้ง'
    ],
    note: '',
    copy: true
  },
  /* LINE เปิดลิงก์ที่มี ?openExternalBrowser=1 ในเบราว์เซอร์ของเครื่องให้เอง (LINE บน iOS / Android) */
  line: {
    title: 'เปิดในเบราว์เซอร์ก่อน',
    sub: 'ในแอป LINE ติดตั้งเว็บเป็นแอปไม่ได้ และปุ่ม Google ใช้ไม่ได้',
    steps: [
      'แตะ <b>"เปิดในเบราว์เซอร์"</b> ด้านล่าง LINE จะเปิดหน้านี้ใน Chrome หรือ Safari',
      `ถ้ายังเปิดอยู่ใน LINE แตะเมนู ${key('dots')} หรือ ${key('more')} แล้วเลือกเปิดในเบราว์เซอร์<small>หรือกด "คัดลอกลิงก์" แล้ววางในเบราว์เซอร์</small>`,
      'ในเบราว์เซอร์ กดปุ่ม <b>"ติดตั้งเป็นแอป"</b> อีกครั้ง'
    ],
    note: '',
    copy: true,
    ext: true
  }
};
function sheetHTML(m) {
  const s = STEPS[m === 'inapp' && LINE ? 'line' : m];
  return `<div class="pwa-in">
    <div class="pwa-head"><img src="${ICON}" alt="" width="52" height="52"><div><h2 id="pwa-st">${s.title}</h2><p>${s.sub}</p></div></div>
    <ol class="pwa-steps">${s.steps.map(x => `<li><span>${x}</span></li>`).join('')}</ol>
    ${s.note ? `<p class="pwa-note">${ic('info')}<span>${s.note}</span></p>` : ''}
    <div class="pwa-acts">
      ${s.ext ? `<button type="button" class="btn btn-brand btn-sm pwa-ext" data-pwa="ext">${si('globe')}เปิดในเบราว์เซอร์</button>` : ''}
      ${s.copy ? `<button type="button" class="btn btn-ghost btn-sm" data-pwa="copy">${ic('copy')}คัดลอกลิงก์</button>` : ''}
      <button type="button" class="btn ${s.ext ? 'btn-ghost' : 'btn-brand'} btn-sm" data-pwa="close">${s.ext ? 'ปิด' : 'เข้าใจแล้ว'}</button>
    </div></div>`;
}
function sheet(m) {
  let d = $('#pwa-sheet');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'pwa-sheet'; d.className = 'pwa-sheet'; d.setAttribute('aria-labelledby', 'pwa-st');
    d.addEventListener('click', e => { if (e.target === d) closeSheet(); });   /* แตะพื้นหลัง */
    d.addEventListener('close', () => { if (lastFocus && lastFocus.isConnected) lastFocus.focus(); });
    document.body.appendChild(d);
  }
  d.innerHTML = sheetHTML(m);
  lastFocus = document.activeElement;
  if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
  const b = d.querySelector('[data-pwa="ext"], [data-pwa="close"]'); if (b) b.focus();
}
function closeSheet() {
  const d = $('#pwa-sheet'); if (!d) return;
  if (typeof d.close === 'function' && d.open) d.close(); else d.removeAttribute('open');
}
async function copyLink() {
  const url = location.origin + '/';
  let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
    ($('#pwa-sheet') || document.body).appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove();
  }
  toast(ok ? 'คัดลอกลิงก์แล้ว เปิด Chrome หรือ Safari แล้ววางในช่องที่อยู่' : 'คัดลอกไม่ได้ พิมพ์ ' + url + ' ในเบราว์เซอร์แทน');
}

/* ── แถบล่างจอ (ชวนติดตั้ง / มีเวอร์ชันใหม่) ── */
function placeBar(el) {
  const tb = $('.tabbar'), h = tb && getComputedStyle(tb).display !== 'none' ? tb.getBoundingClientRect().height : 0;
  el.style.bottom = h ? `${Math.round(h + 10)}px` : '';
}
function bar(id, html) {
  closeBar(id);
  const el = document.createElement('div');
  el.id = id; el.className = 'pwa-bar'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', id === 'pwa-upd' ? 'อัปเดตเนื้อหา' : 'ติดตั้งแอป');
  el.innerHTML = html;
  document.body.appendChild(el); placeBar(el);
  return el;
}
function closeBar(id) { const el = document.getElementById(id); if (el) el.remove(); }
window.addEventListener('resize', () => $$('.pwa-bar').forEach(placeBar));
function invite() {
  const m = mode(), s = st();
  if (!m || !small() || Date.now() - s.later < LATER_DAYS * 864e5 || $('#pwa-sheet[open]') || $('#pwa-upd')) return;
  const inapp = m === 'inapp';
  bar('pwa-bar', `<img src="${ICON}" alt="" width="44" height="44">
    <div class="pwa-bar-t"><b>${inapp ? 'เปิดในเบราว์เซอร์จะใช้ได้ครบ' : 'ติดตั้ง DA Academy ไว้บนหน้าจอ'}</b><span>${inapp ? 'ติดตั้งเป็นแอปและเข้าด้วย Google ได้' : 'เปิดเรียนได้ในแตะเดียว ใช้ได้แม้สัญญาณอ่อน'}</span></div>
    <button type="button" class="btn btn-brand btn-sm" data-pwa="open">${inapp ? 'วิธีเปิด' : 'ติดตั้ง'}</button>
    <button type="button" class="pwa-x" data-pwa="later" aria-label="ไว้ทีหลัง">${ic('x')}</button>`);
}
function showUpdate() {
  closeBar('pwa-bar');
  bar('pwa-upd', `<span class="pwa-ico">${ic('refresh')}</span>
    <div class="pwa-bar-t"><b>มีเนื้อหาเวอร์ชันใหม่</b><span>โหลดหน้าใหม่เพื่อใช้เวอร์ชันล่าสุด</span></div>
    <button type="button" class="btn btn-brand btn-sm" data-pwa="reload">โหลดใหม่</button>
    <button type="button" class="pwa-x" data-pwa="upd-x" aria-label="ไว้ทีหลัง">${ic('x')}</button>`);
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-pwa]'); if (!el) return;
  const a = el.dataset.pwa;
  if (a === 'open') open();
  else if (a === 'close') closeSheet();
  else if (a === 'copy') copyLink();
  else if (a === 'ext') location.href = location.origin + '/?openExternalBrowser=1';
  else if (a === 'later') { put({ later: Date.now() }); closeBar('pwa-bar'); }
  else if (a === 'reload') location.reload();
  else if (a === 'upd-x') closeBar('pwa-upd');
});
DA.acts.pwa = () => open();

/* ── ออนไลน์ / ออฟไลน์ หลังเข้าแอปแล้ว ── */
let wasOff = false;
window.addEventListener('offline', () => { if (!booted) return; wasOff = true; toast('ออฟไลน์อยู่ เรียนต่อได้ คะแนนจะส่งเมื่อกลับมาออนไลน์'); });
window.addEventListener('online', () => { if (!booted || !wasOff) return; wasOff = false; toast('กลับมาออนไลน์แล้ว'); });

/* auth.js เรียกหลังเปิดแอปหลัก */
function onBoot() {
  booted = true;
  setTimeout(invite, 2500);
}

DA.pwa = { gateHTML, menuHTML, onBoot, open, mode };
})();
