# Football Bingo 🏈

Phone-friendly bingo cards for watching NFL games with friends.

**Play:** https://courthaupt.github.io/football-bingo/

- Pick the game you're watching. Every person gets their own random card.
- Each game has its own squares about that matchup (players, coaches, storylines), mixed with general NFL squares.
- Tap a square when it happens. Get 5 in a row (across, down or diagonal) for BINGO.
- Your card and marks stay on your phone if you refresh or lock the screen.

## Adding a game
Ask Claude, e.g. "make a bingo game for Eagles at Cowboys on Sunday". The steps it follows are in [`CLAUDE.md`](CLAUDE.md).
Or add it yourself: create `games/<slug>.json`, list it in `games/index.json`, and run `node scripts/validate.js`.

## Hosting
GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.
