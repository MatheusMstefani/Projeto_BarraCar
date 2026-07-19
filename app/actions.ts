"use server";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  try { await signIn("credentials", { login: formData.get("login"), password: formData.get("password"), redirectTo: "/" }); }
  catch (error) { if (error instanceof AuthError) redirect("/login?erro=credenciais"); throw error; }
}
export async function logoutAction() { await signOut({ redirectTo: "/login" }); }
