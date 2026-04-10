import { useEffect, useRef, useState, type ReactNode } from "react";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import type { Socket } from "socket.io-client";
import { useFeedReceiver } from "@shared/feed";

interface Props {
  children: ReactNode;
  socket?: React.RefObject<Socket | null>;
  connected?: boolean;
  previewVideoRef?: React.RefObject<HTMLVideoElement | null>;
}

export function PreviewCanvas({ children, socket, connected, previewVideoRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scale, setScale] = useState(1);

  const { feedConnected } = useFeedReceiver(socket, connected ?? false, videoRef);

  const activeVideoRef = previewVideoRef ?? videoRef;
  const showVideo = previewVideoRef ? true : feedConnected;

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

        {children}
      </div>
    </div>
  );
}

export function useCanvasScale(containerRef: React.RefObject<HTMLDivElement | null>): number {
  const [scale, setScale] = useState(1);

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
  }, [containerRef]);

  return scale;
}
