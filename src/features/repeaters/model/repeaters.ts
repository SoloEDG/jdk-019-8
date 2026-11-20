import { beginEdit } from "../../drawing";
import { doc } from "../../../shared/document";
import type {
  GridRepeater,
  InstanceException,
  PathRepeater,
  Repeater,
  RingRepeater,
} from "../../../shared/types";
import { buildLayout } from "../lib/layout";
import { materialize } from "../lib/instances";

let seq = 1;
function name(prefix: string) {
  return `${prefix} ${seq++}`;
}

/** 由当前选择创建重复器；路径类型需要第二个图形作为轨道 */
export function createRepeater(
  type: Repeater["type"],
  selectedIds: string[],
): string | null {
  const selected = doc.shapes.filter((s) => selectedIds.includes(s.id));
  if (!selected.length) return null;
  const source = selected[0];
  beginEdit();
  const base = {
    id: crypto.randomUUID(),
    sourceId: source.id,
    count: 8,
    orientation: 0,
    follow: true,
    exceptions: [],
  };
  let r: Repeater;
  if (type === "path") {
    const guide = selected[1] ?? source;
    r = {
      ...base,
      type: "path",
      name: name("Path repeat"),
      guideId: guide.id,
      spacing: 60,
      offset: 0,
      remainder: "blank",
    } satisfies PathRepeater;
  } else if (type === "ring") {
    const c = center(source);
    r = {
      ...base,
      type: "ring",
      name: name("Ring repeat"),
      cx: c.x,
      cy: c.y,
      radius: 140,
      startAngle: 0,
      sweep: 360,
    } satisfies RingRepeater;
  } else {
    const c = center(source);
    r = {
      ...base,
      type: "grid",
      name: name("Grid repeat"),
      cx: c.x,
      cy: c.y,
      cols: 4,
      rows: 4,
      spacingX: 80,
      spacingY: 80,
      rotation: 0,
    } satisfies GridRepeater;
    r.count = r.cols * r.rows;
  }
  doc.repeaters.push(r);
  doc.selectedInstance = null;
  doc.selectedRepeater = r.id;
  return r.id;
}

function center(s: (typeof doc.shapes)[number]) {
  const xs = s.nodes.map((n) => n.x),
    ys = s.nodes.map((n) => n.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

export function updateRepeater(
  id: string,
  patch: Partial<PathRepeater> | Partial<RingRepeater> | Partial<GridRepeater>,
) {
  const r = doc.repeaters.find((x) => x.id === id);
  if (!r) return;
  beginEdit();
  Object.assign(r, patch);
  if (r.type === "grid") r.count = r.cols * r.rows;
}

export function removeRepeater(id: string) {
  beginEdit();
  doc.repeaters = doc.repeaters.filter((r) => r.id !== id);
  if (doc.selectedInstance?.repeaterId === id) doc.selectedInstance = null;
  if (doc.selectedRepeater === id) doc.selectedRepeater = null;
}

/** 删除图形时级联清理以它为源或轨道的重复器 */
export function pruneRepeaters(removedIds: Set<string>) {
  doc.repeaters = doc.repeaters.filter((r) => {
    if (removedIds.has(r.sourceId)) return false;
    if (r.type === "path" && removedIds.has(r.guideId)) return false;
    return true;
  });
  if (
    doc.selectedInstance &&
    !doc.repeaters.some((r) => r.id === doc.selectedInstance!.repeaterId)
  )
    doc.selectedInstance = null;
  if (
    doc.selectedRepeater &&
    !doc.repeaters.some((r) => r.id === doc.selectedRepeater)
  )
    doc.selectedRepeater = null;
}

function getException(r: Repeater, slot: string): InstanceException {
  let ex = r.exceptions.find((e) => e.slot === slot);
  if (!ex) {
    ex = { slot, dx: 0, dy: 0, rotation: 0, scale: 1 };
    r.exceptions.push(ex);
  }
  return ex;
}

/** 直接写入例外，不产生历史快照（供指针手势内部高频调用） */
export function applyException(
  repeaterId: string,
  slot: string,
  patch: Partial<InstanceException>,
) {
  const r = doc.repeaters.find((x) => x.id === repeaterId);
  if (!r) return;
  Object.assign(getException(r, slot), patch);
}

/** 选中副本的例外调整；按槽位 id 存储，数量变化后仍锚定同一逻辑位置 */
export function editException(
  repeaterId: string,
  slot: string,
  patch: Partial<InstanceException>,
) {
  beginEdit();
  applyException(repeaterId, slot, patch);
}

export function resetException(repeaterId: string, slot: string) {
  const r = doc.repeaters.find((x) => x.id === repeaterId);
  if (!r) return;
  beginEdit();
  r.exceptions = r.exceptions.filter((e) => e.slot !== slot);
}

/**
 * 展开为独立节点和实际分组层级；规则进入历史栈，
 * 撤销可完整恢复重复器、参数与全部例外。
 */
export function expandRepeater(id: string) {
  const r = doc.repeaters.find((x) => x.id === id);
  if (!r) return;
  const layout = buildLayout(r, doc.shapes);
  if (!layout) return;
  beginEdit();
  const made = materialize(layout);
  doc.shapes.push(...made);
  doc.repeaters = doc.repeaters.filter((x) => x.id !== id);
  doc.selectedInstance = null;
  doc.selectedRepeater = null;
  doc.selected = made.map((s) => s.id);
}
