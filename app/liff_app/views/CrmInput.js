import { defineComponent, ref, computed, inject, onUnmounted } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { crmParse, crmConfirm } from "../api.js?v=4";

export default defineComponent({
  name: "CrmInput",
  setup() {
    const showToast = inject("showToast");
    const urlParams = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const prefillContact = urlParams.get("contact") || "";
    const prefillCompany = urlParams.get("company") || "";
    const prefillContactId = urlParams.get("contact_id") || "";
    const contextHint = (prefillContact || prefillCompany || prefillContactId)
      ? {
          contact_name: prefillContact || null,
          entity_name: prefillCompany || null,
          contact_id: prefillContactId || null,
        }
      : null;

    const rawText = ref("");
    const parseLoading = ref(false);
    const parseError = ref("");
    const parseResult = ref(null);
    const confirmLoading = ref(false);
    const confirmError = ref("");
    const confirmed = ref(null);
    const loadingIndex = ref(0);

    const loadingMessages = [
      "正在萃取關鍵互動…",
      "正在整理案件與下一步…",
      "正在透過 AI 產生確認卡片…",
      "即將完成…",
    ];

    const contextLabel = computed(() => [prefillContact, prefillCompany].filter(Boolean).join(" ／ "));
    const lowConfidence = computed(() => (parseResult.value?.overall_confidence || 0) < 0.5);
    const missingFields = computed(() => parseResult.value?.missing_fields || []);

    let loadingTimer = null;

    function startLoadingLoop() {
      stopLoadingLoop();
      loadingIndex.value = 0;
      loadingTimer = setInterval(() => {
        loadingIndex.value = (loadingIndex.value + 1) % loadingMessages.length;
      }, 1800);
    }

    function stopLoadingLoop() {
      if (loadingTimer) {
        clearInterval(loadingTimer);
        loadingTimer = null;
      }
    }

    async function handleParse() {
      parseError.value = "";
      confirmError.value = "";
      confirmed.value = null;
      parseResult.value = null;
      parseLoading.value = true;
      startLoadingLoop();
      try {
        const res = await crmParse(rawText.value, contextHint);
        parseResult.value = res.parsed;
      } catch (err) {
        parseError.value = err.message || "解析失敗";
        showToast?.(parseError.value, "error");
      } finally {
        parseLoading.value = false;
        stopLoadingLoop();
      }
    }

    async function handleConfirm() {
      confirmError.value = "";
      confirmLoading.value = true;
      try {
        const res = await crmConfirm(parseResult.value, contextHint);
        confirmed.value = res.written;
        parseResult.value = null;
        rawText.value = "";
        showToast?.("CRM 已更新", "success");
      } catch (err) {
        confirmError.value = err.message || "確認失敗";
        showToast?.(confirmError.value, "error");
      } finally {
        confirmLoading.value = false;
      }
    }

    function resetResult() {
      parseResult.value = null;
      confirmError.value = "";
    }

    onUnmounted(() => {
      stopLoadingLoop();
    });

    return {
      rawText,
      parseLoading,
      parseError,
      parseResult,
      confirmLoading,
      confirmError,
      confirmed,
      loadingMessages,
      loadingIndex,
      contextLabel,
      lowConfidence,
      missingFields,
      handleParse,
      handleConfirm,
      resetResult,
    };
  },
  template: `
    <div class="page-container">
      <div v-if="confirmed" class="ai-confirm-card">
        <div class="ai-confirm-topbar"></div>
        <div class="ai-confirm-body">
          <div class="detail-name" style="font-size: 18px">CRM 已完成更新</div>
          <div class="detail-subtext">以下內容已正式寫入你的 CRM。</div>
          <div class="ai-section">
            <div class="ai-checklist">
              <div class="ai-checkitem">📇 聯絡人：{{ confirmed.contacts_upserted.length }} 筆</div>
              <div class="ai-checkitem">📊 案件：{{ confirmed.pipelines_updated.length }} 筆</div>
              <div class="ai-checkitem">💬 互動：{{ confirmed.interactions_logged.length }} 筆</div>
              <div class="ai-checkitem">✅ 待辦：{{ confirmed.actions_scheduled.length }} 筆</div>
            </div>
          </div>
          <div style="margin-top: 16px">
            <button class="primary-button" @click="confirmed = null">➕ 繼續輸入</button>
          </div>
        </div>
      </div>

      <template v-else-if="parseResult">
        <div v-if="lowConfidence || missingFields.length" class="warning-banner">
          <strong>⚠️ 提醒</strong>
          <div v-if="lowConfidence" style="margin-top: 4px">
            AI 信心度 {{ Math.round((parseResult.overall_confidence || 0) * 100) }}%，建議確認後再寫入。
          </div>
          <div v-if="missingFields.length" style="margin-top: 4px">
            缺少欄位：{{ missingFields.join('、') }}
          </div>
        </div>

        <div class="ai-confirm-card">
          <div class="ai-confirm-topbar"></div>
          <div class="ai-confirm-body">
            <div class="detail-name" style="font-size: 18px">AI 已整理好以下資訊</div>
            <div class="detail-subtext">確認無誤後，系統會自動更新 CRM。</div>

            <div v-if="parseResult.pipelines && parseResult.pipelines.length" class="ai-section">
              <div class="ai-section-title">案件更新</div>
              <div v-for="(item, index) in parseResult.pipelines" :key="'pipeline-' + index" style="margin-top: 10px">
                <div class="ai-section-main">{{ item.entity_name || '未指定案件' }}</div>
                <div class="ai-section-sub">
                  {{ [item.stage, item.status_summary, item.next_action_date].filter(Boolean).join(' → ') || 'AI 已整理案件進度' }}
                </div>
              </div>
            </div>

            <div v-if="parseResult.entities && parseResult.entities.length" class="ai-section">
              <div class="ai-section-title">新聯絡人</div>
              <div v-for="(item, index) in parseResult.entities" :key="'entity-' + index" style="margin-top: 10px">
                <div class="ai-section-main">{{ item.name }}</div>
                <div class="ai-section-sub">{{ item.category || '聯絡人' }}{{ item.industry ? ' · ' + item.industry : '' }}</div>
              </div>
            </div>

            <div v-if="parseResult.actions && parseResult.actions.length" class="ai-section">
              <div class="ai-section-title">下一步行動</div>
              <div class="ai-checklist">
                <div v-for="(item, index) in parseResult.actions" :key="'action-' + index" class="ai-checkitem">
                  <span>□</span>
                  <span>{{ [item.due_date, item.task_detail].filter(Boolean).join(' ') }}</span>
                </div>
              </div>
            </div>

            <div v-if="parseResult.interactions && parseResult.interactions.length" class="ai-section">
              <div class="ai-section-title">互動摘要</div>
              <div v-for="(item, index) in parseResult.interactions" :key="'interaction-' + index" style="margin-top: 10px">
                <div class="ai-section-main">{{ item.entity_name || '本次互動' }}</div>
                <div class="ai-section-sub">
                  {{ item.ai_key_insights && item.ai_key_insights.length ? item.ai_key_insights.join(' · ') : item.raw_transcript || 'AI 已整理互動重點' }}
                </div>
              </div>
            </div>

            <div class="ai-actions">
              <button class="primary-button" style="min-height: 48px" @click="handleConfirm" :disabled="confirmLoading">
                {{ confirmLoading ? '確認中…' : '👍 確認無誤' }}
              </button>
              <button class="ghost-button" style="min-height: 48px" @click="resetResult">✏️ 編輯</button>
            </div>

            <div v-if="confirmError" class="field-error">{{ confirmError }}</div>
          </div>
        </div>
      </template>

      <template v-else-if="parseLoading">
        <div class="loading-state">
          <div class="loading-orbit"></div>
          <div class="detail-name" style="font-size: 18px">AI 正在整理你的 CRM 紀錄</div>
          <div class="detail-subtext" style="margin-top: 8px">{{ loadingMessages[loadingIndex] }}</div>
          <div class="info-banner" style="margin-top: 18px">通常需要 5-10 秒，請稍候。</div>
        </div>
      </template>

      <template v-else>
        <div v-if="contextLabel" class="info-banner">
          目前會把這次輸入套用到：{{ contextLabel }}
        </div>
        <div class="detail-soft-card" style="margin-top: 12px; padding: 14px">
          <div class="section-label" style="padding: 0 0 8px">💬 口語紀錄</div>
          <textarea
            v-model="rawText"
            class="memo-textarea"
            style="min-height: 138px"
            :placeholder="contextLabel ? '例如：剛見完對方，談到需求確認與報價時間…' : '輸入今天的客戶互動、案件進度或下一步…'"
          ></textarea>
        </div>
        <div style="margin-top: 14px">
          <button class="primary-button" @click="handleParse" :disabled="!rawText.trim()">分析並產生確認卡片</button>
        </div>
        <div v-if="parseError" class="field-error" style="margin-top: 10px">{{ parseError }}</div>
      </template>
    </div>
  `,
});
