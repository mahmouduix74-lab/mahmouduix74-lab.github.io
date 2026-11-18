/* The home page "Works" band, rebuilt live from the Figma section (1440 x 841 design px):
   - the filter tabs: the purple pill slides to the tab you press (GSAP Flip);
   - the stacked carousel: Swiper, dragged or driven by the arrows, with the two cards on each side
     scaled and faded exactly as the design stacks them (835 / 722 / 538 px wide, 73 % opacity).
   Sizes are set inline in design px because the page's CSS build turns px into page units. */
(() => {
  const root = document.querySelector('.wk');
  if (!root) return;
  const SOLO = new URLSearchParams(location.search).has('solo');
  const W = 1440, H = 841;
  const board = root.querySelector('.wk__board');
  const px = (el, l, t, w, h, extra = {}) => Object.assign(el.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px', ...extra });
  root.style.height = '0'; root.style.paddingBottom = (H / W * 100).toFixed(4) + '%'; root.style.position = 'relative';
  Object.assign(board.style, { width: W + 'px', height: H + 'px', transformOrigin: '0 0', direction: 'ltr',
    backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,.045) 1px, transparent 1px), linear-gradient(rgba(0,0,0,.045) 1px, transparent 1px)',
    backgroundSize: '205.7px 205.7px', backgroundPosition: '-2px 0, 0 -113px' });
  const fit = () => { board.style.transform = `scale(${root.clientWidth / W})`; };
  fit(); addEventListener('resize', fit);

  // header, as placed in the design
  px(root.querySelector('.wk__title'), 659, 73, 128, 36);
  px(root.querySelector('.wk__sub'), 392, 130, 662, 37, { fontSize: '20px', lineHeight: '37px' });
  const bar = root.querySelector('.wt'); px(bar, 403, 191, 641, 72, { borderRadius: '36px' });
  const tabs = [...bar.querySelectorAll('.wt__tab')];
  const boxes = [[4, 8, 233], [237, 8, 127], [364, 8, 135], [511, 8, 114]];   // x, y, width inside the bar
  tabs.forEach((t, i) => px(t, boxes[i][0], boxes[i][1], boxes[i][2], 55, { fontSize: '16px', lineHeight: '55px', borderRadius: '28px' }));
  const pill = bar.querySelector('.wt__pill');
  const on = tabs.find((t) => t.classList.contains('on')); on.appendChild(pill);
  if (window.gsap && window.Flip) gsap.registerPlugin(Flip);
  // tabs and slides move together: slide i <-> tab (3 - i), the rightmost tab is the first slide (RTL)
  let swiper = null;
  const setTab = (t) => {
    if (t.contains(pill)) return;
    const state = window.Flip ? Flip.getState(pill) : null;
    tabs.forEach((x) => x.classList.toggle('on', x === t)); t.appendChild(pill);
    if (state) Flip.from(state, { duration: .7, ease: 'expo.out', absolute: true });
  };
  // static, as in the design: the tabs and arrows are shown but do nothing

  // arrows and the carousel
  const prev = root.querySelector('.wk__arrow--prev'), next = root.querySelector('.wk__arrow--next');
  px(prev, 100, 511, 70, 70); px(next, 1277, 511, 70, 70);
  const sw = root.querySelector('.wk__swiper'); px(sw, 300, 311, 835, 470);
  if (!window.Swiper) return;
  const lerp3 = (a, v0, v1, v2) => (a <= 1 ? v0 + (v1 - v0) * a : v1 + (v2 - v1) * Math.min(1, a - 1));
  const stack = (s) => s.slides.forEach((el) => {
    const p = Math.max(-2, Math.min(2, el.progress)), a = Math.abs(p);
    const dx = lerp3(a, 0, 95.5, 230), sc = lerp3(a, 1, 722 / 835, 538 / 835), op = a > 2.6 ? 0 : lerp3(a, 1, .73, .73);
    // cancel the slide's natural distance from the centre, then place it where the design stacks it
    el.style.transform = `translate3d(${(el.progress * el.swiperSlideSize + (p < 0 ? dx : -dx)).toFixed(2)}px,0,0) scale(${sc.toFixed(4)})`;
    el.style.opacity = Math.abs(el.progress) > 2.5 ? 0 : op.toFixed(3);
    el.style.zIndex = 10 - Math.round(a * 2);
  });
  swiper = new Swiper(sw, {
    loop: true, loopAdditionalSlides: 3, centeredSlides: true, speed: 0, allowTouchMove: false, simulateTouch: false, keyboard: false, slidesPerView: 1, watchSlidesProgress: true,
    on: { setTranslate: stack, progress: stack, init: stack,
      setTransition: (s, d) => s.slides.forEach((el) => { el.style.transitionDuration = d + 'ms'; el.style.transitionTimingFunction = 'cubic-bezier(.22,1,.36,1)'; }) },
  });
  addEventListener('resize', () => swiper.update());
})();
