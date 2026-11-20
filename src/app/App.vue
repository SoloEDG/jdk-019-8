<script setup lang="ts">
import { computed, watch } from "vue";
import { doc } from "../shared/document";
import {
  Tools,
  path,
  create,
  add,
  seed,
  beginEdit,
  undo,
  redo,
  revision,
} from "../features/drawing";
import { NodeOverlay, coordinates, select } from "../features/nodes";
import { Properties } from "../features/appearance";
import { Layers, translateSelected } from "../features/layers";
import { ExportBar, restore, save, storageStatus } from "../features/export";
import {
  RepeaterCanvas,
  RepeaterPanel,
  RepeaterProperties,
  allLayouts,
} from "../features/repeaters";
import type { Shape } from "../shared/types";
if (!restore()) seed();
// 恢复的存档不预设选择；种子数据自行管理初始选中
if (doc.selected.length === 0 && doc.selectedRepeater === null) {
  doc.selected = doc.shapes.length ? [doc.shapes[0].id] : [];
}
watch(() => [doc.shapes, doc.repeaters], save, { deep: true });
const paths = computed(() => doc.shapes.map(path));
const layouts = computed(() => allLayouts(doc.shapes, doc.repeaters));
let drawing: Shape | undefined;
watch(
  () => doc.tool,
  () => {
    drawing = undefined;
  },
);
watch(revision, () => {
  drawing = undefined;
});
function down(e: PointerEvent) {
  const svg = e.currentTarget as SVGSVGElement;
  const p = coordinates(e, svg);
  beginEdit();
  const id = (e.target as Element).getAttribute("data-shape");
  if (doc.tool === "pen") {
    if (!drawing) drawing = create(p);
    add(drawing, p);
    const n = drawing.nodes.at(-1)!;
    const f = (ev: PointerEvent) => {
      const q = coordinates(ev, svg);
      n.out = q;
      n.in = { x: 2 * n.x - q.x, y: 2 * n.y - q.y };
    };
    window.addEventListener("pointermove", f);
    window.addEventListener(
      "pointerup",
      () => window.removeEventListener("pointermove", f),
      { once: true },
    );
  } else if (id) {
    select(id, e.shiftKey);
    doc.selectedInstance = null;
    doc.selectedRepeater = null;
    if (doc.tool === "nodes") return;
    let last = p;
    const f = (ev: PointerEvent) => {
      const q = coordinates(ev, svg);
      translateSelected(q.x - last.x, q.y - last.y);
      last = q;
    };
    window.addEventListener("pointermove", f);
    window.addEventListener(
      "pointerup",
      () => window.removeEventListener("pointermove", f),
      { once: true },
    );
  } else {
    doc.selected = [];
    doc.selectedInstance = null;
  }
}
function finish() {
  drawing = undefined;
  doc.tool = "select";
}
window.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === "Escape") finish();
});
</script>
<template>
  <header>
    <b class="brand">◈ forma <small>VECTOR STUDIO</small></b>
    <div>Bloom exploration <span> / Personal workspace</span></div>
    <ExportBar />
  </header>
  <div class="workspace">
    <div class="left">
      <h5>PROJECT <span>＋</span></h5>
      <p class="project">▣ Bloom / Artboard 01</p>
      <Tools /><Layers /><RepeaterPanel />
      <p class="signature">✧ Designed to explore.</p>
    </div>
    <main>
      <div class="toolbar">
        <span>Artboard 01　<small>800 × 600</small></span>
        <div>
          <button @click="undo">↶</button><button @click="redo">↷</button
          ><button @click="doc.zoom = Math.max(0.4, doc.zoom - 0.1)">−</button
          >{{ Math.round(doc.zoom * 100) }}%<button
            @click="doc.zoom = Math.min(1.5, doc.zoom + 0.1)"
          >
            ＋
          </button>
        </div>
      </div>
      <div class="stage">
        <svg
          data-testid="canvas"
          :style="{
            width: 800 * doc.zoom + 'px',
            height: 600 * doc.zoom + 'px',
          }"
          viewBox="0 0 800 600"
          @pointerdown="down"
          @dblclick="finish"
        >
          <rect width="800" height="600" fill="#fffdfb" />
          <path
            v-for="s in doc.shapes"
            :key="s.id"
            :data-shape="s.id"
            :d="path(s)"
            :fill="s.fill"
            :stroke="s.stroke"
            :stroke-width="s.width"
            :opacity="s.opacity"
          />
          <RepeaterCanvas :layouts="layouts" />
          <NodeOverlay />
        </svg>
      </div>
      <footer>
        <span>● {{ storageStatus }}</span
        ><span>{{
          doc.tool === "pen"
            ? "Click / drag to draw · Enter to finish"
            : "点副本可做例外调整 · Shift + click 多选 · Drag to move"
        }}</span
        ><span
          >{{ doc.selected.length }} selected ·
          {{ layouts.reduce((n, l) => n + l.slots.length, 0) }} instances</span
        >
      </footer>
    </main>
    <aside class="right-rail">
      <RepeaterProperties v-if="doc.selectedRepeater || doc.selectedInstance" />
      <Properties v-else />
    </aside>
  </div>
</template>
