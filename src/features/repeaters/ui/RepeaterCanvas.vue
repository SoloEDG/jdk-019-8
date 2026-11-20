<script setup lang="ts">
import { computed } from "vue";
import { doc } from "../../../shared/document";
import { coordinates } from "../../nodes";
import type { RepeaterLayout } from "../lib/layout";
import { buildPathData, hitTest } from "../lib/instances";
import { applyException } from "../model/repeaters";
import { beginEdit } from "../../drawing";

const props = defineProps<{ layouts: RepeaterLayout[] }>();

const rendered = computed(() =>
  props.layouts.map((l) => ({
    layout: l,
    d: buildPathData(l),
  })),
);

const selectedInstance = computed(() => {
  const sel = doc.selectedInstance;
  if (!sel) return null;
  const layout = props.layouts.find((l) => l.repeater.id === sel.repeaterId);
  const slot = layout?.slots.find((s) => s.slot === sel.slot);
  if (!layout || !slot) return null;
  const ex = layout.repeater.exceptions.find((e) => e.slot === slot.slot);
  return {
    x: slot.x + (ex?.dx ?? 0),
    y: slot.y + (ex?.dy ?? 0),
    slot: slot.slot,
  };
});

function down(e: PointerEvent) {
  const svg = e.currentTarget as SVGSVGElement;
  const p = coordinates(e, svg);
  const hit = hitTest(props.layouts, p);
  if (!hit) return;
  // 命中副本：吞掉事件，避免触发底层图形的框选/拖动
  e.stopPropagation();
  e.preventDefault();
  doc.selectedInstance = { repeaterId: hit.repeaterId, slot: hit.slot };
  doc.selected = [];
  const start = { ...p };
  const ex = props.layouts
    .find((l) => l.repeater.id === hit.repeaterId)!
    .repeater.exceptions.find((x) => x.slot === hit.slot);
  const base = { dx: ex?.dx ?? 0, dy: ex?.dy ?? 0 };
  let historyTaken = false;
  const move = (ev: PointerEvent) => {
    const q = coordinates(ev, svg);
    const dx = base.dx + q.x - start.x;
    const dy = base.dy + q.y - start.y;
    // 首次实际移动才压历史快照，整个手势只占一步撤销
    if (!historyTaken && (dx !== base.dx || dy !== base.dy)) {
      beginEdit();
      historyTaken = true;
    }
    applyException(hit.repeaterId, hit.slot, { dx, dy });
  };
  window.addEventListener("pointermove", move);
  window.addEventListener(
    "pointerup",
    () => window.removeEventListener("pointermove", move),
    { once: true },
  );
}
</script>
<template>
  <g class="repeater-layer" @pointerdown="down">
    <path
      v-for="item in rendered"
      :key="item.layout.repeater.id"
      :data-repeater="item.layout.repeater.id"
      :d="item.d"
      :fill="item.layout.source.fill"
      :stroke="item.layout.source.stroke"
      :stroke-width="item.layout.source.width"
      :opacity="item.layout.source.opacity"
      style="pointer-events: all"
    />
    <g v-if="selectedInstance">
      <circle
        :cx="selectedInstance.x"
        :cy="selectedInstance.y"
        r="10"
        fill="none"
        stroke="#e0619c"
        stroke-width="2"
        stroke-dasharray="4 3"
        data-testid="instance-ring"
      />
    </g>
  </g>
</template>
