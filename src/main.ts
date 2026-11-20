import { createApp } from "vue";
import App from "./app/App.vue";
import "./app/style.css";
import { doc } from "./shared/document";
createApp(App).mount("#app");

// 调试/自动化测试句柄：暴露响应式文档状态
if (typeof window !== "undefined") {
  (window as unknown as { __forma__: unknown }).__forma__ = { doc };
}
