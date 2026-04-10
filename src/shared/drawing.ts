import type { DrawStroke } from "./types";

const OUTLINE_COLOR = "rgba(0, 0, 0, 0.7)";
const OUTLINE_EXTRA = 4; // px added to each side of the stroke

function tracePath(ctx: CanvasRenderingContext2D, stroke: DrawStroke) {
  if (stroke.type === "pen" && stroke.points && stroke.points.length > 0) {
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  } else if (
    stroke.type === "arrow" &&
    stroke.points &&
    stroke.points.length >= 2
  ) {
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLen = stroke.width * 4;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLen * Math.cos(angle - Math.PI / 6),
      end.y - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLen * Math.cos(angle + Math.PI / 6),
      end.y - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();
  } else if (
    stroke.type === "circle" &&
    stroke.cx != null &&
    stroke.cy != null &&
    stroke.rx != null &&
    stroke.ry != null
  ) {
    ctx.beginPath();
    ctx.ellipse(
      stroke.cx,
      stroke.cy,
      Math.abs(stroke.rx),
      Math.abs(stroke.ry),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawStroke,
  alpha: number,
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Dark outline for contrast against any background
  ctx.globalAlpha = alpha * 0.7;
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = stroke.width + OUTLINE_EXTRA;
  tracePath(ctx, stroke);

  // Colored stroke on top
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  tracePath(ctx, stroke);

  ctx.globalAlpha = 1;
}
