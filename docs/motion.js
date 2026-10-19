/* MapFacto Studio · motion layer (GSAP + ScrollTrigger + Lenis)
   - smooth inertia scrolling (Lenis, desktop only)
   - cursor glow + follower ring that reacts to links, cards and cells
   - 3D tilt on the hero, platform cards, KPI tiles and platform header
   - magnetic buttons
   - one orchestrated entrance per page + reveal-on-scroll for lower sections
   Everything is skipped when the visitor prefers reduced motion. */
(() => {
  "use strict";
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(pointer: fine)").matches;
  const G = window.gsap;
  const root = document.documentElement;

  if (!G || REDUCED) {
    root.classList.add("no-motion");
    window.MF_MOTION = { after() {}, lenis: null };
    return;
  }
  root.classList.add("motion");
  if (window.ScrollTrigger) G.registerPlugin(ScrollTrigger);
  if (window.SplitText) G.registerPlugin(SplitText);

  // ---------------------------------------------------------------- smooth scroll
  let lenis = null;
  if (FINE && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }

  // ---------------------------------------------------------------- cursor
  if (FINE) {
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.append(glow, ring);
    const gx = G.quickTo(glow, "x", { duration: 1.1, ease: "power3" });
    const gy = G.quickTo(glow, "y", { duration: 1.1, ease: "power3" });
    const rx = G.quickTo(ring, "x", { duration: 0.28, ease: "power3" });
    const ry = G.quickTo(ring, "y", { duration: 0.28, ease: "power3" });
    let shown = false;
    addEventListener("pointermove", (e) => {
      gx(e.clientX); gy(e.clientY); rx(e.clientX); ry(e.clientY);
      if (!shown) { shown = true; G.to([glow, ring], { autoAlpha: 1, duration: 0.4 }); }
    }, { passive: true });
    document.addEventListener("pointerleave", () => { shown = false; G.to([glow, ring], { autoAlpha: 0, duration: 0.3 }); });
    document.addEventListener("pointerover", (e) => {
      const onGlobe = !!e.target.closest(".globe-wrap canvas");
      ring.classList.toggle("drag", onGlobe);
      const hit = onGlobe ? null : e.target.closest("a, button, .pcard, .cell, .scale-seg, .vrow");
      ring.classList.toggle("hover", !!hit);
      ring.style.setProperty("--rc", hit?.style.getPropertyValue("--c") || hit?.closest("[style*='--c']")?.style.getPropertyValue("--c") || "");
    });
    addEventListener("pointerdown", () => G.to(ring, { scale: 0.8, duration: 0.15 }));
    addEventListener("pointerup", () => G.to(ring, { scale: 1, duration: 0.3, ease: "back.out(3)" }));
  }

  // ---------------------------------------------------------------- glowing borders that follow the cursor
  if (FINE) {
    document.addEventListener("pointermove", (e) => {
      const el = e.target.closest?.(".glow");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--gx", `${e.clientX - r.left}px`);
      el.style.setProperty("--gy", `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  // ---------------------------------------------------------------- split-text headings
  function splitIn(el, opts = {}) {
    if (!window.SplitText || !el || !el.textContent.trim()) return;
    const split = SplitText.create(el, { type: opts.chars ? "chars,words" : "words", wordsClass: "w", charsClass: "ch" });
    G.from(opts.chars ? split.chars : split.words, {
      yPercent: 70, autoAlpha: 0, filter: "blur(8px)", duration: opts.chars ? 0.6 : 0.75, ease: "power3.out",
      stagger: opts.chars ? 0.022 : 0.05, delay: opts.delay || 0,
      scrollTrigger: opts.scroll && window.ScrollTrigger ? { trigger: el, start: "top 92%", once: true } : undefined,
      onComplete: () => split.revert(),
    });
  }

  // ---------------------------------------------------------------- 3D tilt
  function tilt(el, max = 6, lift = 0) {
    if (!FINE || el.dataset.tilt) return;
    el.dataset.tilt = "1";
    G.set(el, { transformPerspective: 1000, transformOrigin: "center" });
    const rotX = G.quickTo(el, "rotationX", { duration: 0.7, ease: "power3" });
    const rotY = G.quickTo(el, "rotationY", { duration: 0.7, ease: "power3" });
    const b3d = el.querySelector(".b3d:not(.sm)");
    el.addEventListener("pointerenter", () => {
      if (lift) G.to(el, { y: -lift, duration: 0.4, ease: "power3.out" });
      if (b3d) G.to(b3d, { z: 30, scale: 1.08, rotation: -6, duration: 0.5, ease: "back.out(2)" });
    });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      rotY(px * max * 2); rotX(-py * max * 2);
    });
    el.addEventListener("pointerleave", () => {
      rotX(0); rotY(0);
      if (lift) G.to(el, { y: 0, duration: 0.5, ease: "power3.out" });
      if (b3d) G.to(b3d, { z: 0, scale: 1, rotation: 0, duration: 0.6, ease: "power3.out" });
    });
  }

  // ---------------------------------------------------------------- magnetic buttons
  function magnetic(el, pull = 0.28) {
    if (!FINE || el.dataset.mag) return;
    el.dataset.mag = "1";
    const mx = G.quickTo(el, "x", { duration: 0.4, ease: "power3" });
    const my = G.quickTo(el, "y", { duration: 0.4, ease: "power3" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * pull); my((e.clientY - r.top - r.height / 2) * pull);
    });
    el.addEventListener("pointerleave", () => { mx(0); my(0); });
  }
  document.querySelectorAll(".topbar .btn").forEach((b) => magnetic(b));

  // ---------------------------------------------------------------- per-page motion
  function after(view) {
    if (window.ScrollTrigger) ScrollTrigger.getAll().forEach((t) => t.kill());
    const q = (s) => [...view.querySelectorAll(s)];

    // one orchestrated entrance: header block, then the cards in a wave
    const tl = G.timeline({ defaults: { ease: "power3.out" } });
    const head = q(".hero, .pheader");
    tl.from(head, { y: 28, autoAlpha: 0, duration: 0.8, clearProps: "opacity,visibility" });
    tl.from(q(".hero-number, .pheader h2"), { y: 18, autoAlpha: 0, duration: 0.7, clearProps: "opacity,visibility" }, "<0.12");
    tl.from(q(".hero-platforms .hp, .pheader .b3d"), { y: 14, autoAlpha: 0, scale: 0.8, duration: 0.55, stagger: 0.06, ease: "back.out(2)", clearProps: "opacity,visibility,transform" }, "<0.15");
    tl.from(q(".platform-grid .pcard, .kpis .kpi"), {
      y: 34, rotationX: -14, autoAlpha: 0, duration: 0.8, stagger: 0.07, transformPerspective: 900,
      clearProps: "opacity,visibility",
    }, "<0.05");

    // everything further down reveals as it scrolls into view
    if (window.ScrollTrigger) {
      q(".section.panel, .section.grid-2 > .panel, .vrow").forEach((el) => {
        G.from(el, {
          y: 46, autoAlpha: 0, duration: 0.9, ease: "power3.out", clearProps: "opacity,visibility,transform",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });
      // matrix cells ripple in when the matrix appears
      const cells = q(".matrix .cell");
      if (cells.length) {
        G.from(cells, {
          scale: 0.6, autoAlpha: 0, duration: 0.5, ease: "back.out(1.8)", stagger: { each: 0.025, from: "start" },
          clearProps: "opacity,visibility,transform", scrollTrigger: { trigger: ".matrix", start: "top 85%", once: true },
        });
      }
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }

    splitIn(document.getElementById("pageTitle"), { chars: true });
    q(".panel h2").forEach((h) => splitIn(h, { scroll: !h.closest(".hero, .pheader"), delay: h.closest(".pheader") ? 0.25 : 0 }));
    q(".panel:not(.pheader), .pcard, .kpi").forEach((el) => el.classList.add("glow"));
    q(".pcard").forEach((el) => tilt(el, 7, 6));
    q(".kpi").forEach((el) => tilt(el, 6, 3));
    q(".hero, .pheader").forEach((el) => tilt(el, 1.8));
    q(".pheader .btn, .hp").forEach((el) => magnetic(el, 0.22));
  }

  window.MF_MOTION = { after, lenis };
})();
