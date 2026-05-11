import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Costing Demo — Full Costing & BEP",
  description: "Demo professionale di analisi costi per aziende manifatturiere",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Header />
        <Sidebar />
        <main className="ml-sidebar pt-header min-h-screen">{children}</main>
      </body>
    </html>
  );
}
