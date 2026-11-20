import type { Node, Point, Shape } from "../../../shared/types";

/** 三次贝塞尔在 t 处的点 */
export function cubicPoint(a: Node, b: Node, t: number): Point {
  const u = 1 - t;
  const p0 = a,
    p1 = a.out,
    p2 = b.in,
    p3 = b;
  return {
    x:
      u ** 3 * p0.x +
      3 * u * u * t * p1.x +
      3 * u * t * t * p2.x +
      t ** 3 * p3.x,
    y:
      u ** 3 * p0.y +
      3 * u * u * t * p1.y +
      3 * u * t * t * p2.y +
      t ** 3 * p3.y,
  };
}

/** 三次贝塞尔在 t 处的切线方向（单位向量） */
export function cubicTangent(a: Node, b: Node, t: number): Point {
  const u = 1 - t;
  const dx =
    3 * u * u * (a.out.x - a.x) +
    6 * u * t * (b.in.x - a.out.x) +
    3 * t * t * (b.x - b.in.x);
  const dy =
    3 * u * u * (a.out.y - a.y) +
    6 * u * t * (b.in.y - a.out.y) +
    3 * t * t * (b.y - b.in.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export interface Sample {
  /** 累计弧长 */
  s: number;
  x: number;
  y: number;
  /** 切线角（弧度） */
  angle: number;
}

/** 将路径细分为按弧长参数化的折线采样，支持闭合路径 */
export function sampleArcLength(shape: Shape, stepsPerSegment = 24): Sample[] {
  const n = shape.nodes;
  if (n.length === 0) return [];
  if (n.length === 1) return [{ s: 0, x: n[0].x, y: n[0].y, angle: 0 }];
  const segments: [Node, Node][] = [];
  const last = shape.closed ? n.length : n.length - 1;
  for (let i = 0; i < last; i++) {
    segments.push([n[i], n[(i + 1) % n.length]]);
  }
  const out: Sample[] = [{ s: 0, x: n[0].x, y: n[0].y, angle: 0 }];
  let total = 0;
  for (const [a, b] of segments) {
    let prev = cubicPoint(a, b, 0);
    for (let k = 1; k <= stepsPerSegment; k++) {
      const t = k / stepsPerSegment;
      const p = cubicPoint(a, b, t);
      total += Math.hypot(p.x - prev.x, p.y - prev.y);
      const tg = cubicTangent(a, b, t);
      out.push({
        s: total,
        x: p.x,
        y: p.y,
        angle: Math.atan2(tg.y, tg.x),
      });
      prev = p;
    }
  }
  if (out.length > 1) out[0].angle = out[1].angle;
  return out;
}

/** 在弧长采样上按距离插值取点（s 超出范围时夹紧到端点） */
export function pointAtLength(samples: Sample[], s: number): Sample {
  if (samples.length === 1) return samples[0];
  if (s <= 0) return samples[0];
  const total = samples[samples.length - 1].s;
  if (s >= total) return samples[samples.length - 1];
  let lo = 0,
    hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].s <= s) lo = mid;
    else hi = mid;
  }
  const a = samples[lo],
    b = samples[hi];
  const t = b.s === a.s ? 0 : (s - a.s) / (b.s - a.s);
  return {
    s,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: a.angle + (b.angle - a.angle) * t,
  };
}

/** 图形的包围盒中心，作为副本局部坐标系原点 */
export function shapeCenter(shape: Shape): Point {
  if (!shape.nodes.length) return { x: 0, y: 0 };
  const xs = shape.nodes.map((n) => n.x);
  const ys = shape.nodes.map((n) => n.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** 把源图形节点按“中心平移 + 旋转 + 缩放 + 平移”变换为独立节点数据 */
export function transformShape(
  shape: Shape,
  slot: { x: number; y: number; angle: number },
  exception: { dx: number; dy: number; rotation: number; scale: number },
): Shape["nodes"] {
  const c = shapeCenter(shape);
  const cos = Math.cos(rad(slot.angle + exception.rotation));
  const sin = Math.sin(rad(slot.angle + exception.rotation));
  const k = exception.scale;
  return shape.nodes.map((n) => {
    const apply = (p: Point): Point => {
      const rx = (p.x - c.x) * k;
      const ry = (p.y - c.y) * k;
      return {
        x: slot.x + exception.dx + rx * cos - ry * sin,
        y: slot.y + exception.dy + rx * sin + ry * cos,
      };
    };
    return { ...apply(n), in: apply(n.in), out: apply(n.out) };
  });
}
