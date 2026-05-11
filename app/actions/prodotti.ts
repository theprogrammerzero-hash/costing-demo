"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const f = (fd: FormData, k: string) => (fd.get(k) as string) ?? "";
const fNum = (fd: FormData, k: string) => parseFloat((fd.get(k) as string) ?? "0") || 0;
const fNumOpt = (fd: FormData, k: string): number | null => {
  const v = parseFloat((fd.get(k) as string) ?? "");
  return isNaN(v) ? null : v;
};
const fDateOpt = (fd: FormData, k: string): Date | null => {
  const v = (fd.get(k) as string) ?? "";
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export async function createProdotto(formData: FormData) {
  await prisma.prodotto.create({
    data: {
      codice:        f(formData, "codice"),
      nome:          f(formData, "nome"),
      cliente:       f(formData, "cliente") || null,
      quantita:      fNum(formData, "quantita"),
      dataInizio:    fDateOpt(formData, "dataInizio"),
      dataFine:      fDateOpt(formData, "dataFine"),
      prezzoVendita: fNumOpt(formData, "prezzoVendita"),
      materiePrime:  fNum(formData, "materiePrime"),
    },
  });
  revalidatePath("/prodotti");
  redirect("/prodotti");
}

export async function updateProdotto(id: string, formData: FormData) {
  await prisma.prodotto.update({
    where: { id },
    data: {
      codice:        f(formData, "codice"),
      nome:          f(formData, "nome"),
      cliente:       f(formData, "cliente") || null,
      quantita:      fNum(formData, "quantita"),
      dataInizio:    fDateOpt(formData, "dataInizio"),
      dataFine:      fDateOpt(formData, "dataFine"),
      prezzoVendita: fNumOpt(formData, "prezzoVendita"),
      materiePrime:  fNum(formData, "materiePrime"),
    },
  });
  revalidatePath("/prodotti");
  redirect("/prodotti");
}

export async function deleteProdotto(id: string) {
  await prisma.prodotto.delete({ where: { id } });
  revalidatePath("/prodotti");
  redirect("/prodotti");
}
