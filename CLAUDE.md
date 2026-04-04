# CLAUDE.md — cEDH Stream Tool

## Project Overview

A real-time, multi-operator stream overlay tool for casting competitive EDH (cEDH) Magic: The Gathering tournaments. Casters on separate laptops search for MTG cards, drag them onto a shared stream overlay, draw annotations (circles, arrows, freehand), and spotlight cards — all rendering live on the OBS stream overlay running on a producer's machine.

## Users & Roles

- **Casters (2)**: At the stream table with their own laptops. Open `/caster` in a browser. They search for cards, place/move them on the overlay, draw annotations, and trigger spotlight mode. They watch the game and commentate — the tool needs to be fast and low-friction.
- **Producer (1)**: At the streaming PC running OBS with a Stream Deck. Opens `/control` in a browser for overlay management (clear cards, reposition, override anything casters do). Has final authority over what's on screen.
- **OBS Overlay**: The producer's OBS loads `/overlay` as a 1920×1080 transparent browser source layered over the game camera feed. This is what viewers see.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Toolchain**: Vite+ (https://viteplus.dev/) — unified dev/build/check/test via `vp` CLI
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Fonts**: `Bebas Neue` (headings/brand), `JetBrains Mono` (body/UI) via Google Fonts
- **Server**: Node.js + Express + Socket.IO
- **Card Data**: Scryfall REST API (called from browser, not proxied through server)
- **Deck Validation**: Scrollrack API (https://scrollrack.topdeck.gg/api/validate)
- **Real-time Transport**: Socket.IO (WebSocket with auto-reconnect, room support)

## Architecture

```
Caster Laptops ──► WebSocket ──► Node.js Server ──► WebSocket ──► OBS Browser Source
     /caster                     (Express +                        /overlay
                                  Socket.IO)
Producer PC ────► WebSocket ──►      ▲
     /control                        │
                              Canonical state
                              lives on server
```

All state mutations go through the server. The server holds the canonical state (cards, spotlight, settings) and broadcasts diffs to all connected clients. Drawings are relay-only (no server persistence) — the server just forwards draw events to all other clients.

Room isolation: append `?room=<name>` to any URL for independent overlay sessions. Default room is `default`.

## Project Structure

```
cedh-stream-tool/
├── CLAUDE.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts              # if needed beyond v4 defaults
├── components.json                 # shadcn/ui config
├── server/
│   ├── index.ts                    # Express + Socket.IO server entry
│   └── room.ts                     # Room state management
├── src/
│   ├── shared/
│   │   ├── types.ts                # All shared TypeScript types
│   │   ├── scryfall.ts             # Scryfall API client
│   │   ├── scrollrack.ts           # Scrollrack API client
│   │   ├── topdeck.ts              # TopDeck.gg API client (calls server proxy)
│   │   ├── socket.ts               # Socket.IO connection factory + hooks
│   │   └── constants.ts            # Overlay dimensions, fade timings, etc.
│   ├── components/ui/              # shadcn/ui components
│   ├── caster/
│   │   ├── index.html              # Vite entry point for /caster
│   │   ├── main.tsx                # React mount
│   │   ├── App.tsx                 # Caster workstation root
│   │   └── components/
│   │       ├── Toolbar.tsx         # Drawing tools, color picker, stroke size
│   │       ├── Sidebar.tsx         # Tab container: Search + Decklist + Tournament
│   │       ├── SearchPanel.tsx     # Scryfall search with draggable results
│   │       ├── DecklistPanel.tsx   # Scrollrack format decklist loader
│   │       ├── TournamentPanel.tsx # TopDeck.gg tournament browser (player list, decklists)
│   │       ├── SettingsDialog.tsx  # API key, tournament ID, video feed URL config
│   │       ├── PreviewCanvas.tsx   # Scaled 1920×1080 canvas wrapper
│   │       ├── CardLayer.tsx       # Draggable cards on canvas
│   │       ├── DrawLayer.tsx       # Canvas2D drawing with auto-fade
│   │       └── BottomStrip.tsx     # Active cards strip + quick actions
│   ├── control/
│   │   ├── index.html              # Vite entry point for /control
│   │   ├── main.tsx
│   │   └── App.tsx                 # Producer panel (simpler, no drawing)
│   └── overlay/
│       ├── index.html              # Vite entry point for /overlay
│       ├── main.tsx
│       ├── App.tsx                 # OBS overlay root (transparent bg)
│       └── components/
│           ├── CardRenderer.tsx    # Card display with enter/exit animations
│           ├── DrawRenderer.tsx    # Drawing annotation renderer (auto-fade)
│           └── Spotlight.tsx       # Full-screen cinematic card spotlight
├── public/
│   └── fonts/                      # Self-hosted fonts if needed
└── dist/                           # Build output (gitignored)
```

This is a **multi-page Vite app**. Each of `/caster`, `/control`, and `/overlay` is a separate entry point with its own `index.html` and React root. Configure via `build.rollupOptions.input` in `vite.config.ts`. They share code from `src/shared/` and `src/components/ui/`.

## Shared Types (`src/shared/types.ts`)

```ts
export interface ScryfallCard {
  scryfallId: string
  name: string
  manaCost: string
  typeLine: string
  oracleText: string
  artist: string
  setName: string
  rarity: string
  colors: string[]
  imageUri: string         // normal size
  imageUriLarge: string    // large size (spotlight)
  imageUriSmall: string    // small thumbnail
  artCropUri: string
  borderCropUri: string
  doubleFaced: boolean
  backFace: {
    name: string
    imageUri: string
    artCropUri: string
  } | null
}

export interface OverlayCard {
  id: string                // 'card-1', 'card-2', etc. (server-generated)
  scryfallId: string
  name: string
  imageUri: string
  imageUriLarge: string
  artCropUri: string
  artist: string
  manaCost: string
  typeLine: string
  x: number                 // position on 1920×1080 canvas
  y: number
  width: number             // default 240
  height: number            // default 340
  zIndex: number
  spotlight: boolean
}

export interface DrawStroke {
  type: 'pen' | 'arrow' | 'circle'
  color: string             // hex color
  width: number             // stroke width in px
  // Pen: array of points
  points?: { x: number; y: number }[]
  // Circle/ellipse:
  cx?: number
  cy?: number
  rx?: number
  ry?: number
}

export interface DrawStrokeLocal extends DrawStroke {
  fadeStart: number          // Date.now() + FADE_DELAY
}

export type DrawTool = 'select' | 'pen' | 'arrow' | 'circle'

export interface RoomState {
  cards: OverlayCard[]
  spotlight: string | null   // card ID or null
  settings: {
    overlayWidth: number     // 1920
    overlayHeight: number    // 1080
  }
}

export interface ScrollrackValidation {
  valid: boolean
  format: string
  errors?: string[]
  decklist?: Record<string, Record<string, { quantity: number; id: string }>>
  cardsPerSection?: Record<string, number>
  totalCards?: number
}
```

## Socket.IO Event Protocol

### Card Lifecycle
| Client → Server | Server → All/Others | Payload |
|---|---|---|
| `card:add` | `card:added` | `Omit<OverlayCard, 'id' \| 'zIndex'>` → full `OverlayCard` |
| `card:move` | `card:moved` (to others) | `{ id, x, y }` |
| `card:resize` | `card:resized` | `{ id, width, height }` |
| `card:remove` | `card:removed` | `{ id }` |
| `card:bringToFront` | `card:zChanged` | `{ id }` → `{ id, zIndex }` |

### Spotlight
| Client → Server | Server → All | Payload |
|---|---|---|
| `spotlight:toggle` | `spotlight:on` or `spotlight:off` | `{ id }` → `{ id, card }` |
| `spotlight:off` (no id) | `spotlight:cleared` | (none) |

### Drawing (relay only, no server state)
| Client → Server | Server → Others | Payload |
|---|---|---|
| `draw:stroke` | `draw:stroke` | `DrawStroke` |
| `draw:undo` | `draw:undo` | (none) |
| `draw:clear` | `draw:clear` | (none) |

### Bulk
| Client → Server | Server → All | Payload |
|---|---|---|
| `cards:clearAll` | `state:full` (empty state) | (none) |

### On Connect
Server sends `state:full` with current `RoomState` to the connecting client.

Connection query params: `{ room: string, role: 'caster' | 'control' | 'overlay' }`.

## Server (`server/index.ts`)

Express + Socket.IO server. Responsibilities:
- Serve built static assets from `dist/` in production
- Hold canonical room state (in-memory, `Map<string, RoomState>`)
- Process card mutations (assign IDs, manage zIndex)
- Relay drawing events without persisting
- Broadcast state changes to room members
- Proxy TopDeck.gg API requests (keeps API key server-side)

The server assigns auto-incrementing card IDs (`card-${nextCardId++}` per room) and manages zIndex ordering. Drawing events are pure relay — the server does not store strokes.

Routes in production:
- `GET /` → redirect to `/caster`
- `GET /caster/*` → `dist/caster/index.html`
- `GET /control/*` → `dist/control/index.html`
- `GET /overlay/*` → `dist/overlay/index.html`
- `POST /api/topdeck/*` → proxy to TopDeck.gg API (see TopDeck.gg section below)

In development, Vite+ dev server handles the frontend and the Express server runs alongside (use `concurrently`).

Port: `process.env.PORT || 3000`, listen on `0.0.0.0`.

## Scryfall API Client (`src/shared/scryfall.ts`)

Wraps the Scryfall REST API with built-in rate limiting (100ms between requests per their guidelines).

Methods:
- `autocomplete(query: string): Promise<string[]>` — `GET /cards/autocomplete?q=` (max 20 results)
- `search(query: string, limit?: number): Promise<ScryfallCard[]>` — `GET /cards/search?q=&unique=cards&order=edhrec`
- `getByName(name: string): Promise<ScryfallCard>` — `GET /cards/named?fuzzy=`
- `getById(id: string): Promise<ScryfallCard>` — `GET /cards/{id}`

All methods return simplified `ScryfallCard` objects. Double-faced cards: use `card_faces[0].image_uris` when top-level `image_uris` is absent.

Must include headers: `Accept: application/json`, `User-Agent: cEDHStreamTool/1.0`.

## Scrollrack Integration (`src/shared/scrollrack.ts`)

Decklist validation via Scrollrack API.

```ts
async function validateDeck(rawText: string): Promise<ScrollrackValidation> {
  const res = await fetch('https://scrollrack.topdeck.gg/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: 'mtg', format: 'commander', list: rawText }),
  })
  return res.json()
}
```

Scrollrack decklist format uses `~~Section~~` markers:
```
~~Commanders~~
1 Kraum, Ludevic's Opus
1 Tymna the Weaver

~~Mainboard~~
1 Ad Nauseam
1 Thassa's Oracle
...
```

The response includes Scryfall UUIDs for each card in `decklist[section][cardName].id`, which we use to fetch images via `scryfall.getById()`.

**Fallback**: If Scrollrack is unreachable, parse the raw text line-by-line (regex: `/^(\d+)\s+(.+)$/`), extract card names, and call `scryfall.getByName(name)` for each.

## Caster App (`/caster`)

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOP TOOLBAR: [brand] | Tools(V P A C) | Colors | Sizes | undo/clear | ⚙ | conn │
├──────────────┬───────────────────────────────────────────────────────┤
│  LEFT SIDEBAR│                                                       │
│  [Search    ]│          PREVIEW CANVAS                               │
│  [Deck      ]│          (1920×1080 scaled to fit)                    │
│  [Tournament]│          Checkerboard bg / live video feed            │
│              │          Card layer (draggable cards)                  │
│  scrollable  │          Draw layer (pen/arrow/circle canvas)          │
│  results     │                                                       │
├──────────────┴───────────────────────────────────────────────────────┤
│  BOTTOM STRIP: [On Overlay] chip chip chip | [Spotlight Off] [Clear All] │
└──────────────────────────────────────────────────────────────────────┘
```

CSS Grid: `grid-template-rows: 48px 1fr 54px`, `grid-template-columns: 320px 1fr`.

### Preview Canvas
- 1920×1080 native resolution, scaled via CSS `transform: scale()` to fit available space
- Recalculate scale on window resize
- Background: checkerboard pattern (v1). Later: live video feed via `<video>` element fed by WebRTC
- Two layers stacked via absolute positioning:
  - **Card Layer** (`z-index: 10`): Draggable `OverlayCard` elements
  - **Draw Layer** (`z-index: 20`): HTML Canvas for annotations
- When a draw tool is active, card layer gets `pointer-events: none` and draw layer gets `pointer-events: auto` (vice versa for select tool)

### Drawing System
- Tools: `select`, `pen`, `arrow`, `circle`
- Set via toolbar buttons or keyboard shortcuts (V/P/A/C)
- Drawing on a `<canvas>` element at 1920×1080 native resolution
- Coordinate conversion: `(clientX - rect.left) / canvasScale` to get canvas coords
- Strokes stored locally in `DrawStrokeLocal[]` and emitted to server
- **Auto-fade**: Each stroke gets `fadeStart = Date.now() + 6000`. Render loop applies alpha fade: `alpha = 1 - (now - fadeStart) / 2000`. Fully faded strokes are removed.
- Render loop via `requestAnimationFrame`, redraws all strokes every frame
- Pen: draws connected line segments through all points
- Arrow: line from start to end with arrowhead (two short lines at angle)
- Circle: ellipse defined by bounding box of drag start → end

### Drawing Colors
Preset swatches: red `#ef4444`, yellow `#eab308`, blue `#3b82f6`, green `#22c55e`, white `#e4e0d8`.

### Stroke Sizes
Three presets: 3px (thin), 6px (medium, default), 10px (thick).

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| V | Select/move tool |
| P | Pen tool |
| A | Arrow tool |
| C | Circle tool |
| X | Clear all drawings |
| Ctrl+Z | Undo last drawing |
| Escape | Dismiss spotlight |
| / | Focus search input |

### Search Panel
- Text input with 300ms debounce
- Calls `scryfall.search()` on input
- Results shown as list items with: small thumbnail (48×67), card name, type line
- Each result is draggable (HTML5 drag) onto the preview canvas
- Each result has `+` button (add at random position) and `◉` button (add + spotlight)
- Search results cached in memory by query string

### Decklist Panel
- Textarea for pasting Scrollrack format decklists
- "Load Deck" button validates via Scrollrack, then progressively fetches card images from Scryfall
- Cards grouped by section (Commanders, Mainboard) with sticky section headers
- Each card in the loaded deck has the same drag/add/spotlight actions as search results
- "Clear" button resets the decklist

### Bottom Strip
- Horizontal scrollable list of `OverlayCard` chips currently on the overlay
- Each chip: tiny thumbnail, truncated name, `◉` spotlight toggle, `×` remove button
- "Spotlight Off" button dismisses any active spotlight
- "Clear All" button with confirmation removes all cards

### Card Interactions on Canvas
- **Drag to move**: Pointer events (pointerdown/move/up) with capture. Emits `card:move` on drag.
- **Right-click to remove**: Emits `card:remove`.
- **Double-click to spotlight**: Emits `spotlight:toggle`.
- **Drag from search results**: HTML5 drag-and-drop. On drop, calculate canvas coordinates from mouse position, accounting for scale transform. Emit `card:add`.

## Producer Panel (`/control`)

Simpler than the caster app. No drawing tools.

- Left sidebar with card search (same as caster)
- Center preview canvas with draggable cards
- Bottom strip with active cards, spotlight controls, clear all
- Can move, remove, spotlight any card
- Has authority to override anything casters place

## Overlay (`/overlay`)

The OBS browser source. Must be lightweight and performant.

- Viewport: 1920×1080, `background: transparent`
- Cards: absolutely positioned elements with `<img>`. Enter animation: `scale(0.7) → scale(1)` with overshoot easing (0.4s). Exit animation: `scale(1) → scale(0.8)` with fade (0.3s).
- **Spotlight mode**: Full-screen dark radial-gradient backdrop at `z-index: 9000`. Card image at 480×670 with pulsing gold glow shadow. Card name (Bebas Neue, 56px, gold `#c8aa6e`), type line, mana cost, artist credit displayed beside the card.
- **Drawing layer**: Same render loop as caster — receives `draw:stroke` events via Socket.IO, renders with identical auto-fade timing (6s delay, 2s fade).
- No UI chrome, no interactivity. Pure display.
- Small connection status dot (top-right corner, red/green) for setup — not visible on stream due to positioning.

## Design System

Dark theme with gold accents inspired by MTG's aesthetic. Use Tailwind for all styling.

**Colors** (define as Tailwind CSS custom theme):
- Background layers: `#09090b` → `#131316` → `#1a1a1f` → `#222228`
- Gold accent: `#c8aa6e` (primary interactive color, spotlight glow, active states)
- Gold hover: `#d4ba82`
- Gold dim: `rgba(200, 170, 110, 0.12)`
- Text: `#e4e0d8` (primary), `#8a8678` (dim), `#55524a` (muted)
- Status: red `#c0392b`, green `#27ae60`
- Overlay spotlight glow: `0 0 60px rgba(200, 170, 110, 0.5), 0 0 120px rgba(200, 170, 110, 0.2)`

**Typography**:
- Headings/brand: `Bebas Neue`, sans-serif
- Body/UI: `JetBrains Mono`, monospace
- Tiny labels: 9-10px, uppercase, 1.5-2px letter-spacing, muted color

Use shadcn/ui for: Tabs, Button, Input, ScrollArea, Tooltip, Dialog (for confirmations). Do NOT use shadcn for the canvas, drawing layer, or overlay — those need custom implementations.

## Development Setup

```bash
# Install vp globally
curl -fsSL https://vite.plus | bash   # macOS/Linux
irm https://vite.plus/ps1 | iex       # Windows PowerShell

# Install dependencies
vp install

# Development (runs Vite+ dev server + Express server concurrently)
vp dev          # or: concurrently "vp dev" "tsx watch server/index.ts"

# Production build
vp build

# Start production server (serves built assets)
node server/index.ts

# Lint + format + type-check
vp check
```

## Vite Config Notes

- Multi-page app: configure `build.rollupOptions.input` with three entries (caster, control, overlay)
- Each entry has its own `index.html` in `src/caster/`, `src/control/`, `src/overlay/`
- Shared code in `src/shared/` and `src/components/` is tree-shaken per entry
- The overlay bundle should be kept as small as possible — it runs in OBS's embedded Chromium
- Dev server proxy: proxy `/socket.io` to the Express server during development
- React plugin: `@vitejs/plugin-react`
- Tailwind: `@tailwindcss/vite` plugin

## External API Reference

### Scryfall API
- Base URL: `https://api.scryfall.com`
- Rate limit: 50-100ms between requests (10 req/s max)
- Card search: `GET /cards/search?q={query}&unique=cards&order=edhrec`
- Autocomplete: `GET /cards/autocomplete?q={query}`
- Named lookup: `GET /cards/named?fuzzy={name}`
- By ID: `GET /cards/{id}`
- Image sizes in `image_uris`: `small` (146×204), `normal` (488×680), `large` (672×936), `art_crop` (variable), `border_crop` (480×680)
- Double-faced cards: `image_uris` is null at top level, use `card_faces[0].image_uris` and `card_faces[1].image_uris`
- Must include `User-Agent` and `Accept` headers
- Usage guidelines: don't crop copyright/artist from images, don't distort/watermark images

### Scrollrack API (TopDeck.gg)
- Endpoint: `POST https://scrollrack.topdeck.gg/api/validate`
- Body: `{ game: 'mtg', format: 'commander', list: string }`
- Response: `{ valid, format, errors?, decklist?, cardsPerSection?, totalCards?, meta }`
- `decklist` is `Record<section, Record<cardName, { quantity, id }>>` where `id` is a Scryfall UUID
- No rate limiting currently, but don't abuse it

## TopDeck.gg API Integration

The caster/producer can connect to a live TopDeck.gg tournament to pull player names, standings, pairings, and decklists directly into the stream tool. This requires a TopDeck.gg API key (free, get one at https://topdeck.gg/account).

### API Key & Tournament ID Input

Add a **Settings** tab (or modal accessible from the toolbar) where the user enters:
- **TopDeck.gg API Key** — stored in `localStorage`, sent to the server, used for all API calls
- **Tournament ID (TID)** — the TopDeck.gg tournament identifier

The server proxies TopDeck.gg API calls (to keep the API key server-side rather than exposing it in browser network requests). The API key is sent via `Authorization` header on all requests.

### API Reference

Base URL: `https://topdeck.gg/api`

**Required header:** `{ "Authorization": "<api-key>" }`

**Rate limit:** 100 requests/minute per key. Returns 429 if exceeded.

#### Key Endpoints

**`GET /v2/tournaments/{TID}`** — Full tournament data (info + standings + rounds)
Returns tournament name, game, format, start date, standings with decklists, and all rounds with table pairings.

**`GET /v2/tournaments/{TID}/standings`** — Player standings with decklists
Each standing entry includes: `name`, `id`, `standing`, `decklist` (Scrollrack format string or URL), `deckObj` (structured deck data with Scryfall IDs), `points`, `winRate`, `wins`, `losses`, `draws`.

**`GET /v2/tournaments/{TID}/rounds/latest`** — Current round pairings
Returns an array of tables, each with players (name, id, decklist, deckObj), winner, and status.

**`GET /v2/tournaments/{TID}/players/{ID}`** — Single player detail
Returns name, standing, decklist, deckObj, winRate, gamesPlayed, gamesWon, byes, gamesDrawn, gamesLost.

### `deckObj` Structure

When available, `deckObj` contains structured decklist data with Scryfall IDs:
```json
{
  "Commanders": {
    "Kraum, Ludevic's Opus": { "id": "scryfall-uuid", "count": 1 },
    "Tymna the Weaver": { "id": "scryfall-uuid", "count": 1 }
  },
  "Mainboard": {
    "Ad Nauseam": { "id": "scryfall-uuid", "count": 1 },
    "Thassa's Oracle": { "id": "scryfall-uuid", "count": 1 }
  }
}
```

The `id` fields are Scryfall UUIDs, so card images can be fetched directly via `scryfall.getById()` without fuzzy name matching.

### Conditional Fields

- **Decklists** only appear when the tournament has ended OR the organizer has enabled "Show Decks"
- **deckObj** only included when structured deck data is available (newer tournaments using Scrollrack submission)
- Older tournaments may have `decklist` as a Moxfield URL string instead of Scrollrack text — handle both cases

### How It Integrates with the Stream Tool

1. **Tournament Browser** — once API key + TID are set, fetch tournament data and display player list in a new sidebar tab (or within the Decklist tab). Show player names, standings, commander names.
2. **One-click decklist loading** — click a player's name to load their full decklist into the decklist browser (same UI as the manual paste flow, but pre-populated from the API).
3. **Current round awareness** — fetch `/rounds/latest` to know which players are at the feature match table. Could auto-suggest loading those players' decklists.
4. **Player name plates** (future) — use player names and commander identity from the API to render name plates on the overlay.

### Server-Side Proxy

Add these routes to the Express server:

```
POST /api/topdeck/tournament     → proxy to GET /v2/tournaments/{TID}
POST /api/topdeck/standings      → proxy to GET /v2/tournaments/{TID}/standings
POST /api/topdeck/rounds/latest  → proxy to GET /v2/tournaments/{TID}/rounds/latest
POST /api/topdeck/player         → proxy to GET /v2/tournaments/{TID}/players/{ID}
```

Client sends `{ apiKey, tid, playerId? }` in the POST body. Server makes the request with the API key in the `Authorization` header and returns the response. This keeps the API key out of browser network inspector.

### Types

```ts
export interface TopDeckConfig {
  apiKey: string
  tournamentId: string
}

export interface TopDeckTournament {
  data: {
    name: string
    game: string
    format: string
    startDate: number
  }
  standings: TopDeckStanding[]
  rounds: TopDeckRound[]
}

export interface TopDeckStanding {
  standing: number
  name: string
  id: string | null
  decklist: string | null
  deckObj: Record<string, Record<string, { id: string; count: number }>> | null
  points: number
  winRate: number
  wins?: number
  losses?: number
  draws?: number
}

export interface TopDeckRound {
  round: number | string
  tables: TopDeckTable[]
}

export interface TopDeckTable {
  table: number | 'Byes'
  players: TopDeckPlayer[]
  winner: string | null
  winner_id: string | null
  status: 'Completed' | 'Active' | 'Pending' | 'Bye'
}

export interface TopDeckPlayer {
  name: string
  id: string | null
  decklist: string | null
  deckObj: Record<string, Record<string, { id: string; count: number }>> | null
}
```

## Live Video Feed (Producer → Caster)

The caster app's preview canvas currently shows a checkerboard placeholder. The goal is to replace this with a live video feed of the OBS output so casters can see exactly what the stream looks like while they place cards and draw annotations.

### Architecture

```
Producer's OBS → Virtual Camera / NDI → MediaMTX or LiveKit → WebRTC → Caster App <video>
```

The preview canvas already has a `<video id="preview-feed">` element with `display: none`. When a feed URL is provided, set `display: block` on the video element and hide the checkerboard background.

### Implementation Options (choose one)

**Option A: LiveKit (recommended)**
- Producer runs a LiveKit room (self-hosted or LiveKit Cloud)
- Producer publishes their OBS output as a video track (via OBS Virtual Camera → LiveKit SDK, or OBS → WHIP output → LiveKit)
- Caster app joins the LiveKit room as a subscriber, receives the video track, attaches it to the `<video>` element
- Latency: ~200-500ms (WebRTC)
- Pros: already familiar from SpellTable work, scales to many viewers, good SDK
- Cons: requires LiveKit server infrastructure

**Option B: Simple WHEP/WHIP**
- Producer runs a lightweight media relay (e.g., `mediamtx`) on the streaming PC
- OBS publishes via WHIP (OBS 30+ supports this natively)
- Caster app consumes the stream via WHEP (standard WebRTC playback)
- Latency: ~200-500ms
- Pros: simpler infrastructure, no account needed
- Cons: more manual setup for the producer

**Option C: RTMP → HLS fallback**
- Producer sends a secondary RTMP stream to a local nginx-rtmp or mediamtx instance
- Relay serves it as HLS
- Caster app plays HLS via `hls.js` in the `<video>` element
- Latency: 3-10 seconds (acceptable for card placement, not ideal for real-time annotation)
- Pros: simplest setup, battle-tested
- Cons: high latency degrades the annotation experience

### Settings UI

Add a "Video Feed" section to the Settings tab/modal:
- **Feed URL** input — the WebRTC/WHEP/HLS endpoint URL
- **Connect / Disconnect** toggle
- Feed status indicator (connecting, connected, disconnected, error)

### Caster App Changes

- When feed is connected, show the `<video>` element as the canvas background
- Drawing and card layers remain on top of the video
- If feed disconnects, fall back to checkerboard with a reconnect indicator

## Roadmap (Not in v1 — context for future)

1. **Life totals** — 4-player tracking at 40 life with commander damage per opponent, rendered on the overlay.
2. **Player name plates** — Display player names with commander color identity indicators on the overlay. Data from TopDeck.gg API.
3. **Card resize handles** — Drag corners to resize cards on the canvas.
4. **Pin annotations** — Hold Shift while drawing to prevent auto-fade.
5. **Producer OBS WebSocket control** — Control OBS scenes directly via the OBS WebSocket API (built into OBS 28+).
6. **Stream Deck integration** — Map Stream Deck buttons to server actions (clear cards, toggle spotlight, next card in queue).
7. **Authentication** — Role-based access (caster vs producer) with simple password per room.
8. **Persistent state** — Server state is in-memory only. Persist to JSON or SQLite for crash recovery.
9. **Electron packaging** — Wrap caster app in Electron via `vite-plugin-electron` for standalone desktop distribution. The overlay stays as a browser source.