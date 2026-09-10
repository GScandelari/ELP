import type { Metadata } from "next";
import Content from "@/content/cookies.mdx";

export const metadata: Metadata = { title: "Política de Cookies" };

export default function CookiesPage() {
  return (
    <article className="prose-legal mx-auto">
      <Content />
    </article>
  );
}
