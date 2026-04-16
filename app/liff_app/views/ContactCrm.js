// ContactCrm.js — CRM view of a single contact (deals + activities)
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getContactCrm } from "../api.js";

export default defineComponent({
  name: "ContactCrm",
  props: { cardId: String },
  setup(props) {
    const data    = ref(null);
    const loading = ref(true);
    const error   = ref("");

    onMounted(async () => {
      try {
        data.value = await getContactCrm(props.cardId);
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    });

    function renderDeal(deal) {
      return h("div", {
        key: deal.id,
        onClick: () => { window.location.hash = `#/deals/${deal.id}`; },
        style: `
          background:#f5f5f5;
          padding:12px;
          border-radius:4px;
          margin-bottom:8px;
          cursor:pointer;
          border-left:3px solid #0084FF;
        `,
      }, [
        h("div", { style: "font-weight:600;font-size:14px;" }, deal.entity_name || "（無名稱）"),
        h("div", { style: "font-size:13px;color:#666;margin-top:4px;" }, [
          `Stage: ${deal.stage}`,
          deal.est_value ? ` · NT$${deal.est_value.toLocaleString()}` : "",
        ]),
        deal.status_summary ? h("div", { style: "font-size:12px;color:#999;margin-top:4px;" }, deal.status_summary) : null,
      ].filter(Boolean));
    }

    function renderActivity(a) {
      return h("div", {
        key: a.id,
        style: "padding:12px;border-left:3px solid #31A24C;background:#f5f5f5;border-radius:4px;margin-bottom:8px;",
      }, [
        a.ai_key_insights && a.ai_key_insights.length > 0
          ? h("div", { style: "font-size:13px;color:#555;" }, a.ai_key_insights.map((ins, i) => h("div", { key: i }, `• ${ins}`)))
          : h("div", { style: "font-size:13px;color:#888;" }, a.raw_transcript?.slice(0, 80) || "（無內容）"),
        h("div", { style: "font-size:12px;color:#999;margin-top:4px;" }, new Date(a.created_at).toLocaleString()),
      ]);
    }

    return () => {
      if (error.value)   return h("div", { style: "padding:16px;color:red;" }, `❌ ${error.value}`);
      if (loading.value) return h("div", { style: "padding:16px;text-align:center;color:#999;" }, "載入中…");
      if (!data.value)   return h("div", { style: "padding:16px;color:red;" }, "找不到資料");

      const { card, contact, deals, activities } = data.value;
      // Support both new Contact schema and legacy Card schema
      const entity = contact || card;
      const displayName = entity?.display_name || entity?.name || "（無名稱）";
      const subTitle = [entity?.title, entity?.company || (contact && contact.contact_type === "company" ? contact.legal_name : null)].filter(Boolean).join(" · ");

      return h("div", { style: "background:#fff;" }, [
        // Header
        h("div", { style: "padding:16px;background:#0084FF;color:#fff;" }, [
          h("button", {
            onClick: () => { history.back(); },
            style: "background:rgba(255,255,255,0.2);color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;margin-bottom:12px;display:block;",
          }, "← 返回"),
          h("h1", { style: "margin:0;font-size:22px;" }, displayName),
          subTitle ? h("div", { style: "font-size:14px;opacity:0.85;margin-top:4px;" }, subTitle) : null,
        ]),

        // Deals section
        h("div", { style: "padding:16px;border-bottom:1px solid #eee;" }, [
          h("div", { style: "display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;" }, [
            h("h3", { style: "margin:0;font-size:15px;" }, `📊 案件 (${deals.length})`),
            h("button", {
              onClick: () => { window.location.hash = `#/crm`; },
              style: "padding:6px 12px;background:#0084FF;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;",
            }, "+ 新增案件"),
          ]),
          deals.length > 0
            ? deals.map(d => renderDeal(d))
            : h("div", { style: "color:#999;font-size:13px;" }, "尚無案件"),
        ]),

        // Activities section
        h("div", { style: "padding:16px;" }, [
          h("h3", { style: "margin:0 0 12px 0;font-size:15px;" }, `💬 互動紀錄 (${activities.length})`),
          activities.length > 0
            ? activities.map(a => renderActivity(a))
            : h("div", { style: "color:#999;font-size:13px;" }, "尚無互動紀錄"),
        ]),
      ]);
    };
  },
});
