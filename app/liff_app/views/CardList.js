// CardList.js — shows card list with search
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { listCards } from "../api.js";

export default defineComponent({
  name: "CardList",
  emits: ["navigate"],
  setup(_, { emit }) {
    const cards = ref([]);
    const search = ref("");
    const loading = ref(true);
    const error = ref("");

    async function load() {
      loading.value = true;
      error.value = "";
      try {
        cards.value = await listCards(search.value || undefined);
      } catch (e) {
        error.value = e.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    function goDetail(id) {
      window.location.hash = `#/cards/${id}`;
    }

    function renderCard(card) {
      return h(
        "div",
        {
          key: card.id,
          onClick: () => goDetail(card.id),
          style:
            "padding:14px 16px;border-bottom:1px solid #eee;cursor:pointer;background:#fff;",
        },
        [
          h("div", { style: "font-weight:600;font-size:15px;" }, card.name || "（無姓名）"),
          h(
            "div",
            { style: "font-size:13px;color:#666;margin-top:2px;" },
            [card.title, card.company].filter(Boolean).join(" · ") || ""
          ),
          card.tags && card.tags.length
            ? h(
                "div",
                { style: "margin-top:4px;" },
                card.tags.map((t) =>
                  h(
                    "span",
                    {
                      key: t,
                      style:
                        "background:#e8f4fd;color:#1a7abf;font-size:11px;padding:2px 6px;border-radius:10px;margin-right:4px;",
                    },
                    t
                  )
                )
              )
            : null,
        ]
      );
    }

    return () => {
      const searchBar = h("div", { style: "padding:10px 16px;background:#f7f7f7;border-bottom:1px solid #e0e0e0;" }, [
        h("input", {
          value: search.value,
          onInput: (e) => { search.value = e.target.value; },
          onKeydown: (e) => { if (e.key === "Enter") load(); },
          placeholder: "搜尋名字、公司、電話...",
          style: "width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #ccc;border-radius:6px;font-size:14px;",
        }),
      ]);

      if (loading.value) return h("div", null, [searchBar, h("p", { style: "text-align:center;padding:40px;color:#999;" }, "載入中…")]);
      if (error.value) return h("div", null, [searchBar, h("p", { style: "text-align:center;padding:40px;color:#e33;" }, error.value)]);
      if (!cards.value.length) return h("div", null, [searchBar, h("p", { style: "text-align:center;padding:40px;color:#999;" }, "沒有名片")]);

      return h("div", null, [searchBar, ...cards.value.map(renderCard)]);
    };
  },
});
