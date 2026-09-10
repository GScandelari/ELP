import Link from "next/link";
import type { ReactNode } from "react";
import { RequireAuth } from "@/components/require-auth";
import { UserMenu } from "@/components/user-menu";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-border">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/painel" className="text-lg font-bold">
              ELP
            </Link>
            <UserMenu />
          </div>
        </header>
        <main className="container flex-1 py-12">{children}</main>
      </div>
    </RequireAuth>
  );
}
