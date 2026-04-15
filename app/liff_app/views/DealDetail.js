// DealDetail.js — deal details with activities, stakeholders, stage history
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getDeal, updateDeal, addDealStakeholder } from "../api.js";

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
          next_action_date: d.next_action_date,
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

    function renderHeader() {
      return h("div", { style: "padding:16px;background:#0084FF;color:#fff;" }, [
        h("div", { style: "display:flex;gap:8px;margin-bottom:12px;" }, [
          h("button", {
            onClick: () => { window.location.hash = "#/deals"; },
            style: "background:rgba(255,255,255,0.2);color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;",
          }, "← 返回"),
        ]),
        h("h1", { style: "margin:0;font-size:24px;" }, deal.value?.entity_name || "（無名稱）"),
      ]);
    }

    function renderEditForm() {
      return h("div", { style: "padding:16px;background:#f5f5f5;" }, [
        h("h3", { style: "margin:0 0 12px 0;font-size:15px;color:#222;" }, "編輯"),
        h("div", { style: "margin-bottom:12px;" }, [
          h("label", { style: "display:block;font-size:12px;color:#666;margin-bottom:4px;" }, "Stage"),
          h("select", {
            value: editData.value.stage || "",
            onChange: (e) => { editData.value.stage = e.target.value; },
            style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;",
          }, ["0", "1", "2", "3", "4", "5", "6", "成交", "失敗"].map(s => h("option", { value: s }, s))),
        ]),
        h("div", { style: "margin-bottom:12px;" }, [
          h("label", { style: "display:block;font-size:12px;color:#666;margin-bottom:4px;" }, "Est Value (TWD)"),
          h("input", {
            type: "number",
            value: editData.value.est_value || "",
            onChange: (e) => { editData.value.est_value = e.target.value ? parseInt(e.target.value) : null; },
            style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;",
          }),
        ]),
        h("div", { style: "margin-bottom:12px;" }, [
          h("label", { style: "display:block;font-size:12px;color:#666;margin-bottom:4px;" }, "Next Action (YYYY-MM-DD)"),
          h("input", {
            type: "date",
            value: editData.value.next_action_date || "",
            onChange: (e) => { editData.value.next_action_date = e.target.value || null; },
            style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;",
          }),
        ]),
        h("div", { style: "display:flex;gap:8px;" }, [
          h("button", {
            onClick: () => { editMode.value = false; },
            style: "flex:1;padding:10px;background:#fff;border:1px solid #ddd;border-radius:4px;cursor:pointer;",
          }, "取消"),
          h("button", {
            onClick: handleSave,
            disabled: saving.value,
            style: `flex:1;padding:10px;background:#0084FF;color:#fff;border:none;border-radius:4px;cursor:pointer;opacity:${saving.value ? 0.6 : 1};`,
          }, saving.value ? "保存中…" : "✓ 保存"),
        ]),
      ]);
    }

    function renderDealInfo() {
      return h("div", { style: "padding:16px;" }, [
        h("h3", { style: "margin:0 0 12px 0;font-size:15px;color:#222;" }, "📋 基本資料"),
        h("div", { style: "background:#f5f5f5;padding:12px;border-radius:4px;margin-bottom:12px;" }, [
          h("div", { style: "margin-bottom:8px;" }, [
            h("span", { style: "color:#666;font-size:13px;" }, "Stage: "),
            h("span", { style: "font-weight:600;" }, deal.value?.stage || "-"),
          ]),
          deal.value?.est_value ? h("div", { style: "margin-bottom:8px;" }, [
            h("span", { style: "color:#666;font-size:13px;" }, "金額: "),
            h("span", { style: "font-weight:600;color:#0084FF;" }, `NT$${deal.value.est_value.toLocaleString()}`),
          ]) : null,
          deal.value?.next_action_date ? h("div", { style: "margin-bottom:8px;" }, [
            h("span", { style: "color:#666;font-size:13px;" }, "下步行動: "),
            h("span", { style: "font-weight:600;" }, deal.value.next_action_date),
          ]) : null,
          deal.value?.is_pending ? h("div", [
            h("span", { style: "background:#ffc107;color:#333;padding:2px 6px;border-radius:3px;font-size:12px;" }, "🔒 暫停"),
          ]) : null,
        ].filter(Boolean)),
        h("button", {
          onClick: () => { editMode.value = true; },
          style: "width:100%;padding:10px;background:#0084FF;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;",
        }, "✏️ 編輯"),
      ]);
    }

    function renderActivities() {
      const activities = deal.value?.activities || [];
      if (!activities.length) return null;

      return h("div", { style: "padding:16px;border-top:1px solid #eee;" }, [
        h("h3", { style: "margin:0 0 12px 0;font-size:15px;color:#222;" }, `💬 互動 (${activities.length})`),
        ...activities.map((a, i) => h("div", {
          key: `activity-${i}`,
          style: "background:#f5f5f5;padding:12px;border-radius:4px;margin-bottom:8px;",
        }, [
          h("div", { style: "font-weight:600;margin-bottom:4px;" }, a.entity_name),
          a.ai_key_insights && a.ai_key_insights.length > 0 ? h("div", { style: "font-size:13px;color:#666;margin-bottom:4px;" }, "🔑 " + a.ai_key_insights.join(" · ")) : null,
          h("div", { style: "font-size:12px;color:#999;" }, new Date(a.created_at).toLocaleString()),
        ])),
      ]);
    }

    function renderStakeholders() {
      const stakeholders = deal.value?.stakeholders || [];
      return h("div", { style: "padding:16px;border-top:1px solid #eee;" }, [
        h("h3", { style: "margin:0 0 12px 0;font-size:15px;color:#222;" }, `👥 關係人 (${stakeholders.length})`),
        stakeholders.length > 0 ? stakeholders.map((s, i) => h("div", {
          key: `stakeholder-${i}`,
          style: "background:#f5f5f5;padding:12px;border-radius:4px;margin-bottom:8px;",
        }, [
          h("div", { style: "font-weight:600;" }, s.name),
          s.title ? h("div", { style: "font-size:13px;color:#666;" }, s.title) : null,
          s.attitude ? h("div", { style: "font-size:12px;color:#999;" }, `態度: ${s.attitude}`) : null,
        ].filter(Boolean))) : h("div", { style: "color:#999;font-size:13px;" }, "（無）"),

        h("div", { style: "margin-top:12px;" }, [
          h("h4", { style: "margin:0 0 8px 0;font-size:13px;color:#222;" }, "+ 新增關係人"),
          h("input", {
            type: "text",
            placeholder: "姓名",
            value: newStakeholder.value.name,
            onInput: (e) => { newStakeholder.value.name = e.target.value; },
            style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:8px;box-sizing:border-box;",
          }),
          h("input", {
            type: "text",
            placeholder: "職稱（選填）",
            value: newStakeholder.value.title,
            onInput: (e) => { newStakeholder.value.title = e.target.value; },
            style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:8px;box-sizing:border-box;",
          }),
          h("select", {
            value: newStakeholder.value.attitude,
            onChange: (e) => { newStakeholder.value.attitude = e.target.value; },
            style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:8px;box-sizing:border-box;",
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
            style: "width:100%;padding:8px;background:#31A24C;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;",
          }, addingStakeholder.value ? "新增中…" : "✓ 新增"),
        ]),
      ]);
    }

    return () => {
      if (error.value) return h("div", { style: "padding:16px;color:red;" }, `❌ ${error.value}`);
      if (loading.value) return h("div", { style: "padding:16px;text-align:center;color:#999;" }, "載入中…");
      if (!deal.value) return h("div", { style: "padding:16px;color:red;" }, "找不到資料");

      return h("div", { style: "background:#fff;" }, [
        renderHeader(),
        editMode.value ? renderEditForm() : renderDealInfo(),
        renderActivities(),
        renderStakeholders(),
      ]);
    };
  },
});
