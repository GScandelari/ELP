"use client";

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getFirebase } from "@/lib/firebase";

export type SignupRole = "teacher";

type FinalizeInput = {
  name: string;
  role: SignupRole;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
};

/**
 * Cria a conta no Firebase Auth e finaliza o cadastro (custom claim, docs,
 * consentimento) via callable `finalizeSignup`. Ao voltar, o chamador deve
 * rodar `refreshClaims()` do useAuth para o token pegar o novo papel.
 */
export async function registerTeacher(params: {
  name: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}) {
  const { auth, functions } = getFirebase();

  const cred = await createUserWithEmailAndPassword(
    auth,
    params.email,
    params.password,
  );
  await updateProfile(cred.user, { displayName: params.name });

  const finalize = httpsCallable<FinalizeInput, { ok: boolean; role: string }>(
    functions,
    "finalizeSignup",
  );
  await finalize({
    name: params.name,
    role: "teacher",
    acceptedTerms: params.acceptedTerms,
    acceptedPrivacy: params.acceptedPrivacy,
  });
}

export function signupErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/email-already-in-use":
        return "Este e-mail já está cadastrado. Tente entrar.";
      case "auth/invalid-email":
        return "E-mail inválido.";
      case "auth/weak-password":
        return "A senha precisa ter pelo menos 6 caracteres.";
      case "functions/failed-precondition":
        return "É necessário aceitar os Termos e a Política de Privacidade.";
      default:
        return "Não foi possível concluir o cadastro. Tente novamente.";
    }
  }
  return "Não foi possível concluir o cadastro. Tente novamente.";
}
