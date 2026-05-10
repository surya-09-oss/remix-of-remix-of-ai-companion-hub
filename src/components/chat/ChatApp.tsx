import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  Coins,
  History,
  LogOut,
  Menu,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Volume2,
  Wand2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "@/lib/auth-context";
import { ADMIN_UIDS } from "@/lib/firebase";
import { CHARACTERS, getCharacter, type CharacterId } from "@/lib/characters";
import {
  appendMessage,
  createChatSession,
  deductCoins,
  deleteSession,
  subscribeMessages,
  subscribeSessions,
  type ChatMessage,
  type ChatSession,
  type UserProfile,
} from "@/lib/userdata";
import { chatComplete } from "@/lib/ai.functions";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { useTypewriter } from "@/hooks/use-typewriter";

const COIN_COST = 1;

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Hey, still up?";
}

export default function ChatApp() {
  const { user, profile, logout } = useAuth();
  const nav = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterId>("lovely");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [charPickerOpen, setCharPickerOpen] = useState(false);
  const [animateTs, setAnimateTs] = useState<number | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceModeRef = useRef(false);
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const aiCall = useServerFn(chatComplete);
  const tts = useSpeechSynthesis();

  const isAdmin = !!user && ADMIN_UIDS.includes(user.uid);
  const active = sessions.find((s) => s.id === activeId) ?? null;
  const activeChar = getCharacter(active?.character ?? character);

  // subscribe sessions
  useEffect(() => {
    if (!user) return;
    return subscribeSessions(user.uid, setSessions);
  }, [user]);

  // subscribe messages of active session
  useEffect(() => {
    if (!user || !activeId) {
      setMessages([]);
      return;
    }
    return subscribeMessages(user.uid, activeId, setMessages);
  }, [user, activeId]);

  // autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // focus textarea
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId, character]);

  const startNewChat = async (charId: CharacterId = character) => {
    if (!user) return;
    const c = getCharacter(charId);
    const s = await createChatSession(user.uid, charId, `${c.name} • new chat`);
    setActiveId(s.id);
    setCharacter(charId);
    setDrawerOpen(false);
    setCharPickerOpen(false);
  };

  const send = async (override?: string) => {
    if (!user || !profile || sending) return;
    const text = (override ?? input).trim();
    if (!text) return;
    if ((profile.coins ?? 0) < COIN_COST) {
      toast.error("Coins khatam ho gaye. Recharge ya ad dekh lo.");
      nav({ to: "/store" });
      return;
    }

    let sessionId = activeId;
    if (!sessionId) {
      const s = await createChatSession(user.uid, character, text.slice(0, 40));
      sessionId = s.id;
      setActiveId(sessionId);
    }

    const userMsg: ChatMessage = { role: "user", content: text, ts: Date.now() };
    setInput("");
    setSending(true);
    await appendMessage(user.uid, sessionId, userMsg);

    try {
      const history = [...messages, userMsg].slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const charObj = getCharacter(active?.character ?? character);
      const greetingHint =
        messages.length === 0
          ? `\nThis is the first message. Open with a natural ${greetingFor()} in your style.`
          : "";

      const result = await aiCall({
        data: {
          systemPrompt: charObj.systemPrompt + greetingHint,
          messages: history,
        },
      });

      if (!result.ok) {
        toast.error(result.error);
        if (voiceModeRef.current) {
          tts.speak(result.error);
        }
        setSending(false);
        return;
      }
      // emotional reaction delays (skip in voice mode for snappy convo)
      if (!voiceModeRef.current) {
        const lower = text.toLowerCase();
        let delay = 600;
        if (lower.includes("miss you") || lower.includes("yaad")) delay = 8000;
        else if (lower.includes("suno na") || lower.includes("pyari")) delay = 5000;
        await new Promise((r) => setTimeout(r, delay));
      }

      const aiTs = Date.now();
      setAnimateTs(aiTs);
      await appendMessage(user.uid, sessionId, {
        role: "assistant",
        content: result.content,
        ts: aiTs,
      });
      try {
        await deductCoins(user.uid, COIN_COST, `Chat with ${charObj.name}`);
      } catch (coinError) {
        console.warn("Coin deduction failed", coinError);
      }

      // Voice mode: speak the answer, then re-listen
      if (voiceModeRef.current && tts.supported) {
        tts.speak(result.content);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  };

  // voice
  const { listening, supported, start, stop, transcript, transcriptVersion, reset } =
    useVoiceInput();
  useEffect(() => {
    if (!transcript) return;
    if (voiceModeRef.current) {
      stop();
      void send(transcript);
    } else {
      setInput((v) => (v ? v + " " : "") + transcript);
    }
    reset();
    // eslint-disable-next-line
  }, [transcriptVersion]);

  // Exit voice mode cleanup
  useEffect(() => {
    if (!voiceMode) {
      stop();
      tts.cancel();
    }
    // eslint-disable-next-line
  }, [voiceMode]);

  return (
    <div className="aurora-bg flex h-[100dvh] w-full overflow-hidden text-foreground">
      {/* Sidebar drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="bd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              key="sd"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 28, stiffness: 250 }}
              className="glass fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border md:hidden"
            >
              <Sidebar
                profile={profile}
                sessions={sessions}
                activeId={activeId}
                onNew={() => startNewChat()}
                onPick={(id) => {
                  setActiveId(id);
                  setDrawerOpen(false);
                }}
                onDelete={(id) => user && deleteSession(user.uid, id)}
                onLogout={logout}
                isAdmin={isAdmin}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* desktop sidebar */}
      <aside className="glass hidden w-72 flex-col border-r border-border md:flex">
        <Sidebar
          profile={profile}
          sessions={sessions}
          activeId={activeId}
          onNew={() => startNewChat()}
          onPick={(id) => setActiveId(id)}
          onDelete={(id) => user && deleteSession(user.uid, id)}
          onLogout={logout}
          isAdmin={isAdmin}
        />
      </aside>

      {/* main */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* header */}
        <header className="glass-strong sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-2.5 py-2.5 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl p-2 transition hover:bg-surface-2 md:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCharPickerOpen(true)}
              className="group ring-gradient flex min-w-0 items-center gap-2 rounded-full bg-surface/70 px-2 py-1 text-xs font-medium transition hover:bg-surface-2 sm:gap-2.5 sm:px-3 sm:py-1.5 sm:text-sm"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-sm shadow-md sm:h-7 sm:w-7 sm:text-base ${activeChar.gradient}`}
              >
                {activeChar.emoji}
              </span>
              <span className="max-w-[90px] truncate font-display font-semibold tracking-tight sm:max-w-none">
                {activeChar.name}
              </span>
              <span className="hidden h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] sm:inline-block" />
            </button>
            <button
              onClick={() => startNewChat("assistant")}
              className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent/20 hover:shadow-[0_0_20px_-4px_var(--accent)] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
              title="Direct AI chat"
            >
              <Wand2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden xs:inline sm:inline">Direct AI</span>
            </button>
            {tts.supported && supported && (
              <button
                onClick={() => setVoiceMode(true)}
                className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20 hover:shadow-[0_0_20px_-4px_var(--primary)] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
                title="Voice call mode"
              >
                <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Voice</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LiveClock />
            <Link
              to="/store"
              className="ring-gradient flex items-center gap-1 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 px-2.5 py-1 text-xs font-bold text-primary transition hover:from-primary/30 hover:to-accent/30 hover:shadow-[0_0_24px_-4px_var(--primary)] sm:gap-1.5 sm:px-3.5 sm:py-1.5 sm:text-sm"
            >
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="tabular-nums">{profile?.coins ?? 0}</span>
            </Link>
          </div>
        </header>

        {/* messages */}
        <div ref={scrollRef} className="scrollbar-slim flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.length === 0 && !sending && <EmptyState char={activeChar} />}
            {messages.map((m, i) => (
              <Message
                key={i}
                msg={m}
                char={activeChar}
                animate={m.role === "assistant" && m.ts === animateTs}
              />
            ))}
            {sending && (
              <div className="flex items-center gap-3">
                <CharAvatar char={activeChar} />
                <div className="rounded-2xl bg-card px-4 py-2.5">
                  <span className="shimmer text-sm font-medium">{activeChar.name} is typing…</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        <div className="border-t border-border/60 bg-gradient-to-b from-transparent to-background/95 p-3 backdrop-blur-xl sm:p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <div className="ring-gradient glass flex flex-1 items-end gap-1 rounded-2xl px-3 py-2 shadow-soft transition focus-within:shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_35%,transparent),0_12px_40px_-12px_color-mix(in_oklab,var(--primary)_40%,transparent)]">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={`Message ${activeChar.name}…`}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
              />
              {supported && (
                <button
                  onClick={() => (listening ? stop() : start())}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition ${listening ? "bg-destructive text-destructive-foreground animate-pulse shadow-lg" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"}`}
                  aria-label="Voice"
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}
            </div>
            <button
              onClick={() => send()}
              disabled={!input.trim() || sending}
              className="group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground shadow-[0_8px_28px_-8px_var(--primary)] transition hover:scale-105 hover:shadow-[0_12px_40px_-8px_var(--primary)] active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              aria-label="Send"
            >
              <span className="absolute inset-0 -z-10 bg-gradient-to-br from-white/0 via-white/20 to-white/0 opacity-0 transition group-hover:opacity-100" />
              <Send className="h-5 w-5 translate-x-px -translate-y-px" />
            </button>
          </div>
          <p className="mx-auto mt-2.5 max-w-3xl text-center text-[11px] tracking-wide text-muted-foreground/70">
            <span className="font-mono text-accent">{COIN_COST}</span> coin per reply · Voice input
            is free ·{" "}
            <kbd className="rounded border border-border/60 bg-surface/60 px-1 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>{" "}
            to send
          </p>
        </div>
      </main>

      {/* character picker */}
      <AnimatePresence>
        {charPickerOpen && (
          <CharacterPicker
            current={active?.character ?? character}
            onClose={() => setCharPickerOpen(false)}
            onPick={(id) => startNewChat(id)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {voiceMode && (
          <VoiceModeOverlay
            open={voiceMode}
            onClose={() => setVoiceMode(false)}
            char={activeChar}
            listening={listening}
            speaking={tts.speaking}
            sending={sending}
            startMic={start}
            stopMic={stop}
            cancelTts={tts.cancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Sidebar({
  profile,
  sessions,
  activeId,
  onNew,
  onPick,
  onDelete,
  onLogout,
  isAdmin,
}: {
  profile: UserProfile | null;
  sessions: ChatSession[];
  activeId: string | null;
  onNew: () => void;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
  isAdmin: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-sm font-bold leading-tight">Companion AI</p>
            <p className="text-[11px] text-muted-foreground">{profile?.name ?? profile?.email}</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-95"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>

      <div className="px-3 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        Recent
      </div>
      <div className="scrollbar-slim flex-1 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">No chats yet.</p>
        )}
        {sessions.map((s) => {
          const c = getCharacter(s.character);
          return (
            <div
              key={s.id}
              className={`group mb-1 flex items-center gap-2 rounded-lg px-2 py-2 transition ${activeId === s.id ? "bg-secondary" : "hover:bg-secondary/60"}`}
            >
              <button
                onClick={() => onPick(s.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-sm ${c.gradient}`}
                >
                  {c.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{s.title}</span>
              </button>
              <button
                onClick={() => onDelete(s.id)}
                className="rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-destructive/20"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3 text-sm">
        <Link
          to="/store"
          className="mb-1 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary"
        >
          <Store className="h-4 w-4" /> Coin store
        </Link>
        <Link
          to="/history"
          className="mb-1 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary"
        >
          <History className="h-4 w-4" /> Transactions
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            className="mb-1 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary"
          >
            <ShieldCheck className="h-4 w-4 text-accent" /> Admin
          </Link>
        )}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

function CharAvatar({ char }: { char: ReturnType<typeof getCharacter> }) {
  return (
    <div
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg shadow-[0_4px_16px_-4px_rgba(0,0,0,0.6)] ring-1 ring-white/15 ${char.gradient}`}
    >
      <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br opacity-50 blur-md ${char.gradient}" />
      {char.emoji}
    </div>
  );
}

function Message({
  msg,
  char,
  animate = false,
}: {
  msg: ChatMessage;
  char: ReturnType<typeof getCharacter>;
  animate?: boolean;
}) {
  const isUser = msg.role === "user";
  const shown = useTypewriter(msg.content, !isUser && animate, 3, 18);
  const display = isUser ? msg.content : animate ? shown : msg.content;
  const isTyping = !isUser && animate && shown.length < msg.content.length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`flex w-full items-start gap-2 sm:gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && <CharAvatar char={char} />}
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-to-br from-primary to-primary/85 px-3.5 py-2.5 text-primary-foreground shadow-[0_8px_24px_-8px_var(--primary)] ring-1 ring-white/10 sm:max-w-[78%] sm:px-4 sm:py-3"
            : "ring-gradient max-w-[88%] rounded-2xl rounded-tl-md bg-card/60 px-3.5 py-2.5 text-foreground shadow-soft backdrop-blur-xl sm:max-w-[82%] sm:px-4 sm:py-3"
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words text-left text-[15px] leading-relaxed">
            {display}
          </p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none break-words text-left text-foreground prose-p:my-1 prose-p:leading-relaxed prose-headings:mt-2 prose-headings:mb-1 prose-headings:font-display prose-pre:bg-background/70 prose-pre:rounded-xl prose-pre:border prose-pre:border-border/60 prose-code:text-accent prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground prose-strong:font-semibold prose-li:my-0.5 prose-a:text-accent prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown>{display}</ReactMarkdown>
            {isTyping && (
              <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse rounded-sm bg-accent align-middle shadow-[0_0_8px_var(--accent)]" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ char }: { char: ReturnType<typeof getCharacter> }) {
  const suggestions = [
    "Tell me a fun fact ✨",
    "Suno na, kya kar rahe ho?",
    "Help me write something",
    "Motivate me 🔥",
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center px-4 py-10 text-center sm:py-16"
    >
      <div className="relative mb-6">
        <div
          className={`absolute inset-0 -z-10 rounded-full bg-gradient-to-br opacity-50 blur-3xl ${char.gradient}`}
        />
        <div
          className={`float-y flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br text-5xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/15 sm:h-28 sm:w-28 sm:text-6xl ${char.gradient}`}
        >
          {char.emoji}
        </div>
      </div>
      <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="text-gradient">{char.name}</span>
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{char.tagline}</p>
      <p className="mt-6 max-w-sm text-sm text-muted-foreground/80">
        Say hi 👋 — start a conversation, ask anything, or pick a prompt below.
      </p>
      <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <span
            key={s}
            className="ring-gradient rounded-full bg-surface/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur transition hover:bg-surface-2 hover:text-foreground sm:text-sm"
          >
            {s}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function CharacterPicker({
  current,
  onClose,
  onPick,
}: {
  current: CharacterId;
  onClose: () => void;
  onPick: (id: CharacterId) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="glass-strong ring-gradient relative w-full max-w-2xl rounded-t-3xl border-t border-border/60 p-5 shadow-elevated sm:rounded-3xl sm:border sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight">Choose your companion</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Each one starts a fresh conversation
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CHARACTERS.map((c, i) => (
            <motion.button
              key={c.id}
              onClick={() => onPick(c.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition hover:scale-[1.03] hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.6)] ${current === c.id ? "border-primary shadow-[0_0_0_1px_var(--primary),0_8px_24px_-8px_var(--primary)]" : "border-border/60"}`}
            >
              <div
                className={`absolute inset-0 -z-10 bg-gradient-to-br opacity-25 transition group-hover:opacity-40 ${c.gradient}`}
              />
              <div className="text-3xl drop-shadow-lg">{c.emoji}</div>
              <div className="mt-2 font-display font-semibold tracking-tight">{c.name}</div>
              <div className="text-[11px] text-muted-foreground">{c.tagline}</div>
              {current === c.id && (
                <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeShort = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const timeFull = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-border/60 bg-surface/60 px-2 py-1 font-mono text-[11px] font-medium tabular-nums text-muted-foreground shadow-inner backdrop-blur sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
      title={now.toLocaleString()}
    >
      <Clock className="h-3 w-3 text-accent sm:h-3.5 sm:w-3.5" />
      <span className="sm:hidden">{timeShort}</span>
      <span className="hidden sm:inline">{timeFull}</span>
    </div>
  );
}

function VoiceModeOverlay({
  open,
  onClose,
  char,
  listening,
  speaking,
  sending,
  startMic,
  stopMic,
  cancelTts,
}: {
  open: boolean;
  onClose: () => void;
  char: ReturnType<typeof getCharacter>;
  listening: boolean;
  speaking: boolean;
  sending: boolean;
  startMic: () => void;
  stopMic: () => void;
  cancelTts: () => void;
}) {
  useEffect(() => {
    if (open && !listening && !speaking && !sending) {
      const t = setTimeout(() => {
        void startMic();
      }, 450);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line
  }, [open, listening, speaking, sending]);

  if (!open) return null;
  const status = speaking
    ? `${char.name} is speaking…`
    : sending
      ? "Thinking…"
      : listening
        ? "Listening… speak now"
        : "Tap mic to speak";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 p-6 backdrop-blur-xl"
    >
      <button
        onClick={() => {
          stopMic();
          cancelTts();
          onClose();
        }}
        className="absolute right-4 top-4 rounded-full bg-secondary p-2 hover:bg-surface-2"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative flex flex-col items-center">
        <div
          className={`absolute inset-0 -z-10 rounded-full bg-gradient-to-br opacity-40 blur-3xl ${char.gradient} ${listening || speaking ? "animate-pulse" : ""}`}
        />
        <div
          className={`flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br text-6xl shadow-2xl sm:h-44 sm:w-44 sm:text-7xl ${char.gradient}`}
        >
          {char.emoji}
        </div>
      </div>

      <h2 className="mt-8 font-display text-2xl font-bold">{char.name}</h2>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        {speaking && <Volume2 className="h-4 w-4 animate-pulse text-accent" />}
        {status}
      </p>

      <div className="mt-10 flex items-center gap-4">
        <button
          onClick={() => (listening ? stopMic() : startMic())}
          disabled={speaking || sending}
          className={`flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition disabled:opacity-40 ${listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-gradient-to-br from-primary to-accent text-primary-foreground"}`}
          aria-label={listening ? "Stop" : "Speak"}
        >
          {listening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
        </button>
        <button
          onClick={() => {
            stopMic();
            cancelTts();
            onClose();
          }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-foreground shadow-xl hover:bg-surface-2"
          aria-label="End"
        >
          <PhoneOff className="h-7 w-7" />
        </button>
      </div>

      <p className="mt-6 max-w-xs text-center text-xs text-muted-foreground">
        Speak in Hindi, English, or Hinglish. {char.name} replies in voice automatically.
      </p>
    </motion.div>
  );
}
