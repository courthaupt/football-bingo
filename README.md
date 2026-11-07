# Football Bingo

Random, printable bingo cards for watching football games. It's a static site with no build step and no dependencies.

## Use it

Open `index.html` in a browser, or host the folder on GitHub Pages (Settings → Pages → deploy from the `main` branch).

- Pick a square set: **American football (NFL)** or **Soccer**.
- Choose how many cards to make. Each card is shuffled separately.
- Tap squares as things happen. A card lights up when it gets a row, column or diagonal.
- **Print** puts two cards on each page.
- Use **Edit squares** to add your own (one per line, at least 24 with the free space).

## Files

- `index.html`: page layout and styles
- `app.js`: card generation, marking and bingo detection
- `squares.js`: default square lists (edit these to change the defaults)
