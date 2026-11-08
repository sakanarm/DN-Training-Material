/* DA Training Academy — แดชบอร์ด HR: ภาพรวมคะแนน รายบุคคล และการประเมินหน้างาน */
(function () {
'use strict';
const DA = window.DA;
const { $, esc, ic, S, DRAFT, PASS, modNo, modById, gm, modStatus, learnerStatus, cleanProg, cleanSignoff, toast, fmtDate, retryOnce, errCode } = DA;
const DAY = 864e5, EVAL_KEY = 'da-training:evaluator';
const clone = x => JSON.parse(JSON.stringify(x));
const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);

const H = {
  src: null, branch: '', q: '', view: 'dash',
  sample: null, sampleSo: {},
  real: { prog: {}, so: {}, soServer: {}, state: 'idle', err: '' },
  subbed: false, queue: {}, pend: {}, cd: null, ro: null
};
const canAdmin = () => !!(S.canEdit && S.db);
function src() {
  if (!canAdmin()) return 'sample';
  if (H.src) return H.src;
  return H.real.state === 'ready' && Object.keys(H.real.prog).length ? 'real' : 'sample';
}

/* ── ข้อมูลตัวอย่าง (สมมติทั้งหมด ไม่ถูกบันทึกลงฐานข้อมูล) ── */
function rng(a) {
  return function () { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const NAMES = ['กมลวรรณ ศ.', 'ณัฐธิดา ป.', 'พิมพ์ชนก ร.', 'ศิริพร ม.', 'อรอุมา ท.', 'ปิยะนุช ส.', 'วรรณิศา ก.', 'ธนพร จ.', 'สุภาวดี อ.', 'จิราพร บ.', 'ชลธิชา ว.', 'กัญญารัตน์ น.', 'มณีรัตน์ ช.', 'พรทิพย์ ล.', 'นันทนา ห.', 'รัชนก พ.', 'ธิดารัตน์ ค.', 'สุนิสา ด.', 'อัญชลี ต.', 'เบญจมาศ ย.', 'ปวีณา ส.', 'ภัทรา ม.', 'ณัฐวุฒิ ก.', 'ธีรภัทร ร.'];
const NICKS = ['แพรว', 'มิ้นท์', 'ฝน', 'จูน', 'ออม', 'ปุ้ย', 'เมย์', 'บีม', 'น้ำ', 'แนน', 'ฟ้า', 'ขวัญ', 'มายด์', 'ปาล์ม', 'แอน', 'ส้ม', 'ปลา', 'กิ๊ฟ', 'นุ่น', 'ตาล', 'เฟิร์น', 'ใบเตย', 'โอ๊ต', 'ต้น'];
const BRANCHES = ['สาขา A', 'สาขา A', 'สาขา B', 'สาขา B', 'สาขา B', 'สาขา C', 'สาขา C', 'สาขา D', 'สาขา D', 'สาขา E'];
const iso = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

function buildSample() {
  const R = rng(20251103), now = Date.now();
  const int = (a, b) => a + Math.floor(R() * (b - a + 1));
  const score = (m, lo, hi) => { const n = m.test.length || 10; return Math.round(int(Math.ceil(n * lo), Math.floor(n * hi)) / n * 100); };
  const stages = [7, 7, 7, 7, 7, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 0, 0].map(s => Math.round(s * DRAFT.length / 7));
  const list = [], sos = {};
  stages.forEach((stage, k) => {
    const id = 'demo-' + String(k + 1).padStart(2, '0');
    const branch = BRANCHES[Math.floor(R() * BRANCHES.length)];
    const start = now - (8 + stage * 6 + int(0, 10)) * DAY;
    const prog = { v: 1, profile: { name: NAMES[k], nickname: NICKS[k], branch, startDate: iso(start), at: start }, modules: {}, updatedAt: start };
    const so = { modules: {} };
    const span = (now - DAY / 2 - start) / (stage + 1);
    const allSigned = stage === DRAFT.length && R() < 0.5;
    const blank = stage === 0 && k === stages.length - 1;
    DRAFT.forEach((m, i) => {
      if (i > stage || blank) return;
      const at = f => Math.round(start + (i + f) * span);
      const md = { pre: { score: score(m, 0.2, 0.7), at: at(0.04) }, lessons: {}, practice: {}, post: null };
      const prac = (p, j) => { const b = int(12, 20) * 5; md.practice[p.id] = { best: b, last: Math.max(50, b - int(0, 2) * 5), tries: int(1, 3), at: at(0.45 + j * 0.06), timeSec: p.type === 'tray' ? int(70, 200) : 0 }; };
      if (i < stage) {
        m.lessons.forEach((l, j) => { md.lessons[l.key] = at(0.1 + j * 0.08); });
        m.practice.forEach(prac);
        const best = score(m, 0.8, 1), t = at(0.85);
        md.post = { best, last: best, attempts: R() < 0.3 ? 2 : 1, at: t, passedAt: t };
        const full = allSigned || R() < (i < stage - 1 ? 0.85 : 0.4);
        const items = m.checklist.map(() => full || R() < 0.5);
        if (items.some(Boolean)) so.modules[m.id] = { items, by: 'หัวหน้าผู้ช่วยทันตแพทย์ ' + branch, at: Math.min(now - 3600e3, t + int(1, 3) * DAY) };
      } else {
        const nl = int(0, m.lessons.length);
        m.lessons.slice(0, nl).forEach((l, j) => { md.lessons[l.key] = at(0.1 + j * 0.08); });
        if (nl === m.lessons.length) m.practice.slice(0, int(0, m.practice.length)).forEach(prac);
        if (Object.keys(md.practice).length === m.practice.length && R() < 0.6) {
          const b = score(m, 0.5, 0.75);
          md.post = { best: b, last: b, attempts: 1, at: at(0.85), passedAt: 0 };
        }
      }
      prog.modules[m.id] = md;
    });
    let last = prog.profile.at;
    for (const md of Object.values(prog.modules)) {
      last = Math.max(last, md.pre ? md.pre.at : 0, md.post ? md.post.at : 0, ...Object.values(md.lessons), ...Object.values(md.practice).map(p => p.at));
    }
    prog.updatedAt = last;
    list.push({ id, prog: cleanProg(prog) });
    sos[id] = cleanSignoff(so);
  });
  H.sample = list; H.sampleSo = sos;
}

/* ── ข้อมูลจริงจากฐานข้อมูล ── */
function ensureSub() {
  if (H.subbed || !canAdmin()) return;
  H.subbed = true; H.real.state = 'loading';
  const timer = setTimeout(() => { if (H.real.state === 'loading') { H.real.state = 'slow'; onData(); } }, 10000);
  const fail = e => { clearTimeout(timer); H.real.state = 'error'; H.real.err = errCode(e); onData(); };
  try {
    S.db.collection('progress').onSnapshot(q => {
      clearTimeout(timer);
      const o = {};
      q.docs.forEach(d => { if (d.exists) o[d.id] = cleanProg(d.data()); });
      H.real.prog = o; H.real.state = 'ready';
      onData();
    }, fail);
    S.db.collection('signoffs').onSnapshot(q => {
      const o = {};
      q.docs.forEach(d => { if (d.exists) o[d.id] = cleanSignoff(d.data()); });
      H.real.soServer = o;
      const ids = new Set([...Object.keys(o), ...Object.keys(H.real.so)]);
      const next = {};
      for (const id of ids) {
        if (H.pend[id]) { if (H.real.so[id]) next[id] = H.real.so[id]; }
        else if (o[id]) next[id] = clone(o[id]);
      }
      H.real.so = next;
      onData();
    }, () => {});
  } catch (e) { fail(e); }
}
function onData() {
  const n = S.route.name;
  if (n === 'hr') refreshDash();
  else if (n === 'person' && S.route.src === 'real') { if ($('#p-top')) refreshPerson(); else DA.renderMain(); }
}

/* ── คำนวณ ── */
function rowsOf(k) {
  /* เวอร์ชันเว็บ: ใช้ชื่อและสาขาล่าสุดจากทะเบียนผู้ใช้ (HR แก้ได้) แทนที่ผู้เรียนบันทึกไว้ */
  const ov = DA.platform && DA.platform.overlay;
  if (k === 'real') return Object.keys(H.real.prog).map(id => ({ id, prog: ov ? ov(id, H.real.prog[id]) : H.real.prog[id], so: H.real.so[id] || null })).filter(r => r.prog);
  if (!H.sample) buildSample();
  return H.sample.map(x => ({ id: x.id, prog: x.prog, so: H.sampleSo[x.id] || null }));
}
const branchOf = r => r.prog.profile.branch || 'ไม่ระบุสาขา';
const nameOf = r => r.prog.profile.name || 'ไม่ระบุชื่อ';
function lastActive(p) {
  let t = Math.max(p.updatedAt || 0, p.profile.at || 0);
  for (const md of Object.values(p.modules)) t = Math.max(t, md.pre ? md.pre.at : 0, md.post ? md.post.at : 0);
  return t;
}
function stats(r) {
  const pres = [], posts = [], gains = [];
  let passed = 0, wait = 0, done = 0;
  for (const m of DRAFT) {
    const md = gm(m.id, r.prog);
    if (md.pre) pres.push(md.pre.score);
    if (md.post) posts.push(md.post.best);
    if (md.pre && md.post) gains.push(md.post.best - md.pre.score);
    const k = modStatus(m, r.prog, r.so).key;
    if (k === 'done' || k === 'wait') passed++;
    if (k === 'wait') wait++;
    if (k === 'done') done++;
  }
  return { pres, posts, gains, pre: avg(pres), post: avg(posts), gain: avg(gains), passed, wait, done, st: learnerStatus(r.prog, r.so), last: lastActive(r.prog) };
}
const ST = {
  done: { label: 'ผ่านครบทุกบท', col: 'var(--s-done)', chip: 'chip-ok' },
  wait: { label: 'รอประเมินหน้างาน', col: 'var(--s-wait)', chip: 'chip-warn' },
  prog: { label: 'กำลังเรียน', col: 'var(--s-prog)', chip: 'chip-brand' },
  none: { label: 'ยังไม่เริ่ม', col: 'var(--s-none)', chip: '' }
};
const ST_ORDER = ['done', 'wait', 'prog', 'none'];
const stCell = k => `<span class="st-cell"><i style="background:${ST[k].col}"></i>${ST[k].label}</span>`;
function rel(t) {
  if (!t) return '–';
  const d = Math.floor((Date.now() - t) / DAY);
  if (d <= 0) return 'วันนี้';
  if (d === 1) return 'เมื่อวาน';
  if (d < 7) return d + ' วันก่อน';
  return fmtDate(t);
}
const sgn = v => (v > 0 ? '+' : '') + v;

/* ── หน้าภาพรวม ── */
const mapOn = () => H.view === 'map' && !!DA.skills;
/* แท็บ "จัดการผู้ใช้" มีเฉพาะเวอร์ชันเว็บ (web/auth.js ตั้ง DA.auth) */
const usersOn = () => !!(DA.auth && DA.auth.renderUsers);
const HEAD_T = {
  dash: ['ภาพรวมผลการฝึกอบรม', 'ติดตามคะแนนก่อนและหลังเรียน ความคืบหน้ารายบุคคล และบทที่รอหัวหน้าประเมินหน้างาน'],
  map: ['แผนที่ทักษะทั้งคลินิก', 'เห็นสถานะของพนักงานทุกคนในทุกบท แยกตามสาขา ในหน้าเดียว รู้ทันทีว่าทีมพร้อมงานไหนและต้องเร่งเรื่องใด'],
  users: ['จัดการผู้ใช้', 'อนุมัติพนักงานที่ลงทะเบียนใหม่ แก้ไขข้อมูล กำหนดสิทธิ์ และปิดการใช้งานบัญชีของคนที่ลาออก']
};
function headHTML() {
  const v = H.view === 'users' ? 'users' : mapOn() ? 'map' : 'dash', [t, p] = HEAD_T[v];
  const nPend = usersOn() && DA.auth.pendingCount ? DA.auth.pendingCount() : 0;
  return `<div><div class="eyebrow">สำหรับหัวหน้าและ HR</div><h2>${t}</h2><p>${p}</p></div>
    ${DA.skills || usersOn() ? `<span class="hr-tabs" role="group" aria-label="มุมมองหน้า HR">
      <button data-act="hr-view" data-v="dash" aria-pressed="${v === 'dash'}">${ic('chart')}ภาพรวมคะแนน</button>
      ${DA.skills ? `<button data-act="hr-view" data-v="map" aria-pressed="${v === 'map'}">${ic('target')}แผนที่ทักษะ</button>` : ''}
      ${usersOn() ? `<button data-act="hr-view" data-v="users" aria-pressed="${v === 'users'}">${ic('users')}จัดการผู้ใช้${nPend ? `<span class="hr-badge" aria-label="รออนุมัติ ${nPend} คน">${nPend}</span>` : ''}</button>` : ''}</span>` : ''}`;
}
function setView(v) {
  const was = H.view;
  H.view = v === 'map' ? 'map' : v === 'users' && usersOn() ? 'users' : 'dash';
  if (S.route.name !== 'hr' || !$('#hr-body') || was === 'users' || H.view === 'users') { DA.go({ name: 'hr', view: H.view }); return; }
  S.route = { name: 'hr', view: H.view };
  $('#hr-head').innerHTML = headHTML();
  renderBody();
  const b = $(`#hr-head [data-act="hr-view"][data-v="${H.view}"]`); if (b) b.focus();
}
function setBranch(b) {
  H.branch = b || '';
  const sel = $('#hr-branch'); if (sel) sel.value = H.branch;
  renderBody();
}
function render(main) {
  if (S.route.view === 'users' && usersOn()) {
    H.view = 'users';
    main.innerHTML = `<section class="section-tight"><div class="wrap fade-in">
      <div class="sec-head" id="hr-head">${headHTML()}</div>
      <div id="hr-body"></div>
    </div></section>`;
    DA.auth.renderUsers($('#hr-body'));
    return;
  }
  ensureSub();
  H.view = S.route.view === 'map' ? 'map' : 'dash';
  main.innerHTML = `<section class="section-tight"><div class="wrap fade-in">
    <div class="sec-head" id="hr-head">${headHTML()}</div>
    <div id="hr-src"></div>
    <div class="hr-bar">
      <span id="hr-seg"></span>
      <select id="hr-branch" aria-label="กรองตามสาขา"></select>
      <input id="hr-q" type="search" placeholder="${DA.platform ? 'ค้นหาชื่อ ชื่อเล่น หรือรหัสพนักงาน' : 'ค้นหาชื่อหรือชื่อเล่น'}" aria-label="ค้นหาผู้เรียน" value="${esc(H.q)}" maxlength="40">
      <span style="flex:1"></span>
      <button class="btn btn-ghost btn-sm" data-act="hr-csv">${ic('download')}ส่งออก CSV</button>
    </div>
    <div id="hr-body"></div>
  </div></section>`;
  $('#hr-branch').addEventListener('change', e => { H.branch = e.target.value; renderBody(); });
  $('#hr-q').addEventListener('input', e => { H.q = e.target.value; renderBody(); });
  refreshDash();
}
function refreshDash() {
  if (!$('#hr-body')) return;
  const k = src(), all = rowsOf(k), adm = canAdmin(), nReal = Object.keys(H.real.prog).length;
  $('#hr-seg').innerHTML = adm ? `<span class="seg" role="group" aria-label="แหล่งข้อมูล">
      <button data-act="hr-src" data-v="real" aria-pressed="${k === 'real'}">ข้อมูลจริง${H.real.state === 'ready' ? ` (${nReal})` : ''}</button>
      <button data-act="hr-src" data-v="sample" aria-pressed="${k === 'sample'}">ข้อมูลตัวอย่าง</button></span>` : '';
  $('#hr-src').innerHTML = srcBanner(k, adm, nReal);
  const brs = [...new Set(all.map(branchOf))].sort((a, b) => a.localeCompare(b, 'th'));
  if (H.branch && !brs.includes(H.branch)) H.branch = '';
  $('#hr-branch').innerHTML = `<option value="">ทุกสาขา (${brs.length})</option>` + brs.map(b => `<option value="${esc(b)}"${b === H.branch ? ' selected' : ''}>${esc(b)}</option>`).join('');
  renderBody();
}
function srcBanner(k, adm, nReal) {
  if (k === 'sample') {
    const extra = !adm ? ' · ข้อมูลจริงของพนักงานแสดงเฉพาะผู้มีสิทธิ์ Editor (HR)'
      : H.real.state === 'ready' && !nReal ? ' · ยังไม่มีผู้เรียนส่งคะแนนเข้าระบบ เมื่อมีจะสลับดูข้อมูลจริงได้ทันที'
      : H.real.state === 'ready' ? ' · กด “ข้อมูลจริง” เพื่อดูคะแนนของพนักงาน' : '';
    return `<div class="banner">${ic('sparkle')}<div><b style="font-weight:500">ข้อมูลตัวอย่างเพื่อการสาธิต</b> · ชื่อและคะแนนสมมติทั้งหมด${extra}</div></div>`;
  }
  if (H.real.state === 'error') return `<div class="note warn" style="margin-bottom:18px">${ic('warn')}<div>โหลดข้อมูลผู้เรียนไม่สำเร็จ (${esc(H.real.err)}) ลองเปิดหน้านี้ใหม่อีกครั้ง</div></div>`;
  if (H.real.state !== 'ready') return `<div class="note" style="margin-bottom:18px">${ic('cloud')}<div>${H.real.state === 'slow' ? 'เชื่อมต่อฐานข้อมูลช้ากว่าปกติ ข้อมูลจะแสดงเมื่อพร้อม' : 'กำลังโหลดข้อมูลผู้เรียน…'}</div></div>`;
  return `<div class="note ok" style="margin-bottom:18px">${ic('cloud')}<div>ข้อมูลจริงจากผู้เรียน ${nReal} คน · อัปเดตอัตโนมัติเมื่อมีคนส่งคะแนน</div></div>`;
}
function filtered() {
  const q = H.q.trim().toLowerCase();
  return rowsOf(src()).filter(r => (!H.branch || branchOf(r) === H.branch)
    && (!q || [r.prog.profile.name, r.prog.profile.nickname, r.prog.profile.empCode].join(' ').toLowerCase().includes(q)));
}
function renderBody() {
  const body = $('#hr-body'); if (!body) return;
  const list = filtered().map(r => Object.assign(r, { s: stats(r) }));
  if (!list.length) {
    const none = src() === 'real' && H.real.state === 'ready' && !Object.keys(H.real.prog).length;
    body.innerHTML = `<div class="note">${ic('users')}<div>${none ? 'ยังไม่มีผู้เรียนส่งคะแนนเข้าระบบ เมื่อพนักงานเริ่มเรียนผ่านลิงก์นี้ คะแนนจะแสดงที่นี่อัตโนมัติ' : 'ไม่พบผู้เรียนตามเงื่อนไขที่เลือก'}</div></div>`;
    H.cd = null; return;
  }
  if (mapOn()) { H.cd = null; DA.skills.draw(body, list); return; }
  const n = list.length;
  const done = list.filter(r => r.s.st === 'done').length;
  const posts = list.flatMap(r => r.s.posts), gains = list.flatMap(r => r.s.gains);
  const waitPairs = list.reduce((a, r) => a + r.s.wait, 0), waitPeople = list.filter(r => r.s.wait).length;
  const aPost = avg(posts), aGain = avg(gains);
  const brs = new Set(list.map(branchOf)).size;
  const sorted = list.slice().sort((a, b) => ['wait', 'prog', 'done', 'none'].indexOf(a.s.st) - ['wait', 'prog', 'done', 'none'].indexOf(b.s.st) || b.s.last - a.s.last);
  body.innerHTML = `
    <div class="kpis">
      <div class="kpi"><span>ผู้เรียนทั้งหมด</span><b>${n}</b><small>${brs} สาขา</small></div>
      <div class="kpi"><span>ผ่านครบทุกบท</span><b>${done}</b><small>${Math.round(done / n * 100)}% ของผู้เรียน</small></div>
      <div class="kpi"><span>คะแนนหลังเรียนเฉลี่ย</span><b>${aPost == null ? '–' : aPost + '%'}</b><small>เกณฑ์ผ่าน ${PASS}%</small></div>
      <div class="kpi"><span>พัฒนาการเฉลี่ย</span><b class="${aGain > 0 ? 'up' : ''}">${aGain == null ? '–' : sgn(aGain)}</b><small>คะแนน หลังเทียบก่อนเรียน</small></div>
      <div class="kpi"><span>รอประเมินหน้างาน</span><b>${waitPairs}</b><small>บท จากผู้เรียน ${waitPeople} คน</small></div>
    </div>
    <div class="charts">
      <div class="chart" id="ch-dumb"><h4>คะแนนก่อนและหลังเรียน รายบท</h4><div class="sub">ค่าเฉลี่ยของผู้เรียนที่ทำแบบทดสอบแล้ว (%)</div>
        <div class="legend"><span><i class="dot" style="background:var(--c-pre)"></i>ก่อนเรียน</span><span><i class="dot" style="background:var(--c-post)"></i>หลังเรียน</span><span><i class="line"></i>เกณฑ์ผ่าน ${PASS}%</span></div>
        <div class="cv"></div><div class="tt" aria-hidden="true"></div><div class="tv"></div></div>
      <div class="chart" id="ch-br"><h4>สถานะผู้เรียนแยกตามสาขา</h4><div class="sub">จำนวนคน แบ่งตามความคืบหน้า</div>
        <div class="legend">${ST_ORDER.map(k => `<span><i style="background:${ST[k].col}"></i>${ST[k].label}</span>`).join('')}</div>
        <div class="cv"></div><div class="tt" aria-hidden="true"></div><div class="tv"></div></div>
    </div>
    <div class="sec-head" style="margin:26px 0 12px;align-items:center"><div><h3 style="font-size:19px;font-weight:500">รายชื่อผู้เรียน</h3></div>
      <span class="muted" style="font-size:13.5px">คลิกชื่อเพื่อดูรายละเอียดและบันทึกผลประเมินหน้างาน</span></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>ผู้เรียน</th><th>สาขา</th><th>บทที่สอบผ่าน</th><th class="num">ก่อนเรียน</th><th class="num">หลังเรียน</th><th>สถานะ</th><th>ใช้งานล่าสุด</th></tr></thead>
      <tbody>${sorted.map(rowHTML).join('')}</tbody></table></div>`;
  H.cd = chartData(list);
  drawCharts();
  observe(body);
}
function rowHTML(r) {
  const p = r.prog.profile, s = r.s, tot = DRAFT.length;
  return `<tr class="click" data-act="hr-person" data-id="${esc(r.id)}">
    <td><button class="lnk" data-act="hr-person" data-id="${esc(r.id)}">${esc(nameOf(r))}</button>${p.nickname || p.empCode ? `<small class="muted" style="display:block;font-size:12.5px">${[p.empCode, p.nickname].filter(Boolean).map(esc).join(' · ')}</small>` : ''}</td>
    <td>${esc(branchOf(r))}</td>
    <td><div style="display:flex;align-items:center;gap:8px;min-width:120px"><div class="bar${s.passed === tot ? ' ok' : ''}" style="flex:1"><i style="width:${Math.round(s.passed / tot * 100)}%"></i></div><span class="muted" style="font-size:13px;font-variant-numeric:tabular-nums">${s.passed}/${tot}</span></div></td>
    <td class="num">${s.pre == null ? '–' : s.pre + '%'}</td>
    <td class="num">${s.post == null ? '–' : `<b style="font-weight:500">${s.post}%</b>`}</td>
    <td>${stCell(s.st)}</td>
    <td style="white-space:nowrap">${rel(s.last)}</td></tr>`;
}

/* ── กราฟ ── */
function chartData(list) {
  const mods = DRAFT.map(m => {
    const pre = [], post = [];
    for (const r of list) { const md = gm(m.id, r.prog); if (md.pre) pre.push(md.pre.score); if (md.post) post.push(md.post.best); }
    return { m, pre: avg(pre), post: avg(post), nPre: pre.length, nPost: post.length };
  });
  const map = {};
  for (const r of list) { const b = branchOf(r); (map[b] || (map[b] = { name: b, done: 0, wait: 0, prog: 0, none: 0, tot: 0 }))[r.s.st]++; map[b].tot++; }
  const brs = Object.values(map).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  return { mods, brs };
}
function observe(body) {
  if (H.ro || typeof ResizeObserver !== 'function') return;
  let w = 0, t = null;
  H.ro = new ResizeObserver(es => {
    const nw = Math.round(es[0].contentRect.width);
    if (Math.abs(nw - w) < 8) return;
    w = nw; clearTimeout(t); t = setTimeout(() => { if ($('#ch-dumb')) drawCharts(); }, 80);
  });
  H.ro.observe($('#main'));
}
function drawCharts() {
  if (!H.cd) return;
  drawDumbbell($('#ch-dumb'), H.cd.mods);
  drawBranches($('#ch-br'), H.cd.brs);
}
const wOf = box => Math.max(260, Math.floor($('.cv', box).clientWidth || 300));
function drawDumbbell(box, mods) {
  if (!box) return;
  const W = wOf(box), rowH = 34, top = 6, lw = 58, X0 = lw + 10, X1 = W - 36;
  const Hh = top + mods.length * rowH + 26;
  const x = v => X0 + v / 100 * (X1 - X0);
  const tips = [];
  let g = '';
  for (let v = 0; v <= 100; v += 20) g += `<line class="gl" x1="${x(v)}" x2="${x(v)}" y1="${top}" y2="${top + mods.length * rowH}"/><text x="${x(v)}" y="${top + mods.length * rowH + 18}" text-anchor="middle">${v}</text>`;
  g += `<line x1="${x(PASS)}" x2="${x(PASS)}" y1="${top - 2}" y2="${top + mods.length * rowH}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  let hits = '', marks = '';
  mods.forEach((d, i) => {
    const cy = top + i * rowH + rowH / 2, no = modNo(d.m);
    hits += `<rect class="hit" data-i="${i}" x="0" y="${top + i * rowH}" width="${W}" height="${rowH}" rx="6" tabindex="0" role="img" aria-label="บทที่ ${no}: ก่อนเรียน ${d.pre == null ? 'ไม่มีข้อมูล' : d.pre + '%'} หลังเรียน ${d.post == null ? 'ไม่มีข้อมูล' : d.post + '%'}"/>`;
    marks += `<text class="lab" x="0" y="${cy + 4}">บทที่ ${no}</text>`;
    if (d.pre == null && d.post == null) { marks += `<text x="${X0}" y="${cy + 4}">ยังไม่มีข้อมูล</text>`; }
    else {
      if (d.pre != null && d.post != null) marks += `<line x1="${x(d.pre)}" x2="${x(d.post)}" y1="${cy}" y2="${cy}" stroke="var(--border-2)" stroke-width="3" stroke-linecap="round"/>`;
      if (d.pre != null) marks += `<circle cx="${x(d.pre)}" cy="${cy}" r="6" fill="var(--c-pre)" stroke="var(--surface)" stroke-width="2"/>`;
      if (d.post != null) marks += `<circle cx="${x(d.post)}" cy="${cy}" r="6" fill="var(--c-post)" stroke="var(--surface)" stroke-width="2"/><text class="lab" x="${x(d.post) + 11}" y="${cy + 4}">${d.post}</text>`;
    }
    tips.push(`<b>บทที่ ${no} · ${esc(d.m.title)}</b><br><i style="background:var(--c-pre)"></i>ก่อนเรียน ${d.pre == null ? '–' : d.pre + '%'}<br><i style="background:var(--c-post)"></i>หลังเรียน ${d.post == null ? '–' : d.post + '%'}`
      + (d.pre != null && d.post != null ? `<br>พัฒนาการ ${sgn(d.post - d.pre)} คะแนน` : '') + `<br>สอบหลังเรียนแล้ว ${d.nPost} คน`);
  });
  $('.cv', box).innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" role="group" aria-label="กราฟคะแนนก่อนและหลังเรียนรายบท">${g}${hits}<g style="pointer-events:none">${marks}</g></svg>`;
  $('.tv', box).innerHTML = `<details class="tview"><summary>${ic('list')}ดูเป็นตาราง</summary><div class="tbl-wrap"><table>
    <thead><tr><th>บทเรียน</th><th class="num">ก่อนเรียน</th><th class="num">หลังเรียน</th><th class="num">พัฒนาการ</th><th class="num">สอบแล้ว</th></tr></thead><tbody>
    ${mods.map(d => `<tr><td>บทที่ ${modNo(d.m)} ${esc(d.m.title)}</td><td class="num">${d.pre == null ? '–' : d.pre + '%'}</td><td class="num">${d.post == null ? '–' : d.post + '%'}</td><td class="num">${d.pre != null && d.post != null ? sgn(d.post - d.pre) : '–'}</td><td class="num">${d.nPost}</td></tr>`).join('')}
    </tbody></table></div></details>`;
  wireTips(box, tips);
}
function drawBranches(box, brs) {
  if (!box) return;
  const W = wOf(box), rowH = 36, bh = 20, lw = Math.min(120, Math.round(W * 0.26)), X0 = lw + 10, X1 = W - 46;
  const max = Math.max(1, ...brs.map(b => b.tot)), sc = (X1 - X0) / max;
  const Hh = brs.length * rowH + 4, maxCh = Math.max(4, Math.floor(lw / 8));
  const tips = [];
  let marks = '', segs = '';
  brs.forEach((b, i) => {
    const y = 2 + i * rowH + (rowH - bh) / 2, cy = 2 + i * rowH + rowH / 2;
    const nm = b.name.length > maxCh ? b.name.slice(0, maxCh - 1) + '…' : b.name;
    marks += `<text class="lab" x="0" y="${cy + 4}">${esc(nm)}</text><text class="lab" x="${X0 + b.tot * sc + 8}" y="${cy + 4}">${b.tot} คน</text>`;
    let xx = X0;
    const parts = ST_ORDER.filter(k => b[k]);
    parts.forEach((k, j) => {
      const w = b[k] * sc, last = j === parts.length - 1;
      tips.push(`<b>${esc(b.name)}</b><br><i style="background:${ST[k].col}"></i>${ST[k].label} ${b[k]} คน (${Math.round(b[k] / b.tot * 100)}%)<br>รวมทั้งสาขา ${b.tot} คน`);
      segs += `<rect class="sg" data-i="${tips.length - 1}" x="${xx.toFixed(1)}" y="${y}" width="${Math.max(2, w - (last ? 0 : 2)).toFixed(1)}" height="${bh}" rx="3" fill="${ST[k].col}" tabindex="0" role="img" aria-label="${esc(b.name)} ${ST[k].label} ${b[k]} คน"/>`;
      xx += w;
    });
  });
  $('.cv', box).innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" role="group" aria-label="กราฟสถานะผู้เรียนแยกตามสาขา">${segs}<g style="pointer-events:none">${marks}</g></svg>`;
  $('.tv', box).innerHTML = `<details class="tview"><summary>${ic('list')}ดูเป็นตาราง</summary><div class="tbl-wrap"><table>
    <thead><tr><th>สาขา</th>${ST_ORDER.map(k => `<th class="num">${ST[k].label}</th>`).join('')}<th class="num">รวม</th></tr></thead><tbody>
    ${brs.map(b => `<tr><td>${esc(b.name)}</td>${ST_ORDER.map(k => `<td class="num">${b[k]}</td>`).join('')}<td class="num">${b.tot}</td></tr>`).join('')}
    </tbody></table></div></details>`;
  wireTips(box, tips);
}
function wireTips(box, tips) {
  const tt = $('.tt', box), cv = $('.cv', box);
  cv._tips = tips;
  if (cv._wired) return;
  cv._wired = true;
  const show = (el, cx, cy) => {
    tt.innerHTML = cv._tips[+el.dataset.i] || ''; tt.classList.add('on');
    const b = box.getBoundingClientRect(), w = tt.offsetWidth, h = tt.offsetHeight;
    let L = cx - b.left + 14, T = cy - b.top + 14;
    if (L + w > b.width - 6) L = cx - b.left - w - 14;
    if (T + h > b.height - 6) T = cy - b.top - h - 14;
    tt.style.left = Math.max(6, L) + 'px'; tt.style.top = Math.max(6, T) + 'px';
  };
  const hide = () => tt.classList.remove('on');
  const onPt = e => { const el = e.target.closest && e.target.closest('[data-i]'); if (el && cv.contains(el)) show(el, e.clientX, e.clientY); else hide(); };
  cv.addEventListener('pointermove', onPt);
  cv.addEventListener('pointerdown', onPt);
  cv.addEventListener('pointerleave', hide);
  cv.addEventListener('focusin', e => { const el = e.target.closest('[data-i]'); if (!el) return; const r = el.getBoundingClientRect(); show(el, r.left + Math.min(r.width / 2, 120), r.top + r.height / 2); });
  cv.addEventListener('focusout', hide);
}

/* ── ส่งออก CSV ── */
const cell = v => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
async function exportCsv() {
  const k = src(), list = filtered().map(r => Object.assign(r, { s: stats(r) }));
  if (!list.length) { toast('ไม่มีข้อมูลให้ส่งออก'); return; }
  /* เวอร์ชันเว็บมีรหัสพนักงานจากทะเบียนผู้ใช้ จึงใส่เป็นคอลัมน์แรกไว้ใช้อ้างอิงกับระบบ HR (ใน Artifact ไม่มีคอลัมน์นี้) */
  const emp = list.some(r => r.prog.profile.empCode);
  const head = (emp ? ['รหัสพนักงาน'] : []).concat(['ชื่อ', 'ชื่อเล่น', 'สาขา', 'วันที่เริ่มงาน', 'สถานะ', 'บทที่สอบผ่าน', 'เฉลี่ยก่อนเรียน (%)', 'เฉลี่ยหลังเรียน (%)']);
  DRAFT.forEach(m => head.push(`บทที่ ${modNo(m)} ก่อนเรียน`, `บทที่ ${modNo(m)} หลังเรียน`, `บทที่ ${modNo(m)} สถานะ`));
  head.push('ใช้งานล่าสุด');
  const rows = [head];
  for (const r of list) {
    const p = r.prog.profile, s = r.s;
    const row = (emp ? [p.empCode || ''] : []).concat([nameOf(r), p.nickname, branchOf(r)]);
    row.push(p.startDate, ST[s.st].label, `${s.passed}/${DRAFT.length}`, s.pre == null ? '' : s.pre, s.post == null ? '' : s.post);
    DRAFT.forEach(m => { const md = gm(m.id, r.prog), st = modStatus(m, r.prog, r.so); row.push(md.pre ? md.pre.score : '', md.post ? md.post.best : '', st.short || st.label); });
    row.push(s.last ? new Date(s.last).toLocaleString('th-TH') : '');
    rows.push(row);
  }
  const d = new Date(), ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const filename = (k === 'sample' ? 'da-training-sample-' : 'da-training-scores-') + ymd + '.csv';
  const tsv = () => rows.map(r => r.map(v => String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n');
  if (!S.downloads || H.noDl) { await DA.copyText(tsv()); toast('คัดลอกตารางแล้ว วางใน Excel หรือ Google Sheets ได้เลย'); return; }
  try {
    await S.downloads.save({ filename, data: '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n') });
    toast('ส่งออกไฟล์ ' + filename + ' แล้ว');
  } catch (e) {
    const c = errCode(e);
    if (c === 'declined') return;
    if (c === 'rate_limited') { toast('มีหน้าต่างยืนยันเปิดอยู่ ลองใหม่อีกครั้งสักครู่'); return; }
    H.noDl = true;
    await DA.copyText(tsv()); toast('ดาวน์โหลดไม่ได้ในหน้านี้ จึงคัดลอกตารางให้แทน วางใน Excel ได้เลย');
  }
}

/* ── รายบุคคล ── */
function personRow() {
  const r = S.route, k = r.src || src();
  if (k === 'real') { const p = H.real.prog[r.id], ov = DA.platform && DA.platform.overlay; return p ? { id: r.id, prog: (ov && ov(r.id, p)) || p, so: H.real.so[r.id] || null, k } : null; }
  if (!H.sample) buildSample();
  const x = H.sample.find(s => s.id === r.id);
  return x ? { id: x.id, prog: x.prog, so: H.sampleSo[x.id] || null, k } : null;
}
const evaluator = () => { const v = DA.lsGet(EVAL_KEY); return typeof v === 'string' ? v.slice(0, 60) : ''; };
function renderPerson(main, id) {
  ensureSub();
  const r = personRow();
  const back = `<button class="btn btn-text btn-sm" data-act="hr-view" data-v="${mapOn() ? 'map' : 'dash'}" style="margin:-8px 0 10px -10px">${ic('arrowL')}${mapOn() ? 'กลับไปแผนที่ทักษะ' : 'กลับไปภาพรวม HR'}</button>`;
  if (!r) {
    const loading = S.route.src === 'real' && H.real.state !== 'ready' && H.real.state !== 'error';
    main.innerHTML = `<section class="section-tight"><div class="wrap">${back}<div class="note${loading ? '' : ' warn'}">${ic(loading ? 'cloud' : 'info')}<div>${loading ? 'กำลังโหลดข้อมูลผู้เรียน…' : 'ไม่พบข้อมูลผู้เรียนคนนี้'}</div></div></div></section>`;
    return;
  }
  const real = r.k === 'real';
  main.innerHTML = `<section class="section-tight"><div class="wrap fade-in">${back}
    ${real ? '' : `<div class="banner">${ic('sparkle')}<div><b style="font-weight:500">ข้อมูลตัวอย่างเพื่อการสาธิต</b> · ชื่อและคะแนนสมมติ การติ๊กประเมินในหน้านี้ไม่ถูกบันทึก</div></div>`}
    <div id="p-top"></div>
    <div class="card" style="padding:20px 22px;margin-top:16px">
      <h3 style="font-size:18px;font-weight:500;color:var(--brand-text)">ประเมินหน้างาน</h3>
      <p class="muted small" style="margin-top:4px">หัวหน้าหรือพี่เลี้ยงติ๊กแต่ละข้อเมื่อเห็นผู้เรียนทำได้จริงข้างเก้าอี้ ผู้เรียนจะ “ผ่านสมบูรณ์” ในบทนั้นเมื่อสอบหลังเรียนผ่าน ${PASS}% และได้รับการประเมินครบทุกข้อ${real ? ' · ผลบันทึกเข้าระบบทันทีและผู้เรียนเห็นในหน้าของตนเอง' : ''}</p>
      <div class="save-row"><label for="hr-eval" style="font-size:14px;font-weight:500">ชื่อผู้ประเมิน</label><input id="hr-eval" maxlength="60" placeholder="เช่น หัวหน้าผู้ช่วยทันตแพทย์ สาขา A" value="${esc(evaluator())}"></div>
    </div>
    <div class="person-mods" id="pm-list"></div>
  </div></section>`;
  $('#hr-eval').addEventListener('input', e => DA.lsSet(EVAL_KEY, e.target.value.trim().slice(0, 60)));
  refreshPerson();
}
function refreshPerson() {
  const top = $('#p-top'), listEl = $('#pm-list');
  if (!top || !listEl) return;
  const r = personRow();
  if (!r) return;
  const p = r.prog.profile, s = stats(r), st = ST[s.st];
  const ini = (p.name || '?').replace(/^[เแโใไ]/, '').charAt(0);
  top.innerHTML = `<div class="card" style="padding:20px 22px"><div class="prof" style="flex-wrap:wrap">
      <span class="avatar" aria-hidden="true">${esc(ini)}</span>
      <div style="flex:1;min-width:180px"><div class="eyebrow">ผู้เรียน</div>
        <h2 style="color:var(--brand-text);font-size:clamp(22px,2.6vw,28px)">${esc(nameOf(r))}${p.nickname ? ` <span class="muted" style="font-size:.7em;font-weight:400">(${esc(p.nickname)})</span>` : ''}</h2>
        <div class="muted small">${p.empCode ? 'รหัส ' + esc(p.empCode) + ' · ' : ''}${esc(branchOf(r))}${p.startDate ? ' · เริ่มงาน ' + esc(fmtDate(new Date(p.startDate).getTime())) : ''} · ใช้งานล่าสุด ${rel(s.last)}</div></div>
      <span class="chip ${st.chip}" style="font-size:13.5px;padding:5px 12px">${st.label}</span></div></div>
    <div class="kpis k4">
      <div class="kpi"><span>บทที่สอบผ่าน</span><b>${s.passed}/${DRAFT.length}</b><small>เกณฑ์ ${PASS}%</small></div>
      <div class="kpi"><span>เฉลี่ยก่อนเรียน</span><b>${s.pre == null ? '–' : s.pre + '%'}</b><small>${s.pres.length} บท</small></div>
      <div class="kpi"><span>เฉลี่ยหลังเรียน</span><b class="${s.gain > 0 ? 'up' : ''}">${s.post == null ? '–' : s.post + '%'}</b><small>${s.gain == null ? '&nbsp;' : sgn(s.gain) + ' คะแนน'}</small></div>
      <div class="kpi"><span>รอประเมินหน้างาน</span><b>${s.wait}</b><small>บท</small></div></div>`;
  const f = document.activeElement, fk = f && f.dataset && f.dataset.act === 'hr-sign' ? `[data-m="${f.dataset.m}"][data-i="${f.dataset.i}"]` : '';
  listEl.innerHTML = DRAFT.map(m => cardHTML(m, r)).join('');
  if (fk) { const el = listEl.querySelector(fk); if (el) el.focus(); }
}
function cardHTML(m, r) {
  const md = gm(m.id, r.prog), st = modStatus(m, r.prog, r.so);
  const so = r.so && r.so.modules[m.id];
  const pd = m.practice.map(p => md.practice[p.id]).filter(Boolean), pAvg = avg(pd.map(x => x.best));
  const items = m.checklist.map((t, i) => {
    const on = !!(so && so.items[i]);
    return `<button class="cl-item${on ? ' ok' : ''}" data-act="hr-sign" data-m="${m.id}" data-i="${i}" aria-pressed="${on}"><span class="bx">${on ? ic('check') : ''}</span><span>${esc(t)}</span></button>`;
  }).join('');
  const nOn = so ? so.items.filter(Boolean).length : 0;
  return `<div class="pm">
    <h4><span>บทที่ ${modNo(m)} · ${esc(m.title)}</span><span class="chip ${st.chip}">${esc(st.short || st.label)}</span></h4>
    <div class="row">
      <span class="chip">ก่อนเรียน ${md.pre ? md.pre.score + '%' : '–'}</span>
      <span class="chip${md.post && md.post.best >= PASS ? ' chip-ok' : md.post ? ' chip-bad' : ''}">หลังเรียน ${md.post ? md.post.best + '%' + (md.post.attempts > 1 ? ` · สอบ ${md.post.attempts} ครั้ง` : '') : '–'}</span>
      <span class="chip">แบบฝึก ${pd.length}/${m.practice.length}${pAvg == null ? '' : ` · เฉลี่ย ${pAvg}%`}</span>
    </div>
    <div class="cl">${items}</div>
    <div class="muted" style="font-size:13px;margin-top:10px">ประเมินแล้ว ${nOn}/${m.checklist.length} ข้อ${so && so.by ? ` · ล่าสุดโดย ${esc(so.by)} ${esc(fmtDate(so.at))}` : ''}</div>
  </div>`;
}
function sign(el) {
  const ev = evaluator();
  if (!ev) { toast('กรอกชื่อผู้ประเมินก่อนติ๊กผล'); const inp = $('#hr-eval'); if (inp) inp.focus(); return; }
  const r = personRow(); if (!r) return;
  const m = modById(el.dataset.m), i = +el.dataset.i;
  if (!m || !(i >= 0 && i < m.checklist.length)) return;
  const store = r.k === 'real' ? H.real.so : H.sampleSo;
  const cur = store[r.id] ? clone(store[r.id]) : { modules: {} };
  const ms = cur.modules[m.id] || { items: m.checklist.map(() => false), by: '', at: 0 };
  ms.items[i] = !ms.items[i]; ms.by = ev; ms.at = Date.now();
  cur.modules[m.id] = ms; store[r.id] = cur;
  const wasDone = modStatus(m, r.prog, r.so).key === 'done', nowDone = modStatus(m, r.prog, cur).key === 'done';
  refreshPerson();
  if (!wasDone && nowDone) toast(`บทที่ ${modNo(m)} ผ่านสมบูรณ์แล้ว`);
  if (r.k === 'real') queueWrite(r.id);
}
function queueWrite(uid) {
  H.pend[uid] = (H.pend[uid] || 0) + 1;
  const prev = H.queue[uid] || Promise.resolve();
  H.queue[uid] = prev.then(() => retryOnce(() => S.db.doc('signoffs/' + uid).set({ v: 1, modules: clone(H.real.so[uid].modules), updatedAt: Date.now() })))
    .then(() => { H.pend[uid]--; }, e => {
      H.pend[uid]--;
      toast('บันทึกผลประเมินไม่สำเร็จ (' + errCode(e) + ') กรุณาลองอีกครั้ง');
      if (!H.pend[uid]) { const sv = H.real.soServer[uid]; if (sv) H.real.so[uid] = clone(sv); else delete H.real.so[uid]; onData(); }
    });
}

/* ── ลงทะเบียน ── */
DA.hr = { render, renderPerson, refreshHead: () => { const h = $('#hr-head'); if (h && S.route.name === 'hr') h.innerHTML = headHTML(); } };
DA.hr.api = { filtered, rowsOf, src, stats, branchOf, nameOf, ST, ST_ORDER, rel, wireTips, redraw: () => renderBody(), setBranch };
Object.assign(DA.acts, {
  'hr-view': el => setView(el.dataset.v),
  'hr-src': el => { H.src = el.dataset.v === 'real' ? 'real' : 'sample'; H.branch = ''; refreshDash(); },
  'hr-person': el => DA.go({ name: 'person', id: el.dataset.id, src: src() }),
  'hr-csv': () => { exportCsv(); },
  'hr-sign': el => sign(el)
});
})();
