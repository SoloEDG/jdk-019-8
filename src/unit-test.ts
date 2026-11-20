// 纯逻辑单元测试：用 vite 的 TS 能力通过 esbuild 即时编译
import {
  buildLayout,
  type RepeaterLayout,
} from "./features/repeaters/lib/layout";
import {
  buildPathData,
  materialize,
  findException,
} from "./features/repeaters/lib/instances";
import type {
  PathRepeater,
  RingRepeater,
  GridRepeater,
  Shape,
} from "./shared/types";

let pass = 0;
const fails: string[] = [];
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fails.push(name);
    console.log("FAIL", name, extra);
  }
}
/** 测试夹具保证源图形存在，布局不会为 null */
function layout(
  r: PathRepeater | RingRepeater | GridRepeater,
  shapes: Shape[],
): RepeaterLayout {
  const l = buildLayout(r, shapes);
  if (!l) throw new Error("unexpected null layout");
  return l;
}

const source: Shape = {
  id: "src",
  name: "S",
  closed: true,
  fill: "#7850d6",
  stroke: "#ffffff",
  width: 2,
  opacity: 1,
  nodes: [
    { x: 0, y: -10, in: { x: -6, y: -10 }, out: { x: 6, y: -10 } },
    { x: 10, y: 0, in: { x: 10, y: -6 }, out: { x: 10, y: 6 } },
    { x: 0, y: 10, in: { x: 6, y: 10 }, out: { x: -6, y: 10 } },
    { x: -10, y: 0, in: { x: -10, y: 6 }, out: { x: -10, y: -6 } },
  ],
};

// 水平直线轨道：100 -> 500，长 400
const guide: Shape = {
  id: "guide",
  name: "G",
  closed: false,
  fill: "none",
  stroke: "#333333",
  width: 2,
  opacity: 1,
  nodes: [
    { x: 100, y: 300, in: { x: 100, y: 300 }, out: { x: 233, y: 300 } },
    { x: 500, y: 300, in: { x: 367, y: 300 }, out: { x: 500, y: 300 } },
  ],
};

// 1. 路径弧长分配 + blank
const pathRep: PathRepeater = {
  id: "p1",
  type: "path",
  name: "P",
  sourceId: "src",
  guideId: "guide",
  count: 8,
  spacing: 60,
  offset: 0,
  orientation: 0,
  follow: true,
  remainder: "blank",
  exceptions: [],
};
const l1 = layout(pathRep, [source, guide]);
check("path layout returns 8 slots", l1.slots.length === 8);
check(
  "arc length positions start at guide origin",
  Math.abs(l1.slots[0].x - 100) < 1,
);
check(
  "slot spacing follows arc length 60",
  Math.abs(l1.slots[1].x - 160) < 1.5,
);
check(
  "blank marks overflow slots clipped",
  l1.slots.filter((s) => s.clipped).length === 1,
);
check("tangent angle follows horizontal path", Math.abs(l1.slots[0].angle) < 1);

// 2. fit 模式：步距调整为 400/7
pathRep.remainder = "fit";
const l2 = layout(pathRep, [source, guide]);
check(
  "fit adjusts spacing to 57.14",
  Math.abs(l2.effectiveSpacing - 400 / 7) < 0.01,
);
check(
  "fit has no clipped slots",
  l2.slots.every((s) => !s.clipped),
);
check("fit last slot reaches path end", Math.abs(l2.slots[7].x - 500) < 1.5);

// 3. 环形整环：12 个均布，首尾角度闭合
const ring: RingRepeater = {
  id: "r1",
  type: "ring",
  name: "R",
  sourceId: "src",
  count: 12,
  orientation: 0,
  follow: true,
  exceptions: [],
  cx: 400,
  cy: 300,
  radius: 100,
  startAngle: 0,
  sweep: 360,
};
const l3 = layout(ring, [source]);
check("ring has 12 slots", l3.slots.length === 12);
check(
  "ring first slot at angle 0",
  Math.abs(l3.slots[0].x - 500) < 0.01 && Math.abs(l3.slots[0].y - 300) < 0.01,
);
check(
  "ring full-circle spacing is circumference/12",
  Math.abs(l3.effectiveSpacing - (2 * Math.PI * 100) / 12) < 0.01,
);
// 扇形 180°，3 个点 → 端点在两侧
ring.sweep = 180;
ring.count = 3;
const l3b = layout(ring, [source]);
check("arc endpoints span 180 degrees", Math.abs(l3b.slots[2].x - 300) < 0.01);

// 4. 网格：槽位 id 稳定，加列不改旧标识
const grid: GridRepeater = {
  id: "g1",
  type: "grid",
  name: "G",
  sourceId: "src",
  count: 9,
  cols: 3,
  rows: 3,
  spacingX: 80,
  spacingY: 80,
  cx: 400,
  cy: 300,
  rotation: 0,
  orientation: 0,
  follow: false,
  exceptions: [],
};
const l4 = layout(grid, [source]);
check(
  "grid slot ids are col,row",
  l4.slots.map((s) => s.slot).join(",") ===
    "0,0,1,0,2,0,0,1,1,1,2,1,0,2,1,2,2,2",
);
const idsBefore = new Set(l4.slots.map((s) => s.slot));
const pos11before = l4.slots.find((s) => s.slot === "1,1")!;
grid.cols = 5;
grid.count = 15;
const l4b = layout(grid, [source]);
const pos11after = l4b.slots.find((s) => s.slot === "1,1")!;
check(
  "old slot ids survive count change (no remapping)",
  [...idsBefore].every((id) => l4b.slots.some((s) => s.slot === id)),
);
check(
  "slot 1,1 keeps its semantic row/col ordering",
  pos11after && pos11after.slot === "1,1" && pos11after.y === pos11before.y,
);

// 5. 例外按槽位锚定，数量变化后仍认领同一槽位
grid.exceptions = [{ slot: "1,1", dx: 25, dy: 0, rotation: 10, scale: 1 }];
const l5 = layout(grid, [source]);
const ex = findException(l5.repeater, "1,1");
check(
  "exception found by stable slot id",
  !!ex && ex.dx === 25 && ex.rotation === 10,
);
const d = buildPathData(l5);
check(
  "merged path contains real bezier geometry",
  d.includes("C ") && (d.match(/M /g) || []).length === 15,
);

// 6. 隐藏例外不渲染
grid.exceptions[0].hidden = true;
const l6 = layout(grid, [source]);
check(
  "hidden instance excluded from render",
  (buildPathData(l6).match(/M /g) || []).length === 14,
);

// 7. 展开：独立节点、实际分组、深拷贝不共享
grid.exceptions[0].hidden = false;
const made = materialize(l5);
check(
  "expand produces one independent shape per visible slot",
  made.length === 15,
);
check(
  "expanded shapes carry a real group id",
  made.every((s) => s.group === "expanded-g1"),
);
check(
  "expanded nodes are transformed (not at source coords)",
  made.some((s) => Math.abs(s.nodes[0].x - source.nodes[0].x) > 1),
);
made[0].nodes[0].x = 9999;
check(
  "expanded shapes do not share node objects with source",
  source.nodes[0].x !== 9999,
);
check(
  "expanded shape got own id",
  made.every((s) => s.id !== source.id),
);

// 8. 缺失源图形时布局安全降级
check("missing source returns null", buildLayout(ring, []) === null);

console.log(`\n${pass} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
