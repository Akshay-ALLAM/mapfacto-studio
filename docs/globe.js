/* MapFacto Studio · hero globe
   WebGL dotted globe (cobe, as used by Magic UI's Globe component) that you can grab and
   spin. It keeps turning with momentum after you let go, then settles into a slow drift.
   The four platforms orbit it like satellites, moving with the globe's spin. */
(() => {
  "use strict";
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HOME = [48.8566, 2.3522]; // Paris, where MapFacto is made
  let inst = null;

  function mount(wrap) {
    destroy();
    if (!wrap || !window.createGlobe) return;
    const canvas = wrap.querySelector("canvas");
    const sats = [...wrap.querySelectorAll(".sat")];
    const st = {
      phi: 4.65, theta: 0.28, vPhi: 0, vTheta: 0, drag: null, auto: REDUCED ? 0 : 0.0032,
      visible: true, w: 0,
    };
    const size = () => (st.w = canvas.offsetWidth);
    size();

    let globe;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: st.w * 2, height: st.w * 2, phi: st.phi, theta: st.theta,
        dark: 0, diffuse: 0.5, mapSamples: 20000, mapBrightness: 1.5, mapBaseBrightness: 0,
        baseColor: [0.62, 0.82, 0.97], markerColor: [0.06, 0.19, 0.29], glowColor: [0.86, 0.94, 1],
        opacity: 0.95, scale: 1,
        markers: [{ location: HOME, size: 0.075 }],
        onRender: (s) => {
          if (!st.drag) {
            st.vPhi *= 0.95; st.vTheta *= 0.9;
            st.phi += st.auto + st.vPhi;
            st.theta += st.vTheta + (0.28 - st.theta) * 0.02; // ease back to the default tilt
          }
          s.phi = st.phi; s.theta = st.theta;
          s.width = st.w * 2; s.height = st.w * 2;
          placeSats();
        },
      });
    } catch (e) {
      wrap.classList.add("no-webgl");
      return;
    }
    requestAnimationFrame(() => canvas.classList.add("on"));

    // satellites ride an inclined orbit that turns with the globe
    function placeSats() {
      const R = wrap.offsetWidth * 0.41, n = sats.length;
      sats.forEach((el, i) => {
        const a = st.phi * 0.9 + (i / n) * Math.PI * 2;
        const x = Math.sin(a) * R, z = Math.cos(a), y = Math.cos(a) * R * 0.2 - Math.sin(a) * R * 0.08;
        const k = 0.78 + (z + 1) * 0.14;
        el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${k.toFixed(3)})`;
        el.style.zIndex = z > -0.15 ? 3 : 1;
        el.style.opacity = z > -0.15 ? 1 : 0.38;
      });
    }

    // grab and spin (mouse, pen and touch)
    const down = (e) => {
      st.drag = { x: e.clientX, y: e.clientY, phi: st.phi, theta: st.theta, t: performance.now(), lx: e.clientX, ly: e.clientY };
      st.vPhi = 0; st.vTheta = 0;
      canvas.setPointerCapture(e.pointerId);
      wrap.classList.add("grabbing");
    };
    const move = (e) => {
      if (!st.drag) return;
      const d = st.drag, k = 3.2 / st.w;
      st.phi = d.phi + (e.clientX - d.x) * k;
      st.theta = Math.max(-0.5, Math.min(0.9, d.theta + (e.clientY - d.y) * k * 0.6));
      const now = performance.now(), dt = Math.max(8, now - d.t);
      st.vPhi = ((e.clientX - d.lx) * k) * (16 / dt);
      st.vTheta = ((e.clientY - d.ly) * k * 0.6) * (16 / dt);
      d.t = now; d.lx = e.clientX; d.ly = e.clientY;
    };
    const up = () => {
      if (!st.drag) return;
      st.drag = null;
      st.vPhi = Math.max(-0.25, Math.min(0.25, st.vPhi));
      wrap.classList.remove("grabbing");
      wrap.classList.add("spun");
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    const onResize = () => size();
    addEventListener("resize", onResize);

    // pause rendering when the hero is off screen
    const io = new IntersectionObserver(([en]) => { st.visible = en.isIntersecting; globe.toggle?.(en.isIntersecting); });
    io.observe(wrap);

    inst = () => { io.disconnect(); removeEventListener("resize", onResize); globe.destroy(); };
  }

  function destroy() { if (inst) { inst(); inst = null; } }

  window.MF_GLOBE = { mount, destroy };
})();
