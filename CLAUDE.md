# Football Bingo

Static site (no build step) served by GitHub Pages from `main`:
https://courthaupt.github.io/football-bingo/

Friends open it on their phones, pick a game, and each get their own random card
(saved in their browser's localStorage). Pushing to `main` publishes changes in about a minute.

## Files
- `index.html`, `style.css`, `app.js`: the app
- `data/generic.json`: general NFL squares used to fill out every card
- `data/generic-college.json`: general college squares (a game opts in with `"generic": "college"`)
- `data/prizes.json`: prize amounts (first bingo, each extra bingo, blackout) paid as scratch-offs. A game can override it with `"prizes"`
- `games/index.json`: the list of games shown on the home page
- `games/<slug>.json`: one file per game, with that matchup's own squares
- `scripts/validate.js`: run `node scripts/validate.js` before every commit

## Adding a game (the usual request)
When the user names a game ("make bingo for Chiefs at Bills Sunday"):

1. **Research it first. Don't trust memory, since rosters change every week.** Web search for the
   current starting QBs, top skill players, star defenders, head coaches, kickers, injury
   report, broadcast network and announcers, stadium, weather, and the week's storylines
   (streaks, rivalries, revenge games, milestone chases). Confirm the date and kickoff time.
2. **Slug**: `YYYY-MM-DD-<away>-at-<home>` with team nicknames, e.g. `2026-11-08-chiefs-at-bills`.
3. **Write `games/<slug>.json`:**
   ```json
   {
     "title": "Chiefs at Bills",
     "date": "2026-11-08",
     "kickoff": "4:25 PM ET · CBS",
     "away": { "name": "Kansas City Chiefs", "short": "Chiefs", "color": "#E31837" },
     "home": { "name": "Buffalo Bills", "short": "Bills", "color": "#00338D" },
     "squares": ["Mahomes rushing TD", "..."]
   }
   ```
   Use the team's primary color, a dark one that's readable with white text on it.
   Optional fields: `"generic": "college"` for college games (uses `data/generic-college.json`),
   and `"specificPerCard": N` to override how many game squares each card gets.
4. **Squares**: write 25–35 game-specific ones. Cards are 30% matchup / 70% generic: each card
   draws 7 game squares and 17 generic ones (including commercial squares), so friends' cards differ. Rules:
   - At most 32 characters. Shorter is better, since cells are small on phones. Use last names.
   - Split them roughly evenly between the two teams, plus some broadcast/storyline squares
     (announcer mentions X, shot of a celebrity fan, stat graphic about a streak).
   - Aim for things that *might* happen (about 25–60% likely). Avoid sure things
     ("Kickoff happens") and long shots ("QB catches a TD").
   - It must be clear to everyone watching when a square happens.
   - No squares about a specific player getting hurt, and nothing mean.
   - Don't repeat a square from the generic list the game uses.
5. Add `{ "slug", "title", "date", "kickoff" }` to `games/index.json`. If the user wants the site
   to be just this game, add `"featured": true` (and remove it from any other game). The home
   page then opens that game directly, and `?all` still shows the full list.
6. Run `node scripts/validate.js`, commit, and push to `main`.
7. Give the user the share link: `https://courthaupt.github.io/football-bingo/?game=<slug>`
   and a few sample squares.

## Winning
Any row, column or diagonal, four corners, or blackout (all 24 squares). Every new win gets its own
pop-up (each extra line counts), and the card shows a running win count. If a change to card building should reset everyone's cards,
bump `CARD_VERSION` in `app.js`.

## Prizes
A card's first bingo (any line or four corners) pays `firstBingo`, each bingo after that pays
`extraBingo`, and a blackout adds `blackout`. Each prize is one ticket of that amount
(`payWith`, e.g. scratch-off). Amounts live in `data/prizes.json`. The rules page (`?view=rules&game=<slug>`) and the win pop-ups read from it.

## Caching
GitHub Pages lets browsers cache files for up to 10 minutes. When you change `app.js` or
`style.css`, bump the `?v=` value on both in `index.html` (use the current date and time,
YYYYMMDDHHMM) so phones load matching files. Game JSON is fetched with `no-cache` and
doesn't need this.

## Testing locally
`fetch` doesn't work over `file://`. Run `python3 -m http.server 8000` in the repo and open
http://localhost:8000/.
