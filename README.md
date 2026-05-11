<img width="2418" height="1544" alt="guide" src="https://github.com/user-attachments/assets/f8b65739-39c6-47d5-941c-da6c02dd8df9" />

# cEDH Stream Tool

A real-time, multi-operator stream overlay tool for casting competitive EDH (cEDH) Magic: The Gathering tournaments. Casters search for MTG cards, drag them onto a shared stream overlay, draw annotations, and spotlight cards, all rendering live on the OBS overlay.

## Download

Grab the latest macOS (arm64) or Windows (x64) build from the **[Releases page](https://github.com/zethussuen/edh-stream-tool/releases/latest)**.

Builds are unsigned, so the first launch shows a Gatekeeper / SmartScreen warning:
- **macOS:** right-click the app, choose **Open**, then confirm. Only needed on the first launch.
- **Windows:** click **More info** then **Run anyway** on the SmartScreen prompt.

## Setup (Tournament Day)

### 1. Producer: open the app

Download and launch **cEDH Stream Tool** on the producer's laptop. The app starts its own server automatically, no terminal needed.

Click the **URLs** button in the top-right of the producer panel to see connection links. The popover lists:
- **Casters** for the caster workstations
- **All Overlays** and the individual layer URLs (Spotlight, Player Names, Cards + Drawings, Decklist, Focused Card) for OBS Browser Sources

Each row has a Copy button. Casters on other machines should use the LAN address (e.g. `http://192.168.1.50:3000/caster/`); OBS on the producer machine should use `localhost`.

### 2. Casters: open the caster page

Each caster opens the **Casters** URL in a browser on their own laptop. No install needed. Both casters connect to the same session automatically.

### 3. Producer: set up OBS

Add overlay layers as **Browser Sources** in OBS (1920×1080, transparent background, "Shutdown source when not visible" off).

**Option A: Single combined overlay.** One Browser Source covers everything:

| Source | URL | Size |
|--------|-----|------|
| Overlay | `http://localhost:3000/overlay/` | 1920×1080 |

**Option B: Separate layers.** Recommended for advanced OBS setups with independent visibility/transitions:

| Layer | URL | Size | What it shows |
|-------|-----|------|---------------|
| Spotlight | `http://localhost:3000/spotlight/` | 1920×1080 | Full-screen card spotlight |
| Name Plates | `http://localhost:3000/nameplates/` | 1920×1080 | 4-corner player name plates |
| Annotations | `http://localhost:3000/annotations/` | 1920×1080 | Cards on canvas + drawings |
| Decklist | `http://localhost:3000/decklist/` | 1920×1080 | Player decklist (text view) |
| Focused Card | `http://localhost:3000/focused-card/` | 672×936 | Single card graphic insert |

All overlay URLs are fully transparent. Layer them over your game camera feed.

### 4. (Optional) Live video feed for casters

Casters can see the producer's OBS output as the canvas background so annotations align with the stream.

1. In OBS: click **Start Virtual Camera**
2. In the producer panel (`/control/`): click **Start Camera** in the toolbar, then select "OBS Virtual Camera" from the browser's device picker
3. Casters automatically receive the live feed. No setup on their end.

The checkerboard background is replaced with the live game camera (~200-500ms latency via WebRTC). If the producer hasn't started the camera, everything else still works fine.

### 5. Connect TopDeck.gg (optional)

Click the gear icon and enter:
- **TopDeck.gg API Key**: get one free at [topdeck.gg/account](https://topdeck.gg/account)
- **Tournament ID**: the TID from your tournament page

This unlocks the Deck and Tournament tabs, which pull live standings, pairings, and player decklists directly from TopDeck.gg (requires staff/owner access to the tournament for decklists).

---

## What each role does

### Caster

Open `/caster/` on your laptop. From here you can:

- **Search cards**: type in the sidebar search box (or press `/`). Drag a card onto the canvas or click `+` to add it to the overlay.
- **Focus a card**: click the picture-frame icon next to a card to send it to the Focused Card overlay source (672×936 insert).
- **Draw annotations**: switch tools with the toolbar or keyboard shortcuts:
  - `V` Select/move
  - `P` Pen (freehand, stays until cleared)
  - `A` Arrow (auto-fades after ~8 seconds)
  - `C` Circle (stays until cleared)
  - `X` Clear all drawings
  - `Ctrl+Z` Undo last drawing
- **Spotlight a card**: double-click a card on the canvas, or click the spotlight icon in search results. Clear spotlight with `Escape`.
- **Remove a card**: right-click it on the canvas, or click the remove icon in the bottom strip.
- **Browse tournament decklists**: click a player in the Deck tab to see their full 99-card deck with drag/add/spotlight/focus actions.
- **Filter decklists**: Scryfall-like syntax such as `t:instant mv<=2`, `o:"draw"`, `c:u`, `-t:land`, `(c:u or c:g)`. Group by section or type, sort by name or mana value.
- **Show decklist on overlay**: after loading a player's deck, click "Show Decklist on Overlay" to push it to the `/decklist/` browser source.
- **Set stream pod**: in the Tournament tab, click "Set as Stream Pod" on a table. Highlights those players in the Deck tab and renders name plates on the overlay. Each pod shows a status badge (`● Live` for active, `✓ Done` for completed, `Pending`/`Bye`) so you can see at a glance which tables are still playing.

Arrows auto-fade after about 8 seconds. Pen and circle drawings stay on screen until cleared with `X`, `Ctrl+Z`, or the clear button.

### Producer

Open `/control/` on the producer laptop. Same card management as the caster (search, drag, spotlight, remove, decklist) but without drawing tools. The producer has final authority over what appears on the overlay.

---

## Room Isolation

Append `?room=<name>` to any URL to run independent overlay sessions (e.g. two feature matches at once):

```
http://192.168.1.50:3000/caster/?room=feature-a
http://localhost:3000/overlay/?room=feature-a
```

All clients in the same room share state. Default room is `default`.

---

## OBS Text Source files (Windows & macOS)

The app writes plain `.txt` files you can use as OBS Text Sources for lower-thirds and scoreboards. Files are created at startup (empty) and updated live as tournament data changes.

**Location:** `Documents/cEDH Stream Tool/` (open via **Help → Reveal OBS Files** in the menu bar)

| File | Contents |
|------|----------|
| `tournament_name.txt` | Tournament name |
| `round.txt` | Current round number |
| `table.txt` | Feature table number |
| `match_status.txt` | Table status (Active / Completed / Pending) |
| `player1_name.txt` ... `player4_name.txt` | Player names (seats 1-4) |
| `player1_commander.txt` ... `player4_commander.txt` | Commander names |
| `player1_standing.txt` ... `player4_standing.txt` | Current standings |
| `player1_record.txt` ... `player4_record.txt` | W-L-D records |

For non-default rooms, files are written to a subfolder: `Documents/cEDH Stream Tool/<room-name>/`.

---

## Troubleshooting

- **Casters can't connect**: check the firewall on the producer's laptop. Port 3000 must be reachable on the local network.
- **OBS overlay not updating**: ensure the Browser Source URL uses `localhost` (not the network IP) and "Shutdown source when not visible" is off.
- **Decklists not showing**: TopDeck.gg requires the tournament organizer to enable "Show Decks", or the tournament must have ended.
- **No Virtual Camera option**: make sure OBS has started Virtual Camera before clicking "Start Camera" in the producer panel.
- **"Reveal OBS Files" opens nothing**: fixed in v0.3.0. Update to the latest release.

---

## For Developers

```bash
pnpm install
pnpm dev          # Vite dev server (5173) + Express server (3000)
pnpm build        # Production build
pnpm start        # Serve production build on port 3000
vp check          # Lint + type-check

pnpm electron:dev    # Build + launch Electron app
pnpm electron:build  # Package .dmg (macOS) + .exe (Windows)
```

Create `.env.local` with `TOPDECK_API_KEY=your-key` to set a server-side fallback API key.

### Cutting a release

GitHub Actions builds macOS (arm64) + Windows (x64) zips and publishes them to the Releases page whenever a `v*.*.*` tag is pushed.

```bash
# 1. Bump version in package.json (e.g. 0.4.1 -> 0.4.2)
# 2. Commit
git commit -am "v0.4.2"

# 3. Tag + push
git tag v0.4.2
git push origin main --tags
```

The workflow at [`.github/workflows/release.yml`](.github/workflows/release.yml) takes about 10 minutes. Auto-generated release notes are filled in from commit messages since the previous tag. Edit them on the Release page after the run completes.

## Tech Stack

- React 19 + TypeScript + Vite+
- Tailwind CSS v4 + shadcn/ui
- Express + Socket.IO (real-time sync)
- Scryfall API (card data + images)
- Scrollrack API (decklist validation)
- TopDeck.gg API v2 (tournament data, proxied through server)
- Electron + electron-builder (desktop distribution)

## License

[MIT](LICENSE) © eldrazi.dev. Free to use, modify, and distribute. Keep the copyright notice in copies and substantial portions.

## Data provided by

[TopDeck.gg](https://topdeck.gg) | [Scryfall](https://scryfall.com)
