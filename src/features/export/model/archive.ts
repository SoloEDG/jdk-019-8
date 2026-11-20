import { doc } from "../../../shared/document";
import type { Repeater, Shape } from "../../../shared/types";
import { beginEdit, revision } from "../../drawing";

/** 项目归档：同时包含图形与重复器规则、当前例外 */
export function exportArchive(): string {
  return JSON.stringify(
    {
      format: "forma-project",
      version: 1,
      shapes: doc.shapes,
      repeaters: doc.repeaters,
    },
    null,
    2,
  );
}

export function importArchive(text: string): boolean {
  try {
    const value = JSON.parse(text) as {
      shapes: Shape[];
      repeaters?: Repeater[];
    };
    if (!Array.isArray(value.shapes)) return false;
    beginEdit();
    doc.shapes = value.shapes;
    doc.repeaters = Array.isArray(value.repeaters) ? value.repeaters : [];
    doc.selected = [];
    doc.selectedInstance = null;
    doc.selectedRepeater = null;
    revision.value++;
    return true;
  } catch {
    return false;
  }
}

/** 从导出的 SVG 中读回 <metadata> 里的重复器规则与例外 */
export function importRulesFromSvg(svgText: string): boolean {
  try {
    const m = svgText.match(
      /<metadata[^>]*id="forma-repeaters"[^>]*>([\s\S]*?)<\/metadata>/,
    );
    if (!m) return false;
    const json = m[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    const repeaters = JSON.parse(json) as Repeater[];
    if (!Array.isArray(repeaters)) return false;
    beginEdit();
    doc.repeaters = repeaters;
    doc.selectedInstance = null;
    doc.selectedRepeater = null;
    revision.value++;
    return true;
  } catch {
    return false;
  }
}
