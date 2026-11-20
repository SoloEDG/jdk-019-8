<script setup lang="ts">
import { computed } from "vue";
import { doc } from "../../../shared/document";
import type { Repeater } from "../../../shared/types";
import {
  updateRepeater,
  editException,
  resetException,
} from "../model/repeaters";
import { buildLayout } from "../lib/layout";

const repeater = computed(
  () =>
    doc.repeaters.find((r) => r.id === doc.selectedRepeater) ??
    doc.repeaters.find((r) => r.id === doc.selectedInstance?.repeaterId) ??
    null,
);

const layout = computed(() =>
  repeater.value ? buildLayout(repeater.value, doc.shapes) : null,
);

const selectedException = computed(() => {
  const sel = doc.selectedInstance;
  const r = repeater.value;
  if (!sel || !r || r.id !== sel.repeaterId) return null;
  return r.exceptions.find((e) => e.slot === sel.slot) ?? null;
});

function set(key: string, value: unknown) {
  const r = repeater.value;
  if (r) updateRepeater(r.id, { [key]: value } as never);
}
function num(e: Event) {
  return Number((e.target as HTMLInputElement).value);
}
</script>
<template>
  <section v-if="repeater" class="repeater-props" data-testid="repeater-props">
    <h4>{{ repeater.name.toUpperCase() }}</h4>

    <!-- 沿曲线 -->
    <template v-if="repeater.type === 'path'">
      <label
        >数量
        <input
          type="number"
          min="1"
          max="500"
          data-testid="field-count"
          :value="repeater.count"
          @input="set('count', Math.max(1, num($event)))"
      /></label>
      <label
        >间距（弧长 px）
        <input
          type="number"
          min="1"
          data-testid="field-spacing"
          :value="repeater.spacing"
          @input="set('spacing', Math.max(1, num($event)))"
      /></label>
      <label
        >起始偏移
        <input
          type="number"
          min="0"
          :value="repeater.offset"
          @input="set('offset', Math.max(0, num($event)))"
      /></label>
      <label
        >末端不足一整步
        <select
          data-testid="field-remainder"
          :value="repeater.remainder"
          @change="
            set(
              'remainder',
              ($event.target as HTMLSelectElement).value as 'blank' | 'fit',
            )
          "
        >
          <option value="blank">留空（保持间距）</option>
          <option value="fit">调整间距铺满</option>
        </select></label
      >
      <p v-if="layout" class="meta">
        实际步距 {{ layout.effectiveSpacing.toFixed(1) }}px ·
        {{ layout.slots.filter((s) => s.clipped).length }} 个槽位留空
      </p>
    </template>

    <!-- 环形 -->
    <template v-else-if="repeater.type === 'ring'">
      <label
        >数量
        <input
          type="number"
          min="1"
          max="500"
          data-testid="field-count"
          :value="repeater.count"
          @input="set('count', Math.max(1, num($event)))"
      /></label>
      <label
        >半径
        <input
          type="number"
          min="0"
          :value="repeater.radius"
          @input="set('radius', Math.max(0, num($event)))"
      /></label>
      <label
        >起始角°
        <input
          type="number"
          :value="repeater.startAngle"
          @input="set('startAngle', num($event))"
      /></label>
      <label
        >扫掠角°
        <input
          type="number"
          min="1"
          max="360"
          :value="repeater.sweep"
          @input="set('sweep', Math.min(360, Math.max(1, num($event))))"
      /></label>
      <p v-if="layout" class="meta">
        弧长间距 {{ layout.effectiveSpacing.toFixed(1) }}px
      </p>
    </template>

    <!-- 二维网格 -->
    <template v-else>
      <label
        >列数
        <input
          type="number"
          min="1"
          max="100"
          data-testid="field-cols"
          :value="repeater.cols"
          @input="set('cols', Math.max(1, num($event)))"
      /></label>
      <label
        >行数
        <input
          type="number"
          min="1"
          max="100"
          data-testid="field-rows"
          :value="repeater.rows"
          @input="set('rows', Math.max(1, num($event)))"
      /></label>
      <label
        >水平间距
        <input
          type="number"
          min="1"
          :value="repeater.spacingX"
          @input="set('spacingX', Math.max(1, num($event)))"
      /></label>
      <label
        >垂直间距
        <input
          type="number"
          min="1"
          :value="repeater.spacingY"
          @input="set('spacingY', Math.max(1, num($event)))"
      /></label>
      <label
        >网格旋转°
        <input
          type="number"
          :value="repeater.rotation"
          @input="set('rotation', num($event))"
      /></label>
      <p class="meta">共 {{ repeater.cols * repeater.rows }} 个副本</p>
    </template>

    <h4>朝向</h4>
    <label
      >附加角度°
      <input
        type="number"
        data-testid="field-orientation"
        :value="repeater.orientation"
        @input="set('orientation', num($event))"
    /></label>
    <label v-if="repeater.type !== 'grid'"
      >跟随切线/法线
      <input
        type="checkbox"
        :checked="repeater.follow"
        @change="set('follow', ($event.target as HTMLInputElement).checked)"
    /></label>

    <!-- 单个副本的例外调整 -->
    <template v-if="doc.selectedInstance">
      <h4>副本例外 · 槽位 {{ doc.selectedInstance.slot }}</h4>
      <p class="meta">例外按槽位序号锚定，修改数量后不会错套到其他位置。</p>
      <label
        >位移 X
        <input
          type="number"
          data-testid="ex-dx"
          :value="selectedException?.dx ?? 0"
          @input="
            editException(repeater.id, doc.selectedInstance!.slot, {
              dx: num($event),
            })
          "
      /></label>
      <label
        >位移 Y
        <input
          type="number"
          :value="selectedException?.dy ?? 0"
          @input="
            editException(repeater.id, doc.selectedInstance!.slot, {
              dy: num($event),
            })
          "
      /></label>
      <label
        >旋转°
        <input
          type="number"
          data-testid="ex-rotation"
          :value="selectedException?.rotation ?? 0"
          @input="
            editException(repeater.id, doc.selectedInstance!.slot, {
              rotation: num($event),
            })
          "
      /></label>
      <label
        >缩放
        <input
          type="number"
          step="0.1"
          min="0.1"
          :value="selectedException?.scale ?? 1"
          @input="
            editException(repeater.id, doc.selectedInstance!.slot, {
              scale: Math.max(0.1, num($event)),
            })
          "
      /></label>
      <label
        >隐藏该副本
        <input
          type="checkbox"
          :checked="!!selectedException?.hidden"
          @change="
            editException(repeater.id, doc.selectedInstance!.slot, {
              hidden: ($event.target as HTMLInputElement).checked,
            })
          "
      /></label>
      <button
        class="mini danger full"
        data-testid="reset-exception"
        @click="resetException(repeater.id, doc.selectedInstance!.slot)"
      >
        清除例外，恢复规则默认
      </button>
    </template>
  </section>
</template>
