"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [manualGroup, setManualGroup] = useState<string | null>(null);

  // Ao trocar de página, volta a abrir o grupo do item ativo.
  useEffect(() => {
    setManualGroup(null);
    setQuery("");
  }, [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const activeGroup = groups.find((group) => group.items.some((item) => isActive(item.href)));
  const openKey = manualGroup ?? activeGroup?.key ?? groups[0]?.key;
  const allItems = groups.flatMap((group) => group.items);
  const current = isActive("/")
    ? "Dashboard"
    : allItems.find((item) => isActive(item.href))?.label ?? "Página";
  const filtered = query
    ? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : null;

  const itemClass = (active: boolean, indented: boolean) =>
    active
      ? `flex items-center justify-between ${indented ? "pl-10 pr-md" : "px-md"} py-2.5 bg-surface-container-highest text-primary font-semibold border-l-4 border-primary rounded-r-lg`
      : `flex items-center justify-between ${indented ? "pl-10 pr-md" : "px-md"} py-2.5 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors`;

  const renderItem = (item: NavItem, indented: boolean) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setDrawer(false)}
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
      {/* Trilho: logo + um ícone por grupo */}
      <aside className="hidden lg:flex w-[64px] h-screen bg-surface-container border-r border-outline-variant flex-col items-center py-md space-y-lg z-50">
        <Link
          href="/"
          className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center"
          aria-label="Dashboard"
        >
          <Icon name="local_car_wash" filled className="text-on-primary-container" />
        </Link>
        <div className="flex flex-col space-y-sm text-on-surface-variant">
          {groups.map((group) => (
            <button
              key={group.key}
              type="button"
              title={group.label}
              onClick={() => setManualGroup(group.key)}
              className={`${chromeButton} ${activeGroup?.key === group.key ? "text-primary" : ""}`}
            >
              <Icon name={group.icon} filled={activeGroup?.key === group.key} />
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col items-center space-y-sm text-on-surface-variant">
          {isAdmin && (
            <Link
              href="/configuracoes"
              title="Configurações"
              className={`${chromeButton} inline-flex`}
            >
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

      {drawer && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setDrawer(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar de navegação */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[264px] transform transition-transform duration-300 lg:static lg:translate-x-0 ${drawer ? "translate-x-0" : "-translate-x-full"} h-screen bg-surface-container flex flex-col border-r border-outline-variant`}
      >
        <div className="p-md py-lg">
          <h1 className="text-display-lg font-black text-on-surface mb-xs">Barracar</h1>
          <p className="text-body-sm text-on-surface-variant opacity-60">Console de Gestão</p>
        </div>
        <div className="px-md mb-md">
          <div className="relative flex items-center">
            <Icon name="search" size={16} className="absolute left-3 text-on-surface-variant" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
                className={itemClass(isActive("/"), false)}
              >
                <div className="flex items-center space-x-3">
                  <Icon name="dashboard" size={18} filled={isActive("/")} />
                  <span className="text-body-md">Dashboard</span>
                </div>
              </Link>
              {groups.map((group) => {
                const open = openKey === group.key;
                const badge = group.items.reduce((sum, item) => sum + (item.badge ?? 0), 0);
                return (
                  <div key={group.key} className="pt-2">
                    <button
                      type="button"
                      onClick={() => setManualGroup(open ? "" : group.key)}
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
                      <div className="mt-1 space-y-1">
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
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Abrir menu"
              className={`lg:hidden ${chromeButton}`}
            >
              <Icon name="menu" />
            </button>
            <nav className="flex items-center text-on-surface-variant text-xs space-x-1">
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
