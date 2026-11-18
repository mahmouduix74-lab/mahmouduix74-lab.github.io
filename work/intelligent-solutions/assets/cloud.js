/* The tag cloud in "Four services, one list": the design's own pills, made physical (Matter.js).
   They sit exactly where the design puts them until the pointer touches one; then they are pushed
   by the pointer, knock into each other and the box, glide and come to rest. No gravity, no loop:
   the simulation sleeps once everything is still. In ?solo (stills / video) they stay in place. */
(() => {
  const el = document.querySelector('.cloud');
  if (!el || !window.Matter) return;
  const { Engine, Bodies, Body, Composite, Events } = Matter;
  const SOLO = new URLSearchParams(location.search).has('solo');
  const field = el.querySelector('.cloud__field'), tags = [...field.children], data = JSON.parse(el.dataset.pills);
  const W = 1440, H = 810, TH = 58;
  // artboard in design pixels (inline, so the page's px-to-unit build does not touch it)
  Object.assign(field.style, { width: W + 'px', height: H + 'px', transformOrigin: '0 0', direction: 'ltr' });
  tags.forEach((t) => Object.assign(t.style, { height: TH + 'px', fontSize: '20px', borderRadius: '50px', padding: '0 16px' }));
  let k = 1;
  const fit = () => { k = el.clientWidth / W; field.style.transform = `scale(${k})`; };
  fit(); addEventListener('resize', fit);
  const draw = (t, x, y, w, a) => { t.style.transform = `translate(${(x - w / 2).toFixed(2)}px, ${(y - TH / 2).toFixed(2)}px) rotate(${a.toFixed(4)}rad)`; };
  data.forEach(([x, y, w, r], i) => draw(tags[i], x, y, w, r * Math.PI / 180));
  if (SOLO) return;

  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  const bodies = data.map(([x, y, w, r]) => Bodies.rectangle(x, y, w, TH, { chamfer: { radius: TH / 2 - 1 }, angle: r * Math.PI / 180,
    restitution: .55, friction: .04, frictionAir: .035, density: .0016 }));
  // the box: the services rule on the left, the faint rule on the right, the section's bottom line, under the title on top
  const wall = (x, y, w, h) => Bodies.rectangle(x, y, w, h, { isStatic: true, restitution: .4 });
  const walls = [wall(1001, 252 - 40, 640, 80), wall(1001, 750 + 40, 640, 80), wall(722 - 40, 500, 80, 600), wall(1281 + 40, 500, 80, 600)];
  const hand = Bodies.circle(-200, -200, 30, { isStatic: true });
  Composite.add(engine.world, [...bodies, ...walls, hand]);

  let running = false, last = 0, still = 0, px = null, py = null, vx = 0, vy = 0, pt = 0;
  // a pill the pointer runs into takes some of the pointer's speed
  Events.on(engine, 'collisionStart', (e) => e.pairs.forEach((p) => {
    const b = p.bodyA === hand ? p.bodyB : p.bodyB === hand ? p.bodyA : null; if (!b || b.isStatic) return;
    Body.setVelocity(b, { x: b.velocity.x + vx * .55, y: b.velocity.y + vy * .55 });
    Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - .5) * .08);
  }));
  const tick = (now) => {
    const dt = Math.min(1000 / 50, now - (last || now - 16)); last = now;
    Engine.update(engine, dt || 16);
    let e = 0;
    bodies.forEach((b, i) => { draw(tags[i], b.position.x, b.position.y, data[i][2], b.angle); e += b.speed + Math.abs(b.angularVelocity) * 40; });
    still = e < .05 ? still + dt : 0;
    if (still > 900 && px === null) { running = false; return; }
    requestAnimationFrame(tick);
  };
  const wake = () => { if (!running) { running = true; last = 0; still = 0; requestAnimationFrame(tick); } };
  const toLocal = (e) => { const r = el.getBoundingClientRect(); return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
  el.addEventListener('pointermove', (e) => {
    const [x, y] = toLocal(e), now = performance.now();
    if (px !== null) { const d = Math.max(8, now - pt); vx = (x - px) / d * 16; vy = (y - py) / d * 16; }
    px = x; py = y; pt = now;
    Body.setPosition(hand, { x, y }); wake();
  });
  el.addEventListener('pointerleave', () => { px = py = null; Body.setPosition(hand, { x: -200, y: -200 }); });
  // touch: a tap flicks the pills around the finger
  el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; const [x, y] = toLocal(e);
    bodies.forEach((b) => { const dx = b.position.x - x, dy = b.position.y - y, d = Math.hypot(dx, dy);
      if (d < 220) Body.setVelocity(b, { x: b.velocity.x + dx / d * 14 * (1 - d / 220), y: b.velocity.y + dy / d * 14 * (1 - d / 220) }); });
    wake(); });
})();
