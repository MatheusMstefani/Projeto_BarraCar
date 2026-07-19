import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions";
const links = [["/","Dashboard"],["/ordens","Ordens de Serviço"],["/agenda","Agenda"],["/clientes","Clientes"],["/veiculos","Veículos"],["/servicos","Serviços"],["/funcionarios","Funcionários"],["/financeiro","Financeiro"],["/configuracoes","Configurações"]];
export async function AppShell({ children }: { children: React.ReactNode }) { const session = await auth(); return <div className="shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">B</span>Barracar</div><nav className="nav">{links.map(([href,label])=><Link href={href} key={href}>{label}</Link>)}</nav><form action={logoutAction}><button type="submit">Sair</button></form></aside><main className="content"><header className="top"><div><strong>Gestão operacional</strong><div className="muted">{session?.user.name} · {session?.user.role}</div></div></header>{children}</main></div> }
