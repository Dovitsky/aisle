"use client";

// ChatDock. the always-visible liquid-glass conversation surface.
//
// The dock supports rich agent messages: light Markdown (bold, italic, lists,
// headings) and structured UI blocks (choice cards, confirm buttons, summary
// cards, quick replies) that the Maestro emits via tools.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import type { ChatMessage, ChatUI, ProjectState } from "@/lib/types";
import { maestroName } from "@/lib/displayName";
import { pageContextForPath } from "@/lib/pageContext";
import { ThoughtStream } from "./ThoughtStream";

export function ChatDock() {
  const { state, setState, pollForUpdates, chatOpen, setChatOpen, pendingChatPrompt, clearPendingChatPrompt } = useProject();
  const { notify } = useToast();
  const pathname = usePathname();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const open = chatOpen;
  const setOpen = setChatOpen;
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

  // Other surfaces (vendor detail, brief loaded handoff, etc.) push a
  // ready-made prompt into the dock via sendChatMessage(). When that lands,
  // open the panel and fire it as if the user typed it. Clear immediately so
  // a re-render doesn't double-send.
  useEffect(() => {
    if (!pendingChatPrompt) return;
    if (!state) return;
    setOpen(true);
    void send(pendingChatPrompt);
    clearPendingChatPrompt();
    // Intentionally exclude `send` from deps. we only want to fire on the
    // prompt landing, not on every render of the send callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatPrompt, state, setOpen, clearPendingChatPrompt]);

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
      const ctx = pageContextForPath(pathname);
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: msg, pageContext: ctx ?? undefined }),
      });
      const j = (await r.json()) as {
        state?: ProjectState;
        dispatched?: string[];
        error?: string;
      };
      if (j.state) {
        // If the brief just transitioned to locked OR Scout was kicked off
        // post-pivot, the server fired Scout in the background. Poll for the
        // resulting vendors + approval cards.
        const wasLocked = state?.brief?.locked ?? false;
        const isLocked = j.state.brief?.locked ?? false;
        const justLocked = !wasLocked && isLocked;
        const dispatched = j.dispatched ?? [];
        const lastReply = (j.state.chat[j.state.chat.length - 1]?.content ?? "").toLowerCase();
        const refireSignal = isLocked && (lastReply.includes("scout") || lastReply.includes("re-run"));
        if (justLocked || refireSignal) {
          pollForUpdates(120_000);
        }

        // Concierge toasts for the two big chat-driven moments.
        if (justLocked) {
          notify({
            kind: "agent",
            agent: "Maestro",
            title: "Right. we're off.",
            detail: "Scout, Designer, and Treasurer are at it. cards will appear as they finish. Won't be long.",
            hrefOnClick: "/",
          });
        } else if (
          isLocked
          && dispatched.includes("dispatch_email_vendor")
        ) {
          notify({
            kind: "agent",
            agent: "Outreach",
            title: "Email drafted for your approval",
            detail: "Open the home queue to review before it sends.",
            hrefOnClick: "/",
          });
        } else if (refireSignal && !justLocked) {
          notify({
            kind: "agent",
            agent: "Scout",
            title: "Re-running the shortlist",
            detail: "Your pivot just opened a fresh search.",
            hrefOnClick: "/vendors",
          });
        }

        setState(j.state);
      }
      if (j.error) setError(j.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }, [draft, state, setState, pathname, pollForUpdates, setOpen, notify]);

  const resolveUI = (msgId: string, replyText: string) => {
    setAnswered((prev) => new Set(prev).add(msgId));
    void send(replyText);
  };

  // Duplicate pendingChatPrompt effect removed. the effect at the top
  // of this component already handles cross-surface chat triggers.

  if (!state) return null;
  const me = maestroName(state);
  const disabled = state.paused || state.dayOfMode || sending;

  // If the latest agent reply ends with a question, prompt the user to answer
  // it directly. generic "tell Maestro anything" copy is wrong when Maestro
  // just asked a specific thing.
  const lastAgent = [...state.chat].reverse().find((m) => m.role === "agent");
  const lastAgentEndsInQuestion =
    !!lastAgent?.content && /\?\s*$/.test(lastAgent.content.trim());

  const placeholder = state.paused
    ? "Paused. Resume in settings."
    : state.dayOfMode
    ? "Today is the wedding. The dock is quiet."
    : lastAgentEndsInQuestion
    ? "Type your answer…"
    : state.brief?.locked
    ? `Ask ${me}…`
    : `Tell ${me} anything. the date you're thinking, the city, the feeling.`;

  // Recent chat tail to show when expanded.
  const tail = state.chat.slice(-8);
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <>
      {/* Closed-state launcher. A whisper, not a shout. a small soft
          ivory circle in the bottom-right corner, semi-transparent until
          hover/tap. No visible name label (the `title` attribute supplies
          the tooltip on desktop hover). The /timeline page embeds Maestro
          inline so the floating button is suppressed there. */}
      {!open && pathname !== "/timeline" && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Open ${me}`}
          title={`Open ${me}`}
          className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "saturate(160%) blur(10px)",
            WebkitBackdropFilter: "saturate(160%) blur(10px)",
            border: "1px solid rgba(14,15,13,0.10)",
            boxShadow:
              "0 6px 18px -8px rgba(14,15,13,0.22), 0 2px 4px -1px rgba(14,15,13,0.06)",
            opacity: 0.7,
            touchAction: "manipulation",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.7";
          }}
        >
          {/* Minimal chat-bubble glyph in ink. */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1A1A18"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />
          </svg>
        </button>
      )}

      {/* Mobile-only backdrop when the panel is open. taps anywhere outside
          the panel close it. Hidden on lg+ where the panel reflows the page. */}
      {open && (
        <button
          type="button"
          aria-label="Close Maestro"
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-ink/30 backdrop-blur-[2px] animate-fade-in-soft"
        />
      )}

      {/* The panel itself. full-height, docked to the right.
          On lg+ it sits beside the page content (AppShell adds matching
          right-padding so nothing is ever hidden behind it).
          On mobile it overlays as a slide-in over the backdrop above. */}
      <aside
        className={`fixed top-0 right-0 z-40 h-[100dvh] flex flex-col
          chat-ivory transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{
          width: "min(440px, 92vw)",
        }}
        aria-hidden={!open}
        aria-label="Maestro chat"
      >
        {/* Panel header. Pure-white, flat. Name + status + close. */}
        <header className="relative px-6 pt-6 pb-5 shrink-0 z-10 border-b border-ink/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="chat-orbit-ivory" aria-hidden>
                <span className="chat-orbit-ivory__core" />
              </span>
              <div className="min-w-0 flex items-baseline gap-2">
                <h2
                  className="leading-none"
                  style={{
                    fontFamily:
                      '"Cormorant Garamond","Cormorant",Georgia,serif',
                    fontWeight: 500,
                    fontSize: 20,
                    letterSpacing: "-0.005em",
                    color: "#1A1A18",
                  }}
                >
                  {me}
                </h2>
                <p
                  className="text-[10px] uppercase tracking-[0.22em] font-mono"
                  style={{ color: "rgba(26,26,24,0.42)" }}
                >
                  {sending
                    ? "composing"
                    : state.brief?.locked
                    ? "concierge"
                    : "listening"}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close Maestro"
              onClick={() => setOpen(false)}
              className="w-7 h-7 inline-flex items-center justify-center rounded-full text-ink/40 hover:text-ink hover:bg-ink/[0.04] transition-all"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        {/* Conversation tail. fills available height between header and
            input. Empty-state hint when no messages yet. */}
        <div
          ref={scrollRef}
          className="relative flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-5 flex flex-col gap-4 z-10"
        >
          {tail.length === 0 ? (
            <div className="m-auto text-center max-w-[300px] py-8">
              <p
                className="text-[18px] leading-tight"
                style={{ color: "#1A1A18", fontWeight: 500 }}
              >
                {state.brief?.locked
                  ? `Ask ${me} anything.`
                  : "Tell me about your wedding."}
              </p>
              <p className="text-[13px] leading-relaxed mt-2 chat-ink-soft">
                {state.brief?.locked
                  ? "Vendors, budget, the day-of timeline. I hold the whole picture, including the bits you'd rather not think about."
                  : "Names, the date, where, the feeling. Start anywhere. I'll do the tidying."}
              </p>
            </div>
          ) : (
            <>
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
                <div className="pl-1 animate-fade-in-soft">
                  <ThoughtStream kind="chat-thinking" size="sm" tone="ink" intervalMs={1800} />
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="relative px-5 pb-2 text-[12px] animate-fade-in-soft shrink-0 z-10" style={{ color: "#A8341A" }}>
            {error}
          </div>
        )}

        {/* Command bar. Flat. Textarea + send button. */}
        <div
          className="chat-cmd-bar-ivory flex items-end gap-3 px-5 py-4 shrink-0 z-10"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
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
            className="chat-input-ivory flex-1 resize-none bg-transparent border-none outline-none py-2 text-[15px] leading-relaxed disabled:opacity-50 max-h-32"
          />

          <button
            onClick={() => send()}
            disabled={disabled || !draft.trim()}
            aria-label="Send"
            className="chat-send-ink shrink-0 inline-flex items-center justify-center"
          >
            {sending ? (
              <span className="inline-block w-2 h-2 rounded-full bg-paper-50 animate-pulse-soft" />
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>
      </aside>
    </>
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
      {showAgent && (
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono mb-1 px-1 chat-ink-faint inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-1 h-1 rounded-full bg-sage-500" />
          {msg.agent}
        </div>
      )}
      {msg.content && (
        <div
          className={`max-w-[92%] text-[14px] leading-relaxed ${
            isUser
              ? "chat-bubble-user-ivory rounded-2xl rounded-br-md px-3.5 py-2"
              : "chat-bubble-agent-ivory text-[15px]"
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

      <time className="text-[10px] mt-1.5 px-1 chat-ink-hush font-mono tracking-[0.10em]">
        {fmtTime(msg.createdAt)}
      </time>
    </div>
  );
}

function UIBlock({ ui, onChoose }: { ui: ChatUI; onChoose: (text: string) => void }) {
  switch (ui.kind) {
    case "choice":
      return (
        <div className="chat-card-ivory rounded-2xl p-3 animate-fade-in-soft">
          {ui.question && (
            <div className="text-[13px] leading-snug mb-2.5 px-0.5 chat-ink-soft">{ui.question}</div>
          )}
          <div className="flex flex-col gap-1.5">
            {ui.options.map((o, i) => (
              <button
                key={o.id}
                onClick={() => onChoose(o.label)}
                className="group flex items-baseline justify-between gap-3 text-left rounded-xl border border-ink/10 hover:border-sage-deep/45 hover:bg-ink/[0.03] px-3.5 py-2.5 transition-all"
              >
                <span className="flex items-baseline gap-2 min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.22em] mt-0.5 font-mono shrink-0 chat-ink-faint">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="min-w-0">
                    <span className="display italic text-[17px] leading-tight block" style={{ color: "#1A1A18" }}>
                      {o.label}
                    </span>
                    {o.description && (
                      <span className="text-[12px] leading-snug block mt-0.5 chat-ink-soft">{o.description}</span>
                    )}
                  </span>
                </span>
                <span className="chat-ink-faint group-hover:text-sage-deep transition-colors shrink-0" aria-hidden>→</span>
              </button>
            ))}
            {ui.allowOther && (
              <button
                onClick={() => onChoose("Something else")}
                className="text-[12px] mt-1 px-3.5 py-1.5 text-left transition-colors chat-ink-faint hover:text-ink"
              >
                Something else…
              </button>
            )}
          </div>
        </div>
      );
    case "confirm":
      return (
        <div className="chat-card-ivory rounded-2xl p-3.5 animate-fade-in-soft">
          {ui.question && (
            <div className="text-[14px] leading-snug mb-3" style={{ color: "#1A1A18" }}>{ui.question}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onChoose(ui.no || "No")}
              className="flex-1 rounded-full border border-ink/14 bg-ink/[0.02] hover:bg-ink/[0.06] hover:border-ink/30 px-4 py-2 text-[13px] font-medium transition-all chat-ink-soft"
            >
              {ui.no || "No"}
            </button>
            <button
              onClick={() => onChoose(ui.yes || "Yes")}
              className="flex-1 rounded-full px-4 py-2 text-[13px] font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, #C7D1BD 0%, #6E8068 100%)",
                color: "#0E110F",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 22px -10px rgba(110,128,104,0.40)",
              }}
            >
              {ui.yes || "Yes"}
            </button>
          </div>
        </div>
      );
    case "summary":
      return (
        <div className="chat-card-ivory rounded-2xl overflow-hidden animate-fade-in-soft">
          <div className="px-4 pt-3 pb-2 border-b border-ink/10">
            <div className="text-[10px] uppercase tracking-[0.30em] font-mono mb-0.5" style={{ color: "#6E8068" }}>Summary</div>
            <div className="display text-[18px] leading-tight" style={{ color: "#1A1A18" }}>{ui.title}</div>
          </div>
          <dl className="px-4 py-3 grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            {ui.rows.map((r, i) => (
              <div key={i} className="contents">
                <dt className="chat-ink-faint">{r.label}</dt>
                <dd className="font-medium truncate" style={{ color: "#1A1A18" }}>{r.value}</dd>
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
              className="rounded-full border border-ink/12 bg-ink/[0.02] hover:bg-ink/[0.06] hover:border-sage-deep/45 px-3.5 py-1.5 text-[12.5px] transition-all chat-ink-soft hover:text-ink"
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
            <div
              key={i}
              className="display text-[17px] mt-1.5 first:mt-0 leading-tight"
              style={{ color: "#1A1A18" }}
            >
              <Inline text={b.text} />
            </div>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={i} className="list-none pl-0 space-y-1">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="leading-relaxed select-none" style={{ color: "#6E8068" }}>·</span>
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
