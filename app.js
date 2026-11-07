(function () {
  "use strict";
  const app = document.getElementById("app");
  const banner = document.getElementById("banner");
  const SIZE = 5, FREE = 12, PER_CARD = 24;
  // Share of each card drawn from the game's own squares (30% of 24 = 7); the rest come from the generic list.
  const SPECIFIC_SHARE = 0.3;
  const CORNERS = [0, 4, 20, 24];
  const CARD_VERSION = "v2"; // bump to give everyone fresh cards after a change to how cards are built
  const WIN_TEXT = {
    line: ["BINGO! 🎉", "Five in a row. Show your card to the room."],
    corners: ["FOUR CORNERS! 🎉", "All four corners. Show your card to the room."],
    blackout: ["BLACKOUT! 🏆", "You covered the whole card!"]
  };

  // ---------- helpers ----------
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  async function getJSON(url) {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error(url + " (" + r.status + ")");
    return r.json();
  }
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "style") n.style.cssText = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const kid of kids) if (kid != null) n.append(kid);
    return n;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const uniq = (arr) => [...new Set((arr || []).map((s) => String(s).trim()).filter(Boolean))];
  function fmtDate(iso, kickoff) {
    if (!iso) return kickoff || "";
    const d = new Date(iso + "T12:00:00");
    const s = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return kickoff ? s + " · " + kickoff : s;
  }
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // ---------- game list ----------
  async function showList() {
    document.title = "Football Bingo";
    let games = [];
    try { games = await getJSON("games/index.json"); } catch (e) { /* show generic only */ }
    const today = todayISO();
    const upcoming = games.filter((g) => (g.date || "") >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = games.filter((g) => (g.date || "") < today).sort((a, b) => b.date.localeCompare(a.date));
    const item = (g) => el("li", null, el("a", { href: "?game=" + encodeURIComponent(g.slug) },
      el("div", { class: "title" }, g.title), el("div", { class: "when" }, fmtDate(g.date, g.kickoff))));

    app.replaceChildren(
      el("h1", null, "🏈 Football Bingo"),
      el("p", { class: "muted" }, "Pick the game you're watching. Everyone gets their own random card. Tap squares as they happen."),
      el("ul", { class: "games" }, ...upcoming.map(item),
        el("li", null, el("a", { href: "?game=generic" },
          el("div", { class: "title" }, "Any game"), el("div", { class: "when" }, "General NFL squares only")))),
      past.length ? el("h2", null, "Past games") : null,
      past.length ? el("ul", { class: "games" }, ...past.map(item)) : null
    );
  }

  // ---------- one game ----------
  function buildSquares(game, generic) {
    const specific = shuffle(uniq(game.squares));
    const gen = shuffle(uniq(generic).filter((s) => !specific.includes(s)));
    const n = Math.min(specific.length, game.specificPerCard ?? Math.round(PER_CARD * SPECIFIC_SHARE));
    let picks = specific.slice(0, n).concat(gen.slice(0, PER_CARD - n));
    if (picks.length < PER_CARD) picks = picks.concat(specific.slice(n, n + PER_CARD - picks.length));
    return shuffle(picks).slice(0, PER_CARD);
  }

  // Winning patterns: any row/column/diagonal, four corners, or the whole card (blackout).
  function checkWins(marked) {
    const on = (i) => i === FREE || marked.includes(i);
    const lines = [];
    for (let r = 0; r < SIZE; r++) {
      lines.push([0, 1, 2, 3, 4].map((c) => r * SIZE + c));
      lines.push([0, 1, 2, 3, 4].map((c) => c * SIZE + r));
    }
    lines.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
    const cells = new Set(), kinds = new Set();
    for (const line of lines) if (line.every(on)) { kinds.add("line"); line.forEach((i) => cells.add(i)); }
    if (CORNERS.every(on)) { kinds.add("corners"); CORNERS.forEach((i) => cells.add(i)); }
    if (marked.length >= PER_CARD) kinds.add("blackout");
    return { cells, kinds };
  }

  async function showGame(slug) {
    if (slug !== "generic" && !/^[a-z0-9-]+$/.test(slug)) throw new Error("Unknown game");
    const game = slug === "generic" ? { title: "Any game", squares: [] } : await getJSON("games/" + slug + ".json");
    const genericFile = game.generic === "college" ? "data/generic-college.json" : "data/generic.json";
    const generic = await getJSON(genericFile);
    const key = "fbbingo:" + CARD_VERSION + ":" + slug;
    let state = store.get(key);
    if (!state || !Array.isArray(state.squares) || state.squares.length !== PER_CARD) {
      state = { squares: buildSquares(game, generic), marked: [], name: (store.get("fbbingo:name") || "") };
      store.set(key, state);
    }
    const save = () => store.set(key, state);
    document.title = game.title + " · Football Bingo";

    const away = game.away || {}, home = game.home || {};
    if (away.color) document.documentElement.style.setProperty("--away", away.color);
    if (home.color) document.documentElement.style.setProperty("--home", home.color);

    const header = away.name && home.name
      ? el("div", { class: "matchup" },
          el("span", { class: "team away" }, away.short || away.name),
          el("span", { class: "at" }, "at"),
          el("span", { class: "team home" }, home.short || home.name))
      : el("h1", { style: "text-align:center" }, game.title);

    const nameInput = el("input", { type: "text", placeholder: "Your name", maxlength: "30", "aria-label": "Your name" });
    nameInput.value = state.name || "";
    const footName = el("span", null, state.name || "");
    nameInput.addEventListener("input", () => {
      state.name = nameInput.value; footName.textContent = state.name; save(); store.set("fbbingo:name", state.name);
    });

    const card = el("div", { class: "card" });
    const cells = [];
    let prevKinds = checkWins(state.marked).kinds;

    function refresh(fromTap) {
      const { cells: winCells, kinds } = checkWins(state.marked);
      cells.forEach((c, i) => {
        if (i === FREE) return;
        c.classList.toggle("marked", state.marked.includes(i));
        c.classList.toggle("win", winCells.has(i));
        c.setAttribute("aria-pressed", state.marked.includes(i) ? "true" : "false");
      });
      card.classList.toggle("bingo", kinds.size > 0);
      card.classList.toggle("blackout", kinds.has("blackout"));
      // Celebrate the best pattern that just appeared (blackout > corners > line).
      const fresh = ["blackout", "corners", "line"].find((k) => kinds.has(k) && !prevKinds.has(k));
      if (fromTap && fresh) {
        banner.querySelector(".banner-title").textContent = WIN_TEXT[fresh][0];
        banner.querySelector(".banner-sub").textContent = WIN_TEXT[fresh][1];
        banner.hidden = false;
        if (navigator.vibrate) navigator.vibrate(fresh === "blackout" ? [200, 80, 200, 80, 400] : [120, 60, 120]);
      }
      prevKinds = kinds;
    }

    const grid = el("div", { class: "grid" });
    let sq = 0;
    for (let i = 0; i < SIZE * SIZE; i++) {
      let cell;
      if (i === FREE) {
        cell = el("div", { class: "cell free" }, "FREE 🏈");
      } else {
        const idx = i;
        const text = state.squares[sq++];
        const longest = Math.max(...text.split(/\s+/).map((w) => w.length));
        const fit = longest >= 10 ? " xlong" : longest >= 8 || text.length > 22 ? " long" : "";
        cell = el("button", { class: "cell" + fit, type: "button", onclick: () => {
          const at = state.marked.indexOf(idx);
          if (at >= 0) state.marked.splice(at, 1); else state.marked.push(idx);
          save(); refresh(true);
        } }, text);
      }
      cells.push(cell);
      grid.append(cell);
    }
    card.append(el("div", { class: "letters" }, ..."BINGO".split("").map((l) => el("span", null, l))), grid,
      el("div", { class: "card-foot" }, footName, el("span", null, game.title)));

    const shareBtn = el("button", { type: "button", onclick: async () => {
      const url = location.href;
      try {
        if (navigator.share) await navigator.share({ title: game.title + " Bingo", url });
        else { await navigator.clipboard.writeText(url); shareBtn.textContent = "Link copied"; }
      } catch (e) { /* cancelled */ }
    } }, "Share link");

    app.replaceChildren(
      header,
      el("p", { class: "subtitle" }, fmtDate(game.date, game.kickoff) || "Tap a square when it happens"),
      el("div", { class: "name" }, nameInput),
      card,
      el("p", { class: "rules" }, "Win with any row, column or diagonal, all four corners, or a blackout (the whole card)."),
      el("div", { class: "actions" },
        el("button", { type: "button", class: "primary", onclick: () => {
          if (!confirm("Get a brand-new card? Your marks on this one will be lost.")) return;
          state.squares = buildSquares(game, generic); state.marked = []; save(); showGame(slug);
        } }, "New card"),
        el("button", { type: "button", onclick: () => {
          if (!state.marked.length || !confirm("Clear all your marks?")) return;
          state.marked = []; save(); refresh(false);
        } }, "Clear marks"),
        shareBtn,
        el("a", { class: "btn", href: "?all" }, "All games"))
    );
    refresh(false);
    keepAwake();
  }

  // Keep the screen on while the card is open (supported browsers only).
  let lock = null;
  async function keepAwake() {
    try { if ("wakeLock" in navigator && !lock) { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => { lock = null; }); } } catch (e) { /* not allowed */ }
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && /[?&]game=/.test(location.search)) keepAwake(); });

  document.getElementById("banner-close").addEventListener("click", () => { banner.hidden = true; });

  const params = new URLSearchParams(location.search);
  async function start() {
    const slug = params.get("game");
    if (slug) return showGame(slug);
    if (!params.has("all")) {
      let games = [];
      try { games = await getJSON("games/index.json"); } catch (e) { /* fall through */ }
      const featured = games.find((g) => g.featured);
      if (featured) {
        history.replaceState(null, "", "?game=" + encodeURIComponent(featured.slug));
        return showGame(featured.slug);
      }
    }
    return showList();
  }
  start().catch((e) => {
    app.replaceChildren(el("p", { class: "error" }, "Couldn't load that game. "), el("p", { style: "text-align:center" }, el("a", { href: "?all" }, "See all games")));
    console.error(e);
  });
})();
