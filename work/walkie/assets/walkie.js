/* Walkie case study: the motion layer.
   GSAP (ScrollTrigger, SplitText, DrawSVG, MotionPath, ScrambleText, Draggable, Inertia) with Lenis for the scroll,
   a small WebGL shader for the dusk sky, and real working demos in the accessibility stop.
   With reduced motion, the boards print their text at once and nothing moves on its own. */
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const STILL = document.documentElement.classList.contains('still');
const DESK = () => matchMedia('(min-width: 981px)').matches;
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, DrawSVGPlugin, MotionPathPlugin, ScrambleTextPlugin, Draggable, InertiaPlugin);
CustomEase.create('glide', 'M0,0 C0.16,1 0.3,1 1,1');
CustomEase.create('snap', 'M0,0 C0.7,0 0.2,1 1,1');
gsap.defaults({ease: 'glide', duration: 1.1});
const show = el => gsap.set(el, {visibility: 'visible'});

/* ---------- smooth scroll, fed into ScrollTrigger ---------- */
let lenis = null;
if (!STILL) {
  lenis = new Lenis({lerp: .085, wheelMultiplier: .95});
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
}
const goTo = (target, off = 0) => lenis ? lenis.scrollTo(target, {offset: off, duration: 1.6}) : (typeof target === 'number' ? scrollTo(0, target) : target.scrollIntoView());

/* ---------- split-flap boards ---------- */
const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+&?';
function build(el){ const t = el.dataset.text;
  el.innerHTML = [...t].map(c => `<span class="c${c === ' ' ? ' sp' : ''}"><span>${c === ' ' ? '&nbsp;' : (STILL ? c : '&nbsp;')}</span></span>`).join('');
  el._done = STILL; }
function flap(el, delay = 0, speed = .05){
  if (el._done) return; el._done = true;
  const t = el.dataset.text, cells = $$(':scope > .c', el);
  cells.forEach((cell, i) => { const target = t[i]; if (target === ' ') return; const s = cell.firstChild;
    const n = 5 + ((i * 7 + t.length) % 8), tl = gsap.timeline({delay: delay + i * speed});
    for (let j = 0; j < n; j++) { const ch = j === n - 1 ? target : CH[(Math.random() * CH.length) | 0];
      tl.call(() => { s.textContent = ch; }).fromTo(s, {rotateX: -88, filter: 'brightness(.6)'}, {rotateX: 0, filter: 'brightness(1)', duration: .07, ease: 'none'}); } });
}
$$('.flap').forEach(build);

/* ---------- the dusk sky (WebGL) ---------- */
(function sky(){
  const cv = $('#sky'), gl = cv && cv.getContext('webgl', {antialias: false, alpha: false, powerPreference: 'low-power'});
  if (!gl) { if (cv) cv.style.background = 'linear-gradient(#0A1128,#274E86 55%,#5E4E69 75%,#9D504A)'; return; }
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
  void main(){vec2 uv=gl_FragCoord.xy/r;float y=uv.y;
    vec3 night=vec3(.039,.067,.157),blue=vec3(.153,.306,.525),dusk=vec3(.369,.306,.412),clay=vec3(.616,.314,.29),sun=vec3(1.,.45,.18);
    vec3 c=mix(clay,dusk,smoothstep(.0,.32,y));c=mix(c,blue,smoothstep(.28,.62,y));c=mix(c,night,smoothstep(.55,1.,y));
    vec2 sp=vec2(.62+m.x*.04,-.08+m.y*.02);float d=length((uv-sp)*vec2(r.x/r.y,1.));c+=sun*exp(-d*2.6)*.62;
    float cl=fbm(vec2(uv.x*2.6+t*.018,y*6.5)+fbm(uv*1.8+t*.008)*1.4);
    c=mix(c,c*1.22+vec3(.06,.025,.03),smoothstep(.52,.86,cl)*smoothstep(.62,.08,y)*.7);
    vec2 g=floor(gl_FragCoord.xy/2.);float s=step(.9972,h(g));c+=s*smoothstep(.5,1.,y)*(.45+.55*sin(t*1.7+h(g+3.)*6.28))*.9;
    c+=(h(gl_FragCoord.xy+fract(t))-.5)*.035;gl_FragColor=vec4(c,1.);}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't'), uM = gl.getUniformLocation(pr, 'm');
  let on = true, mx = 0, my = 0, tmx = 0, tmy = 0;
  const size = () => { const k = Math.min(1.5, devicePixelRatio) * .75; cv.width = cv.clientWidth * k; cv.height = cv.clientHeight * k; gl.viewport(0, 0, cv.width, cv.height); };
  size(); addEventListener('resize', size);
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = .5 - e.clientY / innerHeight; }, {passive: true});
  new IntersectionObserver(es => { on = es[0].isIntersecting; }).observe(cv);
  const t0 = performance.now();
  const frame = () => { if (on) { mx += (tmx - mx) * .05; my += (tmy - my) * .05;
      gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, STILL ? 20 : (performance.now() - t0) / 1000); gl.uniform2f(uM, mx, my); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    if (!STILL) requestAnimationFrame(frame); };
  frame();
})();

/* ---------- top bar: the stop you're at; the line down the side ---------- */
const stops = $$('[data-st]'), rail = $('#rail'), now = $('#now');
function placeStations(){
  const H = document.documentElement.scrollHeight - innerHeight, rh = rail.clientHeight;
  $$('.st', rail).forEach(e => e.remove());
  stops.forEach((s, i) => { const b = document.createElement('button'); b.className = 'st'; b.type = 'button';
    b.style.top = Math.min(rh, (Math.min(H, s.offsetTop) / H) * rh) + 'px'; b.innerHTML = `<em>${String(i).padStart(2, '0')} · ${s.dataset.st}</em>`;
    b.setAttribute('aria-label', s.dataset.st); b.onclick = () => goTo(s.id === 'top' ? 0 : s); rail.append(b); s._st = b; });
}
let curStop = null;
function setStop(s){ if (s === curStop) return; curStop = s;
  stops.forEach(x => x._st && x._st.classList.toggle('cur', x === s));
  if (STILL) now.textContent = s.dataset.st; else gsap.to(now, {duration: .6, scrambleText: {text: s.dataset.st, chars: 'upperCase', speed: .6}}); }
ScrollTrigger.create({start: 0, end: 'max', onUpdate: st => {
  const p = st.progress, rh = rail.clientHeight;
  gsap.set('#railFill', {scaleY: p}); gsap.set('#walker', {y: p * rh});
  stops.forEach(s => s._st && s._st.classList.toggle('on', parseFloat(s._st.style.top) <= p * rh + 1)); }});

/* ---------- hero: the boards flip in, the phone arrives and leans with the pointer ---------- */
(function hero(){
  const ph = $('#heroPhone'), chips = $$('.hero .chip');
  show($$('.hero .rv'));
  if (STILL) return;
  const tl = gsap.timeline({delay: .25});
  tl.from('.hero .line', {y: 20, opacity: 0, duration: .8})
    .add(() => flap($('.board .flap'), 0, .09), .1)
    .add(() => $$('.hero .rows .flap').forEach((f, i) => flap(f, .5 + i * .18, .028)), .1)
    .from('.hero .rows .k', {opacity: 0, x: -10, stagger: .18, duration: .6}, .6)
    .from('.hero h1', {y: 30, opacity: 0, duration: 1.2}, 1.3)
    .from('.ticket', {y: 30, opacity: 0, duration: 1.1}, 1.5)
    .from(ph, {y: 160, rotateY: -38, rotateX: 18, opacity: 0, duration: 1.8, ease: 'expo.out'}, .3)
    .from(chips, {scale: .4, opacity: 0, stagger: .14, duration: .9, ease: 'back.out(2)'}, 1.4)
    .from('.hero .scrolly', {opacity: 0, duration: 1}, 2.2);
  chips.forEach((c, i) => gsap.to(c, {y: i % 2 ? 12 : -12, duration: 2.6 + i * .4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 2 + i * .3}));
  const ry = gsap.quickTo(ph, 'rotateY', {duration: 1, ease: 'power3'}), rx = gsap.quickTo(ph, 'rotateX', {duration: 1, ease: 'power3'});
  addEventListener('pointermove', e => { if (scrollY > innerHeight) return; ry((e.clientX / innerWidth - .5) * 22); rx(-(e.clientY / innerHeight - .5) * 14); }, {passive: true});
  // leaving the hero: the phone drifts up, the board dims
  gsap.to('.hero .ph', {yPercent: -18, ease: 'none', scrollTrigger: {trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true}});
  gsap.to('.hero .wrap > div:first-child', {opacity: .25, yPercent: -10, ease: 'none', scrollTrigger: {trigger: '.hero', start: 'center top', end: 'bottom top', scrub: true}});
})();

/* ---------- each stop's sign, heading and lede ---------- */
function reveal(){
  $$('.stop .sign').forEach(s => { show(s); if (STILL) return;
    const tl = gsap.timeline({scrollTrigger: {trigger: s, start: 'top 88%', once: true}});
    tl.from($('i', s), {scale: 0, rotate: -180, duration: .9, ease: 'back.out(2)'}).from($$('b,span', s), {x: -16, opacity: 0, stagger: .08, duration: .7}, '-=.5').from($('.dash', s), {scaleX: 0, duration: 1.4, ease: 'expo.inOut'}, '-=.7'); });
  $$('h2.big, .merge h3, .learn h3, .end .big').forEach(h => { show(h); if (STILL) return;
    SplitText.create(h, {type: 'lines', mask: 'lines', autoSplit: true, onSplit: self => gsap.from(self.lines, {yPercent: 110, stagger: .1, duration: 1.3, scrollTrigger: {trigger: h, start: 'top 88%', once: true}})}); });
  $$('.stop .lede').forEach(p => { show(p); if (STILL) return; gsap.from(p, {y: 30, opacity: 0, duration: 1.1, scrollTrigger: {trigger: p, start: 'top 90%', once: true}}); });
}
reveal();

/* ---------- 01: the question, word by word with the scroll; the alerts flip to DELAYED ---------- */
(function question(){
  const q = $('#q');
  if (!STILL) { const sp = SplitText.create(q, {type: 'words,chars'});
    gsap.from(sp.chars, {yPercent: 60, opacity: 0, rotate: 8, stagger: .025, ease: 'none', scrollTrigger: {trigger: q, start: 'top 85%', end: 'top 30%', scrub: .6}}); }
  $$('.alert').forEach((a, i) => { show(a); const f = $('.flap', a);
    if (STILL) return;
    gsap.from(a, {y: 40, opacity: 0, duration: 1, delay: i * .05, scrollTrigger: {trigger: a, start: 'top 92%', once: true, onEnter: () => flap(f, .35, .05)}}); });
  $$('.who .rv').forEach((w, i) => { show(w); if (!STILL) gsap.from(w, {y: 60, opacity: 0, duration: 1.2, delay: i * .12, scrollTrigger: {trigger: w, start: 'top 90%', once: true}}); });
})();

/* ---------- 02: platforms rise; two lines merge into the Walkie interchange ---------- */
(function research(){
  $$('.plat').forEach((p, i) => { show(p); if (!STILL) gsap.from(p, {y: 90, rotateX: -18, transformOrigin: '50% 100%', opacity: 0, duration: 1.3, delay: i * .12, scrollTrigger: {trigger: '.plats', start: 'top 85%', once: true}}); });
  show($$('.merge .rv'));
  if (!STILL) { const tl = gsap.timeline({scrollTrigger: {trigger: '.merge svg', start: 'top 80%', end: 'bottom 45%', scrub: .8}});
    tl.from('.merge .ml', {drawSVG: '0%', duration: 1, ease: 'none'}).from('.merge .ix', {scale: 0, transformOrigin: '420px 190px', duration: .3, ease: 'back.out(3)'}, .7).from('.merge .ixl', {opacity: 0, x: -20, duration: .3}, .8);
    gsap.from($$('.merge .rv'), {y: 30, opacity: 0, stagger: .12, duration: 1, scrollTrigger: {trigger: '.merge', start: 'top 80%', once: true}}); }
  const g = $$('.goals .rv'); show(g);
  if (!STILL) gsap.from(g, {opacity: 0, y: 30, stagger: {each: .06, grid: [2, 4], from: 'start'}, duration: .9, scrollTrigger: {trigger: '.goals', start: 'top 85%', once: true},
    onStart: () => g.forEach((d, i) => gsap.to($('span', d), {duration: .8, delay: i * .06, scrambleText: {text: $('span', d).textContent, chars: '0123456789', speed: .5}}))});
})();

/* ---------- 03: tickets are dealt, then tilt with the pointer ---------- */
(function riders(){
  const t = $$('.tk'); show(t); show($$('#riders .std'));
  if (STILL) return;
  gsap.from(t, {y: 120, rotate: i => [-7, 2, 8][i], opacity: 0, stagger: .14, duration: 1.4, ease: 'expo.out', scrollTrigger: {trigger: '.tix', start: 'top 85%', once: true}});
  gsap.from('#riders .std span', {y: 20, opacity: 0, stagger: .06, duration: .8, scrollTrigger: {trigger: '#riders .std', start: 'top 92%', once: true}});
  t.forEach(k => { const rx = gsap.quickTo(k, 'rotateX', {duration: .6, ease: 'power3'}), ry = gsap.quickTo(k, 'rotateY', {duration: .6, ease: 'power3'});
    k.addEventListener('pointermove', e => { const r = k.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 14); rx(-((e.clientY - r.top) / r.height - .5) * 12); });
    k.addEventListener('pointerleave', () => { rx(0); ry(0); }); });
})();

/* ---------- 04: the route. Pinned; the scroll drives the bus along the line and the track sideways ---------- */
(function route(){
  const sec = $('#route'), track = $('#track'), svg = $('#routeSvg'), rp = $('#rp'), on = $('#rpOn'), bus = $('#bus'), cards = $$('#route .card');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 981px)', () => {
    const W = track.offsetWidth, H = innerHeight, pts = [];
    for (let i = 0; i < 6; i++) pts.push([W * (.1 + i * .16), H * (i % 2 ? .74 : .56)]);
    let d = `M${pts[0][0] - W * .08} ${pts[0][1]} L${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`; }
    d += ` L${pts[5][0] + W * .06} ${pts[5][1]}`;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); rp.setAttribute('d', d); on.setAttribute('d', d);
    // the stations on the line
    $$('.dot', svg).forEach(e => e.remove());
    pts.forEach(([x, y]) => { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('class', 'dot'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 13); c.setAttribute('fill', '#0A1128'); c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', 5); svg.append(c); });
    cards.forEach((c, i) => { const [x, y] = pts[i], ch = c.offsetHeight || 190; c.style.left = (x - 40) + 'px'; c.style.top = (i % 2 ? Math.min(H - ch - 20, y + 40) : Math.max(260, y - ch - 40)) + 'px'; });
    const tl = gsap.timeline({scrollTrigger: {trigger: sec, start: 'top top', end: () => '+=' + W * .9, pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: st => cards.forEach((c, i) => c.classList.toggle('on', st.progress >= i / 5 - .04))}});
    tl.to(track, {x: () => -(W - innerWidth), ease: 'none', duration: 1}, 0)
      .fromTo(on, {drawSVG: '0%'}, {drawSVG: '100%', ease: 'none', duration: 1}, 0)
      .to(bus, {motionPath: {path: rp, align: rp, alignOrigin: [.5, .5], autoRotate: false}, ease: 'none', duration: 1}, 0);
    return () => { cards.forEach(c => { c.style.left = c.style.top = ''; c.classList.remove('on'); }); };
  });
  mm.add('(max-width: 980px)', () => { cards.forEach(c => c.classList.add('on')); });
})();

/* ---------- 05: the ride. One pinned phone; each stop swaps the screen, the words and the why ---------- */
(function ride(){
  const sec = $('#ride'), L = $$('#rideL .ch'), R = $$('#rideR .why'), imgs = $$('#rideScr img'), ticks = $$('#ticks b'), pin = $('#ridePin'), N = 8;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 981px)', () => {
    gsap.set([...L, ...R], {autoAlpha: 0, y: 40}); gsap.set(L[0], {autoAlpha: 1, y: 0}); gsap.set(R[0], {autoAlpha: 1, y: 0});
    gsap.set(imgs, {clipPath: 'inset(100% 0 0 0)'}); gsap.set(imgs[0], {clipPath: 'inset(0% 0 0 0)'});
    let cur = 0;
    const scr = $('#rideScr');
    const layer = (c, b) => imgs.find(im => +im.dataset.c === c && (+im.dataset.b || 0) === b);
    function go(i){ if (i === cur) return; const down = i > cur, a = L[cur], b = L[i];
      gsap.to([a, R[cur]], {autoAlpha: 0, y: down ? -40 : 40, duration: .5, ease: 'power2.in', overwrite: true});
      gsap.fromTo([b, R[i]], {autoAlpha: 0, y: down ? 40 : -40}, {autoAlpha: 1, y: 0, duration: .9, delay: .25, overwrite: true});
      const nb = layer(i, 0); imgs.forEach(im => gsap.set(im, {zIndex: im === nb ? 3 : 1}));
      gsap.fromTo(nb, {clipPath: down ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)'}, {clipPath: 'inset(0% 0 0% 0)', duration: .9, ease: 'snap', overwrite: true});
      cur = i; }
    const st = ScrollTrigger.create({trigger: sec, start: 'top top', end: () => '+=' + innerHeight * N * .85, pin: true, scrub: true, anticipatePin: 1,
      onUpdate: s => { const f = s.progress * N, i = Math.min(N - 1, Math.floor(f)), k = f - i;
        go(i); ticks.forEach((t, j) => gsap.set(t, {scaleX: j < i ? 1 : j === i ? k : 0}));
        // inside a stop: tall screens scroll, two-screen stops cross over halfway
        const base = layer(i, 0), alt = layer(i, 1), sh = scr.clientHeight;
        if (base && base.naturalHeight) { const over = base.offsetHeight - sh; gsap.set(base, {y: over > 4 ? -over * gsap.utils.clamp(0, 1, (k - .15) / .7) : 0}); }
        if (alt) { gsap.set(alt, {zIndex: 4, clipPath: `inset(${(1 - gsap.utils.clamp(0, 1, (k - .5) / .25)) * 100}% 0 0 0)`}); }
        imgs.forEach(im => { if (+im.dataset.b && +im.dataset.c !== i) gsap.set(im, {clipPath: 'inset(100% 0 0 0)'}); });
        // the pin pulses on the directions stop, over the bus route
        gsap.set(pin, {opacity: i === 2 ? 1 : 0, left: '58%', top: (38 - 20 * gsap.utils.clamp(0, 1, (k - .15) / .7)) + '%'}); }});
    return () => { st.kill(); gsap.set([...L, ...R, ...imgs], {clearProps: 'all'}); };
  });
})();

/* ---------- 06: the accessibility centre, working ---------- */
(function access(){
  const tabs = $$('.acc .ask button'), panes = $$('.acc .pn'), lays = $$('#accScr .lay'), scr = $('#accScr'), lens = $('#lens'), cue = $('#cue'), cap = $('#capbox');
  const speak = (t, onb) => { if (!('speechSynthesis' in window)) return false; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'en-GB'; u.rate = .98; if (onb) u.onboundary = onb; speechSynthesis.speak(u); return u; };
  const layer = n => lays.forEach(l => l.classList.toggle('on', l.dataset.l === n));
  let mode = 'deaf';
  function set(p){ mode = p; tabs.forEach(t => { const on = t.dataset.p === p; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
    panes.forEach(x => x.classList.toggle('on', x.dataset.p === p));
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    scr.style.filter = ''; gsap.set([cue, cap], {opacity: 0}); $$('#cv button').forEach((b, i) => b.classList.toggle('on', !i));
    layer({deaf: $('#tCap').getAttribute('aria-pressed') === 'true' ? 'deaf2' : 'deaf', vision: 'vision', colour: 'colour', motor: 'motor' + mi, read: 'read'}[p]);
    if (!STILL) gsap.fromTo('#accPhone', {rotateY: -10, scale: .97}, {rotateY: 0, scale: 1, duration: .8}); }
  tabs.forEach(t => t.onclick = () => set(t.dataset.p));
  show($$('.acc .rv'));
  if (!STILL) gsap.from('.acc .ask button', {x: -40, opacity: 0, stagger: .08, duration: .9, scrollTrigger: {trigger: '.acc .grid', start: 'top 80%', once: true}});

  // deaf: captions switch the reel on; mono audio merges the two channels
  const tog = (b, fn) => b.onclick = () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', v); fn(v); };
  tog($('#tCap'), v => { layer(v ? 'deaf2' : 'deaf');
    gsap.killTweensOf(cue);
    if (v) { gsap.set(cue, {top: '53.5%', height: '8.5%', left: '6%', right: '17%'}); gsap.fromTo(cue, {opacity: 0, scale: 1.15}, {opacity: 1, scale: 1, duration: .6, delay: .4, ease: 'back.out(2)'}); gsap.to(cue, {opacity: 0, duration: .6, delay: 3}); }
    else gsap.set(cue, {opacity: 0}); });
  tog($('#tMono'), v => { if (!STILL) gsap.fromTo('#accPhone', {x: v ? -10 : 10}, {x: 0, duration: .8, ease: 'elastic.out(1,.4)'}); });

  // visually impaired: a magnifier under the pointer, and the home read aloud with a cue moving over each part
  let z = 2; $('#zoom').oninput = e => { z = +e.target.value; };
  scr.addEventListener('pointermove', e => { if (mode !== 'vision') return; const r = scr.getBoundingClientRect(), img = $('.lay.on', scr); if (!img) return;
    const x = e.clientX - r.left, y = e.clientY - r.top, iw = img.offsetWidth * z, ih = img.offsetHeight * z;
    lens.style.backgroundImage = `url(${img.currentSrc || img.src})`; lens.style.backgroundSize = `${iw}px ${ih}px`;
    lens.style.backgroundPosition = `${-x * z + 75}px ${-y * z + 75}px`;
    const pr = scr.parentElement.getBoundingClientRect(); lens.style.transform = `translate(${e.clientX - pr.left - 75}px, ${e.clientY - pr.top - 75}px)`; lens.style.opacity = 1; });
  scr.addEventListener('pointerleave', () => { lens.style.opacity = 0; });
  const parts = [['Hi Mahmoud. Let’s find some places near you. Welcome to Ismailia.', 9, 21], ['Search for anything.', 31, 6], ['Stories, from Remi, Memo, Mai and Kross.', 37, 13], ['How you can get a gift. Let’s go.', 51, 39]];
  $('#listen').onclick = () => { layer('vision'); let i = 0;
    const next = () => { if (i >= parts.length || mode !== 'vision') { gsap.to(cue, {opacity: 0}); return; } const [t, top, h] = parts[i++];
      gsap.set(cue, {left: '6%', right: '6%'}); gsap.to(cue, {opacity: 1, top: top + '%', height: h + '%', duration: .5});
      const u = speak(t); if (u) u.onend = next; else setTimeout(next, 1800); };
    next(); };

  // colour: the standard home through three colour visions
  $$('#cv button').forEach(b => b.onclick = () => { $$('#cv button').forEach(x => x.classList.toggle('on', x === b)); scr.style.filter = b.dataset.f === 'none' ? '' : `url(#${b.dataset.f})`; });

  // motor: dwell to press. Rest the pointer on Back or Next and it fires by itself
  let mi = 0, dT = 1.2; $('#dwellT').oninput = e => { dT = +e.target.value; };
  $$('.dwell').forEach(b => { let tw;
    const fire = () => { mi = (mi + +b.dataset.dir + 3) % 3; layer('motor' + mi); gsap.fromTo(b, {scale: .94}, {scale: 1, duration: .4}); b.style.setProperty('--d', 0); };
    b.addEventListener('pointerenter', () => { tw = gsap.fromTo(b, {'--d': 0}, {'--d': 1, duration: dT, ease: 'none', onComplete: fire}); });
    b.addEventListener('pointerleave', () => { tw && tw.kill(); gsap.to(b, {'--d': 0, duration: .3}); });
    b.onclick = fire; });

  // literacy: the choices, read aloud
  $('#readMenu').onclick = () => speak('What is your problem? Deaf. Visually impaired. Colour filters. Muscular disabilities. Illiterate.');
})();

/* ---------- 07: the website strip, dragged with inertia and nudged by the scroll ---------- */
(function web(){
  const strip = $('#strip'), wrap = $('#webs');
  const bounds = () => ({minX: Math.min(0, innerWidth - strip.scrollWidth), maxX: 0});
  Draggable.create(strip, {type: 'x', inertia: true, bounds: bounds(), edgeResistance: .85, dragClickables: true, onPress(){ this.applyBounds(bounds()); }});
  if (!STILL) {
    gsap.from('.bw', {y: 80, opacity: 0, rotate: i => (i % 2 ? 2 : -2), stagger: .08, duration: 1.2, scrollTrigger: {trigger: wrap, start: 'top 85%', once: true}});
    // each screen scrolls itself slowly while the pointer rests on it
    $$('.bw').forEach(f => { const im = $('img', f), vw = $('.vw', f); let tw;
      f.addEventListener('pointerenter', () => { const d = im.offsetHeight - vw.clientHeight; if (d > 0) tw = gsap.to(im, {y: -d, duration: d / 120, ease: 'none'}); });
      f.addEventListener('pointerleave', () => { tw && tw.kill(); gsap.to(im, {y: 0, duration: .9}); }); });
  }
})();

/* ---------- 08: states pop in on a slight fan ---------- */
(function states(){ const f = $$('.states figure'); show(f);
  if (!STILL) gsap.from(f, {y: 100, rotate: i => (i - 2.5) * 3, opacity: 0, stagger: .08, duration: 1.3, ease: 'expo.out', scrollTrigger: {trigger: '.states', start: 'top 85%', once: true}}); })();

/* ---------- 09: the system map draws itself, line by line ---------- */
(function engine(){ show($$('.engine .rv'));
  if (STILL) return;
  const tl = gsap.timeline({scrollTrigger: {trigger: '#map', start: 'top 80%', end: 'bottom 55%', scrub: .8}});
  tl.from('#map .mp', {drawSVG: '0%', stagger: .12, duration: .6, ease: 'none'}).from('#map .sts > *', {opacity: 0, stagger: .015, duration: .2}, .2); })();

/* ---------- 10: impact and learnings ---------- */
(function impact(){ const c = $$('.imp .rv'), li = $$('.learn li'); show(c); show(li);
  if (STILL) return;
  gsap.from(c, {y: 70, opacity: 0, stagger: .1, duration: 1.2, scrollTrigger: {trigger: '.imp', start: 'top 85%', once: true}});
  gsap.from(li, {x: 50, opacity: 0, stagger: .1, duration: 1, scrollTrigger: {trigger: '.learn ol', start: 'top 85%', once: true}}); })();

/* ---------- terminus: the departures board flips, the end rises ---------- */
(function terminus(){ show($$('#terminus .rv'));
  const rows = $$('.deps .r');
  if (STILL) return;
  gsap.from('.deps', {y: 60, opacity: 0, duration: 1.2, scrollTrigger: {trigger: '.deps', start: 'top 85%', once: true,
    onEnter: () => rows.forEach((r, i) => $$('.flap', r).forEach((f, j) => flap(f, .3 + i * .25 + j * .12, .035)))}});
  gsap.from('.nextc', {y: 50, opacity: 0, duration: 1.2, scrollTrigger: {trigger: '.nextc', start: 'top 92%', once: true}});
  gsap.from('.end .facts', {opacity: 0, duration: 1.2, scrollTrigger: {trigger: '.end', start: 'top 85%', once: true}}); })();

/* ---------- the stop you're at: made last, so the pinned sections above are already counted ---------- */
stops.forEach(s => ScrollTrigger.create({trigger: s, start: 'top 45%', end: 'bottom 45%', onToggle: st => st.isActive && setStop(s)}));

/* ---------- anything still hidden: a plain rise ---------- */
$$('.rv').forEach(el => { if (getComputedStyle(el).visibility === 'hidden') { show(el); if (!STILL) gsap.from(el, {y: 40, opacity: 0, duration: 1, scrollTrigger: {trigger: el, start: 'top 92%', once: true}}); } });

/* ---------- once fonts and the first screens are in, measure everything ---------- */
Promise.all([document.fonts.ready, ...$$('img').slice(0, 6).map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))]).then(() => {
  ScrollTrigger.refresh(); placeStations(); });
addEventListener('resize', () => { clearTimeout(window.__rz); window.__rz = setTimeout(() => { ScrollTrigger.refresh(); placeStations(); }, 250); });
ScrollTrigger.addEventListener('refresh', placeStations);
