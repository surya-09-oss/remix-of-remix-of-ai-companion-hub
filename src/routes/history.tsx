import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { subscribeTransactions } from "@/lib/userdata";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "Transactions — Companion AI" }] }),
});

function HistoryPage() {
  const { user } = useAuth();
  const [tx, setTx] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeTransactions(user.uid, setTx);
  }, [user]);

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="aurora-bg min-h-screen">
      <header className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border px-4 py-3">
        <Link to="/" className="rounded-lg p-2 hover:bg-surface-2"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-display text-lg font-bold">Transactions</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {tx.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No transactions yet.</p>}
        <ul className="space-y-2">
          {tx.map((t) => {
            const positive = t.type === "credit" || t.type === "bonus";
            const Icon = t.type === "bonus" ? Gift : positive ? ArrowUpCircle : ArrowDownCircle;
            return (
              <li key={t.id} className="glass flex items-center gap-3 rounded-xl p-3">
                <Icon className={`h-7 w-7 ${positive ? "text-accent" : "text-destructive"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.note}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.ts ? new Date(typeof t.ts === "number" ? t.ts : Date.now()).toLocaleString() : "—"}
                  </p>
                </div>
                <span className={`text-sm font-bold ${positive ? "text-accent" : "text-destructive"}`}>
                  {positive ? "+" : "−"}{t.amount}
                </span>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
