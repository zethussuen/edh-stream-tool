import { useEffect, useState } from "react";
import { useSocket } from "@shared/socket";
import type { FocusedCardData } from "@shared/types";

const WIDTH = 672;
const HEIGHT = 936;

export function App() {
  const { socket } = useSocket("overlay");
  const [card, setCard] = useState<FocusedCardData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: FocusedCardData | null) => {
      if (data) {
        setCard(data);
        setTimeout(() => setVisible(true), 0);
      } else {
        setVisible(false);
        // Wait for exit animation before clearing
        setTimeout(() => setCard(null), 300);
      }
    };
    s.on("focusedCard:updated", handler);
    return () => { s.off("focusedCard:updated", handler); };
  }, [socket]);

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        position: "relative",
        background: "transparent",
        overflow: "hidden",
      }}
    >
      {card && (
        <img
          src={card.imageUriLarge}
          alt={card.name}
          style={{
            width: WIDTH,
            height: HEIGHT,
            borderRadius: 18,
            transition: "opacity 0.3s ease, transform 0.3s ease",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.95)",
          }}
        />
      )}
    </div>
  );
}
