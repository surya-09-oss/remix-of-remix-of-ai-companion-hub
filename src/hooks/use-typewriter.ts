import { useEffect, useState } from "react";

/**
 * Reveals `text` character-by-character. When `enabled` is false, returns full text instantly.
 * `speed` is characters per tick.
 */
export function useTypewriter(text: string, enabled: boolean, speed = 2, tickMs = 16) {
  const [shown, setShown] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) { setShown(text); return; }
    setShown("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(text.length, i + speed);
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, tickMs);
    return () => clearInterval(id);
  }, [text, enabled, speed, tickMs]);

  return shown;
}
