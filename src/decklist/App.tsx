import { useEffect, useState } from "react";
import { useSocket } from "@shared/socket";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import type { DecklistOverlayData } from "@shared/types";
import { DecklistOverlay } from "../overlay/components/DecklistOverlay";

export function App() {
  const { socket } = useSocket("overlay");
  const [decklist, setDecklist] = useState<DecklistOverlayData | null>(null);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: DecklistOverlayData | null) => setDecklist(data);
    s.on("decklist:updated", handler);
    return () => { s.off("decklist:updated", handler); };
  }, [socket]);

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
      <DecklistOverlay data={decklist} />
    </div>
  );
}
