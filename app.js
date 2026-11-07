(function () {
  const $ = (id) => document.getElementById(id);
  const presetEl = $("preset"), countEl = $("count"), freeEl = $("free");
  const squaresEl = $("squares"), cardsEl = $("cards");
  const LETTERS = ["B", "I", "N", "G", "O"];

  function loadPreset() {
    squaresEl.value = window.SQUARE_SETS[presetEl.value].join("\n");
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getSquares() {
    return [...new Set(squaresEl.value.split("\n").map((s) => s.trim()).filter(Boolean))];
  }

  // Returns true if any row, column or diagonal is fully marked.
  function hasBingo(cells) {
    const m = cells.map((c) => c.classList.contains("marked") || c.classList.contains("free"));
    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push([0, 1, 2, 3, 4].map((k) => i * 5 + k));
      lines.push([0, 1, 2, 3, 4].map((k) => k * 5 + i));
    }
    lines.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
    return lines.some((line) => line.every((idx) => m[idx]));
  }

  function makeCard(n, squares, useFree) {
    const needed = useFree ? 24 : 25;
    const picks = shuffle(squares).slice(0, needed);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = "<h2>" + LETTERS.map((l) => "<span>" + l + "</span>").join("") + "</h2>";
    const grid = document.createElement("div");
    grid.className = "grid";
    const cells = [];
    for (let i = 0; i < 25; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (useFree && i === 12) {
        cell.classList.add("free");
        cell.textContent = "FREE 🏈";
      } else {
        cell.textContent = picks.shift();
        cell.addEventListener("click", () => {
          cell.classList.toggle("marked");
          card.classList.toggle("bingo", hasBingo(cells));
        });
      }
      cells.push(cell);
      grid.appendChild(cell);
    }
    card.appendChild(grid);
    const num = document.createElement("div");
    num.className = "num";
    num.textContent = "Card #" + n;
    card.appendChild(num);
    return card;
  }

  function generate() {
    const squares = getSquares();
    const useFree = freeEl.checked;
    const needed = useFree ? 24 : 25;
    if (squares.length < needed) {
      alert("You need at least " + needed + " unique squares (you have " + squares.length + ").");
      return;
    }
    const count = Math.max(1, Math.min(100, parseInt(countEl.value, 10) || 1));
    cardsEl.innerHTML = "";
    for (let n = 1; n <= count; n++) cardsEl.appendChild(makeCard(n, squares, useFree));
  }

  presetEl.addEventListener("change", () => { loadPreset(); generate(); });
  $("generate").addEventListener("click", generate);
  $("clear").addEventListener("click", () => {
    document.querySelectorAll(".cell.marked").forEach((c) => c.classList.remove("marked"));
    document.querySelectorAll(".card.bingo").forEach((c) => c.classList.remove("bingo"));
  });
  $("print").addEventListener("click", () => window.print());

  loadPreset();
  generate();
})();
