(function () {
  "use strict";
  const app = document.getElementById("app");
  const banner = document.getElementById("banner");
  const SIZE = 5, FREE = 12, PER_CARD = 24;
  // Share of each card drawn from the game's own squares (30% of 24 = 7); the rest come from the generic list.
  const SPECIFIC_SHARE = 0.3;
  const CORNERS = [0, 4, 20, 24];
  const CARD_VERSION = "v2"; // bump to give everyone fresh cards after a change to how cards are built
  const MULTI = ["", "", "DOUBLE ", "TRIPLE ", "QUADRUPLE "];

  // ---------- helpers ----------
  const store = {
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } },
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

  // Replace the page content, skipping empty (null/false) slots so they don't print as "null".
  const render = (...kids) => app.replaceChildren(...kids.filter((k) => k != null && k !== false));

  // ---------- team themes ----------
  // A theme sets the card's colors. Optional "dark" values override them in dark mode.
  // The gray look is the default in style.css; a team theme overrides it, and null goes back to gray.
  const THEME_VARS = { accent: "--accent", mark: "--mark", markInk: "--mark-ink", win: "--win", glow: "--glow", letters: "--letters" };
  const darkMQ = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  let currentTheme = null;
  function applyTheme(theme) {
    currentTheme = theme;
    const t = theme ? Object.assign({}, theme, darkMQ && darkMQ.matches ? theme.dark : {}) : {};
    for (const [k, v] of Object.entries(THEME_VARS)) {
      if (t[k]) document.documentElement.style.setProperty(v, t[k]);
      else document.documentElement.style.removeProperty(v);
    }
  }
  if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener("change", () => { applyTheme(currentTheme); });

  // ---------- prizes ----------
  // Prizes come only from a game file's "prizes"; games without it are just for fun.
  const getPrizes = (game) => (game && game.prizes) || {};
  const hasPrizes = (p) => !!(p.firstBingo || p.extraBingo || p.blackout);
  const money = (n) => "$" + n;
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  // Each prize is paid as one ticket of that amount: first bingo, each extra bingo, blackout bonus.
  // A "bingo" is any completed line or four corners.
  function tally(wins, prizes) {
    const bingos = wins.filter((w) => w.kind === "line" || w.kind === "corners").length;
    const t = {};
    const add = (amt, n) => { if (amt && n > 0) t[amt] = (t[amt] || 0) + n; };
    if (bingos) { add(prizes.firstBingo, 1); add(prizes.extraBingo, bingos - 1); }
    if (wins.some((w) => w.kind === "blackout")) add(prizes.blackout, 1);
    return t;
  }
  const sum = (t) => Object.entries(t).reduce((a, [amt, n]) => a + amt * n, 0);
  const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  function ticketsText(t, prizes) {
    const kind = prizes.payWith || "ticket";
    return Object.entries(t).sort((a, b) => b[0] - a[0])
      .map(([amt, n]) => (NUM[n] || n) + " " + money(amt) + " " + kind + (n > 1 ? "s" : "")).join(" + ");
  }
  const diff = (after, before) => {
    const t = {};
    for (const [amt, n] of Object.entries(after)) if (n - (before[amt] || 0) > 0) t[amt] = n - (before[amt] || 0);
    return t;
  };

  // ---------- rules ----------
  async function showRules(slug) {
    document.title = "How to play · Football Bingo";
    let game = null;
    if (slug && /^[a-z0-9-]+$/.test(slug) && slug !== "generic") { try { game = await getJSON("games/" + slug + ".json"); } catch (e) { /* default prizes */ } }
    const prizes = getPrizes(game), paid = hasPrizes(prizes), movie = !!(game && game.kind === "movie");
    if (game && game.teamPicker) { const t = store.get("fbbingo:team:" + slug); if (game[t] && game[t].theme) applyTheme(game[t].theme); }
    const f = prizes.firstBingo, e = prizes.extraBingo, x = prizes.blackout, kind = prizes.payWith || "ticket";
    const li = (...kids) => el("li", null, ...kids);
    const strong = (t) => el("strong", null, t);
    render(
      el("h1", null, paid ? "📜 Rules & prizes" : "📜 How to play"),
      game ? el("p", { class: "muted" }, game.title + (game.kickoff ? " · " + game.kickoff : "")) : null,
      el("section", { class: "rules-page" },
        el("h2", null, "How to play"),
        el("ul", null,
          li("Everyone gets their own random card. ", strong("One card per person.")),
          li("Don't tap ", strong("New card"), movie ? " after the movie starts." : " after kickoff."),
          movie ? li("Tap a square when it happens in the movie, or in the room for the watch-party squares.")
                : li("Tap a square when it happens in the game or on the broadcast. That includes halftime and commercials."),
          li("Only mark what you actually see or hear. The free space in the middle counts for everyone."),
          li(movie ? "Squares count from the opening scene to the end credits." : "Squares count from kickoff to the final whistle.")),
        el("h2", null, "How to win"),
        el("ul", null,
          li(strong("Bingo:"), " any row, column or diagonal of 5. The free space counts."),
          li(strong("Four corners:"), " all four corner squares. This also counts as a bingo."),
          li(strong("Blackout:"), " every square on your card.")),
        paid ? el("h2", null, "Prizes") : null,
        paid ? el("ul", { class: "prizes" },
          f ? li(el("span", { class: "amt" }, money(f)), el("span", null, strong("Your card's first bingo"), el("br"), "One " + money(f) + " " + kind + ".")) : null,
          e ? li(el("span", { class: "amt" }, "+" + money(e)), el("span", null, strong("Every bingo after that"), el("br"), "One " + money(e) + " " + kind + " for each new line or four corners.")) : null,
          x ? li(el("span", { class: "amt" }, "+" + money(x)), el("span", null, strong("Blackout bonus"), el("br"), "One " + money(x) + " " + kind + ". It's a long shot!")) : null)
          : el("p", null, "No prizes for this game. Just bragging rights. The host has the final say on any disputed square."),
        paid ? el("h2", null, "Claiming") : null,
        paid ? el("ul", null,
          li("When the pop-up shows your prize, show your card to the host."),
          li("The host has the final say on any disputed square.")) : null),
      el("div", { class: "actions" },
        slug ? el("a", { class: "btn primary", href: "?game=" + encodeURIComponent(slug) }, "Back to my card") : null,
        el("a", { class: "btn", href: "?all" }, "All games"))
    );
    window.scrollTo(0, 0);
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

    render(
      el("h1", null, "🏈 Football Bingo"),
      el("p", { class: "muted" }, "Pick the game you're watching. Everyone gets their own random card. Tap squares as they happen."),
      el("ul", { class: "games" }, ...upcoming.map(item),
        el("li", null, el("a", { href: "?game=generic" },
          el("div", { class: "title" }, "Any game"), el("div", { class: "when" }, "General NFL squares only")))),
      el("p", null, el("a", { href: "?view=rules" }, "📜 How to play")),
      past.length ? el("h2", null, "Past games") : null,
      past.length ? el("ul", { class: "games" }, ...past.map(item)) : null
    );
  }

  // ---------- one game ----------
  function buildSquares(game, generic) {
    const specific = shuffle(uniq(game.squares));
    const gen = shuffle(uniq(generic).filter((s) => !specific.includes(s)));
    const n = Math.min(specific.length, game.specificPerCard ?? (game.generic === "none" ? PER_CARD : Math.round(PER_CARD * SPECIFIC_SHARE)));
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
    // Each win has its own id, so a second or third line counts as a new win.
    const cells = new Set(), wins = [];
    lines.forEach((line, n) => { if (line.every(on)) { wins.push({ id: "line" + n, kind: "line" }); line.forEach((i) => cells.add(i)); } });
    if (CORNERS.every(on)) { wins.push({ id: "corners", kind: "corners" }); CORNERS.forEach((i) => cells.add(i)); }
    if (marked.length >= PER_CARD) wins.push({ id: "blackout", kind: "blackout" });
    return { cells, wins };
  }

  async function showGame(slug) {
    if (slug !== "generic" && !/^[a-z0-9-]+$/.test(slug)) throw new Error("Unknown game");
    const game = slug === "generic" ? { title: "Any game", squares: [] } : await getJSON("games/" + slug + ".json");
    // "generic": "none" (e.g. a movie) uses only the game's own squares.
    const genericFile = game.generic === "college" ? "data/generic-college.json" : "data/generic.json";
    const generic = game.generic === "none" ? [] : await getJSON(genericFile);
    const prizes = getPrizes(game);
    const key = "fbbingo:" + CARD_VERSION + ":" + slug;
    let state = store.get(key);
    if (!state || !Array.isArray(state.squares) || state.squares.length !== PER_CARD) {
      state = { squares: buildSquares(game, generic), marked: [] };
      store.set(key, state);
    }
    const save = () => store.set(key, state);
    document.title = game.title + " Bingo";

    const away = game.away || {}, home = game.home || {};
    if (away.color) document.documentElement.style.setProperty("--away", away.color);
    if (home.color) document.documentElement.style.setProperty("--home", home.color);

    // Team picker: tap a team to color the card in its theme; no pick = grayscale.
    const picker = !!(game.teamPicker && away.theme && home.theme);
    const teamKey = "fbbingo:team:" + slug;
    let team = picker ? store.get(teamKey) : null;
    if (team !== "away" && team !== "home") team = null;
    const hint = el("p", { class: "team-hint" });
    const badge = (side, t) => picker
      ? el("button", { type: "button", class: "team " + side, "aria-pressed": "false", onclick: () => {
          team = team === side ? null : side; store.set(teamKey, team); paintTeam();
        } }, t.short || t.name)
      : el("span", { class: "team " + side }, t.short || t.name);
    const awayBadge = away.name ? badge("away", away) : null, homeBadge = home.name ? badge("home", home) : null;
    function paintTeam() {
      if (!picker) return;
      applyTheme(team ? game[team].theme : null);
      for (const [b, side] of [[awayBadge, "away"], [homeBadge, "home"]]) {
        b.classList.toggle("picked", team === side);
        b.classList.toggle("dim", !!team && team !== side);
        b.setAttribute("aria-pressed", team === side ? "true" : "false");
      }
      hint.textContent = team ? "Go " + game[team].short + "! Tap again to go back to gray." : "Tap your team to color your card.";
    }
    const header = away.name && home.name
      ? el("div", { class: "matchup" + (picker ? " pickable" : "") }, awayBadge, el("span", { class: "at" }, "at"), homeBadge)
      : el("h1", { style: "text-align:center" }, game.title);


    const card = el("div", { class: "card" });
    const cells = [];
    let prevIds = new Set(checkWins(state.marked).wins.map((w) => w.id));
    const winCount = el("span", { class: "win-count" });
    const rulesHref = "?view=rules&game=" + encodeURIComponent(slug);

    function refresh(fromTap) {
      const { cells: winCells, wins } = checkWins(state.marked);
      cells.forEach((c, i) => {
        if (i === FREE) return;
        c.classList.toggle("marked", state.marked.includes(i));
        c.classList.toggle("win", winCells.has(i));
        c.setAttribute("aria-pressed", state.marked.includes(i) ? "true" : "false");
      });
      const total = wins.length;
      card.classList.toggle("bingo", total > 0);
      card.classList.toggle("blackout", wins.some((w) => w.kind === "blackout"));
      const won = sum(tally(wins, prizes));
      const bingos = wins.filter((w) => w.kind !== "blackout").length;
      winCount.textContent = total ? (won ? "💵 " + money(won) + " won · " : "🏆 ") + bingos + (bingos === 1 ? " bingo" : " bingos") + (bingos < total ? " + blackout" : "") : "";
      // Pop up for every new win this tap created, with what it pays.
      const fresh = wins.filter((w) => !prevIds.has(w.id));
      const prev = wins.filter((w) => prevIds.has(w.id));
      if (fromTap && fresh.length) celebrate(fresh, diff(tally(wins, prizes), tally(prev, prizes)), won);
      prevIds = new Set(wins.map((w) => w.id));
    }

    function celebrate(fresh, newTickets, totalMoney) {
      const kinds = fresh.map((w) => w.kind);
      const lines = kinds.filter((k) => k === "line").length;
      const newMoney = sum(newTickets);
      let title, sub;
      if (kinds.includes("blackout")) title = "BLACKOUT! 🏆";
      else title = (kinds.includes("corners") && !lines ? "FOUR CORNERS" : (MULTI[fresh.length] ?? fresh.length + "X ") + "BINGO") + "! 🎉";
      if (newMoney > 0) {
        sub = "That's " + ticketsText(newTickets, prizes) + ". Show your card to the host to collect." +
          (totalMoney > newMoney ? " This card has won " + money(totalMoney) + " in all." : "");
      } else {
        sub = "Nice! Show your card to the room.";
      }
      const prizeEl = banner.querySelector(".banner-prize");
      prizeEl.textContent = newMoney > 0 ? "You won " + money(newMoney) + "!" : "";
      prizeEl.hidden = !(newMoney > 0);
      banner.querySelector(".banner-title").textContent = title;
      banner.querySelector(".banner-sub").textContent = sub;
      banner.hidden = false;
      if (navigator.vibrate) navigator.vibrate(kinds.includes("blackout") ? [200, 80, 200, 80, 400] : [120, 60, 120]);
    }

    const grid = el("div", { class: "grid" });
    let sq = 0;
    for (let i = 0; i < SIZE * SIZE; i++) {
      let cell;
      if (i === FREE) {
        cell = el("div", { class: "cell free" }, game.free || "FREE 🏈");
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
      el("div", { class: "card-foot" }, winCount, el("span", null, game.title)));

    const shareBtn = el("button", { type: "button", onclick: () => showQR(game) }, "📱 Share QR code");

    render(
      header,
      el("p", { class: "subtitle" }, fmtDate(game.date, game.kickoff) || "Tap a square when it happens"),
      picker ? hint : null,
      card,
      el("p", { class: "rules" },
        prizes.firstBingo ? "First bingo " + money(prizes.firstBingo) + (prizes.extraBingo ? " · Each extra +" + money(prizes.extraBingo) : "") + (prizes.blackout ? " · Blackout +" + money(prizes.blackout) : "") + " · "
                     : "Any line, four corners or blackout · ",
        el("a", { href: rulesHref }, "Rules")),
      el("div", { class: "actions" },
        el("button", { type: "button", class: "primary", onclick: () => {
          if (!confirm("Get a brand-new card? Your marks on this one will be lost.")) return;
          state.squares = buildSquares(game, generic); state.marked = []; save(); showGame(slug);
        } }, "New card"),
        el("button", { type: "button", onclick: () => {
          if (!state.marked.length || !confirm("Clear all your marks?")) return;
          state.marked = []; save(); refresh(false);
        } }, "Clear marks"),
        el("a", { class: "btn", href: rulesHref }, hasPrizes(prizes) ? "📜 Rules & prizes" : "📜 How to play"),
        shareBtn,
        el("a", { class: "btn wide", href: "?all" }, "All games"))
    );
    refresh(false);
    paintTeam();
    keepAwake();
  }

  // Share: pop up a QR code of this game's link for friends to scan.
  function showQR(game) {
    const qrBox = document.getElementById("qr");
    const slug = new URLSearchParams(location.search).get("game");
    const url = location.origin + location.pathname + (slug ? "?game=" + encodeURIComponent(slug) : "");
    qrBox.querySelector(".qr-sub").textContent = game.title;
    qrBox.querySelector(".qr-url").textContent = url.replace(/^https?:\/\//, "");
    const holder = qrBox.querySelector(".qr-code");
    try {
      const qr = qrcode(0, "M");
      qr.addData(url); qr.make();
      holder.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    } catch (e) {
      holder.textContent = "Couldn't make a QR code. Share the link below instead.";
    }
    qrBox.hidden = false;
  }
  document.getElementById("qr-close").addEventListener("click", () => { document.getElementById("qr").hidden = true; });
  document.getElementById("qr").addEventListener("click", (e) => { if (e.target.id === "qr") e.currentTarget.hidden = true; });

  // Keep the screen on while the card is open (supported browsers only).
  let lock = null;
  async function keepAwake() {
    try { if ("wakeLock" in navigator && !lock) { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => { lock = null; }); } } catch (e) { /* not allowed */ }
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && /[?&]game=/.test(location.search)) keepAwake(); });

  store.del("fbbingo:name"); // earlier versions saved a player name; remove it

  document.getElementById("banner-close").addEventListener("click", () => { banner.hidden = true; });

  const params = new URLSearchParams(location.search);
  async function start() {
    const slug = params.get("game");
    if (params.get("view") === "rules") return showRules(slug);
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
    render(el("p", { class: "error" }, "Couldn't load that game. "), el("p", { style: "text-align:center" }, el("a", { href: "?all" }, "See all games")));
    console.error(e);
  });
})();
