// SettingsPage.js — 設定頁
import { defineComponent, ref, onMounted, inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "SettingsPage",

  setup() {
    const showToast = inject("showToast");
    const userInfo = ref(null);
    const loading = ref(true);

    async function fetchUserInfo() {
      loading.value = true;
      try {
        const profile = await liff.getProfile();
        userInfo.value = profile;
      } catch {
        showToast?.("無法載入用戶資料", "error");
      } finally {
        loading.value = false;
      }
    }

    function logout() {
      localStorage.removeItem("jwt");
      liff.logout();
      window.location.reload();
    }

    onMounted(fetchUserInfo);

    return { userInfo, loading, logout };
  },

  template: `
    <div class="page-container" style="background: var(--color-surface)">
      <div v-if="loading" class="loading-state">
        <p>載入中...</p>
      </div>

      <template v-else>
        <!-- 用戶資訊 -->
        <div class="card" v-if="userInfo">
          <img v-if="userInfo.pictureUrl" :src="userInfo.pictureUrl" class="user-avatar-img" />
          <div v-else class="user-avatar-placeholder">{{ (userInfo.displayName || "U").charAt(0) }}</div>
          <div class="user-info">
            <div class="user-name">{{ userInfo.displayName }}</div>
            <div class="user-id">LINE ID: {{ userInfo.userId?.slice(0, 10) }}...</div>
          </div>
        </div>

        <!-- 關於 -->
        <div class="card">
          <h3 class="section-title">關於</h3>
          <div class="settings-list">
            <div class="settings-item">
              <span class="settings-label">版本</span>
              <span class="settings-value">v1.0.0</span>
            </div>
          </div>
        </div>

        <!-- 登出 -->
        <div class="card">
          <button class="invite-button" @click="logout">登出</button>
        </div>
      </template>
    </div>
  `,
});
