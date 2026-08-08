import { AppShell } from "@/components/app-shell";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  if (!(await auth())?.user) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
