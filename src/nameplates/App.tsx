import { useEffect, useState } from "react";
import { useSocket } from "@shared/socket";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import type { NamePlate, StreamPlayerStats } from "@shared/types";
import { useBrandSettings } from "@shared/brand";
import { NamePlates } from "../overlay/components/NamePlates";

export function App() {
  const { socket } = useSocket("overlay");
  useBrandSettings(socket);
  const [namePlates, setNamePlates] = useState<NamePlate[] | null>(null);
  const [streamStats, setStreamStats] = useState<StreamPlayerStats[] | null>(null);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: NamePlate[] | null) => setNamePlates(data);
    s.on("namePlates:updated", handler);
    return () => { s.off("namePlates:updated", handler); };
  }, [socket]);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: StreamPlayerStats[] | null) => setStreamStats(data);
    s.on("streamStats:updated", handler);
    return () => { s.off("streamStats:updated", handler); };
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
      <NamePlates plates={namePlates} stats={streamStats} />
    </div>
  );
}
