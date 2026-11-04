import { useEffect, type RefObject } from "react";
import { modKey } from "./platform";

/** Label for the focus shortcut, e.g. "⌘J" on macOS and "Ctrl+J" elsewhere. */
export const focusShortcutLabel = modKey === "⌘" ? "⌘J" : `${modKey}+J`;

/**
 * Focuses and selects the input on Cmd+J or Ctrl+J, unless it sits inside a
 * hidden panel (the Shell keeps inactive tabs mounted with `.hidden`).
 */
export function useFocusShortcut(ref: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "j") return;
      const el = ref.current;
      if (!el || el.closest(".hidden")) return;
      e.preventDefault();
      el.focus();
      el.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref]);
}
