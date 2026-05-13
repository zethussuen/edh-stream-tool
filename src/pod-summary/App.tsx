import { useEffect, useState } from "react";
import type { PodSummaryData } from "@shared/types";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { useSocket } from "@shared/socket";
import { useBrandSettings } from "@shared/brand";
import { PodSummary } from "../overlay/components/PodSummary";

export function App() {
  const { socket } = useSocket("overlay");
  useBrandSettings(socket);
  const [data, setData] = useState<PodSummaryData | null>(null);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (next: PodSummaryData | null) => setData(next);
    s.on("podSummary:updated", handler);
    return () => { s.off("podSummary:updated", handler); };
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
      <PodSummary data={data} />
    </div>
  );
}
