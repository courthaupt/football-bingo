#!/usr/bin/env node
// Checks data/generic.json, games/index.json and every games/<slug>.json.
// Run: node scripts/validate.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const MAX_LEN = 32;
let errors = 0;
const fail = (msg) => { errors++; console.error("✗ " + msg); };
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(root, p), "utf8")); } catch (e) { fail(p + ": " + e.message); return null; } };

function checkSquares(where, list, min) {
  if (!Array.isArray(list)) return fail(where + ": squares must be an array");
  if (list.length < min) fail(where + ": needs at least " + min + " squares (has " + list.length + ")");
  const seen = new Set();
  for (const s of list) {
    if (typeof s !== "string" || !s.trim()) { fail(where + ": empty or non-string square"); continue; }
    if (s.length > MAX_LEN) fail(where + ": too long (" + s.length + " > " + MAX_LEN + "): " + s);
    const k = s.trim().toLowerCase();
    if (seen.has(k)) fail(where + ": duplicate square: " + s);
    seen.add(k);
  }
}

const generic = read("data/generic.json");
if (generic) checkSquares("data/generic.json", generic, 24);

const index = read("games/index.json") || [];
const slugs = new Set();
for (const g of index) {
  const where = "games/index.json[" + (g && g.slug) + "]";
  if (!g || !/^[a-z0-9-]+$/.test(g.slug || "")) { fail(where + ": slug must be lowercase letters, numbers, dashes"); continue; }
  if (slugs.has(g.slug)) fail(where + ": duplicate slug");
  slugs.add(g.slug);
  if (!g.title) fail(where + ": missing title");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.date || "")) fail(where + ": date must be YYYY-MM-DD");
  const file = "games/" + g.slug + ".json";
  if (!fs.existsSync(path.join(root, file))) { fail(where + ": missing " + file); continue; }
  const game = read(file);
  if (!game) continue;
  if (game.title !== g.title || game.date !== g.date) fail(file + ": title/date don't match games/index.json");
  for (const side of ["away", "home"]) {
    const t = game[side];
    if (!t || !t.name || !t.short) fail(file + ": " + side + " needs name and short");
    else if (t.color && !/^#[0-9a-fA-F]{6}$/.test(t.color)) fail(file + ": " + side + ".color must be #rrggbb");
  }
  checkSquares(file, game.squares, 20);
}
for (const f of fs.readdirSync(path.join(root, "games"))) {
  if (f !== "index.json" && f.endsWith(".json") && !slugs.has(f.replace(/\.json$/, ""))) fail("games/" + f + " is not listed in games/index.json");
}

if (errors) { console.error("\n" + errors + " problem(s)"); process.exit(1); }
console.log("✓ All good: " + index.length + " game(s), " + (generic || []).length + " generic squares");
