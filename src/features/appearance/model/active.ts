import { computed } from "vue";
import { doc } from "../../../shared/document";
export const active = computed(() =>
  doc.shapes.find((s) => doc.selected.includes(s.id)),
);
