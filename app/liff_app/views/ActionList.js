// ActionList.js — actions with today/week/all tabs
import { defineComponent, ref, onMounted, computed, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { listActions, updateAction } from "../api.js";

const TABS = [
  { key: "today", label: "今日" },
  { key: "week",  label: "本週" },
  { key: "all",   label: "全部" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function weekEndStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default defineComponent({
  name: "ActionList",
  setup() {
    const actions  = ref([]);
    const loading  = ref(true);
    const error    = ref("");
    const tab      = ref("today");
    const completing = ref(new Set());

    async function load() {
      loading.value = true;
      error.value   = "";
      try {
        actions.value = await listActions();
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    const filtered = computed(() => {
      const today   = todayStr();
      const weekEnd = weekEndStr();
      return actions.value.filter(a => {
        if (tab.value === "today") return a.status === "pending" && a.due_date <= today;
        if (tab.value === "week")  return a.status === "pending" && a.due_date <= weekEnd;
        return true;
      });
    });

    async function markDone(action) {
      completing.value = new Set([...completing.value, action.id]);
      try {
        await updateAction(action.id, { status: "completed" });
        actions.value = actions.value.map(a =>
          a.id === action.id ? { ...a, status: "completed" } : a
        );
      } catch (e) {
        error.value = e.message || "更新失敗";
      } finally {
        completing.value.delete(action.id);
        completing.value = new Set(completing.value);
      }
    }

    function renderAction(a) {
      const isOverdue = a.status === "pending" && a.due_date < todayStr();
      const isDone    = a.status === "completed";
      const inFlight  = completing.value.has(a.id);
      return h("div", {
        key: a.id,
        style: `
          padding:14px 16px;
          border-bottom:1px solid #eee;
          display:flex;
          align-items:flex-start;
          gap:12px;
          background:${isDone ? "#f9f9f9" : "#fff"};
        `,
      }, [
        h("div", { style: "flex:1;" }, [
          h("div", { style: `font-size:14px;font-weight:600;color:${isDone ? "#999" : "#222"};text-decoration:${isDone ? "line-through" : "none"};` }, a.task_detail),
          h("div", { style: "font-size:13px;color:#666;margin-top:4px;" }, a.entity_name),
          h("div", { style: `font-size:12px;margin-top:2px;color:${isOverdue ? "#d32f2f" : "#999"};` }, `📅 ${a.due_date}${isOverdue ? " ⚠️ 逾期" : ""}`),
        ]),
        !isDone ? h("button", {
          onClick: () => markDone(a),
          disabled: inFlight,
          style: `
            padding:6px 12px;
            background:#31A24C;
            color:#fff;
            border:none;
            border-radius:4px;
            font-size:12px;
            cursor:pointer;
            white-space:nowrap;
            opacity:${inFlight ? 0.5 : 1};
          `,
        }, inFlight ? "…" : "✓ 完成") : null,
      ].filter(Boolean));
    }

    function renderTabs() {
      return h("div", { style: "display:flex;border-bottom:2px solid #eee;background:#fff;" },
        TABS.map(t => h("button", {
          key: t.key,
          onClick: () => { tab.value = t.key; },
          style: `
            flex:1;
            padding:12px;
            background:none;
            border:none;
            border-bottom:${tab.value === t.key ? "2px solid #0084FF" : "2px solid transparent"};
            margin-bottom:-2px;
            font-size:14px;
            font-weight:${tab.value === t.key ? "600" : "400"};
            color:${tab.value === t.key ? "#0084FF" : "#666"};
            cursor:pointer;
          `,
        }, t.label))
      );
    }

    return () => {
      if (error.value)  return h("div", { style: "padding:16px;color:red;" }, `❌ ${error.value}`);
      if (loading.value) return h("div", { style: "padding:16px;text-align:center;color:#999;" }, "載入中…");

      return h("div", { style: "background:#fff;" }, [
        h("h2", { style: "margin:0;padding:16px;font-size:20px;border-bottom:1px solid #eee;" }, "✓ 待辦"),
        renderTabs(),
        filtered.value.length === 0
          ? h("div", { style: "padding:32px;text-align:center;color:#999;" }, "無待辦事項 🎉")
          : h("div", {}, filtered.value.map(a => renderAction(a))),
      ]);
    };
  },
});
