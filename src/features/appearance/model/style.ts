import { beginEdit } from "../../drawing";
import { doc } from "../../../shared/document";
import type { Shape } from "../../../shared/types";
export function style<K extends keyof Shape>(k: K, v: Shape[K]) {
  beginEdit();
  doc.shapes
    .filter((s) => doc.selected.includes(s.id))
    .forEach((s) => (s[k] = v));
}
