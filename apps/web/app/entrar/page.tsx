"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function EntrarPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/painel");
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/painel");
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      setError(
        code === "auth/too-many-requests"
          ? "Muitas tentativas. Tente novamente em alguns minutos."
          : "E-mail ou senha inválidos.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-lg font-bold">
          ELP
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Entrar</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy}
          >
            {busy ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <span className="opacity-60">cadastro em breve (PR 1.2)</span>
        </p>
      </div>
    </div>
  );
}
