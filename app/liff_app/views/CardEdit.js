import { defineComponent, ref, computed, onMounted, inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getCard, updateCard } from "../api.js?v=4";

function getDisplayName(card) {
  return card?.display_name || card?.name || "";
}

function getCompanyName(card) {
  return card?.company_name || card?.company || "";
}

export default defineComponent({
  name: "CardEdit",
  props: {
    cardId: { type: String, required: true },
  },
  setup(props) {
    const showToast = inject("showToast");
    const loading = ref(true);
    const saving = ref(false);
    const error = ref("");
    const focusField = ref("");
    const contactType = ref("person");
    const form = ref({
      display_name: "",
      legal_name: "",
      title: "",
      company_name: "",
      industry: "",
      website: "",
      employee_count: "",
      department: "",
      phone: "",
      mobile: "",
      work_phone: "",
      email: "",
      address: "",
      line_id: "",
      memo: "",
    });
    const isCompany = computed(() => contactType.value === "company");

    async function fetchCard() {
      loading.value = true;
      try {
        const card = await getCard(props.cardId);
        contactType.value = card.contact_type || "person";
        form.value = {
          display_name: getDisplayName(card),
          legal_name: card.legal_name || "",
          title: card.title || "",
          company_name: getCompanyName(card),
          industry: card.industry || "",
          website: card.website || "",
          employee_count: card.employee_count != null ? String(card.employee_count) : "",
          department: card.department || "",
          phone: card.phone || "",
          mobile: card.mobile || "",
          work_phone: card.work_phone || "",
          email: card.email || "",
          address: card.address || "",
          line_id: card.line_id || "",
          memo: card.memo || "",
        };
        error.value = "";
      } catch (err) {
        error.value = err.message || "載入失敗";
      } finally {
        loading.value = false;
      }
    }

    async function save() {
      if (!form.value.display_name.trim()) {
        error.value = "姓名不能空白";
        focusField.value = "display_name";
        return;
      }
      saving.value = true;
      error.value = "";
      try {
        await updateCard(props.cardId, {
          display_name: form.value.display_name.trim(),
          legal_name: isCompany.value ? form.value.legal_name.trim() || null : null,
          title: !isCompany.value ? form.value.title.trim() || null : null,
          company_name: !isCompany.value ? form.value.company_name.trim() || null : null,
          industry: isCompany.value ? form.value.industry.trim() || null : null,
          website: isCompany.value ? form.value.website.trim() || null : null,
          employee_count: isCompany.value && form.value.employee_count.trim() ? Number(form.value.employee_count) : null,
          department: !isCompany.value ? form.value.department.trim() || null : null,
          phone: isCompany.value ? form.value.phone.trim() || null : null,
          mobile: !isCompany.value ? form.value.mobile.trim() || null : null,
          work_phone: !isCompany.value ? form.value.work_phone.trim() || null : null,
          email: form.value.email.trim() || null,
          address: isCompany.value ? form.value.address.trim() || null : null,
          line_id: !isCompany.value ? form.value.line_id.trim() || null : null,
          memo: form.value.memo.trim() || null,
        });
        showToast?.("✅ 名片已更新", "success", 1500);
        window.location.hash = `#/cards/${props.cardId}`;
      } catch (err) {
        error.value = err.message || "儲存失敗，請重試";
      } finally {
        saving.value = false;
      }
    }

    function cancel() {
      window.location.hash = `#/cards/${props.cardId}`;
    }

    onMounted(fetchCard);

    return {
      loading,
      saving,
      error,
      focusField,
      isCompany,
      form,
      cancel,
      save,
    };
  },
  template: `
    <div class="card-page">
      <div v-if="loading" class="loading-state">載入中…</div>
      <div v-else class="bottom-sheet" style="position: static; min-height: 100vh; border-radius: 0; max-height: none">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <button class="sheet-link-button" @click="cancel" :disabled="saving">取消</button>
          <div class="sheet-header-title">編輯名片</div>
          <button :class="['sheet-header-action', { muted: saving }]" @click="save" :disabled="saving">
            {{ saving ? '更新中…' : '儲存' }}
          </button>
        </div>
        <div class="sheet-body">
          <div class="sheet-thumb-row">
            <div class="sheet-thumb">{{ form.display_name.charAt(0) || '?' }}</div>
            <div class="sheet-thumb-text">
              <div style="font-weight: 700; color: var(--color-text-primary)">對照原始照片修正</div>
              <div style="margin-top: 3px">直接更新這張名片的正式資料</div>
            </div>
          </div>

          <div v-if="error" class="field-error" style="margin-bottom: 10px">{{ error }}</div>

          <div v-for="field in (isCompany
            ? [
                ['display_name', '公司名稱', true, false],
                ['legal_name', '法定名稱', false, false],
                ['industry', '產業', false, false],
                ['website', '網站', false, false],
                ['employee_count', '員工人數', false, false],
                ['phone', '總機', false, false],
                ['address', '地址', false, false],
                ['memo', '備忘錄', false, true]
              ]
            : [
                ['display_name', '姓名', true, false],
                ['title', '職稱', false, false],
                ['company_name', '公司', false, false],
                ['department', '部門', false, false],
                ['mobile', '手機', false, false],
                ['work_phone', '座機', false, false],
                ['email', 'Email', false, false],
                ['line_id', 'LINE ID', false, false],
                ['memo', '備忘錄', false, true]
              ])" :key="field[0]" class="sheet-field">
            <div class="sheet-field-label">
              {{ field[1] }}
              <span v-if="field[2]" class="sheet-required">*</span>
            </div>
            <div :class="['sheet-input-shell', {
              filled: !!form[field[0]],
              focused: focusField === field[0],
              multi: field[3]
            }]">
              <textarea
                v-if="field[3]"
                v-model="form[field[0]]"
                class="sheet-textarea"
                rows="4"
                :placeholder="'輸入' + field[1]"
                @focus="focusField = field[0]"
                @blur="focusField = ''"
              ></textarea>
              <input
                v-else
                v-model="form[field[0]]"
                class="sheet-input"
                :placeholder="'輸入' + field[1]"
                @focus="focusField = field[0]"
                @blur="focusField = ''"
              />
              <button v-if="form[field[0]]" class="field-clear-button" @click="form[field[0]] = ''">✕</button>
            </div>
          </div>

          <button class="primary-button" @click="save" :disabled="saving">
            {{ saving ? '更新中…' : '更新名片' }}
          </button>
        </div>
      </div>
    </div>
  `,
});
