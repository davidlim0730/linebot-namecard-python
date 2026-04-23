import { defineComponent, ref, onMounted, inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { getOrg, listOrgMembers, generateInviteCode } from "../api.js?v=3";

export default defineComponent({
  name: "TeamPage",
  setup() {
    const showToast = inject("showToast");
    const orgName = ref("");
    const members = ref([]);
    const loading = ref(true);
    const inviteCode = ref("");

    async function fetchOrgInfo() {
      loading.value = true;
      try {
        const [org, membersData] = await Promise.all([getOrg(), listOrgMembers()]);
        orgName.value = org.name || "我的團隊";
        members.value = Array.isArray(membersData) ? membersData : (membersData.members || []);
      } catch (err) {
        showToast?.("無法載入團隊資訊：" + (err.message || ""), "error");
      } finally {
        loading.value = false;
      }
    }

    async function generateInvite() {
      try {
        const data = await generateInviteCode();
        inviteCode.value = data.code;
        showToast?.("已產生邀請碼", "success");
      } catch {
        showToast?.("無法產生邀請碼", "error");
      }
    }

    function copyInviteCode() {
      if (!inviteCode.value) return;
      navigator.clipboard?.writeText(inviteCode.value);
      showToast?.("邀請碼已複製", "success");
    }

    onMounted(fetchOrgInfo);
    return { orgName, members, loading, inviteCode, generateInvite, copyInviteCode };
  },

  template: `
    <div class="page-container team-page">
      <div v-if="loading" class="loading-state">
        <p>載入中...</p>
      </div>

      <template v-else>
        <div class="card" style="background:linear-gradient(135deg,var(--color-primary) 0%, var(--color-primary-dark) 100%);color:white;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;">團隊</div>
          <div style="font-family:var(--font-headline);font-size:24px;font-weight:800;margin-top:8px;">{{ orgName || "我的團隊" }}</div>
          <div style="font-size:12px;opacity:0.78;margin-top:6px;">{{ members.length }} 位成員共同使用同一個共享名片與 CRM。</div>
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button class="invite-button" style="flex:1;background:rgba(255,255,255,0.16);backdrop-filter:blur(8px);" @click="generateInvite">產生邀請碼</button>
            <button v-if="inviteCode" class="invite-button" style="flex:1;background:#fff;color:var(--color-primary-dark);" @click="copyInviteCode">複製邀請碼</button>
          </div>
          <div v-if="inviteCode" style="margin-top:12px;padding:12px;border-radius:12px;background:rgba(255,255,255,0.14);font-family:var(--font-headline);font-size:18px;font-weight:800;letter-spacing:0.08em;">
            {{ inviteCode }}
          </div>
        </div>

        <div class="card" style="margin-top:12px;">
          <div class="crm-section-title" style="margin-bottom:8px;">成員列表</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div v-for="m in members" :key="m.user_id" style="display:flex;align-items:center;gap:12px;background:var(--color-bg-2);padding:12px;border-radius:14px;">
              <div style="width:40px;height:40px;border-radius:10px;background:var(--color-primary-light);color:var(--color-primary-dark);display:flex;align-items:center;justify-content:center;font-family:var(--font-headline);font-weight:700;">
                {{ (m.display_name || m.user_id).charAt(0) }}
              </div>
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:700;color:var(--color-text-primary);">{{ m.display_name || m.user_id }}</div>
                <div style="font-size:11px;color:var(--color-text-secondary);margin-top:3px;">{{ m.role === "admin" ? "管理員" : "成員" }}</div>
              </div>
              <div style="font-size:10px;font-weight:700;padding:4px 8px;border-radius:999px;background:var(--color-bg-1);color:var(--color-text-secondary);">
                {{ m.role === "admin" ? "ADMIN" : "MEMBER" }}
              </div>
            </div>
            <div v-if="members.length === 0" class="empty-state">尚無成員資料</div>
          </div>
        </div>
      </template>
    </div>
  `,
});
