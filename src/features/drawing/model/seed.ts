import { doc } from "../../../shared/document";
import type { RingRepeater } from "../../../shared/types";

/** 一个用作重复原件的花瓣图形 */
function petal(cx: number, cy: number, scale = 1) {
  const nodes = Array.from({ length: 4 }, (_, i) => {
    const t = (i * Math.PI) / 2;
    const x = cx + Math.cos(t) * 32 * scale,
      y = cy + Math.sin(t) * 32 * scale;
    return {
      x,
      y,
      in: {
        x: x + Math.sin(t) * 18 * scale,
        y: y - Math.cos(t) * 18 * scale,
      },
      out: {
        x: x - Math.sin(t) * 18 * scale,
        y: y + Math.cos(t) * 18 * scale,
      },
    };
  });
  return {
    id: "petal-source",
    name: "Petal source",
    nodes,
    closed: true,
    fill: "#7850d6",
    stroke: "#ffffff",
    width: 2,
    opacity: 1,
  };
}

export function seed() {
  doc.shapes.push(petal(400, 150));
  const ring: RingRepeater = {
    id: "seed-ring",
    type: "ring",
    name: "Ring repeat 1",
    sourceId: "petal-source",
    count: 12,
    orientation: 0,
    follow: true,
    exceptions: [],
    cx: 400,
    cy: 320,
    radius: 150,
    startAngle: 0,
    sweep: 360,
  };
  doc.repeaters.push(ring);
  doc.selectedRepeater = ring.id;
}
