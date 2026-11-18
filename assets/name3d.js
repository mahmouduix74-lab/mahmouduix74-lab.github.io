// "Mahmoud Ali" in 3D — vanilla JavaScript + three.js (global THREE from vendor/three.min.js, NAME_PATHS from name_paths.js).
// The real Inter Display outlines are extruded; each letter rises and turns into place once, then the word follows the pointer a little.
// mountName3D(el, {capture}) -> { seek(t), tilt(x, y), resize(), DUR }
(function () {
  'use strict';
  function subpaths(d) {   // absolute M L C Z only (as written by the build step), y flipped up
    const tok = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi), out = [];
    let i = 0, cmd = '', p = null; const num = () => parseFloat(tok[i++]);
    while (i < tok.length) {
      if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
      if (cmd === 'M') { p = new THREE.Path(); p.moveTo(num(), -num()); out.push(p); cmd = 'L'; }
      else if (cmd === 'L') p.lineTo(num(), -num());
      else if (cmd === 'C') { const a = num(), b = -num(), c = num(), e = -num(), x = num(), y = -num(); p.bezierCurveTo(a, b, c, e, x, y); }
      else if (cmd === 'Z' || cmd === 'z') { p.closePath(); }
      else i++;
    }
    return out;
  }
  const area = pts => { let a = 0; for (let k = 0; k < pts.length; k++) { const p = pts[k], q = pts[(k + 1) % pts.length]; a += p.x * q.y - q.x * p.y; } return a / 2; };
  const inside = (pt, poly) => { let c = false; for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const A = poly[a], B = poly[b];
    if ((A.y > pt.y) !== (B.y > pt.y) && pt.x < (B.x - A.x) * (pt.y - A.y) / (B.y - A.y) + A.x) c = !c; } return c; };
  function shapes(d) {   // biggest outline first; a subpath inside an outline becomes its hole
    const subs = subpaths(d).map(p => ({ p, pts: p.getPoints(10) })).map(o => ({ ...o, a: Math.abs(area(o.pts)) })).sort((m, n) => n.a - m.a);
    const res = [];
    subs.forEach(o => {
      const host = res.find(r => inside(o.pts[0], r.pts));
      if (host) { const h = new THREE.Path(); o.pts.slice().reverse().forEach((q, k) => k ? h.lineTo(q.x, q.y) : h.moveTo(q.x, q.y)); host.shape.holes.push(h); }
      else { const sh = new THREE.Shape(); (area(o.pts) > 0 ? o.pts : o.pts.slice().reverse()).forEach((q, k) => k ? sh.lineTo(q.x, q.y) : sh.moveTo(q.x, q.y)); res.push({ shape: sh, pts: o.pts }); }
    });
    return res.map(r => r.shape);
  }
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), seg = (t, a, b) => clamp((t - a) / (b - a));
  const oQ = k => 1 - Math.pow(1 - k, 5), oC = k => 1 - Math.pow(1 - k, 3);
  const back = (k, s = 1.4) => k <= 0 ? 0 : k >= 1 ? 1 : 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);

  window.mountName3D = function (el, opts = {}) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.capture });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(22, 1, 10, 40000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 1.35));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-1600, 2200, 3000); scene.add(key);
    const rim = new THREE.DirectionalLight(0xFF5A1F, 1.1); rim.position.set(2600, -400, -1200); scene.add(rim);   // the page's one accent, as a rim light
    const face = new THREE.MeshStandardMaterial({ color: 0xF3F3F1, roughness: .42, metalness: .05 });
    const side = new THREE.MeshStandardMaterial({ color: 0x8B8B86, roughness: .6, metalness: .05 });
    const word = new THREE.Group(), letters = [];
    NAME_PATHS.d.forEach(d => {
      const g = new THREE.Group();
      shapes(d).forEach(sh => g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 120, bevelEnabled: true, bevelThickness: 10, bevelSize: 6, bevelSegments: 3, curveSegments: 8 }), [face, side])));
      word.add(g); letters.push(g);
    });
    // the whole word's box first (letters still in their font positions), then each letter re-pivoted at its bottom centre
    const all = new THREE.Box3().setFromObject(word), wc = all.getCenter(new THREE.Vector3()), ws = all.getSize(new THREE.Vector3());
    letters.forEach(g => {
      const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3());
      g.children.forEach(m => { m.position.x -= c.x; m.position.y -= box.min.y; m.position.z -= 60; });
      g.userData.home = new THREE.Vector3(c.x - wc.x, box.min.y - wc.y, 0);
    });
    scene.add(word);
    let W = 1, H = 1;
    function resize() {
      W = el.clientWidth || 1; H = el.clientHeight || 1; renderer.setSize(W, H, false);
      renderer.domElement.style.width = W + 'px'; renderer.domElement.style.height = H + 'px';
      cam.aspect = W / H; const fit = ws.x * 1.04 / 2 / Math.tan(cam.fov * Math.PI / 360) / cam.aspect;
      cam.position.set(0, -ws.y * .08, fit); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    }
    let tx = 0, ty = 0, cx = 0, cy = 0, T = 0;
    const DUR = 3.2;
    function seek(t) {
      T = t;
      letters.forEach((g, i) => {
        const k = back(seg(t, .15 + i * .11, 1.35 + i * .11)), h = g.userData.home;
        g.position.set(h.x, h.y + (1 - k) * -ws.y * 1.1, h.z);
        g.rotation.x = (1 - oC(seg(t, .15 + i * .11, 1.6 + i * .11))) * -1.25;
        g.visible = t > .1 + i * .11;
      });
      cx += (tx - cx) * .08; cy += (ty - cy) * .08;
      word.rotation.y = cx * .22; word.rotation.x = -.06 + cy * .12;
      renderer.render(scene, cam);
    }
    resize();
    return { seek, resize, DUR, tilt(x, y) { tx = x; ty = y; seek(Math.max(T, DUR)); } };
  };
})();
