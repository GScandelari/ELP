import Link from "next/link";
import type { ReactNode } from "react";
import { CookieNotice } from "@/components/cookie-notice";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            ELP
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/privacidade" className="hover:underline">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:underline">
              Termos
            </Link>
            <Link href="/entrar" className="font-medium hover:underline">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="container flex-1 py-12">{children}</main>

      <footer className="border-t border-border">
        <div className="container flex flex-col gap-2 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} ELP</span>
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:underline">
              Política de Privacidade
            </Link>
            <Link href="/termos" className="hover:underline">
              Termos de Uso
            </Link>
            <Link href="/cookies" className="hover:underline">
              Cookies
            </Link>
          </div>
        </div>
      </footer>

      <CookieNotice />
    </div>
  );
}
