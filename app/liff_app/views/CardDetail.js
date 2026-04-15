// CardDetail.js — read-only card detail with edit button
// Migrated to template syntax with design system tokens
import { defineComponent, ref, onMounted, onUnmounted, inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getCard } from "../api.js";

const FIELD_LABELS = {
  name: "姓名",
  title: "職稱",
  company: "公司",
  phone: "電話",
  mobile: "手機",
  email: "Email",
  address: "地址",
  line_id: "LINE ID",
  memo: "備忘錄",
};

export default defineComponent({
  name: "CardDetail",
  props: {
    cardId: { type: String, required: true },
  },

  setup(props) {
    const showToast = inject("showToast");

    const card = ref(null);
    const loading = ref(true);
    const error = ref("");

    async function fetchCard() {
      loading.value = true;
      try {
        card.value = await getCard(props.cardId);
        error.value = "";
      } catch (err) {
        error.value = err.message || "無法載入名片詳情";
        showToast?.(error.value, "error");
      } finally {
        loading.value = false;
      }
    }

    function goEdit() {
      window.location.hash = `#/cards/${props.cardId}/edit`;
    }

    function goBack() {
      window.location.hash = "#/";
    }

    function getVisibleFields() {
      if (!card.value) return [];
      return Object.entries(FIELD_LABELS)
        .filter(([key]) => card.value[key])
        .map(([key, label]) => ({ key, label, value: card.value[key] }));
    }

    onMounted(async () => {
      await fetchCard();
    });

    onUnmounted(() => {
      // Clean up any pending state
      card.value = null;
    });

    return {
      card,
      loading,
      error,
      goEdit,
      goBack,
      getVisibleFields,
      fetchCard,
    };
  },

  template: `
    <div class="page-container card-detail-page">
      <!-- Header with back button -->
      <div class="card-detail-header">
        <button class="back-button" @click="goBack">←</button>
        <h2 class="header-title">名片詳情</h2>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="card-detail-loading">
        <p>載入中...</p>
      </div>

      <!-- Card detail content -->
      <div v-else-if="card && !error" class="card-detail-content">
        <!-- Header info section with avatar -->
        <div class="card-header-info">
          <div class="card-avatar">{{ (card.name || '?').charAt(0) }}</div>
          <h1 class="card-name">{{ card.name }}</h1>
          <p v-if="card.title" class="card-title">{{ card.title }}</p>
          <p v-if="card.company" class="card-company">{{ card.company }}</p>
        </div>

        <!-- Details section -->
        <div class="card-details-section">
          <div v-for="field in getVisibleFields()" :key="field.key" class="detail-field">
            <span class="field-label">{{ field.label }}</span>
            <span class="field-value">{{ field.value }}</span>
          </div>

          <!-- Tags section -->
          <div v-if="card.tags && card.tags.length > 0" class="detail-field">
            <span class="field-label">標籤</span>
            <div class="tags-container">
              <span v-for="tag in card.tags" :key="tag" class="tag-badge">{{ tag }}</span>
            </div>
          </div>
        </div>

        <!-- Edit button -->
        <button class="edit-button" @click="goEdit">✏️ 編輯名片</button>
      </div>

      <!-- Error state -->
      <div v-else class="error-state">
        <p class="error-text">{{ error }}</p>
        <button class="retry-button" @click="fetchCard">重試</button>
      </div>
    </div>
  `,

  styles: `
    /* ========== Header ========== */
    .card-detail-header {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      padding: var(--space-16) 0;
      margin-bottom: var(--space-24);
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
      font-size: 16px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
    }

    /* ========== Card Header Info ========== */
    .card-header-info {
      text-align: center;
      padding: var(--space-24);
      background-color: var(--color-bg-1);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-24);
      border: 1px solid var(--color-bg-3);
    }

    .card-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
      margin: 0 auto var(--space-16);
    }

    .card-name {
      font-family: var(--font-headline);
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-4);
    }

    .card-title {
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--color-text-secondary);
      margin: 0 0 var(--space-2);
    }

    .card-company {
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    /* ========== Details Section ========== */
    .card-details-section {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-bottom: var(--space-24);
    }

    .detail-field {
      display: flex;
      flex-direction: column;
      padding: var(--space-16) 0;
      border-bottom: 1px solid var(--color-bg-3);
    }

    .detail-field:last-child {
      border-bottom: none;
    }

    .field-label {
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: var(--space-4);
    }

    .field-value {
      font-family: var(--font-body);
      font-size: 15px;
      color: var(--color-text-primary);
      word-break: break-word;
      line-height: 1.5;
    }

    /* ========== Tags ========== */
    .tags-container {
      display: flex;
      gap: var(--space-8);
      flex-wrap: wrap;
      margin-top: var(--space-4);
    }

    .tag-badge {
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 500;
      padding: var(--space-4) var(--space-8);
      background-color: var(--color-bg-3);
      color: var(--color-text-secondary);
      border-radius: var(--radius-sm);
      white-space: nowrap;
    }

    /* ========== Edit Button ========== */
    .edit-button {
      width: 100%;
      padding: var(--space-16);
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-family: var(--font-body);
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.2s ease;
      box-shadow: var(--shadow-md);
    }

    .edit-button:active {
      transform: scale(0.98);
      box-shadow: var(--shadow-sm);
    }

    /* ========== Loading State ========== */
    .card-detail-loading {
      text-align: center;
      padding: var(--space-32);
      color: var(--color-text-secondary);
      font-family: var(--font-body);
    }

    /* ========== Error State ========== */
    .error-state {
      text-align: center;
      padding: var(--space-32);
    }

    .error-text {
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--color-error);
      margin-bottom: var(--space-16);
      line-height: 1.5;
    }

    .retry-button {
      padding: var(--space-12) var(--space-20);
      background-color: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-family: var(--font-body);
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: transform 0.1s ease, opacity 0.2s ease;
    }

    .retry-button:active {
      transform: scale(0.95);
      opacity: 0.9;
    }
  `,
});
