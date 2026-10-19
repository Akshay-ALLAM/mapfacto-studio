/* MapFacto Studio · renders docs/data.json (built every 30 min by GitHub Actions) */
(() => {
  "use strict";

  // ---------------------------------------------------------------- constants
  const PL = {
    YouTube:   { c: "#d6383d", slug: "youtube",   handle: "@MapFacto",  url: "https://www.youtube.com/@MapFacto", watch: "Watch on YouTube" },
    TikTok:    { c: "#0e8f84", slug: "tiktok",    handle: "@mapfacto_", url: "https://www.tiktok.com/@mapfacto_", watch: "Watch on TikTok" },
    Instagram: { c: "#b04ac0", slug: "instagram", handle: "@mapfacto",  url: "https://www.instagram.com/mapfacto/", watch: "Open Instagram" },
    Facebook:  { c: "#2563eb", slug: "facebook",  handle: "MapFacto page", url: "https://www.facebook.com/1058710957321832", watch: "Watch on Facebook" },
  };
  const ORDER = ["YouTube", "TikTok", "Instagram", "Facebook"];
  const ENGAGE = { Likes: "#2a78d6", Comments: "#eb6834", Shares: "#1baf7a" };
  const RAMP = ["#eaf4fc", "#9fd0f2", "#4aa3df", "#1f6fa8", "#133f63"];
  const INK = "#10304a", INK2 = "#4a6a82", INK3 = "#7d97ab", LINE = "#d6e6f2";
  const VERDICT = { good: "Working", watch: "Watch", bad: "Not working" };
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(pointer: fine)").matches;
  const TZ = "Europe/Paris";

  const ICONS = {
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    good: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 9.8"/>',
    watch: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
    bad: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    up: '<path d="M4 16l6-6 4 4 6-7"/><path d="M15 7h5v5"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    gap: '<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M4 10h16M9 14h6"/>',
    down: '<path d="M4 8l6 6 4-4 6 7"/><path d="M15 17h5v-5"/>',
    pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    plug: '<path d="M9 3v5M15 3v5M7 8h10v4a5 5 0 0 1-10 0z"/><path d="M12 17v4"/>',
    pin: '<path d="M12 21s-6-5.7-6-11a6 6 0 0 1 12 0c0 5.3-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  };
  // Original glossy 3D badges: platform colour + a generic symbol (not the platforms' logos)
  const GLYPH = {
    YouTube: '<circle cx="12" cy="12" r="8" fill="none" stroke-width="1.9"/><path d="M10 8.6v6.8l5.6-3.4z" fill="#fff" stroke="none"/>',
    TikTok: '<path d="M9 17.4V7.2l9-2.2v10.4" fill="none" stroke-width="2" stroke-linejoin="round"/><circle cx="7" cy="17.4" r="2.3" fill="#fff" stroke="none"/><circle cx="16" cy="15.4" r="2.3" fill="#fff" stroke="none"/>',
    Instagram: '<path d="M4.5 8.6h3.1l1.6-2.1h5.6l1.6 2.1h3.1v9.9h-15z" fill="none" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="13.4" r="3.2" fill="none" stroke-width="1.9"/>',
    Facebook: '<circle cx="9" cy="9.2" r="2.8" fill="none" stroke-width="1.9"/><path d="M3.9 18.3c.6-3 2.6-4.7 5.1-4.7s4.5 1.7 5.1 4.7" fill="none" stroke-width="1.9" stroke-linecap="round"/><circle cx="16.6" cy="9.9" r="2.2" fill="none" stroke-width="1.9"/><path d="M15.6 13.7c2.2-.2 4 1.2 4.5 4" fill="none" stroke-width="1.9" stroke-linecap="round"/>',
  };
  const badge = (p, size = 40, cls = "") =>
    `<span class="b3d ${cls}" style="--c:${PL[p].c};--s:${size}px" aria-hidden="true"><svg viewBox="0 0 24 24" stroke="#fff">${GLYPH[p]}</svg></span>`;
  const icon = (n, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
  const INSIGHT_ICON = { top: "star", reach: "up", engagement: "heart", growth: "up", platform: "down", error: "plug", missing: "gap", low: "down", stalled: "pause" };

  // ---------------------------------------------------------------- helpers
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const nf = new Intl.NumberFormat("en-US");
  const fmt = (n) => (n === null || n === undefined || Number.isNaN(n) ? "—" : nf.format(Math.round(n)));
  const pct = (n) => (n === null || n === undefined ? "—" : `${n.toFixed(1)}%`);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" });
  const dayTime = (iso) => (iso ? `${dayFmt.format(new Date(iso))}, ${timeFmt.format(new Date(iso))}` : "—");
  function ago(iso) {
    if (!iso) return "never";
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h ${m % 60 ? (m % 60) + " min " : ""}ago`;
    return `${Math.floor(h / 24)} d ago`;
  }
  function delta(n, suffix = "") {
    if (n === null || n === undefined) return "";
    if (n === 0) return `<span class="delta zero">no change${suffix ? " " + suffix : ""}</span>`;
    return `<span class="delta ${n < 0 ? "neg" : ""}">${n > 0 ? "+" : "−"}${fmt(Math.abs(n))}${suffix ? " " + suffix : ""}</span>`;
  }
  const plural = (n, w) => `${fmt(n)} ${w}${Math.abs(n) === 1 ? "" : "s"}`;
  const verdictChip = (v) => `<span class="verdict ${v}">${icon(v)}${VERDICT[v]}</span>`;
  const mix = (a, b, t) => {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  };
  function rampColor(t) {
    t = Math.max(0, Math.min(1, t));
    const seg = t * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(seg));
    return mix(RAMP[i], RAMP[i + 1], seg - i);
  }

  // count-up numbers: <span data-count="1234" data-id="x">
  const shown = new Map();
  function countUp(root) {
    $$("[data-count]", root).forEach((el) => {
      const to = Number(el.dataset.count), id = el.dataset.id || el.dataset.count;
      const from = shown.has(id) ? shown.get(id) : 0;
      const dec = Number(el.dataset.dec || 0), suf = el.dataset.suffix || "";
      const put = (v) => (el.textContent = (dec ? v.toFixed(dec) : nf.format(Math.round(v))) + suf);
      shown.set(id, to);
      if (REDUCED || from === to) return put(to);
      const t0 = performance.now(), dur = 1100;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        put(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  const count = (n, id, dec = 0, suffix = "") =>
    n === null || n === undefined ? "—" : `<span data-count="${n}" data-id="${id}" data-dec="${dec}" data-suffix="${suffix}">${dec ? (0).toFixed(dec) : 0}${suffix}</span>`;

  // ---------------------------------------------------------------- contour background
  function contours() {
    const svg = $("#contours");
    const W = 1600, H = 1000;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const peaks = [[260, 210, 9], [1300, 180, 7], [980, 760, 10], [180, 860, 5], [640, 470, 4]];
    let out = "";
    for (const [cx, cy, rings] of peaks) {
      const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
      for (let k = 1; k <= rings; k++) {
        const r = 26 + k * 34, pts = [];
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          const w = 1 + 0.16 * Math.sin(2 * a + ph[0] + k * 0.18) + 0.1 * Math.sin(3 * a + ph[1]) + 0.06 * Math.sin(5 * a + ph[2] - k * 0.3);
          pts.push([cx + Math.cos(a) * r * w * 1.25, cy + Math.sin(a) * r * w]);
        }
        let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
        for (let i = 0; i < pts.length; i++) {
          const p0 = pts[(i - 1 + 48) % 48], p1 = pts[i], p2 = pts[(i + 1) % 48], p3 = pts[(i + 2) % 48];
          d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
        }
        out += `<path d="${d}Z"/>`;
      }
    }
    svg.innerHTML = out;
    if (!REDUCED && FINE) {
      let raf = 0;
      addEventListener("pointermove", (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const x = (e.clientX / innerWidth - 0.5) * -26, y = (e.clientY / innerHeight - 0.5) * -18;
          svg.style.setProperty("--px", `${x}px`);
          svg.style.setProperty("--py", `${y}px`);
        });
      }, { passive: true });
    }
  }

  // ---------------------------------------------------------------- data
  let DATA = null, route = "overview", charts = [];
  async function load(manual) {
    const btn = $("#reload");
    if (manual) btn.classList.add("spinning");
    try {
      const r = await fetch(`data.json?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      const changed = !DATA || next.generated_at !== DATA.generated_at;
      DATA = next;
      if (changed || manual) render();
    } catch (e) {
      $("#view").innerHTML = `<div class="notice">The dashboard couldn't load its data file (${esc(e.message)}). It appears after the first automatic update has run.</div>`;
    } finally {
      setTimeout(() => btn.classList.remove("spinning"), 500);
      tickLive();
    }
  }

  function tickLive() {
    if (!DATA) return;
    const last = DATA.last_pull, mins = last ? (Date.now() - new Date(last)) / 60000 : Infinity;
    const every = DATA.update_every_min || 30;
    const next = Math.round(every - (mins % every));
    const stale = mins > every * 2.5;
    $("#pulse").classList.toggle("stale", stale);
    $("#liveText").innerHTML = stale
      ? `Last update ${ago(last)}<span class="long">: the automatic update may be paused</span>`
      : `Updated ${ago(last)}<span class="long"> · next in about ${Math.max(1, next)} min</span>`;
  }

  // ---------------------------------------------------------------- nav
  function renderNav() {
    const st = DATA?.status || {};
    const item = (slug, label, inner, state = "") =>
      `<a href="#/${slug}" ${route === slug ? 'aria-current="page"' : ""}>${inner}<span>${label}</span>${state}</a>`;
    let h = item("overview", "Overview", icon("home", "ico"));
    for (const p of ORDER) {
      const s = st[p];
      const state = s ? `<span class="state" style="color:${s.ok ? "var(--good)" : "var(--bad)"}" title="${esc(s.message)}">${s.ok ? "●" : "!"}</span>` : "";
      h += item(PL[p].slug, p, badge(p, 24, "sm"), state);
    }
    $("#nav").innerHTML = h;
    $("#railFoot").innerHTML = DATA?.history_since
      ? `Tracking since <strong>${dayFmt.format(new Date(DATA.history_since))}</strong><br>${fmt(DATA.totals?.videos)} videos on 4 platforms`
      : "";
  }

  // ---------------------------------------------------------------- charts
  const baseChart = () => ({
    animationDuration: REDUCED ? 0 : 1200, animationEasing: "cubicOut",
    textStyle: { fontFamily: "Bricolage Grotesque, Atkinson Hyperlegible, system-ui, sans-serif", color: INK2 },
    grid: { left: 8, right: 18, top: 44, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis", backgroundColor: "#fff", borderColor: LINE, borderWidth: 1, padding: [10, 12],
      textStyle: { color: INK, fontSize: 13 }, extraCssText: "border-radius:12px;box-shadow:0 10px 30px -12px rgba(16,48,74,.35);",
      axisPointer: { type: "line", lineStyle: { color: "#9fbfd6", type: "dashed" } },
    },
    legend: { top: 0, left: 0, icon: "circle", itemWidth: 10, itemHeight: 10, itemGap: 16, textStyle: { color: INK2, fontSize: 13 } },
  });
  const axisCommon = { axisLine: { lineStyle: { color: LINE } }, axisTick: { show: false }, axisLabel: { color: INK3, fontSize: 12 }, splitLine: { lineStyle: { color: LINE, type: [4, 4] } } };
  function mount(id, option) {
    const el = document.getElementById(id);
    if (!el || !window.echarts) return;
    const ch = echarts.init(el, null, { renderer: "svg" });
    ch.setOption(option);
    charts.push(ch);
  }
  addEventListener("resize", () => charts.forEach((c) => c.resize()));

  const timeTooltip = (params) => {
    const t = params[0]?.value?.[0];
    let h = `<div style="font-weight:700;margin-bottom:6px">${dayTime(t)}</div>`;
    for (const p of params) h += `<div style="display:flex;gap:14px;justify-content:space-between"><span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${p.color};margin-right:7px"></span>${p.seriesName}</span><b>${fmt(p.value[1])}</b></div>`;
    return h;
  };

  function lineChart(id, platforms, { area = false, key = "timeline", label = "views" } = {}) {
    const series = platforms.filter((p) => (DATA.platforms[p][key] || []).length).map((p) => ({
      name: p, type: "line", smooth: 0.3, smoothMonotone: "x", showSymbol: false, symbolSize: 8,
      data: DATA.platforms[p][key].map(([t, v]) => [t, v]),
      lineStyle: { width: 2.2, color: PL[p].c }, itemStyle: { color: PL[p].c, borderColor: "#fff", borderWidth: 2 },
      emphasis: { focus: "series" },
      endLabel: platforms.length > 1 ? { show: true, formatter: "{a}", color: INK2, fontSize: 12, fontWeight: 700 } : { show: false },
      areaStyle: area ? { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PL[p].c + "33" }, { offset: 1, color: PL[p].c + "00" }] } } : undefined,
      step: key === "followers_timeline" ? "end" : false,
    }));
    if (!series.length || series.every((s) => s.data.length < 2)) {
      document.getElementById(id).outerHTML = `<p class="empty-note">This chart fills in as updates come in (every ~30 min).</p>`;
      return;
    }
    mount(id, {
      ...baseChart(), legend: platforms.length > 1 ? baseChart().legend : { show: false },
      grid: { ...baseChart().grid, right: platforms.length > 1 ? 86 : 18, top: platforms.length > 1 ? 44 : 16 },
      tooltip: { ...baseChart().tooltip, formatter: timeTooltip },
      xAxis: { type: "time", ...axisCommon, splitLine: { show: false }, axisLabel: { ...axisCommon.axisLabel, hideOverlap: true, formatter: { day: "{d} {MMM}", hour: "{HH}:{mm}" } } },
      yAxis: { type: "value", ...axisCommon, scale: platforms.length === 1, minInterval: 1 },
      series,
    });
  }

  function dailyChart(id, platforms) {
    const days = [...new Set(platforms.flatMap((p) => (DATA.platforms[p].daily || []).map((d) => d[0])))].sort();
    if (!days.length) return void (document.getElementById(id).outerHTML = `<p class="empty-note">Daily totals appear after the first day of updates.</p>`);
    const label = (d) => dayFmt.format(new Date(d + "T12:00:00Z"));
    mount(id, {
      ...baseChart(), legend: platforms.length > 1 ? baseChart().legend : { show: false },
      grid: { ...baseChart().grid, top: platforms.length > 1 ? 44 : 16 },
      tooltip: { ...baseChart().tooltip, axisPointer: { type: "shadow", shadowStyle: { color: "rgba(74,163,223,.08)" } } },
      xAxis: { type: "category", data: days.map(label), ...axisCommon, splitLine: { show: false } },
      yAxis: { type: "value", ...axisCommon, minInterval: 1 },
      series: platforms.map((p) => {
        const m = Object.fromEntries(DATA.platforms[p].daily || []);
        return { name: p, type: "bar", barMaxWidth: 26, barGap: "18%", itemStyle: { color: PL[p].c, borderRadius: [4, 4, 0, 0] }, data: days.map((d) => m[d] ?? 0) };
      }),
    });
  }

  function videoBars(id, p) {
    const vids = DATA.videos.filter((v) => v.per[p]).slice(0, 15).reverse();
    mount(id, {
      ...baseChart(), legend: { show: false }, grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
      tooltip: { ...baseChart().tooltip, axisPointer: { type: "shadow", shadowStyle: { color: "rgba(74,163,223,.08)" } } },
      xAxis: { type: "value", ...axisCommon, axisLabel: { show: false }, splitLine: { show: false } },
      yAxis: { type: "category", data: vids.map((v) => v.title), ...axisCommon, axisLabel: { color: INK2, width: 190, overflow: "truncate", fontSize: 12.5 } },
      series: [{ name: "Views", type: "bar", barMaxWidth: 22, data: vids.map((v) => v.per[p].views),
        itemStyle: { color: PL[p].c, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: "right", color: INK2, fontWeight: 700, formatter: (o) => fmt(o.value) } }],
    });
    document.getElementById(id).style.height = `${Math.max(180, vids.length * 46 + 20)}px`;
    charts[charts.length - 1]?.resize();
  }

  function engagementBars(id, p) {
    const vids = DATA.videos.filter((v) => v.per[p]).slice(0, 15).reverse();
    const has = (k) => vids.some((v) => v.per[p][k]);
    const kinds = [["Likes", "likes"], ["Comments", "comments"], ["Shares", "shares"]].filter(([, k]) => has(k));
    if (!kinds.length) return void (document.getElementById(id).outerHTML = `<p class="empty-note">No likes, comments or shares yet.</p>`);
    mount(id, {
      ...baseChart(), grid: { left: 8, right: 18, top: 40, bottom: 8, containLabel: true },
      tooltip: { ...baseChart().tooltip, axisPointer: { type: "shadow", shadowStyle: { color: "rgba(74,163,223,.08)" } } },
      xAxis: { type: "value", ...axisCommon, minInterval: 1 },
      yAxis: { type: "category", data: vids.map((v) => v.title), ...axisCommon, axisLabel: { color: INK2, width: 190, overflow: "truncate", fontSize: 12.5 } },
      series: kinds.map(([name, k]) => ({ name, type: "bar", stack: "e", barMaxWidth: 22, data: vids.map((v) => v.per[p][k] || 0),
        itemStyle: { color: ENGAGE[name], borderColor: "#fff", borderWidth: 2 } })),
    });
    document.getElementById(id).style.height = `${Math.max(200, vids.length * 46 + 56)}px`;
    charts[charts.length - 1]?.resize();
  }

  function logChart(id) {
    const log = (DATA.log || []).filter((e) => e.gain !== null && e.gain !== undefined);
    if (log.length < 2) return void (document.getElementById(id).outerHTML = `<p class="empty-note">Fills in after a few automatic updates.</p>`);
    mount(id, {
      ...baseChart(), legend: { show: false }, grid: { left: 4, right: 8, top: 12, bottom: 4, containLabel: true },
      tooltip: { ...baseChart().tooltip, axisPointer: { type: "shadow", shadowStyle: { color: "rgba(74,163,223,.08)" } },
        formatter: (ps) => `<b>${dayTime(ps[0].value[0])}</b><br>+${fmt(ps[0].value[1])} views` },
      xAxis: { type: "time", ...axisCommon, splitLine: { show: false }, axisLabel: { ...axisCommon.axisLabel, hideOverlap: true, formatter: { day: "{d} {MMM}", hour: "{HH}:{mm}" } } },
      yAxis: { type: "value", ...axisCommon, minInterval: 1 },
      series: [{ type: "bar", barMaxWidth: 10, barMinWidth: 3, data: log.map((e) => [e.at, Math.max(0, e.gain)]),
        itemStyle: { color: "#4aa3df", borderRadius: [3, 3, 0, 0] }, emphasis: { itemStyle: { color: "#1f6fa8" } } }],
    });
  }

  // ---------------------------------------------------------------- sparkline (pure SVG)
  function spark(points, c) {
    if (!points || points.length < 2) return `<svg class="spark" viewBox="0 0 200 46"><path class="line" d="M0 40H200" style="stroke:${LINE}"/></svg>`;
    const xs = points.map((p) => new Date(p[0]).getTime()), ys = points.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const X = (x) => ((x - x0) / (x1 - x0 || 1)) * 200, Y = (y) => 42 - ((y - y0) / (y1 - y0 || 1)) * 38;
    const d = points.map((p, i) => `${i ? "L" : "M"}${X(xs[i]).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join("");
    const len = Math.round(points.reduce((a, p, i) => (i ? a + Math.hypot(X(xs[i]) - X(xs[i - 1]), Y(ys[i]) - Y(ys[i - 1])) : 0), 0)) + 10;
    return `<svg class="spark" viewBox="0 0 200 46" preserveAspectRatio="none" aria-hidden="true"><path class="area" d="${d}L200,46L0,46Z"/><path class="line draw" style="--len:${len}" d="${d}" vector-effect="non-scaling-stroke"/></svg>`;
  }

  // ---------------------------------------------------------------- views matrix
  const METRICS = [
    { id: "views", label: "Views", get: (x) => x.views },
    { id: "g24", label: "Last 24 h", get: (x) => x.g24 },
    { id: "d_views", label: "Latest update", get: (x) => x.d_views },
    { id: "engagement", label: "Engagement", get: (x) => x.engagement, pct: true },
  ];
  let matrixMetric = "views";
  function matrixHTML() {
    const M = METRICS.find((m) => m.id === matrixMetric);
    const vals = DATA.videos.flatMap((v) => ORDER.map((p) => (v.per[p] ? M.get(v.per[p]) : null))).filter((x) => x !== null && x !== undefined);
    const max = Math.max(1, ...vals);
    const head = `<tr><th scope="col">Video</th>${ORDER.map((p) => `<th scope="col"><span class="th-pl">${badge(p, 22, "sm")}${p}</span></th>`).join("")}<th scope="col">All</th></tr>`;
    let i = 0;
    const rows = DATA.videos.map((v) => {
      const cells = ORDER.map((p) => {
        const x = v.per[p];
        if (!x) return `<td class="cell none" title="${esc(v.title)} isn't posted on ${p}">not posted</td>`;
        const val = M.get(x);
        if (val === null || val === undefined) return `<td class="cell none">—</td>`;
        const t = Math.sqrt(Math.max(0, val) / max), bg = rampColor(t), fg = t > 0.62 ? "#fff" : INK;
        const txt = M.pct ? pct(val) : (M.id === "views" ? fmt(val) : (val > 0 ? "+" : "") + fmt(val));
        return `<td class="cell" data-bg="${bg}" data-fg="${fg}" style="transition-delay:${REDUCED ? 0 : 60 + (i++) * 28}ms" title="${esc(v.title)} on ${p}: ${txt} ${M.label.toLowerCase()}">${txt}</td>`;
      }).join("");
      const tot = M.pct ? null : ORDER.reduce((a, p) => a + (v.per[p] ? M.get(v.per[p]) || 0 : 0), 0);
      const thumb = v.thumb ? `<span class="thumb" style="background-image:url('${v.thumb}')"></span>` : `<span class="thumb">${icon("pin")}</span>`;
      return `<tr><td class="v">${thumb}<span><span class="vtitle">${esc(v.title)}</span><br><span class="vdate">Posted ${dayTime(v.posted)}</span></span></td>${cells}<td class="cell total">${tot === null ? "—" : (M.id === "views" ? fmt(tot) : (tot > 0 ? "+" : "") + fmt(tot))}</td></tr>`;
    }).join("");
    return `<p class="swipe-hint">Swipe sideways to see every platform.</p><div class="matrix-wrap"><table class="matrix"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
      <div class="legend-ramp"><span>Less</span><span class="ramp"></span><span>More</span><span class="nopost"></span><span>Not posted there</span></div>`;
  }
  function paintMatrix() {
    requestAnimationFrame(() => requestAnimationFrame(() => $$(".cell[data-bg]").forEach((c) => { c.style.backgroundColor = c.dataset.bg; c.style.color = c.dataset.fg; })));
  }

  // ---------------------------------------------------------------- pieces
  function feedHTML(items, max = 12) {
    if (!items.length) return `<p class="empty-note">No changes in the latest update. Numbers are checked again in about ${DATA.update_every_min || 30} minutes.</p>`;
    return `<ul class="feed">${items.slice(0, max).map((u) => {
      const chips = u.is_new ? `<span class="chip views">New video · ${fmt(u.views)} views</span>` :
        [["views", u.d_views], ["likes", u.d_likes], ["comments", u.d_comments], ["shares", u.d_shares]]
          .filter(([, v]) => v).map(([k, v]) => `<span class="chip ${k === "views" ? "views" : ""}">${v > 0 ? "+" : "−"}${plural(Math.abs(v), k.slice(0, -1))}</span>`).join("");
      return `<li style="--c:${PL[u.platform].c}">${badge(u.platform, 28, "sm")}<div><div class="what">${esc(u.title)}</div><div class="pl">${u.platform} · now ${fmt(u.views)} views</div><div class="chips">${chips}</div></div><span class="when">${u.at ? timeFmt.format(new Date(u.at)) : ""}</span></li>`;
    }).join("")}</ul>`;
  }
  function insightsHTML(list, kind) {
    if (!list.length) return `<p class="empty-note">${kind === "good" ? "Highlights appear once there is enough data." : "Nothing needs attention right now."}</p>`;
    return `<ul class="insights ${kind}">${list.map((x) => `<li><span class="badge">${icon(INSIGHT_ICON[x.kind] || (kind === "good" ? "good" : "watch"))}</span><span>${x.platform ? `<span class="pl" style="--c:${PL[x.platform].c}"></span>` : ""}${md(x.text)}</span></li>`).join("")}</ul>`;
  }
  function connectionsHTML() {
    return `<div class="conn">${ORDER.map((p) => {
      const s = DATA.status[p];
      return `<div class="conn-item"><b>${badge(p, 24, "sm")}${p}
        <span class="${s.ok ? "ok" : "err"}" style="margin-left:auto">${s.ok ? "Connected" : "Problem"}</span></b>
        <p>${s.ok ? `Last update ${ago(s.at)} · ${esc(s.message)}` : `${esc(s.message)}${s.last_ok ? `. Last good update ${ago(s.last_ok)}` : ""}`}</p></div>`;
    }).join("")}</div>`;
  }

  // ---------------------------------------------------------------- pages
  function overview() {
    const T = DATA.totals, P = DATA.platforms;
    const byViews = ORDER.filter((p) => P[p].views).sort((a, b) => P[b].views - P[a].views);
    const segs = byViews.map((p) => `<div class="scale-seg" style="--c:${PL[p].c}" data-w="${P[p].share}" title="${p}: ${fmt(P[p].views)} views (${P[p].share}%)" onclick="location.hash='#/${PL[p].slug}'"></div>`).join("");
    const ticks = byViews.map((p) => `<div class="scale-tick" data-w="${P[p].share}" style="--c:${PL[p].c}">${P[p].share >= 9 ? `<b><i></i>${p}</b><span>${P[p].share}% · ${fmt(P[p].views)}</span>` : ""}</div>`).join("");
    const small = byViews.filter((p) => P[p].share < 9);
    const smallNote = small.length ? `<div class="scale-small">${small.map((p) => `<span style="--c:${PL[p].c}"><i></i><b>${p}</b> ${P[p].share}% · ${fmt(P[p].views)} views</span>`).join(" &nbsp; ")}</div>` : "";
    const cards = ORDER.map((p) => {
      const r = P[p];
      return `<a class="pcard" href="#/${PL[p].slug}" style="--c:${PL[p].c}" aria-label="${p}: ${fmt(r.views)} views, ${VERDICT[r.verdict]}">
        <span class="pcard-edge"></span>
        <div class="pcard-head">${badge(p, 42)}<span class="pcard-name">${p}</span>${verdictChip(r.verdict)}</div>
        <div class="pcard-num">${count(r.views, "pv-" + p)}</div>
        <div class="pcard-meta"><span>views · ${delta(r.d_last)}</span><span>${fmt(r.followers)} followers</span></div>
        ${spark(r.timeline, PL[p].c)}
      </a>`;
    }).join("");
    $("#view").innerHTML = `<div class="view">
      <section class="panel hero" aria-label="Summary">
        <div class="hero-top">
          <div>
            <p class="hero-kicker">MapFacto has been watched</p>
            <p class="hero-number">${count(T.views, "total")}<small>times</small></p>
            <p class="hero-kicker" style="margin-top:10px">${delta(T.d_last, "views")} in the latest update, ${dayTime(DATA.last_pull)}</p>
            <div class="hero-platforms">${ORDER.map((p) => `<a class="hp" href="#/${PL[p].slug}">${badge(p, 30, "sm")}<span>${p}</span><i class="${DATA.status[p].ok ? "ok" : "err"}" title="${DATA.status[p].ok ? "Connected" : "Problem"}"></i></a>`).join("")}</div>
          </div>
          <div class="hero-stats">
            <div class="hstat"><b>${count(T.followers, "fol")}</b><span>followers ${delta(T.followers_d24)}</span></div>
            <div class="hstat"><b>${count(T.g24, "g24")}</b><span>views in 24 h</span></div>
            <div class="hstat"><b>${count(T.engagement, "eng", 1, "%")}</b><span>engagement</span></div>
          </div>
        </div>
        <div class="scale">
          <div class="scale-caption"><span>Where the views come from</span><span>${fmt(T.videos)} videos · 4 platforms</span></div>
          <div class="scale-bar">${segs}</div>
          <div class="scale-ticks">${ticks}</div>${smallNote}
        </div>
      </section>

      <section class="section" aria-label="Platforms"><div class="platform-grid">${cards}</div></section>

      <section class="section grid-2">
        <div class="panel"><h2>What's working</h2><p class="sub">Your strongest videos and platforms right now</p>${insightsHTML(DATA.insights.good, "good")}</div>
        <div class="panel"><h2>What needs work</h2><p class="sub">Weak spots, missing uploads and connection problems</p>${insightsHTML(DATA.insights.bad, "bad")}</div>
      </section>

      <section class="section panel">
        <div class="panel-head"><div><h2>Views matrix</h2><p class="sub">Every video on every platform. Darker means more.</p></div>
          <div class="seg" role="group" aria-label="Matrix metric">${METRICS.map((m) => `<button type="button" data-metric="${m.id}" aria-pressed="${m.id === matrixMetric}">${m.label}</button>`).join("")}</div></div>
        <div id="matrix">${matrixHTML()}</div>
      </section>

      <section class="section grid-2">
        <div class="panel"><h2>Total views over time</h2><p class="sub">Each line is one platform, from every automatic update</p><div class="chart" id="c-growth"></div></div>
        <div class="panel"><h2>Views gained per day</h2><p class="sub">Paris time</p><div class="chart" id="c-daily"></div></div>
      </section>

      <section class="section grid-2">
        <div class="panel"><h2>Latest changes</h2><p class="sub">Biggest moves in the most recent update</p>${feedHTML(DATA.updates, 5)}</div>
        <div class="panel"><h2>Connections</h2><p class="sub">Whether each platform answered the last update</p>${connectionsHTML()}
          <h2 style="margin-top:22px">Views gained per update</h2><p class="sub">One bar per automatic update. Gaps mean an update didn't run.</p><div class="chart short" id="c-log"></div></div>
      </section>
    </div>`;
    // animate scale bar
    requestAnimationFrame(() => requestAnimationFrame(() => $$("[data-w]").forEach((el) => (el.style.width = `calc(${el.dataset.w}% - 2px)`))));
    paintMatrix();
    $$(".seg button").forEach((b) => b.addEventListener("click", () => {
      matrixMetric = b.dataset.metric;
      $$(".seg button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      $("#matrix").innerHTML = matrixHTML();
      paintMatrix();
    }));
    lineChart("c-growth", ORDER);
    dailyChart("c-daily", ORDER);
    logChart("c-log");
  }

  function platformPage(p) {
    const r = DATA.platforms[p], c = PL[p].c;
    const vids = DATA.videos.filter((v) => v.per[p]);
    const retention = p === "YouTube" || p === "Instagram";
    const kpi = (label, val, extra = "") => `<div class="kpi"><span>${label}</span><b>${val}</b>${extra}</div>`;
    const list = vids.map((v) => {
      const x = v.per[p];
      const thumb = v.thumb ? `<span class="thumb" style="background-image:url('${v.thumb}')"></span>` : `<span class="thumb">${icon("pin")}</span>`;
      return `<div class="vrow" style="--c:${c}">${thumb}<div><div class="vtitle">${esc(v.title)}</div><div class="vdate">Posted ${dayTime(x.posted)}${x.duration ? ` · ${x.duration}s` : ""}</div>
        <div class="vstats"><span><b>${fmt(x.likes)}</b> ${x.likes === 1 ? "like" : "likes"}</span><span><b>${fmt(x.comments)}</b> ${x.comments === 1 ? "comment" : "comments"}</span>${x.shares !== null ? `<span><b>${fmt(x.shares)}</b> ${x.shares === 1 ? "share" : "shares"}</span>` : ""}<span><b>${pct(x.engagement)}</b> engagement</span>${retention && x.retention !== null ? `<span><b>${x.retention}%</b> retention</span>` : ""}</div></div>
        <div class="vbig"><b>${fmt(x.views)}</b><span class="vdate">views ${delta(x.g24)} in 24 h</span><br><a href="${x.url}" target="_blank" rel="noopener">${PL[p].watch} ${icon("ext").replace('class=""', 'style="width:13px;height:13px;vertical-align:-2px"')}</a></div></div>`;
    }).join("");
    const st = DATA.status[p];
    $("#view").innerHTML = `<div class="view">
      ${!st.ok ? `<div class="notice"><b>${p} didn't answer the last update:</b> ${esc(st.message)}. Showing the last numbers that came through${st.last_ok ? ` (${ago(st.last_ok)})` : ""}.</div>` : ""}
      <section class="panel pheader" style="--c:${c}">
        <span class="pheader-edge"></span>
        <div class="pheader-row">${badge(p, 76, "float")}<h2>${p}</h2>${verdictChip(r.verdict)}<span class="spacer" style="flex:1"></span>
          <a class="btn" href="${PL[p].url}" target="_blank" rel="noopener">${PL[p].handle} ${icon("ext")}</a></div>
        <p class="reason">${esc(r.reason)}.</p>
      </section>
      ${r.videos ? `
      <section class="section kpis">
        ${kpi("Total views", count(r.views, `k-v-${p}`), delta(r.d_last, "latest update"))}
        ${kpi("Followers", count(r.followers, `k-f-${p}`), delta(r.followers_d24, "in 24 h"))}
        ${kpi("Views in 24 h", count(r.g24, `k-g-${p}`), `<span class="delta zero">${fmt(r.share)}% of all views</span>`)}
        ${kpi("Views per video", count(r.vpv, `k-vpv-${p}`), `<span class="delta zero">${r.videos} videos</span>`)}
        ${kpi("Engagement", r.engagement === null ? "—" : count(r.engagement, `k-e-${p}`, 1, "%"), `<span class="delta zero">likes, comments, shares</span>`)}
        ${retention ? kpi("Avg retention", r.retention === null ? "—" : count(r.retention, `k-r-${p}`, 1, "%"), `<span class="delta zero">${r.retention === null ? (p === "YouTube" ? "needs Analytics login" : "no data yet") : "watch time ÷ length"}</span>`)
                    : kpi("Likes", count(r.likes, `k-l-${p}`), `<span class="delta zero">${plural(r.comments, "comment")}</span>`)}
      </section>
      <section class="section grid-2">
        <div class="panel"><h2>Views over time</h2><p class="sub">${p} total, from every automatic update</p><div class="chart" id="c-p-views"></div></div>
        <div class="panel"><h2>Followers over time</h2><p class="sub">${fmt(r.followers)} now</p><div class="chart" id="c-p-fol"></div></div>
      </section>
      <section class="section grid-2">
        <div class="panel"><h2>Views per video</h2><p class="sub">Newest at the top</p><div class="chart" id="c-p-bars"></div></div>
        <div class="panel"><h2>Engagement per video</h2><p class="sub">Likes, comments and shares</p><div class="chart" id="c-p-eng"></div></div>
      </section>
      <section class="section panel"><h2>Videos on ${p}</h2><p class="sub">${vids.length} tracked, newest first</p><div class="vlist">${list}</div></section>
      <section class="section grid-2">
        <div class="panel"><h2>Latest changes</h2><p class="sub">What moved on ${p} in the most recent update</p>${feedHTML(DATA.updates.filter((u) => u.platform === p))}</div>
        <div class="panel"><h2>Views gained per day</h2><p class="sub">Paris time</p><div class="chart short" id="c-p-daily"></div></div>
      </section>` : `<div class="section panel"><h2>No ${p} data yet</h2><p class="sub">${esc(st.message)}. Once the key is added to the repository secrets, numbers appear after the next automatic update.</p></div>`}
    </div>`;
    if (r.videos) {
      lineChart("c-p-views", [p]);
      lineChart("c-p-fol", [p], { key: "followers_timeline", label: "followers" });
      videoBars("c-p-bars", p);
      engagementBars("c-p-eng", p);
      dailyChart("c-p-daily", [p]);
    }
  }

  // ---------------------------------------------------------------- render + routing
  function render() {
    charts.forEach((c) => c.dispose());
    charts = [];
    const slug = (location.hash.replace(/^#\/?/, "") || "overview").toLowerCase();
    const p = ORDER.find((x) => PL[x].slug === slug);
    route = p ? slug : "overview";
    renderNav();
    if (!DATA) return;
    if (DATA.empty) {
      $("#pageTitle").textContent = "Overview";
      $("#view").innerHTML = `<div class="view"><div class="panel"><h2>Waiting for the first update</h2><p class="sub">Add the API keys as repository secrets, then run the “Update MapFacto stats” workflow once.</p>${connectionsHTML()}</div></div>`;
      return;
    }
    $("#pageTitle").textContent = p ? "Platform report" : "Overview";
    document.title = p ? `${p} · MapFacto Studio` : "MapFacto Studio";
    p ? platformPage(p) : overview();
    countUp($("#view"));
    window.MF_MOTION?.after($("#view"));
    if (FINE && !REDUCED) $$(".pcard").forEach((card) => card.addEventListener("pointermove", (e) => {
      const b = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - b.left}px`);
      card.style.setProperty("--my", `${e.clientY - b.top}px`);
    }));
  }

  addEventListener("hashchange", () => {
    const lenis = window.MF_MOTION?.lenis;
    lenis ? lenis.scrollTo(0, { immediate: true }) : scrollTo({ top: 0 });
    render();
  });
  addEventListener("DOMContentLoaded", () => {
    contours();
    renderNav();
    $("#reload").addEventListener("click", () => load(true));
    load(false);
    setInterval(() => load(false), 5 * 60 * 1000);
    setInterval(tickLive, 30 * 1000);
  });
})();
