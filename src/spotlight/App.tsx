import { useRoom, useSocket } from "@shared/socket";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { useBrandSettings } from "@shared/brand";
import { Spotlight } from "../overlay/components/Spotlight";

export function App() {
  const { socket } = useSocket("overlay");
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
      <Spotlight card={state.spotlight} />
    </div>
  );
}
