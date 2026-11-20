import { ref } from "vue";
import { doc } from "../../../shared/document";
const past: string[] = [];
const future: string[] = [];
export const revision = ref(0);
export function beginEdit() {
  past.push(JSON.stringify(doc.shapes));
  if (past.length > 100) past.shift();
  future.length = 0;
}
function install(snapshot: string) {
  doc.shapes = JSON.parse(snapshot);
  doc.selected = doc.selected.filter((id) =>
    doc.shapes.some((s) => s.id === id),
  );
  revision.value++;
}
export function undo() {
  const state = past.pop();
  if (state) {
    future.push(JSON.stringify(doc.shapes));
    install(state);
  }
}
export function redo() {
  const state = future.pop();
  if (state) {
    past.push(JSON.stringify(doc.shapes));
    install(state);
  }
}
