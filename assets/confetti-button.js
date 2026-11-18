/* Confetti button: a ringed dark button with a sparkle icon that fires a restrained confetti burst on click.
   Vanilla port of @evilbuttons/confetti-button (shadcn registry), with no React or Tailwind.
   Needs assets/vendor/confetti.browser.js (canvas-confetti, ISC) loaded first.

   Use:  <button class="cfb">Continue</button>
         ConfettiButton.mount(el, { particleCount, spread, startVelocity, colors, icon, onCelebrate })
   ConfettiButton.burst(el, options) fires a burst from any element, for buttons styled their own way. */
(() => {
  const css = `
.cfb{display:inline-flex;height:36px;cursor:pointer;align-items:center;justify-content:center;gap:8px;border:0;border-radius:10px;padding:0 16px;
  font:inherit;font-size:14px;font-weight:500;color:#fafafa;outline:none;user-select:none;-webkit-user-select:none;
  background:linear-gradient(to bottom,#353535,#272727);
  box-shadow:0 0 0 1px rgb(0 0 0/.9),inset 0 0 0 1px rgb(255 255 255/.06),inset 0 1px 0 rgb(255 255 255/.14),0 1px 2px rgb(0 0 0/.25),0 4px 12px -4px rgb(0 0 0/.4);
  transition:scale .3s cubic-bezier(.34,1.35,.64,1),filter .3s cubic-bezier(.34,1.35,.64,1),box-shadow .3s cubic-bezier(.34,1.35,.64,1)}
.cfb.ic{padding-left:12px}
.cfb:hover{filter:brightness(1.1)}
.cfb:active{scale:.97;filter:brightness(.95);transition-duration:.1s;transition-timing-function:ease-out;
  box-shadow:0 0 0 1px rgb(0 0 0/.9),inset 0 0 0 1px rgb(255 255 255/.05),inset 0 1px 0 rgb(255 255 255/.08),0 0 1px rgb(0 0 0/.2),0 1px 3px -2px rgb(0 0 0/.3)}
.cfb:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px #FF5A1F}
.cfb:disabled{cursor:not-allowed;opacity:.5}
.cfb .sp{width:14px;height:14px;flex:none;fill:currentColor;color:rgb(250 250 250/.45);
  transition:rotate .3s cubic-bezier(.34,1.35,.64,1),scale .3s cubic-bezier(.34,1.35,.64,1),color .3s cubic-bezier(.34,1.35,.64,1)}
.cfb:hover .sp{rotate:12deg;color:rgb(250 250 250/.75)}
.cfb[data-firing] .sp{scale:1.25;rotate:45deg;color:#fde68a}
@media (prefers-reduced-motion:reduce){.cfb:active{scale:1}.cfb .sp{rotate:none!important;scale:none!important}}`;

  // Soft neutrals with a few cool accents, so the burst reads as polish, not a party.
  const COLORS = ['#fafafa', '#d4d4d4', '#a3a3a3', '#93c5fd', '#c4b5fd', '#fcd34d'];
  const FIRE_MS = 420;   // how long the sparkle stays lit after a burst
  const SPARK = '<svg class="sp" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5c.3 2.9 1.6 4.2 4.5 4.5-2.9.3-4.2 1.6-4.5 4.5-.3-2.9-1.6-4.2-4.5-4.5 2.9-.3 4.2-1.6 4.5-4.5Z"/><path d="M12.5 10c.15 1.3.7 1.85 2 2-1.3.15-1.85.7-2 2-.15-1.3-.7-1.85-2-2 1.3-.15 1.85-.7 2-2Z"/></svg>';

  // One tight burst of small flat pieces that fall and fade quickly.
  function burst(el, o = {}) {
    if (!window.confetti) return;
    const r = el.getBoundingClientRect();
    window.confetti({
      particleCount: o.particleCount ?? 80, spread: o.spread ?? 64, startVelocity: o.startVelocity ?? 32, colors: o.colors ?? COLORS,
      origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 3) / innerHeight },
      angle: 90, gravity: 1.1, decay: .9, ticks: 160, scalar: .75, shapes: ['square', 'circle'], zIndex: o.zIndex ?? 10000,
      disableForReducedMotion: true,
    });
  }

  function mount(el, o = {}) {
    if (!document.getElementById('cfb-css')) { const s = document.createElement('style'); s.id = 'cfb-css'; s.textContent = css; document.head.append(s); }
    el.classList.add('cfb');
    if (!el.type) el.type = 'button';
    if (!el.textContent.trim()) el.textContent = o.label ?? 'Continue';
    if (o.icon ?? true) { el.classList.add('ic'); el.innerHTML = SPARK + `<span>${el.innerHTML}</span>`; }
    let timer;
    el.addEventListener('click', e => {
      if (el.disabled || e.defaultPrevented) return;
      burst(el, o);
      el.dataset.firing = ''; clearTimeout(timer); timer = setTimeout(() => delete el.dataset.firing, FIRE_MS);
      o.onCelebrate?.();
    });
    return el;
  }

  window.ConfettiButton = { mount, burst, mountAll: (sel = '.cfb', o) => [...document.querySelectorAll(sel)].map(el => mount(el, o)) };
})();
