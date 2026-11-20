<script setup lang="ts">
import { computed } from "vue";
import { doc } from "../../../shared/document";
import {
  createRepeater,
  removeRepeater,
  expandRepeater,
} from "../model/repeaters";

const sourceName = (id: string) =>
  doc.shapes.find((s) => s.id === id)?.name ?? "(missing)";
const guideName = (id: string) =>
  doc.shapes.find((s) => s.id === id)?.name ?? "(missing)";

const canCreate = computed(() => doc.selected.length > 0);

function add(type: "path" | "ring" | "grid") {
  createRepeater(type, doc.selected);
}
const labels = {
  path: "⤳ 沿曲线",
  ring: "◎ 环形",
  grid: "▦ 二维网格",
} as const;
</script>
<template>
  <section class="repeaters">
    <h3>
      Repeater <span>{{ doc.repeaters.length }}</span>
    </h3>
    <div class="repeater-actions">
      <button
        v-for="(label, t) in labels"
        :key="t"
        :disabled="!canCreate"
        :data-testid="'create-' + t"
        @click="add(t as 'path' | 'ring' | 'grid')"
      >
        {{ label }}
      </button>
    </div>
    <p v-if="!canCreate" class="hint">先选中一个图形作为原件</p>
    <div
      v-for="r in doc.repeaters"
      :key="r.id"
      class="repeater-item"
      :class="{ chosen: doc.selectedRepeater === r.id }"
      :data-testid="'repeater-' + r.id"
      @click="
        doc.selectedRepeater = r.id;
        doc.selectedInstance = null;
      "
    >
      <div class="repeater-head">
        <b>{{ r.name }}</b>
        <span>{{ r.type }} · {{ r.count }}×</span>
      </div>
      <p class="repeater-meta">
        原件：{{ sourceName(r.sourceId)
        }}<template v-if="r.type === 'path'"
          >　轨道：{{ guideName(r.guideId) }}</template
        >
      </p>
      <p v-if="r.exceptions.length" class="repeater-meta warn">
        {{ r.exceptions.length }} 个例外（按槽位锚定）
      </p>
      <div class="repeater-buttons">
        <button class="mini" data-testid="expand" @click="expandRepeater(r.id)">
          展开为节点
        </button>
        <button
          class="mini danger"
          data-testid="remove-repeater"
          @click="removeRepeater(r.id)"
        >
          删除规则
        </button>
      </div>
    </div>
  </section>
</template>
