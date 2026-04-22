import { useEffect, useState } from "react";
import { useSocket } from "@shared/socket";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import type { NamePlate } from "@shared/types";
import { NamePlates } from "../overlay/components/NamePlates";

export function App() {
  const { socket } = useSocket("overlay");
  const [namePlates, setNamePlates] = useState<NamePlate[] | null>(null);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: NamePlate[] | null) => setNamePlates(data);
    s.on("namePlates:updated", handler);
    return () => { s.off("namePlates:updated", handler); };
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
      <NamePlates plates={namePlates} />
    </div>
  );
}
