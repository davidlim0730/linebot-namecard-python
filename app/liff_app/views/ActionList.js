import { defineComponent, ref, onMounted, computed, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { listActions, updateAction } from "../api.js?v=3";

const TABS = [
  { key: "today", label: "今日" },
  { key: "week", label: "本週" },
  { key: "all", label: "全部" },
  { key: "done", label: "已完成" },
];

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default defineComponent({
  name: "ActionList",
  setup() {
    const actions = ref([]);
    const loading = ref(true);
    const error = ref("");
    const tab = ref("today");

    async function load() {
      loading.value = true;
      error.value = "";
      try {
        actions.value = await listActions();
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    const buckets = computed(() => {
      const today = isoToday();
      const weekEnd = plusDays(7);
      return {
        today: actions.value.filter(a => a.status !== "completed" && a.due_date && a.due_date <= today),
        week: actions.value.filter(a => a.status !== "completed" && a.due_date && a.due_date <= weekEnd),
        all: actions.value.filter(a => a.status !== "completed"),
        done: actions.value.filter(a => a.status === "completed"),
      };
    });

    const overdueCount = computed(() => actions.value.filter(a => a.status !== "completed" && a.due_date && a.due_date < isoToday()).length);
    const activeList = computed(() => buckets.value[tab.value] || []);

    async function markDone(action) {
      try {
        await updateAction(action.id, { status: action.status === "completed" ? "pending" : "completed" });
        action.status = action.status === "completed" ? "pending" : "completed";
        actions.value = [...actions.value];
      } catch (e) {
        error.value = e.message || "更新失敗";
      }
    }

    function statCard(label, value, sub, accent) {
      return h("div", { class: "card", style: "padding:14px;" }, [
        h("div", { style: "font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-text-disabled);" }, label),
        h("div", { style: "font-family:var(--font-headline);font-size:28px;font-weight:800;color:var(--color-text-primary);margin-top:10px;" }, String(value)),
        h("div", {
          style: `display:inline-flex;margin-top:8px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;${accent}`,
        }, sub),
      ]);
    }

    function actionRow(action) {
      const isDone = action.status === "completed";
      const overdue = action.due_date && !isDone && action.due_date < isoToday();
      return h("div", {
        key: action.id,
        style: `
          display:flex;align-items:flex-start;gap:12px;padding:14px;background:#fff;border-radius:14px;
          box-shadow:var(--shadow-card);border-left:3px solid ${overdue ? "var(--color-danger)" : "transparent"};
          opacity:${isDone ? 0.6 : 1};
        `,
      }, [
        h("button", {
          onClick: () => markDone(action),
          style: `
            width:22px;height:22px;border-radius:6px;border:2px solid ${isDone ? "var(--color-primary)" : "var(--color-outline)"};
            background:${isDone ? "var(--color-primary)" : "transparent"};color:#fff;flex-shrink:0;
            display:flex;align-items:center;justify-content:center;margin-top:2px;
          `,
        }, isDone ? "✓" : ""),
        h("div", { style: "flex:1;" }, [
          h("div", {
            style: `font-size:14px;font-weight:700;color:var(--color-text-primary);${isDone ? "text-decoration:line-through;" : ""}`,
          }, action.task_detail || "（待辦事項）"),
          action.entity_name ? h("div", { style: "font-size:11px;color:var(--color-text-secondary);margin-top:4px;" }, action.entity_name) : null,
        ].filter(Boolean)),
        action.due_date ? h("div", {
          style: `
            white-space:nowrap;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;
            background:${overdue ? "rgba(192,0,10,0.08)" : "var(--color-bg-3)"};
            color:${overdue ? "var(--color-danger)" : "var(--color-text-secondary)"};
          `,
        }, action.due_date) : null,
      ].filter(Boolean));
    }

    return () => {
      if (error.value) return h("div", { style: "padding:24px;color:var(--color-danger);" }, `❌ ${error.value}`);
      if (loading.value) return h("div", { class: "loading-state" }, [h("p", {}, "載入中…")]);

      return h("div", { class: "page-container", style: "padding-top:12px;" }, [
        h("div", { style: "display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px;" }, [
          statCard("今日到期", buckets.value.today.length, "需完成", "background:#FEF3C7;color:#854D0E;"),
          statCard("已逾期", overdueCount.value, "優先處理", "background:#FEE2E2;color:#C0000A;"),
        ]),
        h("div", { class: "card", style: "padding:12px;" }, [
          h("div", { style: "display:flex;gap:8px;overflow:auto;padding-bottom:8px;" },
            TABS.map(item => h("button", {
              key: item.key,
              onClick: () => { tab.value = item.key; },
              style: `
                white-space:nowrap;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;
                background:${tab.value === item.key ? "var(--color-primary-light)" : "var(--color-bg-3)"};
                color:${tab.value === item.key ? "var(--color-primary-dark)" : "var(--color-text-secondary)"};
              `,
            }, `${item.label} ${(buckets.value[item.key] || []).length}`))
          ),
          h("div", { style: "display:flex;flex-direction:column;gap:10px;margin-top:6px;" },
            activeList.value.length > 0
              ? activeList.value.map(actionRow)
              : [h("div", { class: "empty-state", style: "padding:36px 12px;" }, "這個分頁目前沒有待辦事項")]
          ),
        ]),
      ]);
    };
  },
});
