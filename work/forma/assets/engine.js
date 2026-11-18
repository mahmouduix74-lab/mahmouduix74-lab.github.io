/* Forma case study — motion engine (same engine as the Sahem case study).
   - Lenis smooth scroll (lerp 0.09), like the reference.
   - Each .blk is one timeline. Its [data-in] children run at their data-d delay, once, and hold.
     Live: a block starts when its top passes 88% of the viewport (hero blocks start on load at data-at).
   - Ball lens: text blocks come up from the bottom slightly small and pulled down, sit flat in the
     middle of the screen and curve away at the top. Gentle at rest, deeper while scrolling.
     Images get the same curve in WebGL (gl.js), plus a bend with scroll speed.
   - Hairlines draw left to right; the article's vertical line draws top to bottom.
   - Solo: ?solo=<id> shows one part. window.seek(t) sets every block to time t (block start = data-at)
     and window.ready resolves when fonts, images and textures are in. ?clean hides temp-data markers. */
(() => {
  const Q = new URLSearchParams(location.search);
  const SOLO = Q.get('solo');
  const root = document.documentElement;
  if (Q.has('clean')) root.classList.add('clean');
  if (SOLO) root.classList.add('solo');
  const reduce = !SOLO && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GL = window.GL && window.GL.ok ? window.GL : null;

  /* ---------- easing ---------- */
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const E = {
    expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    expoInOut: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    p3Out: (t) => 1 - Math.pow(1 - t, 3),
    p2InOut: (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  };
  const prog = (t, d, ease) => ease(clamp(t / d));

  /* ---------- splitting ---------- */
  function splitChars(el) {
    const txt = el.textContent; el.textContent = '';
    return [...txt].map((ch) => {
      const m = document.createElement('span'); m.className = 'm';
      const s = document.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch;
      m.appendChild(s); el.appendChild(m); return s;
    });
  }
  // words keep their markup: a text word is plain text, an inline element (e.g. <b>FOR<i>MA</i></b>) stays one word with its HTML
  function splitLines(el, masked) {
    const toks = [];
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach((w) => { if (w.trim()) toks.push({ h: w.replace(/&/g, '&amp;').replace(/</g, '&lt;') }); else if (w && toks.length) toks[toks.length - 1].sp = 1; });
      else if (n.nodeType === 1) toks.push({ h: n.outerHTML });
    });
    el.textContent = '';
    const spans = toks.map((t, i) => { const s = document.createElement('span'); s.innerHTML = t.h + (t.sp && i < toks.length - 1 ? ' ' : ''); el.appendChild(s); return s; });
    const lines = []; let top = null;
    spans.forEach((s) => { const y = s.offsetTop; if (top === null || Math.abs(y - top) > 4) { lines.push([]); top = y; } lines[lines.length - 1].push(s); });
    el.textContent = '';
    return lines.map((ws) => {
      const outer = document.createElement('span'); outer.className = 'ln';
      if (!masked) outer.style.overflow = 'visible';
      const inner = document.createElement('span'); inner.innerHTML = ws.map((w) => w.innerHTML).join('').trim();
      outer.appendChild(inner); el.appendChild(outer); return inner;
    });
  }

  /* ---------- animation types: T[type](item, t), t = seconds since the item started ---------- */
  const fmt = (v, dec) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const T = {
    navdrop(it, t) { it.parts.forEach((p, i) => { const k = prog(t - i * .08, 1.2, E.expoOut);
      p.style.opacity = k; p.style.transform = `translateY(${-18 * (1 - k)}px)`; p.style.filter = k < 1 ? `blur(${7 * (1 - k)}px)` : ''; }); },
    chars(it, t) { it.parts.forEach((p, i) => { const k = prog(t - i * .045, 1.5, E.expoOut); p.style.transform = `translateY(${105 * (1 - k)}%)`; }); },
    lines(it, t) { it.parts.forEach((p, i) => { const k = prog(t - i * .09, 1.3, E.expoOut); p.style.transform = `translateY(${110 * (1 - k)}%)`; }); },
    blur(it, t) { it.parts.forEach((p, i) => { const k = prog(t - i * .12, 1.1, E.p3Out);
      p.style.opacity = k; p.style.transform = `translateY(${35 * (1 - k)}%) scaleY(${1 + .25 * (1 - k)})`; p.style.transformOrigin = '50% 100%';
      p.style.filter = k < 1 ? `blur(${12 * (1 - k)}px)` : ''; }); },
    rise(it, t) { const k = prog(t, 1.2, E.expoOut); it.el.style.opacity = k; it.el.style.transform = k < 1 ? `translateY(${40 * (1 - k)}px)` : ''; },
    phone(it, t) { const k = prog(t, 1.5, E.expoOut); it.el.style.opacity = clamp(k * 1.4); it.el.style.transform = k < 1 ? `translateY(${64 * (1 - k)}px)` : ''; },
    frame(it, t) { const k = prog(t, 1.6, E.expoInOut); it.el.style.clipPath = k < 1 ? `inset(0 ${100 * (1 - k)}% 0 0)` : ''; },
    draw(it, t) { it.el.style.transform = `scaleX(${prog(t, 1.6, E.expoInOut)})`; },
    grow(it, t) { it.el.style.transform = `scaleX(${prog(t, 1.4, E.expoOut)})`; },
    reveal(it, t) { const k = prog(t, 1.6, E.p2InOut), s = 1.06 - .06 * prog(t, 2.2, E.expoOut);
      if (GL && GL.has(it.el)) GL.reveal(it.el, k, s);
      else { it.el.style.clipPath = k < 1 ? `inset(${100 * (1 - k)}% 0 0 0)` : ''; it.el.style.transform = `scale(${s})`; } },
    // hero screens: rise and turn out into the fan (rotation lives on the CSS 'rotate' property, so hover tilt can use transform)
    fan(it, t) { const k = prog(t, 1.8, E.expoOut), r = parseFloat(it.el.dataset.r || 0);
      it.el.style.opacity = clamp(k * 1.6); it.el.style.rotate = (r * k).toFixed(2) + 'deg';
      it.el.style.transform = k < 1 ? `translateY(${120 * (1 - k)}px) scale(${.94 + .06 * k})` : ''; },
    // ribbons slide in from their side and settle (once, no loop)
    ribbon(it, t) { const k = prog(t, 2.4, E.expoOut), x = parseFloat(it.el.dataset.x || 1);
      it.el.style.transform = `translateX(${(x * 34 * (1 - k)).toFixed(2)}%)`; it.el.parentNode.style.opacity = clamp(k * 2.5); },
    count(it, t) { const k = prog(t, 1.6, E.expoOut); it.el.textContent = k >= 1 ? it.final : it.pre + fmt(it.to * k, it.dec) + it.suf; },
  };

  /* ---------- collect ---------- */
  const blocks = [];
  let vline = null;
  function prep() {
    if (SOLO) {
      const target = document.getElementById(SOLO);
      document.querySelectorAll('.hero,.article,.closing').forEach((s) => { if (!s.contains(target)) s.style.display = 'none'; });
      document.querySelectorAll('.sec,.step').forEach((s) => { if (!s.contains(target) && !target.contains(s)) s.style.display = 'none'; });
      if (target.classList.contains('step')) { target.parentElement.querySelectorAll(':scope > .blk').forEach((b) => (b.style.display = 'none')); target.style.marginTop = '0'; }
    }
    const nav = document.querySelector('.nav');
    const list = [nav, ...document.querySelectorAll('.blk')].filter((b) => b === nav || b.offsetParent !== null);
    list.forEach((b) => {
      const items = [];
      const els = b === nav ? [nav, ...nav.querySelectorAll(':scope > [data-in]')] : [...b.querySelectorAll('[data-in]')];
      els.forEach((el) => {
        const type = el.dataset.in; const it = { el, type, d: parseFloat(el.dataset.d || 0) };
        if (type === 'navdrop') it.parts = [nav.querySelector('.nav__logo'), ...nav.querySelectorAll('nav a')];
        if (type === 'chars') { it.parts = splitChars(el);
          // one gradient across the whole word, even though every letter is its own span
          if ('grad' in el.dataset) { const sizeGrad = () => { const w = el.getBoundingClientRect().width, x0 = el.getBoundingClientRect().left;
            it.parts.forEach((p) => { p.style.backgroundSize = w + 'px 100%'; p.style.backgroundPosition = (x0 - p.parentNode.getBoundingClientRect().left) + 'px 0'; }); };
            sizeGrad(); addEventListener('resize', sizeGrad); if (document.fonts) document.fonts.ready.then(sizeGrad); } }
        if (type === 'lines') it.parts = splitLines(el, true);
        if (type === 'blur') it.parts = splitLines(el, false);
        if (type === 'count') { it.final = el.textContent; it.to = parseFloat(el.dataset.to); it.dec = (el.dataset.to.split('.')[1] || '').length;
          it.pre = el.dataset.prefix || ''; it.suf = el.dataset.suffix || ''; }
        items.push(it);
      });
      blocks.push({ el: b, items, at: parseFloat(b.dataset.at || 0), start: null, hero: b === nav || !!b.closest('.hero') });
    });
    vline = document.querySelector('[data-vl]');
  }
  const setBlock = (bk, t) => bk.items.forEach((it) => T[it.type](it, t - it.d));

  /* ---------- ball lens on text (CSS translate/scale, separate from the entrance transforms) ----------
     Positions are read from layout (offsetTop), never from the rendered box, so the lens never reacts to
     its own movement; they are measured once and again on resize. Styles are written only when they change. */
  const lensEls = [...document.querySelectorAll('.content p, .content figcaption, .content .cells > div, .content .map__card, .content .swatches > div, .content .h, .content .h3, .type__aa, .type__spec, .content .font')];
  const docTop = (el) => { let y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; };
  let lensBox = null, lastLensKey = '';
  const measureLens = () => { lensBox = lensEls.map((el) => ({ el, y: docTop(el), h: el.offsetHeight, s: '', t: '' })); };
  addEventListener('resize', () => { lensBox = null; if (GL) GL.measure(); htMeasure(); });
  function lens(L) {
    if (!lensBox) measureLens();
    const H = innerHeight, sy = scrollY, key = sy.toFixed(1) + '|' + L.toFixed(3) + '|' + H;
    if (key === lastLensKey) return; lastLensKey = key;
    for (const b of lensBox) {
      const c = b.y - sy + b.h / 2;
      if (c < -200 || c > H + 200) continue;
      const n = clamp((c / H) * 2 - 1, -1.3, 1.3);
      const s = (1 - L * .045 * n * n).toFixed(4), t = `0 ${(-n * Math.abs(n) * L * 22).toFixed(1)}px`;
      if (s !== b.s) { b.el.style.scale = s; b.s = s; }
      if (t !== b.t) { b.el.style.translate = t; b.t = t; }
    }
  }

  /* ---------- How to invest: pinned, scroll-driven, layered scenes ----------
     Progress p (0-1) runs through four steps. In each scene the card fades up, the phone rises, the floating
     card slides in from the side with a small overshoot, the sticker/badge pops, photos drift in; the
     previous scene lifts away. Layers also shift slightly with the pointer, by depth. */
  const HT = document.getElementById('ht');
  const ht = HT && { cards: [...HT.querySelectorAll('.ht__card')], steps: [...HT.querySelectorAll('.ht__step')], fill: document.getElementById('htfill'),
    scale: HT.querySelector('.ht__scale'), stage: HT.querySelector('.ht__stage'), pin: HT.querySelector('.ht__pin'), shown: 0, top: 0, h: 0, ph: 0 };
  const backOut = (t) => { const c1 = 1.5, c3 = c1 + 1; return t <= 0 ? 0 : t >= 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function htMeasure() { if (!ht) return; const st = ht.stage.getBoundingClientRect();
    const aw = +(ht.scale.dataset.w || 519), ah = +(ht.scale.dataset.h || 509);
    ht.scale.style.width = aw + 'px'; ht.scale.style.height = ah + 'px';      // the layers are placed in artboard pixels
    ht.scale.style.transform = `translate(-50%,-50%) scale(${Math.min(st.width / (aw + 90), st.height / (ah + 90)).toFixed(4)})`;
    ht.top = docTop(HT); ht.h = HT.offsetHeight; ht.ph = ht.pin.offsetHeight; }
  function htSet(p, mx = 0, my = 0) {
    if (!ht) return;
    const n = ht.cards.length, P = p * n;
    ht.cards.forEach((card, i) => {
      const a = P - i;
      // one scene at a time: the old one leaves (a .78 → .96) before the next arrives (a -.02 → .3)
      const e = i === 0 ? 1 : clamp((a + .02) / .32), x = i === n - 1 ? 0 : clamp((a - .78) / .18);
      const E1 = E.expoOut(e), X = E.p2InOut(x);
      card.style.opacity = (e * (1 - x)).toFixed(3);
      card.style.transform = `translateY(${((1 - E1) * 70 - X * 60).toFixed(1)}px) scale(${(.95 + .05 * E1 - .05 * X).toFixed(4)})`;
      card.style.visibility = e <= 0 || x >= 1 ? 'hidden' : 'visible';
      card.querySelectorAll('.ht__l').forEach((l) => {
        const d = parseFloat(l.dataset.depth || 1), px = mx * d * 12, py = my * d * 10;
        let tx = 0, ty = 0, r = 0, sc = 1, op = 1;
        if (l.classList.contains('ly-phone')) { const k = E.expoOut(clamp((a + .05) / .6)); ty = (1 - k) * 110; }
        else if (l.classList.contains('ly-float')) { const k = backOut(clamp((a - .12) / .5)); const side = l.classList.contains('ly-r') ? 1 : -1;
          tx = (1 - k) * 150 * side; r = (1 - k) * 7 * side; op = clamp(k * 2); }
        else if (l.classList.contains('ly-pop')) { const k = backOut(clamp((a - .25) / .4)); sc = Math.max(0, k); r = (1 - k) * -40; op = clamp(k * 3); }
        else if (l.classList.contains('ly-img')) { const k = E.expoOut(clamp((a - .05) / .6)); const side = l.classList.contains('ly-r') ? 1 : -1;
          ty = (1 - k) * 60; tx = (1 - k) * 40 * side; op = k; }
        l.style.opacity = op.toFixed(3);
        l.style.transform = `translate(${(tx + px).toFixed(1)}px, ${(ty + py).toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      });
    });
    const act = clamp(Math.floor(P), 0, n - 1);
    ht.steps.forEach((st, i) => { st.classList.toggle('on', i === act); st.style.setProperty('--k', clamp(P - i).toFixed(3)); });
    ht.fill.style.transform = `scaleX(${clamp(ht.bar != null ? ht.bar : p).toFixed(4)})`;
  }

  /* ---------- opening cover ----------
     The Sahem mark builds on the landing gradient (the cyan square pops, the block wipes in from the
     bottom-left), then the camera flies through the arrow's opening into the page, which rises into place. */
  const COVER = 3.4;
  const cover = document.getElementById('cover');
  const MARK = 'M0 300 L0 1021 L395 1021 L437 1008 L1020 428 L1021 1021 L1319 1021 L1319 0 L299 0 L299 298 Z';
  const HOLE = [[298, 725], [299, 299], [725, 300]];
  const HC = [(HOLE[0][0] + HOLE[1][0] + HOLE[2][0]) / 3, (HOLE[0][1] + HOLE[1][1] + HOLE[2][1]) / 3];
  const cv = cover && { svg: document.getElementById('coversvg'), count: document.getElementById('covercount'), tag: cover.querySelector('.cover__tag'), hero: document.querySelector('.hero') };
  const backOutC = (t) => { const c1 = 1.7, c3 = c1 + 1; return t <= 0 ? 0 : t >= 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function setCover(t) {
    if (!cover) return;
    if (t >= COVER + .1) { if (cover.style.display !== 'none') { cover.style.display = 'none'; cv.hero.style.transform = ''; if (GL) GL.measure(); } return; }
    const W = innerWidth, H = innerHeight;
    const s0 = Math.min(W, H) * .2 / 1021;                       // mark height = 20% of the short side
    const zoom = E.expoInOut(clamp((t - 2.0) / 1.3));
    const s = s0 * Math.pow(220, zoom), cx = W / 2, cy = H / 2;
    const tf = (x, y) => [cx + (x - HC[0]) * s, cy + (y - HC[1]) * s];
    const build = E.expoInOut(clamp((t - .35) / 1.1)), sq = backOutC(clamp((t - .15) / .7));
    if (zoom > 0) { const h = HOLE.map(([x, y]) => tf(x, y));
      cover.style.clipPath = `path(evenodd, 'M-10 -10 H${W + 10} V${H + 10} H-10 Z M${h[0][0]} ${h[0][1]} L${h[1][0]} ${h[1][1]} L${h[2][0]} ${h[2][1]} Z')`;
    } else cover.style.clipPath = '';
    const sqS = 300 * sq, sqX = -300 + (300 - sqS) / 2, sqY = (300 - sqS) / 2;
    cv.svg.innerHTML = `<defs><clipPath id="cvwipe"><rect x="-300" y="${1021 - 1400 * build}" width="${1700 * build}" height="1400"/></clipPath></defs>
      <g transform="matrix(${s} 0 0 ${s} ${cx - HC[0] * s} ${cy - HC[1] * s})">
        <rect x="${sqX}" y="${sqY}" width="${sqS}" height="${sqS}" fill="#1BA1C6" transform="rotate(${(1 - sq) * -45} -150 150)"/>
        <path d="${MARK} M298 725 L299 299 L725 300 Z" fill-rule="evenodd" fill="#fff" clip-path="url(#cvwipe)"/></g>`;
    const ui = clamp((t - .3) / .6) * (1 - clamp((t - 1.8) / .3));
    cv.tag.style.opacity = ui; cv.count.style.opacity = ui;
    cv.count.textContent = String(Math.round(100 * E.p2InOut(clamp((t - .2) / 1.6)))).padStart(3, '0');
    const rise = E.expoInOut(clamp((t - 2.3) / 1.1));
    cv.hero.style.transform = rise < 1 ? `translateY(${(1 - rise) * 80}px) scale(${.97 + .03 * rise})` : '';
    cv.hero.style.transformOrigin = '50% 0';
  }

  /* ---------- micro-interactions (live only) ---------- */
  function micro(lenis) {
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const cur = document.getElementById('cursor'); let mx = -100, my = -100, lean = 0, leanV = 0, lastX = 0, lastT = 0;
    const ptr = { x: -1, y: -1, in: false };
    // the cursor follows the pointer directly (no easing, no frame wait), so it never trails
    const place = () => { cur.style.transform = `translate3d(${mx}px, ${my}px, 0) skewX(${(-lean).toFixed(2)}deg)`; };
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; ptr.x = mx; ptr.y = my; ptr.in = true;
      if (fine) { cur.classList.add('on'); place(); } }, { passive: true });
    document.addEventListener('pointerleave', () => { ptr.in = false; cur.classList.remove('on'); });
    // over images and cards the dot grows into a soft ring (no label); over the dark closing it turns cyan
    document.querySelectorAll('[data-cursor]').forEach((el) => {
      el.addEventListener('pointerenter', () => cur.classList.add('big'));
      el.addEventListener('pointerleave', () => cur.classList.remove('big'));
    });
    const dark = document.querySelector('.closing');
    dark.addEventListener('pointerenter', () => cur.classList.add('dark')); dark.addEventListener('pointerleave', () => cur.classList.remove('dark'));
    // magnetic contact icons
    const mags = [...document.querySelectorAll('.icons a, .totop')];
    // cards tilt toward the pointer
    document.querySelectorAll('.map__card, .bt, .fan__c, .fl__i').forEach((el) => {
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-4px)`; });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    // swatches copy their hex
    document.querySelectorAll('.sw').forEach((el) => el.addEventListener('click', () => {
      const done = () => { el.classList.add('copied'); setTimeout(() => el.classList.remove('copied'), 1200); };
      try { navigator.clipboard.writeText(el.dataset.hex).then(done, done); } catch (e) { done(); }
    }));
    // numbers count again on hover
    document.querySelectorAll('.cells [data-in="count"]').forEach((el) => {
      const cell = el.closest('.cells > div'); let busy = false;
      cell.addEventListener('pointerenter', () => { if (busy) return; busy = true; const it = { el, to: parseFloat(el.dataset.to), dec: (el.dataset.to.split('.')[1] || '').length,
        pre: el.dataset.prefix || '', suf: el.dataset.suffix || '', final: el.textContent }; const t0 = performance.now();
        const run = () => { const t = (performance.now() - t0) / 1000; T.count(it, t * 1.4); if (t < 1.2) requestAnimationFrame(run); else { el.textContent = it.final; busy = false; } }; run(); });
    });
    return (dt) => {
      if (!fine) return ptr;
      const now = performance.now() / 1000, vx = (mx - lastX) / Math.max(now - lastT, .008); lastX = mx; lastT = now;
      const st = Math.min(dt, .05);
      leanV += (60 * (clamp(vx * .006, -16, 16) - lean) - 11 * leanV) * st; lean += leanV * st;
      if (Math.abs(lean) > .01) place();
      mags.forEach((a) => { const r = a.getBoundingClientRect(); const ax = r.left + r.width / 2, ay = r.top + r.height / 2;
        const dx = mx - ax, dy = my - ay, d = Math.hypot(dx, dy), k = d < 90 ? (1 - d / 90) : 0;
        a.style.translate = `${(dx * .35 * k).toFixed(1)}px ${(dy * .35 * k).toFixed(1)}px`; });
      return ptr;
    };
  }

  /* ---------- live (and ?tour: the same engine stepped by a fixed clock, for the scroll video) ---------- */
  const TOUR = Q.has('tour');
  function live() {
    blocks.forEach((bk) => setBlock(bk, reduce ? 99 : -1));
    if (vline) vline.style.transform = reduce ? '' : 'scaleY(0)';
    if (GL) GL.render();
    if (reduce) { if (cover) cover.style.display = 'none'; return; }

    const lenis = !TOUR && window.Lenis ? new Lenis({ lerp: .09, smoothWheel: true }) : null;
    if (lenis && cover) lenis.stop();
    const microStep = TOUR ? null : micro(lenis); let lastNow = 0;
    const unit = () => parseFloat(getComputedStyle(document.querySelector('.nav')).height) / 80;
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const t = document.querySelector(a.getAttribute('href')); if (!t) return; e.preventDefault();
      if (lenis) lenis.scrollTo(t, { offset: -112 * unit(), duration: 1.4 }); else t.scrollIntoView({ behavior: 'smooth' });
    }));

    const links = [...document.querySelectorAll('.toc a')], pct = document.getElementById('prog'),
      fill = document.getElementById('tocfill'), art = document.getElementById('article');
    const par = [...document.querySelectorAll('[data-par]')];
    const pans = [...document.querySelectorAll('.pan')].map((el) => ({ el, img: el.querySelector('img') }));
    const navEl = document.querySelector('.nav'), heroLogo = document.querySelector('.fh__logo');
    let coverStart = 0, speed = 0, vel = 0, heroStarted = false, lastY = scrollY, order = 0;

    const step = (now, vRaw) => {
      if (!heroStarted) { heroStarted = true; coverStart = now; blocks.filter((b) => b.hero).forEach((b) => (b.start = now + (cover ? 2.3 : 0) + b.at)); }
      setCover(now - coverStart);
      if (!TOUR && cover && now - coverStart < COVER) { if (scrollY) window.scrollTo(0, 0); if (lenis) lenis.scrollTo(0, { immediate: true }); }
      if (lenis && now - coverStart > COVER && lenis.isStopped) lenis.start();
      const H = innerHeight;
      if (navEl && heroLogo) navEl.classList.toggle('top', heroLogo.getBoundingClientRect().bottom > navEl.offsetHeight);
      // a block starts when its top passes 88% of the screen; blocks entering together keep a short order
      let entering = 0;
      blocks.forEach((bk) => { if (bk.start !== null) return;
        if (bk.el.getBoundingClientRect().top < H * .88) bk.start = now + (entering++) * .12; });
      if (vline && vline._start == null && art.getBoundingClientRect().top < H * .88) vline._start = now;
      blocks.forEach((bk) => { if (bk.start === null || bk.done) return; const t = now - bk.start; setBlock(bk, t); if (t > 5) bk.done = true; });
      if (vline && vline._start != null) vline.style.transform = `scaleY(${prog(now - vline._start, 2.6, E.expoInOut)})`;
      vel += (clamp(vRaw, -60, 60) - vel) * .12;
      speed += (Math.min(1, Math.abs(vRaw) / 40) - speed) * .08;
      const L = .35 + .9 * speed;
      lens(L);
      pans.forEach((pn) => { const r = pn.el.getBoundingClientRect(); if (r.bottom < -50 || r.top > H + 50) return;
        const p = clamp((H - r.top) / (H + r.height));
        const y = -(pn.img.offsetHeight - pn.el.clientHeight) * E.p2InOut(p); pn.img.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`; });
      par.forEach((el) => { el.style.translate = `0 ${(-scrollY * parseFloat(el.dataset.par)).toFixed(1)}px`; });
      const ptr = microStep ? microStep(now - lastNow) : null; lastNow = now;
      if (ht) { if (!ht.h) htMeasure();
        const target = clamp((scrollY - (ht.top - (H - ht.ph) / 2)) / Math.max(1, ht.h - ht.ph));
        // scenes settle: the stage eases to the middle of the current step, so it never rests between two scenes
        const n = ht.cards.length, settled = (clamp(Math.floor(target * n), 0, n - 1) + .5) / n;
        ht.shown += (settled - ht.shown) * (TOUR ? .1 : .07); ht.bar = target;
        const pm = ptr && ptr.in ? [(ptr.x / innerWidth - .5) * 2, (ptr.y / H - .5) * 2] : [0, 0];
        ht.mx = (ht.mx || 0) + (pm[0] - (ht.mx || 0)) * .08; ht.my = (ht.my || 0) + (pm[1] - (ht.my || 0)) * .08;
        htSet(ht.shown, ht.mx, ht.my); }
      if (GL) { GL.set(vel, L, ptr); GL.render(); }
      const yLine = H * .4; let cur = null;
      links.forEach((a) => { const sct = document.getElementById(a.dataset.t); if (sct && sct.getBoundingClientRect().top < yLine) cur = a.dataset.t; });
      links.forEach((a) => a.classList.toggle('on', a.dataset.t === cur || false));
      const r = art.getBoundingClientRect(); const p = clamp((H * .5 - r.top) / r.height);
      fill.style.transform = `scaleY(${p.toFixed(4)})`; pct.textContent = Math.round(p * 100) + '%';
    };

    if (TOUR) {
      // a reading path: hold on each part, glide to the next (expo in-out)
      const unitNow = unit();
      const ids = ['top', 'context', 'solution', 'auth', 'ht0', 'ht1', 'ht2', 'ht3', 'home', 'trainer', 'events', 'plans', 'progress', 'trainerside', 'system', 'contact'];
      htMeasure();
      const maxY = document.documentElement.scrollHeight - innerHeight;
      const ys = ids.map((id) => { if (id === 'top') return 0;
        const m = /^ht(\d)$/.exec(id);
        if (m) return Math.min(maxY, ht.top - (innerHeight - ht.ph) / 2 + (ht.h - ht.ph) * (+m[1] + .55) / 4);
        const el = document.getElementById(id); return el ? Math.min(el.getBoundingClientRect().top + scrollY - 104 * unitNow, maxY) : 0; });
      const HOLD = 2.6, MOVE = 1.7, segs = []; let t = 0;
      segs.push({ t0: 0, t1: COVER + 4.2, y0: 0, y1: 0 }); t = COVER + 4.2;
      for (let i = 1; i < ys.length; i++) { segs.push({ t0: t, t1: t + MOVE, y0: ys[i - 1], y1: ys[i], move: 1 }); t += MOVE;
        segs.push({ t0: t, t1: t + HOLD, y0: ys[i], y1: ys[i] }); t += HOLD; }
      window.tourDuration = t + 1.0;
      const yAt = (tt) => { const sg = segs.find((g) => tt < g.t1) || segs[segs.length - 1];
        return sg.y0 + (sg.y1 - sg.y0) * E.expoInOut(clamp((tt - sg.t0) / (sg.t1 - sg.t0))); };
      window.tour = (tt) => { const y = yAt(tt); window.scrollTo(0, y); const v = y - lastY; lastY = y; step(tt, v); };
      return;
    }
    const frame = (ms) => {
      if (lenis) lenis.raf(ms);
      const v = lenis ? lenis.velocity : scrollY - lastY; lastY = scrollY;
      step(ms / 1000, v);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- page unit (for device mockups that scale as one piece) ---------- */
  const setUnit = () => root.style.setProperty('--us', (parseFloat(getComputedStyle(document.querySelector('.nav')).height) / 80).toFixed(4));
  setUnit(); addEventListener('resize', setUnit);

  /* ---------- boot ---------- */
  const imgs = [...document.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })));
  window.ready = Promise.all([document.fonts.ready, ...imgs, GL ? GL.ready : 0]).then(() => {
    prep();
    if (SOLO) {
      htMeasure();
      const pans = [...document.querySelectorAll('.pan')].map((el) => ({ el, img: el.querySelector('img') }));
      window.seek = (t) => { blocks.forEach((bk) => setBlock(bk, t - bk.at));
        // video: the home page pans by time (on the page it follows the scroll), then holds at the bottom
        pans.forEach((pn) => { const y = -(pn.img.offsetHeight - pn.el.clientHeight) * E.p2InOut(clamp((t - 1.4) / 7));
          pn.img.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`; }); if (ht) { const n = ht.cards.length, q = clamp((t - 1.2) / 8) * n, k = Math.min(n - 1, Math.floor(q));
        ht.bar = q / n; htSet(Math.min((n - .5) / n, (k + .5 + E.p2InOut(clamp((q - k - .6) / .4))) / n)); } if (GL) { GL.set(0, 0); GL.render(); } };
      window.duration = Math.max(...blocks.filter((b) => b.el.offsetParent !== null).map((b) => b.at + Math.max(0, ...b.items.map((i) => i.d)) + 2.0)) + 1.2;
      if (SOLO === 'auth') window.duration = Math.max(window.duration, 10.5);
      if (SOLO === 'home') window.duration = Math.max(window.duration, 10);
      window.seek(0);
    } else live();
    root.classList.remove('pre');
    return true;
  });
})();
