import { redirect } from "next/navigation";

// La pagina Tempi è stata sostituita da Fasi di lavorazione
export default function TempiPage() {
  redirect("/fasi");
}
