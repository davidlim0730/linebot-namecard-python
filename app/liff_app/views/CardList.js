// CardList.js — 名片列表頁面，包含搜尋、篩選、Skeleton loading、FAB
import { defineComponent, ref, onMounted, onUnmounted, inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { listCards, listTags } from "../api.js?v=3";

export default defineComponent({
  name: "CardList",
  props: {},
  setup() {
    const showToast = inject("showToast");

    const cards = ref([]);
    const loading = ref(true);
    const searchQuery = ref("");
    const selectedTag = ref("全部");
    const tags = ref(["全部", "未標籤"]);
    const error = ref("");
    let searchTimeout;

    async function fetchCards() {
      loading.value = true;
      try {
        const params = {};
        if (searchQuery.value) params.search = searchQuery.value;
        if (selectedTag.value !== "全部") params.tag = selectedTag.value;
        // 後端負責篩選，直接使用返回的已過濾結果
        cards.value = await listCards(params.search, params.tag);
        error.value = "";
      } catch (err) {
        error.value = err.message || "無法載入名片";
        showToast?.(error.value, "error");
      } finally {
        loading.value = false;
      }
    }

    async function fetchTags() {
      try {
        const response = await listTags();
        const tagNames = response && Array.isArray(response) ? response.map(t => t.name || t) : [];
        tags.value = ["全部", "未標籤", ...tagNames];
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      }
    }

    function goToCardDetail(cardId) {
      window.location.hash = `#/cards/${cardId}`;
    }

    function goToCreateCard() {
      showToast?.("返回 LINE 加入名片", "info");
    }

    function onSearchInput() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        fetchCards();
      }, 300);
    }

    function onTagSelect(tag) {
      selectedTag.value = tag;
      // 清空搜尋防抖計時器，立即執行篩選
      clearTimeout(searchTimeout);
      fetchCards();
    }

    onMounted(async () => {
      await Promise.all([fetchCards(), fetchTags()]);
    });

    onUnmounted(() => {
      clearTimeout(searchTimeout);
    });

    return {
      cards,
      loading,
      searchQuery,
      selectedTag,
      tags,
      error,
      onSearchInput,
      onTagSelect,
      goToCardDetail,
      goToCreateCard,
      fetchCards
    };
  },

  template: `
    <div class="page-container card-list-page">
      <!-- 搜尋欄 (Glassmorphism 固定頂部) -->
      <div class="search-bar-fixed">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜尋名片..."
          class="search-input"
          @input="onSearchInput"
        />
      </div>

      <!-- 篩選 Tabs -->
      <div v-if="tags.length > 0" class="filter-tabs">
        <button
          v-for="tag in tags"
          :key="tag"
          :class="['filter-tab', { active: selectedTag === tag }]"
          @click="onTagSelect(tag)"
        >
          {{ tag }}
        </button>
      </div>

      <!-- 載入狀態（Skeleton） -->
      <div v-if="loading" class="card-list-loading">
        <div v-for="i in 3" :key="i" class="skeleton-card">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-text"></div>
            <div class="skeleton-text" style="width: 70%;"></div>
          </div>
        </div>
      </div>

      <!-- 名片列表 -->
      <div v-else-if="!error && cards.length > 0" class="card-list">
        <div
          v-for="card in cards"
          :key="card.id"
          class="card-item"
          @click="goToCardDetail(card.id)"
        >
          <div class="card-item-avatar">{{ (card.name || '?').charAt(0) }}</div>
          <div class="card-item-content">
            <div class="card-item-name">{{ card.name || '（無姓名）' }}</div>
            <div class="card-item-company">
              {{ [card.title, card.company].filter(Boolean).join(' · ') || '（無資訊）' }}
            </div>
            <div v-if="card.tags && card.tags.length > 0" class="card-item-tags">
              <span v-for="tag in card.tags" :key="tag" class="tag-badge">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-else-if="!error && cards.length === 0" class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">還沒有名片</div>
        <div class="empty-state-hint">返回 LINE 拍名片新增</div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else class="error-state">
        <div class="error-text">{{ error }}</div>
        <button class="retry-button" @click="fetchCards">重試</button>
      </div>

      <!-- FAB 新增按鈕 -->
      <button class="fab" @click="goToCreateCard" title="返回 LINE 新增名片">
        ➕
      </button>
    </div>
  `,

  styles: `
    /* ========== 搜尋欄（Glassmorphism 頂部 bar） ========== */
    .search-bar-fixed {
      position: sticky;
      top: 0;
      background-color: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      padding: var(--space-12) 0;
      margin-bottom: var(--space-12);
      border-bottom: 1px solid var(--color-bg-3);
      z-index: 100;
    }

    .search-input {
      width: 100%;
      padding: var(--space-12);
      border: 1px solid var(--color-bg-3);
      border-radius: var(--radius-md);
      font-size: 14px;
      font-family: var(--font-body);
      background-color: var(--color-bg-2);
      color: var(--color-text-primary);
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-primary);
      background-color: var(--color-bg-1);
    }

    .search-input::placeholder {
      color: var(--color-text-secondary);
    }

    /* ========== 篩選 Tabs ========== */
    .filter-tabs {
      display: flex;
      gap: var(--space-8);
      margin-bottom: var(--space-16);
      overflow-x: auto;
      padding-bottom: var(--space-8);
      -webkit-overflow-scrolling: touch;
    }

    .filter-tabs::-webkit-scrollbar {
      height: 4px;
    }

    .filter-tabs::-webkit-scrollbar-thumb {
      background-color: var(--color-bg-3);
      border-radius: 2px;
    }

    .filter-tab {
      padding: var(--space-8) var(--space-12);
      border: none;
      border-radius: var(--radius-full);
      background-color: var(--color-bg-2);
      color: var(--color-text-secondary);
      font-weight: 600;
      font-family: var(--font-body);
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .filter-tab:active {
      transform: scale(0.95);
    }

    .filter-tab.active {
      background-color: var(--color-primary);
      color: white;
    }

    /* ========== 名片列表 ========== */
    .card-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
    }

    .card-item {
      display: flex;
      gap: var(--space-12);
      padding: var(--space-16);
      background-color: var(--color-bg-1);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background-color 0.2s ease, transform 0.1s ease;
      box-shadow: var(--shadow-sm);
    }

    .card-item:active {
      transform: scale(0.98);
      background-color: var(--color-bg-3);
    }

    .card-item-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background-color: var(--color-primary-light);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      flex-shrink: 0;
    }

    .card-item-content {
      flex: 1;
      min-width: 0;
    }

    .card-item-name {
      font-weight: 600;
      font-size: 15px;
      color: var(--color-text-primary);
      margin-bottom: var(--space-4);
    }

    .card-item-company {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-item-tags {
      display: flex;
      gap: var(--space-4);
      flex-wrap: wrap;
    }

    .tag-badge {
      font-size: 11px;
      padding: 2px 6px;
      background-color: var(--color-bg-3);
      color: var(--color-text-secondary);
      border-radius: var(--radius-sm);
      font-weight: 500;
    }

    /* ========== Skeleton Loading ========== */
    .card-list-loading {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
    }

    .skeleton-card {
      display: flex;
      gap: var(--space-12);
      padding: var(--space-16);
      background-color: var(--color-bg-1);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
    }

    .skeleton-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .skeleton-content {
      flex: 1;
    }

    .skeleton-text {
      height: 12px;
      margin-bottom: var(--space-8);
      border-radius: var(--radius-sm);
    }

    .skeleton-avatar,
    .skeleton-text {
      background: linear-gradient(90deg, var(--color-bg-3) 0%, var(--color-bg-2) 50%, var(--color-bg-3) 100%);
      background-size: 1000px 100%;
      animation: skeleton-shimmer 2s infinite;
    }

    /* ========== 空狀態 ========== */
    .empty-state {
      text-align: center;
      padding: var(--space-32);
      color: var(--color-text-secondary);
    }

    .empty-state-icon {
      font-size: 64px;
      margin-bottom: var(--space-16);
    }

    .empty-state-text {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: var(--space-8);
    }

    .empty-state-hint {
      font-size: 12px;
    }

    /* ========== 錯誤狀態 ========== */
    .error-state {
      text-align: center;
      padding: var(--space-32);
    }

    .error-text {
      color: var(--color-error);
      margin-bottom: var(--space-16);
      font-size: 14px;
    }

    .retry-button {
      padding: var(--space-12) var(--space-20);
      background-color: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-weight: 600;
      font-family: var(--font-body);
      transition: background-color 0.2s ease, transform 0.1s ease;
    }

    .retry-button:active {
      transform: scale(0.95);
      background-color: var(--color-primary-dark);
    }
  `
});
