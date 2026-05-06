import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { DEFAULT_CARD_HEIGHT, DEFAULT_CARD_WIDTH, OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import type { ScryfallCard } from "@shared/types";
import { cardAddPayload } from "@shared/cards";
import type { Socket } from "socket.io-client";
import { useFeedReceiver } from "@shared/feed";

interface Props {
  children: ReactNode;
  socket?: React.RefObject<Socket | null>;
  connected?: boolean;
  previewVideoRef?: React.RefObject<HTMLVideoElement | null>;
  emit?: (event: string, data?: unknown) => void;
  isEmpty?: boolean;
}

export function PreviewCanvas({ children, socket, connected, previewVideoRef, emit, isEmpty }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scale, setScale] = useState(1);

  const { feedConnected } = useFeedReceiver(socket, connected ?? false, videoRef);

  const activeVideoRef = previewVideoRef ?? videoRef;
  const showVideo = previewVideoRef ? true : feedConnected;

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!emit) return;
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;

      let card: ScryfallCard;
      try {
        card = JSON.parse(raw);
      } catch {
        return;
      }
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) / scale - DEFAULT_CARD_WIDTH / 2);
      const y = Math.round((e.clientY - rect.top) / scale - DEFAULT_CARD_HEIGHT / 2);

      emit("card:add", cardAddPayload(card, {
        x: Math.max(0, Math.min(x, OVERLAY_WIDTH - DEFAULT_CARD_WIDTH)),
        y: Math.max(0, Math.min(y, OVERLAY_HEIGHT - DEFAULT_CARD_HEIGHT)),
      }));
    },
    [scale, emit],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const sx = width / OVERLAY_WIDTH;
      const sy = height / OVERLAY_HEIGHT;
      setScale(Math.min(sx, sy));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-bg-base"
      style={{ width: "100%", height: "100%" }}
    >
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          width: OVERLAY_WIDTH,
          height: OVERLAY_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        {/* Checkerboard background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `repeating-conic-gradient(#1a1a1f 0% 25%, #131316 0% 50%) 0 0 / 40px 40px`,
            zIndex: 0,
          }}
        />

        {/* Video feed */}
        <video
          ref={activeVideoRef}
          style={{
            position: "absolute",
            inset: 0,
            width: OVERLAY_WIDTH,
            height: OVERLAY_HEIGHT,
            objectFit: "cover",
            display: showVideo ? "block" : "none",
            zIndex: 1,
          }}
          autoPlay
          muted
          playsInline
        />

        {/* Empty canvas hint */}
        {isEmpty && !showVideo && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <p style={{ color: "#55524a", fontSize: 14, fontFamily: "JetBrains Mono, monospace" }}>
              Drag cards here from the sidebar, or use Search to find cards
            </p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}


