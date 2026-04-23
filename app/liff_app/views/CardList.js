import { defineComponent, ref, onMounted, onUnmounted, inject, computed } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { listCards, listTags } from "../api.js?v=4";

function displayName(card) {
  return card.display_name || card.name || "（未命名）";
}

function companyName(card) {
  return card.company_name || card.company || "";
}

function createdAt(card) {
  return card.updated_at || card.created_at || "";
}

function formatDateLabel(card) {
  const raw = createdAt(card);
  if (!raw) return "--/--";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "--/--";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export default defineComponent({
  name: "CardList",
  setup() {
    const showToast = inject("showToast");
    const loading = ref(true);
    const error = ref("");
    const cards = ref([]);
    const tags = ref(["全部", "最近新增", "未標籤"]);
    const searchQuery = ref("");
    const selectedTag = ref("全部");
    let searchTimeout = null;

    const filteredCards = computed(() => {
      let list = [...cards.value];
      if (selectedTag.value === "未標籤") {
        list = list.filter(card => !(card.tags || []).length);
      } else if (selectedTag.value !== "全部" && selectedTag.value !== "最近新增") {
        list = list.filter(card => (card.tags || []).includes(selectedTag.value));
      }
      return list.sort((a, b) => createdAt(b).localeCompare(createdAt(a)));
    });

    const isSearching = computed(() => !!searchQuery.value.trim());
    const emptyMode = computed(() => !loading.value && !error.value && filteredCards.value.length === 0);
    const emptySearchMode = computed(() => emptyMode.value && isSearching.value);

    async function fetchCards() {
      loading.value = true;
      try {
        const search = searchQuery.value.trim() || undefined;
        const remoteTag = selectedTag.value === "全部" || selectedTag.value === "最近新增" || selectedTag.value === "未標籤"
          ? undefined
          : selectedTag.value;
        const response = await listCards(search, remoteTag);
        cards.value = Array.isArray(response) ? response : [];
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
        const tagNames = Array.isArray(response) ? response.filter(Boolean) : [];
        tags.value = ["全部", "最近新增", "未標籤", ...tagNames];
      } catch (err) {
        console.error("load tags failed", err);
      }
    }

    function queueSearch() {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(fetchCards, 300);
    }

    function selectTag(tag) {
      selectedTag.value = tag;
      if (searchTimeout) clearTimeout(searchTimeout);
      fetchCards();
    }

    function clearSearch() {
      searchQuery.value = "";
      fetchCards();
    }

    function goToDetail(cardId) {
      window.location.hash = `#/cards/${cardId}`;
    }

    function closeLiff() {
      if (window.liff?.closeWindow) {
        window.liff.closeWindow();
        return;
      }
      history.back();
    }

    function handleFab() {
      showToast?.("請回到 LINE 拍攝或上傳新名片", "info");
    }

    onMounted(async () => {
      await Promise.all([fetchCards(), fetchTags()]);
    });

    onUnmounted(() => {
      if (searchTimeout) clearTimeout(searchTimeout);
    });

    return {
      loading,
      error,
      cards,
      tags,
      searchQuery,
      selectedTag,
      filteredCards,
      isSearching,
      emptyMode,
      emptySearchMode,
      queueSearch,
      selectTag,
      clearSearch,
      goToDetail,
      closeLiff,
      handleFab,
      fetchCards,
      displayName,
      companyName,
      formatDateLabel,
    };
  },
  template: `
    <div class="card-page">
      <div class="card-scroll">
        <div class="card-topbar">
          <button class="card-topbar-button" @click="closeLiff" aria-label="關閉">✕</button>
          <div class="card-topbar-title">名片總表</div>
          <button class="card-topbar-button" @click="fetchCards" aria-label="重新整理">⋯</button>
        </div>

        <div class="search-shell">
          <div :class="['search-input-wrap', { active: isSearching }]">
            <span style="color: var(--color-text-disabled)">🔍</span>
            <input
              v-model="searchQuery"
              class="search-input"
              type="text"
              placeholder="搜尋姓名、公司、職稱…"
              @input="queueSearch"
            />
          </div>
        </div>

        <div class="filter-tabs">
          <button
            v-for="tag in tags"
            :key="tag"
            :class="['filter-tab', { active: selectedTag === tag }]"
            @click="selectTag(tag)"
          >
            {{ tag }}
          </button>
        </div>

        <div class="card-count-hint">
          <span v-if="emptySearchMode">找不到符合「{{ searchQuery }}」的名片</span>
          <span v-else-if="isSearching">找到 {{ filteredCards.length }} 筆</span>
          <span v-else>共 {{ filteredCards.length }} 張名片</span>
        </div>

        <div v-if="loading" class="card-stack">
          <div v-for="i in 3" :key="i" class="skeleton-card">
            <div class="skeleton-avatar"></div>
            <div style="flex:1">
              <div class="skeleton-line" style="width: 52%"></div>
              <div class="skeleton-line" style="width: 80%; margin-top: 8px"></div>
            </div>
            <div class="skeleton-line" style="width: 38px"></div>
          </div>
        </div>

        <div v-else-if="error" class="error-state">
          <div class="empty-state-title">載入失敗</div>
          <div class="empty-state-text">{{ error }}</div>
          <div style="margin-top: 16px">
            <button class="primary-button" style="min-height: 44px" @click="fetchCards">重新整理</button>
          </div>
        </div>

        <div v-else-if="emptySearchMode" class="card-empty-state">
          <div class="card-empty-illustration"></div>
          <div class="empty-state-title">找不到符合「{{ searchQuery }}」的名片</div>
          <div class="empty-state-text">試試其他關鍵字，或清除搜尋重新查看。</div>
          <div style="margin-top: 14px">
            <button class="text-link-button" @click="clearSearch">清除搜尋</button>
          </div>
        </div>

        <div v-else-if="emptyMode" class="card-empty-state">
          <div class="card-empty-illustration"></div>
          <div class="empty-state-title">還沒有任何名片</div>
          <div class="empty-state-text">拍張名片，AI 會幫你整理成可搜尋的聯絡資料。</div>
          <div style="margin-top: 20px">
            <button class="primary-button" @click="handleFab">📷 新增第一張名片</button>
          </div>
        </div>

        <div v-else class="card-stack">
          <button
            v-for="card in filteredCards"
            :key="card.id"
            class="card-row"
            @click="goToDetail(card.id)"
          >
            <div class="card-row-avatar">{{ displayName(card).charAt(0) }}</div>
            <div class="card-row-body">
              <div class="card-row-name">{{ displayName(card) }}</div>
              <div class="card-row-subline">
                {{ [companyName(card), card.title].filter(Boolean).join(' · ') || '尚未補上公司或職稱' }}
              </div>
              <div v-if="card.tags && card.tags.length" class="card-row-tags">
                <span v-for="tag in card.tags.slice(0, 3)" :key="tag" class="tag-pill">{{ tag }}</span>
              </div>
            </div>
            <div class="card-row-date">{{ formatDateLabel(card) }}</div>
          </button>
        </div>
      </div>

      <button class="fab-button" @click="handleFab">＋ 新增名片</button>
    </div>
  `,
});
