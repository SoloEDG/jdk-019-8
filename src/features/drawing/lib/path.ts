import type { Shape } from "../../../shared/types";
export function path(s: Shape) {
  if (!s.nodes.length) return "";
  let d = `M ${s.nodes[0].x} ${s.nodes[0].y}`;
  const n = s.nodes;
  for (let i = 1; i < n.length + (s.closed ? 1 : 0); i++) {
    const a = n[i - 1],
      b = n[i % n.length];
    d += ` C ${a.out.x} ${a.out.y} ${b.in.x} ${b.in.y} ${b.x} ${b.y}`;
  }
  return d + (s.closed ? " Z" : "");
}
