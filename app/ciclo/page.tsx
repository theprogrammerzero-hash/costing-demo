import { redirect } from "next/navigation";

// La pagina Ciclo è stata sostituita da Fasi di lavorazione
export default function CicloPage() {
  redirect("/fasi");
}
