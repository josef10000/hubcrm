/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

import firebaseConfig from '../../firebase-applet-config.json';

export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI";

if (!isFirebaseConfigured) {
  console.error("Firebase API Key is missing or using placeholder. Please update firebase-applet-config.json.");
}

// Initialize Firebase only if configured, otherwise export nulls/placeholders
export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : ({} as any);

// Configuração moderna de persistência (v10.x+)
export const db = app ? initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : ({} as any);

export const storage = app ? getStorage(app) : ({} as any);

if (app && storage) {
  // Limita as tentativas de upload para 10 segundos, evitando "carregamento infinito" por erro de CORS/Rede
  storage.maxUploadRetryTime = 10000; 
}

export const googleProvider = new GoogleAuthProvider();
