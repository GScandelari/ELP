"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { registerTeacher, signupErrorMessage } from "@/lib/signup";
import { Button } from "@/components/ui/button";

export default function CadastroPage() {
  const { user, loading, refreshClaims } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/painel");
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!acceptedTerms || !acceptedPrivacy) {
      setError("É necessário aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setBusy(true);
    try {
      await registerTeacher({
        name,
        email,
        password,
        acceptedTerms,
        acceptedPrivacy,
      });
      await refreshClaims();
      router.replace("/painel");
    } catch (err) {
      setError(signupErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-lg font-bold">
          ELP
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Criar conta de professor</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field
            id="name"
            label="Nome completo"
            type="text"
            autoComplete="name"
            value={name}
            onChange={setName}
          />
          <Field
            id="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
          />
          <Field
            id="password"
            label="Senha (mínimo 6 caracteres)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
          />

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Li e concordo com os{" "}
              <Link href="/termos" target="_blank" className="underline">
                Termos de Uso
              </Link>
              .
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Li e concordo com a{" "}
              <Link href="/privacidade" target="_blank" className="underline">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Criando conta…" : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/entrar" className="underline">
            Entrar
          </Link>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          É aluno? O cadastro de aluno chega na próxima etapa (PR 1.3).
        </p>
      </div>
    </div>
  );
}

function Field(props: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={props.id} className="block text-sm font-medium">
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type}
        required
        autoComplete={props.autoComplete}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
      />
    </div>
  );
}
