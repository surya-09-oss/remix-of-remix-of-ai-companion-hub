import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Gift, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Create account — Companion AI" }] }),
});

function RegisterPage() {
  const { user, registerEmail, loginGoogle } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav({ to: "/" }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await registerEmail(email, pw, name); toast.success("Welcome! 20 coins added 🎁"); }
    catch (err: any) { toast.error(err?.message ?? "Sign-up failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="aurora-bg flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass w-full max-w-md rounded-3xl p-8 shadow-2xl"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Create account</h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Gift className="h-3.5 w-3.5" /> 20 free coins on sign-up
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-input px-4 py-3 text-sm outline-none focus:bg-secondary focus:ring-2 focus:ring-primary/40" />
          <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-input px-4 py-3 text-sm outline-none focus:bg-secondary focus:ring-2 focus:ring-primary/40" />
          <input type="password" required minLength={6} placeholder="Password (min 6)" value={pw} onChange={(e) => setPw(e.target.value)}
            className="w-full rounded-xl bg-input px-4 py-3 text-sm outline-none focus:bg-secondary focus:ring-2 focus:ring-primary/40" />
          <button disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3 font-semibold text-primary-foreground shadow-lg transition hover:opacity-95 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>

        <button onClick={() => loginGoogle().catch((e) => toast.error(e.message))}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary py-3 text-sm font-medium hover:bg-surface-2">
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
