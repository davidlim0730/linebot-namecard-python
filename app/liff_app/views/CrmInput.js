// CrmInput.js — NLU input & confirmation flow
import { defineComponent, ref, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { crmParse, crmConfirm } from "../api.js?v=3";

export default defineComponent({
  name: "CrmInput",
  setup() {
    // Pre-fill from URL query params (contact, company, contact_id)
    const urlParams = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const prefillContact = urlParams.get("contact") || "";
    const prefillCompany = urlParams.get("company") || "";
    const prefillContactId = urlParams.get("contact_id") || "";

    const prefillHint = [prefillContact, prefillCompany].filter(Boolean).join("／");
    const rawText = ref(prefillHint ? `[${prefillHint}] ` : "");
    const parseResult = ref(null);
    const parseLoading = ref(false);
    const parseError = ref("");
    const confirmed = ref(null);
    const confirmLoading = ref(false);
    const confirmError = ref("");

    async function handleParse() {
      parseError.value = "";
      parseResult.value = null;
      parseLoading.value = true;
      try {
        const res = await crmParse(rawText.value);
        parseResult.value = res.parsed;
      } catch (e) {
        parseError.value = e.message || "解析失敗";
      } finally {
        parseLoading.value = false;
      }
    }

    async function handleConfirm() {
      confirmError.value = "";
      confirmed.value = null;
      confirmLoading.value = true;
      try {
        const res = await crmConfirm(parseResult.value);
        confirmed.value = res.written;
        parseResult.value = null; // Clear results after confirm
        rawText.value = "";
      } catch (e) {
        confirmError.value = e.message || "確認失敗";
      } finally {
        confirmLoading.value = false;
      }
    }

    function renderInput() {
      return h("div", { style: "padding:var(--space-16);" }, [
        h("h2", { style: "margin:0 0 12px 0;font-size:18px;color:var(--color-text-primary);" }, "💬 輸入"),
        h("textarea", {
          value: rawText.value,
          onInput: (e) => { rawText.value = e.target.value; },
          placeholder: "輸入您想記錄的內容，例如：\n剛見完王總，談到新產品 X 的可行性...",
          style: `border:1px solid var(--color-bg-3);border-radius:var(--radius-md);padding:var(--space-12);width:100%;font-size:15px;font-family:var(--font-body);min-height:120px;resize:vertical;box-sizing:border-box;`,
        }),
        h("button", {
          onClick: handleParse,
          disabled: !rawText.value.trim() || parseLoading.value,
          style: `margin-top:12px;width:100%;background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-md);padding:var(--space-12) var(--space-24);font-size:15px;font-weight:600;cursor:pointer;opacity:${rawText.value.trim() && !parseLoading.value ? 1 : 0.5};`,
        }, parseLoading.value ? "分析中..." : "🔍 分析"),
        parseError.value ? h("div", { style: "color:red;margin-top:8px;font-size:13px;" }, `❌ ${parseError.value}`) : null,
      ]);
    }

    function renderResults() {
      if (!parseResult.value) return null;

      const lowConfidence = parseResult.value.overall_confidence < 0.5;
      const missing = parseResult.value.missing_fields && parseResult.value.missing_fields.length > 0;

      return h("div", { style: "padding:var(--space-16);" }, [
        lowConfidence || missing ? h("div", {
          style: "background:#fff3cd;border-left:4px solid #ffc107;padding:12px;margin-bottom:12px;border-radius:var(--radius-sm);font-size:13px;",
        }, [
          h("strong", "⚠️ 提醒"),
          lowConfidence ? h("div", `信心度 ${(parseResult.value.overall_confidence * 100).toFixed(0)}%，可能不太準確，請確認後修改`) : null,
          missing ? h("div", `缺少欄位：${parseResult.value.missing_fields.join("、")}`) : null,
        ]) : null,

        h("h3", { style: "margin:0 0 12px 0;font-size:15px;color:var(--color-text-primary);" }, "📋 解析結果"),

        parseResult.value.pipelines && parseResult.value.pipelines.length > 0 ? h("div", { style: "margin-bottom:16px;" }, [
          h("strong", { style: "display:block;margin-bottom:8px;color:var(--color-text-primary);" }, "📊 案件"),
          ...parseResult.value.pipelines.map((p, i) => h("div", { key: `pipeline-${i}`, class: "left-accent-deal", style: "margin-bottom:8px;" }, [
            h("div", { style: "font-weight:600;margin-bottom:4px;" }, p.entity_name || "（未知客戶）"),
            h("div", { style: "font-size:13px;color:var(--color-text-secondary);" }, [
              p.stage ? h("span", `Stage: ${p.stage} · `) : null,
              p.est_value ? h("span", `金額: $${p.est_value.toLocaleString()} · `) : null,
              p.next_action_date ? h("span", `next: ${p.next_action_date}`) : null,
            ].filter(Boolean)),
            p.status_summary ? h("div", { style: "font-size:13px;margin-top:4px;color:var(--color-text-secondary);" }, p.status_summary) : null,
          ])),
        ]) : null,

        parseResult.value.interactions && parseResult.value.interactions.length > 0 ? h("div", { style: "margin-bottom:16px;" }, [
          h("strong", { style: "display:block;margin-bottom:8px;color:var(--color-text-primary);" }, "💬 互動"),
          ...parseResult.value.interactions.map((act, i) => h("div", { key: `interaction-${i}`, class: "left-accent-activity", style: "margin-bottom:8px;" }, [
            h("div", { style: "font-weight:600;margin-bottom:4px;" }, act.entity_name || "（未知聯絡人）"),
            act.ai_key_insights && act.ai_key_insights.length > 0 ? h("div", { style: "font-size:13px;color:var(--color-text-secondary);" }, "重點：" + act.ai_key_insights.join(" · ")) : null,
            h("div", { style: "font-size:12px;color:var(--color-text-secondary);margin-top:4px;" }, `情緒：${act.sentiment}`),
          ])),
        ]) : null,

        parseResult.value.actions && parseResult.value.actions.length > 0 ? h("div", { style: "margin-bottom:16px;" }, [
          h("strong", { style: "display:block;margin-bottom:8px;color:var(--color-text-primary);" }, "✓ 待辦"),
          ...parseResult.value.actions.map((a, i) => h("div", { key: `action-${i}`, class: "left-accent-action", style: "margin-bottom:8px;" }, [
            h("div", { style: "font-weight:600;margin-bottom:4px;" }, a.task_detail),
            h("div", { style: "font-size:13px;color:var(--color-text-secondary);" }, `${a.entity_name} · 期限：${a.due_date || "（未指定）"}`),
          ])),
        ]) : null,

        h("div", { style: "display:flex;gap:8px;margin-top:16px;" }, [
          h("button", {
            onClick: () => { parseResult.value = null; },
            style: `flex:1;background:var(--color-surface);border:1px solid var(--color-bg-3);border-radius:var(--radius-md);padding:var(--space-12) var(--space-24);font-size:15px;cursor:pointer;`,
          }, "🔙 修改"),
          h("button", {
            onClick: handleConfirm,
            disabled: confirmLoading.value,
            style: `flex:1;background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-md);padding:var(--space-12) var(--space-24);font-size:15px;font-weight:600;cursor:pointer;`,
          }, confirmLoading.value ? "確認中..." : "✅ 確認"),
        ]),
        confirmError.value ? h("div", { style: "color:red;margin-top:8px;font-size:13px;" }, `❌ ${confirmError.value}`) : null,
      ]);
    }

    function renderConfirmed() {
      if (!confirmed.value) return null;

      return h("div", { style: "padding:var(--space-16);" }, [
        h("div", { class: "card" }, [
          h("h2", { style: "margin:0 0 12px 0;font-size:18px;color:var(--color-activity);" }, "✨ 完成"),
          h("div", { style: "font-size:14px;line-height:1.6;" }, [
            confirmed.value.pipelines_updated && confirmed.value.pipelines_updated.length > 0 ? h("div", `📊 案件：${confirmed.value.pipelines_updated.length} 筆`) : null,
            confirmed.value.interactions_logged && confirmed.value.interactions_logged.length > 0 ? h("div", `💬 互動：${confirmed.value.interactions_logged.length} 筆`) : null,
            confirmed.value.actions_scheduled && confirmed.value.actions_scheduled.length > 0 ? h("div", `✓ 待辦：${confirmed.value.actions_scheduled.length} 筆`) : null,
          ].filter(Boolean)),
          h("button", {
            onClick: () => { confirmed.value = null; },
            style: `width:100%;margin-top:12px;background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-md);padding:var(--space-12) var(--space-24);font-size:15px;font-weight:600;cursor:pointer;`,
          }, "➕ 繼續輸入"),
        ]),
      ]);
    }

    return () => h("div", { style: "max-width:600px;margin:0 auto;background:var(--color-surface);" }, [
      renderConfirmed() || renderResults() || renderInput(),
    ]);
  },
});
