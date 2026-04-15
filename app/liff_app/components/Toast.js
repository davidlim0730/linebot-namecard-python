// Toast.js — Toast notification component with auto-dismiss
import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "Toast",
  props: {
    message: {
      type: String,
      default: ""
    },
    type: {
      type: String,
      default: "info",  // 'info', 'success', 'error', 'warning'
      validator: (v) => ["info", "success", "error", "warning"].includes(v)
    },
    duration: {
      type: Number,
      default: 3000  // ms
    },
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      timeoutId: null
    };
  },
  watch: {
    visible(newVal) {
      if (newVal && this.duration > 0) {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
          this.$emit("close");
        }, this.duration);
      }
    }
  },
  template: `
    <div v-if="visible" :class="['toast', type]">
      {{ message }}
    </div>
  `
});
