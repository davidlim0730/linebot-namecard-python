import { defineComponent, h } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "AppHeader",
  props: {
    title: { type: String, default: "" },
    showBack: { type: Boolean, default: false },
    actionLabel: { type: String, default: "" },
    onAction: { type: Function, default: null },
    secondaryActionLabel: { type: String, default: "" },
    onSecondaryAction: { type: Function, default: null },
  },
  setup(props) {
    return () => h("div", { class: "app-header" }, [
      props.showBack
        ? h("button", {
            class: "back-button",
            onClick: () => history.back(),
          }, "←")
        : null,
      h("div", { class: "app-header-title" }, props.title),
      props.secondaryActionLabel && props.onSecondaryAction
        ? h("button", { class: "app-header-action", style: "background:var(--color-bg-3);color:var(--color-text-primary);margin-right:6px;", onClick: props.onSecondaryAction }, props.secondaryActionLabel)
        : null,
      props.actionLabel && props.onAction
        ? h("button", {
            class: "app-header-action",
            onClick: props.onAction,
          }, props.actionLabel)
        : null,
    ].filter(Boolean));
  },
});
