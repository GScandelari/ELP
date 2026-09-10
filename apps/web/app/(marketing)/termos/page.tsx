import type { Metadata } from "next";
import { getLegalHtml } from "@/lib/legal";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  const html = getLegalHtml("termos");
  return (
    <article
      className="prose-legal mx-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
