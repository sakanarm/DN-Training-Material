/* DA Training Academy — แผนที่ทักษะ: พนักงาน × บท ระบายสีตามสถานะ แยกตามสาขา
   ใช้ข้อมูลชุดเดียวกับหน้า HR (ตัวอย่าง/จริง ตัวกรองสาขาและคำค้น) ผ่าน DA.hr.api
   แสดงในหน้า HR แท็บ "แผนที่ทักษะ" (route {name:'hr', view:'map'}) และการ์ดตัวอย่างบนหน้าหลัก */
(function () {
'use strict';
const DA = window.DA;
if (!DA || !DA.hr || !DA.hr.api) return;
const { $, esc, ic, DRAFT, modNo, gm, modStatus } = DA;
const A = DA.hr.api;
const LV = (window.COURSE && window.COURSE.levels) || [];
const K = { mode: 'people', focus: '' };
const KEYS = ['done', 'wait', 'prog', 'none'];
const LBL = { done: 'ผ่านสมบูรณ์', wait: 'รอประเมินหน้างาน', prog: 'กำลังเรียน', none: 'ยังไม่เริ่ม' };
const GLYPH = { done: 'check', wait: 'clock' };
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const step = p => (p >= 80 ? 4 : p >= 60 ? 3 : p >= 40 ? 2 : p >= 20 ? 1 : 0);
const RAMP = ['0–19%', '20–39%', '40–59%', '60–79%', '80–100%'];

/* ── คำนวณ ── */
function tally(rows, j) {
  const c = { done: 0, wait: 0, prog: 0, none: 0, n: rows.length };
  rows.forEach(x => c[x.cells[j].key]++);
  c.ready = pct(c.done, c.n);
  return c;
}
function model(list) {
  const rows = list.map(r => {
    const cells = DRAFT.map(m => modStatus(m, r.prog, r.so));
    return { r, cells, done: cells.filter(c => c.key === 'done').length, passed: cells.filter(c => c.key === 'done' || c.key === 'wait').length };
  });
  const mods = DRAFT.map((m, j) => Object.assign(tally(rows, j), { m }));
  const map = {};
  rows.forEach(x => { const b = A.branchOf(x.r); (map[b] || (map[b] = { name: b, rows: [] })).rows.push(x); });
  const brs = Object.values(map).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  brs.forEach(b => {
    b.rows.sort((p, q) => q.done - p.done || q.passed - p.passed || A.nameOf(p.r).localeCompare(A.nameOf(q.r), 'th'));
    b.mods = DRAFT.map((m, j) => tally(b.rows, j));
    b.ready = pct(b.rows.reduce((a, x) => a + x.done, 0), b.rows.length * DRAFT.length);
    b.wait = b.mods.reduce((a, c) => a + c.wait, 0);
  });
  const ready = pct(rows.reduce((a, x) => a + x.done, 0), rows.length * DRAFT.length);
  return { rows, mods, brs, ready };
}

/* ── ข้อสังเกตสำหรับผู้บริหาร ── */
function insightsHTML(M) {
  const best = M.mods.slice().sort((a, b) => b.ready - a.ready || (b.done + b.wait) - (a.done + a.wait))[0];
  const worst = M.mods.slice().sort((a, b) => a.ready - b.ready || (a.done + a.wait) - (b.done + b.wait) || b.none - a.none)[0];
  const waitN = M.mods.reduce((a, c) => a + c.wait, 0);
  const wb = M.brs.slice().sort((a, b) => b.wait - a.wait)[0];
  const card = (icon, cls, label, big, foot, extra) => `<div class="sk-in ${cls}"><span class="ic">${ic(icon)}</span><div style="min-width:0">
    <div class="lb">${label}</div><div class="big">${big}</div><div class="ft">${foot}</div>${extra || ''}</div></div>`;
  const modBig = c => `บทที่ ${modNo(c.m)} <span>${esc(c.m.title)}</span>`;
  return `<div class="sk-ins">
    ${card('star', 'good', 'ทักษะที่ทีมพร้อมที่สุด', modBig(best), `ผ่านสมบูรณ์ ${best.ready}% ของทีม (${best.done}/${best.n} คน)`)}
    ${card('flag', 'hot', 'บทที่ควรเร่ง', modBig(worst), `ผ่านสมบูรณ์ ${worst.ready}%${worst.none ? ` · ยังไม่เริ่ม ${worst.none} คน` : ''}`)}
    ${card('clipboard', 'wait', 'งานประเมินหน้างานที่ค้าง', waitN ? `${waitN} <span>รายการ</span>` : 'ไม่มีงานค้าง',
      waitN ? `สอบผ่านแล้ว รอหัวหน้าประเมิน · มากที่สุดที่${esc(wb.name)} (${wb.wait})` : 'ทุกบทที่สอบผ่านได้รับการประเมินครบแล้ว',
      waitN ? `<button class="btn btn-text btn-sm" data-act="sk-focus" data-k="wait">${ic('eye')}ไฮไลต์ในตาราง</button>` : '')}
  </div>`;
}

/* ── หัวตาราง: ระดับ + บท ── */
function headHTML(first, last) {
  const groups = [];
  DRAFT.forEach(m => { const g = groups[groups.length - 1]; if (g && g.lv === m.level) g.n++; else groups.push({ lv: m.level, n: 1 }); });
  const lvRow = groups.map(g => {
    const lv = LV.find(l => l.id === g.lv), t = lv ? lv.title : 'ระดับ ' + g.lv, i = t.indexOf('·');
    return `<th scope="colgroup" colspan="${g.n}" class="sk-lv lv${g.lv}" title="${esc(t)}"><span>${esc(i > 0 ? t.slice(0, i).trim() : t)}</span><span class="lvl">${i > 0 ? ' · ' + esc(t.slice(i + 1).trim()) : ''}</span></th>`;
  }).join('');
  const mRow = DRAFT.map(m => `<th scope="col" class="sk-mh" title="บทที่ ${modNo(m)} · ${esc(m.title)}"><b>${modNo(m)}</b><span class="sk-mt">${esc(m.title)}</span></th>`).join('');
  return `<colgroup><col class="c-nm"><col span="${DRAFT.length}" class="c-m"><col class="c-sum"></colgroup><thead><tr><th class="sk-name sk-corner" rowspan="2" scope="col">${first}</th>${lvRow}<th class="sk-sum" rowspan="2" scope="col">${last}</th></tr><tr>${mRow}</tr></thead>`;
}

/* ── มุมมองรายคน ── */
function peopleHTML(M, tips) {
  const N = DRAFT.length, ST = A.ST;
  const body = M.brs.map(b => {
    const grp = `<tr class="sk-grp"><th colspan="${N + 2}" scope="rowgroup"><span class="gl">${ic('users')}<b>${esc(b.name)}</b><span>${b.rows.length} คน · ผ่านสมบูรณ์ ${b.ready}%</span></span></th></tr>`;
    return grp + b.rows.map(x => {
      const r = x.r, p = r.prog.profile, name = A.nameOf(r);
      const cells = x.cells.map((c, j) => {
        const m = DRAFT[j], k = c.key, md = gm(m.id, r.prog), so = r.so && r.so.modules && r.so.modules[m.id];
        const nOn = so ? so.items.filter(Boolean).length : 0;
        const ti = tips.push(`<b>${esc(name)}</b> · ${esc(A.branchOf(r))}<br>บทที่ ${modNo(m)} · ${esc(m.title)}<br><i style="background:${ST[k].col}"></i>${LBL[k]}${k === 'prog' ? ' ' + c.pct + '%' : ''}`
          + `<br>ก่อนเรียน ${md.pre ? md.pre.score + '%' : '–'} · หลังเรียน ${md.post ? md.post.best + '%' : '–'}`
          + (k === 'done' || k === 'wait' ? `<br>ประเมินหน้างาน ${nOn}/${m.checklist.length} ข้อ` : '')) - 1;
        const inner = GLYPH[k] ? ic(GLYPH[k]) : k === 'prog' ? `<span class="pc">${c.pct}<small>%</small></span>` : '';
        return `<td class="skc k-${k}" data-i="${ti}" data-act="hr-person" data-id="${esc(r.id)}">${inner}<span class="sr">บทที่ ${modNo(m)} ${LBL[k]}${k === 'prog' ? ' ' + c.pct + '%' : ''}</span></td>`;
      }).join('');
      return `<tr><th scope="row" class="sk-name"><button class="lnk" data-act="hr-person" data-id="${esc(r.id)}">${esc(name)}</button>${p.nickname ? `<small>${esc(p.nickname)}</small>` : ''}</th>${cells}<td class="sk-sum"><b>${x.done}</b>/${N}</td></tr>`;
    }).join('');
  }).join('');
  const foot = M.mods.map(c => {
    const ti = tips.push(`<b>บทที่ ${modNo(c.m)} · ${esc(c.m.title)}</b><br>` + KEYS.map(k => `<i style="background:${ST[k].col}"></i>${LBL[k]} ${c[k]} คน`).join('<br>')) - 1;
    return `<td class="sk-ft" data-i="${ti}"><b>${c.ready}%</b><span class="fb"><i style="width:${c.ready}%"></i></span></td>`;
  }).join('');
  return `<table class="sk${K.focus ? ' foc f-' + K.focus : ''}"><caption class="sr">แผนที่ทักษะรายคน สถานะของผู้เรียนแต่ละคนในแต่ละบท</caption>
    ${headHTML('ผู้เรียน', 'ผ่าน<br>สมบูรณ์')}
    <tbody>${body}</tbody>
    <tfoot><tr><th scope="row" class="sk-name">ผ่านสมบูรณ์ทั้งทีม</th>${foot}<td class="sk-sum"><b>${M.ready}%</b></td></tr></tfoot></table>`;
}

/* ── มุมมองรายสาขา ── */
function branchHTML(M, tips) {
  const ST = A.ST;
  const cell = (c, title, m) => {
    const ti = tips.push(`<b>${esc(title)}</b><br>บทที่ ${modNo(m)} · ${esc(m.title)}<br>ผ่านสมบูรณ์ ${c.ready}% (${c.done}/${c.n} คน)<br>`
      + KEYS.filter(k => k !== 'done').map(k => `<i style="background:${ST[k].col}"></i>${LBL[k]} ${c[k]} คน`).join('<br>')) - 1;
    return `<td class="skh h${step(c.ready)}" data-i="${ti}"><b>${c.ready}</b><small>%</small><span class="sr">บทที่ ${modNo(m)} ผ่านสมบูรณ์ ${c.ready}%</span></td>`;
  };
  const body = M.brs.map(b => `<tr class="click" data-act="sk-branch" data-b="${esc(b.name)}"><th scope="row" class="sk-name"><button class="lnk" data-act="sk-branch" data-b="${esc(b.name)}">${esc(b.name)}</button><small>${b.rows.length} คน${b.wait ? ` · รอประเมิน ${b.wait}` : ''}</small></th>
    ${b.mods.map((c, j) => cell(c, b.name, DRAFT[j])).join('')}<td class="sk-sum"><b>${b.ready}%</b></td></tr>`).join('');
  const foot = M.mods.map(c => cell(c, 'ทั้งคลินิก', c.m)).join('');
  return `<table class="sk sk-br"><caption class="sr">แผนที่ทักษะรายสาขา ร้อยละของผู้เรียนที่ผ่านสมบูรณ์ในแต่ละบท</caption>
    ${headHTML('สาขา', 'เฉลี่ย')}
    <tbody>${body}</tbody>
    <tfoot><tr><th scope="row" class="sk-name">ทั้งคลินิก<small>${M.rows.length} คน</small></th>${foot}<td class="sk-sum"><b>${M.ready}%</b></td></tr></tfoot></table>`;
}

/* ── วาดลงในหน้า HR ── */
function draw(body, list) {
  const M = model(list), people = K.mode === 'people', tips = [];
  if (!people) K.focus = '';
  const cnt = {}; KEYS.forEach(k => { cnt[k] = M.mods.reduce((a, c) => a + c[k], 0); });
  const legend = people
    ? `<div class="legend sk-leg" role="group" aria-label="ไฮไลต์ตามสถานะ">${KEYS.map(k => `<button class="sk-lb" data-act="sk-focus" data-k="${k}" aria-pressed="${K.focus === k}"><i class="k-${k}">${GLYPH[k] ? ic(GLYPH[k]) : k === 'prog' ? '%' : ''}</i>${LBL[k]} <b>${cnt[k]}</b></button>`).join('')}<span class="hint">แตะสถานะเพื่อไฮไลต์ · ตัวเลขในช่องสีฟ้าอ่อนคือ % ความคืบหน้า</span></div>`
    : `<div class="legend sk-leg"><span class="ramp">${RAMP.map((t, i) => `<span><i class="skh h${i}"></i>${t}</span>`).join('')}</span><span class="hint">ตัวเลขในช่อง = % ของผู้เรียนในสาขาที่ผ่านสมบูรณ์บทนั้น (สอบผ่าน + ประเมินหน้างานครบ) · แตะชื่อสาขาเพื่อดูรายคน</span></div>`;
  body.innerHTML = `${insightsHTML(M)}
    <div class="chart sk-card" id="sk-box">
      <div class="sk-top"><div><h4>${people ? 'สถานะรายคน รายบท' : 'ความพร้อมรายสาขา รายบท'}</h4>
        <div class="sub">${people ? 'แต่ละช่องคือสถานะของผู้เรียนในบทนั้น แตะช่องหรือชื่อเพื่อดูรายละเอียดและบันทึกผลประเมิน' : 'ร้อยละของผู้เรียนที่ผ่านสมบูรณ์ ยิ่งเข้มยิ่งพร้อม'}</div></div>
        <span class="seg" role="group" aria-label="มุมมองแผนที่ทักษะ">
          <button data-act="sk-mode" data-v="people" aria-pressed="${people}">รายคน</button>
          <button data-act="sk-mode" data-v="branch" aria-pressed="${!people}">รายสาขา</button></span></div>
      ${legend}
      <div class="cv sk-scroll">${people ? peopleHTML(M, tips) : branchHTML(M, tips)}</div>
      <div class="tt" aria-hidden="true"></div>
    </div>`;
  A.wireTips($('#sk-box'), tips);
}
function applyFocus() {
  const t = $('#sk-box table.sk'); if (!t) return;
  t.className = 'sk' + (K.focus ? ' foc f-' + K.focus : '');
  document.querySelectorAll('#sk-box [data-act="sk-focus"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === K.focus)));
}

/* ── การ์ดตัวอย่างบนหน้าหลัก (ข้อมูลสมมติ) ── */
function homeTeaser() {
  const M = model(A.rowsOf('sample'));
  const n = DRAFT.length;
  const rows = M.brs.map(b => `<div class="skm-r"><span class="b">${esc(b.name)}</span>${b.mods.map(c => `<i class="skh h${step(c.ready)}"></i>`).join('')}</div>`).join('');
  const best = M.brs.slice().sort((a, b) => b.ready - a.ready)[0];
  return `<section class="section alt"><div class="wrap"><div class="sk-teaser">
    <div class="sk-tx">
      <div class="eyebrow">${ic('target')}สำหรับหัวหน้าและผู้บริหาร</div>
      <h2>เห็นทักษะของทีมทั้งคลินิก <span style="white-space:nowrap">ในหน้าเดียว</span></h2>
      <p>แผนที่ทักษะรวมผลของพนักงานทุกคน ทุกบท ทุกสาขา ไว้ในตารางเดียว บอกได้ทันทีว่าทีมพร้อมงานไหน และต้องเร่งเรื่องอะไร</p>
      <ul class="sk-pts">
        <li>${ic('check')}<span>ดูได้ทั้ง<b>รายสาขา</b>และ<b>รายคน</b> แตะสาขาเพื่อเจาะดูรายชื่อ</span></li>
        <li>${ic('check')}<span>รู้ว่า<b>บทไหนทีมยังไม่พร้อม</b> เพื่อจัดเวลาเรียนให้ตรงจุด</span></li>
        <li>${ic('check')}<span>เห็น<b>งานประเมินหน้างานที่ค้าง</b>ว่าอยู่ที่หัวหน้าสาขาไหน</span></li>
      </ul>
      <button class="btn btn-cta btn-pill" data-act="sk-open">${ic('target')} เปิดแผนที่ทักษะ ${ic('arrowR')}</button>
    </div>
    <div class="sk-mini" role="img" aria-label="ตัวอย่างแผนที่ทักษะรายสาขา ${M.brs.length} สาขา ${n} บท${best ? ` สาขาที่พร้อมที่สุดคือ${esc(best.name)} ผ่านสมบูรณ์เฉลี่ย ${best.ready}%` : ''}">
      <div class="hd"><b>ความพร้อมรายสาขา</b><span class="chip">ข้อมูลตัวอย่าง</span></div>
      <div class="skm" style="--n:${n}">
        <div class="skm-r h"><span class="b"></span>${DRAFT.map(m => `<span>${modNo(m)}</span>`).join('')}</div>
        ${rows}
      </div>
      <div class="skm-leg"><span>ผ่านสมบูรณ์ 0%</span>${RAMP.map((_, i) => `<i class="skh h${i}"></i>`).join('')}<span>100%</span></div>
    </div>
  </div></div></section>`;
}

/* ── ลงทะเบียน ── */
DA.skills = { draw, homeTeaser };
Object.assign(DA.acts, {
  'sk-open': () => DA.go({ name: 'hr', view: 'map' }),
  'sk-mode': el => { K.mode = el.dataset.v === 'branch' ? 'branch' : 'people'; A.redraw(); const b = $(`#sk-box [data-act="sk-mode"][data-v="${K.mode}"]`); if (b) b.focus(); },
  'sk-focus': el => {
    const k = KEYS.includes(el.dataset.k) ? el.dataset.k : '';
    const fromCard = !el.classList.contains('sk-lb');
    K.focus = K.focus === k && !fromCard ? '' : k;
    if (K.mode !== 'people') { K.mode = 'people'; A.redraw(); } else applyFocus();
    if (fromCard) { const box = $('#sk-box'); if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  },
  'sk-branch': el => { K.mode = 'people'; K.focus = ''; A.setBranch(el.dataset.b || ''); DA.toast('แสดงเฉพาะ' + (el.dataset.b || 'ทุกสาขา')); }
});
})();
