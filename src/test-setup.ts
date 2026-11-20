// 必须在任何 Vue 模块导入前执行：为 SSR 环境安装 happy-dom 全局对象
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/" });
const define = (key: string, value: unknown) => {
  try {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  } catch {
    /* 某些全局只读，忽略 */
  }
};
define("window", win);
define("document", win.document);
define("navigator", win.navigator);
// happy-dom 的 localStorage 用 structuredClone，无法克隆 Vue 响应式代理；
// 测试环境替换为纯 JSON 内存实现
const memoryStore = new Map<string, string>();
define("localStorage", {
  getItem: (k: string) => (memoryStore.has(k) ? memoryStore.get(k)! : null),
  setItem: (k: string, v: string) => void memoryStore.set(k, String(v)),
  removeItem: (k: string) => void memoryStore.delete(k),
  clear: () => memoryStore.clear(),
  key: (i: number) => [...memoryStore.keys()][i] ?? null,
  get length() {
    return memoryStore.size;
  },
});
define("customElements", win.customElements);
define("Event", win.Event);
define("MouseEvent", win.MouseEvent);
define("crypto", win.crypto);
define("requestAnimationFrame", (cb: FrameRequestCallback) =>
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
  define(key, (win as unknown as Record<string, unknown>)[key]);
}
export { win };
