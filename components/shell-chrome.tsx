"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icon } from "@/components/ui/icon";

export type NavLink = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

const chromeButton =
  "bg-transparent shadow-none p-2 rounded-lg text-on-surface-variant hover:bg-surface-variant";

export function ShellChrome({
  user,
  isAdmin,
  links,
  children,
}: {
  user: { name: string; role: string };
  isAdmin: boolean;
  links: NavLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const current = links.find((link) => isActive(link.href));
  const visible = query
    ? links.filter((link) => link.label.toLowerCase().includes(query.toLowerCase()))
    : links;

  return (
    <div className="flex overflow-hidden h-screen bg-background text-on-surface">
      {/* Trilho estreito de ícones */}
      <aside className="hidden lg:flex w-[64px] h-screen bg-surface-container border-r border-outline-variant flex-col items-center py-md space-y-xl z-50">
        <Link href="/" className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center" aria-label="Dashboard">
          <Icon name="local_car_wash" filled className="text-on-primary-container" />
        </Link>
        <div className="flex flex-col space-y-md text-on-surface-variant">
          {links.slice(1, 5).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={`p-base rounded-md cursor-pointer transition-colors hover:bg-surface-variant ${isActive(link.href) ? "text-primary" : ""}`}
            >
              <Icon name={link.icon} filled={isActive(link.href)} />
            </Link>
          ))}
        </div>
        <div className="mt-auto flex flex-col items-center space-y-md text-on-surface-variant">
          {isAdmin && (
            <Link href="/configuracoes" title="Configurações" className="p-base rounded-md hover:bg-surface-variant transition-colors">
              <Icon name="settings" />
            </Link>
          )}
          <form action={logoutAction}>
            <button type="submit" title="Sair" aria-label="Sair" className={chromeButton}>
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </aside>

      {/* Backdrop do drawer mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar secundária */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"} h-screen bg-surface-container flex flex-col border-r border-outline-variant`}
      >
        <div className="p-md py-lg">
          <h1 className="text-display-lg font-black text-on-surface mb-xs">Barracar</h1>
          <p className="text-body-sm text-on-surface-variant opacity-60">Console de Gestão</p>
        </div>
        <div className="px-md mb-md">
          <div className="relative flex items-center">
            <Icon name="search" className="absolute left-3 text-on-surface-variant text-[16px]" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar seção..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 pl-10 pr-3 text-body-md"
            />
          </div>
        </div>
        <nav className="flex-1 px-sm space-y-1 overflow-y-auto no-scrollbar">
          {visible.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={
                  active
                    ? "flex items-center justify-between px-md py-3 bg-surface-container-highest text-primary font-semibold border-l-4 border-primary rounded-r-lg transition-transform scale-[0.99]"
                    : "flex items-center justify-between px-md py-3 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors"
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon name={link.icon} filled={active} />
                  <span className="text-body-md">{link.label}</span>
                </div>
                {link.badge ? (
                  <span className="bg-primary-container text-on-primary-container text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {link.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-md mt-auto">
          <div className="bg-surface-container-high border border-outline-variant p-md rounded-xl flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[14px] font-semibold text-on-surface leading-tight truncate">{user.name}</h4>
              <p className="text-xs text-on-surface-variant">{isAdmin ? "Administrador" : "Funcionário"}</p>
            </div>
            <form action={logoutAction} className="lg:hidden">
              <button type="submit" title="Sair" aria-label="Sair" className={chromeButton}>
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-background">
        <header className="flex justify-between items-center w-full px-lg py-md bg-background sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu" className={`lg:hidden ${chromeButton}`}>
              <Icon name="menu" />
            </button>
            <nav className="flex items-center text-on-surface-variant text-xs space-x-1">
              <span>Início</span>
              <Icon name="chevron_right" className="text-[14px]" />
              <span className="text-primary font-bold">{current?.label ?? "Página"}</span>
            </nav>
          </div>
          <div className="flex items-center space-x-sm">
            <ThemeToggle />
            {isAdmin && (
              <Link
                href="/ordens"
                className="px-md py-1.5 text-body-md bg-primary-container text-on-primary-container rounded-lg hover:opacity-90 transition-all active:scale-95 shadow-lg font-semibold"
              >
                Nova OS
              </Link>
            )}
          </div>
        </header>
        <section className="px-lg pb-lg">{children}</section>
      </main>
    </div>
  );
}
