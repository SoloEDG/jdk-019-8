<script setup lang="ts">
import { doc } from "../../../shared/document";
</script>
<template>
  <nav>
    <button
      v-for="(icon, t) in { select: '↖', pen: '✒', nodes: '◇' }"
      :class="{ active: doc.tool === t }"
      @click="doc.tool = t"
      :data-testid="'tool-' + t"
    >
      {{ icon }}<small>{{ t }}</small>
    </button>
  </nav>
</template>
