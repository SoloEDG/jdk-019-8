import { ref } from "vue";
import { doc } from "../../../shared/document";
import type { Repeater, Shape } from "../../../shared/types";
const past: string[] = [];
const future: string[] = [];
export const revision = ref(0);

interface Snapshot {
  shapes: Shape[];
  repeaters: Repeater[];
}

export function beginEdit() {
  past.push(
    JSON.stringify({
      shapes: doc.shapes,
      repeaters: doc.repeaters,
    } satisfies Snapshot),
  );
  if (past.length > 100) past.shift();
  future.length = 0;
}
function install(snapshot: string) {
  const state = JSON.parse(snapshot) as Snapshot;
  doc.shapes = state.shapes;
  doc.repeaters = state.repeaters ?? [];
  doc.selected = doc.selected.filter((id) =>
    doc.shapes.some((s) => s.id === id),
  );
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
  revision.value++;
}
export function undo() {
  const state = past.pop();
  if (state) {
    future.push(
      JSON.stringify({
        shapes: doc.shapes,
        repeaters: doc.repeaters,
      } satisfies Snapshot),
    );
    install(state);
  }
}
export function redo() {
  const state = future.pop();
  if (state) {
    past.push(
      JSON.stringify({
        shapes: doc.shapes,
        repeaters: doc.repeaters,
      } satisfies Snapshot),
    );
    install(state);
  }
}
