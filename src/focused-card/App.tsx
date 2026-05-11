import { useEffect, useState } from "react";
import { useSocket } from "@shared/socket";
import type { FocusedCardData } from "@shared/types";
import { useBrandSettings } from "@shared/brand";

const WIDTH = 672;
const HEIGHT = 936;

export function App() {
  const { socket } = useSocket("overlay");
  useBrandSettings(socket);
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
        setTimeout(() => setCard(null), 300);
      }
    };
    s.on("focusedCard:updated", handler);
    return () => { s.off("focusedCard:updated", handler); };
  }, [socket]);

  const isDFC = !!card?.backFace;
  const isFlipped = card?.flipped ?? false;

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        position: "relative",
        background: "transparent",
        overflow: "hidden",
        perspective: 1200,
      }}
    >
      {card && (
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transformStyle: "preserve-3d",
            transition: isDFC ? "transform 0.5s ease" : "none",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            opacity: visible ? 1 : 0,
          }}
        >
          {/* Entry/exit fade wrapper — on the outer container */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transition: "opacity 0.3s ease, transform 0.3s ease",
              transform: visible ? "scale(1)" : "scale(0.95)",
            }}
          >
            {/* Front face */}
            <img
              src={card.imageUriLarge}
              alt={card.name}
              style={{
                width: WIDTH,
                height: HEIGHT,
                borderRadius: 18,
                position: "absolute",
                inset: 0,
                backfaceVisibility: isDFC ? "hidden" : "visible",
                WebkitBackfaceVisibility: isDFC ? "hidden" : "visible",
              }}
            />
            {/* Back face */}
            {isDFC && (
              <img
                src={card.backFace!.imageUriLarge}
                alt={card.backFace!.name}
                style={{
                  width: WIDTH,
                  height: HEIGHT,
                  borderRadius: 18,
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
