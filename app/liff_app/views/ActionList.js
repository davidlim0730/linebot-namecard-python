// ActionList.js — actions with today/week/all tabs
import { defineComponent, ref, onMounted, computed, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { listActions, updateAction } from "../api.js?v=3";

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
        class: "left-accent-action",
        style: "margin:0 16px 8px;display:flex;align-items:flex-start;gap:12px;",
      }, [
        h("div", { style: "flex:1;" }, [
          h("div", {
            style: `font-size:13px;font-weight:500;color:var(--color-text-primary);${isDone ? "text-decoration:line-through;opacity:0.5;" : ""}`,
          }, a.task_detail || "（待辦事項）"),
          a.entity_name ? h("div", { style: "font-size:12px;color:var(--color-text-secondary);margin-top:2px;" }, a.entity_name) : null,
          a.due_date ? h("span", {
            class: "due-date-badge" + (isOverdue ? " overdue" : ""),
            style: "display:inline-block;margin-top:4px;",
          }, `📅 ${a.due_date}${isOverdue ? " ⚠️ 逾期" : ""}`) : null,
        ].filter(Boolean)),
        !isDone ? h("button", {
          onClick: () => markDone(a),
          disabled: inFlight,
          style: `font-size:12px;padding:4px 8px;background:var(--color-primary);color:#fff;border:none;border-radius:4px;cursor:pointer;white-space:nowrap;opacity:${inFlight ? 0.5 : 1};`,
        }, inFlight ? "…" : "✓ 完成") : null,
      ].filter(Boolean));
    }

    return () => {
      if (error.value)  return h("div", { style: "padding:16px;color:red;" }, `❌ ${error.value}`);
      if (loading.value) return h("div", { style: "padding:16px;text-align:center;color:#999;" }, "載入中…");

      const tabRow = h("div", { class: "filter-tabs", style: "padding:12px 16px 0;" },
        TABS.map(t => h("button", {
          key: t.key,
          class: "filter-tab" + (tab.value === t.key ? " active" : ""),
          onClick: () => { tab.value = t.key; },
        }, t.label))
      );

      const content = filtered.value.length === 0
        ? h("div", { class: "empty-state" }, [
            h("div", { class: "empty-state-icon" }, "🎉"),
            h("div", { class: "empty-state-text" }, "無待辦事項"),
          ])
        : h("div", { style: "padding-top:8px;" }, filtered.value.map(a => renderAction(a)));

      return h("div", { style: "background:var(--color-surface);min-height:100%;" }, [
        tabRow,
        content,
      ]);
    };
  },
});
