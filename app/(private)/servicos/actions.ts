"use server";
import { ServiceCategory } from "@prisma/client";import { auth } from "@/auth";import { db } from "@/lib/db";import { revalidatePath } from "next/cache";import { z } from "zod";
const schema=z.object({name:z.string().trim().min(2),category:z.nativeEnum(ServiceCategory),defaultPrice:z.coerce.number().nonnegative(),durationMinutes:z.coerce.number().int().positive(),maintenanceIntervalDays:z.union([z.literal(""),z.coerce.number().int().positive()]).optional(),createsReminder:z.enum(["true","false"]).default("false"),active:z.enum(["true","false"]).default("true")});
async function admin(){if((await auth())?.user.role!=="ADMIN")throw new Error("Apenas administradores podem alterar serviços.")}
const values=(value:z.infer<typeof schema>)=>({...value,maintenanceIntervalDays:value.maintenanceIntervalDays===""?null:value.maintenanceIntervalDays,createsReminder:value.createsReminder==="true",active:value.active==="true"});
export async function createService(data:FormData){await admin();await db.service.create({data:values(schema.parse(Object.fromEntries(data)))});revalidatePath("/servicos");revalidatePath("/ordens")}
export async function updateService(data:FormData){await admin();const id=z.string().parse(data.get("id"));await db.service.update({where:{id},data:values(schema.parse(Object.fromEntries(data)))});revalidatePath("/servicos");revalidatePath("/ordens")}
