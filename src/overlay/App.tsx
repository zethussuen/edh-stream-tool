import { useRoom, useSocket } from "@shared/socket";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { CardRenderer } from "./components/CardRenderer";
import { DrawRenderer } from "./components/DrawRenderer";
import { Spotlight } from "./components/Spotlight";

export function App() {
  const { socket, connected } = useSocket("overlay");
  const { state } = useRoom(socket);

  const spotlightCard = state.spotlight;

  return (
    <div
      style={{
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        position: "relative",
        background: "transparent",
        overflow: "hidden",
      }}
    >
      {/* Card layer */}
      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        <CardRenderer cards={state.cards} />
      </div>

      {/* Drawing layer */}
      <DrawRenderer socket={socket} connected={connected} />

      {/* Spotlight */}
      <Spotlight card={spotlightCard} />

      {/* Connection indicator (top-right, small) */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: connected ? "#27ae60" : "#c0392b",
          zIndex: 9999,
        }}
      />
    </div>
  );
}
