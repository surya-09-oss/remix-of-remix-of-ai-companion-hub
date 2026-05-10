import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDc-aILnOWAtWWk5AEf2xzDfzr-5gL_a7w",
  authDomain: "aicommmm.firebaseapp.com",
  databaseURL: "https://aicommmm-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aicommmm",
  storageBucket: "aicommmm.firebasestorage.app",
  messagingSenderId: "243023815021",
  appId: "1:243023815021:web:bd202c08a5231cc803fa64",
  measurementId: "G-LXFLFG6JDG",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// ===== ADMIN ACCESS =====
// Add admin emails here (easier than UIDs). Any user signing in with one of
// these emails will get access to /admin.
// Example: ["you@gmail.com", "admin@yourapp.com"]
export const ADMIN_EMAILS: string[] = ["saritasinghsingh9752@gmail.com"];

// Optional: you can also whitelist by Firebase UID
export const ADMIN_UIDS: string[] = [];

export function isAdmin(user: { email?: string | null; uid?: string } | null | undefined) {
  if (!user) return false;
  const email = (user.email ?? "").toLowerCase();
  if (email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email)) return true;
  if (user.uid && ADMIN_UIDS.includes(user.uid)) return true;
  return false;
}
