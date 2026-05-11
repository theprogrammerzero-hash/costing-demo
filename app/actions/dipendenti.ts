"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const f    = (fd: FormData, k: string) => (fd.get(k) as string) ?? "";
const fNum = (fd: FormData, k: string) => parseFloat((fd.get(k) as string) ?? "0") || 0;

export async function createDipendente(formData: FormData) {
  await prisma.dipendente.create({
    data: {
      nome:           f(formData, "nome"),
      matricola:      f(formData, "matricola"),
      efficienzaPerc: fNum(formData, "efficienzaPerc") || 100,
      costoOrario:    fNum(formData, "costoOrario"),
    },
  });
  revalidatePath("/dipendenti");
  redirect("/dipendenti");
}

export async function updateDipendente(id: string, formData: FormData) {
  await prisma.dipendente.update({
    where: { id },
    data: {
      nome:           f(formData, "nome"),
      matricola:      f(formData, "matricola"),
      efficienzaPerc: fNum(formData, "efficienzaPerc") || 100,
      costoOrario:    fNum(formData, "costoOrario"),
    },
  });
  revalidatePath("/dipendenti");
  redirect("/dipendenti");
}

export async function deleteDipendente(id: string) {
  await prisma.dipendente.delete({ where: { id } });
  revalidatePath("/dipendenti");
  redirect("/dipendenti");
}

export async function addSkill(dipendenteId: string, formData: FormData) {
  const tipoOperazione = f(formData, "tipoOperazione").toUpperCase().replace(/\s+/g, "_");
  if (!tipoOperazione) return;
  // ignora duplicati
  await prisma.skillDipendente.upsert({
    where: { dipendenteId_tipoOperazione: { dipendenteId, tipoOperazione } },
    create: { dipendenteId, tipoOperazione },
    update: {},
  });
  revalidatePath("/dipendenti");
}

export async function removeSkill(id: string) {
  await prisma.skillDipendente.delete({ where: { id } });
  revalidatePath("/dipendenti");
}
