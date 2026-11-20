import type { Point } from "../../../shared/types";
export function coordinates(e: PointerEvent, svg: SVGSVGElement): Point {
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
    svg.getScreenCTM()!.inverse(),
  );
  return { x: p.x, y: p.y };
}
