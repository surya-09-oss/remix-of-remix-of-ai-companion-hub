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

// Admin UIDs — paste your Firebase UID here to access admin panel
export const ADMIN_UIDS: string[] = [];
