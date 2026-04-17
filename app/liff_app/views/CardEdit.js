// CardEdit.js — edit form for all card fields with validation
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getCard, updateCard } from "../api.js?v=3";

export default defineComponent({
  name: "CardEdit",
  props: { cardId: String },
  setup(props) {
    const loading = ref(true);
    const saving = ref(false);
    const error = ref("");
    const nameError = ref("");

    // Form fields
    const form = ref({ name: "", title: "", company: "", phone: "", mobile: "", email: "", line_id: "", address: "", memo: "" });

    onMounted(async () => {
      try {
        const card = await getCard(props.cardId);
        form.value = {
          name: card.name || "",
          title: card.title || "",
          company: card.company || "",
          phone: card.phone || "",
          mobile: card.mobile || "",
          email: card.email || "",
          line_id: card.line_id || "",
          address: card.address || "",
          memo: card.memo || "",
        };
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    });

    async function save() {
      nameError.value = "";
      if (!form.value.name.trim()) {
        nameError.value = "姓名不能為空";
        return;
      }
      saving.value = true;
      try {
        await updateCard(props.cardId, form.value);
        window.location.hash = `#/cards/${props.cardId}`;
      } catch (e) {
        error.value = e.message || "儲存失敗";
      } finally {
        saving.value = false;
      }
    }

    function renderField(label, key, required = false, isTextarea = false) {
      return h("div", { class: "form-group" }, [
        h("label", { class: "form-label" }, [label, required ? h("span", { class: "required" }, " *") : null]),
        isTextarea
          ? h("textarea", {
              class: "form-textarea" + (key === "name" && nameError.value ? " input-error" : ""),
              value: form.value[key],
              onInput: (e) => { form.value[key] = e.target.value; },
              rows: 3,
            })
          : h("input", {
              class: "form-input" + (key === "name" && nameError.value ? " input-error" : ""),
              type: key === "email" ? "email" : "text",
              value: form.value[key],
              onInput: (e) => { form.value[key] = e.target.value; },
            }),
        key === "name" && nameError.value ? h("div", { class: "error-text" }, nameError.value) : null,
      ].filter(Boolean));
    }

    return () => {
      if (loading.value) return h("div", { style: "padding:32px;text-align:center;color:var(--color-text-secondary);" }, "載入中…");
      if (error.value && !form.value.name) return h("div", { style: "padding:32px;color:var(--color-error);" }, `❌ ${error.value}`);

      return h("div", { class: "page-container", style: "background:var(--color-surface);" }, [
        error.value ? h("div", { style: "background:var(--color-error);color:#fff;padding:12px;border-radius:var(--radius-md);margin-bottom:16px;font-size:14px;" }, error.value) : null,
        h("div", { class: "edit-form" }, [
          renderField("姓名", "name", true),
          renderField("職稱", "title"),
          renderField("公司", "company"),
          renderField("電話", "phone"),
          renderField("手機", "mobile"),
          renderField("Email", "email"),
          renderField("LINE ID", "line_id"),
          renderField("地址", "address"),
          renderField("備註", "memo", false, true),
        ]),
        h("div", { style: "display:flex;gap:12px;margin-top:24px;" }, [
          h("button", {
            style: "flex:1;padding:14px;border:1px solid var(--color-bg-3);border-radius:var(--radius-md);background:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-body);",
            onClick: () => history.back(),
          }, "取消"),
          h("button", {
            class: "save-button",
            style: "flex:2;",
            disabled: saving.value,
            onClick: save,
          }, saving.value ? "儲存中…" : "儲存變更"),
        ]),
      ].filter(Boolean));
    };
  },
});
