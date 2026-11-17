import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CITi Guardian | Inteligência documental",
  description: "Análise inteligente de lacunas entre repositórios e documentação."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
