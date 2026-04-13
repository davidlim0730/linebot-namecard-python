// Login.js — shown when auth fails or user has no org
import { defineComponent, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "Login",
  props: {
    message: { type: String, default: "請從 LINE 聊天室開啟此頁面" },
  },
  setup(props) {
    return () =>
      h("div", { style: "text-align:center;padding:40px 20px;font-family:sans-serif;" }, [
        h("p", { style: "font-size:18px;color:#555;" }, "⚠️"),
        h("p", { style: "font-size:16px;color:#333;margin-top:8px;" }, props.message),
      ]);
  },
});
