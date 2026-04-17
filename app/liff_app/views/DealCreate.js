// DealCreate.js — create a new deal, optionally pre-seeded with company + contact
import { defineComponent, ref, onMounted, h, inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { createDeal, addDealStakeholder } from "../api.js?v=3";

const STAGES = [
  { value: "0", label: "初接觸" },
  { value: "1", label: "需求確認" },
  { value: "2", label: "提案" },
  { value: "3", label: "報價中" },
  { value: "4", label: "合約協商" },
  { value: "5", label: "成交" },
  { value: "失敗", label: "失敗" },
];

export default defineComponent({
  name: "DealCreate",
  setup() {
    const showToast = inject("showToast");

    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const preCompany   = params.get("company")    || "";
    const preContact   = params.get("contact")    || "";
    const preContactId = params.get("contact_id") || "";
    const preTitle     = params.get("title")      || "";

    const form = ref({
      entity_name: preCompany || preContact || "",
      stage: "0",
      est_value: "",
      status_summary: "",
    });
    const nameError = ref("");
    const saving = ref(false);

    async function handleSave() {
      nameError.value = "";
      if (!form.value.entity_name.trim()) {
        nameError.value = "案件名稱不能為空";
        return;
      }
      saving.value = true;
      try {
        const payload = {
          entity_name: form.value.entity_name.trim(),
          stage: form.value.stage,
          status_summary: form.value.status_summary.trim(),
        };
        if (form.value.est_value) payload.est_value = parseInt(form.value.est_value);

        const deal = await createDeal(payload);

        // Auto-add pre-seeded contact as stakeholder
        if (preContact && preContactId) {
          await addDealStakeholder(deal.id, {
            name: preContact,
            role: "Champion",
            contact_id: preContactId,
          });
        }

        showToast && showToast("案件已建立", "success");
        window.location.hash = `#/deals/${deal.id}`;
      } catch (e) {
        showToast && showToast(e.message || "建立失敗", "error");
      } finally {
        saving.value = false;
      }
    }

    function inputStyle(hasError) {
      return `width:100%;padding:12px;border:${hasError ? "1.5px solid red" : "1.5px solid var(--color-bg-3)"};border-radius:var(--radius-md);font-size:15px;font-family:var(--font-body);box-sizing:border-box;background:#fff;`;
    }

    function label(text, required) {
      return h("div", { style: "font-size:13px;font-weight:600;color:var(--color-text-secondary);margin-bottom:6px;" },
        required ? `${text} *` : text);
    }

    return () => h("div", { style: "padding:16px;background:var(--color-surface);min-height:100%;" }, [
      // Contact hint
      preContact ? h("div", {
        class: "card left-accent-deal",
        style: "margin-bottom:16px;padding:12px 14px;font-size:13px;color:var(--color-text-secondary);"
      }, `👤 關係人：${preContact}${preCompany ? "　公司：" + preCompany : ""}`) : null,

      // entity_name
      h("div", { style: "margin-bottom:16px;" }, [
        label("案件名稱", true),
        h("input", {
          type: "text",
          value: form.value.entity_name,
          onInput: e => { form.value.entity_name = e.target.value; },
          placeholder: preCompany ? `${preCompany} 案件` : "輸入案件名稱",
          style: inputStyle(nameError.value),
        }),
        nameError.value ? h("div", { style: "color:red;font-size:12px;margin-top:4px;" }, nameError.value) : null,
      ]),

      // stage
      h("div", { style: "margin-bottom:16px;" }, [
        label("階段"),
        h("select", {
          value: form.value.stage,
          onChange: e => { form.value.stage = e.target.value; },
          style: inputStyle(false),
        }, STAGES.map(s => h("option", { value: s.value }, s.label))),
      ]),

      // est_value
      h("div", { style: "margin-bottom:16px;" }, [
        label("預估金額（TWD）"),
        h("input", {
          type: "number",
          value: form.value.est_value,
          onInput: e => { form.value.est_value = e.target.value; },
          placeholder: "例：500000",
          style: inputStyle(false),
        }),
      ]),

      // status_summary
      h("div", { style: "margin-bottom:24px;" }, [
        label("備註"),
        h("textarea", {
          value: form.value.status_summary,
          onInput: e => { form.value.status_summary = e.target.value; },
          placeholder: "目前進度說明（選填）",
          style: inputStyle(false) + "min-height:80px;resize:vertical;",
        }),
      ]),

      // Buttons
      h("button", {
        onClick: handleSave,
        disabled: saving.value,
        style: `width:100%;padding:16px;background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-md);font-size:16px;font-weight:600;cursor:pointer;opacity:${saving.value ? 0.6 : 1};margin-bottom:12px;`,
      }, saving.value ? "建立中..." : "✅ 建立案件"),

      h("button", {
        onClick: () => history.back(),
        style: "width:100%;padding:14px;background:transparent;color:var(--color-text-secondary);border:1.5px solid var(--color-bg-3);border-radius:var(--radius-md);font-size:15px;cursor:pointer;",
      }, "取消"),
    ]);
  },
});
