// DealDetail.js — deal details with activities, stakeholders, stage history
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getDeal, updateDeal, addDealStakeholder } from "../api.js?v=3";

export default defineComponent({
  name: "DealDetail",
  props: { dealId: String },
  setup(props) {
    const deal = ref(null);
    const loading = ref(true);
    const error = ref("");
    const editMode = ref(false);
    const editData = ref({});
    const saving = ref(false);
    const addingStakeholder = ref(false);
    const newStakeholder = ref({ name: "", title: "", attitude: "" });
    const stakeholderError = ref("");

    async function load() {
      loading.value = true;
      error.value = "";
      try {
        const d = await getDeal(props.dealId);
        deal.value = d;
        editData.value = {
          stage: d.stage,
          est_value: d.est_value,
          next_action_date: d.next_action_date ? d.next_action_date.substring(0, 10) : null,
        };
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    async function handleSave() {
      saving.value = true;
      try {
        await updateDeal(props.dealId, editData.value);
        deal.value = await getDeal(props.dealId);
        editMode.value = false;
      } catch (e) {
        error.value = e.message || "更新失敗";
      } finally {
        saving.value = false;
      }
    }

    async function handleAddStakeholder() {
      stakeholderError.value = "";
      if (!newStakeholder.value.name) {
        stakeholderError.value = "請輸入名稱";
        return;
      }
      addingStakeholder.value = true;
      try {
        await addDealStakeholder(props.dealId, {
          name: newStakeholder.value.name,
          title: newStakeholder.value.title || undefined,
          attitude: newStakeholder.value.attitude || undefined,
        });
        newStakeholder.value = { name: "", title: "", attitude: "" };
        deal.value = await getDeal(props.dealId);
      } catch (e) {
        stakeholderError.value = e.message || "新增失敗";
      } finally {
        addingStakeholder.value = false;
      }
    }

    function renderEditForm() {
      return h("div", { class: "card", style: "margin:0 16px 12px;" }, [
        h("div", { class: "crm-section-title" }, "編輯"),
        h("div", { style: "margin-bottom:12px;" }, [
          h("label", { style: "display:block;font-size:12px;color:var(--color-text-secondary);margin-bottom:4px;" }, "Stage"),
          h("select", {
            value: editData.value.stage || "",
            onChange: (e) => { editData.value.stage = e.target.value; },
            style: "width:100%;padding:8px;border:1px solid var(--color-bg-3);border-radius:var(--radius-md);",
          }, ["0", "1", "2", "3", "4", "5", "6", "成交", "失敗"].map(s => h("option", { value: s }, s))),
        ]),
        h("div", { style: "margin-bottom:12px;" }, [
          h("label", { style: "display:block;font-size:12px;color:var(--color-text-secondary);margin-bottom:4px;" }, "Est Value (TWD)"),
          h("input", {
            type: "number",
            value: editData.value.est_value || "",
            onChange: (e) => { editData.value.est_value = e.target.value ? parseInt(e.target.value) : null; },
            style: "width:100%;padding:8px;border:1px solid var(--color-bg-3);border-radius:var(--radius-md);box-sizing:border-box;",
          }),
        ]),
        h("div", { style: "margin-bottom:12px;" }, [
          h("label", { style: "display:block;font-size:12px;color:var(--color-text-secondary);margin-bottom:4px;" }, "Next Action (YYYY-MM-DD)"),
          h("input", {
            type: "date",
            value: editData.value.next_action_date || "",
            onChange: (e) => { editData.value.next_action_date = e.target.value || null; },
            style: "width:100%;padding:8px;border:1px solid var(--color-bg-3);border-radius:var(--radius-md);box-sizing:border-box;",
          }),
        ]),
        h("div", { style: "display:flex;gap:8px;" }, [
          h("button", {
            onClick: () => { editMode.value = false; },
            style: "flex:1;padding:10px;background:var(--color-surface);border:1px solid var(--color-bg-3);border-radius:var(--radius-md);cursor:pointer;",
          }, "取消"),
          h("button", {
            onClick: handleSave,
            disabled: saving.value,
            style: `flex:1;padding:10px;background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-md);cursor:pointer;font-weight:600;opacity:${saving.value ? 0.6 : 1};`,
          }, saving.value ? "保存中…" : "✓ 保存"),
        ]),
      ]);
    }

    function renderDealInfo() {
      return h("div", { class: "card", style: "margin:0 16px 12px;" }, [
        h("div", { class: "crm-section-title" }, "基本資料"),
        deal.value?.stage ? h("div", { style: "margin-bottom:8px;font-size:14px;" }, [
          h("span", { style: "color:var(--color-text-secondary);font-size:13px;" }, "Stage: "),
          h("span", { class: "stage-badge" }, deal.value.stage),
        ]) : null,
        deal.value?.est_value ? h("div", { style: "margin-bottom:8px;font-size:14px;" }, [
          h("span", { style: "color:var(--color-text-secondary);font-size:13px;" }, "金額: "),
          h("span", { style: "font-weight:600;color:var(--color-deal);" }, `NT$${deal.value.est_value.toLocaleString()}`),
        ]) : null,
        deal.value?.next_action_date ? h("div", { style: "margin-bottom:8px;font-size:14px;" }, [
          h("span", { style: "color:var(--color-text-secondary);font-size:13px;" }, "下步行動: "),
          h("span", { style: "font-weight:600;" }, deal.value.next_action_date),
        ]) : null,
        deal.value?.is_pending ? h("div", { style: "margin-bottom:8px;" }, [
          h("span", { style: "background:#ffc107;color:#333;padding:2px 6px;border-radius:3px;font-size:12px;" }, "🔒 暫停"),
        ]) : null,
        h("button", {
          onClick: () => { editMode.value = true; },
          style: "width:100%;padding:10px;background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-md);cursor:pointer;font-weight:600;margin-top:8px;",
        }, "✏️ 編輯"),
      ].filter(Boolean));
    }

    function renderActivities() {
      const activities = (deal.value?.activities || []).slice().reverse();
      if (!activities.length) return null;

      return h("div", {}, [
        h("div", { style: "padding:0 16px 4px;" }, [
          h("div", { class: "crm-section-title" }, `💬 互動 (${activities.length})`),
        ]),
        ...activities.map((a, i) => h("div", {
          key: `activity-${i}`,
          class: "left-accent-activity",
          style: "margin:0 16px 8px;",
        }, [
          h("div", { style: "font-weight:600;margin-bottom:4px;font-size:14px;" }, a.entity_name),
          a.ai_key_insights && a.ai_key_insights.length > 0
            ? h("div", { style: "font-size:13px;color:var(--color-text-secondary);margin-bottom:4px;" }, "🔑 " + a.ai_key_insights.join(" · "))
            : null,
          h("div", { style: "font-size:12px;color:var(--color-text-secondary);" }, new Date(a.created_at).toLocaleString()),
        ])),
      ]);
    }

    function renderStakeholders() {
      const stakeholders = deal.value?.stakeholders || [];
      return h("div", { class: "card", style: "margin:0 16px 12px;" }, [
        h("div", { class: "crm-section-title" }, `👥 關係人 (${stakeholders.length})`),
        stakeholders.length > 0
          ? stakeholders.map((s, i) => h("div", {
              key: `stakeholder-${i}`,
              style: "background:var(--color-surface);padding:10px;border-radius:var(--radius-sm);margin-bottom:8px;",
            }, [
              h("div", { style: "font-weight:600;font-size:14px;" }, s.name),
              s.title ? h("div", { style: "font-size:13px;color:var(--color-text-secondary);" }, s.title) : null,
              s.attitude ? h("div", { style: "font-size:12px;color:var(--color-text-secondary);margin-top:2px;" }, `態度: ${s.attitude}`) : null,
            ].filter(Boolean)))
          : h("div", { style: "color:var(--color-text-secondary);font-size:13px;" }, "（無）"),

        h("div", { style: "margin-top:12px;" }, [
          h("div", { style: "font-size:13px;font-weight:600;margin-bottom:8px;" }, "+ 新增關係人"),
          h("input", {
            type: "text",
            placeholder: "姓名",
            value: newStakeholder.value.name,
            onInput: (e) => { newStakeholder.value.name = e.target.value; },
            style: "width:100%;padding:8px;border:1px solid var(--color-bg-3);border-radius:var(--radius-md);margin-bottom:8px;box-sizing:border-box;",
          }),
          h("input", {
            type: "text",
            placeholder: "職稱（選填）",
            value: newStakeholder.value.title,
            onInput: (e) => { newStakeholder.value.title = e.target.value; },
            style: "width:100%;padding:8px;border:1px solid var(--color-bg-3);border-radius:var(--radius-md);margin-bottom:8px;box-sizing:border-box;",
          }),
          h("select", {
            value: newStakeholder.value.attitude,
            onChange: (e) => { newStakeholder.value.attitude = e.target.value; },
            style: "width:100%;padding:8px;border:1px solid var(--color-bg-3);border-radius:var(--radius-md);margin-bottom:8px;box-sizing:border-box;",
          }, [
            h("option", { value: "" }, "態度（選填）"),
            h("option", { value: "Champion" }, "Champion"),
            h("option", { value: "Decision Maker" }, "Decision Maker"),
            h("option", { value: "Gatekeeper" }, "Gatekeeper"),
          ]),
          stakeholderError.value ? h("div", { style: "color:red;font-size:12px;margin-bottom:8px;" }, stakeholderError.value) : null,
          h("button", {
            onClick: handleAddStakeholder,
            disabled: addingStakeholder.value,
            style: `width:100%;padding:8px;background:var(--color-activity);color:#fff;border:none;border-radius:var(--radius-md);cursor:pointer;font-weight:600;opacity:${addingStakeholder.value ? 0.6 : 1};`,
          }, addingStakeholder.value ? "新增中…" : "✓ 新增"),
        ]),
      ]);
    }

    return () => {
      if (error.value) return h("div", { style: "padding:16px;color:red;" }, `❌ ${error.value}`);
      if (loading.value) return h("div", { style: "padding:16px;text-align:center;color:#999;" }, "載入中…");
      if (!deal.value) return h("div", { style: "padding:16px;color:red;" }, "找不到資料");

      return h("div", { style: "background:var(--color-surface);padding-bottom:24px;" }, [
        // Deal name hero
        h("div", { style: "padding:16px;background:var(--color-primary);color:#fff;margin-bottom:12px;" }, [
          h("div", { style: "font-size:22px;font-weight:700;" }, deal.value?.entity_name || "（無名稱）"),
        ]),
        editMode.value ? renderEditForm() : renderDealInfo(),
        renderActivities(),
        renderStakeholders(),
      ]);
    };
  },
});
