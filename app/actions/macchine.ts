"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const f    = (fd: FormData, k: string) => (fd.get(k) as string) ?? "";
const fNum = (fd: FormData, k: string) => parseFloat((fd.get(k) as string) ?? "0") || 0;

export async function createMacchina(formData: FormData) {
  await prisma.macchina.create({
    data: {
      repartoId:         f(formData, "repartoId"),
      codice:            f(formData, "codice"),
      nome:              f(formData, "nome"),
      tipoOperazione:    f(formData, "tipoOperazione").toUpperCase().replace(/\s+/g, "_"),
      capacitaMinGiorno: fNum(formData, "capacitaMinGiorno") || 480,
      tempoSetupMin:     fNum(formData, "tempoSetupMin"),
    },
  });
  revalidatePath("/macchine");
  redirect("/macchine");
}

export async function updateMacchina(id: string, formData: FormData) {
  await prisma.macchina.update({
    where: { id },
    data: {
      codice:            f(formData, "codice"),
      nome:              f(formData, "nome"),
      tipoOperazione:    f(formData, "tipoOperazione").toUpperCase().replace(/\s+/g, "_"),
      capacitaMinGiorno: fNum(formData, "capacitaMinGiorno") || 480,
      tempoSetupMin:     fNum(formData, "tempoSetupMin"),
    },
  });
  revalidatePath("/macchine");
  redirect("/macchine");
}

export async function deleteMacchina(id: string) {
  await prisma.macchina.delete({ where: { id } });
  revalidatePath("/macchine");
  redirect("/macchine");
}
