import { beginEdit, revision } from "../../drawing";
import { ref } from "vue";
import { doc } from "../../../shared/document";
import type { Repeater, Shape, Point } from "../../../shared/types";
export const storageStatus = ref("All changes saved locally");

const STORE_KEY = "forma-document";

export function save() {
  try {
    // 先序列化一次，确保写入的是纯数据（也规避部分 DOM 实现对代理对象的克隆限制）
    const payload = JSON.stringify({
      shapes: doc.shapes,
      repeaters: doc.repeaters,
    });
    localStorage.setItem(STORE_KEY, payload);
    storageStatus.value = "All changes saved locally";
  } catch {
    storageStatus.value =
      "Local storage unavailable — export to keep your work";
  }
}
function point(v: Point) {
  return v && Number.isFinite(v.x) && Number.isFinite(v.y);
}
function valid(s: Shape) {
  return (
    s &&
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    Array.isArray(s.nodes) &&
    s.nodes.every((n) => point(n) && point(n.in) && point(n.out)) &&
    typeof s.fill === "string" &&
    /^(none|#[0-9a-f]{3,8})$/i.test(s.fill) &&
    typeof s.stroke === "string" &&
    /^#[0-9a-f]{3,8}$/i.test(s.stroke) &&
    Number.isFinite(s.width) &&
    Number.isFinite(s.opacity)
  );
}
function validRepeater(r: Repeater) {
  return (
    r &&
    typeof r.id === "string" &&
    typeof r.sourceId === "string" &&
    ["path", "ring", "grid"].includes(r.type) &&
    Number.isFinite(r.count) &&
    Array.isArray(r.exceptions) &&
    r.exceptions.every(
      (e) =>
        typeof e.slot === "string" &&
        Number.isFinite(e.dx) &&
        Number.isFinite(e.dy) &&
        Number.isFinite(e.rotation) &&
        Number.isFinite(e.scale),
    )
  );
}
export function restore() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    // 兼容旧版：存档直接是 shapes 数组
    const shapes: unknown = Array.isArray(value) ? value : value?.shapes;
    const repeaters: unknown = Array.isArray(value) ? [] : value?.repeaters;
    if (
      Array.isArray(shapes) &&
      shapes.every(valid) &&
      (!repeaters ||
        (Array.isArray(repeaters) && repeaters.every(validRepeater)))
    ) {
      beginEdit();
      doc.shapes = shapes as Shape[];
      doc.repeaters = (repeaters as Repeater[]) ?? [];
      revision.value++;
      doc.selected = [];
      doc.selectedInstance = null;
      doc.selectedRepeater = null;
      return true;
    }
  } catch {}
  return false;
}
