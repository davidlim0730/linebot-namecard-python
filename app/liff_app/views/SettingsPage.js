import { defineComponent, ref, onMounted, inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { clearToken } from "../api.js?v=3";

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
      clearToken();
      liff.logout();
      window.location.reload();
    }

    onMounted(fetchUserInfo);

    return { userInfo, loading, logout };
  },

  template: `
    <div class="page-container">
      <div v-if="loading" class="loading-state">
        <p>載入中...</p>
      </div>

      <template v-else>
        <div class="card" v-if="userInfo" style="text-align:center;">
          <img v-if="userInfo.pictureUrl" :src="userInfo.pictureUrl" class="user-avatar-img" style="margin:0 auto 12px;" />
          <div v-else class="user-avatar-placeholder" style="margin:0 auto 12px;">{{ (userInfo.displayName || "U").charAt(0) }}</div>
          <div class="user-name" style="font-size:20px;">{{ userInfo.displayName }}</div>
          <div class="user-id" style="margin-top:6px;">LINE ID: {{ userInfo.userId?.slice(0, 10) }}...</div>
        </div>

        <div class="card" style="margin-top:12px;">
          <h3 class="crm-section-title">關於</h3>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(60,74,60,0.08);">
            <span style="font-size:13px;color:var(--color-text-secondary);">版本</span>
            <span style="font-size:13px;font-weight:700;color:var(--color-text-primary);">v1.0.0</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0 0;">
            <span style="font-size:13px;color:var(--color-text-secondary);">環境</span>
            <span style="font-size:13px;font-weight:700;color:var(--color-text-primary);">LIFF</span>
          </div>
        </div>

        <div class="card" style="margin-top:12px;">
          <button class="invite-button" style="background:var(--color-danger);" @click="logout">登出</button>
        </div>
      </template>
    </div>
  `,
});
