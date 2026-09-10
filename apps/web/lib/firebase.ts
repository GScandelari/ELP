"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

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
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }

  cached = { app, auth, db };
  return cached;
}
