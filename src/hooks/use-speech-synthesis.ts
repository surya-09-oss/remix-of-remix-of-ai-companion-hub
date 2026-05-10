import { useCallback, useEffect, useRef, useState } from "react";

// Detect language: Hindi/Devanagari → hi-IN, else en-IN (covers Hinglish nicely)
function detectLang(text: string): string {
  return /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-IN";
}

export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  const pickVoice = useCallback(
    (lang: string) => {
      if (!voices.length) return null;
      const exact = voices.find((v) => v.lang === lang);
      if (exact) return exact;
      const prefix = lang.split("-")[0];
      const partial = voices.find((v) => v.lang.startsWith(prefix));
      return partial ?? voices.find((v) => v.default) ?? voices[0];
    },
    [voices]
  );

  const speak = useCallback(
    (text: string, opts?: { onEnd?: () => void; rate?: number; pitch?: number }) => {
      if (!supported || !text.trim()) { opts?.onEnd?.(); return; }
      try { window.speechSynthesis.cancel(); } catch {}
      const lang = detectLang(text);
      const u = new SpeechSynthesisUtterance(text.replace(/[*_`#>]/g, ""));
      u.lang = lang;
      const v = pickVoice(lang);
      if (v) u.voice = v;
      u.rate = opts?.rate ?? 1;
      u.pitch = opts?.pitch ?? 1.05;
      u.onstart = () => setSpeaking(true);
      u.onend = () => { setSpeaking(false); opts?.onEnd?.(); };
      u.onerror = () => { setSpeaking(false); opts?.onEnd?.(); };
      utterRef.current = u;
      window.speechSynthesis.speak(u);
    },
    [supported, pickVoice]
  );

  const cancel = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch {}
    setSpeaking(false);
  }, []);

  return { supported, speaking, speak, cancel };
}
