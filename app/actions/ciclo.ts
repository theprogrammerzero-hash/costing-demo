"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const f    = (fd: FormData, k: string) => (fd.get(k) as string) ?? "";
const fNum = (fd: FormData, k: string) => parseFloat((fd.get(k) as string) ?? "0") || 0;
const fOpt = (fd: FormData, k: string): string | null => { const v = f(fd, k); return v || null; };

export async function upsertOperazione(prodottoId: string, formData: FormData) {
  const sequenza       = Math.round(fNum(formData, "sequenza"));
  const nome           = f(formData, "nome");
  const tipoOperazione = f(formData, "tipoOperazione").toUpperCase().replace(/\s+/g, "_");
  const tempoStdMin    = fNum(formData, "tempoStdMin");
  const tempoSetupMin  = fNum(formData, "tempoSetupMin");
  const macchinaId     = fOpt(formData, "macchinaId");

  if (!nome || !tipoOperazione || sequenza < 1) return;

  await prisma.operazioneCiclo.upsert({
    where: { prodottoId_sequenza: { prodottoId, sequenza } },
    create: { prodottoId, sequenza, nome, tipoOperazione, tempoStdMin, tempoSetupMin, macchinaId },
    update: {                        nome, tipoOperazione, tempoStdMin, tempoSetupMin, macchinaId },
  });
  revalidatePath("/ciclo");
}

export async function deleteOperazione(id: string) {
  await prisma.operazioneCiclo.delete({ where: { id } });
  revalidatePath("/ciclo");
}
