# Football Bingo

Static site (no build step) served by GitHub Pages from `main`:
https://courthaupt.github.io/football-bingo/

Friends open it on their phones, pick a game, and each get their own random card
(saved in their browser's localStorage). Pushing to `main` publishes changes in about a minute.

## Files
- `index.html`, `style.css`, `app.js`: the app
- `data/generic.json`: general NFL squares used to fill out every card
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
4. **Squares**: write 28–36 game-specific ones. Each card draws 14 of them plus 10 generic ones,
   so friends' cards differ. Rules:
   - At most 32 characters. Shorter is better, since cells are small on phones. Use last names.
   - Split them roughly evenly between the two teams, plus some broadcast/storyline squares
     (announcer mentions X, shot of a celebrity fan, stat graphic about a streak).
   - Aim for things that *might* happen (about 25–60% likely). Avoid sure things
     ("Kickoff happens") and long shots ("QB catches a TD").
   - It must be clear to everyone watching when a square happens.
   - No squares about a specific player getting hurt, and nothing mean.
   - Don't repeat a square from `data/generic.json`.
5. Add `{ "slug", "title", "date", "kickoff" }` to `games/index.json`.
6. Run `node scripts/validate.js`, commit, and push to `main`.
7. Give the user the share link: `https://courthaupt.github.io/football-bingo/?game=<slug>`
   and a few sample squares.

## Testing locally
`fetch` doesn't work over `file://`. Run `python3 -m http.server 8000` in the repo and open
http://localhost:8000/.
