/* Realistic switch: a latching push switch. A raised cap sinks into its socket when pressed,
   stays down and glows while on, and springs back up on the next press.
   Vanilla port of @evilbuttons/realistic-switch (shadcn registry), with no React, Tailwind or Motion.

   Use:  <button class="rsw" data-color="#FF5A1F" aria-label="Power"></button>
         RealisticSwitch.mount(document.querySelector('.rsw'), { onChange: on => {} })
   Options (or data- attributes): color, mark, tone ('auto' | 'light' | 'dark'), size ('sm' | 'default' | 'lg'),
   checked, illuminated (default true), sound (default false).
   Everything is sized in em, so one font size scales the whole switch. */
(() => {
  const css = `
.rsw{--hi:#fff;--mid:#efeff2;--lo:#d9d9df;--well:#c9c9d1;--well-lo:#aeaeb8;--floor:rgb(20 20 40/.35);--spill:.35;
  position:relative;display:inline-flex;cursor:pointer;border:0;background:none;border-radius:1.1em;padding:1.4em .5em .5em;
  outline:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;font-size:15px;line-height:0;color:inherit}
.rsw[data-size=sm]{font-size:11px}.rsw[data-size=lg]{font-size:19px}
.rsw[data-tone=dark]{--hi:#3a3a40;--mid:#26262b;--lo:#18181b;--well:#0d0d10;--well-lo:#050506;--floor:rgb(0 0 0/.8);--spill:.6}
@media (prefers-color-scheme:dark){.rsw[data-tone=auto]{--hi:#3a3a40;--mid:#26262b;--lo:#18181b;--well:#0d0d10;--well-lo:#050506;--floor:rgb(0 0 0/.8);--spill:.6}}
.rsw:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--cap)}
.rsw:disabled{cursor:not-allowed;opacity:.5}
.rsw>.b{position:relative;display:block;width:4.4em;height:4.4em}
.rsw .b>span{position:absolute;display:block}
.rsw .plate{inset:-.3em;border-radius:1.05em;background:linear-gradient(to bottom,var(--hi),var(--mid) 50%,var(--lo));
  box-shadow:0 .08em .1em rgb(0 0 0/.18),0 .5em 1em -.3em var(--floor),inset 0 .05em 0 rgb(255 255 255/.6),inset 0 -.06em 0 rgb(0 0 0/.18)}
.rsw .well{inset:0;border-radius:.85em;background:linear-gradient(to bottom,var(--well-lo),var(--well));
  box-shadow:inset 0 .14em .3em rgb(0 0 0/.5),inset 0 -.04em 0 rgb(255 255 255/.25),0 .04em 0 rgb(255 255 255/.5)}
.rsw .spill{inset:.15em;border-radius:.75em;filter:blur(.35em);background:var(--cap);opacity:0;transition:opacity .5s}
.rsw[aria-checked=true][data-lit] .spill{opacity:var(--spill)}
.rsw .shade{inset:.55em;border-radius:.7em;background:rgb(0 0 0/.7);filter:blur(.3em);will-change:transform,opacity}
.rsw .walls{left:.55em;right:.55em;bottom:.55em;top:-.95em;overflow:hidden;border-radius:0 0 .7em .7em}
.rsw .walls>i{position:absolute;left:0;right:0;top:1.5em;height:4.25em;border-radius:.7em;overflow:hidden;will-change:transform;
  background:linear-gradient(to bottom,color-mix(in oklab,var(--cap) 62%,black),color-mix(in oklab,var(--cap) 40%,black))}
.rsw .walls>i::after{content:"";position:absolute;inset:0;background:linear-gradient(to right,rgb(0 0 0/.35),transparent 18%,rgb(255 255 255/.08) 50%,transparent 82%,rgb(0 0 0/.35))}
.rsw .cap{left:.55em;top:.55em;width:3.3em;height:3.3em;border-radius:.7em;overflow:hidden;will-change:transform;
  background:linear-gradient(to bottom,color-mix(in oklab,var(--cap) 80%,white),var(--cap) 45%,color-mix(in oklab,var(--cap) 86%,black));
  box-shadow:inset 0 .06em 0 color-mix(in oklab,var(--cap) 45%,white),inset 0 -.08em .05em color-mix(in oklab,var(--cap) 60%,black)}
.rsw .cap>i{position:absolute;display:block}
.rsw .dish{inset:.34em;border-radius:.5em;background:linear-gradient(to bottom,color-mix(in oklab,var(--cap) 82%,black),color-mix(in oklab,var(--cap) 92%,white));
  box-shadow:inset 0 .07em .12em color-mix(in oklab,var(--cap) 45%,black),0 .04em 0 color-mix(in oklab,var(--cap) 55%,white)}
.rsw .lamp{inset:0;opacity:0;transition:opacity .5s;background:radial-gradient(circle at 50% 50%,rgb(255 240 225/.55),rgb(255 200 170/.18) 50%,transparent 80%)}
.rsw[aria-checked=true][data-lit] .lamp{opacity:1}
.rsw .cap svg{position:absolute;left:50%;top:50%;width:1.25em;height:1.25em;transform:translate(-50%,-50%);fill:none;stroke:var(--mark);stroke-width:2.4;stroke-linecap:round;
  filter:drop-shadow(0 .04em 0 rgb(0 0 0/.35));transition:filter .5s}
.rsw[aria-checked=true][data-lit] .cap svg{filter:drop-shadow(0 0 .12em rgb(255 255 255/.9))}`;

  // Cap height above the socket floor, in em, in each state. It is the one thing that moves.
  const H = { up: .95, hover: .82, pressed: .1, latched: .34, latchedHover: .3 };
  const K = 520, C = 30, M = .6;   // the spring: a touch of bounce, no wobble through the hover dip
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let audio = null;

  // A switch click is a very short, bright burst of noise; latching is pitched a little higher than releasing.
  function click(on) {
    try {
      audio ??= new AudioContext();
      const n = Math.floor(audio.sampleRate * .03), buf = audio.createBuffer(1, n, audio.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 6;
      const src = audio.createBufferSource(); src.buffer = buf;
      const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = on ? 3400 : 2500; f.Q.value = 1.1;
      const g = audio.createGain(); g.gain.value = .7;
      src.connect(f).connect(g).connect(audio.destination); src.start();
    } catch { /* no audio: the switch still works silently */ }
  }

  function mount(el, o = {}) {
    if (!document.getElementById('rsw-css')) { const s = document.createElement('style'); s.id = 'rsw-css'; s.textContent = css; document.head.append(s); }
    const ds = el.dataset, opt = k => o[k] ?? ds[k];
    el.type = 'button'; el.setAttribute('role', 'switch');
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Power');
    el.dataset.tone = opt('tone') || 'auto'; el.dataset.size = opt('size') || 'default';
    el.style.setProperty('--cap', opt('color') || '#e1261c');
    el.style.setProperty('--mark', opt('mark') || 'rgb(255 255 255/.92)');
    if ((opt('illuminated') ?? true) + '' !== 'false') el.dataset.lit = '';
    const sound = (opt('sound') ?? false) + '' === 'true';
    el.innerHTML = '<span class="b" aria-hidden="true"><span class="plate"></span><span class="well"></span><span class="spill"></span><span class="shade"></span>'
      + '<span class="walls"><i></i></span><span class="cap"><i class="dish"></i><i class="lamp"></i>'
      + '<svg viewBox="0 0 24 24"><path d="M12 3v8"/><path d="M7.05 6.4a7 7 0 1 0 9.9 0"/></svg></span></span>';
    const shade = el.querySelector('.shade'), walls = el.querySelector('.walls>i'), cap = el.querySelector('.cap');

    let on = (opt('checked') ?? false) + '' === 'true', press = false, hover = false;
    const target = () => press ? H.pressed : on ? (hover ? H.latchedHover : H.latched) : (hover ? H.hover : H.up);
    let h = target(), v = 0, raf = 0, t0 = 0;

    // The walls ride up with the cap; the cast shadow spreads and fades as the cap rises off the floor.
    const draw = () => {
      const k = Math.min(Math.max(h / H.up, 0), 1.2);
      cap.style.transform = walls.style.transform = `translateY(${-h}em)`;
      shade.style.opacity = .35 + .65 * k;
      shade.style.transform = `translateY(${.05 + h * .35}em) scale(${.92 + .14 * k})`;
    };
    const step = now => {
      const dt = Math.min((now - t0) / 1000, 1 / 30); t0 = now;
      const x = target();
      for (let i = 0; i < 4; i++) { const s = dt / 4; v += (-K * (h - x) - C * v) / M * s; h += v * s; }   // a few substeps keep the stiff spring stable
      if (Math.abs(h - x) < 1e-4 && Math.abs(v) < 1e-3) { h = x; v = 0; raf = 0; }
      else raf = requestAnimationFrame(step);
      draw();
    };
    const go = () => {
      if (reduce.matches) { h = target(); v = 0; draw(); return; }
      if (!raf) { t0 = performance.now(); raf = requestAnimationFrame(step); }
    };
    const set = (next, quiet) => {
      on = next; el.setAttribute('aria-checked', on); go();
      if (!quiet) { if (sound) click(on); o.onChange?.(on); el.dispatchEvent(new CustomEvent('change', { detail: on })); }
    };

    el.addEventListener('click', () => set(!on));
    el.addEventListener('pointerdown', e => { if (e.button === 0) { press = true; go(); } });
    el.addEventListener('pointerup', () => { press = false; go(); });
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; go(); } });
    el.addEventListener('pointerleave', () => { press = hover = false; go(); });
    el.addEventListener('pointercancel', () => { press = false; go(); });
    el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { press = true; go(); } });
    el.addEventListener('keyup', () => { press = false; go(); });
    el.addEventListener('blur', () => { press = false; go(); });

    el.setAttribute('aria-checked', on); draw();
    return { get checked() { return on; }, set checked(x) { set(!!x, true); } };
  }

  window.RealisticSwitch = { mount, mountAll: (sel = '.rsw', o) => [...document.querySelectorAll(sel)].map(el => mount(el, o)) };
})();
