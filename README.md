# cEDH Stream Tool

A real-time, multi-operator stream overlay tool for casting competitive EDH (cEDH) Magic: The Gathering tournaments. Casters search for MTG cards, drag them onto a shared stream overlay, draw annotations, and spotlight cards — all rendering live on the OBS overlay.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v10+)
- [Vite+](https://viteplus.dev/) CLI installed globally:
  ```bash
  curl -fsSL https://vite.plus | bash
  ```

### Install & Run

```bash
pnpm install
pnpm dev
```

This starts both the Vite dev server (port 5173) and the Socket.IO backend (port 3000).

### Open the App

| URL | Purpose |
|-----|---------|
| `http://localhost:5173/caster/` | Caster workstation — search cards, draw annotations, place cards |
| `http://localhost:5173/control/` | Producer panel — manage overlay, override casters |
| `http://localhost:5173/overlay/` | OBS browser source — transparent 1920x1080 overlay |

## Roles

### Caster

Open `/caster/` on each caster's laptop. From here you can:

- **Search cards** — type in the sidebar search box (or press `/` to focus it). Results come from Scryfall. Drag a card onto the canvas or click `+` to add it.
- **Draw annotations** — switch tools with the toolbar or keyboard shortcuts:
  - `V` Select/move
  - `P` Pen (freehand)
  - `A` Arrow
  - `C` Circle
  - `X` Clear all drawings
  - `Ctrl+Z` / `Cmd+Z` Undo last drawing
- **Spotlight a card** — double-click a card on the canvas, or click the `◉` button in search results / bottom strip.
- **Remove a card** — right-click it on the canvas, or click `×` in the bottom strip.
- **Load a decklist** — paste a Scrollrack-format decklist in the Deck tab and click Load.
- **Connect to a tournament** — open Settings (gear icon), enter your TopDeck.gg API key and tournament ID, then browse players/decklists in the Tournament tab.

Drawings auto-fade after 6 seconds.

### Producer

Open `/control/` on the streaming PC. Same card management as the caster (search, drag, spotlight, remove) but without drawing tools. The producer has final authority over what appears on the overlay.

### OBS Overlay

Add `/overlay/` as a **Browser Source** in OBS:

1. Add Source > Browser
2. URL: `http://localhost:5173/overlay/`
3. Width: `1920`, Height: `1080`
4. Check **"Shutdown source when not visible"** is **off**
5. The background is transparent — layer it over your game camera feed

A small connection dot appears in the top-right corner (green = connected, red = disconnected). It won't be visible on stream.

## Room Isolation

Append `?room=<name>` to any URL to create independent overlay sessions:

```
http://localhost:5173/caster/?room=feature-match
http://localhost:5173/overlay/?room=feature-match
```

All clients in the same room share state. Default room is `default`.

## Settings

Click the gear icon in the caster or producer toolbar to configure:

- **TopDeck.gg API Key** — required for tournament integration. Get one at [topdeck.gg/account](https://topdeck.gg/account).
- **Tournament ID** — the TopDeck.gg tournament identifier.
API key is saved to `localStorage`. The video feed is handled automatically via WebRTC — see Tournament Day Setup below.

## Tournament Day Setup

All devices (producer + casters) must be on the same WiFi network. The producer's laptop runs the server; everyone else connects to it.

### 1. Build & start the server on the producer's laptop

```bash
pnpm build
pnpm start
```

The server listens on port 3000 (or set `PORT` env var).

### 2. Find the producer's local IP

- **macOS**: System Settings > Wi-Fi > Details > IP Address (or `ipconfig getifaddr en0`)
- **Windows**: `ipconfig` in terminal, look for IPv4 Address
- Example: `192.168.1.50`

### 3. Connect all devices

| Device | URL |
|--------|-----|
| **OBS** (producer laptop) | Add Browser Source: `http://localhost:3000/overlay/` — 1920x1080, transparent bg |
| **Producer** (same laptop) | Open in browser: `http://localhost:3000/control/` |
| **Caster 1** (their laptop) | Open in browser: `http://192.168.1.50:3000/caster/` |
| **Caster 2** (their laptop) | Open in browser: `http://192.168.1.50:3000/caster/` |

Replace `192.168.1.50` with the producer's actual IP.

### 4. Live video feed for casters (optional)

Casters can see the producer's OBS output as the canvas background so annotations align with the stream. No extra software needed — uses OBS Virtual Camera.

1. In OBS on the producer's laptop: click **Start Virtual Camera** (this runs alongside YouTube/Twitch streaming with no conflict)
2. On the producer's `/control/` page: click **Start Camera** in the toolbar, select "OBS Virtual Camera" from the browser's device picker
3. Casters automatically receive the video feed — no configuration needed on their end

The checkerboard background is replaced with the live game camera feed (~200-500ms latency via WebRTC). If the producer hasn't started the camera, casters just see the checkerboard — everything else works fine.

### 5. Verify

All clients should show a green connection dot. Cards added by any caster appear on the overlay in OBS immediately.

### Troubleshooting

- **Can't connect from caster laptops** — check firewall on the producer's laptop, ensure port 3000 is allowed
- **OBS overlay not updating** — make sure the Browser Source URL uses `localhost` (not the network IP) and "Shutdown source when not visible" is off
- **High latency on annotations** — all communication is WebSocket-based and should be <50ms on local WiFi

## Production Build

```bash
pnpm build
pnpm start
```

In production, the Express server serves all routes on the configured port (default `3000`, or set `PORT` env var).

## Desktop App (Electron)

For non-technical production teams, the app is packaged as a standalone desktop application. The producer double-clicks the app — no terminal, no install steps.

### Build the desktop app

```bash
pnpm electron:build
```

This produces:
- `release/cEDH Stream Tool.dmg` — macOS
- `release/cEDH Stream Tool Setup.exe` — Windows

### How it works

1. Producer opens the app
2. The Express + Socket.IO server starts automatically inside the app
3. A gold banner at the top shows the caster URL and OBS overlay URL
4. Casters open the displayed URL in their browser — no install needed on their end

### Development

```bash
pnpm electron:dev
```

Builds the frontend and launches the Electron app.

## Tech Stack

- React 19 + TypeScript
- Vite+ (dev server & build)
- Tailwind CSS v4 + shadcn/ui
- Express + Socket.IO (real-time sync)
- Scryfall API (card data & images)
- Scrollrack API (decklist validation)
- TopDeck.gg API (tournament data, proxied through server)
