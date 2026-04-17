// DealList.js — Kanban board of deals by stage
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { listDeals } from "../api.js?v=3";

const STAGE_LABELS = {
  "0": "洽詢", "1": "報價", "2": "提案", "3": "評估",
  "4": "談判", "5": "決策", "6": "簽約", "成交": "✅ 成交", "失敗": "❌ 失敗"
};
const PIPELINE_STAGES = ["0", "1", "2", "3", "4", "5", "6"];
const ALL_STAGES = [...PIPELINE_STAGES, "成交", "失敗"];

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

    return () => {
      if (error.value) {
        return h("div", { style: "padding:16px;color:red;text-align:center;" }, `❌ ${error.value}`);
      }
      if (loading.value) {
        return h("div", { style: "padding:16px;text-align:center;color:#999;" }, "載入中…");
      }

      const hasAnyDeal = deals.value.length > 0;

      if (!hasAnyDeal) {
        return h("div", { class: "page-container", style: "background:var(--color-surface);min-height:100%;" }, [
          h("div", { class: "empty-state" }, [
            h("div", { class: "empty-state-icon" }, "📊"),
            h("div", { class: "empty-state-text" }, "尚無案件"),
            h("div", { class: "empty-state-hint" }, "點上方「+ 新增」開始建立案件"),
          ]),
        ]);
      }

      // Show pipeline stages always + terminal stages only if they have deals
      const stagesToShow = ALL_STAGES.filter(stage => {
        if (PIPELINE_STAGES.includes(stage)) return true;
        return getDealsByStage(stage).length > 0;
      });

      const stageGroups = stagesToShow.map(stage => {
        const stageDeals = getDealsByStage(stage);
        if (stageDeals.length === 0) return null;
        const label = STAGE_LABELS[stage] || stage;

        return h("div", { key: stage }, [
          h("div", {
            style: "font-size:13px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin:16px 0 8px;",
          }, `${label} (${stageDeals.length})`),
          ...stageDeals.map(deal =>
            h("div", {
              key: deal.id,
              class: "left-accent-deal",
              style: "cursor:pointer;",
              onClick: () => goDetail(deal.id),
            }, [
              h("div", { style: "font-weight:600;font-size:14px;color:var(--color-text-primary);" }, deal.entity_name || "（未知客戶）"),
              h("div", { style: "font-size:12px;color:var(--color-text-secondary);margin-top:4px;display:flex;gap:8px;" }, [
                h("span", { class: "stage-badge" }, label),
                deal.est_value ? h("span", {}, `NT$${deal.est_value.toLocaleString()}`) : null,
              ].filter(Boolean)),
            ])
          ),
        ]);
      }).filter(Boolean);

      return h("div", { class: "page-container", style: "background:var(--color-surface);min-height:100%;" }, stageGroups);
    };
  },
});
