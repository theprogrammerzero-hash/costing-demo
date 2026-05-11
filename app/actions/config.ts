"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateConfigurazione(formData: FormData) {
  const ammCommTipo   = ((formData.get("ammCommTipo")  as string) ?? "PERC").trim() || "PERC";
  const baseRiparto   = ((formData.get("baseRiparto")  as string) ?? "ORE_MACCHINA").trim() || "ORE_MACCHINA";

  // Entrambi i campi sono sempre inviati (nessuno è disabled)
  const percAmmComm   = Math.max(0, parseFloat((formData.get("percAmmComm")   as string) ?? "15") || 0);
  const ammCommValore = Math.max(0, parseFloat((formData.get("ammCommValore") as string) ?? "0")  || 0);

  await prisma.configurazione.upsert({
    where: { id: "main" },
    create: { id: "main", percAmmComm, ammCommTipo, ammCommValore, baseRiparto },
    update: { percAmmComm, ammCommTipo, ammCommValore, baseRiparto },
  });
  revalidatePath("/");
  revalidatePath("/risultati");
  revalidatePath("/configurazione");
  redirect("/configurazione");
}
