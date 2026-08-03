"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icon } from "@/components/ui/icon";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

export type NavGroup = {
  key: string;
  label: string;
  icon: string;
  items: NavItem[];
};

const chromeButton =
  "bg-transparent shadow-none p-2 rounded-lg text-on-surface-variant hover:bg-surface-variant";

export function ShellChrome({
  user,
  isAdmin,
  groups,
  children,
}: {
  user: { name: string; role: string };
  isAdmin: boolean;
  groups: NavGroup[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState("");
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const closeMenuRef = useRef<HTMLButtonElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(groups[0] ? [groups[0].key] : []),
  );

  // A rota ativa permanece destacada e seu grupo fica visível.
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const activeGroup = groups.find((group) => group.items.some((item) => isActive(item.href)));
  const allItems = groups.flatMap((group) => group.items);
  const current = isActive("/")
    ? "Dashboard"
    : allItems.find((item) => isActive(item.href))?.label ?? "Página";
  const filtered = query
    ? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : null;

  useEffect(() => {
    setQuery("");
    if (!activeGroup) return;
    setExpandedGroups((currentGroups) => {
      if (currentGroups.has(activeGroup.key)) return currentGroups;
      const nextGroups = new Set(currentGroups);
      nextGroups.add(activeGroup.key);
      return nextGroups;
    });
  }, [activeGroup, pathname]);

  useEffect(() => {
    if (!drawer) return;
    closeMenuRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDrawer(false);
      window.requestAnimationFrame(() => menuTriggerRef.current?.focus());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawer]);

  useEffect(() => {
    const desktopViewport = window.matchMedia("(min-width: 1024px)");
    const closeDrawerOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawer(false);
    };

    desktopViewport.addEventListener("change", closeDrawerOnDesktop);
    return () => desktopViewport.removeEventListener("change", closeDrawerOnDesktop);
  }, []);

  function closeDrawerAndRestoreFocus() {
    setDrawer(false);
    window.requestAnimationFrame(() => menuTriggerRef.current?.focus());
  }

  function toggleGroup(key: string) {
    setExpandedGroups((currentGroups) => {
      const nextGroups = new Set(currentGroups);
      if (nextGroups.has(key)) nextGroups.delete(key);
      else nextGroups.add(key);
      return nextGroups;
    });
  }

  const itemClass = (active: boolean, indented: boolean) =>
    active
      ? `flex items-center justify-between ${indented ? "pl-10 pr-md" : "px-md"} py-2.5 bg-surface-container-highest text-primary font-semibold border-l-4 border-primary rounded-r-lg`
      : `flex items-center justify-between ${indented ? "pl-10 pr-md" : "px-md"} py-2.5 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors`;

  const renderItem = (item: NavItem, indented: boolean) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setDrawer(false)}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={itemClass(isActive(item.href), indented)}
    >
      <div className="flex items-center space-x-3">
        <Icon name={item.icon} size={18} filled={isActive(item.href)} />
        <span className="text-body-md">{item.label}</span>
      </div>
      {item.badge ? (
        <span className="bg-primary-container text-on-primary-container text-[10px] px-1.5 py-0.5 rounded-full font-bold">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );

  return (
    <div className="flex overflow-hidden h-screen bg-background text-on-surface">
      {drawer && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeDrawerAndRestoreFocus}
          aria-hidden="true"
        />
      )}

      {/* Sidebar de navegação */}
      <aside
        id="primary-sidebar"
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-50 w-[264px] transform transition-transform duration-300 lg:static lg:visible lg:pointer-events-auto lg:translate-x-0 ${drawer ? "visible pointer-events-auto translate-x-0" : "invisible pointer-events-none -translate-x-full"} h-screen h-dvh bg-surface-container flex flex-col border-r border-outline-variant`}
      >
        <div className="p-md pb-sm pt-md text-center">
          <div className="mb-xs flex justify-end lg:hidden">
            <button
              ref={closeMenuRef}
              type="button"
              onClick={closeDrawerAndRestoreFocus}
              aria-label="Fechar menu"
              className={chromeButton}
            >
              <Icon name="close" />
            </button>
          </div>
          <Link href="/" onClick={() => setDrawer(false)} className="inline-block">
            <Image
              src="/branding/barracar-logo.png"
              alt="Logo da Barracar Estética Automotiva"
              width={1536}
              height={1024}
              priority
              unoptimized
              className="brand-logo brand-logo-sidebar h-auto w-full max-w-[216px] object-contain"
            />
          </Link>
          <p className="mt-sm text-body-sm text-on-surface-variant opacity-60">
            Console de Gestão
          </p>
        </div>
        <div className="px-md mb-md">
          <div className="relative flex items-center">
            <Icon name="search" size={16} className="absolute left-3 text-on-surface-variant" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar seção"
              placeholder="Buscar seção..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 pl-10 pr-3 text-body-md"
            />
          </div>
        </div>
        <nav className="flex-1 px-sm space-y-1 overflow-y-auto no-scrollbar pb-md">
          {filtered ? (
            filtered.map((item) => renderItem(item, false))
          ) : (
            <>
              <Link
                href="/"
                onClick={() => setDrawer(false)}
                aria-current={isActive("/") ? "page" : undefined}
                className={itemClass(isActive("/"), false)}
              >
                <div className="flex items-center space-x-3">
                  <Icon name="dashboard" size={18} filled={isActive("/")} />
                  <span className="text-body-md">Dashboard</span>
                </div>
              </Link>
              {groups.map((group) => {
                const open = expandedGroups.has(group.key);
                const badge = group.items.reduce((sum, item) => sum + (item.badge ?? 0), 0);
                return (
                  <div key={group.key} className="pt-2">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`sidebar-group-${group.key}`}
                      onClick={() => toggleGroup(group.key)}
                      className="w-full bg-transparent shadow-none flex items-center justify-between px-md py-2 rounded-lg text-on-surface-variant hover:bg-surface-variant"
                    >
                      <span className="flex items-center space-x-3">
                        <Icon name={group.icon} size={18} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.08em]">
                          {group.label}
                        </span>
                      </span>
                      <span className="flex items-center space-x-2">
                        {!open && badge ? (
                          <span className="bg-primary-container text-on-primary-container text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {badge}
                          </span>
                        ) : null}
                        <Icon
                          name="expand_more"
                          size={18}
                          className={`transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </span>
                    </button>
                    {open && (
                      <div id={`sidebar-group-${group.key}`} className="mt-1 space-y-1">
                        {group.items.map((item) => renderItem(item, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </nav>
        <div className="p-md mt-auto">
          <div className="bg-surface-container-high border border-outline-variant p-md rounded-xl flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[14px] font-semibold text-on-surface leading-tight truncate">
                {user.name}
              </h4>
              <p className="text-xs text-on-surface-variant">
                {isAdmin ? "Administrador" : "Funcionário"}
              </p>
            </div>
            <form action={logoutAction}>
              <button type="submit" title="Sair" aria-label="Sair" className={chromeButton}>
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main
        inert={drawer ? true : undefined}
        className="min-w-0 flex-1 flex flex-col h-screen h-dvh overflow-y-auto bg-background"
      >
        <header className="flex justify-between items-center w-full px-lg py-md bg-background sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Abrir menu"
              aria-expanded={drawer}
              aria-controls="primary-sidebar"
              className={`lg:hidden ${chromeButton}`}
            >
              <Icon name="menu" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center text-on-surface-variant text-xs space-x-1">
              <span>Início</span>
              <Icon name="chevron_right" size={14} />
              <span className="text-primary font-bold">{current}</span>
            </nav>
          </div>
          <div className="flex items-center space-x-sm">
            <ThemeToggle />
            {isAdmin && (
              <Link
                href="/ordens"
                className="px-md py-1.5 text-body-md bg-primary-container text-on-primary-container rounded-lg hover:opacity-90 transition-all active:scale-95 font-semibold"
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
