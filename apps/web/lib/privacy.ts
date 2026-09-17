"use client";

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { getFirebase } from "@/lib/firebase";

/** Devolve os dados do próprio usuário (Art. 18 LGPD, portabilidade — RF-020). */
export async function exportUserData(): Promise<Record<string, unknown>> {
  const { functions } = getFirebase();
  const fn = httpsCallable<undefined, Record<string, unknown>>(
    functions,
    "exportUserData",
  );
  const res = await fn();
  return res.data;
}

export function exportUserDataErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/not-found":
        return "Conta não encontrada.";
      default:
        return "Não foi possível exportar seus dados. Tente novamente.";
    }
  }
  return "Não foi possível exportar seus dados. Tente novamente.";
}

/** Anonimiza e exclui a própria conta (ADR-011 §4 — RF-020). */
export async function deleteUserData(): Promise<void> {
  const { functions } = getFirebase();
  const fn = httpsCallable<undefined, { ok: boolean }>(
    functions,
    "deleteUserData",
  );
  await fn();
}

export function deleteUserDataErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "functions/not-found":
        return "Conta não encontrada.";
      default:
        return "Não foi possível excluir sua conta. Tente novamente.";
    }
  }
  return "Não foi possível excluir sua conta. Tente novamente.";
}
