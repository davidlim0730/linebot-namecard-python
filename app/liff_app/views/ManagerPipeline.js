// ManagerPipeline.js — admin-only team pipeline overview
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getPipelineSummary } from "../api.js";

const STAGE_LABELS = {
  "0":"洽詢","1":"報價","2":"提案","3":"評估","4":"談判","5":"決策","6":"簽約","成交":"成交","失敗":"失敗",
};

export default defineComponent({
  name: "ManagerPipeline",
  setup() {
    const summary   = ref(null);
    const loading   = ref(true);
    const error     = ref("");
    const filterUser = ref("");

    onMounted(async () => {
      try {
        summary.value = await getPipelineSummary();
      } catch (e) {
        error.value = e.status === 403 ? "僅限主管查看" : (e.message || "載入失敗");
      } finally {
        loading.value = false;
      }
    });

    function renderStageBar() {
      const byStage = summary.value?.by_stage || {};
      const total   = Object.values(byStage).reduce((s, n) => s + n, 0) || 1;
      const stageColors = {
        "0":"#90CAF9","1":"#64B5F6","2":"#42A5F5","3":"#2196F3",
        "4":"#1E88E5","5":"#1565C0","6":"#0D47A1","成交":"#31A24C","失敗":"#E53935",
      };

      return h("div", { style: "padding:16px;" }, [
        h("h3", { style: "margin:0 0 12px 0;font-size:15px;" }, "📊 各階段分佈"),
        h("div", { style: "margin-bottom:8px;" }, [
          h("div", { style: "background:#eee;border-radius:4px;height:8px;overflow:hidden;display:flex;" },
            Object.entries(byStage)
              .filter(([, n]) => n > 0)
              .map(([stage, n]) => h("div", {
                key: stage,
                title: `${STAGE_LABELS[stage]}: ${n}`,
                style: `height:100%;width:${(n / total * 100).toFixed(1)}%;background:${stageColors[stage] || "#999"};`,
              }))
          ),
        ]),
        h("div", { style: "display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;" },
          Object.entries(byStage).map(([stage, n]) => h("div", {
            key: stage,
            style: `background:${stageColors[stage] || "#eee"};color:#fff;padding:4px 10px;border-radius:12px;font-size:12px;`,
          }, `${STAGE_LABELS[stage] || stage}: ${n}`))
        ),
        summary.value?.total_est_value ? h("div", { style: "margin-top:12px;font-size:14px;color:#333;" },
          `💰 預估總金額：NT$${summary.value.total_est_value.toLocaleString()}`
        ) : null,
      ]);
    }

    function renderOverdueActions() {
      const overdue = summary.value?.overdue_actions || [];
      if (!overdue.length) return null;
      return h("div", { style: "padding:16px;border-top:1px solid #eee;" }, [
        h("h3", { style: "margin:0 0 12px 0;font-size:15px;color:#d32f2f;" }, `⚠️ 逾期待辦 (${overdue.length})`),
        overdue.map((a, i) => h("div", {
          key: i,
          style: "background:#fff3f3;padding:10px 12px;border-radius:4px;margin-bottom:6px;border-left:3px solid #d32f2f;",
        }, [
          h("div", { style: "font-size:13px;font-weight:600;" }, a.task_detail),
          h("div", { style: "font-size:12px;color:#666;" }, `${a.entity_name} · 截止：${a.due_date}`),
        ])),
      ]);
    }

    function renderMembers() {
      const members = summary.value?.members || [];
      const shown = filterUser.value
        ? members.filter(m => (m.display_name || m.user_id).includes(filterUser.value))
        : members;

      return h("div", { style: "padding:16px;border-top:1px solid #eee;" }, [
        h("h3", { style: "margin:0 0 12px 0;font-size:15px;" }, "👥 成員"),
        members.length > 5 ? h("input", {
          type: "text",
          placeholder: "搜尋成員…",
          value: filterUser.value,
          onInput: (e) => { filterUser.value = e.target.value; },
          style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:12px;box-sizing:border-box;",
        }) : null,
        shown.map(m => h("div", {
          key: m.user_id,
          style: "display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0;",
        }, [
          h("div", { style: "flex:1;" }, [
            h("div", { style: "font-weight:600;font-size:14px;" }, m.display_name || m.user_id),
          ]),
          h("div", { style: "text-align:right;font-size:13px;color:#666;" }, [
            h("div", `${m.active_deals} 個案件`),
          ]),
        ])),
      ]);
    }

    return () => {
      if (error.value)   return h("div", { style: "padding:16px;color:red;text-align:center;" }, `❌ ${error.value}`);
      if (loading.value) return h("div", { style: "padding:16px;text-align:center;color:#999;" }, "載入中…");

      return h("div", { style: "background:#fff;" }, [
        h("h2", { style: "margin:0;padding:16px;font-size:20px;border-bottom:1px solid #eee;" }, "🔭 Pipeline 總覽"),
        renderStageBar(),
        renderOverdueActions(),
        renderMembers(),
      ]);
    };
  },
});
