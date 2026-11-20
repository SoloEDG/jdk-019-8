import { doc } from "../../../shared/document";
export function select(id: string, multi: boolean) {
  const s = doc.shapes.find((s) => s.id === id);
  const ids = s?.group
    ? doc.shapes.filter((x) => x.group === s.group).map((x) => x.id)
    : [id];
  doc.selected = multi ? [...new Set([...doc.selected, ...ids])] : ids;
  // 焦点回到真实图形：退出重复器/副本的选择上下文
  doc.selectedRepeater = null;
  doc.selectedInstance = null;
}
