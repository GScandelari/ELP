"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { joinClassByCode, joinClassErrorMessage } from "@/lib/classes";

export function JoinClassForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const { className } = await joinClassByCode(code);
      setSuccess(`Você entrou em "${className}".`);
      setCode("");
      setTimeout(() => router.push("/salas"), 1200);
    } catch (err) {
      setError(joinClassErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-sm space-y-4">
      <div>
        <label htmlFor="enrollment-code" className="block text-sm font-medium">
          Código da sala
        </label>
        <input
          id="enrollment-code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ABC-234"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm uppercase tracking-wider"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-green-700">
          {success}
        </p>
      )}

      <Button type="submit" disabled={busy || !code} className="w-full">
        {busy ? "Entrando…" : "Entrar na sala"}
      </Button>
    </form>
  );
}
