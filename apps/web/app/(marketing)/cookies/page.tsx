import type { Metadata } from "next";
import { getLegalHtml } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de Cookies" };

export default function CookiesPage() {
  const html = getLegalHtml("cookies");
  return (
    <article
      className="prose-legal mx-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
