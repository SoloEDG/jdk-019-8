import { reactive } from "vue";
import type { Document } from "./types";
export const doc = reactive<Document>({
  shapes: [],
  selected: [],
  tool: "select",
  zoom: 1,
});
