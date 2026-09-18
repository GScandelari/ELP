"use client";

import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from "firebase/functions";

const REGION = "southamerica-east1";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

let cached: {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  appCheck: AppCheck | null;
} | null = null;

/**
 * Inicializa o SDK do Firebase. **Só pode ser chamada no client** — o SDK
 * de Auth valida a apiKey na inicialização, o que quebraria o prerender.
 */
export function getFirebase() {
  if (typeof window === "undefined") {
    throw new Error("getFirebase() só pode ser chamado no navegador");
  }
  if (cached) return cached;

  const app = getApps()[0] ?? initializeApp(firebaseConfig);

  // App Check (RNF-006, Fase 6 PR 6.5) — protege as Cloud Functions
  // callable contra abuso (bot/script fora do app real). `enforceAppCheck`
  // também é aplicado pelo *emulador* de Functions, não só em produção —
  // sem inicializar aqui em modo emulador, toda chamada callable seria
  // rejeitada localmente.
  //
  // O modo debug oficial (`self.FIREBASE_APPCHECK_DEBUG_TOKEN`) NÃO
  // funciona aqui: ele troca o token com o backend real do App Check, que
  // rejeita com 400 porque "demo-elp" (projectId fake do emulador) não é
  // um projeto de verdade. Como o emulador de Functions só confere que o
  // header `X-Firebase-AppCheck` existe — não valida o conteúdo —, um
  // `CustomProvider` que devolve um token fixo local, sem nenhuma chamada
  // de rede, resolve sem tocar no reCAPTCHA nem no backend do Google.
  let appCheck: AppCheck | null = null;
  if (useEmulators) {
    appCheck = initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: () =>
          Promise.resolve({
            token: "emulador-app-check-token",
            expireTimeMillis: Date.now() + 60 * 60 * 1000,
          }),
      }),
      isTokenAutoRefreshEnabled: false,
    });
  } else if (RECAPTCHA_SITE_KEY) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }

  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, REGION);

  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  }

  cached = { app, auth, db, functions, appCheck };
  return cached;
}
