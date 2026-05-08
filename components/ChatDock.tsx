"use client";

// ChatDock — the always-visible liquid-glass conversation surface.
//
// The dock supports rich agent messages: light Markdown (bold, italic, lists,
// headings) and structured UI blocks (choice cards, confirm buttons, summary
// cards, quick replies) that the Maestro emits via tools.

import { useCallback, useEffect, useRef, useState } from "react";
import { useProject } from "./StateProvider";
import type { ChatMessage, ChatUI, ProjectState } from "@/lib/types";
import { maestroName } from "@/lib/displayName";

export function ChatDock() {
  const { state, setState, pollForUpdates } = useProject();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Client-side memory of message IDs whose ui block has been answered.
  // Stays for the session; chat replays from server but the server doesn't
  // track resolved-ness, so this is local-only.
  const [answered, setAnswered] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages or open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [state?.chat.length, open]);

  const send = useCallback(async (override?: string) => {
    const msg = (override ?? draft).trim();
    if (!msg) return;
    if (!state) return;
    if (!override) setDraft("");
    setSending(true);
    setError(null);
    setOpen(true);
    try {
      setState({
        ...state,
        chat: [
          ...state.chat,
          { id: "tmp-" + Date.now().toString(36), role: "user", content: msg, createdAt: new Date().toISOString() },
        ],
      });
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (j.state) {
        // If the brief just transitioned to locked OR Scout was kicked off
        // post-pivot, the server fired Scout in the background. Poll for the
        // resulting vendors + approval cards.
        const wasLocked = state?.brief?.locked ?? false;
        const isLocked = j.state.brief?.locked ?? false;
        if ((!wasLocked && isLocked) || (isLocked && (j.state.chat[j.state.chat.length - 1]?.content ?? "").toLowerCase().includes("scout"))) {
          pollForUpdates(120_000);
        }
        setState(j.state);
      }
      if (j.error) setError(j.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }, [draft, state, setState]);

  const resolveUI = (msgId: string, replyText: string) => {
    setAnswered((prev) => new Set(prev).add(msgId));
    void send(replyText);
  };

  if (!state) return null;
  const me = maestroName(state);
  const disabled = state.paused || state.dayOfMode || sending;

  const placeholder = state.paused
    ? "Paused. Resume in settings."
    : state.dayOfMode
    ? "Today is the wedding. The dock is quiet."
    : state.brief?.locked
    ? `Ask ${me}…`
    : `Tell ${me} anything — the date you're thinking, the city, the feeling.`;

  // Recent chat tail to show when expanded.
  const tail = state.chat.slice(-8);
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[760px] lg:max-w-[840px]"
      style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      <div className="lg:hidden" aria-hidden style={{ marginBottom: "calc(64px - 1.25rem)" }} />

      <div
        className={`relative glass-strong rounded-[28px] transition-all duration-500 ${open ? "pt-3" : "pt-2"}`}
      >
        {/* Conversation tail */}
        {open && tail.length > 0 && (
          <div
            ref={scrollRef}
            className="px-4 pb-3 max-h-[52vh] overflow-y-auto no-scrollbar flex flex-col gap-3"
          >
            {tail.map((m) => (
              <MessageRow
                key={m.id}
                msg={m}
                isResolved={answered.has(m.id)}
                onChoice={(text) => resolveUI(m.id, text)}
                fmtTime={fmtTime}
              />
            ))}
            {sending && (
              <div className="flex items-center gap-1.5 pl-1 animate-fade-in-soft">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-pulse-soft" />
                <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-pulse-soft" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-pulse-soft" style={{ animationDelay: "240ms" }} />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="px-4 -mt-1 mb-2 text-[12px] text-risk-high animate-fade-in-soft">
            {error}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 px-3 pb-3">
          <button
            type="button"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 w-9 h-9 rounded-full text-ink-300 hover:text-ink hover:bg-paper-200/70 transition-all flex items-center justify-center"
          >
            <span className={`inline-block transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>⌃</span>
          </button>

          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent border-none outline-none px-2 py-2 text-[15px] leading-relaxed placeholder:text-ink-200 disabled:opacity-50 max-h-32"
          />

          <button
            onClick={() => send()}
            disabled={disabled || !draft.trim()}
            aria-label="Send"
            className="relative shrink-0 w-10 h-10 rounded-full bg-ink text-paper-50 disabled:opacity-25 disabled:cursor-not-allowed transition-all hover:scale-[1.04] active:scale-95 hover:bg-ink-400 flex items-center justify-center overflow-hidden group/send"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 0 rgba(14,14,12,0.08), 0 8px 22px -8px rgba(14,14,12,0.45), 0 4px 12px -4px rgba(79,93,68,0.25)",
            }}
          >
            {sending ? (
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-paper-50 animate-pulse-soft" />
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform group-hover/send:translate-x-0.5">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
            <span
              className="absolute inset-0 -translate-x-full group-hover/send:translate-x-full transition-transform duration-700 ease-out pointer-events-none"
              style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)" }}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- helpers ---

function MessageRow({
  msg,
  isResolved,
  onChoice,
  fmtTime,
}: {
  msg: ChatMessage;
  isResolved: boolean;
  onChoice: (text: string) => void;
  fmtTime: (iso: string) => string;
}) {
  const isUser = msg.role === "user";
  const showAgent = !isUser && msg.agent && msg.agent !== "Maestro";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-fade-in-soft`}>
      {showAgent && <div className="eyebrow text-[10px] mb-0.5 px-1">{msg.agent}</div>}
      {msg.content && (
        <div
          className={`max-w-[92%] text-[14px] leading-relaxed ${
            isUser
              ? "bg-ink text-paper-50 rounded-2xl rounded-br-md px-3.5 py-2"
              : "text-ink rounded-2xl rounded-bl-md px-1 py-0.5"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          ) : (
            <Markdown text={msg.content} />
          )}
        </div>
      )}

      {/* Structured UI block */}
      {!isUser && msg.ui && (
        <div className={`mt-2 w-full max-w-[420px] transition-opacity ${isResolved ? "opacity-40 pointer-events-none" : ""}`}>
          <UIBlock ui={msg.ui} onChoose={onChoice} />
        </div>
      )}

      <time className="text-[10px] text-ink-200 mt-1 px-1">{fmtTime(msg.createdAt)}</time>
    </div>
  );
}

function UIBlock({ ui, onChoose }: { ui: ChatUI; onChoose: (text: string) => void }) {
  switch (ui.kind) {
    case "choice":
      return (
        <div className="rounded-2xl border hairline bg-white/85 p-3 shadow-card animate-fade-in-soft">
          {ui.question && (
            <div className="text-[13px] text-ink-400 leading-snug mb-2.5 px-0.5">{ui.question}</div>
          )}
          <div className="flex flex-col gap-1.5">
            {ui.options.map((o, i) => (
              <button
                key={o.id}
                onClick={() => onChoose(o.label)}
                className="group flex items-baseline justify-between gap-3 text-left rounded-xl border border-transparent hover:border-sage-300/60 hover:bg-sage-50/50 px-3.5 py-2.5 transition-all"
              >
                <span className="flex items-baseline gap-2 min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ink-200 mt-0.5 font-mono shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="min-w-0">
                    <span className="display italic text-[17px] text-ink leading-tight block">{o.label}</span>
                    {o.description && (
                      <span className="text-[12px] text-ink-300 leading-snug block mt-0.5">{o.description}</span>
                    )}
                  </span>
                </span>
                <span className="text-ink-300 group-hover:text-sage-500 transition-colors shrink-0" aria-hidden>→</span>
              </button>
            ))}
            {ui.allowOther && (
              <button
                onClick={() => onChoose("Something else")}
                className="text-[12px] text-ink-300 hover:text-ink mt-1 px-3.5 py-1.5 text-left transition-colors"
              >
                Something else…
              </button>
            )}
          </div>
        </div>
      );
    case "confirm":
      return (
        <div className="rounded-2xl border hairline bg-white/85 p-3.5 shadow-card animate-fade-in-soft">
          {ui.question && (
            <div className="text-[14px] text-ink leading-snug mb-3">{ui.question}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onChoose(ui.no || "No")}
              className="flex-1 rounded-full border hairline bg-white text-ink-400 hover:bg-paper-200/70 hover:text-ink px-4 py-2 text-[13px] font-medium transition-all"
            >
              {ui.no || "No"}
            </button>
            <button
              onClick={() => onChoose(ui.yes || "Yes")}
              className="flex-1 rounded-full bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-[13px] font-medium transition-all"
              style={{ boxShadow: "0 8px 22px -10px rgba(79,93,68,0.55)" }}
            >
              {ui.yes || "Yes"}
            </button>
          </div>
        </div>
      );
    case "summary":
      return (
        <div className="rounded-2xl border hairline bg-white/90 overflow-hidden shadow-card animate-fade-in-soft">
          <div className="px-4 pt-3 pb-2 border-b hairline">
            <div className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-0.5">Summary</div>
            <div className="display text-[18px] text-ink leading-tight">{ui.title}</div>
          </div>
          <dl className="px-4 py-3 grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            {ui.rows.map((r, i) => (
              <div key={i} className="contents">
                <dt className="text-ink-300">{r.label}</dt>
                <dd className="text-ink font-medium truncate">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "quick_replies":
      return (
        <div className="flex flex-wrap gap-1.5 mt-1 animate-fade-in-soft">
          {ui.replies.map((r, i) => (
            <button
              key={i}
              onClick={() => onChoose(r)}
              className="rounded-full border hairline bg-white/70 hover:bg-white hover:border-sage-300 px-3 py-1.5 text-[12.5px] text-ink-400 hover:text-ink transition-all"
            >
              {r}
            </button>
          ))}
        </div>
      );
  }
}

// ----------------------------------------------------------------------- md -

// Lightweight inline + block Markdown. Supports:
//  ## Heading      → h3
//  - bullet item   → ul
//  **bold**        → <strong>
//  *italic* / _i_  → <em>
//  `code`          → <code>
//  blank line      → paragraph break
//
// Anything else is plain text. Safe-by-default (no HTML interpretation).
function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-1.5">
      {blocks.map((b, i) => {
        if (b.kind === "h") {
          return (
            <div key={i} className="display text-[17px] text-ink mt-1.5 first:mt-0 leading-tight">
              <Inline text={b.text} />
            </div>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={i} className="list-none pl-0 space-y-1">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-sage-500 leading-relaxed select-none">·</span>
                  <span className="flex-1"><Inline text={it} /></span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="leading-relaxed">
            <Inline text={b.text} />
          </p>
        );
      })}
    </div>
  );
}

type Block = { kind: "p" | "h"; text: string } | { kind: "ul"; items: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let bullets: string[] | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushBullets = () => {
    if (bullets && bullets.length) blocks.push({ kind: "ul", items: bullets });
    bullets = null;
  };

  for (const raw of lines) {
    const line = raw;
    if (/^\s*$/.test(line)) {
      flushPara();
      flushBullets();
      continue;
    }
    const h = line.match(/^\s*##\s+(.+)$/);
    if (h) {
      flushPara();
      flushBullets();
      blocks.push({ kind: "h", text: h[1].trim() });
      continue;
    }
    const bul = line.match(/^\s*[-•]\s+(.+)$/);
    if (bul) {
      flushPara();
      if (!bullets) bullets = [];
      bullets.push(bul[1].trim());
      continue;
    }
    flushBullets();
    para.push(line.trim());
  }
  flushPara();
  flushBullets();
  return blocks;
}

// Inline: bold / italic / code. Returns react nodes safely.
function Inline({ text }: { text: string }) {
  // Order matters: bold first (so ** doesn't get eaten by italic).
  const tokens = tokenize(text);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === "b") return <strong key={i}>{t.value}</strong>;
        if (t.type === "i") return <em key={i}>{t.value}</em>;
        if (t.type === "c")
          return (
            <code key={i} className="font-mono text-[12.5px] bg-paper-200/70 rounded px-1 py-px">
              {t.value}
            </code>
          );
        return <span key={i}>{t.value}</span>;
      })}
    </>
  );
}

type Tok = { type: "t" | "b" | "i" | "c"; value: string };
function tokenize(text: string): Tok[] {
  // Greedy regex over **bold**, *italic* / _italic_, `code`. Keeps the rest as text.
  const out: Tok[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "t", value: text.slice(last, m.index) });
    if (m[2] != null) out.push({ type: "b", value: m[2] });
    else if (m[4] != null) out.push({ type: "i", value: m[4] });
    else if (m[6] != null) out.push({ type: "i", value: m[6] });
    else if (m[8] != null) out.push({ type: "c", value: m[8] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ type: "t", value: text.slice(last) });
  return out;
}
