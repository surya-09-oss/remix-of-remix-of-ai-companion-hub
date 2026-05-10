import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft, Ban, Check, MinusCircle, PlusCircle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { onValue, ref, set, update } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import { ADMIN_UIDS, db } from "@/lib/firebase";
import { addCoins, deductCoins } from "@/lib/userdata";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Admin — Companion AI" }] }),
});

function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, "users"), (snap) => {
      const v = snap.val() ?? {};
      setUsers(Object.values(v));
    });
  }, [user]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return users.filter((u) => !s || u.email?.toLowerCase().includes(s) || u.name?.toLowerCase().includes(s) || u.uid?.includes(s));
  }, [users, q]);

  if (!user) return <Navigate to="/login" />;
  if (!ADMIN_UIDS.includes(user.uid)) {
    return (
      <div className="aurora-bg flex min-h-screen items-center justify-center px-4">
        <div className="glass max-w-md rounded-3xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your UID to <code className="rounded bg-surface-2 px-1.5 py-0.5">ADMIN_UIDS</code> in <code className="rounded bg-surface-2 px-1.5 py-0.5">src/lib/firebase.ts</code>.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Your UID: {user.uid}</p>
          <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
        </div>
      </div>
    );
  }

  const adjust = async (uid: string, amount: number) => {
    try {
      if (amount > 0) await addCoins(uid, amount, "Admin credit");
      else await deductCoins(uid, -amount, "Admin debit");
      toast.success("Updated");
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleBan = async (u: any) => {
    await update(ref(db, `users/${u.uid}`), { banned: !u.banned });
    toast.success(u.banned ? "Unbanned" : "Banned");
  };

  return (
    <div className="aurora-bg min-h-screen">
      <header className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border px-4 py-3">
        <Link to="/" className="rounded-lg p-2 hover:bg-surface-2"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-display text-lg font-bold">Admin Panel</h1>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="glass mb-4 flex items-center gap-2 rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email, name, or UID"
            className="flex-1 bg-transparent py-1 text-sm outline-none" />
        </div>
        <ul className="space-y-2">
          {filtered.map((u) => (
            <li key={u.uid} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.name ?? "Unnamed"}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{u.uid}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold text-primary">{u.coins ?? 0}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">coins</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[10, 50, 100].map((n) => (
                  <button key={`+${n}`} onClick={() => adjust(u.uid, n)} className="flex items-center gap-1 rounded-lg bg-accent/15 px-2.5 py-1 text-xs text-accent hover:bg-accent/25">
                    <PlusCircle className="h-3.5 w-3.5" /> {n}
                  </button>
                ))}
                {[10, 50].map((n) => (
                  <button key={`-${n}`} onClick={() => adjust(u.uid, -n)} className="flex items-center gap-1 rounded-lg bg-destructive/15 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/25">
                    <MinusCircle className="h-3.5 w-3.5" /> {n}
                  </button>
                ))}
                <button onClick={() => toggleBan(u)}
                  className={`ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs ${u.banned ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive"}`}>
                  {u.banned ? <><Check className="h-3.5 w-3.5" /> Unban</> : <><Ban className="h-3.5 w-3.5" /> Ban</>}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
