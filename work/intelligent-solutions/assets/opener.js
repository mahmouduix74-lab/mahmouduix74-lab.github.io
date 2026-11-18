/* Opening cover: the iS mark grows out of four dots (GSAP MorphSVG), then flies into the navigation
   logo (the same box, like a Flip) while the purple field lifts off the hero. Plays once on load, about 2.4 s.
   Skipped in ?solo (stills / video), with ?nocover, and when the visitor prefers reduced motion. */
(() => {
  const Q = new URLSearchParams(location.search);
  const op = document.getElementById('opener'), mark = document.getElementById('opener-mark');
  const skip = Q.has('solo') || Q.has('nocover') || Q.has('tour') || matchMedia('(prefers-reduced-motion: reduce)').matches || !window.gsap || !window.MorphSVGPlugin;
  if (skip) { op && op.remove(); mark && mark.remove(); return; }
  gsap.registerPlugin(MorphSVGPlugin);
  window.coverEnd = performance.now() / 1000 + 2.15;   // the engine starts the hero entrance and the scroll at this moment
  const MARK = 'M7.75,179.77 L5.62,181.75 L5.00,186.75 L6.12,314.00 L7.82,315.92 L11.25,316.50 L46.75,316.45 L48.82,314.95 L49.50,312.00 L49.52,182.00 L48.18,180.17 L45.50,179.50Z M28.75,95.00 L19.50,96.93 L10.27,103.00 L4.43,111.50 L2.82,116.50 L2.00,123.50 L2.70,129.75 L4.50,135.25 L10.50,144.00 L14.75,147.40 L20.50,150.20 L29.75,151.68 L40.00,149.28 L48.92,142.75 L52.55,137.75 L54.58,133.25 L55.98,127.75 L56.25,122.00 L53.83,111.75 L47.55,102.60 L39.50,97.25Z M226.00,2.08 L223.25,2.68 L85.00,74.27 L81.93,76.83 L81.00,81.00 L81.00,170.75 L81.62,175.25 L83.28,177.50 L279.25,288.42 L283.25,289.28 L294.00,284.60 L303.50,284.47 L308.75,286.15 L313.25,288.83 L317.60,293.00 L320.27,297.25 L322.30,305.00 L321.95,310.50 L319.75,316.50 L316.18,321.25 L311.50,324.95 L304.75,327.68 L299.00,328.25 L292.50,327.20 L285.50,323.80 L280.00,318.25 L276.97,312.50 L275.78,303.00 L274.40,300.78 L250.50,286.92 L247.75,285.90 L245.00,286.03 L221.25,295.27 L217.00,295.23 L84.75,225.72 L82.30,226.03 L81.25,230.00 L81.50,313.75 L82.77,319.67 L86.25,322.23 L150.75,357.25 L202.50,384.33 L212.00,388.18 L219.50,389.37 L224.25,388.77 L234.50,385.03 L248.50,382.53 L256.25,380.00 L263.25,376.20 L274.25,371.93 L302.75,356.45 L334.55,337.67 L351.00,326.38 L358.50,319.47 L367.68,312.75 L369.67,309.50 L371.07,298.50 L372.50,259.00 L372.47,224.75 L371.68,222.53 L369.25,220.40 L171.00,108.88 L167.50,108.02 L156.75,112.90 L147.75,113.20 L139.25,109.80 L132.73,102.75 L130.57,97.50 L130.10,90.25 L131.48,85.00 L134.85,79.33 L140.00,74.93 L145.25,72.53 L152.50,71.65 L157.75,72.55 L164.50,76.05 L169.62,81.50 L172.07,86.75 L173.20,95.25 L174.60,97.55 L199.00,111.30 L201.75,112.13 L204.50,111.82 L226.50,102.33 L231.75,102.25 L370.25,172.78 L371.95,172.22 L372.72,170.25 L373.00,83.00 L371.60,78.85 L239.75,8.45Z M110.55,171.03 L113.50,168.20 L171.50,134.63 L175.00,133.95 L343.75,228.05 L346.63,230.12 L347.27,232.00 L343.25,235.77 L285.00,270.92 L282.50,270.85 L111.78,173.42Z';
  const DOTS = 'M24.65,248.31 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0Z M25.55,125.19 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0Z M230.02,222.32 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0Z M236.16,204.45 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0Z';
  const shape = document.getElementById('opener-shape'), tag = op.querySelector('.opener__tag');
  shape.setAttribute('d', DOTS);
  const place = () => { const w = Math.min(innerWidth, innerHeight) * .22; Object.assign(mark.style, { width: w + 'px', left: (innerWidth - w) / 2 + 'px', top: (innerHeight - w * 391.75 / 375.25) / 2 + 'px' }); };
  place();
  const go = () => {
    const logo = document.querySelector('.nav__logo img');
    const tl = gsap.timeline({ onComplete: () => { op.remove(); mark.remove(); } });
    tl.fromTo(tag, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, ease: 'expo.out' }, .1)
      .fromTo(mark, { scale: .55, rotate: -8 }, { scale: 1, rotate: 0, duration: 1.2, ease: 'expo.out' }, .15)
      .to(shape, { morphSVG: { shape: MARK, type: 'rotational' }, duration: 1.1, ease: 'power3.inOut' }, .2)
      .to(tag, { opacity: 0, y: -8, duration: .35, ease: 'power2.in' }, 1.3)
      .add(() => {
        // the logo is still waiting for its own entrance (shifted up 18 px by the engine), so land on its resting box
        const r = logo.getBoundingClientRect();
        gsap.to(mark, { left: r.left, top: r.top + 18, width: r.width, duration: .95, ease: 'expo.inOut' });
      }, 1.4)
      .to(op, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.0, ease: 'expo.inOut' }, 1.45)
      .to(mark, { opacity: 0, duration: .35, ease: 'power1.out' }, 2.35);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
