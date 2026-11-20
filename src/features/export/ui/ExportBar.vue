<script setup lang="ts">
import { doc } from "../../../shared/document";
import { serialize } from "../lib/serialize";
import { download } from "../model/download";
import { save, restore } from "../model/storage";
defineProps<{ paths: string[] }>();
</script>
<template>
  <div class="export">
    <button @click="restore">Restore</button
    ><button @click="save">Save project</button
    ><button
      class="primary"
      data-testid="export"
      @click="download(serialize(doc.shapes, paths))"
    >
      Export SVG ↗
    </button>
  </div>
</template>
