import { useCallback, useEffect, useRef } from "react";
import type { DrawStroke, DrawStrokeLocal } from "@shared/types";
import { FADE_DELAY, FADE_DURATION, OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { drawStroke } from "@shared/drawing";
import type { Socket } from "socket.io-client";
import { useDrawReceiver } from "@shared/socket";

interface Props {
  socket: React.RefObject<Socket | null>;
  connected: boolean;
}

export function DrawRenderer({ socket, connected }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<DrawStrokeLocal[]>([]);
  const progressRef = useRef<Map<string, DrawStroke>>(new Map());
  const rafRef = useRef<number>(0);

  const onStroke = useCallback((stroke: DrawStroke & { senderId?: string }) => {
    // Completed stroke — remove the in-progress version and add final
    if (stroke.senderId) progressRef.current.delete(stroke.senderId);
    strokesRef.current.push({
      ...stroke,
      fadeStart: Date.now() + FADE_DELAY,
    });
  }, []);

  const onUndo = useCallback(() => {
    strokesRef.current.pop();
  }, []);

  const onClear = useCallback(() => {
    strokesRef.current = [];
    progressRef.current.clear();
  }, []);

  const onProgress = useCallback((stroke: DrawStroke & { senderId: string }) => {
    progressRef.current.set(stroke.senderId, stroke);
  }, []);

  useDrawReceiver(socket, connected, onStroke, onUndo, onClear, onProgress);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function render() {
      const now = Date.now();
      ctx!.clearRect(0, 0, OVERLAY_WIDTH, OVERLAY_HEIGHT);

      // Remove fully faded strokes
      strokesRef.current = strokesRef.current.filter((s) => {
        if (now < s.fadeStart) return true;
        const elapsed = now - s.fadeStart;
        return elapsed < FADE_DURATION;
      });

      // Draw completed strokes
      for (const stroke of strokesRef.current) {
        let alpha = 1;
        if (now >= stroke.fadeStart) {
          alpha = 1 - (now - stroke.fadeStart) / FADE_DURATION;
        }
        drawStroke(ctx!, stroke, Math.max(0, alpha));
      }

      // Draw in-progress remote strokes
      for (const stroke of progressRef.current.values()) {
        drawStroke(ctx!, stroke, 1);
      }

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={OVERLAY_WIDTH}
      height={OVERLAY_HEIGHT}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        pointerEvents: "none",
        zIndex: 20,
      }}
    />
  );
}
