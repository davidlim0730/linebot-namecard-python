// CardEdit.js — edit form for all card fields with validation, isDirty tracking, and design tokens
import { defineComponent, ref, reactive, onMounted, onBeforeUnmount, inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getCard, updateCard, listTags, setCardTags } from "../api.js";

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
    // Inject showToast from app.js
    const showToast = inject("showToast");

    // Navigation timeout tracking
    let navigationTimeout;

    // Form data
    const form = reactive({
      name: "", title: "", company: "", phone: "", mobile: "",
      email: "", address: "", line_id: "", memo: "",
    });

    // Original form data for isDirty comparison
    const originalForm = reactive({
      name: "", title: "", company: "", phone: "", mobile: "",
      email: "", address: "", line_id: "", memo: "",
    });

    // State tracking
    const loading = ref(true);
    const saving = ref(false);
    const error = ref("");
    const isDirty = ref(false);
    const validationErrors = ref({});
    const availableTags = ref([]);
    const selectedTags = ref([]);
    const originalTags = ref([]);

    // Validation rules
    function validateForm() {
      validationErrors.value = {};

      // Name is required
      if (!form.name || !form.name.trim()) {
        validationErrors.value.name = "姓名為必填";
      }

      // Email validation if provided
      if (form.email && form.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
          validationErrors.value.email = "無效的電郵格式";
        }
      }

      return Object.keys(validationErrors.value).length === 0;
    }

    // Check if form data has changed
    function checkDirty() {
      const formChanged = JSON.stringify(form) !== JSON.stringify(originalForm);
      const tagsChanged = JSON.stringify(selectedTags.value) !== JSON.stringify(originalTags.value);
      isDirty.value = formChanged || tagsChanged;
    }

    // Load card data on mount
    onMounted(async () => {
      try {
        const [card, tags] = await Promise.all([getCard(props.cardId), listTags()]);

        // Initialize form with card data
        for (const f of FIELDS) {
          if (card[f.key] != null) {
            form[f.key] = card[f.key];
            originalForm[f.key] = card[f.key];
          }
        }

        // Initialize tags
        availableTags.value = tags;
        selectedTags.value = card.tags || [];
        originalTags.value = [...(card.tags || [])];

        error.value = "";
        isDirty.value = false;
      } catch (e) {
        error.value = e.message || "載入失敗";
        showToast?.(error.value, "error");
      } finally {
        loading.value = false;
      }
    });

    // Check for unsaved changes before unmounting (navigation)
    onBeforeUnmount(() => {
      clearTimeout(navigationTimeout); // 清理導航計時器
      if (isDirty.value) {
        const confirmed = confirm("你有未保存的變更，確認離開嗎？");
        if (!confirmed) {
          throw new Error("Navigation blocked by unsaved changes");
        }
      }
    });

    // Save changes
    async function save() {
      // Validate form first
      if (!validateForm()) {
        showToast?.("請修正表單錯誤", "error", 3000);
        return;
      }

      saving.value = true;
      error.value = "";

      try {
        const body = {};
        for (const f of FIELDS) {
          body[f.key] = form[f.key] || null;
        }

        // Update card and tags in parallel
        await Promise.all([
          updateCard(props.cardId, body),
          setCardTags(props.cardId, selectedTags.value),
        ]);

        // Update original data to reset isDirty
        for (const f of FIELDS) {
          originalForm[f.key] = form[f.key] || "";
        }
        originalTags.value = [...selectedTags.value];
        isDirty.value = false;

        // Show success toast and navigate back
        showToast?.("名片已保存", "success", 2000);
        navigationTimeout = clearTimeout(navigationTimeout); // 清理前面的計時器
        navigationTimeout = setTimeout(() => {
          window.location.hash = `#/cards/${props.cardId}`;
        }, 800);
      } catch (e) {
        const errorMsg = e.message || "儲存失敗";
        error.value = errorMsg;
        showToast?.(errorMsg, "error", 3000);
      } finally {
        saving.value = false;
      }
    }

    // Navigation helpers
    function goBack() {
      if (isDirty.value) {
        const confirmed = confirm("你有未保存的變更，確認離開嗎？");
        if (!confirmed) return;
      }
      window.location.hash = `#/cards/${props.cardId}`;
    }

    // Tag management
    function toggleTag(tag) {
      const idx = selectedTags.value.indexOf(tag);
      if (idx >= 0) {
        selectedTags.value.splice(idx, 1);
      } else {
        selectedTags.value.push(tag);
      }
      checkDirty();
    }

    return {
      form,
      loading,
      saving,
      error,
      isDirty,
      validationErrors,
      availableTags,
      selectedTags,
      validateForm,
      checkDirty,
      save,
      goBack,
      toggleTag,
    };
  },

  template: `
    <div class="page-container card-edit-page">
      <!-- Header -->
      <div class="card-edit-header">
        <button class="back-button" @click="goBack">←</button>
        <h2 class="header-title">編輯名片</h2>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="card-edit-loading">
        <p>載入中...</p>
      </div>

      <!-- Error banner -->
      <div v-if="error && !loading" class="error-banner">
        <span>{{ error }}</span>
        <button class="error-banner-close" @click="error = ''">✕</button>
      </div>

      <!-- Edit form -->
      <form v-if="!loading" class="edit-form" @submit.prevent="save">
        <!-- Form fields -->
        <div class="form-group">
          <label class="form-label">姓名 <span class="required">*</span></label>
          <input
            v-model="form.name"
            type="text"
            class="form-input"
            :class="{ 'input-error': validationErrors.name }"
            @input="checkDirty"
            placeholder="輸入姓名"
          />
          <span v-if="validationErrors.name" class="error-text">{{ validationErrors.name }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">職稱</label>
          <input
            v-model="form.title"
            type="text"
            class="form-input"
            @input="checkDirty"
            placeholder="例：軟體工程師"
          />
        </div>

        <div class="form-group">
          <label class="form-label">公司</label>
          <input
            v-model="form.company"
            type="text"
            class="form-input"
            @input="checkDirty"
            placeholder="例：Tech Company Ltd."
          />
        </div>

        <div class="form-group">
          <label class="form-label">電話</label>
          <input
            v-model="form.phone"
            type="tel"
            class="form-input"
            @input="checkDirty"
            placeholder="例：02-1234-5678"
          />
        </div>

        <div class="form-group">
          <label class="form-label">手機</label>
          <input
            v-model="form.mobile"
            type="tel"
            class="form-input"
            @input="checkDirty"
            placeholder="例：0912-345-678"
          />
        </div>

        <div class="form-group">
          <label class="form-label">電郵</label>
          <input
            v-model="form.email"
            type="email"
            class="form-input"
            :class="{ 'input-error': validationErrors.email }"
            @input="checkDirty"
            placeholder="例：user@example.com"
          />
          <span v-if="validationErrors.email" class="error-text">{{ validationErrors.email }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">地址</label>
          <input
            v-model="form.address"
            type="text"
            class="form-input"
            @input="checkDirty"
            placeholder="例：台北市中山區"
          />
        </div>

        <div class="form-group">
          <label class="form-label">LINE ID</label>
          <input
            v-model="form.line_id"
            type="text"
            class="form-input"
            @input="checkDirty"
            placeholder="例：user.line.id"
          />
        </div>

        <div class="form-group">
          <label class="form-label">備忘錄</label>
          <textarea
            v-model="form.memo"
            class="form-textarea"
            @input="checkDirty"
            placeholder="輸入備忘錄"
            rows="4"
          ></textarea>
        </div>

        <!-- Tags section -->
        <div v-if="availableTags.length > 0" class="form-group">
          <label class="form-label">標籤</label>
          <div class="tags-container">
            <span
              v-for="tag in availableTags"
              :key="tag"
              class="tag-button"
              :class="{ 'tag-button-active': selectedTags.includes(tag) }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- Save button -->
        <button
          type="submit"
          class="save-button"
          :disabled="!isDirty || saving"
        >
          {{ saving ? "儲存中..." : "保存變更" }}
        </button>
      </form>
    </div>
  `,

  styles: `
    /* ========== Page Layout ========== */
    .page-container {
      padding: var(--space-16);
      padding-bottom: var(--space-32);
    }

    .card-edit-page {
      background-color: var(--color-bg-2);
    }

    /* ========== Header ========== */
    .card-edit-header {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      margin-bottom: var(--space-24);
      padding-bottom: var(--space-16);
      border-bottom: 1px solid var(--color-bg-3);
    }

    .back-button {
      background: none;
      border: none;
      color: var(--color-primary);
      cursor: pointer;
      font-weight: 600;
      font-size: 20px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      transition: opacity 0.2s ease;
    }

    .back-button:active {
      opacity: 0.7;
    }

    .header-title {
      font-family: var(--font-headline);
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
    }

    /* ========== Loading State ========== */
    .card-edit-loading {
      text-align: center;
      padding: var(--space-32);
      color: var(--color-text-secondary);
      font-size: 14px;
    }

    /* ========== Error Banner ========== */
    .error-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: var(--color-error);
      color: white;
      padding: var(--space-12);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-16);
      font-size: 14px;
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .error-banner-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 18px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ========== Form ========== */
    .edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-24);
    }

    /* ========== Form Group ========== */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
    }

    .form-label {
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .required {
      color: var(--color-error);
    }

    /* ========== Input Fields ========== */
    .form-input,
    .form-textarea {
      border: 1px solid var(--color-bg-3);
      border-radius: var(--radius-md);
      padding: var(--space-12);
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--color-text-primary);
      background-color: var(--color-bg-1);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(6, 199, 85, 0.1);
    }

    .form-input.input-error,
    .form-textarea.input-error {
      border-color: var(--color-error);
    }

    .form-input.input-error:focus,
    .form-textarea.input-error:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .form-textarea {
      resize: vertical;
      min-height: 100px;
    }

    /* ========== Error Text ========== */
    .error-text {
      font-size: 12px;
      color: var(--color-error);
      margin-top: var(--space-4);
    }

    /* ========== Tags ========== */
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-8);
    }

    .tag-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-8) var(--space-12);
      border: 1px solid var(--color-bg-3);
      border-radius: var(--radius-full);
      background-color: var(--color-bg-1);
      color: var(--color-text-primary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tag-button:active {
      transform: scale(0.95);
    }

    .tag-button-active {
      border-color: var(--color-primary);
      background-color: var(--color-primary-light);
      color: var(--color-primary);
      font-weight: 600;
    }

    /* ========== Save Button ========== */
    .save-button {
      width: 100%;
      padding: var(--space-16);
      border: none;
      border-radius: var(--radius-md);
      background-color: var(--color-primary);
      color: white;
      font-family: var(--font-body);
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: var(--space-8);
    }

    .save-button:active:not(:disabled) {
      opacity: 0.9;
      transform: scale(0.98);
    }

    .save-button:disabled {
      background-color: var(--color-bg-4);
      color: var(--color-text-disabled);
      cursor: not-allowed;
    }
  `
});
