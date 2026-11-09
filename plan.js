/* DA Training Academy — แผนการเรียน (กำหนดเรียนจบรายบท)
   นับจากวันเริ่มงานในข้อมูลผู้เรียน (profile.startDate) แต่ละบทต้อง "เรียนจบ" คือสอบหลังเรียนผ่าน 80% ภายใน N วัน
   ผู้เรียนเห็นกำหนดของตัวเองบนหน้าหลัก การ์ดบทเรียน และหน้าแผนการเรียน (route {name:'plan'})
   HR เห็นใครเลยกำหนดหรือใกล้ครบกำหนดในแท็บ "แผนการเรียน" ของหน้า HR และปรับจำนวนวันรายบทได้

   ค่าที่ HR ตั้งเก็บใน media/plan = { v: 1, days: { <module id>: 1–365 }, updatedAt: ms }
   (กฎเดิมของ media ใช้ได้เลย: ทุกคนอ่านได้ · HR/Editor เขียนได้) ถ้าไม่มีเอกสารนี้ใช้ค่าเริ่มต้น DEF
   สถานะรายบท: ok ผ่านตามกำหนด · late ผ่านช้ากว่ากำหนด · over เลยกำหนด · soon ใกล้ครบกำหนด (≤ 3 วัน) · todo ยังไม่ถึงกำหนด
   วันนับตามปฏิทินเครื่องผู้ใช้ เหมือนทบทวนรายวัน */
(function () {
'use strict';
const DA = window.DA;
if (!DA || !DA.DRAFT) return;
const { $, $$, esc, ic, S, DRAFT, modNo, gm, modStatus, postPassed, fmtDate } = DA;
const DEF = { m01: 3, m02: 7, m03: 10, m04: 14, m05: 30, m06: 45, m07: 60, m08: 75, m09: 80, m10: 90 };
const SOON = 3, MAXD = 365;

/* ค่าเริ่มต้นของทุกบทที่มีเนื้อหา (บทใหม่ที่ไม่มีใน DEF = บทก่อนหน้า + 14 วัน) */
const DEFS = {};
DRAFT.reduce((prev, m) => (DEFS[m.id] = DEF[m.id] || prev + 14), 0);
const okDays = v => (Number.isInteger(v) && v >= 1 && v <= MAXD ? v : 0);
function clean(x) {
  const days = {};
  const src = x && typeof x === 'object' && x.days && typeof x.days === 'object' ? x.days : {};
  DRAFT.forEach(m => { const v = okDays(src[m.id]); if (v) days[m.id] = v; });
  const at = x && typeof x.updatedAt === 'number' && isFinite(x.updatedAt) ? x.updatedAt : 0;
  return { days, updatedAt: at };
}
let CFG = clean(null);
const eff = () => { const o = {}; DRAFT.forEach(m => { o[m.id] = CFG.days[m.id] || DEFS[m.id]; }); return o; };
let CUR = eff();
let draft = null;              // ค่าที่ HR กำลังแก้ (ยังไม่บันทึก)
let hr = null;                 // { list } ของแท็บแผนการเรียนที่เปิดอยู่
const hrDays = () => draft || CUR;
const same = (a, b) => DRAFT.every(m => a[m.id] === b[m.id]);
const maxDays = dm => Math.max(...DRAFT.map(m => dm[m.id]));

/* ── วันที่ ── */
const dayNo = t => { const d = new Date(t || Date.now()); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
function startDay(prog) {
  const s = prog && prog.profile && prog.profile.startDate;
  const x = typeof s === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!x) return null;
  const v = Date.UTC(+x[1], +x[2] - 1, +x[3]) / 864e5;
  return isFinite(v) ? v : null;
}
const local = d => { const u = new Date(d * 864e5); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), 12); };
const dateOf = d => fmtDate(local(d).getTime());
const isoOf = d => new Date(d * 864e5).toISOString().slice(0, 10);

/* ── สถานะ ── */
function modPlan(m, prog, dm) {
  prog = prog || S.prog; dm = dm || CUR;
  const md = gm(m.id, prog), passed = postPassed(md), days = dm[m.id];
  const pd = passed ? dayNo(md.post.passedAt || md.post.at) : null, sd = startDay(prog);
  if (sd == null) return { key: 'nostart', passed, pd, days, due: null, left: null, late: 0 };
  const due = sd + days, left = due - dayNo();
  const key = passed ? (pd <= due ? 'ok' : 'late') : left < 0 ? 'over' : left <= SOON ? 'soon' : 'todo';
  return { key, passed, pd, days, due, left, late: passed ? Math.max(0, pd - due) : Math.max(0, -left) };
}
function learnerPlan(prog, dm) {
  prog = prog || S.prog; dm = dm || CUR;
  const xs = DRAFT.map(m => ({ m, p: modPlan(m, prog, dm) }));
  const by = k => xs.filter(x => x.p.key === k);
  const over = by('over').sort((a, b) => b.p.late - a.p.late), soon = by('soon').sort((a, b) => a.p.left - b.p.left), late = by('late');
  const open = xs.filter(x => !x.p.passed).sort((a, b) => a.p.days - b.p.days);
  const sd = startDay(prog), passed = xs.length - open.length;
  const key = sd == null ? 'nostart' : !open.length ? 'fin' : over.length ? 'over' : soon.length ? 'soon' : 'ok';
  return { key, sd, xs, over, soon, late, open, passed, next: open[0] || null, end: sd == null ? null : sd + maxDays(dm), worst: over.length ? over[0].p.late : 0 };
}
const CHIP = { ok: 'chip-ok', late: 'chip-sun', over: 'chip-bad', soon: 'chip-warn', todo: 'chip-brand', nostart: 'chip-dash' };
function label(p) {
  switch (p.key) {
    case 'ok': return 'ผ่านตามกำหนด';
    case 'late': return `ผ่านช้ากว่ากำหนด ${p.late} วัน`;
    case 'over': return `เลยกำหนด ${p.late} วัน`;
    case 'soon': return p.left === 0 ? 'ครบกำหนดวันนี้' : `เหลือ ${p.left} วัน`;
    case 'todo': return `ภายใน ${dateOf(p.due)}`;
    default: return `ภายใน ${p.days} วันหลังเริ่มงาน`;
  }
}
const chip = p => `<span class="chip ${CHIP[p.key]}">${esc(label(p))}</span>`;
/* สถานะรวมของผู้เรียนหนึ่งคน (ใช้ในตาราง HR) */
function sumOf(lp) {
  const N = DRAFT.length;
  switch (lp.key) {
    case 'nostart': return { t: 'ไม่ระบุวันเริ่มงาน', c: 'chip-dash' };
    case 'fin': return lp.late.length ? { t: `เรียนครบ · ช้า ${lp.late.length} บท`, c: 'chip-sun' } : { t: 'เรียนครบตามแผน', c: 'chip-ok' };
    case 'over': return { t: `เลยกำหนด ${lp.over.length} บท`, c: 'chip-bad', tip: `นานสุด ${lp.worst} วัน` };
    case 'soon': return { t: label(lp.soon[0].p).replace('เหลือ', 'ใกล้กำหนด · เหลือ'), c: 'chip-warn' };
    default: return { t: `ตามแผน · ${lp.passed}/${N}`, c: 'chip-brand' };
  }
}

const CAL = `<svg class="pl-cal" viewBox="0 0 32 32" aria-hidden="true"><rect x="3.5" y="6" width="25" height="22.5" rx="5" fill="var(--surface)" stroke="var(--line)" stroke-width="2.2"/><path d="M3.5 12.5V11a5 5 0 0 1 5-5h15a5 5 0 0 1 5 5v1.5z" fill="var(--accent)" stroke="var(--line)" stroke-width="2.2" stroke-linejoin="round"/><path d="M10.5 3.5v5M21.5 3.5v5" stroke="var(--line)" stroke-width="2.4" stroke-linecap="round"/><circle cx="11" cy="18" r="1.7" fill="var(--line)"/><circle cx="16" cy="18" r="1.7" fill="var(--line)"/><circle cx="21" cy="18" r="1.9" fill="var(--sun)" stroke="var(--line)" stroke-width="1.2"/><circle cx="11" cy="23.5" r="1.7" fill="var(--line)"/><circle cx="16" cy="23.5" r="1.7" fill="var(--line)"/></svg>`;
const MK = { ok: '✓', late: '✓', over: '!', soon: '' };

/* ── ข้อมูลจากฐานข้อมูล ── */
let subbed = false;
function subscribe() {
  if (subbed || !S.db) return;
  subbed = true;
  try {
    S.db.doc('media/plan').onSnapshot(s => {
      const c = clean(s && s.exists ? s.data() : null);
      if (JSON.stringify(c.days) === JSON.stringify(CFG.days) && c.updatedAt === CFG.updatedAt) return;
      CFG = c; CUR = eff();
      if (draft && same(draft, CUR)) draft = null;
      refresh();
    }, () => { /* ใช้ค่าเริ่มต้น */ });
  } catch (e) { subbed = false; }
}
function refresh() {
  const n = S.route.name;
  if (n === 'home' || n === 'results' || n === 'plan' || n === 'person') DA.renderMain();
  else if (n === 'hr' && DA.hr && DA.hr.api && !draft) DA.hr.api.redraw();
  else if (n === 'hr' && hr) { paintTop(); paintNote(); }
}

/* ── ฝั่งผู้เรียน: หน้าแผนการเรียน ── */
function render(main) {
  main = main || $('#main');
  const lp = learnerPlan(), t = dayNo();
  main.innerHTML = `<section class="section-tight"><div class="wrap">${heroHTML(lp, t)}
    <div class="dgrid"><div class="card pl-card fade-in">${tlHTML(lp, t)}</div><aside class="dside">${sideHTML(lp)}</aside></div></div></section>`;
}
function heroHTML(lp, t) {
  const N = DRAFT.length;
  let h2, who, say, acts;
  if (lp.key === 'nostart') {
    h2 = `เรียนครบ ${N} บทภายใน ${maxDays(CUR)} วัน`;
    who = 'ใส่วันที่เริ่มงานในข้อมูลผู้เรียน แล้วระบบจะคำนวณวันครบกำหนดของแต่ละบทให้';
    say = 'มาวางแผนเรียนกันเถอะ!';
    acts = `<button class="btn btn-cta btn-pill" data-act="go" data-r="profile">${ic('edit')}ใส่วันที่เริ่มงาน</button>`;
  } else {
    const dn = t - lp.sd;
    h2 = lp.key === 'fin' ? 'เรียนครบทุกบทแล้ว!' : `เรียนจบทุกบทภายใน ${dateOf(lp.end)}`;
    who = `เริ่มงาน ${dateOf(lp.sd)} · ${dn < 0 ? `อีก ${-dn} วันจะเริ่มงาน` : `วันนี้เป็นวันที่ ${dn + 1}`} · ผ่านแล้ว ${lp.passed}/${N} บท`;
    say = { fin: lp.late.length ? 'เรียนครบแล้ว เก่งมาก!' : 'ตรงเวลาทุกบท สุดยอด!', over: 'มีบทที่เลยกำหนด มาเคลียร์กันนะ!', soon: 'ใกล้ครบกำหนดแล้ว สู้ ๆ!', ok: 'เป็นไปตามแผน เก่งมาก!' }[lp.key];
    acts = sumHTML(lp);
  }
  return `<div class="rhero plhero fade-in">
    ${DA.cloud('drift slow', 'right:30%;top:-26px;width:150px')}
    <div class="rhero-art bob">${DA.MASCOT}</div>
    <div class="rhero-body"><div class="eyebrow">${ic('cal')}แผนการเรียนของฉัน</div>
      <h2>${esc(h2)}</h2><div class="who">${esc(who)}</div><div class="bubble">${esc(say)}</div></div>
    <div class="rhero-acts">${acts}</div></div>`;
}
function sumHTML(lp) {
  const N = DRAFT.length;
  let big, lab, foot;
  if (lp.key === 'fin') { big = `${lp.passed}/${N}`; lab = 'บท เรียนครบแล้ว'; foot = lp.late.length ? `ตรงเวลา ${N - lp.late.length} บท · ช้ากว่ากำหนด ${lp.late.length} บท` : 'ผ่านตรงเวลาทุกบท'; }
  else if (lp.key === 'over') { big = lp.worst; lab = `วัน ที่บทที่ ${modNo(lp.over[0].m)} เลยกำหนด`; foot = `เลยกำหนด ${lp.over.length} บท · ผ่านแล้ว ${lp.passed}/${N} บท`; }
  else { const p = lp.next.p; big = p.left === 0 ? 'วันนี้' : p.left; lab = p.left === 0 ? `ครบกำหนดบทที่ ${modNo(lp.next.m)}` : `วัน ก่อนครบกำหนดบทที่ ${modNo(lp.next.m)}`; foot = `ผ่านแล้ว ${lp.passed}/${N} บท · บทถัดไปครบ ${dateOf(p.due)}`; }
  return `<div class="pl-sum k-${lp.key}">
    <div class="pl-sum-top"><span class="pl-ic">${CAL}</span><div><b>${esc(String(big))}</b><span>${esc(lab)}</span></div></div>
    <div class="pl-dots" aria-hidden="true">${lp.xs.map(x => `<i class="k-${x.p.key}" title="บทที่ ${modNo(x.m)}: ${esc(label(x.p))}"></i>`).join('')}</div>
    <small>${esc(foot)}</small></div>`;
}
function tlHTML(lp, t) {
  const rows = lp.xs.slice().sort((a, b) => a.p.days - b.p.days || DRAFT.indexOf(a.m) - DRAFT.indexOf(b.m));
  const ns = lp.key === 'nostart';
  let today = ns || lp.key === 'fin' ? -1 : rows.findIndex(x => x.p.due >= t);
  if (!ns && lp.key !== 'fin' && today < 0) today = rows.length;
  const li = x => {
    const m = x.m, p = x.p, st = modStatus(m, S.prog, S.signoff);
    const mk = MK[p.key] != null && MK[p.key] !== '' ? MK[p.key] : '';
    const meta = ns ? `ภายใน ${p.days} วันหลังเริ่มงาน · ถ้าเริ่มวันนี้ครบ ${dateOf(t + p.days)}`
      : `กำหนด ${dateOf(p.due)} · วันที่ ${p.days} หลังเริ่มงาน${p.passed ? ` · สอบผ่าน ${dateOf(p.pd)}` : ''}`;
    return `<li class="pl-row k-${p.key}"><button data-act="mod" data-id="${m.id}">
      <span class="pl-mk">${mk ? esc(mk) : p.key === 'soon' ? ic('clock') : modNo(m)}</span>
      <span class="pl-b"><span class="pl-t">บทที่ ${modNo(m)} · ${esc(m.title)}</span>
        <span class="pl-d">${esc(meta)}</span>
        ${p.passed || !(st.pct > 0 || p.key === 'over' || p.key === 'soon') ? '' : `<span class="pl-pg"><span class="bar"><i style="width:${st.pct}%"></i></span><span>${st.pct}%</span></span>`}</span>
      ${ns ? '' : `<span class="pl-c">${chip(p)}</span>`}</button></li>`;
  };
  const todayLi = `<li class="pl-today" aria-label="วันนี้ ${esc(dateOf(t))}"><span>${ic('flag')}วันนี้ · ${esc(dateOf(t))}</span></li>`;
  const items = rows.map((x, i) => (i === today ? todayLi : '') + li(x)).join('') + (today === rows.length ? todayLi : '');
  return `<div class="pl-head"><div><h3>${ic('cal')}กำหนดเรียนจบรายบท</h3>
      <p class="sub">${ns ? 'ยังไม่ได้ใส่วันที่เริ่มงาน จึงแสดงเป็นจำนวนวันหลังเริ่มงาน' : 'เรียงตามวันครบกำหนด กดบทเพื่อเข้าเรียน'}</p></div>
      ${ns ? `<button class="btn btn-ghost btn-sm" data-act="go" data-r="profile">${ic('edit')}ใส่วันเริ่มงาน</button>` : ''}</div>
    <ol class="pl-tl${ns ? ' ns' : ''}">${items}</ol>`;
}
function sideHTML(lp) {
  const ex = [['ok', 'ผ่านตามกำหนด', 'สอบหลังเรียนผ่านก่อนหรือในวันครบกำหนด'], ['soon', 'ใกล้ครบกำหนด', `เหลือไม่เกิน ${SOON} วัน`], ['over', 'เลยกำหนด', 'ยังสอบไม่ผ่านและเลยวันครบกำหนดแล้ว'], ['late', 'ผ่านช้ากว่ากำหนด', 'สอบผ่านแล้วแต่หลังวันครบกำหนด'], ['todo', 'ยังไม่ถึงกำหนด', 'มีเวลาเหลือมากกว่า 3 วัน']];
  return `<div class="card"><h3>${ic('info')}อ่านสถานะ</h3>
      <div class="pl-key">${ex.map(([k, t, d]) => `<div><span class="pl-kd k-${k}"></span><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div></div>
    <div class="note">${ic('bulb')}<div><b style="font-weight:600">นับกำหนดอย่างไร?</b><br>นับจากวันที่เริ่มงาน${lp.key === 'nostart' ? '' : ` (${esc(dateOf(lp.sd))})`} แต่ละบทต้องสอบหลังเรียนผ่าน ${DA.PASS}% ภายในจำนวนวันที่ HR กำหนด ส่วนการประเมินหน้างานโดยหัวหน้าไม่นับรวมในกำหนดนี้${lp.key === 'nostart' ? '' : `<br><button class="lnk pl-edit" data-act="go" data-r="profile">${ic('edit')}แก้วันที่เริ่มงาน</button>`}</div></div>`;
}

/* ปุ่มบนการ์ดหน้าหลัก */
function homeCard() {
  const lp = learnerPlan();
  let cls = '', sub, main, badge = '';
  if (lp.key === 'nostart') { sub = 'ยังไม่ได้ใส่วันที่เริ่มงาน'; main = 'ดูแผนการเรียนและกำหนดเรียนจบ'; }
  else if (lp.key === 'fin') { cls = ' done'; badge = '✓'; sub = 'เรียนครบทุกบทแล้ว'; main = lp.late.length ? `ตรงเวลา ${DRAFT.length - lp.late.length}/${DRAFT.length} บท` : 'เรียนจบตามแผน ตรงเวลาทุกบท'; }
  else if (lp.key === 'over') { const x = lp.over[0]; cls = ' over'; badge = '!'; sub = `มีบทที่เลยกำหนด ${lp.over.length} บท`; main = `บทที่ ${modNo(x.m)} เลยกำหนดมา ${x.p.late} วัน`; }
  else {
    const x = lp.next, p = x.p; cls = lp.key === 'soon' ? ' soon' : ''; badge = String(p.left);
    sub = lp.key === 'soon' ? 'ใกล้ครบกำหนดแล้ว' : `ตามแผน · เรียนครบทุกบทภายใน ${dateOf(lp.end)}`;
    main = p.left === 0 ? `บทที่ ${modNo(x.m)} ครบกำหนดวันนี้` : `บทที่ ${modNo(x.m)} เรียนจบภายใน ${dateOf(p.due)}`;
  }
  return `<button class="dnext pl${cls}" data-act="go" data-r="plan"><span class="fl">${CAL}${badge ? `<b>${esc(badge)}</b>` : ''}</span><span class="dn-t"><small>${esc(sub)}</small><b>${esc(main)}</b></span><span class="arr">${ic('arrowR')}</span></button>`;
}
/* บรรทัดเล็กบนการ์ดบทเรียน */
function modLine(m) {
  const p = modPlan(m);
  if (p.key === 'nostart') return '';
  const t = p.key === 'over' ? `เลยกำหนด ${p.late} วัน · ครบ ${dateOf(p.due)}` : p.key === 'soon' ? (p.left === 0 ? 'ครบกำหนดวันนี้' : `เหลือ ${p.left} วัน · ครบ ${dateOf(p.due)}`)
    : p.key === 'todo' ? `เรียนจบภายใน ${dateOf(p.due)}` : label(p);
  return `<span class="pl-line k-${p.key}">${ic(p.key === 'ok' || p.key === 'late' ? 'check' : 'cal')}${esc(t)}</span>`;
}
/* แถบสรุปบนหน้าผลการเรียน */
function resultsStrip() {
  const lp = learnerPlan(), N = DRAFT.length;
  const h = { nostart: 'ยังไม่ได้ใส่วันที่เริ่มงาน', fin: 'เรียนครบทุกบทแล้ว', over: `เลยกำหนด ${lp.over.length} บท`, soon: 'ใกล้ครบกำหนด', ok: 'เรียนเป็นไปตามแผน' }[lp.key];
  const p = lp.key === 'nostart' ? 'ใส่วันที่เริ่มงานเพื่อดูกำหนดเรียนจบของแต่ละบท'
    : lp.key === 'fin' ? `ตรงเวลา ${N - lp.late.length}/${N} บท`
      : `ผ่านแล้ว ${lp.passed}/${N} บท · บทที่ ${modNo(lp.next.m)} ${label(lp.next.p)} · เรียนครบทุกบทภายใน ${dateOf(lp.end)}`;
  return `<div class="jend dstrip plstrip k-${lp.key}"><div class="medal">${CAL}</div><div class="txt"><h4>แผนการเรียน · ${esc(h)}</h4><p>${esc(p)}</p></div>
    <button class="btn ${lp.key === 'over' || lp.key === 'soon' ? 'btn-cta' : 'btn-ghost'}" data-act="go" data-r="plan">${ic('cal')}ดูแผนการเรียน</button></div>`;
}

/* ── ฝั่ง HR ── */
const hrCell = prog => { const s = sumOf(learnerPlan(prog)); return `<span class="chip ${s.c}"${s.tip ? ` title="${esc(s.tip)}"` : ''}>${esc(s.t)}</span>`; };
const modChip = (m, prog) => { const p = modPlan(m, prog); return p.key === 'nostart' ? '' : `<span class="chip ${CHIP[p.key]}">${ic('cal')}${esc(p.key === 'todo' ? 'ครบกำหนด ' + dateOf(p.due) : label(p))}</span>`; };
const personChip = prog => { const lp = learnerPlan(prog), s = sumOf(lp); return `<span class="chip ${s.c}" style="font-size:13.5px;padding:5px 12px">${ic('cal')}${esc(lp.key === 'nostart' ? s.t : 'แผน: ' + s.t)}</span>`; };
const csvHead = () => ['สถานะตามแผน', 'บทที่เลยกำหนด', 'กำหนดเรียนครบทุกบท'];
function csvRow(prog) {
  const lp = learnerPlan(prog);
  return [sumOf(lp).t, lp.over.map(x => modNo(x.m)).join(' '), lp.end == null ? '' : isoOf(lp.end)];
}
const csvMod = (m, prog) => { const p = modPlan(m, prog); return p.key === 'nostart' ? '' : label(p); };

function hrDraw(body, list) {
  hr = { list };
  body.innerHTML = `<div id="pl-top"></div><div class="chart pl-set" id="pl-set"></div>`;
  paintTop(); paintSet();
  $('#pl-set').addEventListener('input', onIn);
}
function paintTop() {
  const box = $('#pl-top'); if (!box || !hr) return;
  const dm = hrDays(), L = hr.list.map(r => ({ r, lp: learnerPlan(r.prog, dm) }));
  const c = { ok: 0, fin: 0, soon: 0, over: 0, nostart: 0 };
  L.forEach(x => { c[x.lp.key]++; });
  const n = L.length, pc = v => (n ? Math.round(v / n * 100) : 0);
  const fol = L.filter(x => x.lp.key === 'over' || x.lp.key === 'soon')
    .sort((a, b) => (b.lp.key === 'over') - (a.lp.key === 'over') || b.lp.worst - a.lp.worst || b.lp.over.length - a.lp.over.length || (a.lp.soon[0] ? a.lp.soon[0].p.left : 0) - (b.lp.soon[0] ? b.lp.soon[0].p.left : 0));
  const emp = !!DA.platform;
  const row = x => {
    const r = x.r, p = r.prog.profile, lp = x.lp, f = lp.key === 'over' ? lp.over : lp.soon, y = f[0];
    const s = lp.key === 'over' ? { t: `เลยกำหนด ${lp.worst} วัน`, c: 'chip-bad' } : { t: label(y.p), c: 'chip-warn' };
    return `<tr class="click" data-act="hr-person" data-id="${esc(r.id)}">
      <td class="pl-fn"><button class="lnk" data-act="hr-person" data-id="${esc(r.id)}">${esc(p.name || 'ไม่ระบุชื่อ')}</button>${(emp && p.empCode) || p.nickname ? `<small class="muted" style="display:block;font-size:12.5px">${[emp ? p.empCode : '', p.nickname].filter(Boolean).map(esc).join(' · ')}</small>` : ''}</td>
      <td class="pl-fb" data-label="สาขา">${esc(p.branch || 'ไม่ระบุสาขา')}</td>
      <td class="pl-fd" data-label="เริ่มงาน" style="white-space:nowrap">${esc(dateOf(lp.sd))}</td>
      <td class="pl-fm" data-label="บทที่ต้องเร่ง"><b style="font-weight:600">บทที่ ${modNo(y.m)}</b> ${esc(y.m.title)}${f.length > 1 ? `<small class="muted" style="display:block;font-size:12.5px">และอีก ${f.length - 1} บท</small>` : ''}</td>
      <td class="pl-fs"><span class="chip ${s.c}">${esc(s.t)}</span></td></tr>`;
  };
  box.innerHTML = `<div class="kpis k4 pl-kpis">
      <div class="kpi"><span>ตามแผน</span><b class="up">${c.ok + c.fin}</b><small>${pc(c.ok + c.fin)}% ของผู้เรียน${c.fin ? ` · เรียนครบ ${c.fin} คน` : ''}</small></div>
      <div class="kpi"><span>ใกล้ครบกำหนด</span><b class="warn">${c.soon}</b><small>ภายใน ${SOON} วันข้างหน้า</small></div>
      <div class="kpi"><span>เลยกำหนด</span><b class="bad">${c.over}</b><small>${pc(c.over)}% ของผู้เรียน</small></div>
      <div class="kpi"><span>ไม่ระบุวันเริ่มงาน</span><b>${c.nostart}</b><small>${c.nostart ? (DA.platform ? 'ใส่ได้ในแท็บจัดการผู้ใช้' : 'ผู้เรียนใส่ได้ที่ข้อมูลผู้เรียน') : 'คำนวณกำหนดได้ครบทุกคน'}</small></div>
    </div>
    <div class="chart pl-fol"><h4>ต้องติดตาม</h4><p class="sub">ผู้เรียนที่มีบทเลยกำหนดหรือใกล้ครบกำหนด เรียงจากเลยกำหนดนานที่สุด กดชื่อเพื่อดูรายละเอียด</p>
      ${!n ? `<div class="note" style="margin-top:12px">${ic('users')}<div>ยังไม่มีผู้เรียนในมุมมองนี้</div></div>`
        : fol.length ? `<div class="tbl-wrap" style="margin-top:12px"><table class="pl-ftbl"><thead><tr><th>ผู้เรียน</th><th>สาขา</th><th>เริ่มงาน</th><th>บทที่ต้องเร่ง</th><th>สถานะ</th></tr></thead><tbody>${fol.map(row).join('')}</tbody></table></div>`
          : `<div class="note ok" style="margin-top:12px">${ic('check')}<div>ทุกคนเรียนเป็นไปตามแผน ไม่มีบทที่เลยกำหนดหรือใกล้ครบกำหนด</div></div>`}
    </div>`;
}
function team(m, dm) {
  const c = { ok: 0, late: 0, over: 0, wait: 0 };
  for (const r of hr.list) {
    const p = modPlan(m, r.prog, dm);
    if (p.key === 'nostart') continue;
    c[p.key === 'soon' || p.key === 'todo' ? 'wait' : p.key]++;
  }
  return c;
}
const SEG = [['ok', 'ตรงเวลา'], ['late', 'ผ่านช้า'], ['over', 'เลยกำหนด'], ['wait', 'ยังไม่ถึงกำหนด']];
function teamHTML(m, dm) {
  const c = team(m, dm), n = c.ok + c.late + c.over + c.wait;
  if (!n) return '<span class="muted" style="font-size:13px">–</span>';
  const bar = SEG.filter(([k]) => c[k]).map(([k, t]) => `<i class="s-${k}" style="flex:${c[k]}" title="${t} ${c[k]} คน"></i>`).join('');
  return `<div class="pl-stk" role="img" aria-label="${SEG.map(([k, t]) => `${t} ${c[k]} คน`).join(' ')}">${bar}</div>
    <div class="pl-stt">${SEG.filter(([k]) => c[k] && k !== 'wait').map(([k, t]) => `<span class="t-${k}">${t} ${c[k]}</span>`).join('') || '<span>ยังไม่ถึงกำหนด</span>'}</div>`;
}
function paintSet() {
  const box = $('#pl-set'); if (!box || !hr) return;
  const dm = hrDays(), t = dayNo();
  box.innerHTML = `<div class="pl-sh"><div><h4>${ic('cal')}กำหนดเรียนจบรายบท</h4>
      <p class="sub">จำนวนวันหลังวันเริ่มงานที่ต้องสอบหลังเรียนผ่าน ${DA.PASS}% · ปรับตัวเลขแล้วเห็นผลกับทีมทันทีก่อนกดบันทึก</p></div>
      <span class="chip ${CFG.updatedAt ? 'chip-brand' : 'chip-dash'}">${CFG.updatedAt ? 'ปรับล่าสุด ' + esc(fmtDate(CFG.updatedAt)) : 'ใช้ค่าเริ่มต้น'}</span></div>
    <div class="legend">${SEG.map(([k, tx]) => `<span><i class="s-${k}"></i>${tx}</span>`).join('')}</div>
    <div class="tbl-wrap"><table class="pl-tbl"><thead><tr><th>บท</th><th>ภายใน (วัน)</th><th>สถานะของทีม</th><th>ถ้าเริ่มงานวันนี้ ครบ</th></tr></thead>
      <tbody>${DRAFT.map(m => `<tr><td class="pl-sm"><b style="font-weight:600">บทที่ ${modNo(m)}</b><small class="muted" style="display:block;font-size:12.5px">${esc(m.title)}</small></td>
        <td class="pl-si"><label class="pl-inw"><input class="pl-in" type="number" min="1" max="${MAXD}" step="1" inputmode="numeric" value="${dm[m.id]}" data-m="${m.id}" aria-label="บทที่ ${modNo(m)} ต้องเรียนจบภายในกี่วันหลังเริ่มงาน"><span>วัน</span></label></td>
        <td class="pl-team" data-label="สถานะของทีม" data-team="${m.id}">${teamHTML(m, dm)}</td>
        <td class="pl-se" data-label="ถ้าเริ่มงานวันนี้ ครบ" style="white-space:nowrap" data-ex="${m.id}">${esc(dateOf(t + dm[m.id]))}</td></tr>`).join('')}</tbody></table></div>
    <div class="pl-acts"><div id="pl-note" class="pl-note" aria-live="polite"></div>
      <button class="btn btn-text btn-sm" data-act="pl-reset">${ic('refresh')}คืนค่าเริ่มต้น</button>
      <button class="btn btn-ghost btn-sm" data-act="pl-cancel">ยกเลิกการแก้ไข</button>
      <button class="btn btn-cta btn-sm" data-act="pl-save">${ic('check')}บันทึกกำหนดการ</button></div>`;
  paintNote();
}
function readIns() {
  const o = {}; let bad = false;
  $$('#pl-set .pl-in').forEach(el => {
    const v = Number(el.value), ok = el.value !== '' && Number.isInteger(v) && v >= 1 && v <= MAXD;
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (ok) o[el.dataset.m] = v; else bad = true;
  });
  return { o, bad };
}
function paintNote() {
  const box = $('#pl-note'); if (!box) return;
  const { bad } = readIns(), dirty = !!draft && !same(draft, CUR), can = !!(S.canEdit && S.db);
  const dm = hrDays(), order = DRAFT.some((m, i) => i && dm[m.id] < dm[DRAFT[i - 1].id]);
  box.innerHTML = bad ? `${ic('warn')}ใส่จำนวนวันเป็นเลขเต็ม 1–${MAXD}`
    : dirty ? `${ic('edit')}${can ? 'มีการแก้ไขที่ยังไม่บันทึก' : 'ทดลองปรับได้ แต่บัญชีนี้ไม่มีสิทธิ์บันทึก'}`
      : order ? `${ic('info')}บางบทมีกำหนดเร็วกว่าบทก่อนหน้า`
        : can ? `${ic('cloud')}ผู้เรียนทุกคนเห็นกำหนดใหม่ทันทีหลังบันทึก` : `${ic('info')}ข้อมูลตัวอย่าง · ทดลองปรับได้ ไม่ถูกบันทึก`;
  box.className = 'pl-note' + (bad ? ' bad' : dirty ? ' dirty' : '');
  const sv = $('#pl-set [data-act="pl-save"]'), cc = $('#pl-set [data-act="pl-cancel"]'), rs = $('#pl-set [data-act="pl-reset"]');
  if (sv) { sv.disabled = bad || !dirty || !can; sv.title = can ? '' : 'ต้องเป็นผู้มีสิทธิ์แก้ไข (HR) จึงบันทึกได้'; }
  if (cc) cc.hidden = !dirty;
  if (rs) rs.disabled = same(dm, DEFS);
}
function onIn(e) {
  const el = e.target.closest('.pl-in'); if (!el) return;
  const { o, bad } = readIns();
  if (!bad) {
    draft = same(o, CUR) ? null : o;
    const dm = hrDays(), t = dayNo();
    DRAFT.forEach(m => {
      const tc = $(`#pl-set [data-team="${m.id}"]`); if (tc) tc.innerHTML = teamHTML(m, dm);
      const ex = $(`#pl-set [data-ex="${m.id}"]`); if (ex) ex.textContent = dateOf(t + dm[m.id]);
    });
    paintTop();
  }
  paintNote();
}
DA.acts['pl-reset'] = () => { draft = same(DEFS, CUR) ? null : Object.assign({}, DEFS); paintSet(); paintTop(); };
DA.acts['pl-cancel'] = () => { draft = null; paintSet(); paintTop(); };
DA.acts['pl-save'] = async el => {
  const { o, bad } = readIns();
  if (bad || same(o, CUR)) { paintNote(); return; }
  const can = !!(S.canEdit && S.db);
  if (!can) { DA.toast('บัญชีนี้ไม่มีสิทธิ์บันทึกกำหนดการ ทดลองปรับดูผลได้อย่างเดียว'); return; }
  const days = {}; DRAFT.forEach(m => { days[m.id] = o[m.id]; });
  const doc = { v: 1, days, updatedAt: Date.now() };
  if (el) { el.disabled = true; el.textContent = 'กำลังบันทึก…'; }
  try {
    await DA.retryOnce(() => S.db.doc('media/plan').set(doc));
    CFG = clean(doc); CUR = eff(); draft = null;
    DA.toast('บันทึกกำหนดการแล้ว ผู้เรียนทุกคนเห็นกำหนดใหม่ทันที');
    paintSet(); paintTop();
  } catch (e) {
    DA.toast('บันทึกไม่สำเร็จ (' + DA.errCode(e) + ') ลองใหม่อีกครั้ง');
    paintSet();
  }
};

DA.plan = { DEF, DEFS, SOON, days: () => Object.assign({}, CUR), clean, modPlan, learnerPlan, startDay, dateOf, subscribe, render, homeCard, modLine, resultsStrip, hrDraw, hrCell, modChip, personChip, csvHead, csvRow, csvMod };
})();
