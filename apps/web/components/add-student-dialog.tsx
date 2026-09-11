"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { addStudentErrorMessage, addStudentToClass } from "@/lib/classes";

const GUARDIAN_STATEMENT =
  "Declaro que obtive o consentimento do responsável legal deste aluno " +
  "para o tratamento dos seus dados na ELP, conforme o modelo de termo " +
  "fornecido, e que guardo esse documento.";

export function AddStudentDialog({
  classId,
  open,
  onClose,
}: {
  classId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianAccepted, setGuardianAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupLink, setSetupLink] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setEmail("");
    setName("");
    setIsMinor(false);
    setGuardianName("");
    setGuardianAccepted(false);
    setError(null);
    setSetupLink(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await addStudentToClass({
        classId,
        studentEmail: email,
        studentName: name,
        isMinor,
        guardianConsent: isMinor
          ? { guardianName, statementAccepted: true }
          : undefined,
      });
      if (res.passwordSetupLink) {
        setSetupLink(res.passwordSetupLink);
      } else {
        reset();
        onClose();
      }
    } catch (err) {
      setError(addStudentErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={handleClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-student-title"
        className="relative w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg"
      >
        <h2 id="add-student-title" className="text-lg font-bold">
          Adicionar aluno
        </h2>

        {setupLink ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Conta criada. Envie este link ao aluno (ou ao responsável) para
              ele definir a própria senha — a ELP ainda não envia esse e-mail
              automaticamente.
            </p>
            <p className="break-all rounded-md border border-border bg-muted p-2 font-mono text-xs">
              {setupLink}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(setupLink);
                  } catch {
                    // clipboard indisponível — sem tratamento especial
                  }
                }}
              >
                Copiar link
              </Button>
              <Button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
              >
                Concluir
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="student-email"
                className="block text-sm font-medium"
              >
                E-mail do aluno
              </label>
              <input
                id="student-email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="student-name"
                className="block text-sm font-medium"
              >
                Nome completo do aluno
              </label>
              <p className="text-xs text-muted-foreground">
                Usado só se o aluno ainda não tiver conta na ELP.
              </p>
              <input
                id="student-name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isMinor}
                onChange={(e) => setIsMinor(e.target.checked)}
              />
              Aluno menor de 18 anos
            </label>

            {isMinor && (
              <div className="space-y-3 rounded-md border border-border p-3">
                <div>
                  <label
                    htmlFor="guardian-name"
                    className="block text-sm font-medium"
                  >
                    Nome do responsável legal
                  </label>
                  <input
                    id="guardian-name"
                    required={isMinor}
                    minLength={2}
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={guardianAccepted}
                    onChange={(e) => setGuardianAccepted(e.target.checked)}
                  />
                  <span>
                    {GUARDIAN_STATEMENT}{" "}
                    <a
                      href="/termo-responsavel"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Ver modelo do termo
                    </a>
                    .
                  </span>
                </label>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={busy || (isMinor && !guardianAccepted)}
              >
                {busy ? "Adicionando…" : "Adicionar"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
