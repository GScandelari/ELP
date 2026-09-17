"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  deleteUserData,
  deleteUserDataErrorMessage,
  exportUserData,
  exportUserDataErrorMessage,
} from "@/lib/privacy";
import { Button } from "@/components/ui/button";

/** Direitos do titular (RF-020/ADR-011 §4): exportar e excluir os próprios dados. */
export default function AccountPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Meus dados</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Exporte uma cópia dos seus dados ou exclua sua conta permanentemente.
      </p>

      <div className="mt-6 rounded-lg border border-border p-4">
        <h2 className="font-semibold">Exportar meus dados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Baixe uma cópia de tudo que guardamos sobre você, em formato JSON.
        </p>
        <ExportSection />
      </div>

      <div className="mt-6 rounded-lg border border-red-600/50 p-4">
        <h2 className="font-semibold text-red-600">Excluir minha conta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Remove permanentemente seus dados de identificação e desativa o
          acesso. Não pode ser desfeito.
        </p>
        <DeleteSection />
      </div>
    </div>
  );
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // precisa estar no DOM pro clique disparar o download de forma
  // confiável em todo navegador (Firefox em particular); revoga a URL
  // um instante depois, não no mesmo tick — revogar cedo demais corre
  // contra o navegador ainda iniciando o download.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ExportSection() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setBusy(true);
    try {
      const data = await exportUserData();
      downloadJson(data, `meus-dados-elp-${Date.now()}.json`);
    } catch (err) {
      setError(exportUserDataErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      {error && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <Button variant="outline" disabled={busy} onClick={handleExport}>
        {busy ? "Exportando…" : "Exportar meus dados"}
      </Button>
    </div>
  );
}

function DeleteSection() {
  const { user, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expected = user?.email ?? "";
  const canDelete = expected.length > 0 && confirmText === expected;

  async function handleDelete() {
    if (!canDelete) return;
    if (
      !confirm(
        "Excluir sua conta permanentemente? Essa ação não pode ser desfeita.",
      )
    ) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await deleteUserData();
      // sem router.replace aqui - assim que `signOut` zera o usuário,
      // o próprio RequireAuth (que já envolve toda rota autenticada)
      // redireciona pra /entrar; um replace explícito só correria
      // contra esse mesmo redirecionamento.
      await signOut();
    } catch (err) {
      setError(deleteUserDataErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <label htmlFor="delete-confirm" className="block text-sm font-medium">
        Digite seu e-mail ({expected}) para confirmar
      </label>
      <input
        id="delete-confirm"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="mt-1 h-10 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-3">
        <Button
          variant="outline"
          disabled={!canDelete || busy}
          onClick={handleDelete}
          className="border-red-600 text-red-600 hover:bg-red-600/10"
        >
          {busy ? "Excluindo…" : "Excluir minha conta"}
        </Button>
      </div>
    </div>
  );
}
