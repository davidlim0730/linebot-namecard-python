// CardEdit.js — edit form for all card fields
import { defineComponent, ref, reactive, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getCard, updateCard, listTags } from "../api.js";

const FIELDS = [
  { key: "name", label: "姓名" },
  { key: "title", label: "職稱" },
  { key: "company", label: "公司" },
  { key: "phone", label: "電話" },
  { key: "mobile", label: "手機" },
  { key: "email", label: "Email", type: "email" },
  { key: "address", label: "地址" },
  { key: "line_id", label: "LINE ID" },
  { key: "memo", label: "備忘錄", multiline: true },
];

export default defineComponent({
  name: "CardEdit",
  props: { cardId: { type: String, required: true } },
  setup(props) {
    const form = reactive({
      name: "", title: "", company: "", phone: "", mobile: "",
      email: "", address: "", line_id: "", memo: "",
    });
    const loading = ref(true);
    const saving = ref(false);
    const error = ref("");
    const success = ref(false);
    const availableTags = ref([]);
    const selectedTags = ref([]);

    onMounted(async () => {
      try {
        const [card, tags] = await Promise.all([getCard(props.cardId), listTags()]);
        for (const f of FIELDS) {
          if (card[f.key] != null) form[f.key] = card[f.key];
        }
        availableTags.value = tags;
        selectedTags.value = card.tags || [];
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    });

    async function save() {
      saving.value = true;
      error.value = "";
      try {
        const body = {};
        for (const f of FIELDS) {
          body[f.key] = form[f.key] || null;
        }
        await updateCard(props.cardId, body);
        success.value = true;
        setTimeout(() => {
          window.location.hash = `#/cards/${props.cardId}`;
        }, 800);
      } catch (e) {
        error.value = e.message || "儲存失敗";
      } finally {
        saving.value = false;
      }
    }

    function goBack() {
      window.location.hash = `#/cards/${props.cardId}`;
    }

    function toggleTag(tag) {
      const idx = selectedTags.value.indexOf(tag);
      if (idx >= 0) selectedTags.value.splice(idx, 1);
      else selectedTags.value.push(tag);
    }

    return () => {
      const header = h(
        "div",
        { style: "display:flex;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid #eee;" },
        [
          h("button", { onClick: goBack, style: "background:none;border:none;font-size:20px;cursor:pointer;padding:0 8px 0 0;" }, "←"),
          h("span", { style: "font-weight:600;font-size:16px;" }, "編輯名片"),
        ]
      );

      if (loading.value) return h("div", null, [header, h("p", { style: "text-align:center;padding:40px;color:#999;" }, "載入中…")]);

      const fields = FIELDS.map(({ key, label, type, multiline }) => {
        const inputEl = multiline
          ? h("textarea", {
              value: form[key],
              onInput: (e) => { form[key] = e.target.value; },
              rows: 3,
              style: "width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;resize:vertical;",
            })
          : h("input", {
              type: type || "text",
              value: form[key],
              onInput: (e) => { form[key] = e.target.value; },
              style: "width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;",
            });

        return h("div", { key, style: "padding:10px 16px;" }, [
          h("label", { style: "display:block;font-size:12px;color:#666;margin-bottom:4px;" }, label),
          inputEl,
        ]);
      });

      const tagSection =
        availableTags.value.length
          ? h("div", { style: "padding:10px 16px;" }, [
              h("div", { style: "font-size:12px;color:#666;margin-bottom:6px;" }, "標籤"),
              h("div", null,
                availableTags.value.map((t) => {
                  const active = selectedTags.value.includes(t);
                  return h("span", {
                    key: t,
                    onClick: () => toggleTag(t),
                    style: `display:inline-block;padding:4px 10px;border-radius:12px;margin:2px 4px 2px 0;font-size:12px;cursor:pointer;border:1px solid ${active ? "#06c755" : "#ccc"};background:${active ? "#e8f8ee" : "#f7f7f7"};color:${active ? "#06c755" : "#555"};`,
                  }, t);
                })
              ),
            ])
          : null;

      const errMsg = error.value
        ? h("p", { style: "text-align:center;color:#e33;padding:0 16px;" }, error.value)
        : null;

      const successMsg = success.value
        ? h("p", { style: "text-align:center;color:#06c755;padding:0 16px;" }, "✅ 已儲存")
        : null;

      const saveBtn = h(
        "div",
        { style: "padding:20px 16px;" },
        h("button", {
          onClick: save,
          disabled: saving.value || success.value,
          style: `width:100%;padding:12px;background:${saving.value || success.value ? "#ccc" : "#06c755"};color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:${saving.value ? "not-allowed" : "pointer"};`,
        }, saving.value ? "儲存中…" : "儲存")
      );

      return h("div", null, [header, ...fields, tagSection, errMsg, successMsg, saveBtn].filter(Boolean));
    };
  },
});
