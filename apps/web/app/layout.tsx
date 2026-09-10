import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ELP — English Learning Platform",
    template: "%s — ELP",
  },
  description:
    "Plataforma de auxílio para professores de inglês e alunos: salas virtuais, atividades interativas e correção automática.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
