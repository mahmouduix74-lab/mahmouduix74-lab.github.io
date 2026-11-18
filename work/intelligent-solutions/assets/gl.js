/* Sahem — WebGL image layer (three.js r149, classic build).
   Every img[data-gl] is mirrored by a plane on one fixed canvas. Each plane:
   - follows its <img> box every frame;
   - reveals with a soft, noisy wipe from the bottom (uReveal 0 to 1) and settles from a slight zoom;
   - curves like the surface of a slowly turning ball: small and pulled in near the screen edges,
     flat in the middle (uLens), deeper while scrolling;
   - bends with scroll speed, the middle trailing like a liquid sheet, and springs back (uVel).
   If WebGL is not available, nothing here runs and the engine falls back to a CSS wipe. */
window.GL = (() => {
  const cv = document.getElementById('gl');
  let ok = false, renderer, scene, cam, items = [], W = 0, H = 0;
  try {
    if (!window.THREE) throw 0;
    renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.outputEncoding = THREE.LinearEncoding;   // pass colours through untouched (no double sRGB = no darkening)
    ok = !!renderer.getContext();
  } catch (e) { ok = false; }
  if (!ok) { cv.style.display = 'none'; return { ok: false }; }
  scene = new THREE.Scene();
  cam = new THREE.OrthographicCamera(0, 1, 0, -1, -1000, 1000);

  const VERT = `
    uniform float uVel, uLens, uH;
    varying vec2 vUv;
    void main(){
      vUv = uv;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vec4 c = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float n = clamp((-w.y) / uH * 2.0 - 1.0, -1.3, 1.3);      // -1 top of screen, +1 bottom
      float bend = sin(uv.x * 3.14159265);
      w.x = c.x + (w.x - c.x) * (1.0 - uLens * 0.045 * n * n);     // narrower near the edges
      w.y += n * uLens * 22.0 * bend;                               // middle pulled toward screen centre
      w.y -= bend * uVel * 0.45;                                    // scroll speed: middle trails
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = `
    uniform sampler2D uTex; uniform float uReveal, uScale, uSeed, uAlpha, uHover, uAsp; uniform vec2 uMouse;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    void main(){
      vec2 uv = (vUv - 0.5) / uScale + 0.5;
      // hover lens: a soft magnifier that follows the pointer
      vec2 dm = (vUv - uMouse) * vec2(uAsp, 1.0); float dd = length(dm);
      uv -= (vUv - uMouse) * 0.075 * uHover * smoothstep(0.32, 0.0, dd);
      vec4 col = texture2D(uTex, uv);
      float nz = noise(vUv * vec2(7.0, 3.0) + uSeed) * 0.16 + noise(vUv * vec2(19.0, 9.0) + uSeed) * 0.05;
      float edge = uReveal * 1.32 - 0.12;
      float m = 1.0 - smoothstep(edge - 0.05, edge + 0.05, vUv.y + nz - 0.1);
      gl_FragColor = vec4(col.rgb, col.a * m * uAlpha);
    }`;

  // a texture source that WebGL accepts: on file:// the bundled data URI, elsewhere the image file
  function source(img) {
    const key = img.getAttribute('src').split('/').pop();
    const url = location.protocol === 'file:' && window.FIGDATA ? window.FIGDATA[key] : img.src;
    return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
  }
  function add(img, srcImg) {
    const tex = new THREE.Texture(srcImg);
    tex.encoding = THREE.LinearEncoding; tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.needsUpdate = true;
    const u = { uTex: { value: tex }, uReveal: { value: 0 }, uScale: { value: 1.06 }, uSeed: { value: Math.random() * 50 },
                uVel: { value: 0 }, uLens: { value: 0 }, uH: { value: 1 }, uAlpha: { value: 1 },
                uHover: { value: 0 }, uAsp: { value: 1 }, uMouse: { value: new THREE.Vector2(.5, .5) } };
    const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 48, 24), mat);
    scene.add(mesh);
    const it = { img, mesh, u }; items.push(it); img._gl = it; img.classList.add('gl'); return it;
  }
  const needData = location.protocol === 'file:' && !window.FIGDATA;
  const dataReady = needData ? new Promise((res) => { const sc = document.createElement('script');
    sc.src = 'assets/figdata.js'; sc.onload = sc.onerror = res; document.head.appendChild(sc); }) : Promise.resolve();
  const ready = dataReady.then(() => Promise.all([...document.querySelectorAll('img[data-gl]')].map((img) =>
    source(img).then((im) => { if (!im) return;
      try { const it = add(img, im); renderer.initTexture(it.u.uTex.value); }
      catch (e) { /* a refused texture: this image keeps the CSS fallback */ const it = img._gl; if (it) { scene.remove(it.mesh); items = items.filter((x) => x !== it); img._gl = null; img.classList.remove('gl'); } }
    }))));

  function size() {
    W = innerWidth; H = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = -H; cam.updateProjectionMatrix();
  }
  size(); addEventListener('resize', size);

  let vel = 0, lens = 0, ptr = null;
  // image boxes in page coordinates, measured once (and again on resize); per frame only scrollY moves them
  function measure() { items.forEach((it) => { const r = it.img.getBoundingClientRect();
    it.box = { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; }); }
  addEventListener('resize', () => setTimeout(measure, 60));
  function render() {
    if (innerWidth !== W || innerHeight !== H) size();
    const sy = scrollY;
    items.forEach((it) => {
      if (!it.box) measure();
      const bx = it.box, top = bx.y - sy;
      const vis = top + bx.h > -200 && top < H + 200 && bx.w > 0;
      it.mesh.visible = vis; if (!vis) return;
      it.mesh.scale.set(bx.w, bx.h, 1);
      it.mesh.position.set(bx.x + bx.w / 2, -(top + bx.h / 2), 0);
      it.u.uVel.value = vel; it.u.uLens.value = lens; it.u.uH.value = H; it.u.uAsp.value = bx.w / bx.h;
      const over = ptr && ptr.in && ptr.x > bx.x - scrollX && ptr.x < bx.x - scrollX + bx.w && ptr.y > top && ptr.y < top + bx.h;
      if (over) it.u.uMouse.value.set((ptr.x - (bx.x - scrollX)) / bx.w, 1 - (ptr.y - top) / bx.h);
      it.u.uHover.value += ((over ? 1 : 0) - it.u.uHover.value) * .08;
    });
    renderer.render(scene, cam);
  }
  return {
    ok: true, render, ready, measure,
    has(img) { return !!img._gl; },
    set(vNow, lensNow, p) { vel = vNow; lens = lensNow; ptr = p || null; },
    reveal(img, k, s) { if (img._gl) { img._gl.u.uReveal.value = k; img._gl.u.uScale.value = s; } },
  };
})();
