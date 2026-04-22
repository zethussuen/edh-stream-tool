import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { DrawStroke, DrawStrokeLocal, DrawTool } from "@shared/types";
import {
  FADE_DELAY,
  FADE_DURATION,
  OVERLAY_HEIGHT,
  OVERLAY_WIDTH,
} from "@shared/constants";
import { drawStroke } from "@shared/drawing";
import type { Socket } from "socket.io-client";
import { useDrawReceiver } from "@shared/socket";

function buildCursor(tool: DrawTool, strokeWidth: number, color: string, scale: number): string {
  if (tool === "pen") {
    // Circle cursor sized to brush — shows exact stroke footprint
    const r = Math.max((strokeWidth * scale) / 2, 3);
    const size = Math.ceil(r * 2 + 2);
    const c = size / 2;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><circle cx='${c}' cy='${c}' r='${r}' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='1.5' opacity='0.8'/><circle cx='${c}' cy='${c}' r='1' fill='${encodeURIComponent(color)}'/></svg>`;
    return `url("data:image/svg+xml,${svg}") ${c} ${c}, crosshair`;
  }
  if (tool === "arrow") {
    // Crosshair with a small arrow hint
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><line x1='12' y1='0' x2='12' y2='24' stroke='white' stroke-width='1' opacity='0.6'/><line x1='0' y1='12' x2='24' y2='12' stroke='white' stroke-width='1' opacity='0.6'/><polyline points='16,6 20,2 14,2' fill='none' stroke='white' stroke-width='1.5' opacity='0.8'/></svg>`;
    return `url("data:image/svg+xml,${svg}") 12 12, crosshair`;
  }
  if (tool === "circle") {
    // Crosshair with small circle hint
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><line x1='12' y1='0' x2='12' y2='24' stroke='white' stroke-width='1' opacity='0.6'/><line x1='0' y1='12' x2='24' y2='12' stroke='white' stroke-width='1' opacity='0.6'/><circle cx='12' cy='12' r='6' fill='none' stroke='white' stroke-width='1.5' opacity='0.8'/></svg>`;
    return `url("data:image/svg+xml,${svg}") 12 12, crosshair`;
  }
  return "default";
}

export interface DrawLayerHandle {
  undo: () => void;
  clear: () => void;
}

interface Props {
  tool: DrawTool;
  color: string;
  strokeWidth: number;
  scale: number;
  socket: React.RefObject<Socket | null>;
  connected: boolean;
  active: boolean;
  autoFade: boolean;
}

export const DrawLayer = forwardRef<DrawLayerHandle, Props>(function DrawLayer({
  tool,
  color,
  strokeWidth,
  scale,
  socket,
  connected,
  active,
  autoFade,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<DrawStrokeLocal[]>([]);
  const lastProgressEmit = useRef(0);
  const drawingRef = useRef<{
    type: "pen" | "arrow" | "circle";
    startX: number;
    startY: number;
    points: { x: number; y: number }[];
  } | null>(null);
  const rafRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    undo: () => {
      strokesRef.current.pop();
      socket.current?.emit("draw:undo");
    },
    clear: () => {
      strokesRef.current = [];
      socket.current?.emit("draw:clear");
    },
  }), [socket]);

  // Remote in-progress strokes (keyed by sender socket ID)
  const remoteProgressRef = useRef<Map<string, DrawStroke>>(new Map());

  // Receive remote strokes
  const onRemoteStroke = useCallback((stroke: DrawStroke & { senderId?: string }) => {
    if (stroke.senderId) remoteProgressRef.current.delete(stroke.senderId);
    strokesRef.current.push({
      ...stroke,
      fadeStart: autoFade ? Date.now() + FADE_DELAY : Infinity,
    });
  }, [autoFade]);

  const onRemoteUndo = useCallback(() => {
    strokesRef.current.pop();
  }, []);

  const onRemoteClear = useCallback(() => {
    strokesRef.current = [];
    remoteProgressRef.current.clear();
  }, []);

  const onRemoteProgress = useCallback((stroke: DrawStroke & { senderId: string }) => {
    remoteProgressRef.current.set(stroke.senderId, stroke);
  }, []);

  useDrawReceiver(socket, connected, onRemoteStroke, onRemoteUndo, onRemoteClear, onRemoteProgress);

  const toCanvas = useCallback(
    (e: React.PointerEvent): { x: number; y: number } => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (tool === "select" || e.button !== 0) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const pt = toCanvas(e);
      drawingRef.current = {
        type: tool as "pen" | "arrow" | "circle",
        startX: pt.x,
        startY: pt.y,
        points: [pt],
      };
    },
    [tool, toCanvas],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drawingRef.current;
      if (!d) return;
      const pt = toCanvas(e);
      d.points.push(pt);

      // Stream in-progress stroke to other clients (~30fps throttle)
      const now = Date.now();
      if (now - lastProgressEmit.current >= 33) {
        lastProgressEmit.current = now;
        if (d.type === "pen") {
          socket.current?.emit("draw:progress", {
            type: "pen", color, width: strokeWidth, points: [...d.points],
          });
        } else if (d.type === "arrow" && d.points.length >= 2) {
          socket.current?.emit("draw:progress", {
            type: "arrow", color, width: strokeWidth,
            points: [d.points[0], d.points[d.points.length - 1]],
          });
        } else if (d.type === "circle" && d.points.length >= 2) {
          const end = d.points[d.points.length - 1];
          socket.current?.emit("draw:progress", {
            type: "circle", color, width: strokeWidth,
            cx: (d.startX + end.x) / 2, cy: (d.startY + end.y) / 2,
            rx: Math.abs(end.x - d.startX) / 2, ry: Math.abs(end.y - d.startY) / 2,
          });
        }
      }
    },
    [toCanvas, color, strokeWidth, socket],
  );

  const onPointerUp = useCallback(() => {
    const d = drawingRef.current;
    if (!d) return;
    drawingRef.current = null;

    let stroke: DrawStroke;

    if (d.type === "pen") {
      stroke = { type: "pen", color, width: strokeWidth, points: d.points };
    } else if (d.type === "arrow") {
      stroke = {
        type: "arrow",
        color,
        width: strokeWidth,
        points: [d.points[0], d.points[d.points.length - 1]],
      };
    } else {
      // circle
      const end = d.points[d.points.length - 1];
      const cx = (d.startX + end.x) / 2;
      const cy = (d.startY + end.y) / 2;
      const rx = Math.abs(end.x - d.startX) / 2;
      const ry = Math.abs(end.y - d.startY) / 2;
      stroke = { type: "circle", color, width: strokeWidth, cx, cy, rx, ry };
    }

    strokesRef.current.push({
      ...stroke,
      fadeStart: autoFade ? Date.now() + FADE_DELAY : Infinity,
    });
    socket.current?.emit("draw:stroke", stroke);
  }, [color, strokeWidth, socket, autoFade]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function render() {
      const now = Date.now();
      ctx!.clearRect(0, 0, OVERLAY_WIDTH, OVERLAY_HEIGHT);

      // Remove faded
      strokesRef.current = strokesRef.current.filter((s) => {
        if (now < s.fadeStart) return true;
        return now - s.fadeStart < FADE_DURATION;
      });

      // Draw completed strokes
      for (const stroke of strokesRef.current) {
        let alpha = 1;
        if (now >= stroke.fadeStart) {
          alpha = 1 - (now - stroke.fadeStart) / FADE_DURATION;
        }
        drawStroke(ctx!, stroke, Math.max(0, alpha));
      }

      // Draw in-progress stroke
      const d = drawingRef.current;
      if (d && d.points.length > 0) {
        if (d.type === "pen") {
          drawStroke(
            ctx!,
            { type: "pen", color, width: strokeWidth, points: d.points },
            1,
          );
        } else if (d.type === "arrow" && d.points.length >= 2) {
          drawStroke(
            ctx!,
            {
              type: "arrow",
              color,
              width: strokeWidth,
              points: [d.points[0], d.points[d.points.length - 1]],
            },
            1,
          );
        } else if (d.type === "circle" && d.points.length >= 2) {
          const end = d.points[d.points.length - 1];
          drawStroke(
            ctx!,
            {
              type: "circle",
              color,
              width: strokeWidth,
              cx: (d.startX + end.x) / 2,
              cy: (d.startY + end.y) / 2,
              rx: Math.abs(end.x - d.startX) / 2,
              ry: Math.abs(end.y - d.startY) / 2,
            },
            1,
          );
        }
      }

      // Draw in-progress remote strokes
      for (const stroke of remoteProgressRef.current.values()) {
        drawStroke(ctx!, stroke, 1);
      }

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, strokeWidth]);

  const cursor = useMemo(
    () => active ? buildCursor(tool, strokeWidth, color, scale) : "default",
    [active, tool, strokeWidth, color, scale],
  );

  return (
    <canvas
      ref={canvasRef}
      width={OVERLAY_WIDTH}
      height={OVERLAY_HEIGHT}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "absolute",
        inset: 0,
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        zIndex: 20,
        pointerEvents: active ? "auto" : "none",
        cursor,
      }}
    />
  );
});
