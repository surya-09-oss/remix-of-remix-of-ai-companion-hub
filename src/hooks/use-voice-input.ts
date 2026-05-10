import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getSR(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function useVoiceInput(lang = "en-IN") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  // transcript is { text, v } — bumping v forces consumers' effects to re-run
  const [transcript, setTranscriptState] = useState<{ text: string; v: number }>({
    text: "",
    v: 0,
  });
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef<string>("");
  const interimRef = useRef<string>("");
  const stoppingRef = useRef(false);

  useEffect(() => {
    setSupported(!!getSR());
  }, []);

  const buildRecognition = useCallback(() => {
    const SRClass = getSR();
    if (!SRClass) return null;
    const rec = new SRClass();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) finalRef.current = (finalRef.current + " " + finalText).trim();
      interimRef.current = interimText.trim();
    };
    rec.onerror = (e) => {
      setListening(false);
      const err = e?.error || "unknown";
      if (err === "not-allowed" || err === "service-not-allowed") {
        toast.error("Microphone access denied. Allow mic permission in your browser.");
      } else if (err === "no-speech") {
        // silent — caller may auto-restart
      } else if (err !== "aborted") {
        toast.error(`Voice error: ${err}`);
      }
    };
    rec.onend = () => {
      setListening(false);
      const text = (finalRef.current || interimRef.current).trim();
      finalRef.current = "";
      interimRef.current = "";
      stoppingRef.current = false;
      if (text) setTranscriptState((p) => ({ text, v: p.v + 1 }));
    };
    return rec;
  }, [lang]);

  const start = useCallback(async () => {
    if (!getSR()) {
      toast.error("Voice input is not supported in this browser. Try Chrome on Android/desktop.");
      return;
    }
    // Some browsers require explicit mic permission before SpeechRecognition fires.
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      }
    } catch {
      toast.error("Microphone permission required for voice input.");
      return;
    }
    try {
      recRef.current?.abort?.();
    } catch {
      recRef.current = null;
    }
    finalRef.current = "";
    interimRef.current = "";
    const rec = buildRecognition();
    if (!rec) return;
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      // InvalidStateError if already started — try to recover
      try {
        rec.stop();
      } catch {
        recRef.current = null;
      }
      setTimeout(() => {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      }, 200);
    }
  }, [buildRecognition]);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    try {
      recRef.current?.stop();
    } catch {
      setListening(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTranscriptState({ text: "", v: 0 });
    finalRef.current = "";
    interimRef.current = "";
  }, []);

  useEffect(
    () => () => {
      try {
        recRef.current?.abort?.();
      } catch {
        recRef.current = null;
      }
    },
    [],
  );

  return {
    supported,
    listening,
    transcript: transcript.text,
    transcriptVersion: transcript.v,
    start,
    stop,
    reset,
  };
}
