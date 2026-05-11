"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const f = (fd: FormData, k: string) => (fd.get(k) as string) ?? "";
const fNum = (fd: FormData, k: string) => parseFloat((fd.get(k) as string) ?? "0") || 0;

export async function createReparto(formData: FormData) {
  await prisma.reparto.create({
    data: {
      codice: f(formData, "codice"),
      nome: f(formData, "nome"),
      tariffaVarMacchina: fNum(formData, "tariffaVarMacchina"),
      tariffaMdo: fNum(formData, "tariffaMdo"),
      oreCapacitaAnnua: fNum(formData, "oreCapacitaAnnua"),
      kWInstallata: fNum(formData, "kWInstallata"),
      prezzoEnergia: fNum(formData, "prezzoEnergia"),
    },
  });
  revalidatePath("/reparti");
  redirect("/reparti");
}

export async function updateReparto(id: string, formData: FormData) {
  await prisma.reparto.update({
    where: { id },
    data: {
      codice: f(formData, "codice"),
      nome: f(formData, "nome"),
      tariffaVarMacchina: fNum(formData, "tariffaVarMacchina"),
      tariffaMdo: fNum(formData, "tariffaMdo"),
      oreCapacitaAnnua: fNum(formData, "oreCapacitaAnnua"),
      kWInstallata: fNum(formData, "kWInstallata"),
      prezzoEnergia: fNum(formData, "prezzoEnergia"),
    },
  });
  revalidatePath("/reparti");
  redirect("/reparti");
}

export async function deleteReparto(id: string) {
  await prisma.reparto.delete({ where: { id } });
  revalidatePath("/reparti");
  redirect("/reparti");
}

export async function addVoceCostoFisso(repartoId: string, formData: FormData) {
  const nome = f(formData, "nome");
  const importo = fNum(formData, "importo");
  if (!nome || importo <= 0) return;
  await prisma.voceCostoFisso.create({
    data: { repartoId, nome, importo },
  });
  revalidatePath("/reparti");
}

export async function deleteVoceCostoFisso(id: string) {
  await prisma.voceCostoFisso.delete({ where: { id } });
  revalidatePath("/reparti");
}
