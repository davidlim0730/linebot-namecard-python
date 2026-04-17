// ContactCrm.js — CRM view of a single contact (deals + activities + actions)
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getContactCrm, listContactActivities, listContactActions } from "../api.js?v=3";

export default defineComponent({
  name: "ContactCrm",
  props: { cardId: String },
  setup(props) {
    const crmData  = ref(null);
    const activities = ref([]);
    const actions  = ref([]);
    const loading  = ref(true);
    const error    = ref("");

    onMounted(async () => {
      try {
        [crmData.value, activities.value, actions.value] = await Promise.all([
          getContactCrm(props.cardId),
          listContactActivities(props.cardId),
          listContactActions(props.cardId, "pending"),
        ]);
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    });

    function renderDeal(deal) {
      return h("div", {
        key: deal.id,
        class: "left-accent-deal",
        style: "cursor:pointer;",
        onClick: () => { window.location.hash = `#/deals/${deal.id}`; },
      }, [
        h("div", { style: "font-weight:600;font-size:14px;color:var(--color-text-primary);" }, deal.entity_name || "（無名稱）"),
        h("div", { style: "font-size:12px;color:var(--color-text-secondary);margin-top:4px;display:flex;gap:8px;" }, [
          h("span", { class: "stage-badge" }, `Stage: ${deal.stage}`),
          deal.est_value ? h("span", {}, `NT$${deal.est_value.toLocaleString()}`) : null,
        ].filter(Boolean)),
        deal.status_summary ? h("div", { style: "font-size:12px;color:var(--color-text-secondary);margin-top:4px;" }, deal.status_summary) : null,
      ].filter(Boolean));
    }

    function renderActivity(a) {
      return h("div", {
        key: a.id,
        class: "left-accent-activity",
      }, [
        a.ai_key_insights && a.ai_key_insights.length > 0
          ? h("div", { style: "font-size:13px;color:var(--color-text-primary);" }, a.ai_key_insights.map((ins, i) => h("div", { key: i }, `• ${ins}`)))
          : h("div", { style: "font-size:13px;color:var(--color-text-secondary);" }, a.raw_transcript?.slice(0, 80) || "（無內容）"),
        h("div", { style: "font-size:12px;color:var(--color-text-secondary);margin-top:4px;" }, new Date(a.created_at).toLocaleString()),
      ]);
    }

    function renderAction(a) {
      return h("div", {
        key: a.id,
        class: "left-accent-action",
      }, [
        h("div", { style: "font-size:13px;color:var(--color-text-primary);font-weight:500;" }, a.task_detail || "（無詳細內容）"),
        a.due_date ? h("div", { style: "font-size:12px;color:var(--color-text-secondary);margin-top:4px;" }, `到期：${a.due_date}`) : null,
      ].filter(Boolean));
    }

    return () => {
      if (error.value)   return h("div", { style: "padding:16px;color:red;" }, `❌ ${error.value}`);
      if (loading.value) return h("div", { style: "padding:16px;text-align:center;color:#999;" }, "載入中…");
      if (!crmData.value)   return h("div", { style: "padding:16px;color:red;" }, "找不到資料");

      const { card, contact, deals } = crmData.value;
      // Support both new Contact schema and legacy Card schema
      const entity = contact || card;
      const displayName = entity?.display_name || entity?.name || "（無名稱）";
      const subTitle = [entity?.title, entity?.company || (contact && contact.contact_type === "company" ? contact.legal_name : null)].filter(Boolean).join(" · ");

      return h("div", { style: "background:var(--color-surface);padding-bottom:24px;" }, [
        // Hero row
        h("div", { style: "padding:16px;background:var(--color-primary);color:#fff;" }, [
          h("div", { style: "font-size:20px;font-weight:700;" }, displayName),
          subTitle ? h("div", { style: "font-size:13px;opacity:0.85;margin-top:4px;" }, subTitle) : null,
        ]),

        // Deals section
        h("div", { class: "card", style: "margin:12px 16px;" }, [
          h("div", { style: "display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;" }, [
            h("div", { class: "crm-section-title" }, `📊 案件 (${deals.length})`),
            h("button", {
              onClick: () => { window.location.hash = `#/crm`; },
              style: "padding:6px 12px;background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-md);font-size:12px;cursor:pointer;",
            }, "+ 新增案件"),
          ]),
          deals.length > 0
            ? deals.map(d => renderDeal(d))
            : h("div", { class: "empty-state-text" }, "尚無案件"),
        ]),

        // Activities section
        h("div", { class: "card", style: "margin:0 16px 12px;" }, [
          h("div", { class: "crm-section-title", style: "margin-bottom:12px;" }, `💬 互動紀錄 (${activities.value.length})`),
          activities.value.length > 0
            ? activities.value.map(a => renderActivity(a))
            : h("div", { class: "empty-state-text" }, "尚無互動紀錄"),
        ]),

        // Actions section
        h("div", { class: "card", style: "margin:0 16px 12px;" }, [
          h("div", { class: "crm-section-title", style: "margin-bottom:12px;" }, `📌 待辦事項 (${actions.value.length})`),
          actions.value.length > 0
            ? actions.value.map(a => renderAction(a))
            : h("div", { class: "empty-state-text" }, "尚無待辦事項"),
        ]),
      ]);
    };
  },
});
