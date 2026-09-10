import type { Metadata } from "next";
import { getLegalHtml } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  const html = getLegalHtml("privacidade");
  return (
    <article
      className="prose-legal mx-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
