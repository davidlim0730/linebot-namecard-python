import { defineComponent, ref, computed, onMounted, inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getCard, updateCard, listTags, setCardTags, listCards, createTag, deleteTag, getSessionUser } from "../api.js?v=4";

const TAG_TONES = ["#06C755", "#0A84FF", "#F59E0B", "#7C3AED", "#EF4444", "#0F766E"];

function getDisplayName(card) {
  return card?.display_name || card?.name || "（未命名）";
}

function getCompanyName(card) {
  return card?.company_name || card?.company || "";
}

function photoUrl(card) {
  return card?.raw_card_data?.photo_url || card?.raw_card_data?.image_url || "";
}

function buildQrText(card) {
  return [getDisplayName(card), getCompanyName(card), card?.email, card?.mobile || card?.phone].filter(Boolean).join(" | ");
}

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
    const memoEditing = ref(false);
    const memoValue = ref("");
    const savingMemo = ref(false);
    const editOpen = ref(false);
    const tagOpen = ref(false);
    const qrOpen = ref(false);
    const photoOpen = ref(false);
    const editSaving = ref(false);
    const tagSaving = ref(false);
    const editError = ref("");
    const editFocus = ref("");
    const tagTab = ref("card");
    const allTags = ref([]);
    const allCards = ref([]);
    const selectedTags = ref([]);
    const newTagName = ref("");
    const creatingTag = ref(false);
    const deletingTag = ref("");
    const deleteConfirm = ref("");
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

    const sessionUser = getSessionUser();
    const isAdmin = computed(() => !!sessionUser?.is_admin);
    const hasPhoto = computed(() => !!photoUrl(card.value));
    const visibleTags = computed(() => card.value?.tags || []);
    const isCompany = computed(() => (card.value?.contact_type || "person") === "company");
    const tagCounts = computed(() => {
      const map = {};
      for (const item of allCards.value) {
        for (const tag of item.tags || []) {
          map[tag] = (map[tag] || 0) + 1;
        }
      }
      return map;
    });

    const contactRows = computed(() => {
      const current = card.value || {};
      const rows = isCompany.value
        ? [
            { key: "industry", icon: "🏷", label: "產業", value: current.industry || "" },
            { key: "website", icon: "🌐", label: "網站", value: current.website || "" },
            { key: "employee_count", icon: "👥", label: "員工規模", value: current.employee_count ? `${current.employee_count} 人` : "" },
            { key: "phone", icon: "📞", label: "總機", value: current.phone || "" },
            { key: "address", icon: "📍", label: "地址", value: current.address || "" },
          ]
        : [
            { key: "company_name", icon: "🏢", label: "公司", value: getCompanyName(current) || "", link: current.parent_company_id || "" },
            { key: "department", icon: "🏷", label: "部門", value: current.department || "" },
            { key: "mobile", icon: "📱", label: "手機", value: current.mobile || "" },
            { key: "work_phone", icon: "☎️", label: "座機", value: current.work_phone || "" },
            { key: "email", icon: "✉️", label: "Email", value: current.email || "" },
            { key: "line_id", icon: "💬", label: "LINE ID", value: current.line_id || "" },
          ];
      return rows.filter(row => row.value);
    });

    function goToCompany() {
      if (!card.value?.parent_company_id) return;
      window.location.hash = `#/cards/${card.value.parent_company_id}`;
    }

    function closeLiff() {
      if (window.liff?.closeWindow) {
        window.liff.closeWindow();
        return;
      }
      history.back();
    }

    function goBack() {
      window.location.hash = "#/";
    }

    async function fetchCardDetail() {
      loading.value = true;
      try {
        card.value = await getCard(props.cardId);
        selectedTags.value = [...(card.value.tags || [])];
        memoValue.value = card.value.memo || "";
        syncForm();
        error.value = "";
      } catch (err) {
        error.value = err.message || "無法載入名片詳情";
        showToast?.(error.value, "error");
      } finally {
        loading.value = false;
      }
    }

    async function fetchTagData() {
      try {
        const [tags, cards] = await Promise.all([listTags(), listCards()]);
        allTags.value = Array.isArray(tags) ? tags.filter(Boolean) : [];
        allCards.value = Array.isArray(cards) ? cards : [];
      } catch (err) {
        console.error("load tag data failed", err);
      }
    }

    function syncForm() {
      form.value = {
        display_name: getDisplayName(card.value),
        legal_name: card.value?.legal_name || "",
        title: card.value?.title || "",
        company_name: getCompanyName(card.value),
        industry: card.value?.industry || "",
        website: card.value?.website || "",
        employee_count: card.value?.employee_count != null ? String(card.value.employee_count) : "",
        department: card.value?.department || "",
        phone: card.value?.phone || "",
        mobile: card.value?.mobile || "",
        work_phone: card.value?.work_phone || "",
        email: card.value?.email || "",
        address: card.value?.address || "",
        line_id: card.value?.line_id || "",
        memo: card.value?.memo || "",
      };
    }

    function openEditSheet() {
      syncForm();
      editError.value = "";
      editOpen.value = true;
    }

    async function saveEditSheet() {
      if (!form.value.display_name.trim()) {
        editError.value = "姓名不能空白";
        editFocus.value = "display_name";
        return;
      }
      editSaving.value = true;
      editError.value = "";
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
        editOpen.value = false;
        await fetchCardDetail();
      } catch (err) {
        editError.value = err.message || "儲存失敗，請重試";
        showToast?.("⚠️ 儲存失敗，請重試", "error");
      } finally {
        editSaving.value = false;
      }
    }

    function copyValue(value, label = "資訊") {
      if (!value) return;
      navigator.clipboard?.writeText(value);
      showToast?.(`✅ 已複製${label}，關閉視窗後直接貼上`, "success", 2000);
    }

    function startMemoEdit() {
      memoValue.value = card.value?.memo || "";
      memoEditing.value = true;
    }

    async function saveMemo() {
      savingMemo.value = true;
      try {
        await updateCard(props.cardId, { memo: memoValue.value.trim() || null });
        card.value = { ...card.value, memo: memoValue.value.trim() };
        memoEditing.value = false;
        showToast?.("✅ 名片已更新", "success", 1500);
      } catch (err) {
        showToast?.(err.message || "儲存失敗", "error");
      } finally {
        savingMemo.value = false;
      }
    }

    function openTagSheet() {
      selectedTags.value = [...visibleTags.value];
      tagTab.value = "card";
      newTagName.value = "";
      tagOpen.value = true;
      fetchTagData();
    }

    function toggleTag(tag) {
      if (selectedTags.value.includes(tag)) {
        selectedTags.value = selectedTags.value.filter(item => item !== tag);
      } else {
        selectedTags.value = [...selectedTags.value, tag];
      }
    }

    async function saveTags() {
      tagSaving.value = true;
      try {
        await setCardTags(props.cardId, selectedTags.value);
        showToast?.("群組標籤已更新", "success", 1500);
        tagOpen.value = false;
        await Promise.all([fetchCardDetail(), fetchTagData()]);
      } catch (err) {
        showToast?.(err.message || "更新標籤失敗", "error");
      } finally {
        tagSaving.value = false;
      }
    }

    async function handleCreateTag() {
      const name = newTagName.value.trim();
      if (!name) return;
      creatingTag.value = true;
      try {
        await createTag(name);
        newTagName.value = "";
        showToast?.("已新增標籤", "success");
        await fetchTagData();
        if (!selectedTags.value.includes(name)) {
          selectedTags.value = [...selectedTags.value, name];
        }
      } catch (err) {
        showToast?.(err.message || "新增標籤失敗", "error");
      } finally {
        creatingTag.value = false;
      }
    }

    async function confirmDeleteTag() {
      if (!deleteConfirm.value) return;
      deletingTag.value = deleteConfirm.value;
      try {
        await deleteTag(deleteConfirm.value);
        showToast?.("標籤已刪除", "success");
        deleteConfirm.value = "";
        selectedTags.value = selectedTags.value.filter(tag => tag !== deletingTag.value);
        await Promise.all([fetchTagData(), fetchCardDetail()]);
      } catch (err) {
        showToast?.(err.message || "刪除標籤失敗", "error");
      } finally {
        deletingTag.value = "";
      }
    }

    onMounted(async () => {
      await Promise.all([fetchCardDetail(), fetchTagData()]);
    });

    return {
      card,
      loading,
      error,
      memoEditing,
      memoValue,
      savingMemo,
      editOpen,
      tagOpen,
      qrOpen,
      photoOpen,
      editSaving,
      tagSaving,
      editError,
      editFocus,
      tagTab,
      allTags,
      selectedTags,
      newTagName,
      creatingTag,
      deleteConfirm,
      deletingTag,
      isAdmin,
      hasPhoto,
      visibleTags,
      tagCounts,
      form,
      contactRows,
      isCompany,
      goToCompany,
      closeLiff,
      goBack,
      fetchCardDetail,
      openEditSheet,
      saveEditSheet,
      copyValue,
      startMemoEdit,
      saveMemo,
      openTagSheet,
      toggleTag,
      saveTags,
      handleCreateTag,
      confirmDeleteTag,
      getDisplayName,
      getCompanyName,
      photoUrl,
      buildQrText,
    };
  },
  template: `
    <div class="card-page">
      <div v-if="loading" class="loading-state">載入中…</div>

      <div v-else-if="error" class="error-state">
        <div class="empty-state-title">載入失敗</div>
        <div class="empty-state-text">{{ error }}</div>
        <div style="margin-top: 16px">
          <button class="primary-button" style="min-height: 44px" @click="fetchCardDetail">重新整理</button>
        </div>
      </div>

      <div v-else-if="card" class="card-scroll">
        <div class="card-topbar">
          <button class="card-topbar-button" @click="goBack">←</button>
          <div class="card-topbar-title">名片詳情</div>
          <button class="card-topbar-button" @click="closeLiff">✕</button>
        </div>

        <div class="detail-photo-panel" @click="hasPhoto ? photoOpen = true : null">
          <div v-if="hasPhoto" class="detail-photo-card">
            <div class="detail-name" style="font-size: 18px">{{ getDisplayName(card) }}</div>
            <div class="detail-subtext" style="font-size: 12px">{{ card.title || '尚未補上職稱' }}</div>
            <div class="detail-subtext" style="font-size: 12px">{{ getCompanyName(card) || '尚未補上公司' }}</div>
            <div style="position: absolute; left: 14px; right: 14px; bottom: 14px; font-size: 11px; color: var(--color-text-secondary); line-height: 1.5">
              {{ [card.mobile || card.phone, card.email, card.address].filter(Boolean).join(' · ') || '點擊可檢視原始名片照片' }}
            </div>
          </div>
          <div v-else class="detail-photo-empty">尚無名片照片</div>
          <button v-if="hasPhoto" class="icon-button" style="position:absolute;right:12px;bottom:12px">⤢</button>
        </div>

        <div class="detail-main-card">
          <div class="detail-name">{{ getDisplayName(card) }}</div>
          <div class="detail-subtext">{{ isCompany ? (card.industry || '尚未填寫產業') : (card.title || '尚未填寫職稱') }}</div>
          <div class="detail-subtext">{{ isCompany ? (card.website || '尚未填寫網站') : (getCompanyName(card) || '尚未填寫公司') }}</div>
        </div>

        <div class="detail-list-card">
          <div v-if="!contactRows.length" class="detail-row-value empty">尚未補齊聯絡資訊</div>
          <div v-for="row in contactRows" :key="row.key" class="detail-row">
            <div class="detail-row-icon">{{ row.icon }}</div>
            <div class="detail-row-body">
              <div class="detail-row-label">{{ row.label }}</div>
              <button
                v-if="row.key === 'company_name' && row.link"
                class="text-link-button"
                style="padding:0;justify-content:flex-start"
                @click="goToCompany"
              >
                {{ row.value }}
              </button>
              <div v-else :class="['detail-row-value', { empty: !row.value }]">{{ row.value || '未填寫' }}</div>
            </div>
            <button class="copy-icon-button" @click.stop="copyValue(row.value, row.label)" :disabled="!row.value">⧉</button>
          </div>
        </div>

        <div style="margin-top: 12px">
          <div class="section-label">📝 備忘錄</div>
          <div class="detail-soft-card">
            <div v-if="!memoEditing && card.memo" class="memo-text">{{ card.memo }}</div>
            <div v-else-if="!memoEditing" class="memo-empty-row">
              <div class="detail-row-value empty">尚未新增備忘錄</div>
              <button class="text-link-button" @click="startMemoEdit">＋ 快速新增</button>
            </div>
            <div v-else>
              <textarea v-model="memoValue" class="memo-textarea" placeholder="輸入備忘錄…"></textarea>
              <div class="memo-actions">
                <button class="ghost-button" @click="memoEditing = false" :disabled="savingMemo">取消</button>
                <button class="primary-button" style="width:auto;min-height:40px;padding:0 18px" @click="saveMemo" :disabled="savingMemo">
                  {{ savingMemo ? '儲存中…' : '儲存' }}
                </button>
              </div>
            </div>
            <div v-if="!memoEditing && card.memo" style="margin-top: 10px">
              <button class="text-link-button" @click="startMemoEdit">✏️ 編輯備忘錄</button>
            </div>
          </div>
        </div>

        <div style="margin-top: 12px">
          <div class="section-label">🏷 群組標籤</div>
          <div class="detail-soft-card">
            <div v-if="visibleTags.length" class="tag-flow">
              <span v-for="tag in visibleTags" :key="tag" class="tag-pill">{{ tag }}</span>
            </div>
            <div v-else class="detail-row-value empty">尚未分類</div>
          </div>
        </div>

        <div class="bottom-action-bar">
          <button class="detail-action-button" @click="openEditSheet">✏️ 編輯</button>
          <button class="detail-action-button" @click="openTagSheet">🏷 群組</button>
          <button class="detail-action-button primary" @click="qrOpen = true">📲 QR Code</button>
        </div>
      </div>

      <div v-if="editOpen" class="sheet-overlay" @click="editOpen = false"></div>
      <div v-if="editOpen" class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <button class="sheet-link-button" @click="editOpen = false" :disabled="editSaving">取消</button>
          <div class="sheet-header-title">編輯名片</div>
          <button :class="['sheet-header-action', { muted: editSaving }]" @click="saveEditSheet" :disabled="editSaving">
            {{ editSaving ? '更新中…' : '儲存' }}
          </button>
        </div>
        <div class="sheet-body">
          <div class="sheet-thumb-row">
            <div class="sheet-thumb">{{ getDisplayName(card).charAt(0) }}</div>
            <div class="sheet-thumb-text">
              <div style="font-weight: 700; color: var(--color-text-primary)">對照原始照片修正</div>
              <div style="margin-top: 3px">點擊縮圖可全螢幕預覽</div>
            </div>
          </div>

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
              focused: editFocus === field[0],
              multi: field[3]
            }]">
              <textarea
                v-if="field[3]"
                v-model="form[field[0]]"
                class="sheet-textarea"
                rows="4"
                :placeholder="'輸入' + field[1]"
                @focus="editFocus = field[0]"
                @blur="editFocus = ''"
              ></textarea>
              <input
                v-else
                v-model="form[field[0]]"
                class="sheet-input"
                :placeholder="'輸入' + field[1]"
                @focus="editFocus = field[0]"
                @blur="editFocus = ''"
              />
              <button v-if="form[field[0]]" class="field-clear-button" @click="form[field[0]] = ''">✕</button>
            </div>
            <div v-if="field[0] === 'display_name' && editError" class="field-error">{{ editError }}</div>
          </div>

          <button class="primary-button" @click="saveEditSheet" :disabled="editSaving">
            {{ editSaving ? '更新中…' : '更新名片' }}
          </button>
        </div>
      </div>

      <div v-if="tagOpen" class="sheet-overlay" @click="tagOpen = false"></div>
      <div v-if="tagOpen" class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <button class="sheet-link-button" @click="tagOpen = false">✕</button>
          <div class="sheet-header-title">選擇群組標籤</div>
          <button :class="['sheet-header-action', { muted: tagSaving }]" @click="saveTags" :disabled="tagSaving">
            {{ tagSaving ? '儲存中…' : '確認' }}
          </button>
        </div>

        <div class="sheet-tabs">
          <button :class="['sheet-tab-button', { active: tagTab === 'card' }]" @click="tagTab = 'card'">此名片標籤</button>
          <button :class="['sheet-tab-button', { active: tagTab === 'all' }]" @click="tagTab = 'all'">所有標籤</button>
        </div>

        <div class="sheet-body">
          <template v-if="tagTab === 'card'">
            <div class="tag-card-preview">
              <div class="sheet-thumb" style="width: 44px; height: 44px; font-size: 16px">{{ getDisplayName(card).charAt(0) }}</div>
              <div style="flex: 1">
                <div style="font-size: 16px; font-weight: 800; color: var(--color-text-primary)">{{ getDisplayName(card) }}</div>
                <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 2px">
                  {{ [getCompanyName(card), card.title].filter(Boolean).join(' · ') || '尚未補齊公司或職稱' }}
                </div>
              </div>
            </div>
            <div class="info-banner">
              為這張名片選擇群組標籤（可多選）
            </div>
            <div class="tag-flow" style="margin-top: 12px">
              <button
                v-for="tag in allTags"
                :key="tag"
                :class="['tag-chip-button', { active: selectedTags.includes(tag) }]"
                @click="toggleTag(tag)"
              >
                <span v-if="selectedTags.includes(tag)">✓</span>
                {{ tag }}
              </button>
              <button v-if="isAdmin" class="tag-chip-button dashed" @click="tagTab = 'all'">＋ 新標籤</button>
            </div>
            <div v-if="isAdmin" class="tag-admin-footer">
              <div class="sheet-link-row">
                <div style="font-size: 12px; color: var(--color-text-secondary)">要新增或刪除標籤？</div>
                <button class="sheet-link-button" @click="tagTab = 'all'">管理所有標籤 →</button>
              </div>
            </div>
          </template>

          <template v-else>
            <div v-if="isAdmin" class="inline-tag-create">
              <input v-model="newTagName" class="inline-tag-input" placeholder="輸入新標籤名稱" @keyup.enter="handleCreateTag" />
              <button class="detail-action-button primary" style="width: 42px; min-width: 42px; padding: 0" @click="handleCreateTag" :disabled="creatingTag">
                {{ creatingTag ? '…' : '＋' }}
              </button>
            </div>

            <div class="tag-admin-list" style="margin-top: 10px">
              <div v-for="(tag, index) in allTags" :key="tag" class="tag-admin-row">
                <div class="tag-admin-dot" :style="{ background: TAG_TONES[index % TAG_TONES.length] }"></div>
                <div style="flex: 1; font-size: 16px; color: var(--color-text-primary)">{{ tag }}</div>
                <div style="font-size: 12px; color: var(--color-text-disabled)">{{ tagCounts[tag] || 0 }} 張</div>
                <button v-if="isAdmin" class="icon-button" @click="deleteConfirm = tag">🗑</button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div v-if="deleteConfirm" class="modal-overlay" @click="deleteConfirm = ''"></div>
      <div v-if="deleteConfirm" class="confirm-sheet">
        <div class="sheet-handle"></div>
        <div class="confirm-sheet-icon">🗑</div>
        <div class="confirm-sheet-title">刪除「{{ deleteConfirm }}」？</div>
        <div class="confirm-sheet-text">
          此標籤已用於 {{ tagCounts[deleteConfirm] || 0 }} 張名片，刪除後無法復原。
        </div>
        <div class="confirm-sheet-actions">
          <button class="ghost-button" style="flex:1" @click="deleteConfirm = ''">取消</button>
          <button class="danger-button" style="flex:1" @click="confirmDeleteTag" :disabled="deletingTag === deleteConfirm">
            {{ deletingTag === deleteConfirm ? '刪除中…' : '刪除' }}
          </button>
        </div>
      </div>

      <div v-if="qrOpen" class="modal-overlay" @click="qrOpen = false"></div>
      <div v-if="qrOpen" class="qr-modal">
        <div class="qr-card">
          <div class="sheet-link-row">
            <div class="sheet-header-title" style="text-align:left">聯絡人 QR Code</div>
            <button class="icon-button" @click="qrOpen = false">✕</button>
          </div>
          <div class="qr-grid">
            <div style="font-family: var(--font-headline); font-size: 16px; font-weight: 800">{{ getDisplayName(card) }}</div>
          </div>
          <div class="detail-row-value">{{ buildQrText(card) }}</div>
          <div style="margin-top: 16px">
            <button class="primary-button" @click="copyValue(buildQrText(card), '聯絡資訊')">複製聯絡資訊</button>
          </div>
        </div>
      </div>

      <div v-if="photoOpen" class="modal-overlay" @click="photoOpen = false"></div>
      <div v-if="photoOpen" class="qr-modal">
        <div class="qr-card" style="padding: 14px">
          <div class="sheet-link-row">
            <div class="sheet-header-title" style="text-align:left">原始名片照片</div>
            <button class="icon-button" @click="photoOpen = false">✕</button>
          </div>
          <img
            v-if="photoUrl(card)"
            :src="photoUrl(card)"
            alt="名片照片"
            style="width:100%; margin-top: 12px; border-radius: 14px; background: var(--color-bg-section)"
          />
          <div v-else class="detail-photo-empty" style="padding: 28px 0 10px">尚無名片照片</div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      TAG_TONES,
    };
  },
});
