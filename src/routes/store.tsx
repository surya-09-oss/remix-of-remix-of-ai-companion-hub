import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft, Coins, PlayCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { addCoins } from "@/lib/userdata";
import { toast } from "sonner";

export const Route = createFileRoute("/store")({
  component: Store,
  head: () => ({ meta: [{ title: "Coin Store — Companion AI" }] }),
});

const PACKS = [
  { coins: 50, price: 19 },
  { coins: 100, price: 29, popular: true },
  { coins: 200, price: 49 },
  { coins: 500, price: 99, best: true },
];
const SUBS = [
  { name: "Weekly", price: 149, period: "/ week" },
  { name: "Monthly", price: 399, period: "/ month", popular: true },
  { name: "Yearly", price: 1999, period: "/ year" },
];

function Store() {
  const { user, profile } = useAuth();
  if (!user) return <Navigate to="/login" />;

  const buy = (pack: typeof PACKS[number]) => {
    // TODO: integrate Razorpay — open checkout, on success call addCoins.
    toast.info("Razorpay checkout will open here. Add your key to enable.");
  };

  const watchAd = async () => {
    // simulate ad watch
    toast.success("Ad reward: +15 coins!");
    await addCoins(user.uid, 15, "Ad reward");
  };

  return (
    <div className="aurora-bg min-h-screen">
      <header className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border px-4 py-3">
        <Link to="/" className="rounded-lg p-2 hover:bg-surface-2"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-display text-lg font-bold">Coin Store</h1>
        <div className="ml-auto flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary">
          <Coins className="h-4 w-4" /> {profile?.coins ?? 0}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={watchAd}
            className="glass flex w-full items-center justify-between rounded-2xl p-5 transition hover:scale-[1.01]">
            <div className="flex items-center gap-3">
              <PlayCircle className="h-8 w-8 text-accent" />
              <div className="text-left">
                <p className="font-semibold">Watch a short ad</p>
                <p className="text-xs text-muted-foreground">Free 15 coins instantly</p>
              </div>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">+15</span>
          </button>
        </motion.section>

        <h2 className="mb-3 mt-8 font-display text-xl font-bold">Coin packs</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PACKS.map((p, i) => (
            <motion.button key={p.coins} onClick={() => buy(p)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass relative flex flex-col items-center rounded-2xl p-4 transition hover:scale-105">
              {p.popular && <span className="absolute -top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">POPULAR</span>}
              {p.best && <span className="absolute -top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">BEST VALUE</span>}
              <Coins className="mb-2 h-7 w-7 text-primary" />
              <p className="font-display text-2xl font-bold">{p.coins}</p>
              <p className="text-xs text-muted-foreground">coins</p>
              <p className="mt-2 rounded-full bg-secondary px-3 py-1 text-sm font-semibold">₹{p.price}</p>
            </motion.button>
          ))}
        </div>

        <h2 className="mb-3 mt-8 font-display text-xl font-bold">Unlimited subscriptions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {SUBS.map((s) => (
            <div key={s.name} className="glass relative rounded-2xl p-5">
              {s.popular && <span className="absolute -top-2 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">POPULAR</span>}
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <p className="font-semibold">{s.name}</p>
              </div>
              <p className="mt-3 font-display text-3xl font-bold">₹{s.price}<span className="text-sm font-normal text-muted-foreground">{s.period}</span></p>
              <p className="mt-1 text-xs text-muted-foreground">Unlimited chats with all companions.</p>
              <button onClick={() => toast.info("Razorpay checkout coming soon.")}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-primary to-accent py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95">
                Subscribe
              </button>
            </div>
          ))}
        </div>

        <div className="mx-auto my-8 flex h-24 max-w-3xl items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface/40">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Sponsored · 728×90</span>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Need help? Email <a href="mailto:support@companionai.app" className="text-primary hover:underline">support@companionai.app</a>
        </p>
      </main>
    </div>
  );
}
