/* DA Training Academy — ทบทวนรายวัน
   ถามวันละ 5 ข้อจากคลังข้อสอบหลังเรียนและคำถามท้ายบทเรียน ระบบเลือกข้อที่ใกล้ลืมมาถามก่อน
   แบบกล่อง Leitner: ตอบถูกเลื่อนกล่องและเว้นระยะ 1 → 2 → 4 → 7 → 14 วัน ตอบผิดกลับกล่อง 1 และถามซ้ำพรุ่งนี้
   นับวันทบทวนต่อเนื่อง (streak) เมื่อทำชุดหลักของวันครบ 5 ข้อ

   ข้อมูลเก็บใน S.prog.review (ไปกับเอกสาร progress/{userId} เดิม):
     q:      { <id>: { b: กล่อง 1–5, due: วันที่ถึงรอบ (เลขวัน), n: จำนวนครั้งที่ตอบ, w: จำนวนครั้งที่ผิด, at: ms } }
     streak: { n: วันต่อเนื่อง, best: สูงสุด, last: เลขวันล่าสุดที่ทำครบ }
     today:  { d: เลขวัน, ids: [5 id], res: [0|1 ต่อข้อที่ตอบแล้ว], round: 0 = ชุดหลัก / 1+ = รอบพิเศษ, done: ชุดหลักครบแล้ว }
     hist:   [ { d, r: ถูก, n: ตอบ, ok: ทำชุดหลักครบ } ] ย้อนหลัง 30 วัน
   id ของข้อ = <module id>_<hash ของข้อความคำถาม> จึงคงเดิมแม้สลับลำดับข้อใน course.js */
(function () {
'use strict';
const DA = window.DA, C = window.COURSE;
if (!DA || !C) return;
const { $, $$, esc, shuffle, KEYS, ic, S } = DA;
const PER = 5;                    // ข้อต่อชุด
const IV = [0, 1, 2, 4, 7, 14];   // ระยะเว้น (วัน) ของกล่อง 1–5
const STRONG = 3;                 // กล่อง 3 ขึ้นไป = จำแม่น (เว้นได้ตั้งแต่ 4 วัน)
const HIST = 30;
const TH_DAY = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const int = v => (typeof v === 'number' && isFinite(v) ? Math.round(v) : 0);
const numv = v => (typeof v === 'number' && isFinite(v) ? v : 0);
function h32(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
/* เลขวันตามปฏิทินเครื่องผู้เรียน (เปลี่ยนตอนเที่ยงคืนเวลาท้องถิ่น) */
const dayNo = t => { const d = new Date(t || Date.now()); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
const wday = d => new Date(d * 864e5).getUTCDay();

/* ── คลังคำถาม ── */
const POOL = [], BY_ID = {}, BY_TEXT = {};
const key = (mid, q, img) => mid + '|' + q + '|' + (img || '');   // ข้อความเดียวกันแต่คนละภาพ (เช่น "เครื่องมือในภาพคืออะไร") นับเป็นคนละข้อ
for (const m of DA.DRAFT) {
  const add = (q, src, lesson) => {
    if (!q || typeof q.q !== 'string' || !Array.isArray(q.c) || q.c.length < 2) return;
    if (!Number.isInteger(q.a) || q.a < 0 || q.a >= q.c.length) return;
    const tk = key(m.id, q.q, q.img);
    if (BY_TEXT[tk]) return;
    const base = q.q + (q.img ? '|' + q.img : '');
    let id = m.id + '_' + h32(base), i = 1;
    while (BY_ID[id]) id = m.id + '_' + h32(base + '#' + i++);
    const it = { id, m, src, lesson: lesson || null, q: q.q, c: q.c, a: q.a, why: q.why || '', img: q.img || '' };
    POOL.push(it); BY_ID[id] = it; BY_TEXT[tk] = it;
  };
  (m.test || []).forEach(q => add(q, 'test'));
  (m.lessons || []).forEach(l => (l.blocks || []).forEach(b => { if (b && b.t === 'check') add(b, 'lesson', l); }));
}

/* ── ข้อมูล ── */
const blank = () => ({ q: {}, streak: { n: 0, best: 0, last: 0 }, today: { d: 0, ids: [], res: [], round: 0, done: false }, hist: [] });
const EMPTY = blank();
const RV = () => (S.prog && S.prog.review) || EMPTY;           // อ่านอย่างเดียว ห้ามแก้ค่าที่ได้
const W = () => S.prog.review || (S.prog.review = blank());    // ใช้เมื่อจะบันทึก

function clean(x) {
  if (!x || typeof x !== 'object') return null;
  const o = blank();
  const q = x.q && typeof x.q === 'object' ? x.q : {};
  for (const id of Object.keys(q)) {
    const e = q[id];
    if (!BY_ID[id] || !e || typeof e !== 'object') continue;
    o.q[id] = { b: Math.max(0, Math.min(5, int(e.b))), due: int(e.due), n: Math.max(0, int(e.n)), w: Math.max(0, int(e.w)), at: numv(e.at) };
  }
  const st = x.streak && typeof x.streak === 'object' ? x.streak : {};
  o.streak = { n: Math.max(0, int(st.n)), best: 0, last: int(st.last) };
  o.streak.best = Math.max(o.streak.n, int(st.best));
  const td = x.today && typeof x.today === 'object' ? x.today : {};
  let ids = Array.isArray(td.ids) ? td.ids.filter(i => typeof i === 'string') : [];
  let res = Array.isArray(td.res) ? td.res.map(v => (v ? 1 : 0)) : [];
  if (ids.length > PER || ids.some(i => !BY_ID[i]) || new Set(ids).size !== ids.length) { ids = []; res = []; }
  o.today = { d: int(td.d), ids, res: res.slice(0, ids.length), round: Math.max(0, int(td.round)), done: !!td.done };
  const by = {};
  for (const e of Array.isArray(x.hist) ? x.hist : []) {
    if (!e || typeof e !== 'object' || !int(e.d)) continue;
    const r = { d: int(e.d), r: Math.max(0, int(e.r)), n: Math.max(0, int(e.n)), ok: !!e.ok };
    const p = by[r.d];
    by[r.d] = !p ? r : { d: r.d, r: Math.max(p.r, r.r), n: Math.max(p.n, r.n), ok: p.ok || r.ok };
  }
  o.hist = Object.values(by).sort((a, b) => a.d - b.d).slice(-HIST);
  return o;
}
/* รวมข้อมูลจากสองเครื่อง (ในเครื่อง a + ฐานข้อมูล b) ค่าเสมอกันให้ฝั่ง a เพื่อไม่ให้ชุดคำถามเปลี่ยนกลางคัน */
function merge(a, b) {
  if (!a && !b) return null;
  if (!a || !b) return JSON.parse(JSON.stringify(a || b));
  const o = blank();
  for (const id of new Set([...Object.keys(a.q), ...Object.keys(b.q)])) {
    const u = a.q[id], v = b.q[id];
    o.q[id] = Object.assign({}, !u ? v : !v ? u : (u.at >= v.at ? u : v));
  }
  const sa = a.streak, sb = b.streak;
  const s = sa.last !== sb.last ? (sa.last > sb.last ? sa : sb) : (sa.n >= sb.n ? sa : sb), l = s === sa ? sb : sa;
  // ช่วงต่อเนื่องของอีกเครื่องติดหรือซ้อนกับช่วงล่าสุด (เช่น เครื่อง A ทวนถึงเมื่อวาน เครื่อง B เริ่มวันนี้ก่อนซิงก์) ให้นับรวมเป็นช่วงเดียว
  let n = s.n;
  if (s.n && l.n && l.last >= s.last - s.n) n = s.last - Math.min(s.last - s.n + 1, l.last - l.n + 1) + 1;
  o.streak = { n, last: s.last, best: Math.max(sa.best, sb.best, n) };
  const ta = a.today, tb = b.today;
  const t = ta.d !== tb.d ? (ta.d > tb.d ? ta : tb) : ta.round !== tb.round ? (ta.round > tb.round ? ta : tb) : (ta.res.length >= tb.res.length ? ta : tb);
  o.today = { d: t.d, ids: t.ids.slice(), res: t.res.slice(), round: t.round, done: t.done || (ta.d === tb.d && (ta.done || tb.done)) };
  const by = {};
  for (const e of [...a.hist, ...b.hist]) {
    const p = by[e.d];
    by[e.d] = !p ? Object.assign({}, e) : { d: e.d, r: Math.max(p.r, e.r), n: Math.max(p.n, e.n), ok: p.ok || e.ok };
  }
  o.hist = Object.values(by).sort((x, y) => x.d - y.d).slice(-HIST);
  return o;
}

/* ── ตารางทบทวน ── */
function grade(id, ok, t) {
  const r = W(), e = r.q[id];
  let o;
  if (!e) o = ok ? { b: 2, due: t + IV[2], n: 1, w: 0 } : { b: 1, due: t + 1, n: 1, w: 1 };
  else if (!ok) o = { b: 1, due: t + 1, n: e.n + 1, w: e.w + 1 };
  else if (e.due > t) o = { b: e.b, due: e.due, n: e.n + 1, w: e.w };            // ทวนก่อนถึงรอบ: ไม่เลื่อนกล่อง
  else { const b = Math.min(5, Math.max(1, e.b) + 1); o = { b, due: t + IV[b], n: e.n + 1, w: e.w }; }
  o.at = Date.now();
  r.q[id] = o;
  return o;
}
const started = m => { const md = S.prog.modules[m.id]; return !!(md && (md.pre || Object.keys(md.lessons || {}).length || md.post)); };
function build(t, exclude) {
  const q = RV().q, ex = new Set(exclude || []), out = [], has = new Set();
  const push = it => { if (out.length < PER && !has.has(it.id) && !ex.has(it.id)) { out.push(it.id); has.add(it.id); } };
  // 1) ถึงรอบทวน: กล่องต่ำ (จำไม่แม่น) ก่อน
  POOL.filter(it => q[it.id] && q[it.id].due <= t).sort((x, y) => q[x.id].b - q[y.id].b || q[x.id].due - q[y.id].due).forEach(push);
  // 2) ข้อใหม่จากบทที่เริ่มเรียนแล้ว เวียนทีละบท (ยังไม่เริ่มบทไหน หรือโหมดนำเสนอ = ทุกบท)
  if (out.length < PER) {
    let mods = DA.DRAFT.filter(started);
    if (!mods.length || S.present) mods = DA.DRAFT.slice();
    const lists = shuffle(mods).map(m => shuffle(POOL.filter(it => it.m === m && !q[it.id])));
    for (let i = 0; out.length < PER; i++) { let any = false; for (const l of lists) if (l[i]) { any = true; push(l[i]); } if (!any) break; }
  }
  // 3) ทวนล่วงหน้า: ข้อที่เคยตอบและใกล้ถึงรอบที่สุด
  if (out.length < PER) POOL.filter(it => q[it.id]).sort((x, y) => q[x.id].due - q[y.id].due || q[x.id].b - q[y.id].b).forEach(push);
  if (out.length < PER) shuffle(POOL).forEach(push);
  return shuffle(out);
}
/* ชุดของวันนี้: ที่บันทึกแล้ว หรือชุดร่างที่ยังไม่เริ่ม (ไม่บันทึกจนกว่าจะกดเริ่ม จึงไม่มีการเขียนข้อมูลแค่เพราะเปิดดู) */
let draft = null;
function cur(t) {
  const td = RV().today;
  if (td.d === t && td.ids.length) return td;
  if (!draft || draft.d !== t) draft = { d: t, ids: build(t), res: [], round: td.d === t ? td.round : 0, done: td.d === t && td.done };
  return draft;
}
function commit(c) {
  const r = W();
  if (r.today !== c) r.today = { d: c.d, ids: c.ids.slice(), res: c.res.slice(), round: c.round, done: c.done };
  draft = null;
  return r.today;
}
function stats(t) {
  const q = RV().q; let due = 0, strong = 0, seen = 0, tom = 0;
  for (const it of POOL) { const e = q[it.id]; if (!e) continue; seen++; if (e.due <= t) due++; if (e.due <= t + 1) tom++; if (e.b >= STRONG) strong++; }
  return { due, strong, seen, tom, total: POOL.length };
}
const streakNow = t => { const s = RV().streak; return s.last === t || s.last === t - 1 ? s.n : 0; };
function histFor(t) {
  const h = W().hist; let e = h.find(x => x.d === t);
  if (!e) { e = { d: t, r: 0, n: 0, ok: false }; h.push(e); h.sort((a, b) => a.d - b.d); while (h.length > HIST) h.shift(); }
  return e;
}
function finishMain(t) {
  const r = W(), s = r.streak;
  r.today.done = true;
  if (s.last !== t) { s.n = s.last === t - 1 ? s.n + 1 : 1; s.last = t; }
  s.best = Math.max(s.best, s.n);
  histFor(t).ok = true;
}
/* ส่งผลแบบทดสอบหลังเรียนเข้าตาราง: ข้อที่ผิดถึงรอบทวนทันที ข้อที่ถูกเว้นระยะตามปกติ */
function seed(m, log) {
  if (!m || !Array.isArray(log) || !log.length) return;
  const t = dayNo(), r = W();
  for (const x of log) {
    const it = x && BY_TEXT[key(m.id, x.q, x.img)];
    if (!it) continue;
    if (x.pick === x.a) grade(it.id, true, t);
    else { const e = r.q[it.id]; r.q[it.id] = { b: 1, due: t, n: (e ? e.n : 0) + 1, w: (e ? e.w : 0) + 1, at: Date.now() }; }
  }
  const td = r.today;
  if (td.d === t && !td.res.length && !td.done) td.ids = [];   // ยังไม่เริ่มชุดวันนี้: จัดใหม่ให้มีข้อที่เพิ่งผิด
  draft = null;
}
const TAG = { new: ['chip-sun', 'ข้อใหม่'], wrong: ['chip-bad', 'เคยตอบผิด'], due: ['chip-brand', 'ถึงรอบทวน'], early: ['', 'ทวนล่วงหน้า'] };
function tagOf(id, t) { const e = RV().q[id]; if (!e) return 'new'; if (e.w > 0 && e.b <= 1) return 'wrong'; if (e.due <= t) return 'due'; return 'early'; }

/* ── หน้าจอ ── */
const FLAME = `<svg class="flame" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3c1 4.5 7.5 7.5 7.5 15.2A7.5 7.5 0 0 1 8.5 18.6c0-3.4 1.8-5.8 3.6-7.3.2 2.4 1.2 3.9 2.6 4.6C14.4 11.3 13.6 7.3 16 3z" fill="var(--accent)" stroke="var(--line)" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 15.5c.6 2.2 3.6 3.4 3.6 6.4a3.6 3.6 0 0 1-7.2 0c0-1.8 1-2.8 1.9-3.4.3 1 .8 1.5 1.5 1.7-.4-1.8-.6-3.2.2-4.7z" fill="var(--sun)"/></svg>`;
let running = false, ord = [], ordKey = '', host = null;

function render(main, keep) {
  host = main || host || $('#main');
  if (!keep) running = false;
  const t = dayNo();
  host.innerHTML = `<section class="section-tight"><div class="wrap">${heroHTML(t)}
    <div class="dgrid"><div class="card dcard" id="dcard"></div><aside class="dside">${sideHTML(t)}</aside></div></div></section>`;
  paint();
  navDot();
}
function paint() {
  const box = $('#dcard'); if (!box) return;
  const t = dayNo(), c = cur(t);
  box.innerHTML = c.res.length >= c.ids.length ? doneHTML(t, c) : running ? qHTML(t, c) : introHTML(t, c);
}
function toCard() {
  const box = $('#dcard'); if (!box) return;
  const y = box.getBoundingClientRect().top + window.scrollY - 96;
  if (window.scrollY > y) window.scrollTo({ top: y, behavior: 'smooth' });
}
function heroHTML(t) {
  const r = RV(), c = cur(t), sn = streakNow(t), left = c.ids.length - c.res.length;
  const say = c.done ? (sn > 1 ? `ต่อเนื่อง ${sn} วันแล้ว สุดยอด!` : 'วันนี้ทวนครบแล้ว เก่งมาก!')
    : c.res.length ? `อีก ${left} ข้อก็ครบแล้ว สู้ ๆ!`
      : sn ? `มารักษาสถิติ ${sn} วันกันนะ!` : 'วันละนิด จำได้นาน!';
  let week = '';
  for (let d = t - 6; d <= t; d++) {
    const h = r.hist.find(x => x.d === d), on = !!(h && h.ok);
    week += `<span class="d${on ? ' on' : ''}${d === t ? ' today' : ''}"><i>${on ? '✓' : ''}</i>${TH_DAY[wday(d)]}</span>`;
  }
  return `<div class="rhero dhero fade-in">
    ${DA.cloud('drift slow', 'right:30%;top:-26px;width:150px')}
    <div class="rhero-art bob">${DA.MASCOT}</div>
    <div class="rhero-body"><div class="eyebrow">${ic('refresh')}ทบทวนรายวัน</div>
      <h2>วันละ ${PER} ข้อกับน้องเดนต้า</h2>
      <div class="who">ระบบเลือกข้อที่ใกล้ลืมมาถามก่อน ข้อที่ตอบถูกจะเว้นห่างขึ้น ข้อที่ผิดจะกลับมาพรุ่งนี้</div>
      <div class="bubble">${esc(say)}</div></div>
    <div class="rhero-acts"><div class="dstreak${sn ? '' : ' off'}">
      <div class="dst-top">${FLAME}<div><b>${sn}</b><span>วัน ทบทวนต่อเนื่อง</span></div></div>
      <div class="week" aria-label="7 วันล่าสุด">${week}</div>
      <small>สถิติสูงสุด ${Math.max(r.streak.best, sn)} วัน</small>
    </div></div>
  </div>`;
}
function introHTML(t, c) {
  const k = c.res.length, n = { new: 0, wrong: 0, due: 0, early: 0 };
  c.ids.slice(k).forEach(id => { n[tagOf(id, t)]++; });
  const facts = [['due', 'ถึงรอบทวน'], ['new', 'ข้อใหม่'], ['wrong', 'เคยตอบผิด']].map(([key, lab]) => `<div><b>${n[key]} ข้อ</b>${lab}</div>`).join('') + (n.early ? `<div><b>${n.early} ข้อ</b>ทวนล่วงหน้า</div>` : '');
  return `<div class="fade-in"><div class="step-kicker"><span class="chip chip-brand">${ic('refresh')}${c.round ? `รอบพิเศษ ${c.round}` : 'ชุดของวันนี้'}</span></div>
    <div class="qintro"><div class="big">${ic('refresh')}</div><div>
      <h2>${c.round ? 'ทบทวนเพิ่มอีกชุด' : 'ชุดทบทวนวันนี้'}</h2>
      <p class="dintro">${k ? `ทำไปแล้ว ${k} จาก ${c.ids.length} ข้อ มาทำต่อให้ครบกัน` : `${c.ids.length} ข้อ เฉลยทันทีพร้อมเหตุผล ใช้เวลาราว 3 นาที`}</p>
      <div class="qfacts">${facts}</div>
      <button class="btn btn-cta btn-pill" data-act="d-start">${k ? `ทำต่อจากข้อ ${k + 1}` : 'เริ่มทบทวน'} ${ic('arrowR')}</button>
    </div></div></div>`;
}
function qHTML(t, c) {
  const k = c.res.length, it = BY_ID[c.ids[k]];
  const key = c.d + ':' + c.round + ':' + k + ':' + it.id;
  if (ordKey !== key) { ord = shuffle(it.c.map((_, i) => i)); ordKey = key; }
  const [cls, lab] = TAG[tagOf(it.id, t)];
  return `<div class="fade-in">
    <div class="qtop"><div class="bar"><i style="width:${Math.round(k / c.ids.length * 100)}%"></i></div><span class="n">ข้อ ${k + 1} / ${c.ids.length}</span></div>
    <div class="dmeta"><span class="chip">${ic('book')}บทที่ ${DA.modNo(it.m)} · ${esc(it.m.title)}</span><span class="chip ${cls}">${lab}</span></div>
    ${it.img ? `<div class="qimg"><img src="${esc(it.img)}" alt=""></div>` : ''}
    <div class="qq">${esc(it.q)}</div>
    <div class="choices">${ord.map((j, i) => `<button class="choice" data-act="d-pick" data-i="${i}"><span class="k">${KEYS[i]}</span><span>${esc(it.c[j])}</span></button>`).join('')}</div>
    <div class="whyslot" aria-live="polite"></div></div>`;
}
function doneHTML(t, c) {
  const n = c.ids.length, right = c.res.reduce((a, b) => a + b, 0), sc = n ? Math.round(right / n * 100) : 0, st = stats(t), sn = streakNow(t), pass = sc >= 60;
  const tom = st.tom ? `พรุ่งนี้มีข้อถึงรอบทวน ${st.tom} ข้อ` : 'พรุ่งนี้มีข้อใหม่รออยู่';
  return `<div class="fade-in"><div class="step-kicker"><span class="chip chip-ok">${ic('check')}${c.round ? `รอบพิเศษ ${c.round}` : 'ชุดของวันนี้'} ครบแล้ว</span></div>
    <h2>${c.round ? 'ทบทวนเพิ่มเสร็จแล้ว!' : 'ทบทวนวันนี้เสร็จแล้ว!'}</h2>
    <div class="result${pass ? ' pass' : ''}"><div>${DA.ring(sc, { size: 100, col: pass ? 'var(--ok)' : 'var(--accent)' })}</div><div>
      <h3>ตอบถูก ${right}/${n} ข้อ</h3>
      <p>ทบทวนต่อเนื่อง ${sn} วัน · ${tom}</p>
      <div class="acts"><button class="btn btn-cta" data-act="d-more">${ic('refresh')}ทบทวนเพิ่มอีก ${PER} ข้อ</button><button class="btn btn-ghost" data-act="go" data-r="home">${ic('home')}กลับหน้าหลัก</button></div>
    </div>${DA.rDenta(right === n ? 'เป๊ะมาก!' : 'เจอกันพรุ่งนี้!')}</div>
    <h4 style="margin-top:26px;font-weight:500">ทบทวนคำตอบ</h4>
    <div class="review">${c.ids.map((id, i) => {
      const it = BY_ID[id], ok = !!c.res[i];
      return `<details${ok ? '' : ' open'}><summary><span class="mk ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✕'}</span><span>${i + 1}. ${esc(it.q)}</span></summary>
        <div class="ans"><b>คำตอบที่ถูก: ${esc(it.c[it.a])}</b><br>${esc(it.why)}</div></details>`;
    }).join('')}</div></div>`;
}
function sideHTML(t) {
  const q = RV().q, st = stats(t);
  const rows = DA.DRAFT.map(m => {
    const its = POOL.filter(it => it.m === m); if (!its.length) return '';
    const s = its.filter(it => q[it.id] && q[it.id].b >= STRONG).length;
    return `<div class="dmem"><div class="dm-h"><span>${DA.modNo(m)}. ${esc(m.title)}</span><b>${s}/${its.length}</b></div><div class="bar${s === its.length ? ' ok' : ''}"><i style="width:${Math.round(s / its.length * 100)}%"></i></div></div>`;
  }).join('');
  return `<div class="card"><h3>${ic('target')}ความจำรายบท</h3>
      <p class="dm-sub">จำแม่น = ตอบถูกต่อเนื่องจนเว้นรอบได้ตั้งแต่ 4 วัน</p>
      <div class="dsum"><div><b>${st.strong}</b><span>จำแม่น</span></div><div><b>${st.seen - st.strong}</b><span>กำลังจำ</span></div><div><b>${st.total - st.seen}</b><span>ยังไม่เคยทวน</span></div></div>
      ${rows}</div>
    <div class="note">${ic('bulb')}<div><b style="font-weight:600">ทำไมต้องทวนทุกวัน?</b><br>ความรู้ที่ไม่ได้ใช้จะลืมเร็ว ระบบจึงเว้นระยะข้อที่ตอบถูกเป็น 1 → 2 → 4 → 7 → 14 วัน ส่วนข้อที่ตอบผิด รวมถึงข้อที่ผิดในแบบทดสอบหลังเรียน จะกลับมาให้ทวนเร็วขึ้น</div></div>`;
}
/* ปุ่มบนการ์ดหน้าหลัก */
function homeCard() {
  const t = dayNo(), c = cur(t), sn = streakNow(t), k = c.res.length, done = c.done;
  const sub = done ? `วันนี้ทวนแล้ว ✓ · ต่อเนื่อง ${sn} วัน`
    : k ? `ทำค้างไว้ ${k}/${c.ids.length} ข้อ`
      : sn ? `ต่อเนื่อง ${sn} วัน · ทวนวันนี้เพื่อรักษาสถิติ` : `วันละ ${PER} ข้อ · ใช้เวลาราว 3 นาที`;
  return `<button class="dnext${done ? ' done' : ''}" data-act="go" data-r="daily"><span class="fl${sn ? '' : ' off'}">${FLAME}<b>${sn}</b></span><span class="dn-t"><small>${sub}</small><b>${done ? 'ทบทวนเพิ่มได้อีก' : 'ทบทวนรายวันกับน้องเดนต้า'}</b></span><span class="arr">${ic(done ? 'check' : 'arrowR')}</span></button>`;
}
/* แถบสรุปบนหน้าผลการเรียน */
function resultsStrip() {
  const t = dayNo(), r = RV(), c = cur(t), st = stats(t), sn = streakNow(t);
  return `<div class="jend dstrip"><div class="medal">${FLAME}</div><div class="txt">
      <h4>ทบทวนต่อเนื่อง ${sn} วัน · จำแม่น ${st.strong}/${st.total} ข้อ</h4>
      <p>${c.done ? 'วันนี้ทวนแล้ว' : 'วันนี้ยังไม่ได้ทวน'} · ถึงรอบทวน ${st.due} ข้อ · สถิติสูงสุด ${Math.max(r.streak.best, sn)} วัน</p></div>
    <button class="btn ${c.done ? 'btn-ghost' : 'btn-cta'}" data-act="go" data-r="daily">${ic('refresh')}${c.done ? 'ทบทวนเพิ่ม' : 'ทวนวันนี้'}</button></div>`;
}
/* จุดแดงบนเมนูเมื่อวันนี้ยังไม่ได้ทวน */
function navDot() {
  const need = !cur(dayNo()).done;
  $$('[data-nav="daily"]').forEach(b => b.classList.toggle('need', need));
}

/* ── ปุ่ม ── */
DA.acts['d-start'] = () => {
  commit(cur(dayNo()));
  running = true; paint(); toCard();
  const b = $('#dcard .choice'); if (b) b.focus({ preventScroll: true });
};
DA.acts['d-pick'] = el => {
  const box = $('#dcard'); if (!box) return;
  const btns = $$('.choice', box); if (!btns.length || btns[0].disabled) return;
  const t = dayNo(), r = W(), td = r.today;
  if (td.d !== t) { render(); return; }            // ข้ามเที่ยงคืนระหว่างทำ: เริ่มชุดของวันใหม่
  const k = td.res.length, it = BY_ID[td.ids[k]];
  if (!it) { render(); return; }
  const i = +el.dataset.i, ok = ord[i] === it.a;
  btns.forEach(b => { b.disabled = true; });
  btns.forEach((b, j) => b.classList.add(ord[j] === it.a ? 'ok' : j === i ? 'no' : 'dim'));
  const g = grade(it.id, ok, t);
  td.res.push(ok ? 1 : 0);
  const h = histFor(t); h.n++; if (ok) h.r++;
  const last = td.res.length >= td.ids.length;
  let first = false;
  if (last && !td.done) { finishMain(t); first = true; }
  const gap = g.due - t;
  const hint = !ok ? 'ข้อนี้จะกลับมาให้ทวนอีกครั้งพรุ่งนี้' : gap > 0 ? `จำได้แล้ว! ข้อนี้จะถามอีกครั้งในอีก ${gap} วัน` : '';
  $('.whyslot', box).innerHTML = `<div class="why ${ok ? 'ok' : 'no'}">${ic(ok ? 'check' : 'info')}<div><b>${ok ? 'ถูกต้อง' : 'ยังไม่ถูก'}</b> ${esc(it.why)}</div></div>
    ${hint ? `<p class="dhint">${ic('clock')}${hint}</p>` : ''}
    <div class="stepnav" style="justify-content:flex-end"><button class="btn btn-brand" id="d-qnext" data-act="d-next"${first ? ' data-first="1"' : ''}>${last ? 'ดูสรุปวันนี้' : 'ข้อต่อไป'} ${ic('arrowR')}</button></div>`;
  const nb = $('#d-qnext'); if (nb) nb.focus({ preventScroll: true });
  if (first) navDot();
  if (DA.save) DA.save();
};
DA.acts['d-next'] = el => {
  const t = dayNo(), c = cur(t), first = !!(el && el.dataset.first === '1');
  if (c.res.length < c.ids.length) { running = true; paint(); toCard(); return; }
  render(); toCard();
  if (first) { if (DA.confetti) DA.confetti(); if (DA.toast) DA.toast(`ทบทวนครบแล้ว · ต่อเนื่อง ${streakNow(t)} วัน`); }
};
DA.acts['d-more'] = () => {
  const t = dayNo(), r = W(), td = r.today, same = td.d === t;
  r.today = { d: t, ids: build(t, same ? td.ids : []), res: [], round: same ? td.round + 1 : 0, done: same && td.done };
  draft = null;
  if (DA.save) DA.save();
  running = true; render(null, true); toCard();
};

DA.daily = { clean, merge, seed, render, homeCard, resultsStrip, navDot, POOL, dayNo, stats };
})();
