"use client";

// Toast. concierge-style notifications. Sage chip slides up from bottom,
// dwells for ~5s, fades out. Used for ambient signal (agent completed,
// approval resolved, scan finished). Never blocks; never modal.
//
// Usage anywhere inside the app:
//   const { notify } = useToast();
//   notify({ kind: "agent", title: "Designer drafted three directions" });
//
// Tones:
//   • "agent"     . sage; agent completed background work
//   • "approval"  . sage; approval card resolved
//   • "info"      . neutral
//   • "warn"      . amber
//   • "error"     . oxblood

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ToastKind = "agent" | "approval" | "info" | "warn" | "error";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  detail?: string;
  agent?: string;     // small caps prefix, e.g. "Designer"
  /** ms; default 5000. Set null for sticky. */
  duration?: number | null;
  /** Optional click-action. e.g. jump to /approvals. */
  hrefOnClick?: string;
}

type Ctx = {
  toasts: Toast[];
  notify: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
    const t = timers.current[id];
    if (t) { clearTimeout(t); delete timers.current[id]; }
  }, []);

  const notify = useCallback((t: Omit<Toast, "id">) => {
    const id = `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((cur) => [...cur, { ...t, id }]);
    const dur = t.duration === null ? null : (t.duration ?? 5000);
    if (dur !== null) {
      timers.current[id] = setTimeout(() => dismiss(id), dur);
    }
    return id;
  }, [dismiss]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
  }, []);

  return (
    <ToastCtx.Provider value={{ toasts, notify, dismiss }}>
      {children}
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ---------- Stack ----------

function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] flex flex-col-reverse items-stretch gap-2 pointer-events-none"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 96px)",
        width: "min(420px, calc(100% - 2rem))",
      }}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.slice(-5).map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

const KIND_DOT: Record<ToastKind, string> = {
  agent:    "bg-sage-400",
  approval: "bg-sage-500",
  info:     "bg-ink-300",
  warn:     "bg-risk-medium",
  error:    "bg-risk-high",
};

const KIND_BORDER: Record<ToastKind, string> = {
  agent:    "border-sage-300/40",
  approval: "border-sage-300/60",
  info:     "border-ink/10",
  warn:     "border-risk-medium/40",
  error:    "border-risk-high/40",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const inner = (
    <div className="flex items-start gap-3">
      <span
        className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${KIND_DOT[toast.kind]}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {toast.agent && (
          <div className="text-[10px] uppercase tracking-[0.22em] font-mono text-sage-500 mb-0.5">
            {toast.agent}
          </div>
        )}
        <div className="display italic text-[15.5px] text-ink leading-snug truncate">
          {toast.title}
        </div>
        {toast.detail && (
          <div className="text-[12.5px] text-ink-300 leading-snug mt-0.5 line-clamp-2">
            {toast.detail}
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
        aria-label="Dismiss"
        className="shrink-0 text-ink-200 hover:text-ink-400 transition-colors text-[18px] leading-none"
      >
        ×
      </button>
    </div>
  );

  const Wrapper = toast.hrefOnClick ? "a" : "div";

  return (
    <Wrapper
      {...(toast.hrefOnClick ? { href: toast.hrefOnClick } : {})}
      onClick={() => { /* let href navigate */ }}
      className={`pointer-events-auto rounded-card border hairline ${KIND_BORDER[toast.kind]} bg-white/95 backdrop-blur shadow-cardHover px-4 py-3 transition-all duration-300 hover:shadow-card animate-toast-rise ${toast.hrefOnClick ? "cursor-pointer hover:bg-paper-50" : ""}`}
      style={{
        boxShadow: "0 14px 36px -18px rgba(14,14,12,0.20), 0 4px 14px -8px rgba(79,93,68,0.18)",
      }}
    >
      {inner}
    </Wrapper>
  );
}
