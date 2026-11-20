import type { Repeater, Shape } from "../../../shared/types";
import type { RepeaterLayout } from "../../repeaters/lib/layout";
import { buildPathData } from "../../repeaters/lib/instances";

function shapePath(s: Shape, d: string) {
  return `<path d="${d}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.width}" opacity="${s.opacity}"/>`;
}

function baseShapes(shapes: Shape[], paths: string[]) {
  let content = "",
    group: string | undefined;
  shapes.forEach((s, i) => {
    if (s.group !== group) {
      if (group) content += "</g>";
      group = s.group;
      if (group) content += `<g id="group-${group}-${i}">`;
    }
    content += shapePath(s, paths[i]);
  });
  if (group) content += "</g>";
  return content;
}

/**
 * 导出包含：真实图形、每个重复器渲染出的实际路径分组，
 * 以及 <metadata> 中完整的重复器规则与例外（存档可无损还原关联）。
 */
export function serialize(
  shapes: Shape[],
  paths: string[],
  layouts: RepeaterLayout[],
  repeaters: Repeater[],
) {
  let content = baseShapes(shapes, paths);
  for (const layout of layouts) {
    const d = buildPathData(layout);
    if (!d) continue;
    const src = layout.source;
    content +=
      `<g id="repeater-${layout.repeater.id}" data-repeater="${layout.repeater.name}">` +
      shapePath(src, d) +
      `</g>`;
  }
  const meta = repeaters.length
    ? `<metadata id="forma-repeaters" type="application/json">${escapeXml(
        JSON.stringify(repeaters),
      )}</metadata>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">${meta}${content}</svg>`;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
