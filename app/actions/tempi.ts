"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const fNum = (fd: FormData, k: string) => parseFloat((fd.get(k) as string) ?? "0") || 0;

export async function upsertTempoLavorazione(
  prodottoId: string,
  repartoId: string,
  formData: FormData,
) {
  await prisma.lavorazioneReparto.upsert({
    where: { prodottoId_repartoId: { prodottoId, repartoId } },
    create: {
      prodottoId,
      repartoId,
      oreMacchina: fNum(formData, "oreMacchina"),
      oreMdo: fNum(formData, "oreMdo"),
    },
    update: {
      oreMacchina: fNum(formData, "oreMacchina"),
      oreMdo: fNum(formData, "oreMdo"),
    },
  });
  revalidatePath("/tempi");
  revalidatePath("/risultati");
  revalidatePath("/");
}
