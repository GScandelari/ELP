import type { Metadata } from "next";
import Content from "@/content/privacidade.mdx";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <article className="prose-legal mx-auto">
      <Content />
    </article>
  );
}
