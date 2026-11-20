// 完整 App 挂载冒烟：验证组装后的真实应用可渲染并完成核心交互
import "./test-setup";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import App from "./app/App.vue";
import { doc } from "./shared/document";
import { seed } from "./features/drawing/model/seed";

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

(async () => {
  localStorage.clear();
  doc.shapes = [];
  doc.repeaters = [];
  doc.selected = [];
  doc.selectedRepeater = null;
  doc.selectedInstance = null;

  const wrapper = mount(App, { attachTo: document.body });
  await nextTick();
  await new Promise((r) => setTimeout(r, 20));

  check("app mounts with seeded repeater", doc.repeaters.length === 1);
  check(
    "canvas renders a repeater path",
    wrapper.findAll(".repeater-layer path").length === 1,
  );
  check(
    "repeater panel lists the rule",
    wrapper.findAll(".repeater-item").length === 1,
  );
  check(
    "right rail shows repeater properties",
    wrapper.find('[data-testid="repeater-props"]').exists(),
  );

  // 端到端：通过面板把环形数量改为 6，画布同步
  await wrapper.find('[data-testid="field-count"]').setValue("6");
  await nextTick();
  const d = wrapper.find(".repeater-layer path").attributes("d");
  check(
    "panel count change flows through to canvas",
    (d?.match(/M /g) || []).length === 6,
  );

  // 端到端：点图层里的源图形 → 右侧切回外观面板
  const layerButtons = wrapper.findAll(".layer");
  check("layers panel shows source shape", layerButtons.length >= 1);
  await layerButtons[0].trigger("click");
  await nextTick();
  check(
    "selecting shape switches rail back to appearance",
    wrapper.find("aside h3").exists() &&
      !wrapper.find('[data-testid="repeater-props"]').exists(),
  );

  // 端到端：重新选中重复器 → 参数面板回归
  await wrapper.find(".repeater-item").trigger("click");
  await nextTick();
  check(
    "clicking repeater item opens its properties",
    wrapper.find('[data-testid="repeater-props"]').exists(),
  );

  // 端到端：展开按钮把规则实体化为真实图形
  const shapesBefore = doc.shapes.length;
  await wrapper.find('[data-testid="expand"]').trigger("click");
  await nextTick();
  check(
    "expand via UI creates shapes and removes rule",
    doc.repeaters.length === 0 && doc.shapes.length === shapesBefore + 6,
  );

  // 存档内容已写入（watch 深度监听；应用写入全局 localStorage 内存实现）
  const stored = JSON.parse(localStorage.getItem("forma-document") || "{}");
  check(
    "autosave persisted the expanded state",
    Array.isArray(stored.shapes) && stored.repeaters.length === 0,
  );

  wrapper.unmount();
  console.log(`\n${pass} passed, ${fails.length} failed`);
  process.exit(fails.length ? 1 : 0);
})();
