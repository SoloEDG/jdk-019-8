// happy-dom + @vue/test-utils 组件级集成测试
// test-setup 必须在所有 Vue 模块之前完成全局 DOM 安装
import { win } from "./test-setup";

import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { doc } from "./shared/document";
import { seed } from "./features/drawing/model/seed";
import { undo, redo } from "./features/drawing/model/history";
import RepeaterCanvas from "./features/repeaters/ui/RepeaterCanvas.vue";
import RepeaterPanel from "./features/repeaters/ui/RepeaterPanel.vue";
import RepeaterProperties from "./features/repeaters/ui/RepeaterProperties.vue";
import { allLayouts } from "./features/repeaters/lib/layout";
import { hitTest } from "./features/repeaters/lib/instances";
import {
  createRepeater,
  expandRepeater,
  editException,
} from "./features/repeaters/model/repeaters";
import { save, restore } from "./features/export/model/storage";
import {
  exportArchive,
  importArchive,
  importRulesFromSvg,
} from "./features/export/model/archive";
import { serialize } from "./features/export/lib/serialize";
import { path } from "./features/drawing/lib/path";
import type { GridRepeater, PathRepeater, Shape } from "./shared/types";

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
function resetDoc() {
  doc.shapes = [];
  doc.repeaters = [];
  doc.selected = [];
  doc.selectedRepeater = null;
  doc.selectedInstance = null;
}

(async () => {
  // 1. 种子数据经 RepeaterCanvas 渲染：一个合并 path 含 12 个 M 段
  resetDoc();
  seed();
  await nextTick();
  const layouts1 = allLayouts(doc.shapes, doc.repeaters);
  const w1 = mount(RepeaterCanvas, { props: { layouts: layouts1 } });
  const paths1 = w1.findAll("path");
  check("one merged DOM path per repeater (fast preview)", paths1.length === 1);
  check(
    "merged path holds 12 real subpaths",
    (paths1[0].attributes("d")?.match(/M /g) || []).length === 12,
  );

  // 命中测试：在阈值内选中最近副本，超出阈值返回 null（画布单选例外的基础）
  const hitTarget = layouts1[0].slots[3];
  const hit = hitTest([layouts1[0]], {
    x: hitTarget.x + 5,
    y: hitTarget.y - 5,
  });
  check(
    "hit test selects nearest instance within threshold",
    !!hit &&
      hit.slot === hitTarget.slot &&
      hit.repeaterId === layouts1[0].repeater.id,
  );
  check(
    "hit test misses beyond threshold",
    hitTest([layouts1[0]], { x: hitTarget.x + 500, y: hitTarget.y }) === null,
  );

  // 2. 大量副本仍只产生一个 DOM 节点
  doc.repeaters[0].count = 300;
  await nextTick();
  const layouts2 = allLayouts(doc.shapes, doc.repeaters);
  const w2 = mount(RepeaterCanvas, { props: { layouts: layouts2 } });
  check(
    "300 instances still render as a single path node",
    w2.findAll("path").length === 1,
  );
  check(
    "300 subpaths all present in geometry",
    (w2.find("path").attributes("d")?.match(/M /g) || []).length === 300,
  );

  // 3. 面板创建三种重复器
  resetDoc();
  const src: Shape = {
    id: "s1",
    name: "Src",
    closed: true,
    fill: "#7850d6",
    stroke: "#fff",
    width: 2,
    opacity: 1,
    nodes: [
      { x: 0, y: -10, in: { x: -5, y: -10 }, out: { x: 5, y: -10 } },
      { x: 10, y: 0, in: { x: 10, y: -5 }, out: { x: 10, y: 5 } },
      { x: 0, y: 10, in: { x: 5, y: 10 }, out: { x: -5, y: 10 } },
      { x: -10, y: 0, in: { x: -10, y: 5 }, out: { x: -10, y: -5 } },
    ],
  };
  doc.shapes.push(src);
  doc.selected = ["s1"];
  const panel = mount(RepeaterPanel);
  await panel.find('[data-testid="create-ring"]').trigger("click");
  await panel.find('[data-testid="create-grid"]').trigger("click");
  check("panel creates ring and grid repeaters", doc.repeaters.length === 2);
  // 路径重复器需要两个图形（源 + 轨道）
  const guide: Shape = {
    id: "g1",
    name: "Guide",
    closed: false,
    fill: "none",
    stroke: "#333",
    width: 2,
    opacity: 1,
    nodes: [
      { x: 50, y: 500, in: { x: 50, y: 500 }, out: { x: 183.33, y: 500 } },
      { x: 450, y: 500, in: { x: 316.67, y: 500 }, out: { x: 450, y: 500 } },
    ],
  };
  doc.shapes.push(guide);
  doc.selected = ["s1", "g1"];
  await panel.find('[data-testid="create-path"]').trigger("click");
  check(
    "panel creates path repeater with guide",
    doc.repeaters.some((r) => r.type === "path"),
  );

  // 4. RepeaterProperties 改数量/间距/模式，经输入事件写回 doc
  const grid = doc.repeaters.find((r) => r.type === "grid") as GridRepeater;
  doc.selectedRepeater = grid.id;
  doc.selectedInstance = null;
  await nextTick();
  const props1 = mount(RepeaterProperties);
  const cols = props1.find('[data-testid="field-cols"]');
  await cols.setValue("5");
  await nextTick();
  check("panel input updates cols", grid.cols === 5);
  check("count cache tracks cols*rows", grid.count === grid.cols * grid.rows);

  // 5. 选中副本 → 例外编辑 → 改数量后例外不串位
  doc.selectedInstance = { repeaterId: grid.id, slot: "2,1" };
  await nextTick();
  const props2 = mount(RepeaterProperties);
  await props2.find('[data-testid="ex-dx"]').setValue("30");
  await props2.find('[data-testid="ex-rotation"]').setValue("45");
  await nextTick();
  const ex1 = grid.exceptions.find((e) => e.slot === "2,1");
  check(
    "exception edited through panel",
    !!ex1 && ex1.dx === 30 && ex1.rotation === 45,
  );
  // 行数从 4 改到 6
  await props2.find('[data-testid="field-rows"]').setValue("6");
  await nextTick();
  const ex2 = grid.exceptions.find((e) => e.slot === "2,1");
  check(
    "exception remains anchored to slot 2,1 after row count change",
    !!ex2 && ex2.dx === 30 && ex2.rotation === 45,
  );
  // 清除例外
  await props2.find('[data-testid="reset-exception"]').trigger("click");
  await nextTick();
  check(
    "reset removes exception",
    !grid.exceptions.find((e) => e.slot === "2,1"),
  );

  // 6. 路径重复器 blank/fit 经 select 切换
  const pr = doc.repeaters.find((r) => r.type === "path") as PathRepeater;
  pr.count = 10;
  pr.spacing = 50;
  pr.remainder = "blank";
  doc.selectedRepeater = pr.id;
  doc.selectedInstance = null;
  await nextTick();
  const props3 = mount(RepeaterProperties);
  const blankLayout = allLayouts(doc.shapes, doc.repeaters).find(
    (l) => l.repeater.id === pr.id,
  )!;
  check(
    "blank mode clips overflow slots",
    blankLayout.slots.filter((s) => s.clipped).length === 1,
  );
  await props3.find('[data-testid="field-remainder"]').setValue("fit");
  await nextTick();
  check("select switches remainder to fit", (pr.remainder as string) === "fit");
  const fitLayout = allLayouts(doc.shapes, doc.repeaters).find(
    (l) => l.repeater.id === pr.id,
  )!;
  check(
    "fit mode renders every slot",
    fitLayout.slots.every((s) => !s.clipped),
  );
  check(
    "fit effective spacing = length/(count-1)",
    Math.abs(fitLayout.effectiveSpacing - 400 / 9) < 0.01,
  );

  // 7. 原件修改后重复结果跟随（响应式链路）
  src.fill = "#123456";
  await nextTick();
  const live = allLayouts(doc.shapes, doc.repeaters);
  const wLive = mount(RepeaterCanvas, { props: { layouts: live } });
  check(
    "source color change propagates to rendered repeater path",
    wLive.find("path").attributes("fill") === "#123456",
  );

  // 8. 展开 → 独立节点与实际分组 → 撤销完整恢复规则与例外
  editException(grid.id, "0,0", { dx: 12, dy: 7, rotation: 5, scale: 1 });
  const snapshotBefore = {
    shapes: doc.shapes.length,
    reps: doc.repeaters.length,
    gridJson: JSON.stringify(grid),
  };
  expandRepeater(grid.id);
  await nextTick();
  const expandedShapes = doc.shapes.filter((s) =>
    (s.group || "").startsWith("expanded-"),
  );
  check(
    "expand creates independent real shapes",
    expandedShapes.length === 5 * 6,
  );
  check(
    "expanded shapes form a real group layer",
    new Set(expandedShapes.map((s) => s.group)).size === 1,
  );
  check(
    "expanded geometry is transformed nodes",
    expandedShapes.some((s) => s.nodes.some((n) => Math.abs(n.x) > 100)),
  );
  check(
    "expand removes rule",
    doc.repeaters.length === snapshotBefore.reps - 1,
  );
  undo();
  await nextTick();
  check(
    "undo restores repeater rule after expand",
    doc.repeaters.length === snapshotBefore.reps,
  );
  const restoredGrid = doc.repeaters.find(
    (r) => r.id === grid.id,
  ) as GridRepeater;
  check(
    "undo restores full parameters",
    JSON.stringify(restoredGrid) === snapshotBefore.gridJson,
  );
  check(
    "undo restores exception association",
    !!restoredGrid.exceptions.find((e) => e.slot === "0,0" && e.dx === 12),
  );
  check(
    "undo removes expanded shapes",
    doc.shapes.length === snapshotBefore.shapes,
  );
  redo();
  await nextTick();
  check(
    "redo re-applies expansion",
    doc.repeaters.length === snapshotBefore.reps - 1,
  );
  undo();

  // 9. 存档/恢复保住规则与例外
  save();
  const savedRaw = localStorage.getItem("forma-document")!;
  const saved = JSON.parse(savedRaw);
  check(
    "localStorage archive holds repeaters",
    Array.isArray(saved.repeaters) && saved.repeaters.length === 3,
  );
  check(
    "localStorage archive holds exceptions",
    saved.repeaters.some(
      (r: { exceptions: unknown[] }) => r.exceptions.length > 0,
    ),
  );
  doc.repeaters = [];
  doc.shapes = [];
  const ok = restore();
  check(
    "restore reloads rules and exceptions",
    ok && doc.repeaters.length === 3,
  );

  // 10. JSON 归档导出/导入往返
  const archive = exportArchive();
  const parsed = JSON.parse(archive);
  check(
    "archive format versioned",
    parsed.format === "forma-project" && parsed.version === 1,
  );
  doc.repeaters = [];
  check("archive import succeeds", importArchive(archive));
  check("imported rules round-trip", doc.repeaters.length === 3);

  // 11. SVG 导出：真实几何 + metadata 规则（XML 中引号转义为 &quot;）
  const currentLayouts = allLayouts(doc.shapes, doc.repeaters);
  const svg = serialize(
    doc.shapes,
    doc.shapes.map(path),
    currentLayouts,
    doc.repeaters,
  );
  check(
    "SVG export embeds repeater metadata rules",
    svg.includes("forma-repeaters") &&
      svg.includes("&quot;type&quot;:&quot;grid&quot;"),
  );
  check(
    "metadata survives XML unescape round-trip",
    JSON.parse(
      svg
        .match(/<metadata[^>]*>([\s\S]*?)<\/metadata>/)![1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">"),
    ).length === 3,
  );
  check(
    "SVG export contains real bezier paths",
    svg.includes(" C ") && !svg.includes("<image"),
  );
  check(
    "SVG export wraps repeater output in groups",
    (svg.match(/data-repeater=/g) || []).length === 3,
  );

  // 12. 从导出的 SVG metadata 回档规则与例外
  const ruleCount = doc.repeaters.length;
  doc.repeaters = [];
  check(
    "SVG re-import restores embedded rules",
    importRulesFromSvg(svg) && doc.repeaters.length === ruleCount,
  );
  check(
    "SVG re-import keeps exception data",
    doc.repeaters.some((r) => r.exceptions.length > 0),
  );
  check("SVG without metadata is rejected", !importRulesFromSvg("<svg></svg>"));

  console.log(`\n${pass} passed, ${fails.length} failed`);
  process.exit(fails.length ? 1 : 0);
})();
