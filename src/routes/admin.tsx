import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Ban, Check, Loader2, LogOut, MinusCircle, PlusCircle, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { onValue, ref, update } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import { db, isAdmin } from "@/lib/firebase";
import { addCoins, deductCoins } from "@/lib/userdata";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Admin — Companion AI" }] }),
});

function Admin() {
  const { user, loading, loginEmail, logout } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const admin = isAdmin(user);

  useEffect(() => {
    if (!user || !admin) return;
    return onValue(ref(db, "users"), (snap) => {
      const v = snap.val() ?? {};
      setUsers(Object.values(v));
    });
  }, [user, admin]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return users.filter((u) => !s || u.email?.toLowerCase().includes(s) || u.name?.toLowerCase().includes(s) || u.uid?.includes(s));
  }, [users, q]);

  if (loading) {
    return (
      <div className="aurora-bg flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      try {
        await loginEmail(email, pw);
        toast.success("Signed in");
      } catch (err: any) {
        toast.error(err?.message ?? "Login failed");
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="aurora-bg flex min-h-screen items-center justify-center px-4">
        <form onSubmit={submit} className="glass w-full max-w-sm rounded-3xl p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">Admin login</h1>
            <p className="mt-1 text-xs text-muted-foreground">Sign in with your admin Firebase account</p>
          </div>
          <input type="email" required placeholder="admin@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-2 w-full rounded-xl bg-input px-4 py-3 text-sm outline-none focus:bg-secondary focus:ring-2 focus:ring-primary/40" />
          <input type="password" required placeholder="Password" minLength={6} value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="mb-3 w-full rounded-xl bg-input px-4 py-3 text-sm outline-none focus:bg-secondary focus:ring-2 focus:ring-primary/40" />
          <button disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3 font-semibold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
          </button>
          <Link to="/" className="mt-4 block text-center text-xs text-muted-foreground hover:underline">← Back to app</Link>
        </form>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="aurora-bg flex min-h-screen items-center justify-center px-4">
        <div className="glass max-w-md rounded-3xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Not an admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{user.email}</span>. To grant access, add this
            email to <code className="rounded bg-surface-2 px-1.5 py-0.5">ADMIN_EMAILS</code> in{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5">src/lib/firebase.ts</code>.
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground">UID: {user.uid}</p>
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={() => logout()} className="rounded-full bg-surface-2 px-4 py-2 text-sm">Sign out</button>
            <Link to="/" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Home</Link>
          </div>
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
        <button onClick={() => logout()} className="ml-auto flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-xs hover:bg-surface">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
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
