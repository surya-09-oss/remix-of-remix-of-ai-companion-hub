import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const InputSchema = z.object({
  systemPrompt: z.string().min(1).max(8000),
  messages: z.array(MessageSchema).min(1).max(40),
});

export const chatComplete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI key not configured" };
    }
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: data.systemPrompt }, ...data.messages],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("AI error", res.status, txt);
        if (res.status === 429)
          return { ok: false as const, error: "Bahut requests ho gayi, thoda ruko." };
        if (res.status === 402) return { ok: false as const, error: "AI credits over. Try later." };
        return { ok: false as const, error: "AI service error" };
      }
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content)
        return { ok: false as const, error: "AI ne blank reply diya. Please try again." };
      return { ok: true as const, content };
    } catch (e: unknown) {
      console.error("chatComplete failed", e);
      return { ok: false as const, error: e instanceof Error ? e.message : "Unknown error" };
    }
  });
