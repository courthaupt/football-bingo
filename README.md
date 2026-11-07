# Football Bingo 🏈

Phone-friendly bingo cards for watching NFL games with friends.

**Play:** https://courthaupt.github.io/football-bingo/

- Pick the game you're watching. Every person gets their own random card.
- About 30% of each card is about that matchup (players, coaches, storylines). The other 70% is general football and TV-commercial squares.
- Tap a square when it happens. Win with any row, column or diagonal, all four corners, or a blackout (the whole card).
- Your card and marks stay on your phone if you refresh or lock the screen.

## Adding a game
Ask Claude, e.g. "make a bingo game for Eagles at Cowboys on Sunday". The steps it follows are in [`CLAUDE.md`](CLAUDE.md).
Or add it yourself: create `games/<slug>.json`, list it in `games/index.json`, and run `node scripts/validate.js`.

## Hosting
GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.
