// ProductList.js — admin product management
import { defineComponent, ref, onMounted, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { listProducts, createProduct, updateProduct } from "../api.js?v=3";

const STATUS_OPTIONS = ["Active", "Beta", "Sunset"];
const STATUS_COLORS  = { Active: "#31A24C", Beta: "#0084FF", Sunset: "#999" };

export default defineComponent({
  name: "ProductList",
  setup() {
    const products  = ref([]);
    const loading   = ref(true);
    const error     = ref("");
    const newName   = ref("");
    const newStatus = ref("Active");
    const adding    = ref(false);
    const addError  = ref("");
    const editingId = ref(null);
    const editData  = ref({});

    async function load() {
      loading.value = true;
      try { products.value = await listProducts(); }
      catch (e) { error.value = e.message || "載入失敗"; }
      finally { loading.value = false; }
    }

    onMounted(load);

    async function handleAdd() {
      addError.value = "";
      if (!newName.value.trim()) { addError.value = "請輸入名稱"; return; }
      adding.value = true;
      try {
        await createProduct({ name: newName.value.trim(), status: newStatus.value });
        newName.value = "";
        newStatus.value = "Active";
        await load();
      } catch (e) {
        addError.value = e.message || "新增失敗";
      } finally {
        adding.value = false;
      }
    }

    async function handleUpdate(id) {
      try {
        await updateProduct(id, editData.value);
        editingId.value = null;
        await load();
      } catch (e) {
        error.value = e.message || "更新失敗";
      }
    }

    function startEdit(p) {
      editingId.value = p.id;
      editData.value  = { name: p.name, status: p.status };
    }

    function renderProduct(p) {
      const isEditing = editingId.value === p.id;
      return h("div", {
        key: p.id,
        style: "padding:14px 16px;border-bottom:1px solid #eee;",
      }, isEditing
        ? [
            h("input", {
              value: editData.value.name,
              onInput: (e) => { editData.value.name = e.target.value; },
              style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:8px;box-sizing:border-box;",
            }),
            h("select", {
              value: editData.value.status,
              onChange: (e) => { editData.value.status = e.target.value; },
              style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:8px;box-sizing:border-box;",
            }, STATUS_OPTIONS.map(s => h("option", { value: s }, s))),
            h("div", { style: "display:flex;gap:8px;" }, [
              h("button", {
                onClick: () => { editingId.value = null; },
                style: "flex:1;padding:8px;background:#fff;border:1px solid #ddd;border-radius:4px;cursor:pointer;",
              }, "取消"),
              h("button", {
                onClick: () => handleUpdate(p.id),
                style: "flex:1;padding:8px;background:#0084FF;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;",
              }, "✓ 保存"),
            ]),
          ]
        : [
            h("div", { style: "display:flex;align-items:center;gap:12px;" }, [
              h("div", { style: "flex:1;" }, [
                h("div", { style: "font-weight:600;font-size:14px;" }, p.name),
                h("span", { style: `font-size:12px;padding:2px 8px;border-radius:10px;background:${STATUS_COLORS[p.status] || "#eee"};color:#fff;` }, p.status),
              ]),
              h("button", {
                onClick: () => startEdit(p),
                style: "padding:6px 12px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:12px;",
              }, "✏️ 編輯"),
            ]),
          ]
      );
    }

    function renderAddForm() {
      return h("div", { style: "padding:16px;background:#f5f5f5;border-top:1px solid #eee;" }, [
        h("h4", { style: "margin:0 0 12px 0;font-size:14px;color:#222;" }, "＋ 新增產品"),
        h("input", {
          type: "text",
          placeholder: "產品名稱",
          value: newName.value,
          onInput: (e) => { newName.value = e.target.value; },
          style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:8px;box-sizing:border-box;",
        }),
        h("select", {
          value: newStatus.value,
          onChange: (e) => { newStatus.value = e.target.value; },
          style: "width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:8px;box-sizing:border-box;",
        }, STATUS_OPTIONS.map(s => h("option", { value: s }, s))),
        addError.value ? h("div", { style: "color:red;font-size:12px;margin-bottom:8px;" }, addError.value) : null,
        h("button", {
          onClick: handleAdd,
          disabled: adding.value,
          style: `width:100%;padding:10px;background:${adding.value ? "#ccc" : "#0084FF"};color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;`,
        }, adding.value ? "新增中…" : "✓ 新增"),
      ]);
    }

    return () => {
      if (error.value)   return h("div", { style: "padding:16px;color:red;" }, `❌ ${error.value}`);
      if (loading.value) return h("div", { style: "padding:16px;text-align:center;color:#999;" }, "載入中…");

      return h("div", { style: "background:#fff;" }, [
        h("h2", { style: "margin:0;padding:16px;font-size:20px;border-bottom:1px solid #eee;" }, "📦 產品線"),
        products.value.length === 0
          ? h("div", { style: "padding:32px;text-align:center;color:#999;" }, "尚無產品")
          : products.value.map(p => renderProduct(p)),
        renderAddForm(),
      ]);
    };
  },
});
