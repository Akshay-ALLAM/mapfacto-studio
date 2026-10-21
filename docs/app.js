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
  // If you upload a platform's official icon to docs/icons/<platform>.svg (or .png),
  // it replaces the generic symbol automatically, inside the same 3D tile.
  const badge = (p, size = 40, cls = "") => PL[p].logo
    ? `<span class="b3d has-logo ${cls}" style="--c:${PL[p].c};--s:${size}px" aria-hidden="true"><img src="${PL[p].logo}" alt=""><i class="sheen"></i></span>`
    : `<span class="b3d ${cls}" style="--c:${PL[p].c};--s:${size}px" aria-hidden="true"><svg viewBox="0 0 24 24" stroke="#fff">${GLYPH[p]}</svg><i class="sheen"></i></span>`;
  // Official icons: list them in icons/icons.json, e.g. {"youtube": "youtube.svg"}. The file always
  // exists, so there are no failed requests when no icon has been added.
  async function findLogos() {
    try {
      const m = await (await fetch("icons/icons.json")).json();
      ORDER.forEach((p) => { if (m[PL[p].slug]) PL[p].logo = `icons/${m[PL[p].slug]}`; });
    } catch (e) { /* generic badges stay */ }
  }
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
  // An engagement % on a handful of views is noise (1 like on 3 views = 33%)
  const minEng = () => DATA?.min_views_engagement ?? 50;
  const engOK = (e, views) => e !== null && e !== undefined && (views || 0) >= minEng();
  const engTxt = (e, views) => (e === null || e === undefined ? "—"
    : engOK(e, views) ? pct(e) : `<span class="na" title="Only ${fmt(views)} views: under ${minEng()}, too few for a meaningful %">n/a</span>`);
  const share = (v, views) => ((views > 0 && v < 0.1) ? "under 0.1" : v);
  const plural = (n, w) => `${fmt(n)} ${w}${Math.abs(n) === 1 ? "" : "s"}`;
  const verdictChip = (v, label) => `<span class="verdict ${v}">${icon(v)}${esc(label || VERDICT[v])}</span>`;
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

  // Numbers are written into the page as their final value, so every card, total and snapshot
  // always agrees. (They used to count up from 0, which could be caught half-way.)
  const count = (n, id, dec = 0, suffix = "") =>
    n === null || n === undefined ? "—" : `<span class="num">${dec ? Number(n).toFixed(dec) : nf.format(Math.round(n))}${suffix}</span>`;

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
  // ---------------------------------------------------------------- sign in (Supabase)
  // Visitors get docs/data.json, which is demo data. The real dashboard lives in Supabase and
  // Row Level Security only returns it to signed-in owners. The publishable key below is meant
  // to be public: on its own it can't read anything.
  const SB = { url: "https://mhcbyreqascwvqocybvn.supabase.co", key: "sb_publishable_B0yBet8z2-yoGYHj5IAurw_yN8RhNll" };
  let sb = null, session = null, MODE = "demo", noAccess = false;
  function initAuth() {
    if (!window.supabase?.createClient) return;
    sb = window.supabase.createClient(SB.url, SB.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    sb.auth.onAuthStateChange((event, s) => {
      session = s;
      updateAccount();
      if (event === "PASSWORD_RECOVERY") openAuth("newpass");
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") load(false);
    });
  }
  async function fetchData() {
    if (sb) { try { session = (await sb.auth.getSession()).data.session; } catch (e) { session = null; } }
    noAccess = false;
    if (session) {
      const { data, error } = await sb.from("dashboard").select("data").eq("id", 1).maybeSingle();
      if (error) throw new Error(error.message);
      if (data?.data) { MODE = "real"; return data.data; }
      noAccess = true; // signed in, but this account isn't allowed to see the real numbers
    }
    MODE = "demo";
    const r = await fetch(`data.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
  function updateAccount() {
    const b = $("#account"), l = $("#accountLabel");
    if (!b) return;
    b.hidden = !sb;
    l.textContent = session ? "Sign out" : "Sign in";
    b.title = session ? `Signed in as ${session.user?.email || ""}` : "Owner sign in";
    b.classList.toggle("signed", !!session);
  }

  const AUTH_TEXT = {
    signin: { title: "Sign in", sub: "Owner access to the real numbers. Visitors see demo data.", btn: "Sign in" },
    signup: { title: "Create your account", sub: "Invite-only: only an approved email can create an account.", btn: "Create account" },
    reset: { title: "Reset your password", sub: "We'll email you a link to choose a new password.", btn: "Send reset link" },
    newpass: { title: "Choose a new password", sub: "At least 8 characters.", btn: "Save new password" },
  };
  let authMode = "signin";
  function authModal() {
    let m = $("#authModal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "authModal"; m.className = "modal"; m.hidden = true;
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <button class="modal-x" type="button" aria-label="Close">×</button>
      <img class="modal-mark" src="brand/mapfacto-64.png" alt="" width="44" height="44">
      <h2 id="authTitle"></h2><p class="sub" id="authSub"></p>
      <form id="authForm" novalidate>
        <label class="fld" data-f="email"><span>Email</span><input id="authEmail" type="email" autocomplete="email" required></label>
        <label class="fld" data-f="password"><span>Password</span><input id="authPass" type="password" autocomplete="current-password" minlength="8" required></label>
        <p class="auth-msg" id="authMsg" role="alert"></p>
        <button class="btn primary" id="authBtn" type="submit"></button>
      </form>
      <div class="auth-alt" id="authAlt"></div>
    </div>`;
    document.body.append(m);
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.closest(".modal-x")) closeAuth();
      const sw = e.target.closest("[data-mode]");
      if (sw) openAuth(sw.dataset.mode);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !m.hidden) closeAuth(); });
    $("#authForm", m).addEventListener("submit", submitAuth);
    return m;
  }
  function openAuth(mode = "signin") {
    const m = authModal(), T = AUTH_TEXT[mode];
    authMode = mode;
    $("#authTitle").textContent = T.title; $("#authSub").textContent = T.sub; $("#authBtn").textContent = T.btn;
    $('[data-f="email"]').hidden = mode === "newpass";
    $('[data-f="password"]').hidden = mode === "reset";
    $("#authPass").autocomplete = mode === "signin" ? "current-password" : "new-password";
    $("#authMsg").textContent = ""; $("#authMsg").className = "auth-msg";
    $("#authAlt").innerHTML = {
      signin: `<button type="button" data-mode="signup">First time? Create your account</button><button type="button" data-mode="reset">Forgot password?</button>`,
      signup: `<button type="button" data-mode="signin">Already have an account? Sign in</button>`,
      reset: `<button type="button" data-mode="signin">Back to sign in</button>`,
      newpass: "",
    }[mode];
    m.hidden = false;
    document.documentElement.classList.add("modal-open");
    setTimeout(() => (mode === "newpass" ? $("#authPass") : $("#authEmail")).focus(), 30);
  }
  function closeAuth() { const m = $("#authModal"); if (m) m.hidden = true; document.documentElement.classList.remove("modal-open"); }
  function friendly(msg) {
    const m = String(msg || "");
    if (/invalid login credentials/i.test(m)) return "Wrong email or password.";
    if (/email not confirmed/i.test(m)) return "Please confirm your email first: open the link we sent you, then sign in.";
    if (/database error saving new user|invite-only/i.test(m)) return "This dashboard is invite-only, and this email isn't on the list.";
    if (/rate limit/i.test(m)) return "Too many emails were sent. Please wait an hour and try again.";
    if (/password should be at least|at least 8/i.test(m)) return "Use at least 8 characters for the password.";
    if (/failed to fetch|network/i.test(m)) return "Couldn't reach the sign-in service. Check your connection and try again.";
    return m || "Something went wrong. Please try again.";
  }
  async function submitAuth(e) {
    e.preventDefault();
    const email = $("#authEmail").value.trim(), password = $("#authPass").value;
    const msg = $("#authMsg"), btn = $("#authBtn");
    const say = (t, ok = false) => { msg.textContent = t; msg.className = "auth-msg" + (ok ? " ok" : ""); };
    if (authMode !== "newpass" && !/^\S+@\S+\.\S+$/.test(email)) return say("Enter a valid email address.");
    if (authMode !== "reset" && password.length < 8) return say("The password needs at least 8 characters.");
    btn.disabled = true; btn.classList.add("spinning");
    const back = location.origin + location.pathname;
    try {
      if (authMode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        closeAuth(); toast("Signed in. Loading your real numbers…");
      } else if (authMode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: back } });
        if (error) throw error;
        if (data.session) { closeAuth(); toast("Account created. Loading your real numbers…"); }
        else say("Almost done: we sent you an email. Open the link in it to confirm your address, then sign in here.", true);
      } else if (authMode === "reset") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: back });
        if (error) throw error;
        say("If this email has an account, a reset link is on its way.", true);
      } else {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        closeAuth(); toast("New password saved.");
      }
    } catch (err) {
      say(friendly(err?.message));
    } finally {
      btn.disabled = false; btn.classList.remove("spinning");
    }
  }
  async function onAccount() {
    if (!sb) return;
    if (session) { await sb.auth.signOut(); toast("Signed out. Showing demo data."); }
    else openAuth("signin");
  }

  let checkedAt = null, busy = false, again = false;
  async function load(manual) {
    const btn = $("#reload"), label = btn.querySelector(".btn-label");
    if (busy) { again = true; return; }
    busy = true;
    const t0 = performance.now();
    if (manual) { btn.classList.add("spinning"); btn.disabled = true; btn.setAttribute("aria-busy", "true"); if (label) label.textContent = "Checking…"; }
    let msg = "";
    try {
      const prevMode = DATA ? MODE : null;
      const next = await fetchData();
      const changed = !DATA || next.generated_at !== DATA.generated_at || prevMode !== MODE;
      const hadData = !!DATA;
      DATA = next;
      checkedAt = new Date();
      if (changed) render();
      msg = changed && hadData ? "New numbers loaded" : "Already up to date";
    } catch (e) {
      msg = "Couldn't reach the data";
      if (!DATA) $("#view").innerHTML = `<div class="notice">The dashboard couldn't load its data file (${esc(e.message)}). It appears after the first automatic update has run.</div>`;
    } finally {
      // keep the spinner visible long enough to be noticed
      const wait = manual ? Math.max(0, 650 - (performance.now() - t0)) : 0;
      setTimeout(() => {
        btn.classList.remove("spinning"); btn.disabled = false; btn.removeAttribute("aria-busy");
        if (manual) {
          if (label) label.textContent = msg === "New numbers loaded" ? "Updated" : msg === "Already up to date" ? "Up to date" : "Retry";
          btn.classList.add("done");
          toast(msg === "Already up to date" ? `Already up to date. The robot checks the platforms every ${DATA?.update_every_min || 30} min.` : msg + ".");
          setTimeout(() => { btn.classList.remove("done"); if (label) label.textContent = "Reload"; }, 2200);
        }
        busy = false;
        tickLive();
        if (again) { again = false; load(false); }
      }, wait);
    }
  }
  function toast(text) {
    let el = $("#toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.append(el); }
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function tickLive() {
    if (!DATA) return;
    if (MODE === "demo") {
      $("#pulse").classList.remove("stale"); $("#pulse").classList.add("demo");
      $("#liveText").innerHTML = `Demo data<span class="long"> · sample numbers</span>`;
      $("#live").title = "The public dashboard shows made-up numbers. The owner signs in to see the real ones.";
      return;
    }
    $("#pulse").classList.remove("demo");
    const last = DATA.last_pull, mins = last ? (Date.now() - new Date(last)) / 60000 : Infinity;
    const every = DATA.update_every_min || 30;
    const next = Math.round(every - (mins % every));
    const stale = mins > every * 2.5;
    $("#pulse").classList.toggle("stale", stale);
    $("#liveText").innerHTML = stale
      ? `Last update ${ago(last)}<span class="long">: the automatic update may be paused</span>`
      : `Updated ${ago(last)}<span class="long"> · next in about ${Math.max(1, next)} min${checkedAt ? ` · checked ${timeFmt.format(checkedAt)}` : ""}</span>`;
    $("#live").title = `Numbers from ${dayTime(last)}${checkedAt ? `. Page last checked ${timeFmt.format(checkedAt)}` : ""}`;
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
  const hm = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const timeAxis = () => ({
    type: "time", ...axisCommon, splitLine: { show: false }, minInterval: 3600 * 1000, splitNumber: 5,
    axisLabel: { color: INK3, fontSize: 12, hideOverlap: true, formatter: (v) => {
      const d = new Date(v), t = hm.format(d);
      return t === "00:00" ? dayFmt.format(d) : t;
    } },
  });
  // Y axis with breathing room: small counts start at 0, big cumulative counts get padding
  const niceStep = (span) => {
    const raw = Math.max(1, span / 5), m = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 5, 10].map((k) => k * m).find((x) => x >= raw);
  };
  const yRange = ({ min, max }) => {
    if (max < 100) { const hi = Math.max(5, max * 1.3); const st = niceStep(hi); return [0, Math.ceil(hi / st) * st, st]; }
    const lo = Math.max(0, min - Math.max((max - min) * 0.6, max * 0.03)), hi = max + Math.max((max - min) * 0.25, max * 0.01);
    const st = niceStep(hi - lo);
    return [Math.max(0, Math.floor(lo / st) * st), Math.ceil(hi / st) * st, st];
  };
  // y axis for line charts: 0-based when several platforms share it, padded otherwise
  const yAxisFor = (series, zero) => {
    const vals = series.flatMap((x) => x.data.map((d) => d[1]));
    const ext = { min: zero ? 0 : Math.min(...vals), max: Math.max(...vals) };
    const [min, max, interval] = yRange(ext);
    return { type: "value", ...axisCommon, min, max, interval };
  };
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
      xAxis: timeAxis(),
      yAxis: yAxisFor(series, platforms.length > 1),
      series,
    });
  }

  function dailyChart(id, platforms) {
    const days = [...new Set(platforms.flatMap((p) => (DATA.platforms[p].daily || []).map((d) => d[0])))].sort();
    if (!days.length) {
      const b = DATA.baseline_day ? new Date(DATA.baseline_day + "T12:00:00Z") : null;
      const next = b ? new Date(b.getTime() + 864e5) : null;
      return void (document.getElementById(id).outerHTML = `<p class="empty-note">${b ? `${dayFmt.format(b)} is the starting point: tracking began that day, so the views a video already had aren't counted as gained. The first full day appears after ${dayFmt.format(next)}.` : "Daily totals appear after the first full day of updates."}</p>`);
    }
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

  // The first update is only the baseline (no bar). After a gap (an update that didn't run),
  // one bar holds several hours of views; those bars are capped so they don't flatten the rest.
  function logChart(id) {
    const every = DATA.update_every_min || 30;
    const log = (DATA.log || []).filter((e) => e.gain !== null && e.gain !== undefined)
      .map((e) => ({ ...e, gain: Math.max(0, e.gain), gap: (e.mins || 0) > every * 2.5 }));
    if (log.length < 2) return void (document.getElementById(id).outerHTML = `<p class="empty-note">Fills in after a few automatic updates.</p>`);
    const normal = log.filter((e) => !e.gap).map((e) => e.gain).sort((a, b) => a - b);
    const p95 = normal.length ? normal[Math.min(normal.length - 1, Math.floor(normal.length * 0.95))] : 10;
    const cap = Math.max(10, Math.ceil(p95 * 1.6 / 5) * 5);
    const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + " min" : ""}` : `${m} min`);
    mount(id, {
      ...baseChart(), legend: { show: false }, grid: { left: 4, right: 8, top: 22, bottom: 4, containLabel: true },
      tooltip: { ...baseChart().tooltip, axisPointer: { type: "shadow", shadowStyle: { color: "rgba(74,163,223,.08)" } },
        formatter: (ps) => { const e = log[ps[0].dataIndex]; return `<b>${dayTime(e.at)}</b><br>+${fmt(e.gain)} views${e.mins ? ` over ${dur(e.mins)}` : ""}${e.gap ? "<br><span style='color:#566f84'>Catch-up after updates were skipped</span>" : ""}`; } },
      xAxis: timeAxis(),
      yAxis: { type: "value", ...axisCommon, minInterval: 1, max: cap },
      series: [{ type: "bar", barMaxWidth: 10, barMinWidth: 3,
        data: log.map((e) => ({ value: [e.at, Math.min(e.gain, cap)],
          itemStyle: e.gain > cap || e.gap ? { color: "#9fd0f2", borderColor: "#4aa3df", borderWidth: 1, borderType: "dashed" } : undefined,
          label: e.gain > cap ? { show: true, position: "top", formatter: `${fmt(e.gain)}↑`, color: INK2, fontSize: 11, fontWeight: 700 } : undefined })),
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
    { id: "engagement", label: "Engagement", get: (x) => (engOK(x.engagement, x.views) ? x.engagement : null), pct: true },
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
        if (val === null || val === undefined) return M.pct ? `<td class="cell none">${engTxt(x.engagement, x.views)}</td>` : `<td class="cell none">—</td>`;
        const t = Math.sqrt(Math.max(0, val) / max), bg = rampColor(t), fg = t > 0.62 ? "#fff" : INK;
        const txt = M.pct ? pct(val) : (M.id === "views" ? fmt(val) : (val > 0 ? "+" : "") + fmt(val));
        return `<td class="cell" data-bg="${bg}" data-fg="${fg}" style="transition-delay:${REDUCED ? 0 : 60 + (i++) * 28}ms" title="${esc(v.title)} on ${p}: ${txt} ${M.label.toLowerCase()}">${txt}</td>`;
      }).join("");
      const tot = M.pct ? null : ORDER.reduce((a, p) => a + (v.per[p] ? M.get(v.per[p]) || 0 : 0), 0);
      const totTxt = M.pct ? engTxt(v.engagement, v.total) : (M.id === "views" ? fmt(tot) : (tot > 0 ? "+" : "") + fmt(tot));
      const thumb = v.thumb ? `<span class="thumb" style="background-image:url('${v.thumb}')"></span>` : `<span class="thumb">${icon("pin")}</span>`;
      return `<tr><td class="v">${thumb}<span><span class="vtitle">${esc(v.title)}</span><br><span class="vdate">Posted ${dayTime(v.posted)}</span></span></td>${cells}<td class="cell total" title="${M.pct ? "Likes, comments and shares on every platform, divided by all its views" : ""}">${totTxt}</td></tr>`;
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
    const seen = new Set();
    items = items.filter((u) => { const k = u.platform + "|" + u.title; return seen.has(k) ? false : (seen.add(k), true); });
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
        <p>${s.ok && MODE === "demo" ? `Sample connection · ${esc(s.message)}` : s.ok ? `Last update ${ago(s.at)} · ${esc(s.message.replace(/^1 videos$/, "1 video"))}` : `${esc(s.message)}${s.last_ok ? `. Last good update ${ago(s.last_ok)}` : ""}`}</p></div>`;
    }).join("")}</div>`;
  }

  // ---------------------------------------------------------------- pages
  function overview() {
    const T = DATA.totals, P = DATA.platforms;
    const byViews = ORDER.filter((p) => P[p].views).sort((a, b) => P[b].views - P[a].views);
    const segs = byViews.map((p) => `<div class="scale-seg" style="--c:${PL[p].c};--w:${P[p].share}" title="${p}: ${fmt(P[p].views)} views (${share(P[p].share, P[p].views)}%)" data-href="#/${PL[p].slug}" role="link" tabindex="0"></div>`).join("");
    const ticks = byViews.map((p) => `<div class="scale-tick" style="--c:${PL[p].c};--w:${P[p].share}">${P[p].share >= 9 ? `<b><i></i>${p}</b><span>${share(P[p].share, P[p].views)}% · ${fmt(P[p].views)}</span>` : ""}</div>`).join("");
    const small = byViews.filter((p) => P[p].share < 9);
    const smallNote = small.length ? `<div class="scale-small">${small.map((p) => `<span style="--c:${PL[p].c}"><i></i><b>${p}</b> ${share(P[p].share, P[p].views)}% · ${fmt(P[p].views)} views</span>`).join(" &nbsp; ")}</div>` : "";
    const cards = ORDER.map((p) => {
      const r = P[p];
      return `<a class="pcard" href="#/${PL[p].slug}" style="--c:${PL[p].c}" aria-label="${p}: ${fmt(r.views)} views, ${r.label || VERDICT[r.verdict]}">
        <span class="pcard-edge"></span>
        <div class="pcard-head">${badge(p, 42)}<span class="pcard-name">${p}</span>${verdictChip(r.verdict, r.label)}</div>
        <div class="pcard-num">${count(r.views, "pv-" + p)}</div>
        <div class="pcard-meta"><span>views · ${delta(r.d_last)}</span><span>${fmt(r.followers)} followers</span></div>
        ${spark(r.timeline, PL[p].c)}
      </a>`;
    }).join("");
    const tick = (DATA.updates || []).slice(0, 12).map((u) => `<span class="tk">${badge(u.platform, 20, "sm")}<b>${u.is_new ? "New video" : (() => { const m = [["views", u.d_views], ["likes", u.d_likes], ["comments", u.d_comments], ["shares", u.d_shares]].find(([, v]) => v); return m ? `${m[1] > 0 ? "+" : "−"}${plural(Math.abs(m[1]), m[0].slice(0, -1))}` : ""; })()}</b> ${esc(u.title)} <em>on ${u.platform}</em></span>`).join("");
    const ticker = tick ? `<div class="ticker" aria-label="Latest changes"><span class="ticker-label"><span class="pulse"></span>${MODE === "demo" ? "Latest" : "Live"}</span><div class="ticker-track"><div class="ticker-run">${tick}</div></div></div>` : "";
    $("#view").innerHTML = `<div class="view">
      ${ticker}
      <section class="panel hero" aria-label="Summary">
        <div class="hero-top hero-grid">
          <div class="hero-copy">
            <p class="hero-kicker">MapFacto has been watched</p>
            <p class="hero-number">${count(T.views, "total")}<small>times</small></p>
            <p class="hero-kicker" style="margin-top:10px">${delta(T.d_last, "views")} in the latest update, ${dayTime(DATA.last_pull)}</p>
            <div class="hero-stats">
              <div class="hstat"><b>${count(T.followers, "fol")}</b><span>followers ${delta(T.followers_d24)}</span></div>
              <div class="hstat"><b>${count(T.g24, "g24")}</b><span>views in 24 h</span></div>
              <div class="hstat"><b>${count(T.engagement, "eng", 1, "%")}</b><span>engagement</span></div>
            </div>
            <div class="hero-platforms">${ORDER.map((p) => `<a class="hp" href="#/${PL[p].slug}">${badge(p, 30, "sm")}<span>${p}</span><i class="${DATA.status[p].ok ? "ok" : "err"}" title="${DATA.status[p].ok ? "Connected" : "Problem"}"></i></a>`).join("")}</div>
          </div>
          <div class="globe-wrap" aria-label="Interactive globe: drag to spin. The four platforms orbit it with their total views.">
            <canvas class="globe" id="globe"></canvas>
            <div class="orbit">${ORDER.map((p, i) => `<a class="sat" href="#/${PL[p].slug}" data-i="${i}" style="--c:${PL[p].c}">${badge(p, 30, "sm")}<span><b>${fmt(P[p].views)}</b>${p}</span></a>`).join("")}</div>
            <span class="globe-hint">Drag to spin</span>
          </div>
        </div>
        <div class="scale">
          <div class="scale-caption"><span>Where the views come from</span><span>${fmt(T.videos)} videos · 4 platforms</span></div>
          <div class="scale-bar">${segs}</div>
          <div class="scale-ticks">${ticks}</div>${smallNote}
          <div class="scale-legend">${byViews.map((p) => `<span style="--c:${PL[p].c}"><i></i><b>${p}</b> ${share(P[p].share, P[p].views)}% · ${fmt(P[p].views)}</span>`).join("")}</div>
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
    paintMatrix();
    $$(".seg button").forEach((b) => b.addEventListener("click", () => {
      matrixMetric = b.dataset.metric;
      $$(".seg button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      $("#matrix").innerHTML = matrixHTML();
      paintMatrix();
    }));
    window.MF_GLOBE?.mount($(".globe-wrap"));
    lineChart("c-growth", ORDER);
    dailyChart("c-daily", ORDER);
    logChart("c-log");
  }

  function platformPage(p) {
    const r = DATA.platforms[p], c = PL[p].c;
    const vids = DATA.videos.filter((v) => v.per[p]);
    const retention = p === "YouTube" || p === "Instagram";
    const kpi = (label, val, extra = "") => `<div class="kpi"><span>${label}</span><b>${val}</b>${extra}</div>`;
    const na = (why) => `<b class="na-big">n/a</b><span class="delta zero">${why}</span>`;
    const kpiNA = (label, why) => `<div class="kpi kpi-na"><span>${label}</span>${na(why)}</div>`;
    const note = (t) => `<span class="delta zero">${t}</span>`;
    const RET_WHY = { YouTube: "needs YouTube Analytics login", TikTok: "TikTok doesn't share it", Facebook: "not shared for Reels yet", Instagram: "no data yet" };
    const list = vids.map((v) => {
      const x = v.per[p];
      const thumb = v.thumb ? `<span class="thumb" style="background-image:url('${v.thumb}')"></span>` : `<span class="thumb">${icon("pin")}</span>`;
      return `<div class="vrow" style="--c:${c}">${thumb}<div><div class="vtitle">${esc(v.title)}</div><div class="vdate">Posted ${dayTime(x.posted)}${x.duration ? ` · ${x.duration}s` : ""}</div>
        <div class="vstats"><span><b>${fmt(x.likes)}</b> ${x.likes === 1 ? "like" : "likes"}</span><span><b>${fmt(x.comments)}</b> ${x.comments === 1 ? "comment" : "comments"}</span>${x.shares !== null ? `<span><b>${fmt(x.shares)}</b> ${x.shares === 1 ? "share" : "shares"}</span>` : ""}<span><b>${engTxt(x.engagement, x.views)}</b> engagement</span>${retention && x.retention !== null ? `<span><b>${x.retention}%</b> retention</span>` : ""}</div></div>
        <div class="vbig"><b>${fmt(x.views)}</b><span class="vdate">views ${delta(x.g24)} in 24 h</span><br><a href="${x.url}" target="_blank" rel="noopener">${PL[p].watch} ${icon("ext").replace('class=""', 'style="width:13px;height:13px;vertical-align:-2px"')}</a></div></div>`;
    }).join("");
    const st = DATA.status[p];
    $("#view").innerHTML = `<div class="view">
      ${!st.ok ? `<div class="notice"><b>${p} didn't answer the last update:</b> ${esc(st.message)}. Showing the last numbers that came through${st.last_ok ? ` (${ago(st.last_ok)})` : ""}.</div>` : ""}
      <section class="panel pheader" style="--c:${c}">
        <span class="pheader-edge"></span>
        <div class="pheader-row">${badge(p, 76, "float")}<h2>${p}</h2>${verdictChip(r.verdict, r.label)}<span class="spacer" style="flex:1"></span>
          <a class="btn" href="${PL[p].url}" target="_blank" rel="noopener">${PL[p].handle} ${icon("ext")}</a></div>
        <p class="reason">${esc(r.reason)}.</p>
      </section>
      ${r.videos ? `
      <section class="section kpis">
        ${kpi("Total views", count(r.views, `k-v-${p}`), delta(r.d_last, "latest update"))}
        ${kpi("Views in 24 h", count(r.g24, `k-g-${p}`), note(`${plural(r.videos, "video")} · ${share(r.share, r.views)}% of all views`))}
        ${r.followers === null || r.followers === undefined ? kpiNA("Followers", "not available") : kpi("Followers", count(r.followers, `k-f-${p}`), delta(r.followers_d24, "in 24 h"))}
        ${kpi("Likes", count(r.likes, `k-l-${p}`), note("on all videos"))}
        ${kpi("Comments", count(r.comments, `k-c-${p}`), note("on all videos"))}
        ${r.shares === null || r.shares === undefined ? kpiNA("Shares", `not in ${p}'s data`) : kpi("Shares", count(r.shares, `k-s-${p}`), note("on all videos"))}
        ${!engOK(r.engagement, r.views) ? kpiNA("Engagement", r.engagement === null ? "no views yet" : `needs ${minEng()}+ views (has ${fmt(r.views)})`) : kpi("Engagement", count(r.engagement, `k-e-${p}`, 1, "%"), note("likes, comments, shares ÷ views"))}
        ${r.retention === null || r.retention === undefined ? kpiNA("Avg retention", RET_WHY[p]) : kpi("Avg retention", count(r.retention, `k-r-${p}`, 1, "%"), note("watch time ÷ length"))}
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
    window.MF_GLOBE?.destroy();
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
    if (MODE === "demo") {
      $(".view").insertAdjacentHTML("afterbegin", `<div class="demo-banner" role="note">
        <span class="demo-tag">Demo</span>
        <span>${noAccess ? `You're signed in as <b>${esc(session?.user?.email)}</b>, but this account can't see the real numbers, so this is demo data.`
          : "You're looking at <b>demo data</b>: every number here is made up, so the channel's real results stay private. The real dashboard is behind a sign-in."}</span>
        ${noAccess ? "" : `<button class="btn primary sm" type="button" data-signin>Owner sign in</button>`}</div>`);
    }
    window.MF_MOTION?.after($("#view"));
    if (FINE && !REDUCED) $$(".pcard").forEach((card) => card.addEventListener("pointermove", (e) => {
      const b = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - b.left}px`);
      card.style.setProperty("--my", `${e.clientY - b.top}px`);
    }));
  }

  document.addEventListener("click", (e) => { const t = e.target.closest("[data-href]"); if (t) location.hash = t.dataset.href; });
  document.addEventListener("keydown", (e) => { const t = e.target.closest?.("[data-href]"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); location.hash = t.dataset.href; } });
  addEventListener("hashchange", () => {
    const lenis = window.MF_MOTION?.lenis;
    lenis ? lenis.scrollTo(0, { immediate: true }) : scrollTo({ top: 0 });
    render();
  });
  addEventListener("DOMContentLoaded", () => {
    contours();
    renderNav();
    $("#reload").addEventListener("click", () => load(true));
    initAuth();
    updateAccount();
    $("#account").addEventListener("click", onAccount);
    document.addEventListener("click", (e) => { if (e.target.closest("[data-signin]")) openAuth("signin"); });
    findLogos().then(() => { renderNav(); load(false); });
    setInterval(() => load(false), 5 * 60 * 1000);
    setInterval(tickLive, 30 * 1000);
  });
})();
