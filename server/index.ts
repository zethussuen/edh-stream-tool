import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  const room = (socket.handshake.query.room as string) || "default";
  const role = (socket.handshake.query.role as string) || "unknown";
  socket.join(room);
  console.log(`[${room}] ${role} connected (${socket.id})`);

  socket.on("disconnect", () => {
    console.log(`[${room}] ${role} disconnected (${socket.id})`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
