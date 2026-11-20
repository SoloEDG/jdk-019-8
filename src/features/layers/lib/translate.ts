import type { Shape } from "../../../shared/types";
export function translate(s: Shape, x: number, y: number) {
  s.nodes.forEach((n) => {
    n.x += x;
    n.y += y;
    n.in.x += x;
    n.in.y += y;
    n.out.x += x;
    n.out.y += y;
  });
}
