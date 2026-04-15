// BottomNav.js — Navigation component with 3 tabs (Cards, Team, Settings)
import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "BottomNav",
  props: {
    currentTab: {
      type: String,
      default: "cards"  // 'cards', 'team', 'settings'
    }
  },
  setup(props) {
    const tabs = [
      { id: "cards", label: "名片", icon: "🗂️", path: "#/" },
      { id: "team", label: "團隊", icon: "👥", path: "#/team" },
      { id: "settings", label: "設定", icon: "⚙️", path: "#/settings" }
    ];

    return {
      tabs
    };
  },
  template: `
    <nav class="bottom-nav">
      <a
        v-for="tab in tabs"
        :key="tab.id"
        :href="tab.path"
        class="bottom-nav-item"
        :class="{ active: currentTab === tab.id }"
      >
        <div class="bottom-nav-item-icon">{{ tab.icon }}</div>
        <div class="bottom-nav-item-label">{{ tab.label }}</div>
      </a>
    </nav>
  `
});
