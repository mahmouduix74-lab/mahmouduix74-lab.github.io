/* Elevate case study — GSAP (ScrollTrigger, ScrollSmoother, SplitText, Draggable, Inertia) */
(() => {
  'use strict';
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, Draggable, InertiaPlugin);
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const Q = new URLSearchParams(location.search);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || Q.has('still');
  const DESK = () => matchMedia('(min-width: 1001px)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  // ---------- smooth scroll ----------
  const smoother = RM ? null : ScrollSmoother.create({wrapper: '#smooth-wrapper', content: '#smooth-content', smooth: 1.15, effects: true, smoothTouch: 0, normalizeScroll: false});
  const goTo = el => { if (!el) return; if (smoother) smoother.scrollTo(el, true, 'top top'); else el.scrollIntoView({behavior: RM ? 'auto' : 'smooth'}); };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (t) { e.preventDefault(); goTo(t); } }));

  // ---------- type: lines rise out of masks, words light up ----------
  const splits = [];
  document.fonts.ready.then(() => {
    $$('[data-split],[data-lines]').forEach(el => {
      const s = SplitText.create(el, {type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit: self => {
          if (RM || el.closest('.lobby')) return;   // the lobby has its own entrance
          return gsap.from(self.lines, {yPercent: 105, duration: 1.15, ease: 'expo.out', stagger: .09, scrollTrigger: {trigger: el, start: 'top 86%'}});
        }});
      splits.push(s);
    });
    $$('[data-words]').forEach(el => {
      SplitText.create(el, {type: 'words', wordsClass: 'word', autoSplit: true, onSplit: self => {
        if (RM) return;
        return gsap.to(self.words, {opacity: 1, ease: 'none', stagger: .1, scrollTrigger: {trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: .6}});
      }});
    });
    if (!RM) $$('[data-rise]').forEach(el => gsap.from(el, {y: 46, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: {trigger: el, start: 'top 88%'}}));
    ScrollTrigger.refresh();
    intro();
  });

  // ---------- the intro: the app's splash, then the doors go up ----------
  function lobbyIn(){
    if (RM) return;
    const h1 = SplitText.create('.lobby__title .w', {type: 'chars', mask: 'chars'});
    const tl = gsap.timeline();
    tl.from(h1.chars, {yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .045}, 0)
      .from('.lobby__sub .split-line', {yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: .08}, .25)
      .from('.lobby__top .tag', {y: 18, opacity: 0, duration: .8, ease: 'power3.out', stagger: .06}, .3)
      .from('.lobby__phones .ph', {y: 160, opacity: 0, duration: 1.5, ease: 'expo.out', stagger: .12}, .15)
      .from('.lobby__facts > div', {y: 24, opacity: 0, duration: .9, ease: 'power3.out', stagger: .06}, .55)
      .from('.hd, .lift, .lobby__go', {opacity: 0, duration: .8}, .6);
  }
  function intro(){
    const el = $('#intro');
    if (RM || Q.has('nointro')) { root.classList.add('done'); lobbyIn(); return; }
    if (smoother) smoother.paused(true);
    const fl = $('#introFloor'), floors = ['B2', 'B1', 'G'];
    const tl = gsap.timeline({onComplete: () => { root.classList.add('done'); if (smoother) smoother.paused(false); }});
    floors.forEach((f, i) => tl.call(() => { fl.textContent = f; gsap.fromTo(fl, {yPercent: 60, opacity: 0}, {yPercent: 0, opacity: 1, duration: .3}); }, null, i * .42));
    tl.to('.intro__wipe', {y: '0%', scale: 1, duration: .85, ease: 'power3.inOut'}, .1)
      .to('.intro__wipe', {x: '58%', y: '-62%', scale: .06, duration: .9, ease: 'power3.inOut'}, .95)
      .to('.intro__mark', {opacity: 1, duration: .5}, 1.45)
      .from('.intro__mark .logo', {scale: .92, duration: 1.1, ease: 'power3.out'}, 1.45)
      .to(el, {yPercent: -100, duration: 1.05, ease: 'power4.inOut'}, 2.35)
      .call(lobbyIn, null, 2.6);
    el.addEventListener('click', () => tl.progress(1), {once: true});
  }

  // ---------- lobby: phones lean towards the pointer ----------
  if (FINE && !RM) {
    const ps = $$('#heroPhones .ph').map(p => ({d: +p.dataset.depth, x: gsap.quickTo(p, 'x', {duration: 1.1, ease: 'power3'}), y: gsap.quickTo(p, 'y', {duration: 1.1, ease: 'power3'})}));
    $('.lobby').addEventListener('pointermove', e => { const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5; ps.forEach(p => { p.x(nx * p.d * 2); p.y(ny * p.d * 1.4); }); });
  }

  // ---------- the lift ----------
  const floors = $$('.fl[data-floor]'), btns = $('#liftBtns'), lift = $('#lift');
  btns.innerHTML = floors.slice().reverse().map(f => `<li><button type="button" data-f="${f.id}" aria-label="${f.dataset.name}">${f.dataset.floor}</button></li>`).join('');
  $$('button', btns).forEach(b => b.onclick = () => goTo($('#' + b.dataset.f)));
  const darkFloors = new Set(['f2', 'f6', 'f9']);
  let curF = 'g';
  function setFloor(f, dir){
    if (f.id === curF) return; curF = f.id;
    const no = $('#liftNo'), nm = $('#liftName');
    $('#liftDir').classList.toggle('dn', dir < 0);
    gsap.fromTo(no, {yPercent: dir < 0 ? -80 : 80, opacity: 0}, {yPercent: 0, opacity: 1, duration: .45, ease: 'power3.out'});
    no.textContent = f.dataset.floor; nm.textContent = f.dataset.name;
    $$('button', btns).forEach(b => b.classList.toggle('on', b.dataset.f === f.id));
    lift.classList.toggle('dark', darkFloors.has(f.id));
  }
  floors.forEach(f => ScrollTrigger.create({trigger: f, start: 'top 55%', end: 'bottom 55%', refreshPriority: -1, onToggle: s => s.isActive && setFloor(f, s.direction)}));
  $$('button', btns).forEach(b => b.classList.toggle('on', b.dataset.f === 'g'));

  // ---------- 02 · the plan draws itself ----------
  if (!RM) {
    const walls = $$('#planSvg .wall, #planSvg .door, #planSvg .dim path');
    walls.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = p.classList.contains('door') ? '' : L; if (!p.classList.contains('door')) p.style.strokeDashoffset = L; });
    const tl = gsap.timeline({scrollTrigger: {trigger: '#planSvg', start: 'top 80%', end: 'bottom 70%', scrub: .8}});
    tl.to('#planSvg .wall, #planSvg .dim path', {strokeDashoffset: 0, ease: 'none', stagger: .08, duration: 1}, 0)
      .from('#planSvg .door', {opacity: 0, duration: .3, stagger: .05}, .6)
      .from('#planSvg .labels text', {opacity: 0, y: 8, duration: .25, stagger: .03}, .7)
      .from('#planSvg .dim text', {opacity: 0, duration: .3}, .9);
  }

  // ---------- sideways tracks and the pinned phone (desktop only) ----------
  const mm = gsap.matchMedia();
  mm.add({desk: '(min-width: 1001px)', still: '(prefers-reduced-motion: reduce)'}, ctx => {
    const {desk, still} = ctx.conditions;
    if (!desk || still || RM) return;

    // 03 · arrival: the steps slide past while the intro stays put
    const track = $('#arriveTrack');
    const view = $('#arriveView'), dist = () => Math.max(0, track.scrollWidth - view.clientWidth);
    gsap.to(track, {x: () => -dist(), ease: 'none', scrollTrigger: {trigger: '.arrive__pin', pin: true, start: 'top top', end: () => '+=' + dist(), scrub: .7, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: s => gsap.set('#arriveFill', {scaleX: s.progress})}});

    // 04 · the home screen: the phone travels to each part of the screen and holds there, and the list follows it.
    //      Stops are the real y of each part in the Figma frame (6070 tall).
    const img = $('#homeLong'), scr = img.parentNode, notes = $$('#homeNotes li'), bar = $('#homeBar'), now = $('#homeNow');
    const FH = 6070, HEAD = 562, MOVE = 1, HOLD = .8;
    const sbH = () => scr.offsetHeight * .064;
    const maxT = () => Math.max(0, img.offsetHeight - scr.offsetHeight);
    const stop = i => { const y = +notes[i].dataset.y; return i === 0 ? 0 : Math.min(maxT(), Math.max(0, y * img.offsetHeight / FH - sbH() - 4)); };
    const tl = gsap.timeline({defaults: {ease: 'power2.inOut'}});
    tl.addLabel('s0', 0).to({}, {duration: HOLD});
    notes.forEach((n, i) => { if (!i) return; tl.to(img, {y: () => -stop(i), duration: MOVE}).addLabel('s' + i).to({}, {duration: HOLD}); });
    let cur = -1;
    const show = i => { if (i === cur) return; cur = i; notes.forEach((n, j) => n.classList.toggle('on', j === i));
      gsap.to(now, {opacity: 0, y: 6, duration: .15, onComplete: () => { now.querySelector('b').textContent = notes[i].querySelector('b').textContent;
        now.querySelector('span').textContent = notes[i].querySelector('span').textContent; gsap.to(now, {opacity: 1, y: 0, duration: .35, ease: 'power2.out'}); }}); };
    const st = ScrollTrigger.create({trigger: '#homePin', pin: true, start: 'top top', end: () => '+=' + innerHeight * notes.length * .6, scrub: .6, animation: tl, invalidateOnRefresh: true,
      onUpdate: s => { gsap.set('#homeMeter', {scaleY: s.progress});
        const y = -gsap.getProperty(img, 'y'), k = img.offsetHeight / FH;
        bar.style.opacity = Math.min(1, Math.max(0, (y - (HEAD * k - sbH() * 2)) / (sbH() * 2)));   // fades in once the photo header has gone
        let best = 0, d = 1e9; notes.forEach((n, i) => { const dd = Math.abs(stop(i) - y); if (dd < d) { d = dd; best = i; } }); show(best); }});
    show(0);
    // a note jumps the phone to its part of the screen
    notes.forEach((n, i) => n.addEventListener('click', () => { const t = tl.labels['s' + i] + (i ? HOLD * .4 : 0), pos = st.start + (st.end - st.start) * (t / tl.duration());
      if (smoother) smoother.scrollTo(pos, true); else scrollTo({top: pos, behavior: 'smooth'}); }));
    if (!img.complete) img.addEventListener('load', () => ScrollTrigger.refresh(), {once: true});

    // 07 · company: drag the rail
    const rail = $('#coRail'), ct = $('#coTrack');
    const d = Draggable.create(ct, {type: 'x', bounds: rail, inertia: true, edgeResistance: .85, dragClickables: true, zIndexBoost: false,
      onPress(){ cur.classList.add('down'); }, onRelease(){ cur.classList.remove('down'); },
      onClick(e){ const im = e.target.closest('.cc') && e.target.closest('.cc').querySelector('img'); if (im) openLB(im); }})[0];
    gsap.from(ct, {x: innerWidth * .25, ease: 'none', scrollTrigger: {trigger: rail, start: 'top bottom', end: 'top 30%', scrub: .8}});
    return () => { d && d.kill(); };
  });

  // drag cursor
  const cur = $('#cur');
  if (FINE) {
    const cx = gsap.quickTo(cur, 'x', {duration: .35, ease: 'power3'}), cy = gsap.quickTo(cur, 'y', {duration: .35, ease: 'power3'});
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); }, {passive: true});
    const rail = $('#coRail');
    rail.addEventListener('pointerenter', () => DESK() && cur.classList.add('on'));
    rail.addEventListener('pointerleave', () => cur.classList.remove('on'));
  }

  // ---------- 05 · the loupe: the 4K pixels, up close ----------
  const loupe = $('#loupe');
  if (FINE) $$('[data-zoom]').forEach(im => {
    const Z = 2.6;
    im.addEventListener('pointerenter', () => { loupe.style.backgroundImage = `url("${im.currentSrc || im.src}")`; loupe.classList.add('on'); });
    im.addEventListener('pointerleave', () => loupe.classList.remove('on'));
    im.addEventListener('pointermove', e => { const r = im.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      loupe.style.left = e.clientX + 'px'; loupe.style.top = e.clientY + 'px';
      loupe.style.backgroundSize = `${r.width * Z}px auto`; loupe.style.backgroundPosition = `${125 - px * Z}px ${125 - py * Z}px`; });
  });

  // ---------- 06 · the unit strips open the full page ----------
  $$('.us__img').forEach(s => s.addEventListener('click', () => openLB({dataset: {lb: 'unit'}, alt: 'The unit page, top to bottom'})));

  // ---------- 09 · swatches copy their colour; the splash film plays ----------
  $$('.sw').forEach(b => b.addEventListener('click', () => { const done = () => { b.classList.add('copied'); setTimeout(() => b.classList.remove('copied'), 1400); };
    try { navigator.clipboard.writeText(b.dataset.hex).then(done, done); } catch (e) { done(); } }));
  if (!RM) gsap.from('#film img', {y: 60, opacity: 0, duration: 1, ease: 'power3.out', stagger: .08, scrollTrigger: {trigger: '#film', start: 'top 85%'}});
  if (!RM) gsap.from('.sw', {yPercent: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .07, scrollTrigger: {trigger: '#swatches', start: 'top 85%'}});

  // ---------- the viewer: any screen at full 4K ----------
  const lb = $('#lb'), lbImg = $('#lbImg'), lbSc = $('#lbSc');
  function openLB(im){
    const k = im.dataset.lb; if (!k) return;
    lbImg.src = `assets/s/${k}.webp`; lbImg.alt = im.alt || ''; $('#lbCap').textContent = (im.alt || '') + ' · 4K'; lbSc.classList.remove('big'); lbSc.scrollTop = 0;
    lb.hidden = false; if (smoother) smoother.paused(true); else document.body.style.overflow = 'hidden';
    gsap.fromTo(lb, {opacity: 0}, {opacity: 1, duration: .35}); gsap.fromTo(lbImg, {y: 40, scale: .97}, {y: 0, scale: 1, duration: .6, ease: 'expo.out'});
    $('#lbX').focus();
  }
  function closeLB(){ gsap.to(lb, {opacity: 0, duration: .25, onComplete: () => { lb.hidden = true; lbImg.removeAttribute('src'); if (smoother) smoother.paused(false); else document.body.style.overflow = ''; }}); }
  $$('img[data-lb]').forEach(im => { if (!im.closest('.co__track')) im.addEventListener('click', () => openLB(im)); });
  if (!DESK()) $$('.co__track img[data-lb]').forEach(im => im.addEventListener('click', () => openLB(im)));
  $('#lbX').onclick = closeLB;
  lb.addEventListener('click', e => { if (e.target === lbSc || e.target === lb) closeLB(); });
  lbImg.addEventListener('click', () => lbSc.classList.toggle('big'));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLB(); });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
