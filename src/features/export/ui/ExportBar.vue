<script setup lang="ts">
import { computed } from "vue";
import { doc } from "../../../shared/document";
import { serialize } from "../lib/serialize";
import { download } from "../model/download";
import { save, restore } from "../model/storage";
import {
  exportArchive,
  importArchive,
  importRulesFromSvg,
} from "../model/archive";
import { allLayouts } from "../../repeaters/lib/layout";
import { path } from "../../drawing";

const layouts = computed(() => allLayouts(doc.shapes, doc.repeaters));
const shapePaths = computed(() => doc.shapes.map(path));

function exportSvg() {
  download(
    serialize(doc.shapes, shapePaths.value, layouts.value, doc.repeaters),
  );
}
function saveArchive() {
  download(exportArchive(), "application/json", "forma-project.json");
}
function onImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  file.text().then((text) => {
    const ok = text.trimStart().startsWith("<")
      ? importRulesFromSvg(text)
      : importArchive(text);
    if (!ok)
      alert("无法读取该文件，请确认是 forma 项目 JSON 或含规则的导出 SVG。");
  });
  input.value = "";
}
</script>
<template>
  <div class="export">
    <button @click="restore">Restore</button
    ><button @click="save">Save project</button
    ><button @click="saveArchive" data-testid="archive">Archive ↓</button
    ><label class="import-btn" for="import-archive" data-testid="import-label"
      >Import ↑</label
    ><input
      id="import-archive"
      type="file"
      accept="application/json,.json,image/svg+xml,.svg"
      hidden
      @change="onImport"
    /><button class="primary" data-testid="export" @click="exportSvg">
      Export SVG ↗
    </button>
  </div>
</template>
