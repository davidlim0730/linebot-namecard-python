// app.js — LIFF init, auth, and hash router
import { createApp, defineComponent, ref, onMounted, onUnmounted, h, computed } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { login, isAuthenticated } from "./api.js?v=3";
import Login from "./views/Login.js?v=3";
import CardList from "./views/CardList.js?v=3";
import CardDetail from "./views/CardDetail.js?v=3";
import CardEdit from "./views/CardEdit.js?v=3";
import CrmInput from "./views/CrmInput.js?v=3";
import DealList from "./views/DealList.js?v=3";
import DealDetail from "./views/DealDetail.js?v=3";
import ActionList from "./views/ActionList.js?v=3";
import ContactCrm from "./views/ContactCrm.js?v=3";
import ManagerPipeline from "./views/ManagerPipeline.js?v=3";
import ProductList from "./views/ProductList.js?v=3";
import TeamPage from "./views/TeamPage.js?v=3";
import SettingsPage from "./views/SettingsPage.js?v=3";
import BottomNav from "./components/BottomNav.js?v=3";
import Toast from "./components/Toast.js?v=3";
import Header from "./components/Header.js?v=3";

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
  if (path === "/crm")      return { view: "CrmInput", tab: "cards" };
  if (path === "/deals")    return { view: "DealList", tab: "crm" };
  if (path === "/actions")  return { view: "ActionList", tab: "cards" };
  if (path === "/pipeline") return { view: "ManagerPipeline", tab: "cards" };
  if (path === "/products") return { view: "ProductList", tab: "cards" };
  if (path === "/team")     return { view: "TeamPage", tab: "team" };
  if (path === "/settings") return { view: "SettingsPage", tab: "settings" };
  const dealMatch    = path.match(/^\/deals\/([^/]+)$/);
  if (dealMatch)    return { view: "DealDetail", dealId: dealMatch[1], tab: "crm" };
  const contactCrm  = path.match(/^\/contacts\/([^/]+)\/crm$/);
  if (contactCrm)   return { view: "ContactCrm", cardId: contactCrm[1], tab: "crm" };
  const editMatch   = path.match(/^\/cards\/([^/]+)\/edit$/);
  if (editMatch)    return { view: "CardEdit", cardId: editMatch[1], tab: "cards" };
  const detailMatch = path.match(/^\/cards\/([^/]+)$/);
  if (detailMatch)  return { view: "CardDetail", cardId: detailMatch[1], tab: "cards" };
  return { view: "CardList", tab: "cards" };
}

const App = defineComponent({
  name: "App",
  components: {
    BottomNav,
    Toast
  },
  setup() {
    const liffReady = ref(false);
    const authError = ref("");
    const route = ref(parseRoute(window.location.hash));
    const toastMessage = ref("");
    const toastType = ref("info");
    const toastVisible = ref(false);
    const toastDuration = ref(3000);

    function onHashChange() {
      route.value = parseRoute(window.location.hash);
    }

    function showToast(message, type = "info", duration = 3000) {
      toastMessage.value = message;
      toastType.value = type;
      toastDuration.value = duration;
      toastVisible.value = true;
    }

    function closeToast() {
      toastVisible.value = false;
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

    // Provide showToast to all child components
    return {
      liffReady,
      authError,
      route,
      toastMessage,
      toastType,
      toastVisible,
      toastDuration,
      showToast,
      closeToast,
      renderFn: () => {
        if (authError.value) return h(Login, { message: authError.value });
        if (!liffReady.value) return h("div", { style: "text-align:center;padding:60px;color:#999;font-family:sans-serif;" }, "載入中…");

        const { view, cardId, dealId, tab } = route.value;
        let currentView;
        if (view === "CrmInput")       currentView = h(CrmInput);
        else if (view === "DealList")       currentView = h(DealList);
        else if (view === "DealDetail")     currentView = h(DealDetail, { dealId });
        else if (view === "ActionList")     currentView = h(ActionList);
        else if (view === "ContactCrm")     currentView = h(ContactCrm, { cardId });
        else if (view === "ManagerPipeline") currentView = h(ManagerPipeline);
        else if (view === "ProductList")    currentView = h(ProductList);
        else if (view === "CardEdit")       currentView = h(CardEdit, { cardId });
        else if (view === "CardDetail")     currentView = h(CardDetail, { cardId });
        else if (view === "TeamPage")       currentView = h(TeamPage);
        else if (view === "SettingsPage")   currentView = h(SettingsPage);
        else currentView = h(CardList);

        // 只在主視圖展示 BottomNav（避免在詳細頁面疊加）
        const showBottomNav = view === "CardList" || view === "TeamPage" || view === "SettingsPage" || view === "CrmInput" || view === "DealList" || view === "ActionList" || view === "ManagerPipeline" || view === "ProductList";

        // Determine header config based on route
        const headerConfigs = {
          "CardList":        { title: "🗂️ 名片", actionLabel: null },
          "DealList":        { title: "📊 CRM", actionLabel: "+ 新增", onAction: () => { window.location.hash = "#/crm"; } },
          "ActionList":      { title: "📌 待辦", actionLabel: null },
          "TeamPage":        { title: "👥 團隊", actionLabel: null },
          "SettingsPage":    { title: "⚙️ 設定", actionLabel: null },
          "CrmInput":        { title: "新增 CRM 記錄", showBack: true },
          "DealDetail":      { title: "案件詳情", showBack: true },
          "CardDetail":      { title: "名片詳情", showBack: true },
          "CardEdit":        { title: "編輯名片", showBack: true },
          "ContactCrm":      { title: "聯絡人 CRM", showBack: true },
          "ManagerPipeline": { title: "Pipeline", showBack: true },
          "ProductList":     { title: "產品管理", showBack: true },
        };
        const hConfig = headerConfigs[view] || { title: "" };
        const headerEl = h(Header, {
          title: hConfig.title || "",
          showBack: hConfig.showBack || false,
          actionLabel: hConfig.actionLabel || "",
          onAction: hConfig.onAction || null,
        });

        return h("div", { style: "display:flex;flex-direction:column;height:100vh;" }, [
          headerEl,
          h("div", { style: "flex:1;overflow-y:auto;padding-bottom:" + (showBottomNav ? "56px" : "0") + ";" }, currentView),
          h(Toast, {
            message: toastMessage.value,
            type: toastType.value,
            visible: toastVisible.value,
            duration: toastDuration.value,
            onClose: closeToast
          }),
          showBottomNav ? h(BottomNav, { currentTab: tab || "cards" }) : null
        ]);
      }
    };
  },
  render() {
    return this.renderFn();
  },
  provide() {
    return {
      showToast: this.showToast,
      closeToast: this.closeToast
    };
  }
});

const app = createApp(App);
app.mount("#app");
