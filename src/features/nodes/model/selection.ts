import { doc } from "../../../shared/document";
export function select(id: string, multi: boolean) {
  const s = doc.shapes.find((s) => s.id === id);
  const ids = s?.group
    ? doc.shapes.filter((x) => x.group === s.group).map((x) => x.id)
    : [id];
  doc.selected = multi ? [...new Set([...doc.selected, ...ids])] : ids;
}
