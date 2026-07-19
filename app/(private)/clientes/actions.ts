"use server";
import { auth } from "@/auth"; import { db } from "@/lib/db"; import { revalidatePath } from "next/cache"; import { z } from "zod";
const schema=z.object({name:z.string().min(2),phone:z.string().min(8),whatsapp:z.string().min(8),city:z.string().min(2)});
export async function createCustomer(data:FormData){const session=await auth();if(session?.user.role!=="ADMIN")throw new Error("Sem permissão");const value=schema.parse(Object.fromEntries(data));await db.customer.create({data:value});revalidatePath("/clientes")}
