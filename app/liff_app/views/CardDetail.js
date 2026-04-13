// CardDetail.js — read-only card detail with edit button
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getCard } from "../api.js";

const FIELD_LABELS = {
  name: "姓名", title: "職稱", company: "公司",
  phone: "電話", mobile: "手機", email: "Email",
  address: "地址", line_id: "LINE ID", memo: "備忘錄",
};

export default defineComponent({
  name: "CardDetail",
  props: { cardId: { type: String, required: true } },
  setup(props) {
    const card = ref(null);
    const loading = ref(true);
    const error = ref("");

    onMounted(async () => {
      try {
        card.value = await getCard(props.cardId);
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    });

    function goEdit() {
      window.location.hash = `#/cards/${props.cardId}/edit`;
    }

    function goBack() {
      window.location.hash = "#/";
    }

    return () => {
      const header = h(
        "div",
        { style: "display:flex;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid #eee;" },
        [
          h("button", { onClick: goBack, style: "background:none;border:none;font-size:20px;cursor:pointer;padding:0 8px 0 0;" }, "←"),
          h("span", { style: "font-weight:600;font-size:16px;" }, "名片詳情"),
        ]
      );

      if (loading.value) return h("div", null, [header, h("p", { style: "text-align:center;padding:40px;color:#999;" }, "載入中…")]);
      if (error.value) return h("div", null, [header, h("p", { style: "text-align:center;padding:40px;color:#e33;" }, error.value)]);

      const rows = Object.entries(FIELD_LABELS)
        .filter(([k]) => card.value[k])
        .map(([k, label]) =>
          h("div", { key: k, style: "padding:12px 16px;border-bottom:1px solid #f0f0f0;" }, [
            h("div", { style: "font-size:11px;color:#999;margin-bottom:2px;" }, label),
            h("div", { style: "font-size:15px;" }, card.value[k]),
          ])
        );

      const tags =
        card.value.tags && card.value.tags.length
          ? h("div", { style: "padding:12px 16px;" }, [
              h("div", { style: "font-size:11px;color:#999;margin-bottom:6px;" }, "標籤"),
              h(
                "div",
                null,
                card.value.tags.map((t) =>
                  h("span", { key: t, style: "background:#e8f4fd;color:#1a7abf;font-size:12px;padding:3px 8px;border-radius:10px;margin-right:6px;" }, t)
                )
              ),
            ])
          : null;

      const editBtn = h(
        "div",
        { style: "padding:20px 16px;" },
        h("button", {
          onClick: goEdit,
          style: "width:100%;padding:12px;background:#06c755;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;",
        }, "✏️ 編輯名片")
      );

      return h("div", null, [header, ...rows, tags, editBtn].filter(Boolean));
    };
  },
});
