// DealList.js — Kanban board of deals by stage
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { listDeals } from "../api.js";

const STAGES = ["0", "1", "2", "3", "4", "5", "6", "成交", "失敗"];

export default defineComponent({
  name: "DealList",
  setup() {
    const deals = ref([]);
    const loading = ref(true);
    const error = ref("");

    async function load() {
      loading.value = true;
      error.value = "";
      try {
        deals.value = await listDeals();
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    function goDetail(dealId) {
      window.location.hash = `#/deals/${dealId}`;
    }

    function getDealsByStage(stage) {
      return deals.value.filter(d => d.stage === stage);
    }

    function renderDealCard(deal) {
      return h("div", {
        key: deal.id,
        onClick: () => goDetail(deal.id),
        style: `
          background:#fff;
          border:1px solid #ddd;
          border-radius:8px;
          padding:12px;
          margin-bottom:8px;
          cursor:pointer;
          transition:box-shadow 0.2s;
          box-shadow:0 1px 2px rgba(0,0,0,0.05);
        `,
        onMouseEnter: (e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; },
        onMouseLeave: (e) => { e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)"; },
      }, [
        h("div", { style: "font-weight:600;font-size:14px;margin-bottom:4px;" }, deal.entity_name || "（未知客戶）"),
        deal.est_value ? h("div", { style: "font-size:13px;color:#0084FF;font-weight:600;" }, `NT$${deal.est_value.toLocaleString()}`) : null,
        deal.next_action_date ? h("div", { style: "font-size:12px;color:#666;margin-top:4px;" }, `📅 ${deal.next_action_date}`) : null,
        deal.is_pending ? h("div", { style: "font-size:11px;background:#ffc107;color:#333;padding:2px 6px;border-radius:3px;display:inline-block;margin-top:4px;" }, "🔒 暫停") : null,
      ].filter(Boolean));
    }

    function renderStageColumn(stage) {
      const stageDeal = getDealsByStage(stage);
      const labels = {
        "0": "洽詢", "1": "報價", "2": "提案", "3": "評估",
        "4": "談判", "5": "決策", "6": "簽約", "成交": "成交", "失敗": "失敗"
      };

      return h("div", {
        style: `
          flex:0 0 280px;
          background:#f5f5f5;
          border-radius:8px;
          padding:12px;
          margin-right:12px;
        `,
      }, [
        h("h3", {
          style: `
            margin:0 0 12px 0;
            font-size:14px;
            font-weight:600;
            color:#333;
          `,
        }, `${labels[stage] || stage} (${stageDeal.length})`),
        h("div", { style: "max-height:calc(100vh - 160px);overflow-y:auto;" }, stageDeal.map(d => renderDealCard(d))),
      ]);
    }

    return () => {
      if (error.value) {
        return h("div", { style: "padding:16px;color:red;text-align:center;" }, `❌ ${error.value}`);
      }
      if (loading.value) {
        return h("div", { style: "padding:16px;text-align:center;color:#999;" }, "載入中…");
      }

      return h("div", { style: "padding:12px;background:#fff;overflow-x:auto;" }, [
        h("h2", { style: "margin:0 0 16px 0;font-size:20px;color:#222;" }, "📊 Pipeline"),
        h("div", { style: "display:flex;padding-bottom:12px;" }, STAGES.map(stage => renderStageColumn(stage))),
      ]);
    };
  },
});
