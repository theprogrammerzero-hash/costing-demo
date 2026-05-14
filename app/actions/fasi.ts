"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const f    = (fd: FormData, k: string) => (fd.get(k) as string) ?? "";
const fNum = (fd: FormData, k: string) => parseFloat((fd.get(k) as string) ?? "0") || 0;

export async function createFase(prodottoId: string, formData: FormData) {
  const sequenza = Math.floor(fNum(formData, "sequenza"));
  const nome     = f(formData, "nome");
  const repartoId = f(formData, "repartoId");
  const macchinaId = f(formData, "macchinaId") || null;
  const tempoOre = fNum(formData, "tempoOre");
  if (!nome || !repartoId || sequenza < 1 || tempoOre <= 0) return;
  await prisma.faseLavorazione.create({
    data: { prodottoId, sequenza, nome, repartoId, macchinaId, tempoOre },
  });
  revalidatePath("/fasi");
}

export async function updateFase(id: string, formData: FormData) {
  const nome       = f(formData, "nome");
  const repartoId  = f(formData, "repartoId");
  const macchinaId = f(formData, "macchinaId") || null;
  const tempoOre   = fNum(formData, "tempoOre");
  const sequenza   = Math.floor(fNum(formData, "sequenza"));
  await prisma.faseLavorazione.update({
    where: { id },
    data: { nome, repartoId, macchinaId, tempoOre, sequenza },
  });
  revalidatePath("/fasi");
}

export async function deleteFase(id: string) {
  await prisma.faseLavorazione.delete({ where: { id } });
  revalidatePath("/fasi");
}
