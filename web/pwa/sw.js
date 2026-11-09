/* DA Training Academy · service worker ของเวอร์ชันเว็บ (ติดตั้งเป็นแอป + เปิดได้ตอนสัญญาณอ่อน)
   ไฟล์นี้เป็นแม่แบบ scripts/build_web.py เติม __VERSION__ / __PRECACHE__ / __CDN__ แล้วเขียนเป็น public/sw.js
   - หน้าเว็บ: ขอจากเน็ตก่อน ถ้าไม่มีเน็ตหรือช้าเกิน 4 วินาที ใช้หน้าที่เก็บไว้
   - สคริปต์ / CSS / รูปของเว็บนี้: ใช้ชุดที่เก็บไว้ตอนติดตั้ง (ชื่อไฟล์มี ?v=hash จึงไม่ค้างของเก่า)
   - Firebase SDK และฟอนต์: เก็บไว้ใช้ซ้ำ
   - ไม่ยุ่งกับ Firestore / การเข้าสู่ระบบ / YouTube / /__/ (ข้อมูลผู้เรียนไม่ถูกเก็บในแคชนี้)
   ทุกครั้งที่ deploy เนื้อหาเปลี่ยน VERSION เปลี่ยน เบราว์เซอร์จึงโหลดชุดใหม่และลบชุดเก่าเอง */
'use strict';
const VERSION = '__VERSION__';
const SHELL = 'da-shell-' + VERSION;
const CDN_CACHE = 'da-cdn-v1';
const FONT_CACHE = 'da-fonts-v1';
const PRECACHE = __PRECACHE__;
const CDN = __CDN__;
const NAV_TIMEOUT = 4000;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })));
    /* Firebase SDK: เก็บแบบ best-effort ถ้าโหลดไม่ได้ตอนนี้ ค่อยเก็บตอนใช้ครั้งถัดไป */
    const cdn = await caches.open(CDN_CACHE);
    await Promise.all(CDN.map(async u => {
      try {
        if (await cdn.match(u)) return;
        const r = await fetch(u, { mode: 'cors', credentials: 'omit' });
        if (r.ok) await cdn.put(u, r);
      } catch (err) { /* ออฟไลน์ */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('da-shell-') && k !== SHELL).map(k => caches.delete(k)));
    /* SDK เวอร์ชันเก่าที่ไม่ใช้แล้ว */
    const cdn = await caches.open(CDN_CACHE);
    const keep = new Set(CDN);
    await Promise.all((await cdn.keys()).filter(r => !keep.has(r.url)).map(r => cdn.delete(r)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'version' && e.source) e.source.postMessage({ type: 'da-sw', version: VERSION });
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/__/')) return;          /* ตัวจัดการของ Firebase (เข้าสู่ระบบ ฯลฯ) */
    if (url.pathname.endsWith('/sw.js')) return;
    if (req.mode === 'navigate') return e.respondWith(page(req));
    return e.respondWith(cacheFirst(req, SHELL, false));
  }
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) return e.respondWith(cacheFirst(req, CDN_CACHE, true));
  if (url.hostname === 'fonts.gstatic.com') return e.respondWith(cacheFirst(req, FONT_CACHE, true));
  if (url.hostname === 'fonts.googleapis.com') return e.respondWith(staleWhileRevalidate(e, req, FONT_CACHE));
  /* อย่างอื่น (Firestore, การเข้าสู่ระบบ, YouTube ฯลฯ) ปล่อยให้เบราว์เซอร์จัดการเอง ไม่เก็บแคช */
});

function timeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, err => { clearTimeout(t); reject(err); });
  });
}

/* หน้าเว็บ: เน็ตก่อน → หน้าที่เก็บไว้ (ชุดเดียวกับสคริปต์ในแคช จึงไม่ปนเวอร์ชัน) */
async function page(req) {
  try {
    return await timeout(fetch(req), NAV_TIMEOUT);
  } catch (err) {
    const c = await caches.open(SHELL);
    const hit = (await c.match('./')) || (await c.match(req, { ignoreSearch: true }));
    return hit || offline();
  }
}

async function cacheFirst(req, name, cors) {
  const c = await caches.open(name);
  const key = cors ? req.url : req;
  const hit = await c.match(key);
  if (hit) return hit;
  try {
    const r = await fetch(cors ? new Request(req.url, { mode: 'cors', credentials: 'omit' }) : req);
    if (r.ok && (r.type === 'basic' || r.type === 'cors')) c.put(key, r.clone()).catch(() => {});
    return r;
  } catch (err) {
    if (!cors) { const any = await caches.match(req, { ignoreSearch: true }); if (any) return any; }
    return Response.error();
  }
}

async function staleWhileRevalidate(e, req, name) {
  const c = await caches.open(name);
  const hit = await c.match(req.url);
  const net = fetch(req.url, { mode: 'cors', credentials: 'omit' })
    .then(r => { if (r.ok) c.put(req.url, r.clone()).catch(() => {}); return r; })
    .catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  return (await net) || Response.error();
}

function offline() {
  const html = '<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>DA Academy · ออฟไลน์</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#e4f0ff;color:#2B2440;'
    + 'font:16px/1.6 "Noto Sans Thai Looped",system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box}'
    + 'div{max-width:380px;background:#fff;border:2.4px solid #2B2440;border-radius:24px;padding:28px 24px;box-shadow:0 5px 0 #2B2440}'
    + 'h1{font-size:20px;margin:0 0 8px;color:#002D73}button{margin-top:14px;font:inherit;font-weight:800;padding:10px 22px;border-radius:14px;'
    + 'border:2.4px solid #2B2440;background:#002D73;color:#fff;box-shadow:0 3px 0 #2B2440;cursor:pointer}</style></head><body><div>'
    + '<h1>ยังไม่ได้เชื่อมต่ออินเทอร์เน็ต</h1><p>เปิดระบบฝึกอบรมครั้งแรกต้องมีอินเทอร์เน็ตก่อน ครั้งต่อไปจะเปิดได้แม้สัญญาณอ่อน</p>'
    + '<button onclick="location.reload()">ลองใหม่</button></div></body></html>';
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
