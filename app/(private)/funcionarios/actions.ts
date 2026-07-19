"use server";
import { auth } from "@/auth";import { db } from "@/lib/db";import { revalidatePath } from "next/cache";import { z } from "zod";
const schema=z.object({name:z.string().trim().min(2),phone:z.string().trim().min(8),position:z.string().trim().min(2),hiredAt:z.coerce.date(),active:z.enum(["true","false"]).default("true")});
async function admin(){if((await auth())?.user.role!=="ADMIN")throw new Error("Apenas administradores podem alterar funcionários.")}
export async function createEmployee(data:FormData){await admin();const value=schema.parse(Object.fromEntries(data));await db.employee.create({data:{...value,active:value.active==="true"}});revalidatePath("/funcionarios");revalidatePath("/ordens")}
export async function updateEmployee(data:FormData){await admin();const id=z.string().parse(data.get("id"));const value=schema.parse(Object.fromEntries(data));await db.employee.update({where:{id},data:{...value,active:value.active==="true"}});revalidatePath("/funcionarios");revalidatePath("/ordens")}
