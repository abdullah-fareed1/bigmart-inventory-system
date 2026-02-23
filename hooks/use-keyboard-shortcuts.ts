// src/hooks/use-keyboard-shortcuts.ts
"use client";

import { useEffect } from "react";

interface ShortcutConfig {
  onNewSale?: () => void; // F1
  onFocusCart?: () => void; // F2
  onCheckout?: () => void; // F3
  onCartDiscount?: () => void; // F4
  onFocusSearch?: () => void; // /
  onEscape?: () => void; // ESC
}

export function useKeyboardShortcuts(config: ShortcutConfig) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if user is typing in input/textarea
      const target = e.target as HTMLElement;
      const isInputActive =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      switch (e.key) {
        case "F1":
          e.preventDefault();
          config.onNewSale?.();
          break;
        case "F2":
          e.preventDefault();
          config.onFocusCart?.();
          break;
        case "F3":
          e.preventDefault();
          config.onCheckout?.();
          break;
        case "F4":
          e.preventDefault();
          config.onCartDiscount?.();
          break;
        case "/":
          if (!isInputActive) {
            e.preventDefault();
            config.onFocusSearch?.();
          }
          break;
        case "Escape":
          config.onEscape?.();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config]);
}