# CLAUDE.md — cEDH Stream Tool

## Project Overview

A real-time, multi-operator stream overlay tool for casting competitive EDH (cEDH) Magic: The Gathering tournaments. Casters on separate laptops search for MTG cards, drag them onto a shared stream overlay, draw annotations (circles, arrows, freehand), and spotlight cards — all rendering live on the OBS stream overlay running on a producer's machine.

## Users & Roles

- **Casters (2)**: At the stream table with their own laptops. Open `/caster` in a browser. They search for cards, place/move them on the overlay, draw annotations, and trigger spotlight mode. They watch the game and commentate — the tool needs to be fast and low-friction.
- **Producer (1)**: At the streaming PC running OBS with a Stream Deck. Opens `/control` in a browser for overlay management (clear cards, reposition, override anything casters do). Has final authority over what's on screen.
- **OBS Overlay**: The producer's OBS loads overlay browser sources (1920×1080, transparent) layered over the game camera feed. Available as a single combined source (`/overlay`) or individual layers (`/spotlight`, `/nameplates`, `/annotations`, `/decklist`) for independent z-ordering and visibility control in OBS. `/focused-card` is a 672×936 insert source for single-card display.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Toolchain**: Vite+ (https://viteplus.dev/) — unified dev/build/check/test via `vp` CLI
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Fonts**: `Bebas Neue` (headings/brand), `JetBrains Mono` (body/UI) via Google Fonts
- **Server**: Node.js + Express + Socket.IO
- **Card Data**: Scryfall REST API (batch collection endpoint for oracle IDs, individual for search)
- **Deck Validation**: Scrollrack API (https://scrollrack.topdeck.gg/api/validate)
- **Tournament Data**: TopDeck.gg API v2 (attendees endpoint for decklists, requires staff/owner access)
- **Real-time Transport**: Socket.IO (WebSocket with auto-reconnect, room support)
- **Desktop App**: Electron (packages server + frontend for standalone distribution)

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
├── vite.config.ts                  # Multi-page Vite config, injects __APP_VERSION__
├── tsconfig.json
├── components.json                 # shadcn/ui config
├── electron/
│   └── main.ts                     # Electron entry (starts embedded server, loads /control)
├── server/
│   ├── index.ts                    # Express + Socket.IO server entry + TopDeck proxy
│   └── room.ts                     # Room state (cards, spotlight, stream table, name plates, focused card, feed producer)
├── src/
│   ├── env.d.ts                    # Global type declarations (__APP_VERSION__)
│   ├── shared/
│   │   ├── types.ts                # All shared TypeScript types
│   │   ├── scryfall.ts             # Scryfall API client (search, batch collection by oracle ID)
│   │   ├── scrollrack.ts           # Scrollrack API client
│   │   ├── topdeck.ts              # TopDeck.gg API client with localStorage cache
│   │   ├── cards.ts                # Card payload builders (cardAddPayload, spotlightPayload, focusedCardPayload), commander label helper
│   │   ├── card-filter.ts          # Client-side Scryfall-syntax query parser & evaluator
│   │   ├── socket.ts               # Socket.IO connection factory + hooks
│   │   ├── constants.ts            # Overlay dimensions, fade timings, etc.
│   │   └── components/
│   │       └── ManaCost.tsx        # Renders mana cost strings as inline SVG symbols
│   ├── components/ui/              # shadcn/ui components
│   ├── caster/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx                 # Caster workstation root
│   │   └── components/
│   │       ├── Toolbar.tsx         # Drawing tools, colors, sizes, fade toggle, clear actions
│   │       ├── Sidebar.tsx         # Tab container: Search + Deck + Tournament
│   │       ├── SearchPanel.tsx     # Scryfall search with draggable results + mana symbols
│   │       ├── DecklistPanel.tsx   # Tournament-driven decklist browser (attendees, filter, sort)
│   │       ├── TournamentPanel.tsx # Rounds, standings, stream pod selection, pod status badges, player click-through
│   │       ├── SettingsDialog.tsx  # TopDeck API key, tournament ID, version display
│   │       ├── PreviewCanvas.tsx   # Scaled 1920×1080 canvas wrapper + drop zone
│   │       ├── CardLayer.tsx       # Draggable cards on canvas
│   │       ├── DrawLayer.tsx       # Canvas2D drawing with auto-fade toggle, custom cursors
│   │       └── BottomStrip.tsx     # Active cards strip + spotlight/clear actions
│   ├── control/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx                 # Producer panel (no drawing, has video feed publishing)
│   ├── overlay/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx                 # Combined OBS overlay root (all layers, transparent bg)
│   │   └── components/
│   │       ├── CardRenderer.tsx    # Card display with enter/exit animations
│   │       ├── DrawRenderer.tsx    # Drawing annotation renderer
│   │       ├── Spotlight.tsx       # Full-screen cinematic card spotlight with mana symbols
│   │       └── NamePlates.tsx      # 4-corner player name plates with commander + color identity
│   ├── spotlight/                  # Standalone spotlight overlay (/spotlight)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── nameplates/                 # Standalone name plates overlay (/nameplates)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── annotations/                # Standalone cards + drawings overlay (/annotations)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── decklist/                   # Standalone decklist overlay (/decklist)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   └── focused-card/               # Standalone 672×936 card insert overlay (/focused-card)
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx
├── public/
│   └── mana_symbols/               # SVG mana symbol icons (W.svg, U.svg, 2G.svg, etc.)
├── dist/                           # Vite build output (gitignored)
├── dist-electron/                  # esbuild electron bundle (gitignored)
└── release/                        # electron-builder output (gitignored)
```

This is a **multi-page Vite app**. Each route (`/caster`, `/control`, `/overlay`, `/spotlight`, `/nameplates`, `/annotations`, `/decklist`, `/focused-card`) is a separate entry point with its own `index.html` and React root. Configure via `build.rollupOptions.input` in `vite.config.ts`. They share code from `src/shared/` and `src/components/ui/`.

The overlay is available as a single combined source (`/overlay`) or as individual layers (`/spotlight`, `/nameplates`, `/annotations`, `/decklist`) for finer OBS control. `/focused-card` is a 672×936 insert (not 1920×1080) used as a card graphic source. The standalone overlays import components from `src/overlay/components/` — those remain the single source of truth for overlay rendering.

## Shared Types (`src/shared/types.ts`)

```ts
export interface ScryfallCard {
  scryfallId: string
  name: string
  manaCost: string
  cmc: number
  typeLine: string
  oracleText: string
  artist: string
  setName: string
  rarity: string
  colors: string[]
  colorIdentity: string[]
  power: string | null
  toughness: string | null
  keywords: string[]
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

export interface FocusedCardData {
  name: string
  imageUriLarge: string        // 672×936 Scryfall large image
}

export interface DecklistOverlayCard {
  name: string
  manaCost: string
  cmc: number
  quantity: number
}

export interface DecklistOverlaySection {
  name: string
  cards: DecklistOverlayCard[]
}

export interface DecklistOverlayData {
  playerName: string
  commanderName: string | null
  sections: DecklistOverlaySection[]
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

### Stream Table & Name Plates
| Client → Server | Server → All/Others | Payload |
|---|---|---|
| `streamTable:set` | `streamTable:updated` | `TopDeckTable \| null` |
| `namePlates:set` | `namePlates:updated` | `NamePlate[] \| null` |

### Decklist Overlay
| Client → Server | Server → All | Payload |
|---|---|---|
| `decklist:set` | `decklist:updated` | `DecklistOverlayData \| null` |

### Focused Card
| Client → Server | Server → All | Payload |
|---|---|---|
| `focusedCard:set` | `focusedCard:updated` | `FocusedCardData` |
| `focusedCard:clear` | `focusedCard:updated` (null) | (none) |

### Bulk
| Client → Server | Server → All | Payload |
|---|---|---|
| `cards:clearAll` | `state:full` (empty state) | (none) |

### On Connect
Server sends `state:full` with current `RoomState`, plus `streamTable:updated`, `namePlates:updated`, `decklist:updated`, and `focusedCard:updated` if set. Also sends `feed:available` with the active producer's socket ID if a video feed is live.

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
- `GET /caster/*` → `dist/src/caster/index.html`
- `GET /control/*` → `dist/src/control/index.html`
- `GET /overlay/*` → `dist/src/overlay/index.html`
- `GET /spotlight/*` → `dist/src/spotlight/index.html`
- `GET /nameplates/*` → `dist/src/nameplates/index.html`
- `GET /annotations/*` → `dist/src/annotations/index.html`
- `GET /decklist/*` → `dist/src/decklist/index.html`
- `GET /focused-card/*` → `dist/src/focused-card/index.html`
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

### Decklist Panel (Tournament-Driven)
- Fetches player list from TopDeck.gg `/attendees` endpoint (staff/owner access required for decklists)
- Players shown with standing, commander name(s), and "Deck →" indicator
- **Stream Pod section**: when a stream pod is set, those players appear at the top in a highlighted section
- Clicking a player batch-fetches their deck via Scryfall collection API (oracle IDs from deckObj)
- Deck view shows cards grouped by section (Commanders, Mainboard) or by type (Commander, Planeswalker, Creature, etc.)
- **Sort controls**: group by Section or Type, sort by Name or Mana Value, asc/desc
- **Filter bar**: client-side Scryfall-syntax query parser supporting `t:instant`, `mv<=2`, `o:"draw"`, `c:u`, `-c:r`, `(c:u or c:g)`, quoted values, and plain name search
- Card names link to Scryfall for oracle text inspection
- Each card shows mana symbols (rendered from `/mana_symbols/` SVGs), drag/add/spotlight actions
- API results cached in localStorage with "Pull Latest" for manual refresh
- Handles deckObj (structured), raw decklist text (Scrollrack validation), and URL decklists (external link)

### Bottom Strip
- Horizontal scrollable list of `OverlayCard` chips currently on the overlay
- Each chip: tiny thumbnail, truncated name, spotlight toggle icon, remove icon
- Spotlight off icon button dismisses any active spotlight
- "Clear All" button with confirmation removes all cards
- All icon buttons have tooltips and minimum 28px touch targets

### Card Interactions on Canvas
- **Drag to move**: Pointer events (pointerdown/move/up) with capture. Emits `card:move` on drag.
- **Right-click to remove**: Emits `card:remove`.
- **Double-click to spotlight**: Emits `spotlight:toggle`.
- **Drag from sidebar**: HTML5 drag-and-drop handled on PreviewCanvas wrapper (works with any active tool, not just select). On drop, calculate canvas coordinates accounting for scale transform. Emit `card:add`.

## Producer Panel (`/control`)

Simpler than the caster app. No drawing tools.

- Left sidebar with card search (same as caster)
- Center preview canvas with draggable cards
- Bottom strip with active cards, spotlight controls, clear all
- Can move, remove, spotlight any card
- Has authority to override anything casters place

## Overlays

OBS browser sources. Must be lightweight and performant. All use viewport 1920×1080 with `background: transparent`. No UI chrome, no interactivity. Pure display.

### Combined Overlay (`/overlay`)

Renders all layers in a single browser source — cards, drawings, spotlight, and name plates. Good for simple OBS setups.

### Standalone Overlay Layers

For advanced OBS setups, each layer is available as a separate browser source. This allows independent z-ordering, visibility toggles, and transitions per layer in OBS.

| Route | Layer | What it renders |
|-------|-------|-----------------|
| `/spotlight` | Spotlight | Full-screen card spotlight only |
| `/nameplates` | Name Plates | 4-corner player name plates only |
| `/annotations` | Annotations | Cards on canvas + drawing annotations (no spotlight, no name plates) |
| `/decklist` | Decklist | Full-screen player decklist: name, commander, cards in 3 columns with mana symbols |

All standalone overlays connect with role `"overlay"` and share the same room state. They import components from `src/overlay/components/`.

### Focused Card Overlay (`/focused-card`)

A 672×936 insert (not 1920×1080) used as a separate OBS Browser Source for a clean single-card graphic. Listens to `focusedCard:updated` and shows the card image with a subtle fade-scale enter/exit animation (0.3s). Has no UI chrome. Casters trigger it via the picture-frame icon in SearchPanel or DecklistPanel; cleared via the icon in BottomStrip. Server persists the focused card so newly connecting clients get the current state.

### Overlay Component Details

- **Cards**: absolutely positioned elements with `<img>`. Enter animation: `scale(0.7) → scale(1)` with overshoot easing (0.4s). Exit animation: `scale(1) → scale(0.8)` with fade (0.3s).
- **Spotlight mode**: Full-screen dark radial-gradient backdrop at `z-index: 9000`. Card image at 480×670 with pulsing gold glow shadow. Card name (Bebas Neue, 56px, gold), mana cost rendered as SVG symbols, type line, artist credit.
- **Drawing layer**: Same render loop as caster — receives `draw:stroke` events via Socket.IO, renders with identical auto-fade timing (6s delay, 2s fade).
- **Name plates**: When a stream pod is set, 4 player name plates render in the corners (TL=seat 1, TR=seat 2, BR=seat 3, BL=seat 4 clockwise). Each shows player name (Bebas Neue, 28px), commander name + color identity mana symbols. Plates hug corners with no margin, inner corner rounded. Near-opaque dark backdrop.
- **Decklist overlay**: Full 1920×1080, near-opaque dark gradient backdrop. Player name (Bebas Neue, 36px), commander name (gold, 16px), then 99 cards grouped in 3 CSS columns with `columnFill: "auto"`. Each card row shows quantity, name, and inline mana cost SVGs. Triggered by "Show Decklist on Overlay" button in DecklistPanel; cleared by sending `decklist:set` with null (no dedicated clear button yet).

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
# Server loads .env.local for TOPDECK_API_KEY
pnpm dev

# Production build
vp build

# Start production server (serves built assets)
pnpm start

# Lint + format + type-check
vp check

# Electron development (build + run)
pnpm electron:dev

# Electron distribution build (macOS + Windows)
pnpm electron:build
```

### Environment Variables

Create `.env.local` with:
```
TOPDECK_API_KEY=your-api-key-here
```

The server reads this as a fallback when no client-side API key is provided. Get your key at https://topdeck.gg/account.

### Versioning

App version is defined in `package.json` `"version"` and injected at build time via `__APP_VERSION__`. Displayed in the toolbar and settings dialog. Bump before each Electron release.

## Vite Config Notes

- Multi-page app: configure `build.rollupOptions.input` with all entries (caster, control, overlay, spotlight, nameplates, annotations, decklist, focused-card)
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

Implemented via browser WebRTC using OBS Virtual Camera — no extra infrastructure needed.

### Architecture

```
OBS Virtual Camera → Producer's browser (getUserMedia) → Socket.IO WebRTC signaling → Caster browsers
```

### Flow

1. Producer starts OBS Virtual Camera
2. In `/control/`, clicks **Start Camera** in the toolbar — browser calls `getUserMedia({ video: true })` and the user picks "OBS Virtual Camera" from the device picker
3. Producer sends `feed:available` to the server; server stores the producer's socket ID in room state and broadcasts `feed:available { producerId }` to all room members
4. Caster apps receive `feed:available`, initiate a WebRTC peer connection to the producer's socket ID via Socket.IO signaling (`feed:offer`, `feed:answer`, `feed:ice` events)
5. Video track attaches to a `<video>` element behind the canvas layers, replacing the checkerboard background
6. On disconnect, server detects the producer socket left and broadcasts `feed:stopped`; casters fall back to checkerboard

### State Persistence

The active feed producer's socket ID is stored in `RoomData.feedProducerId`. Clients connecting after the producer started the feed receive `feed:available` immediately on the `state:full` / connect sequence and can initiate the WebRTC handshake.

### Latency

~200-500ms (WebRTC P2P). Good enough for card placement and annotation alignment.

## Implemented Features (v0.1.7)

- **Focused card overlay** (`/focused-card`) — Standalone 672×936 browser source for a clean single-card graphic insert. Triggered from search results or decklist via the picture-frame icon. Persisted in server state; cleared from BottomStrip.
- **Feed producer persistence** — WebRTC feed producer socket ID stored in room state so late-joining clients get `feed:available` immediately and can initiate the WebRTC handshake.
- **Decklist overlay** (`/decklist`) — Full-screen text-based decklist: player name, commander, 99 cards in 3 CSS columns with mana symbol SVGs. Pushed from DecklistPanel's "Show Decklist on Overlay" button.
- **Moxfield-style text view** — Decklist grouped by card type with mana cost display (v0.1.6).
- **Standalone overlay layers** — Overlay split into independent browser sources (`/spotlight`, `/nameplates`, `/annotations`, `/decklist`) for granular OBS control. Combined `/overlay` still available.
- **Player name plates** — 4-corner overlay name plates with player name, commander name, and color identity mana symbols. Synced via Socket.IO when stream pod is selected.
- **Live video feed** — Producer captures OBS Virtual Camera via browser `getUserMedia`, streams to casters via WebRTC using Socket.IO signaling. No external infrastructure.
- **Annotation fade toggle** — Toolbar button to toggle auto-fade on/off. When off, drawings persist until manually cleared.
- **Electron packaging** — esbuild bundles electron/server into single JS file, electron-builder produces macOS arm64 (.dmg/.zip) and Windows x64 (.exe/.zip) distributables.
- **Tournament-driven decklists** — Deck tab fetches from TopDeck.gg `/attendees` endpoint (staff access). Scryfall-syntax card filter with `t:`, `o:`, `c:`, `mv<=`, negation, OR/parentheses.
- **Stream pod workflow** — Select a pod in Tournament tab, shared across all clients via server. Pod players highlighted in Deck tab. Each table shows a colored status badge (Live / Done / Pending / Bye) for at-a-glance round progress.
- **Mana symbols** — SVG mana symbols rendered throughout UI (card rows, spotlight, name plates) via `ManaCost` component.
- **API caching** — TopDeck responses cached in localStorage. Manual "Pull Latest" to refresh. Survives page reload.
- **Drag-and-drop with any tool** — Cards can be dragged from sidebar onto canvas even when a draw tool is active (drop zone on PreviewCanvas wrapper).
- **Custom draw cursors** — Pen shows circle sized to brush width/color, arrow and circle show crosshair with shape hint.

## Roadmap (future)

1. **Life totals** — 4-player tracking at 40 life with commander damage per opponent, rendered on the overlay.
2. **Card resize handles** — Drag corners to resize cards on the canvas.
3. **Producer OBS WebSocket control** — Control OBS scenes directly via the OBS WebSocket API (built into OBS 28+).
4. **Stream Deck integration** — Map Stream Deck buttons to server actions (clear cards, toggle spotlight, next card in queue).
5. **Authentication** — Role-based access (caster vs producer) with simple password per room.
6. **Persistent state** — Server state is in-memory only. Persist to JSON or SQLite for crash recovery.