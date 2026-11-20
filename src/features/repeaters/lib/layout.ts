import type {
  GridRepeater,
  PathRepeater,
  Repeater,
  RingRepeater,
  Shape,
} from "../../../shared/types";
import { pointAtLength, sampleArcLength } from "./geometry";

export interface Slot {
  /** 稳定槽位标识：路径/环形为线性序号，网格为 "列,行"；改数量后例外仍按它认领 */
  slot: string;
  x: number;
  y: number;
  /** 槽位基础朝向（度），未含重复器 orientation 与例外旋转 */
  angle: number;
  /** 末端不足一整步：true 表示该槽超出可用范围，需留空 */
  clipped: boolean;
}

export interface RepeaterLayout {
  repeater: Repeater;
  source: Shape;
  slots: Slot[];
  /** 实际采用的步距（fit 模式下为调整后的间距），供面板展示联动结果 */
  effectiveSpacing: number;
}

const deg = (rad: number) => (rad * 180) / Math.PI;

/**
 * 路径重复器：按弧长分配。
 * - blank：保持设定间距，超过轨道长度的槽位留空；
 * - fit：调整间距，让所有副本均匀铺满轨道。
 */
function layoutPath(r: PathRepeater, shapes: Shape[]): RepeaterLayout | null {
  const source = shapes.find((s) => s.id === r.sourceId);
  const guide = shapes.find((s) => s.id === r.guideId);
  if (!source || !guide || guide.nodes.length < 2) return null;
  const samples = sampleArcLength(guide);
  const total = samples[samples.length - 1].s;
  const slots: Slot[] = [];
  const fit = r.remainder === "fit" && r.count > 1;
  const step = fit
    ? Math.max(0, (total - r.offset) / (r.count - 1))
    : r.spacing;
  for (let i = 0; i < r.count; i++) {
    const s = r.offset + i * step;
    const clipped = r.remainder === "blank" && s > total + 1e-6;
    const p = pointAtLength(samples, Math.min(s, total));
    slots.push({
      slot: String(i),
      x: p.x,
      y: p.y,
      angle: r.follow ? deg(p.angle) : 0,
      clipped,
    });
  }
  return { repeater: r, source, slots, effectiveSpacing: step };
}

/** 环形重复器：整环均分首尾相接，扇形按端点数均布扫掠角 */
function layoutRing(r: RingRepeater, source: Shape): RepeaterLayout {
  const full = r.sweep >= 360;
  const span = full ? 360 : r.sweep;
  const denom = full ? r.count : Math.max(1, r.count - 1);
  const slots: Slot[] = [];
  for (let i = 0; i < r.count; i++) {
    const a = (r.startAngle + (span * i) / denom) * (Math.PI / 180);
    slots.push({
      slot: String(i),
      x: r.cx + Math.cos(a) * r.radius,
      y: r.cy + Math.sin(a) * r.radius,
      angle: r.follow ? deg(a) + 90 : 0,
      clipped: false,
    });
  }
  const effectiveSpacing = (2 * Math.PI * r.radius * (span / 360)) / denom;
  return { repeater: r, source, slots, effectiveSpacing };
}

/** 二维网格重复器：槽位 id 为 "列,行"，加列不移动已有列的标识 */
function layoutGrid(r: GridRepeater, source: Shape): RepeaterLayout {
  const base = (r.rotation * Math.PI) / 180;
  const cos = Math.cos(base),
    sin = Math.sin(base);
  const slots: Slot[] = [];
  for (let row = 0; row < r.rows; row++) {
    for (let col = 0; col < r.cols; col++) {
      const lx = (col - (r.cols - 1) / 2) * r.spacingX;
      const ly = (row - (r.rows - 1) / 2) * r.spacingY;
      slots.push({
        slot: `${col},${row}`,
        x: r.cx + lx * cos - ly * sin,
        y: r.cy + lx * sin + ly * cos,
        angle: r.rotation,
        clipped: false,
      });
    }
  }
  return {
    repeater: r,
    source,
    slots,
    effectiveSpacing: r.spacingX,
  };
}

/** 计算单个重复器的槽位布局；源图形缺失时返回 null */
export function buildLayout(
  r: Repeater,
  shapes: Shape[],
): RepeaterLayout | null {
  const source = shapes.find((s) => s.id === r.sourceId);
  if (!source) return null;
  if (r.type === "path") return layoutPath(r, shapes);
  if (r.type === "ring") return layoutRing(r, source);
  return layoutGrid(r, source);
}

export function allLayouts(shapes: Shape[], repeaters: Repeater[]) {
  return repeaters
    .map((r) => buildLayout(r, shapes))
    .filter((l): l is RepeaterLayout => l !== null);
}
