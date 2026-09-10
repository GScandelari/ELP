import type { Metadata } from "next";
import Content from "@/content/termos.mdx";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <article className="prose-legal mx-auto">
      <Content />
    </article>
  );
}
