<script setup lang="ts">
import { beginEdit } from "../../drawing";

import { doc } from "../../../shared/document";
import { move } from "../model/move";
import { coordinates } from "../lib/coordinates";
import type { Node } from "../../../shared/types";
function drag(e: PointerEvent, n: Node, kind: string) {
  e.stopPropagation();
  beginEdit();
  const svg = (e.target as SVGElement).ownerSVGElement!;
  const f = (ev: PointerEvent) => {
    const p = coordinates(ev, svg);
    if (kind === "anchor") move(n, p);
    else Object.assign(kind === "in" ? n.in : n.out, p);
  };
  window.addEventListener("pointermove", f);
  window.addEventListener(
    "pointerup",
    () => window.removeEventListener("pointermove", f),
    { once: true },
  );
}
</script>
<template>
  <g v-for="s in doc.shapes.filter((s) => doc.selected.includes(s.id))"
    ><g v-for="n in s.nodes"
      ><path
        :d="`M${n.in.x},${n.in.y} L${n.x},${n.y} L${n.out.x},${n.out.y}`"
        stroke="#9974ec"
        fill="none" /><circle
        v-for="k in ['in', 'out'] as const"
        :cx="n[k].x"
        :cy="n[k].y"
        r="4"
        fill="white"
        stroke="#8052df"
        @pointerdown="drag($event, n, k)" /><rect
        :x="n.x - 4"
        :y="n.y - 4"
        width="8"
        height="8"
        fill="white"
        stroke="#8052df"
        data-testid="anchor"
        @pointerdown="drag($event, n, 'anchor')" /></g
  ></g>
</template>
