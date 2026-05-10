import { ref, get, set, update, onValue, push, serverTimestamp } from "firebase/database";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import type { CharacterId } from "./characters";

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  coins: number;
  banned?: boolean;
  createdAt: number | object;
  subscription?: { plan: string; until: number } | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export interface ChatSession {
  id: string;
  character: CharacterId;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const r = ref(db, `users/${user.uid}`);
  const snap = await get(r);
  if (snap.exists()) return snap.val() as UserProfile;
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    photoURL: user.photoURL,
    coins: 20,
    createdAt: Date.now(),
    subscription: null,
  };
  await set(r, profile);
  // log bonus tx
  await push(ref(db, `transactions/${user.uid}`), {
    type: "bonus",
    amount: 20,
    note: "Welcome bonus",
    ts: serverTimestamp(),
  });
  return profile;
}

export function subscribeProfile(uid: string, cb: (p: UserProfile | null) => void) {
  return onValue(ref(db, `users/${uid}`), (snap) => cb(snap.val() ?? null));
}

export async function deductCoins(uid: string, amount: number, note: string) {
  const r = ref(db, `users/${uid}/coins`);
  const snap = await get(r);
  const current = (snap.val() as number) ?? 0;
  if (current < amount) throw new Error("Insufficient coins");
  await set(r, current - amount);
  await push(ref(db, `transactions/${uid}`), {
    type: "deduct",
    amount,
    note,
    ts: Date.now(),
  });
}

export async function addCoins(uid: string, amount: number, note: string) {
  const r = ref(db, `users/${uid}/coins`);
  const snap = await get(r);
  const current = (snap.val() as number) ?? 0;
  await set(r, current + amount);
  await push(ref(db, `transactions/${uid}`), {
    type: "credit",
    amount,
    note,
    ts: Date.now(),
  });
}

export async function createChatSession(uid: string, character: CharacterId, title: string) {
  const r = push(ref(db, `chats/${uid}`));
  const session: ChatSession = {
    id: r.key!,
    character,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await set(r, session);
  return session;
}

export function subscribeSessions(uid: string, cb: (s: ChatSession[]) => void) {
  return onValue(ref(db, `chats/${uid}`), (snap) => {
    const v = snap.val() ?? {};
    const list: ChatSession[] = Object.values(v);
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    cb(list);
  });
}

export async function appendMessage(uid: string, sessionId: string, msg: ChatMessage) {
  await push(ref(db, `messages/${uid}/${sessionId}`), msg);
  await update(ref(db, `chats/${uid}/${sessionId}`), { updatedAt: Date.now() });
}

export function subscribeMessages(
  uid: string,
  sessionId: string,
  cb: (msgs: ChatMessage[]) => void,
) {
  return onValue(ref(db, `messages/${uid}/${sessionId}`), (snap) => {
    const v = snap.val() ?? {};
    const list = Object.values(v) as ChatMessage[];
    list.sort((a, b) => a.ts - b.ts);
    cb(list);
  });
}

export function subscribeTransactions(uid: string, cb: (t: any[]) => void) {
  return onValue(ref(db, `transactions/${uid}`), (snap) => {
    const v = snap.val() ?? {};
    const list = Object.entries(v).map(([id, t]: any) => ({ id, ...t }));
    list.sort((a: any, b: any) => (b.ts ?? 0) - (a.ts ?? 0));
    cb(list);
  });
}

export async function deleteSession(uid: string, sessionId: string) {
  await set(ref(db, `chats/${uid}/${sessionId}`), null);
  await set(ref(db, `messages/${uid}/${sessionId}`), null);
}
