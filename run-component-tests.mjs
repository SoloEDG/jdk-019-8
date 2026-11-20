// 测试运行器：
// 1) Node 侧先安装 happy-dom 全局对象
// 2) 用 Vite 以浏览器模式把测试入口构建成单个 ESM（.vue 按客户端方式编译）
// 3) 在同一全局环境中执行构建产物
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/" });
const define = (key, value) => {
  try {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  } catch {}
};
define("window", win);
define("document", win.document);
define("navigator", win.navigator);
define("localStorage", win.localStorage);
define("customElements", win.customElements);
define("Event", win.Event);
define("MouseEvent", win.MouseEvent);
define("crypto", win.crypto);
define("requestAnimationFrame", (cb) =>
  setTimeout(() => cb(performance.now()), 0),
);
for (const key of [
  "Element",
  "SVGElement",
  "Node",
  "Text",
  "Comment",
  "DocumentFragment",
  "HTMLElement",
  "SVGPathElement",
  "DOMParser",
  "NodeFilter",
]) {
  define(key, win[key]);
}

const { build } = await import("vite");
const { default: vue } = await import("@vitejs/plugin-vue");
const entry = process.argv[2] || "/src/component-test.ts";
await build({
  configFile: false,
  plugins: [vue()],
  logLevel: "warn",
  build: {
    lib: { entry, formats: ["es"], fileName: () => "bundle.mjs" },
    outDir: "node_modules/.cache/forma-test",
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    rollupOptions: {
      external: [/^node:.*/, "happy-dom", /^happy-dom\//],
    },
  },
});
await import("./node_modules/.cache/forma-test/bundle.mjs");
