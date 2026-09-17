"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">
        {user?.email}
        {role ? ` · ${role}` : ""}
      </span>
      <Link href="/conta" className="text-muted-foreground underline">
        Minha conta
      </Link>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await signOut();
          router.replace("/entrar");
        }}
      >
        Sair
      </Button>
    </div>
  );
}
