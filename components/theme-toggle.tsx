"use client";

import { Icon } from "@/components/ui/icon";

export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
      className="bg-transparent shadow-none p-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-variant inline-flex items-center"
    >
      {/* Wrappers controlam a visibilidade: o CSS externo da fonte de ícones sobrescreveria display no próprio ícone. */}
      <span className="inline-flex dark:hidden">
        <Icon name="dark_mode" />
      </span>
      <span className="hidden dark:inline-flex">
        <Icon name="light_mode" />
      </span>
    </button>
  );
}
