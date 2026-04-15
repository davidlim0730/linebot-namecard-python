// app.js — LIFF init, auth, and hash router
import { createApp, defineComponent, ref, onMounted, onUnmounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { login, isAuthenticated } from "./api.js";
import Login from "./views/Login.js";
import CardList from "./views/CardList.js";
import CardDetail from "./views/CardDetail.js";
import CardEdit from "./views/CardEdit.js";
import CrmInput from "./views/CrmInput.js";
import DealList from "./views/DealList.js";
import DealDetail from "./views/DealDetail.js";
import ActionList from "./views/ActionList.js";
import ContactCrm from "./views/ContactCrm.js";
import ManagerPipeline from "./views/ManagerPipeline.js";
import ProductList from "./views/ProductList.js";

// ---- Router ----
// #/               → CardList
// #/crm            → CrmInput
// #/deals          → DealList
// #/deals/:id      → DealDetail
// #/actions        → ActionList
// #/contacts/:id/crm → ContactCrm
// #/pipeline       → ManagerPipeline (admin)
// #/products       → ProductList (admin)
// #/cards/:id      → CardDetail
// #/cards/:id/edit → CardEdit

function parseRoute(hash) {
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/crm")      return { view: "CrmInput" };
  if (path === "/deals")    return { view: "DealList" };
  if (path === "/actions")  return { view: "ActionList" };
  if (path === "/pipeline") return { view: "ManagerPipeline" };
  if (path === "/products") return { view: "ProductList" };
  const dealMatch    = path.match(/^\/deals\/([^/]+)$/);
  if (dealMatch)    return { view: "DealDetail", dealId: dealMatch[1] };
  const contactCrm  = path.match(/^\/contacts\/([^/]+)\/crm$/);
  if (contactCrm)   return { view: "ContactCrm", cardId: contactCrm[1] };
  const editMatch   = path.match(/^\/cards\/([^/]+)\/edit$/);
  if (editMatch)    return { view: "CardEdit", cardId: editMatch[1] };
  const detailMatch = path.match(/^\/cards\/([^/]+)$/);
  if (detailMatch)  return { view: "CardDetail", cardId: detailMatch[1] };
  return { view: "CardList" };
}

const App = defineComponent({
  name: "App",
  setup() {
    const liffReady = ref(false);
    const authError = ref("");
    const route = ref(parseRoute(window.location.hash));

    function onHashChange() {
      route.value = parseRoute(window.location.hash);
    }

    onMounted(async () => {
      window.addEventListener("hashchange", onHashChange);

      // LIFF init
      try {
        await liff.init({ liffId: window.__LIFF_ID__ });
      } catch (e) {
        authError.value = "LIFF 初始化失敗，請從 LINE 開啟";
        return;
      }

      // Auth: skip if already have JWT
      if (!isAuthenticated()) {
        try {
          const idToken = liff.getIDToken();
          if (!idToken) throw new Error("no id_token");
          await login(idToken);
        } catch (e) {
          authError.value = e.data?.error === "no_org"
            ? "您尚未加入任何團隊，請先在 LINE Bot 完成設定"
            : "登入失敗，請重新開啟";
          return;
        }
      }

      liffReady.value = true;
    });

    onUnmounted(() => {
      window.removeEventListener("hashchange", onHashChange);
    });

    return () => {
      if (authError.value) return h(Login, { message: authError.value });
      if (!liffReady.value) return h("div", { style: "text-align:center;padding:60px;color:#999;font-family:sans-serif;" }, "載入中…");

      const { view, cardId, dealId } = route.value;
      if (view === "CrmInput")       return h(CrmInput);
      if (view === "DealList")       return h(DealList);
      if (view === "DealDetail")     return h(DealDetail, { dealId });
      if (view === "ActionList")     return h(ActionList);
      if (view === "ContactCrm")     return h(ContactCrm, { cardId });
      if (view === "ManagerPipeline") return h(ManagerPipeline);
      if (view === "ProductList")    return h(ProductList);
      if (view === "CardEdit")       return h(CardEdit, { cardId });
      if (view === "CardDetail")     return h(CardDetail, { cardId });
      return h(CardList);
    };
  },
});

createApp(App).mount("#app");
