import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getContactCrm, listContactActivities, listContactActions } from "../api.js?v=3";

export default defineComponent({
  name: "ContactCrm",
  props: { cardId: String },
  setup(props) {
    const crmData = ref(null);
    const activities = ref([]);
    const actions = ref([]);
    const loading = ref(true);
    const error = ref("");

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

    function section(title, body, extraStyle = "") {
      return h("div", { class: "card", style: `margin:12px 16px 0;${extraStyle}` }, [
        h("div", { class: "crm-section-title" }, title),
        body,
      ]);
    }

    return () => {
      if (error.value) return h("div", { style: "padding:16px;color:var(--color-danger);" }, `❌ ${error.value}`);
      if (loading.value) return h("div", { class: "loading-state" }, [h("p", {}, "載入中…")]);
      if (!crmData.value) return h("div", { style: "padding:16px;color:var(--color-danger);" }, "找不到資料");

      const { card, contact, deals } = crmData.value;
      const entity = contact || card;
      const displayName = entity?.display_name || entity?.name || "（無名稱）";
      const subTitle = [entity?.title, entity?.company || (contact && contact.contact_type === "company" ? contact.legal_name : null)].filter(Boolean).join(" · ");

      return h("div", { style: "padding-bottom:24px;" }, [
        h("div", {
          style: "margin:12px 16px 0;padding:18px;border-radius:18px;background:linear-gradient(135deg,var(--color-primary) 0%, var(--color-primary-dark) 100%);color:#fff;box-shadow:var(--shadow-card);",
        }, [
          h("div", { style: "font-family:var(--font-headline);font-size:24px;font-weight:800;" }, displayName),
          subTitle ? h("div", { style: "font-size:12px;opacity:0.82;margin-top:4px;" }, subTitle) : null,
          h("div", { style: "display:flex;gap:8px;margin-top:14px;" }, [
            h("button", {
              onClick: () => {
                const p = new URLSearchParams();
                const company = entity?.company || (contact?.contact_type === "company" ? contact.legal_name : null);
                if (company) p.set("company", company);
                if (displayName) p.set("contact", displayName);
                if (entity?.id) p.set("contact_id", entity.id);
                window.location.hash = `#/crm?${p.toString()}`;
              },
              style: "flex:1;padding:10px;border-radius:12px;background:rgba(255,255,255,0.18);color:#fff;border:1px solid rgba(255,255,255,0.28);font-size:13px;font-weight:700;",
            }, "記錄互動"),
            h("button", {
              onClick: () => {
                const p = new URLSearchParams();
                const company = entity?.company || (contact?.contact_type === "company" ? contact.legal_name : null);
                if (company) p.set("company", company);
                if (displayName) p.set("contact", displayName);
                if (entity?.id) p.set("contact_id", entity.id);
                window.location.hash = `#/deals/new?${p.toString()}`;
              },
              style: "flex:1;padding:10px;border-radius:12px;background:#fff;color:var(--color-primary-dark);font-size:13px;font-weight:700;",
            }, "新增案件"),
          ]),
        ]),

        section(`案件 (${deals.length})`, deals.length > 0
          ? h("div", { style: "display:flex;flex-direction:column;gap:8px;" }, deals.map(deal => h("div", {
              key: deal.id,
              class: "left-accent-deal",
              style: "cursor:pointer;",
              onClick: () => { window.location.hash = `#/deals/${deal.id}`; },
            }, [
              h("div", { style: "font-size:14px;font-weight:700;color:var(--color-text-primary);" }, deal.entity_name || "（無名稱）"),
              h("div", { style: "font-size:12px;color:var(--color-text-secondary);margin-top:4px;" }, deal.status_summary || "尚無摘要"),
              h("div", { style: "font-size:11px;color:var(--color-text-secondary);margin-top:8px;font-weight:700;" }, deal.est_value ? `NT$ ${deal.est_value.toLocaleString()}` : "未估金額"),
            ])))
          : h("div", { class: "empty-state" }, "尚無案件")),

        section(`最近互動 (${activities.value.length})`,
          activities.value.length > 0
            ? h("div", { style: "display:flex;flex-direction:column;gap:8px;" }, activities.value.map(activity => h("div", {
                key: activity.id,
                style: "background:var(--color-bg-2);border-radius:14px;padding:12px;",
              }, [
                h("div", { style: "font-size:12px;color:var(--color-text-primary);line-height:1.6;" }, activity.raw_transcript?.slice(0, 110) || "（無內容）"),
                activity.created_at ? h("div", { style: "font-size:11px;color:var(--color-text-secondary);margin-top:8px;" }, new Date(activity.created_at).toLocaleString()) : null,
              ].filter(Boolean))))
            : h("div", { class: "empty-state" }, "尚無互動紀錄")),

        section(`待辦事項 (${actions.value.length})`,
          actions.value.length > 0
            ? h("div", { style: "display:flex;flex-direction:column;gap:8px;" }, actions.value.map(action => h("div", {
                key: action.id,
                class: "left-accent-action",
              }, [
                h("div", { style: "font-size:13px;font-weight:700;color:var(--color-text-primary);" }, action.task_detail || "（無詳細內容）"),
                action.due_date ? h("div", { style: "font-size:11px;color:var(--color-text-secondary);margin-top:6px;" }, `到期：${action.due_date}`) : null,
              ].filter(Boolean))))
            : h("div", { class: "empty-state" }, "尚無待辦事項")),
      ]);
    };
  },
});
