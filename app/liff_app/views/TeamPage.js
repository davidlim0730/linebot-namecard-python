// TeamPage.js — 團隊資訊頁
import { defineComponent, ref, onMounted, inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "TeamPage",

  setup() {
    const showToast = inject("showToast");
    const orgName = ref("");
    const members = ref([]);
    const loading = ref(true);
    const inviteCode = ref("");
    const showInvite = ref(false);

    async function fetchOrgInfo() {
      loading.value = true;
      try {
        const token = sessionStorage.getItem("jwt");
        if (!token) throw new Error("未登入");

        const [orgRes, membersRes] = await Promise.all([
          fetch("/api/v1/org", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/v1/org/members", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (orgRes.ok) {
          const org = await orgRes.json();
          orgName.value = org.name || "我的團隊";
        }
        if (membersRes.ok) {
          const data = await membersRes.json();
          members.value = Array.isArray(data) ? data : (data.members || []);
        }
      } catch (err) {
        showToast?.("無法載入團隊資訊", "error");
      } finally {
        loading.value = false;
      }
    }

    async function generateInvite() {
      try {
        const token = sessionStorage.getItem("jwt");
        const res = await fetch("/api/v1/org/invite", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          inviteCode.value = data.code;
          showInvite.value = true;
        }
      } catch {
        showToast?.("無法產生邀請碼", "error");
      }
    }

    function copyInviteCode() {
      navigator.clipboard?.writeText(inviteCode.value);
      showToast?.("邀請碼已複製", "success");
    }

    onMounted(fetchOrgInfo);

    return { orgName, members, loading, inviteCode, showInvite, generateInvite, copyInviteCode };
  },

  template: `
    <div class="page-container team-page">
      <div class="page-header">
        <h2 class="page-title">團隊</h2>
      </div>

      <div v-if="loading" class="loading-state">
        <p>載入中...</p>
      </div>

      <template v-else>
        <!-- 團隊名稱 -->
        <div class="team-section">
          <div class="team-name-card">
            <div class="team-icon">👥</div>
            <div class="team-name">{{ orgName || "我的團隊" }}</div>
          </div>
        </div>

        <!-- 成員列表 -->
        <div class="team-section">
          <h3 class="section-title">成員（{{ members.length }}）</h3>
          <div class="members-list">
            <div v-for="m in members" :key="m.user_id" class="member-item">
              <div class="member-avatar">{{ (m.display_name || m.user_id).charAt(0) }}</div>
              <div class="member-info">
                <div class="member-name">{{ m.display_name || m.user_id }}</div>
                <div class="member-role">{{ m.role === "admin" ? "管理員" : "成員" }}</div>
              </div>
            </div>
            <div v-if="members.length === 0" class="empty-state">
              <p>尚無成員資料</p>
            </div>
          </div>
        </div>

        <!-- 邀請 -->
        <div class="team-section">
          <button class="invite-button" @click="generateInvite">產生邀請碼</button>
          <div v-if="showInvite" class="invite-code-box">
            <div class="invite-code">{{ inviteCode }}</div>
            <button class="copy-button" @click="copyInviteCode">複製</button>
          </div>
        </div>
      </template>
    </div>
  `,
});
