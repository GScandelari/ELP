"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { DialogFormFooter } from "@/components/ui/dialog-form-footer";
import { PointsField } from "@/components/ui/points-field";
import type {
  FillInBlanksItemInput,
  FillInBlanksMode,
} from "@/lib/fill-in-blanks";

function tokenize(text: string): string[] {
  return text.split(/(\s+)/);
}

function isWordToken(token: string | undefined): boolean {
  return !!token && token.length > 0 && !/^\s+$/.test(token);
}

/** Reconstrói o texto original (sem marcadores) e quais tokens eram espaço, para editar um item existente. */
function reconstruct(input: FillInBlanksItemInput | undefined) {
  if (!input) return { text: "", blankIndices: new Set<number>() };
  const blanksById = new Map(input.configuration.blanks.map((b) => [b.id, b]));
  const rawTokens = tokenize(input.configuration.text);
  const blankIndices = new Set<number>();
  const tokens = rawTokens.map((token, i) => {
    const match = /^\{\{([^}]+)\}\}$/.exec(token);
    if (match) {
      const blank = blanksById.get(match[1]!);
      if (blank) {
        blankIndices.add(i);
        return blank.answer;
      }
    }
    return token;
  });
  return { text: tokens.join(""), blankIndices };
}

export function FillInBlanksItemDialog({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  /** Presente = editando um item existente; ausente = criando um novo. */
  initial?: FillInBlanksItemInput;
  onSubmit: (input: FillInBlanksItemInput) => Promise<void>;
}) {
  const initialState = useMemo(() => reconstruct(initial), [initial]);
  const [text, setText] = useState(initialState.text);
  const [blankIndices, setBlankIndices] = useState<Set<number>>(
    initialState.blankIndices,
  );
  const [mode, setMode] = useState<FillInBlanksMode>(
    initial?.configuration.mode ?? "TYPING",
  );
  const [wordBankExtra, setWordBankExtra] = useState("");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tokens = useMemo(() => tokenize(text), [text]);

  function onTextChange(value: string) {
    setText(value);
    setBlankIndices(new Set()); // índices não valem mais para o texto novo
  }

  function toggleToken(index: number) {
    if (!isWordToken(tokens[index])) return;
    setBlankIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (blankIndices.size === 0) {
      setError("Clique nas palavras do texto que devem virar espaços.");
      return;
    }

    const blanks: { id: string; answer: string }[] = [];
    const markedTokens = tokens.map((token, i) => {
      if (blankIndices.has(i)) {
        const id = String(blanks.length + 1);
        blanks.push({ id, answer: token });
        return `{{${id}}}`;
      }
      return token;
    });
    const markedText = markedTokens.join("");

    // Firestore rejeita `undefined` como valor de campo — só inclui
    // wordBank na configuração quando o modo realmente usa (TYPING não tem).
    let wordBank: string[] | undefined;
    if (mode === "WORD_BANK") {
      const extra = wordBankExtra
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
      wordBank = [...blanks.map((b) => b.answer), ...extra];
    }

    setBusy(true);
    try {
      await onSubmit({
        configuration: {
          mode,
          text: markedText,
          blanks,
          ...(wordBank ? { wordBank } : {}),
        },
        points,
      });
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="fib-item-heading">
      <h2 id="fib-item-heading" className="text-lg font-bold">
        {initial ? "Editar item" : "Novo item"}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="fib-text" className="block text-sm font-medium">
            Texto
          </label>
          <textarea
            id="fib-text"
            required
            rows={3}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {tokens.some((t) => isWordToken(t)) && (
          <div>
            <p className="text-sm font-medium">
              Clique nas palavras que viram espaço
            </p>
            <div className="mt-2 flex flex-wrap gap-1 rounded-md border border-border p-2">
              {tokens.map((token, i) =>
                isWordToken(token) ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleToken(i)}
                    aria-pressed={blankIndices.has(i)}
                    className={`rounded px-1.5 py-0.5 text-sm ${
                      blankIndices.has(i)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {token}
                  </button>
                ) : (
                  <span key={i}>{token}</span>
                ),
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="fib-mode" className="block text-sm font-medium">
            Modo
          </label>
          <select
            id="fib-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as FillInBlanksMode)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="TYPING">Digitar a resposta</option>
            <option value="WORD_BANK">Escolher de um banco de palavras</option>
          </select>
        </div>

        {mode === "WORD_BANK" && (
          <div>
            <label
              htmlFor="fib-word-bank"
              className="block text-sm font-medium"
            >
              Palavras extras no banco (opcional, separadas por vírgula)
            </label>
            <input
              id="fib-word-bank"
              value={wordBankExtra}
              onChange={(e) => setWordBankExtra(e.target.value)}
              placeholder="slept, ran"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              As respostas certas já entram no banco automaticamente.
            </p>
          </div>
        )}

        <PointsField id="fib-points" value={points} onChange={setPoints} />

        <DialogFormFooter error={error} busy={busy} onCancel={onClose} />
      </form>
    </Dialog>
  );
}
