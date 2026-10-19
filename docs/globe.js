/* MapFacto Studio · brand globe
   A 3D version of the MapFacto logo: navy ocean, teal continents, orange Asia and Oceania,
   the red pin over India and the dotted route from South America. Drawn on canvas with
   d3-geo (orthographic projection of Natural Earth countries) plus lighting for depth.
   Grab to spin: it keeps turning with momentum, then settles into a slow drift.
   The four platforms orbit it like satellites. */
(() => {
  "use strict";
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BRAND = {
    navy: "#072c59", navyLight: "#11468a", navyDeep: "#031a38",
    teal: "#1f9c96", tealEdge: "#16807b", orange: "#f6952a", orangeEdge: "#d97b16",
  };
  const PIN = [80.5, 26.5];        // [lon, lat] the pin over India, as in the logo
  const ROUTE_FROM = [-74, 4.5];   // northern South America
  let inst = null, world = null;

  async function loadWorld() {
    if (world) return world;
    const topo = await (await fetch("vendor/countries-110m.json")).json();
    const { feature, geoCentroid } = window.MFGeo;
    const all = feature(topo, topo.objects.countries).features.filter((f) => f.id !== "010"); // no Antarctica
    // orange = Asia, Russia and Oceania, like the logo; everything else teal
    const MIDDLE_EAST = ["682", "887", "368", "760", "400", "376", "275", "422", "792", "784", "512", "634", "414", "048"];
    const isEast = (f) => {
      const [lon, lat] = geoCentroid(f);
      if (MIDDLE_EAST.includes(f.id)) return true;
      if (lon >= 44 && !(lat < 13 && lon < 52)) return true;      // Asia, not the Horn of Africa / Madagascar
      if (lon < -150 || (lat < -10 && lon > 110)) return true;      // Oceania
      return false;
    };
    world = {
      teal: { type: "FeatureCollection", features: all.filter((f) => !isEast(f)) },
      orange: { type: "FeatureCollection", features: all.filter(isEast) },
    };
    return world;
  }

  async function mount(wrap) {
    destroy();
    if (!wrap || !window.MFGeo) return;
    const canvas = wrap.querySelector("canvas");
    const sats = [...wrap.querySelectorAll(".sat")];
    const ctx = canvas.getContext("2d");
    const { geoOrthographic, geoPath, geoGraticule10, geoInterpolate, geoDistance } = window.MFGeo;
    let data;
    try { data = await loadWorld(); } catch (e) { wrap.classList.add("no-webgl"); return; }
    if (!document.body.contains(canvas)) return; // page changed while loading

    const st = { lon: -32, lat: -14, vLon: 0, vLat: 0, drag: null, auto: REDUCED ? 0 : 0.09, t: 0, w: 0, dpr: 1, visible: true };
    const proj = geoOrthographic().precision(0.6).clipAngle(90);
    const path = geoPath(proj, ctx);
    const grat = geoGraticule10();
    const interp = geoInterpolate(ROUTE_FROM, PIN);
    const ROUTE_N = 34;

    function resize() {
      st.dpr = Math.min(2, window.devicePixelRatio || 1);
      st.w = canvas.clientWidth;
      canvas.width = Math.round(st.w * st.dpr);
      canvas.height = Math.round(st.w * st.dpr);
    }
    resize();

    function draw() {
      const W = st.w, R = W / 2 - 24, c = W / 2;
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.clearRect(0, 0, W, W);
      proj.scale(R).translate([c, c]).rotate([st.lon, st.lat, 0]);

      // drop shadow + ocean with lighting
      ctx.save();
      ctx.shadowColor = "rgba(7, 44, 89, .32)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
      const ocean = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.05, c, c, R);
      ocean.addColorStop(0, BRAND.navyLight); ocean.addColorStop(0.55, BRAND.navy); ocean.addColorStop(1, BRAND.navyDeep);
      ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fillStyle = ocean; ctx.fill();
      ctx.restore();

      // graticule
      ctx.beginPath(); path(grat); ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 0.8; ctx.stroke();

      // land
      ctx.lineJoin = "round";
      ctx.beginPath(); path(data.teal); ctx.fillStyle = BRAND.teal; ctx.fill();
      ctx.strokeStyle = BRAND.tealEdge; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.beginPath(); path(data.orange); ctx.fillStyle = BRAND.orange; ctx.fill();
      ctx.strokeStyle = BRAND.orangeEdge; ctx.lineWidth = 0.6; ctx.stroke();

      // dotted route, dots flowing toward the pin
      const center = [-st.lon, -st.lat];
      for (let i = 0; i <= ROUTE_N; i++) {
        const f = i / ROUTE_N, p = interp(f);
        if (geoDistance(p, center) > Math.PI / 2 - 0.04) continue;
        const [x, y] = proj(p);
        const wave = 0.5 + 0.5 * Math.sin((f * 10 - st.t * 2.2) * Math.PI);
        ctx.beginPath(); ctx.arc(x, y, 1.6 + wave * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(248,169,58,${0.55 + wave * 0.45})`; ctx.fill();
      }

      // 3D lighting: highlight + limb darkening, clipped to the sphere
      ctx.save();
      ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.clip();
      const hi = ctx.createRadialGradient(c - R * 0.42, c - R * 0.48, 0, c - R * 0.42, c - R * 0.48, R * 1.1);
      hi.addColorStop(0, "rgba(255,255,255,.30)"); hi.addColorStop(0.45, "rgba(255,255,255,.05)"); hi.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hi; ctx.fillRect(0, 0, W, W);
      const limb = ctx.createRadialGradient(c, c, R * 0.62, c, c, R);
      limb.addColorStop(0, "rgba(3,26,56,0)"); limb.addColorStop(1, "rgba(3,26,56,.45)");
      ctx.fillStyle = limb; ctx.fillRect(0, 0, W, W);
      ctx.restore();
      ctx.beginPath(); ctx.arc(c, c, R - 0.5, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 1.2; ctx.stroke();

      // the pin, standing on the globe when India faces us
      if (geoDistance(PIN, center) < Math.PI / 2 - 0.12) {
        const [x, y] = proj(PIN), s = Math.max(14, R * 0.12);
        const pulse = (st.t * 0.9) % 1;
        ctx.beginPath(); ctx.ellipse(x, y, s * (0.4 + pulse * 0.9), s * (0.16 + pulse * 0.36), 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(224,53,47,${0.55 * (1 - pulse)})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x - s * 0.18, y - s * 0.5, x - s * 0.62, y - s * 0.78, x - s * 0.62, y - s * 1.2);
        ctx.arc(x, y - s * 1.2, s * 0.62, Math.PI, 0);
        ctx.bezierCurveTo(x + s * 0.62, y - s * 0.78, x + s * 0.18, y - s * 0.5, x, y);
        const pg = ctx.createLinearGradient(x - s * 0.6, y - s * 1.8, x + s * 0.6, y);
        pg.addColorStop(0, "#ff5a4f"); pg.addColorStop(1, "#b9221d");
        ctx.fillStyle = pg; ctx.fill();
        ctx.restore();
        ctx.beginPath(); ctx.arc(x, y - s * 1.2, s * 0.26, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      }
      placeSats();
    }

    function placeSats() {
      const n = sats.length, Rx = wrap.clientWidth * 0.43;
      sats.forEach((el, i) => {
        const a = (-st.lon * Math.PI) / 180 * 0.9 + (i / n) * Math.PI * 2;
        const x = Math.sin(a) * Rx, z = Math.cos(a), y = Math.cos(a) * Rx * 0.2 - Math.sin(a) * Rx * 0.08;
        const k = 0.78 + (z + 1) * 0.14;
        el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${k.toFixed(3)})`;
        el.style.zIndex = z > -0.15 ? 3 : 1;
        el.style.opacity = z > -0.15 ? 1 : 0.38;
      });
    }

    let raf = 0, last = performance.now();
    function frame(now) {
      const dt = Math.min(50, now - last) / 16.67; last = now;
      if (!st.drag) {
        st.vLon *= Math.pow(0.95, dt); st.vLat *= Math.pow(0.9, dt);
        st.lon += (st.auto + st.vLon) * dt;
        st.lat += st.vLat * dt + (-14 - st.lat) * 0.02 * dt;
      }
      st.t += 0.016 * dt;
      draw();
      raf = st.visible ? requestAnimationFrame(frame) : 0;
    }
    canvas.classList.add("on");
    raf = requestAnimationFrame(frame);

    // grab and spin
    const down = (e) => {
      st.drag = { x: e.clientX, y: e.clientY, lon: st.lon, lat: st.lat, t: performance.now(), lx: e.clientX, ly: e.clientY };
      st.vLon = 0; st.vLat = 0;
      canvas.setPointerCapture(e.pointerId);
      wrap.classList.add("grabbing");
    };
    const move = (e) => {
      if (!st.drag) return;
      const d = st.drag, k = 180 / (st.w * 1.1);
      st.lon = d.lon + (e.clientX - d.x) * k;
      st.lat = Math.max(-60, Math.min(60, d.lat - (e.clientY - d.y) * k));
      const now = performance.now(), dtm = Math.max(8, now - d.t);
      st.vLon = (e.clientX - d.lx) * k * (16 / dtm);
      st.vLat = -(e.clientY - d.ly) * k * (16 / dtm);
      d.t = now; d.lx = e.clientX; d.ly = e.clientY;
    };
    const up = () => {
      if (!st.drag) return;
      st.drag = null;
      st.vLon = Math.max(-12, Math.min(12, st.vLon));
      wrap.classList.remove("grabbing"); wrap.classList.add("spun");
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    const onResize = () => resize();
    addEventListener("resize", onResize);
    const io = new IntersectionObserver(([en]) => {
      st.visible = en.isIntersecting;
      if (st.visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    io.observe(wrap);

    inst = () => { cancelAnimationFrame(raf); raf = 0; io.disconnect(); removeEventListener("resize", onResize); };
  }

  function destroy() { if (inst) { inst(); inst = null; } }

  window.MF_GLOBE = { mount, destroy };
})();
