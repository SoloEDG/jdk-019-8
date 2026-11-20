import type { Repeater, Shape } from "../../../shared/types";
import type { RepeaterLayout, Slot } from "./layout";
import { transformShape } from "./geometry";
import { path } from "../../drawing/lib/path";

export interface ResolvedInstance {
  repeaterId: string;
  slot: string;
  x: number;
  y: number;
  angle: number;
  hidden: boolean;
  clipped: boolean;
}

/** 按稳定槽位 id 认领例外；数量变化后不会错套到相邻位置 */
export function findException(r: Repeater, slot: string) {
  return r.exceptions.find((e) => e.slot === slot);
}

export function resolveInstance(
  layout: RepeaterLayout,
  slot: Slot,
): ResolvedInstance {
  const r = layout.repeater;
  const ex = findException(r, slot.slot);
  return {
    repeaterId: r.id,
    slot: slot.slot,
    x: slot.x + (ex?.dx ?? 0),
    y: slot.y + (ex?.dy ?? 0),
    angle: slot.angle + r.orientation + (ex?.rotation ?? 0),
    hidden: !!ex?.hidden,
    clipped: slot.clipped,
  };
}

export function visibleInstances(layout: RepeaterLayout) {
  return layout.slots
    .map((s) => resolveInstance(layout, s))
    .filter((i) => !i.clipped && !i.hidden);
}

/**
 * 快速预览：整个重复器合并为一条 SVG path（DOM 节点数与副本数无关），
 * 但路径数据由源图形的真实贝塞尔节点变换得到，不是屏幕像素快照。
 */
export function buildPathData(layout: RepeaterLayout): string {
  const r = layout.repeater;
  const parts: string[] = [];
  for (const slot of layout.slots) {
    if (slot.clipped) continue;
    const ex = findException(r, slot.slot);
    if (ex?.hidden) continue;
    const nodes = transformShape(
      layout.source,
      {
        x: slot.x + (ex?.dx ?? 0),
        y: slot.y + (ex?.dy ?? 0),
        angle: slot.angle + r.orientation + (ex?.rotation ?? 0),
      },
      {
        dx: 0,
        dy: 0,
        rotation: 0,
        scale: ex?.scale ?? 1,
      },
    );
    const d = path({ ...layout.source, nodes });
    if (d) parts.push(d);
  }
  return parts.join(" ");
}

/** 命中测试：返回距离点击点最近且在阈值内的副本 */
export function hitTest(
  layouts: RepeaterLayout[],
  p: { x: number; y: number },
  threshold = 24,
): ResolvedInstance | null {
  let best: { i: ResolvedInstance; d: number } | null = null;
  for (const layout of layouts) {
    for (const i of visibleInstances(layout)) {
      const d = Math.hypot(i.x - p.x, i.y - p.y);
      if (d < threshold && (!best || d < best.d)) best = { i, d };
    }
  }
  return best?.i ?? null;
}

/**
 * 展开：每个可见副本成为带独立节点数据的真实 Shape，
 * 归到同一实际分组层级；源图形与规则本身由调用方决定保留/移除。
 */
export function materialize(layout: RepeaterLayout): Shape[] {
  const r = layout.repeater;
  const group = `expanded-${r.id}`;
  return visibleInstances(layout).map((i) => {
    const ex = findException(r, i.slot);
    const nodes = transformShape(
      layout.source,
      { x: i.x, y: i.y, angle: i.angle },
      { dx: 0, dy: 0, rotation: 0, scale: ex?.scale ?? 1 },
    );
    return {
      // JSON 深拷贝：既脱离响应式代理，也保证副本节点与源图形完全不共享引用
      ...JSON.parse(JSON.stringify(layout.source)),
      id: crypto.randomUUID(),
      name: `${layout.source.name} · ${r.name} #${i.slot}`,
      nodes,
      group,
    };
  });
}
