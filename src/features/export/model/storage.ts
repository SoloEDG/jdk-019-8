import { beginEdit, revision } from "../../drawing";
import { ref } from "vue";
import { doc } from "../../../shared/document";
import type { Shape, Point } from "../../../shared/types";
export const storageStatus = ref("All changes saved locally");
export function save() {
  try {
    localStorage.setItem("forma-document", JSON.stringify(doc.shapes));
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
export function restore() {
  try {
    const value = JSON.parse(localStorage.getItem("forma-document") || "null");
    if (Array.isArray(value) && value.every(valid)) {
      beginEdit();
      doc.shapes = value;
      revision.value++;
      doc.selected = [];
      return true;
    }
  } catch {}
  return false;
}
