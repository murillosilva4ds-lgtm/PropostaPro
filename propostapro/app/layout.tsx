import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropostaPro — Crie propostas comerciais profissionais em minutos",
  description:
    "Plataforma para videomakers, designers, fotógrafos, desenvolvedores e agências criarem propostas comerciais personalizadas e exportarem em PDF."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
