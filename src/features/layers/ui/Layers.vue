<script setup lang="ts">
import { select } from "../../nodes";
import { doc } from "../../../shared/document";
import { group, reorder, remove } from "../model/actions";
</script>
<template>
  <section class="layers">
    <h3>
      Layers <span>{{ doc.shapes.length }}</span>
    </h3>
    <div class="layer-actions">
      <button @click="group" data-testid="group">Group</button
      ><button @click="reorder(1)">↑</button
      ><button @click="reorder(-1)">↓</button><button @click="remove">⌫</button>
    </div>
    <button
      class="layer"
      v-for="s in [...doc.shapes].reverse()"
      :class="{ chosen: doc.selected.includes(s.id) }"
      @click="select(s.id, $event.shiftKey)"
    >
      <i :style="{ background: s.fill }"></i>{{ s.group ? "▧" : "◇" }}
      {{ s.name }}<span>◉</span>
    </button>
  </section>
</template>
