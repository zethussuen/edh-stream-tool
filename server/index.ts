import express from "express";
import { createServer, type Server as HttpServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "node:fs/promises";
import { RoomManager } from "./room.js";
import type { NamePlate } from "../src/shared/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SAFE_PARAM = /^[a-zA-Z0-9_-]+$/;

function sanitizeRoom(room: string): string {
  if (!SAFE_PARAM.test(room)) return "default";
  return room;
}

export interface ServerInstance {
  httpServer: HttpServer;
  port: number;
}

async function writeObsFiles(room: string, rooms: RoomManager, obsDir: string) {
  try {
    const safeRoom = sanitizeRoom(room);
    const dir = safeRoom === "default" ? obsDir : join(obsDir, safeRoom);
    await fs.mkdir(dir, { recursive: true });
    const table = rooms.getStreamTable(room);
    const plates = rooms.getNamePlates(room);
    const rnd = rooms.getStreamRound(room);
    const stats = rooms.getStreamStats(room);
    const writes: Promise<void>[] = [
      fs.writeFile(join(dir, "tournament_name.txt"), rnd?.tournamentName ?? "", "utf8"),
      fs.writeFile(join(dir, "round.txt"), rnd?.round != null ? String(rnd.round) : "", "utf8"),
      fs.writeFile(join(dir, "table.txt"), table?.table != null ? String(table.table) : "", "utf8"),
      fs.writeFile(join(dir, "match_status.txt"), table?.status ?? "", "utf8"),
    ];
    for (let i = 0; i < 4; i++) {
      const p: NamePlate | undefined = plates?.[i];
      const s = stats?.[i];
      const prefix = join(dir, `player${i + 1}`);
      writes.push(
        fs.writeFile(`${prefix}_name.txt`, p?.name ?? "", "utf8"),
        fs.writeFile(`${prefix}_commander.txt`, p?.deckName ?? "", "utf8"),
        fs.writeFile(`${prefix}_standing.txt`, s?.standing != null ? String(s.standing) : "", "utf8"),
        fs.writeFile(`${prefix}_record.txt`, s ? `${s.wins}-${s.losses}-${s.draws}` : "", "utf8"),
      );
    }
    await Promise.all(writes);
  } catch (err) {
    console.error("[obs] Failed to write obs files:", err);
  }
}

export function startServer(distDir?: string, obsDir?: string): Promise<ServerInstance> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const rooms = new RoomManager();

  // ── TopDeck.gg API Proxy ──

  const TOPDECK_BASE = "https://topdeck.gg/api";

  function topdeckProxy(route: string, buildUrl: (body: Record<string, string>) => string) {
    app.post(`/api/topdeck/${route}`, async (req, res) => {
      try {
        const room = (req.body.room as string) || "default";
        const apiKey = req.body.apiKey || rooms.getTopDeckApiKey(room) || process.env.TOPDECK_API_KEY;
        if (!apiKey) {
          res.status(400).json({ error: "No TopDeck API key provided" });
          return;
        }
        for (const param of ["tid", "playerId"]) {
          if (req.body[param] && !SAFE_PARAM.test(req.body[param])) {
            res.status(400).json({ error: `Invalid ${param}` });
            return;
          }
        }
        const r = await fetch(buildUrl(req.body), {
          headers: { Authorization: apiKey },
        });
        const data = await r.json();
        res.status(r.status).json(data);
      } catch (e) {
        res.status(502).json({ error: String(e) });
      }
    });
  }

  // Let the client know if a server-side API key is configured
  app.get("/api/topdeck/has-key", (req, res) => {
    const room = (req.query.room as string) || "default";
    const hasKey = !!(rooms.getTopDeckApiKey(room) || process.env.TOPDECK_API_KEY);
    res.json({ hasKey });
  });

  topdeckProxy("tournament", ({ tid }) => `${TOPDECK_BASE}/v2/tournaments/${tid}`);
  topdeckProxy("standings", ({ tid }) => `${TOPDECK_BASE}/v2/tournaments/${tid}/standings`);
  topdeckProxy("rounds", ({ tid }) => `${TOPDECK_BASE}/v2/tournaments/${tid}/rounds`);
  topdeckProxy("rounds/latest", ({ tid }) => `${TOPDECK_BASE}/v2/tournaments/${tid}/rounds/latest`);
  topdeckProxy("player", ({ tid, playerId }) => `${TOPDECK_BASE}/v2/tournaments/${tid}/players/${playerId}`);
  topdeckProxy("attendees", ({ tid }) => `${TOPDECK_BASE}/v2/tournaments/${tid}/attendees`);

  // ── Static Serving (production / Electron) ──

  if (distDir) {
    app.use("/assets", express.static(join(distDir, "assets")));
    app.use("/mana_symbols", express.static(join(distDir, "mana_symbols")));

    app.get("/", (_req, res) => res.redirect("/caster"));

    for (const page of ["caster", "control", "overlay", "spotlight", "nameplates", "annotations", "decklist", "focused-card"]) {
      const sendPage = (_req: express.Request, res: express.Response) => {
        res.sendFile(join(distDir, "src", page, "index.html"));
      };
      app.get(`/${page}`, sendPage);
      app.get(`/${page}/`, sendPage);
      app.get(`/${page}/{*path}`, sendPage);
    }
  }

  // ── Socket.IO ──

  io.on("connection", (socket) => {
    const room = (socket.handshake.query.room as string) || "default";
    const role = (socket.handshake.query.role as string) || "unknown";
    socket.join(room);
    console.log(`[${room}] ${role} connected (${socket.id})`);

    // Send current state on connect
    socket.emit("state:full", rooms.getOrCreate(room));
    const streamTable = rooms.getStreamTable(room);
    if (streamTable) {
      socket.emit("streamTable:updated", streamTable);
    }
    const namePlates = rooms.getNamePlates(room);
    if (namePlates) {
      socket.emit("namePlates:updated", namePlates);
    }
    const tdConfig = rooms.getTopDeckConfig(room);
    if (tdConfig) {
      socket.emit("topDeckConfig:updated", { tournamentId: tdConfig.tournamentId });
    }
    const decklistOverlay = rooms.getDecklistOverlay(room);
    if (decklistOverlay) {
      socket.emit("decklist:updated", decklistOverlay);
    }
    const focusedCard = rooms.getFocusedCard(room);
    if (focusedCard) {
      socket.emit("focusedCard:updated", focusedCard);
    }
    const feedProducerId = rooms.getFeedProducer(room);
    if (feedProducerId) {
      socket.emit("feed:available", { producerId: feedProducerId });
    }
    const streamRound = rooms.getStreamRound(room);
    if (streamRound) {
      socket.emit("streamRound:updated", streamRound);
    }
    const streamStats = rooms.getStreamStats(room);
    if (streamStats) {
      socket.emit("streamStats:updated", streamStats);
    }

    // ── Card lifecycle ──

    socket.on("card:add", (data) => {
      const card = rooms.addCard(room, data);
      io.to(room).emit("card:added", card);
    });

    socket.on("card:move", (data) => {
      const { id, x, y } = data;
      rooms.moveCard(room, id, x, y);
      io.to(room).emit("card:moved", { id, x, y });
    });

    socket.on("card:resize", (data) => {
      const { id, width, height } = data;
      rooms.resizeCard(room, id, width, height);
      socket.to(room).emit("card:resized", { id, width, height });
    });

    socket.on("card:remove", (data) => {
      const { id } = data;
      rooms.removeCard(room, id);
      io.to(room).emit("card:removed", { id });
    });

    socket.on("card:bringToFront", (data) => {
      const { id } = data;
      const zIndex = rooms.bringToFront(room, id);
      if (zIndex !== null) {
        io.to(room).emit("card:zChanged", { id, zIndex });
      }
    });

    // ── Spotlight ──

    socket.on("spotlight:show", (data) => {
      rooms.setSpotlight(room, data);
      io.to(room).emit("spotlight:updated", data);
    });

    socket.on("spotlight:toggle", (data) => {
      const { id } = data;
      const result = rooms.toggleSpotlight(room, id);
      if (result.on) {
        io.to(room).emit("spotlight:updated", result.card);
      } else {
        io.to(room).emit("spotlight:cleared");
      }
    });

    socket.on("spotlight:off", () => {
      rooms.clearSpotlight(room);
      io.to(room).emit("spotlight:cleared");
    });

    // ── Stream Table ──

    socket.on("streamTable:set", (data) => {
      rooms.setStreamTable(room, data);
      socket.to(room).emit("streamTable:updated", data);
      if (obsDir) writeObsFiles(room, rooms, obsDir);
    });

    socket.on("namePlates:set", (data) => {
      rooms.setNamePlates(room, data);
      socket.to(room).emit("namePlates:updated", data);
      if (obsDir) writeObsFiles(room, rooms, obsDir);
    });

    socket.on("streamRound:set", (data) => {
      rooms.setStreamRound(room, data);
      socket.to(room).emit("streamRound:updated", data);
      if (obsDir) writeObsFiles(room, rooms, obsDir);
    });

    socket.on("streamStats:set", (data) => {
      rooms.setStreamStats(room, data);
      socket.to(room).emit("streamStats:updated", data);
      if (obsDir) writeObsFiles(room, rooms, obsDir);
    });

    socket.on("decklist:set", (data) => {
      rooms.setDecklistOverlay(room, data);
      socket.to(room).emit("decklist:updated", data);
    });

    socket.on("focusedCard:set", (data) => {
      rooms.setFocusedCard(room, data);
      socket.to(room).emit("focusedCard:updated", data);
    });

    socket.on("focusedCard:clear", () => {
      rooms.setFocusedCard(room, null);
      socket.to(room).emit("focusedCard:updated", null);
    });

    // ── TopDeck Config (producer shares with room) ──

    socket.on("topDeckConfig:set", (data: { apiKey?: string; tournamentId: string } | null) => {
      if (role !== "control") return; // Only the producer can set config
      if (data) {
        rooms.setTopDeckConfig(room, { apiKey: data.apiKey || "", tournamentId: data.tournamentId });
        // Broadcast tournament ID to others (never expose API key to other clients)
        socket.to(room).emit("topDeckConfig:updated", { tournamentId: data.tournamentId });
      } else {
        rooms.setTopDeckConfig(room, null);
        socket.to(room).emit("topDeckConfig:updated", null);
      }
    });

    // ── Drawing (relay only) ──

    socket.on("draw:progress", (data) => {
      socket.to(room).emit("draw:progress", { ...data, senderId: socket.id });
    });

    socket.on("draw:stroke", (data) => {
      socket.to(room).emit("draw:stroke", { ...data, senderId: socket.id });
    });

    socket.on("draw:undo", () => {
      socket.to(room).emit("draw:undo");
    });

    socket.on("draw:clear", () => {
      socket.to(room).emit("draw:clear");
    });

    // ── Video Feed (WebRTC signaling) ──

    socket.on("feed:available", () => {
      rooms.setFeedProducer(room, socket.id);
      socket.to(room).emit("feed:available", { producerId: socket.id });
    });

    socket.on("feed:stopped", () => {
      rooms.clearFeedProducerIfMatch(room, socket.id);
      socket.to(room).emit("feed:stopped");
    });

    socket.on("feed:request", ({ producerId }) => {
      io.to(producerId).emit("feed:request", { casterId: socket.id });
    });

    socket.on("webrtc:offer", ({ targetId, offer }) => {
      io.to(targetId).emit("webrtc:offer", { senderId: socket.id, offer });
    });

    socket.on("webrtc:answer", ({ targetId, answer }) => {
      io.to(targetId).emit("webrtc:answer", { senderId: socket.id, answer });
    });

    socket.on("webrtc:ice-candidate", ({ targetId, candidate }) => {
      io.to(targetId).emit("webrtc:ice-candidate", { senderId: socket.id, candidate });
    });

    // ── Bulk ──

    socket.on("cards:clearAll", () => {
      const state = rooms.clearAll(room);
      io.to(room).emit("state:full", state);
    });

    socket.on("disconnect", () => {
      console.log(`[${room}] ${role} disconnected (${socket.id})`);
      if (rooms.clearFeedProducerIfMatch(room, socket.id)) {
        io.to(room).emit("feed:stopped");
      }
    });
  });

  // ── Start ──

  const PORT = Number(process.env.PORT || 3000);
  return new Promise((resolve) => {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on http://0.0.0.0:${PORT}`);
      resolve({ httpServer, port: PORT });
    });
  });
}

// Run standalone when executed directly (not imported by Electron)
const isMain = process.argv[1]?.includes("server");
if (isMain) {
  const isProduction = process.env.NODE_ENV === "production";
  const distDir = isProduction ? join(__dirname, "..", "dist") : undefined;
  const obsDir = join(process.cwd(), "obs-files");
  startServer(distDir, obsDir);
}
