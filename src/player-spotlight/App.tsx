import { useEffect, useState } from "react";
import type { PlayerSpotlightData } from "@shared/types";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { useSocket } from "@shared/socket";
import { useBrandSettings } from "@shared/brand";
import { PlayerSpotlight } from "../overlay/components/PlayerSpotlight";

export function App() {
  const { socket } = useSocket("overlay");
  useBrandSettings(socket);
  const [data, setData] = useState<PlayerSpotlightData | null>(null);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (next: PlayerSpotlightData | null) => setData(next);
    s.on("playerSpotlight:updated", handler);
    return () => { s.off("playerSpotlight:updated", handler); };
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
      <PlayerSpotlight data={data} />
    </div>
  );
}
