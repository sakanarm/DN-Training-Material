/* DA Training Academy — แบบฝึกปฏิบัติแบบ Interactive 7 รูปแบบ
   แต่ละแบบรับ (host, cfg, ctx) แล้วเรียก ctx.done(คะแนน 0–100, {note, timeSec}) เมื่อจบ */
(function () {
'use strict';
const DA = window.DA, E = DA.engines, KEYS = DA.KEYS;
const $$ = (s, r) => [...r.querySelectorAll(s)];

/* ── เรียงลำดับขั้นตอน ── */
E.sequence = function (host, cfg, ctx) {
  const { esc, ic, shuffle } = ctx, items = cfg.items, n = items.length;
  let pool = shuffle(items.map((_, i) => i));
  if (pool.every((v, i) => v === i)) pool.reverse();
  const slots = Array(n).fill(null);
  let checked = false;
  function render() {
    const filled = slots.filter(v => v != null).length;
    host.innerHTML = `
      <div class="stage-bar"><span>แตะขั้นตอนด้านล่างเรียงจากขั้นแรก · แตะช่องที่วางแล้วเพื่อนำออก</span><span class="pill-n">${filled}/${n}</span></div>
      <div class="seq-slots">${slots.map((v, i) => {
        if (v == null) return `<div class="slot"><span class="no">${i + 1}</span><span class="ph">ขั้นที่ ${i + 1}</span></div>`;
        const st = checked ? (v === i ? ' ok' : ' no-') : ' fill';
        return `<button class="slot${st}" data-slot="${i}"${checked ? ' disabled' : ''}><span class="no">${checked ? (v === i ? '✓' : '✕') : i + 1}</span><span>${esc(items[v])}${checked && v !== i ? `<span class="fix">ขั้นที่ ${i + 1} ที่ถูกคือ: ${esc(items[i])}</span>` : ''}</span></button>`;
      }).join('')}</div>
      ${checked ? '' : `<div class="pool">${pool.map(v => `<button class="tok" data-tok="${v}">${esc(items[v])}</button>`).join('')}</div>
      <div class="stepnav" style="justify-content:flex-end"><button class="btn btn-brand" data-chk${filled < n ? ' disabled' : ''}>${ic('check')}ตรวจคำตอบ</button></div>`}`;
  }
  host.onclick = e => {
    if (checked) return;
    const tok = e.target.closest('[data-tok]'), sl = e.target.closest('[data-slot]'), chk = e.target.closest('[data-chk]');
    if (tok) { const v = +tok.dataset.tok, i = slots.indexOf(null); if (i < 0) return; slots[i] = v; pool = pool.filter(x => x !== v); render(); }
    else if (sl) { const i = +sl.dataset.slot; if (slots[i] == null) return; pool.push(slots[i]); slots[i] = null; render(); }
    else if (chk) {
      checked = true; render();
      const ok = slots.filter((v, i) => v === i).length;
      ctx.done(ok / n * 100, { note: `วางถูกตำแหน่ง ${ok}/${n} ขั้น` });
    }
  };
  render();
};

/* ── จับคู่ ── */
E.match = function (host, cfg, ctx) {
  const { esc, shuffle } = ctx, P = cfg.pairs, n = P.length, isImg = P.some(p => p.img);
  const L = shuffle(P.map((_, i) => i)), R = shuffle(P.map((_, i) => i));
  const done = new Map(), missed = new Set();
  let sel = null, busy = false;
  host.innerHTML = `
    <div class="stage-bar"><span>แตะรายการทางซ้าย แล้วแตะคู่ที่ตรงกันทางขวา (เริ่มฝั่งไหนก็ได้)</span><span class="pill-n" data-cnt>0/${n} คู่</span></div>
    <div class="match">
      <div class="col"><h5>${isImg ? 'ภาพเครื่องมือ' : 'หัวข้อ'}</h5>${L.map((i, k) => P[i].img
        ? `<button class="mt img" data-s="L" data-i="${i}"><img src="${esc(P[i].img)}" alt="ภาพที่ ${k + 1}"></button>`
        : `<button class="mt" data-s="L" data-i="${i}">${esc(P[i].a)}</button>`).join('')}</div>
      <div class="col"><h5>${isImg ? 'ชื่อเครื่องมือ' : 'คู่ที่ตรงกัน'}</h5>${R.map(i => `<button class="mt" data-s="R" data-i="${i}">${esc(P[i].b)}</button>`).join('')}</div>
    </div>`;
  const btn = (s, i) => host.querySelector(`.mt[data-s="${s}"][data-i="${i}"]`);
  host.onclick = e => {
    const b = e.target.closest('.mt'); if (!b || busy) return;
    const s = b.dataset.s, i = +b.dataset.i;
    if (done.has(i) && b.classList.contains('done')) return;
    if (!sel || sel.s === s) {
      if (sel) btn(sel.s, sel.i).classList.remove('sel');
      sel = (sel && sel.s === s && sel.i === i) ? null : { s, i };
      if (sel) b.classList.add('sel');
      return;
    }
    const a = btn(sel.s, sel.i);
    const li = s === 'L' ? i : sel.i;
    if (sel.i === i) {
      done.set(i, done.size + 1);
      [a, b].forEach(x => { x.classList.remove('sel'); x.classList.add('done'); x.disabled = true; x.insertAdjacentHTML('beforeend', `<span class="tag">${done.get(i)}</span>`); });
      sel = null;
      host.querySelector('[data-cnt]').textContent = `${done.size}/${n} คู่`;
      if (done.size === n) { const ok = n - missed.size; ctx.done(ok / n * 100, { note: `จับคู่ถูกตั้งแต่ครั้งแรก ${ok}/${n} คู่` }); }
    } else {
      missed.add(li); busy = true;
      a.classList.remove('sel'); [a, b].forEach(x => x.classList.add('no'));
      setTimeout(() => { [a, b].forEach(x => x.classList.remove('no')); busy = false; }, 450);
      sel = null;
    }
  };
};

/* ── จับผิด ── */
E.spot = function (host, cfg, ctx) {
  const { esc, ic, shuffle } = ctx, items = shuffle(cfg.items), nb = items.filter(x => x.bad).length;
  const on = new Set();
  host.innerHTML = `
    <div class="stage-bar"><span>ในรายการนี้มีข้อที่ไม่ถูกต้อง <b style="font-weight:600;color:var(--text)">${nb} ข้อ</b> แตะเพื่อเลือก แตะซ้ำเพื่อยกเลิก</span><span class="pill-n" data-cnt>เลือก 0 ข้อ</span></div>
    <div class="spot">${items.map((x, i) => `<button class="sp" data-i="${i}" aria-pressed="false"><span class="bx"></span><span>${esc(x.x)}<span class="res"></span></span></button>`).join('')}</div>
    <div class="stepnav" style="justify-content:flex-end"><button class="btn btn-brand" data-chk>${ic('check')}ตรวจคำตอบ</button></div>`;
  let checked = false;
  host.onclick = e => {
    if (checked) return;
    const b = e.target.closest('.sp');
    if (b) {
      const i = +b.dataset.i;
      if (on.has(i)) on.delete(i); else on.add(i);
      b.classList.toggle('on', on.has(i)); b.setAttribute('aria-pressed', on.has(i));
      b.querySelector('.bx').innerHTML = on.has(i) ? ic('x') : '';
      host.querySelector('[data-cnt]').textContent = `เลือก ${on.size} ข้อ`;
      return;
    }
    if (!e.target.closest('[data-chk]')) return;
    checked = true;
    let hit = 0, fp = 0;
    $$('.sp', host).forEach(b => {
      const x = items[+b.dataset.i], p = on.has(+b.dataset.i), res = b.querySelector('.res'), bx = b.querySelector('.bx');
      b.disabled = true; b.classList.remove('on');
      if (x.bad && p) { hit++; b.classList.add('r-hit'); bx.innerHTML = ic('check'); res.textContent = 'จับผิดได้ถูกต้อง' + (x.why ? ' · ' + x.why : ''); }
      else if (x.bad) { b.classList.add('r-miss'); bx.innerHTML = ic('warn'); res.textContent = 'พลาดข้อนี้ไป' + (x.why ? ' · ' + x.why : ''); }
      else if (p) { fp++; b.classList.add('r-false'); bx.innerHTML = ''; res.textContent = 'ข้อนี้ถูกต้องอยู่แล้ว ไม่ใช่ข้อผิด'; }
      else b.classList.add('r-fine');
    });
    host.querySelector('[data-chk]').remove();
    ctx.done(Math.max(0, hit - fp) / nb * 100, { note: `พบข้อผิด ${hit}/${nb} ข้อ${fp ? ` · เลือกผิด ${fp} ข้อ` : ''}` });
  };
};

/* ── สถานการณ์จำลอง ── */
E.scenario = function (host, cfg, ctx) {
  const { esc, ic, shuffle } = ctx, steps = cfg.steps, n = steps.length, res = [];
  let k = 0;
  function show() {
    const s = steps[k], ord = shuffle(s.c.map((_, i) => i));
    let first = true;
    host.innerHTML = `
      <div class="stage-bar"><span class="steps-dots" aria-hidden="true">${steps.map((_, i) => `<i class="${i < k ? (res[i] ? 'ok' : 'no') : i === k ? 'on' : ''}"></i>`).join('')}</span><span class="pill-n">ช่วงที่ ${k + 1}/${n}</span></div>
      <div class="scene fade-in"><span class="av">${ic('chat')}</span><div class="qq" style="margin:0">${esc(s.q)}</div></div>
      <div class="choices">${ord.map((ci, j) => `<button class="choice" data-c="${ci}"><span class="k">${KEYS[j]}</span><span>${esc(s.c[ci])}</span></button>`).join('')}</div>
      <div class="fb" aria-live="polite"></div>`;
    host.onclick = e => {
      const b = e.target.closest('.choice');
      if (b && !b.disabled) {
        const fb = host.querySelector('.fb');
        if (+b.dataset.c !== s.a) {
          first = false; b.classList.add('no'); b.disabled = true;
          fb.innerHTML = `<div class="hint">${ic('bulb')}<span>${esc(s.hint || 'ยังไม่ใช่ ลองนึกถึงความปลอดภัยของคนไข้และขั้นตอนมาตรฐาน แล้วเลือกใหม่')}</span></div>`;
          return;
        }
        res[k] = first;
        b.classList.add('ok');
        $$('.choice', host).forEach(x => { x.disabled = true; if (x !== b && !x.classList.contains('no')) x.classList.add('dim'); });
        const last = k === n - 1;
        fb.innerHTML = `<div class="why ok">${ic('check')}<div><b>${first ? 'ถูกต้อง!' : 'ใช่แล้ว'}</b> ${esc(s.why || '')}</div></div>
          <div class="stepnav" style="justify-content:flex-end"><button class="btn btn-brand" data-next>${last ? 'สรุปผล' : 'สถานการณ์ถัดไป'} ${ic('arrowR')}</button></div>`;
        host.querySelector('[data-next]').focus({ preventScroll: true });
        return;
      }
      if (e.target.closest('[data-next]')) {
        if (k < n - 1) { k++; show(); }
        else {
          host.querySelector('[data-next]').remove();
          host.querySelector('.steps-dots').innerHTML = steps.map((_, i) => `<i class="${res[i] ? 'ok' : 'no'}"></i>`).join('');
          const ok = res.filter(Boolean).length;
          ctx.done(ok / n * 100, { note: `ตัดสินใจถูกตั้งแต่ครั้งแรก ${ok}/${n} ช่วง` });
        }
      }
    };
  }
  show();
};

/* ── แผนภูมิฟัน FDI ── */
const T_NAME = ['', 'ฟันตัดซี่กลาง', 'ฟันตัดซี่ข้าง', 'ฟันเขี้ยว', 'ฟันกรามน้อยซี่ที่ 1', 'ฟันกรามน้อยซี่ที่ 2', 'ฟันกรามซี่ที่ 1', 'ฟันกรามซี่ที่ 2', 'ฟันกรามซี่ที่ 3 (ฟันคุด)'];
const Q_NAME = ['', 'บนขวา', 'บนซ้าย', 'ล่างซ้าย', 'ล่างขวา'];
const T_W = [0, 8.5, 6.5, 7.5, 7, 6.5, 10, 9, 8.5];
const toothName = t => `${T_NAME[t % 10]} ${Q_NAME[Math.floor(t / 10)]}`;
function toothLayout() {
  const cx = 190, rx = 150, ry = 165, out = [];
  const arch = (row, up, cy) => {
    const tot = row.reduce((a, t) => a + T_W[t % 10], 0);
    let acc = 0;
    row.forEach(t => {
      const w = T_W[t % 10], th = (175 - (acc + w / 2) / tot * 170) * Math.PI / 180;
      acc += w;
      const x = cx + rx * Math.cos(th), y = up ? cy - ry * Math.sin(th) : cy + ry * Math.sin(th);
      const deg = th * 180 / Math.PI, rot = up ? 90 - deg : deg - 90;
      out.push({ t, x, y, w: w * 3.15, h: w * 3.3, rot });
    });
  };
  arch([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], true, 196);
  arch([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38], false, 244);
  return out;
}
E.tooth = function (host, cfg, ctx) {
  const { esc, ic, shuffle } = ctx, TL = toothLayout(), rounds = cfg.rounds || 8;
  let mode = 'explore', qs = [], k = 0, right = 0, lock = false, mark = {};
  function svg(hide) {
    return `<svg viewBox="0 0 380 440" role="group" aria-label="แผนภูมิฟันแท้ 32 ซี่ ระบบ FDI">
      <line class="mid" x1="190" y1="8" x2="190" y2="432"/>
      <text class="lbl-b" x="190" y="118" text-anchor="middle">ขากรรไกรบน</text>
      <text class="lbl-b" x="190" y="332" text-anchor="middle">ขากรรไกรล่าง</text>
      <text class="lbl" x="106" y="170" text-anchor="middle">Q1</text><text class="lbl" x="274" y="170" text-anchor="middle">Q2</text>
      <text class="lbl" x="106" y="278" text-anchor="middle">Q4</text><text class="lbl" x="274" y="278" text-anchor="middle">Q3</text>
      <text class="lbl" x="6" y="224">← ขวาของคนไข้</text><text class="lbl" x="374" y="224" text-anchor="end">ซ้ายของคนไข้ →</text>
      ${TL.map(o => {
        const m = mark[o.t] || '', show = !hide || m;
        return `<g class="t${m ? ' ' + m : ''}" data-t="${o.t}" tabindex="0" role="button" aria-label="${hide ? 'ฟัน' : 'ฟัน ' + o.t}">
          <rect class="b" x="${(o.x - o.w / 2).toFixed(1)}" y="${(o.y - o.h / 2).toFixed(1)}" width="${o.w.toFixed(1)}" height="${o.h.toFixed(1)}" rx="${(o.w * .38).toFixed(1)}" transform="rotate(${o.rot.toFixed(1)} ${o.x.toFixed(1)} ${o.y.toFixed(1)})"/>
          ${show ? `<text x="${o.x.toFixed(1)}" y="${(o.y + 4).toFixed(1)}" text-anchor="middle">${o.t}</text>` : ''}</g>`;
      }).join('')}
    </svg>`;
  }
  function render(info) {
    const test = mode === 'test', q = qs[k];
    const prompt = mode === 'explore'
      ? `<small>โหมดสำรวจ · แตะซี่ใดก็ได้</small><b>ดูชื่อและตำแหน่งฟัน</b>`
      : mode === 'end' ? `<small>จบการทดสอบ</small><b>ตอบถูก ${right}/${qs.length} ซี่</b>`
      : `<small>ข้อ ${k + 1}/${qs.length} · ${q.byName ? 'หาจากชื่อ' : 'หาจากเลข'}</small><b>${q.byName ? 'แตะ ' + esc(toothName(q.t)) : 'แตะฟันซี่ ' + q.t}</b>`;
    host.innerHTML = `
      <div class="tooth-wrap">
        <div class="tooth-svg">${svg(test || mode === 'end')}</div>
        <div class="tside">
          <div class="tprompt">${prompt}</div>
          <div class="tinfo" aria-live="polite">${info || (mode === 'explore' ? 'เลขหลักแรก = ส่วน (Quadrant) 1–4 วนตามเข็มนาฬิกาจากบนขวาของคนไข้ · เลขหลักที่สอง = ซี่ที่ 1–8 นับจากแนวกลาง' : test ? 'เลขบนฟันถูกซ่อนไว้ ใช้หลักการนับจากแนวกลาง' : '')}</div>
          ${mode === 'explore' ? `<button class="btn btn-cta" data-start>${ic('target')}เริ่มทดสอบ ${rounds} ข้อ</button>` : ''}
          ${test ? `<div class="stage-bar" style="margin:0"><span>ถูก ${right} ข้อ</span><span class="pill-n">${k + 1}/${qs.length}</span></div>` : ''}
        </div>
      </div>`;
  }
  function pick(t) {
    if (mode === 'explore') {
      mark = { [t]: 'sel' };
      render(`<b>${t}</b>${esc(toothName(t))}<br><span class="small muted">ส่วนที่ ${Math.floor(t / 10)} · ซี่ที่ ${t % 10} นับจากแนวกลาง</span>`);
      return;
    }
    if (mode !== 'test' || lock) return;
    const q = qs[k], ok = t === q.t;
    if (ok) right++;
    lock = true;
    mark = ok ? { [t]: 'ok' } : { [t]: 'no', [q.t]: 'want' };
    render(ok ? `<b>${t}</b>ถูกต้อง! ${esc(toothName(t))}` : `ซี่ที่แตะคือ <b>${t}</b> แต่ที่ถูกคือ ${q.t} (${esc(toothName(q.t))}) ดูที่ขอบเส้นประ`);
    setTimeout(() => {
      lock = false; mark = {};
      if (k < qs.length - 1) { k++; render(); }
      else { mode = 'end'; render(`<b>${Math.round(right / qs.length * 100)}%</b>ลองเปิดโหมดสำรวจทบทวนตำแหน่ง แล้วฝึกอีกครั้งได้`); ctx.done(right / qs.length * 100, { note: `หาฟันถูก ${right}/${qs.length} ซี่` }); }
    }, ok ? 1000 : 2200);
  }
  host.onclick = e => {
    if (e.target.closest('[data-start]')) {
      const per = Math.ceil(rounds / 4), all = [];
      for (let q = 1; q <= 4; q++) shuffle([1, 2, 3, 4, 5, 6, 7, 8]).slice(0, per).forEach(i => all.push(q * 10 + i));
      qs = shuffle(all).slice(0, rounds).map((t, i) => ({ t, byName: i % 2 === 1 }));
      mode = 'test'; k = 0; right = 0; mark = {}; render();
      return;
    }
    const g = e.target.closest('.t'); if (g) pick(+g.dataset.t);
  };
  host.onkeydown = e => { const g = e.target.closest && e.target.closest('.t'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(+g.dataset.t); } };
  render();
};

/* ── ตำแหน่งตามหน้าปัดนาฬิกา ── */
E.clock = function (host, cfg, ctx) {
  const { esc, ic } = ctx, R = cfg.rounds, n = R.length, C = 200, RAD = 176;
  let k = 0, right = 0, answered = false, res = [];
  const pt = (h, r) => { const a = h * 30 * Math.PI / 180; return [C + r * Math.sin(a), C - r * Math.cos(a)]; };
  const wedge = (h1, h2, r) => {
    let span = ((h2 - h1) % 12 + 12) % 12; if (span === 0) span = 12;
    const [x1, y1] = pt(h1, r), [x2, y2] = pt(h1 + span, r);
    return `M${C} ${C}L${x1.toFixed(1)} ${y1.toFixed(1)}A${r} ${r} 0 ${span > 6 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}Z`;
  };
  const arc = (h1, h2, r) => {
    let span = ((h2 - h1) % 12 + 12) % 12; if (span === 0) span = 12;
    const [x1, y1] = pt(h1, r), [x2, y2] = pt(h1 + span, r);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${r} ${r} 0 ${span > 6 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const inZone = (h, z) => {
    let span = ((z[1] - z[0]) % 12 + 12) % 12; if (span === 0) span = 12;
    const rel = ((h - z[0]) % 12 + 12) % 12;
    return rel <= span + .15 || rel >= 12 - .15;
  };
  function face() {
    let s = `<circle class="face" cx="${C}" cy="${C}" r="${RAD}"/>`;
    s += `<rect class="chair" x="152" y="150" width="96" height="214" rx="44"/>`;
    s += `<rect class="pt" x="162" y="222" width="76" height="132" rx="32"/>`;
    s += `<ellipse class="pt" cx="${C}" cy="${C - 4}" rx="27" ry="31"/>`;
    s += `<text class="lbl" x="${C}" y="${C + 3}" text-anchor="middle">คนไข้</text>`;
    for (let h = 1; h <= 12; h++) {
      const [a, b] = pt(h, RAD - 14), [c, d] = pt(h, RAD - 2), [tx, ty] = pt(h, RAD - 32);
      s += `<line class="tick" x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c.toFixed(1)}" y2="${d.toFixed(1)}"/><text class="hr" x="${tx.toFixed(1)}" y="${(ty + 5).toFixed(1)}" text-anchor="middle">${h}</text>`;
    }
    return s;
  }
  function render(extra, info) {
    const r = R[k];
    host.innerHTML = `
      <div class="clock-wrap">
        <div class="clock-svg"><svg viewBox="0 0 400 400" aria-label="หน้าปัดนาฬิการอบเก้าอี้ทำฟัน ศีรษะคนไข้อยู่ที่ 12 นาฬิกา">${face()}<path class="hover" d=""/>${extra || ''}</svg></div>
        <div class="tside">
          <div class="stage-bar" style="margin:0"><span class="steps-dots" aria-hidden="true">${R.map((_, i) => `<i class="${i < k || (i === k && answered) ? (res[i] ? 'ok' : 'no') : i === k ? 'on' : ''}"></i>`).join('')}</span><span class="pill-n">${k + 1}/${n}</span></div>
          <div class="tprompt"><small>ศีรษะคนไข้อยู่ที่ 12 นาฬิกา · ปลายเท้าที่ 6</small><b>${esc(r.q)}</b></div>
          <div class="tinfo" aria-live="polite">${info || 'แตะตำแหน่งบนหน้าปัดรอบตัวคนไข้'}</div>
          ${answered ? `<button class="btn btn-brand" data-next>${k < n - 1 ? 'ข้อต่อไป' : 'สรุปผล'} ${ic('arrowR')}</button>` : ''}
        </div>
      </div>`;
    const svg = host.querySelector('svg'), hov = host.querySelector('.hover');
    if (!answered) {
      svg.addEventListener('pointermove', e => { const h = hourAt(svg, e); hov.setAttribute('d', h == null ? '' : wedge(h - .5, h + .5, RAD)); });
      svg.addEventListener('pointerleave', () => hov.setAttribute('d', ''));
      svg.addEventListener('click', e => { const h = hourAt(svg, e); if (h == null) { ctx.toast('แตะรอบ ๆ ตัวคนไข้ ตามตำแหน่งบนหน้าปัด'); return; } answer(h, e, svg); });
    } else svg.style.cursor = 'default';
  }
  function hourAt(svg, e) {
    const b = svg.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * 400 - C, y = (e.clientY - b.top) / b.height * 400 - C;
    const d = Math.hypot(x, y); if (d < 40 || d > RAD + 14) return null;
    return ((Math.atan2(x, -y) * 180 / Math.PI + 360) % 360) / 30;
  }
  function answer(h) {
    const r = R[k], ok = inZone(h, r.zone);
    answered = true; res[k] = ok; if (ok) right++;
    const [mx, my] = pt(h, RAD - 58);
    const shown = Math.round(h * 2) / 2 || 12;
    const extra = `<path class="zone" d="${wedge(r.zone[0], r.zone[1], RAD)}"/><path class="zone-l" d="${arc(r.zone[0], r.zone[1], RAD + 1)}"/><circle class="${ok ? 'mark-ok' : 'mark-no'}" cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="10"/>`;
    render(extra, ok ? `<b>✓</b>ถูกต้อง · ${esc(r.label)} นาฬิกา` : `คุณแตะที่ประมาณ ${shown} นาฬิกา<br>คำตอบคือ <b style="font-size:17px">${esc(r.label)} นาฬิกา</b> (แถบสีเขียว)`);
    const nb = host.querySelector('[data-next]'); if (nb) nb.focus({ preventScroll: true });
  }
  host.onclick = e => {
    if (!e.target.closest('[data-next]')) return;
    if (k < n - 1) { k++; answered = false; render(); }
    else { host.querySelector('[data-next]').remove(); ctx.done(right / n * 100, { note: `ตอบตำแหน่งถูก ${right}/${n} ข้อ` }); }
  };
  render();
};

/* ── จัดถาดเครื่องมือ ── */
E.tray = function (host, cfg, ctx) {
  const { esc, ic, shuffle, I } = ctx, need = cfg.need, keys = shuffle(Object.keys(I));
  let picked = [], t0 = 0, tick = null, sent = false, hide = false;
  const secs = () => (t0 ? Math.round((Date.now() - t0) / 1000) : 0);
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  host.innerHTML = `
    <div class="stage-bar"><span class="optrow"><span>ต้องใช้ <b style="font-weight:600;color:var(--text)">${need.length} ชิ้น</b> · แตะเพื่อวางลงถาด แตะในถาดเพื่อนำออก</span>
      <label style="display:inline-flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" data-hide> ซ่อนชื่อ (โหมดยาก)</label></span>
      <span class="timer" data-timer>${ic('timer')}0:00</span></div>
    <div class="tray-wrap">
      <div class="shelf">${keys.map(k => `<button class="ins" data-k="${k}"><span class="ph"><img src="${esc(I[k].img)}" alt=""></span><span>${esc(I[k].name)}</span></button>`).join('')}</div>
      <div>
        <div class="tray"><div class="tray-h"><span>${ic('tray')} ถาดเครื่องมือ</span><span class="pill-n" data-cnt>0 ชิ้น</span></div><div class="tray-in"></div></div>
        <div class="stepnav" style="justify-content:flex-end"><button class="btn btn-cta" data-send disabled>${ic('check')}ส่งถาดให้ทันตแพทย์</button></div>
      </div>
    </div>
    <div data-ref></div>`;
  const trayIn = host.querySelector('.tray-in'), timerEl = host.querySelector('[data-timer]');
  function drawTray() {
    trayIn.innerHTML = picked.map(k => `<button class="ti" data-k="${k}" aria-label="นำ ${esc(hide ? 'เครื่องมือ' : I[k].name)} ออกจากถาด"><img src="${esc(I[k].img)}" alt=""><span>${hide ? '?' : esc(I[k].name)}</span><span class="x" aria-hidden="true">×</span></button>`).join('');
    host.querySelector('[data-cnt]').textContent = `${picked.length} ชิ้น`;
    host.querySelector('[data-send]').disabled = !picked.length;
    $$('.ins', host).forEach(b => b.classList.toggle('picked', picked.includes(b.dataset.k)));
  }
  host.onchange = e => {
    if (!e.target.matches('[data-hide]')) return;
    hide = e.target.checked; $$('.ins', host).forEach(b => b.classList.toggle('hide', hide)); drawTray();
  };
  host.onclick = e => {
    if (sent) return;
    const ins = e.target.closest('.ins'), ti = e.target.closest('.ti');
    if (ins || ti) {
      const k = (ins || ti).dataset.k;
      if (!t0) { t0 = Date.now(); tick = setInterval(() => { if (!host.isConnected || sent) return clearInterval(tick); timerEl.innerHTML = ic('timer') + mmss(secs()); }, 1000); }
      picked = picked.includes(k) ? picked.filter(x => x !== k) : picked.concat(k);
      drawTray(); return;
    }
    if (!e.target.closest('[data-send]')) return;
    sent = true; clearInterval(tick);
    const time = secs(); timerEl.innerHTML = ic('timer') + mmss(time);
    const good = picked.filter(k => need.includes(k)), extra = picked.filter(k => !need.includes(k)), miss = need.filter(k => !picked.includes(k));
    trayIn.innerHTML = good.map(k => row(k, 'ok', '✓ ถูกต้อง')).join('') + extra.map(k => row(k, 'no', '✕ ไม่ต้องใช้')).join('') + miss.map(k => row(k, 'miss', '! ลืมหยิบ')).join('');
    $$('.ins', host).forEach(b => { b.disabled = true; b.classList.remove('hide'); });
    host.querySelector('[data-send]').parentElement.remove();
    host.querySelector('.optrow label').remove();
    if (cfg.ref) host.querySelector('[data-ref]').innerHTML = `<figure class="fade-in" style="margin-top:22px;text-align:center"><img src="${esc(cfg.ref)}" alt="ถาดเครื่องมือมาตรฐานของคลินิก" style="max-height:420px"><figcaption>ภาพถาดมาตรฐานจากเอกสารคลินิก เทียบกับถาดที่คุณจัด</figcaption></figure>`;
    ctx.done(Math.max(0, good.length - extra.length) / need.length * 100, { timeSec: time, note: `ครบ ${good.length}/${need.length} ชิ้น${extra.length ? ` · หยิบเกิน ${extra.length}` : ''}${miss.length ? ` · ขาด ${miss.length}` : ''}` });
  };
  const row = (k, c, tg) => `<div class="ti ${c}"><img src="${esc(I[k].img)}" alt=""><span>${esc(I[k].name)}</span><span class="tg">${tg}</span></div>`;
};
})();
