import type { Metadata } from "next";
import { getLegalHtml } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termo de Consentimento do Responsável Legal",
};

export default function TermoResponsavelPage() {
  const html = getLegalHtml("termo-responsavel");
  return (
    <article
      className="prose-legal mx-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
