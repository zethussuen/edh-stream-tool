import { useRoom, useSocket } from "@shared/socket";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { useBrandSettings } from "@shared/brand";
import { CardRenderer } from "../overlay/components/CardRenderer";
import { DrawRenderer } from "../overlay/components/DrawRenderer";

export function App() {
  const { socket, connected } = useSocket("overlay");
  const { state } = useRoom(socket);
  useBrandSettings(socket);

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
      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        <CardRenderer cards={state.cards} />
      </div>
      <DrawRenderer socket={socket} connected={connected} />
    </div>
  );
}
