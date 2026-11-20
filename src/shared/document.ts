import { reactive } from "vue";
import type { Document } from "./types";
export const doc = reactive<Document>({
  shapes: [],
  repeaters: [],
  selected: [],
  selectedRepeater: null,
  selectedInstance: null,
  tool: "select",
  zoom: 1,
});
