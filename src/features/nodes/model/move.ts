import type { Node, Point } from "../../../shared/types";
export function move(n: Node, p: Point) {
  const dx = p.x - n.x,
    dy = p.y - n.y;
  n.in.x += dx;
  n.in.y += dy;
  n.out.x += dx;
  n.out.y += dy;
  n.x = p.x;
  n.y = p.y;
}
