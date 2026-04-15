/**
 * Toast.js — Toast notification component with auto-dismiss
 *
 * Props:
 *   - message: string, notification content
 *   - type: 'info' | 'success' | 'error' | 'warning'
 *   - duration: number (ms), auto-dismiss timeout (default 3000, max 30000)
 *   - visible: boolean, show/hide state
 *
 * Events:
 *   - @close: emitted when toast is dismissed
 *
 * Testing:
 *   Use jest.useFakeTimers() to mock setTimeout/clearTimeout.
 *   Example:
 *     jest.useFakeTimers();
 *     const wrapper = mount(Toast, { props: { visible: true, duration: 3000 } });
 *     jest.advanceTimersByTime(3000);
 *     expect(wrapper.emitted('close')).toBeTruthy();
 *     jest.useRealTimers();
 */
import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

// Maximum duration to prevent infinite waits
const MAX_DURATION = 30000; // 30 seconds

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
    /**
     * Watch visible state to manage timeout lifecycle.
     * When visible becomes true: start auto-dismiss timer.
     * When visible becomes false: clear existing timer to prevent memory leak.
     */
    visible(newVal) {
      if (newVal) {
        // visible is true: start timer if duration is valid
        if (this.timeoutId) clearTimeout(this.timeoutId);

        // Validate duration: must be finite and positive
        const validDuration = isFinite(this.duration) && this.duration > 0
          ? Math.min(this.duration, MAX_DURATION)
          : 3000;

        this.timeoutId = setTimeout(() => {
          this.$emit("close");
        }, validDuration);
      } else {
        // visible is false: clean up timeout
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
      }
    }
  },
  beforeUnmount() {
    /**
     * Lifecycle hook: clean up timeout on component unmount
     * Prevents memory leak if component is destroyed while timeout is pending
     */
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  },
  template: `
    <div v-if="visible" :class="['toast', type]">
      {{ message }}
    </div>
  `
});
