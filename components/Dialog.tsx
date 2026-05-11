"use client";

// Dialog system. replaces every window.confirm() and window.prompt() in
// the app with a luxury concierge surface that matches the product's voice.
// Native browser dialogs look like 1995 and break the editorial register.
//
// Usage:
//   const dialog = useDialog();
//   const ok = await dialog.confirm({ title: "Disconnect Gmail?",
//                                     body: "You can reconnect anytime." });
//   const note = await dialog.prompt({ title: "Trigger note",
//                                      placeholder: "What's happening?" });
//   const data = await dialog.form({ title: "New hotel block",
//     fields: [
//       { id: "hotel", label: "Hotel", type: "text", required: true },
//       { id: "rooms", label: "Rooms", type: "number", default: "20" },
//     ]});

import { createContext, useCallback, useContext, useState } from "react";

export type DialogField = {
  id: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea";
  default?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
};

interface ConfirmOpts {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tone the confirm button. "danger" gets oxblood styling for destructive ops. */
  tone?: "primary" | "danger";
}
interface PromptOpts {
  title: string;
  body?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  type?: "text" | "number" | "date" | "textarea";
  confirmLabel?: string;
}
interface FormOpts {
  title: string;
  body?: string;
  fields: DialogField[];
  confirmLabel?: string;
}

type Pending =
  | { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void }
  | { kind: "form"; opts: FormOpts; resolve: (v: Record<string, string> | null) => void };

interface Ctx {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  prompt: (opts: PromptOpts) => Promise<string | null>;
  form: (opts: FormOpts) => Promise<Record<string, string> | null>;
}

const DialogCtx = createContext<Ctx | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((opts: ConfirmOpts) =>
    new Promise<boolean>((resolve) => setPending({ kind: "confirm", opts, resolve })), []);
  const promptFn = useCallback((opts: PromptOpts) =>
    new Promise<string | null>((resolve) => setPending({ kind: "prompt", opts, resolve })), []);
  const formFn = useCallback((opts: FormOpts) =>
    new Promise<Record<string, string> | null>((resolve) => setPending({ kind: "form", opts, resolve })), []);

  const close = (value: unknown) => {
    if (!pending) return;
    if (pending.kind === "confirm") (pending.resolve as (v: boolean) => void)(value as boolean);
    else if (pending.kind === "prompt") (pending.resolve as (v: string | null) => void)(value as string | null);
    else (pending.resolve as (v: Record<string, string> | null) => void)(value as Record<string, string> | null);
    setPending(null);
  };

  return (
    <DialogCtx.Provider value={{ confirm, prompt: promptFn, form: formFn }}>
      {children}
      {pending && (
        <DialogShell pending={pending} onClose={close} />
      )}
    </DialogCtx.Provider>
  );
}

export function useDialog(): Ctx {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error("useDialog must be used inside <DialogProvider>");
  return ctx;
}

// ----------------------------------------------------------------------
function DialogShell({ pending, onClose }: { pending: Pending; onClose: (v: unknown) => void }) {
  if (pending.kind === "confirm") return <ConfirmShell opts={pending.opts} onClose={onClose} />;
  if (pending.kind === "prompt") return <PromptShell opts={pending.opts} onClose={onClose} />;
  return <FormShell opts={pending.opts} onClose={onClose} />;
}

function Backdrop({ children, onCancel }: { children: React.ReactNode; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: "rgba(20,22,18,0.5)",
        backdropFilter: "saturate(140%) blur(8px)",
      }}
      onMouseDown={onCancel}
      onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
    >
      <div
        className="w-full max-w-md surface rounded-card border hairline shadow-cardHover p-6 animate-toast-rise"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ConfirmShell({ opts, onClose }: { opts: ConfirmOpts; onClose: (v: unknown) => void }) {
  return (
    <Backdrop onCancel={() => onClose(false)}>
      <h2 className="display text-[22px] text-ink leading-tight">{opts.title}</h2>
      {opts.body && <p className="text-[13.5px] text-ink-300 mt-3 leading-relaxed">{opts.body}</p>}
      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={() => onClose(false)}
          className="rounded-full border hairline bg-white/70 hover:bg-white text-ink-400 hover:text-ink px-4 py-2 text-[12.5px] transition-all"
        >
          {opts.cancelLabel ?? "Cancel"}
        </button>
        <button
          onClick={() => onClose(true)}
          autoFocus
          className={`rounded-full px-5 py-2 text-[12.5px] font-semibold transition-all text-paper-50 ${
            opts.tone === "danger" ? "bg-risk-high hover:bg-risk-high/90" : "cta-sage"
          }`}
        >
          {opts.confirmLabel ?? "Confirm"}
        </button>
      </div>
    </Backdrop>
  );
}

function PromptShell({ opts, onClose }: { opts: PromptOpts; onClose: (v: unknown) => void }) {
  const [value, setValue] = useState(opts.defaultValue ?? "");
  const ok = () => onClose(value);
  const isTextarea = opts.type === "textarea";
  return (
    <Backdrop onCancel={() => onClose(null)}>
      <h2 className="display text-[22px] text-ink leading-tight">{opts.title}</h2>
      {opts.body && <p className="text-[13.5px] text-ink-300 mt-3 leading-relaxed">{opts.body}</p>}
      <div className="mt-4">
        {opts.label && (
          <label className="block text-[10.5px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
            {opts.label}
          </label>
        )}
        {isTextarea ? (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={opts.placeholder}
            rows={3}
            className="w-full rounded-2xl border hairline bg-white px-4 py-3 text-[14px] focus:outline-none focus:border-sage-300 leading-relaxed"
          />
        ) : (
          <input
            autoFocus
            type={opts.type ?? "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ok(); }}
            placeholder={opts.placeholder}
            className="w-full rounded-2xl border hairline bg-white px-4 py-3 text-[14px] focus:outline-none focus:border-sage-300"
          />
        )}
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={() => onClose(null)}
          className="rounded-full border hairline bg-white/70 hover:bg-white text-ink-400 hover:text-ink px-4 py-2 text-[12.5px] transition-all"
        >
          Cancel
        </button>
        <button
          onClick={ok}
          className="rounded-full cta-sage px-5 py-2 text-[12.5px] font-semibold transition-all"
        >
          {opts.confirmLabel ?? "Save"}
        </button>
      </div>
    </Backdrop>
  );
}

function FormShell({ opts, onClose }: { opts: FormOpts; onClose: (v: unknown) => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const f of opts.fields) out[f.id] = f.default ?? "";
    return out;
  });
  const submit = () => {
    for (const f of opts.fields) {
      if (f.required && !values[f.id]?.trim()) {
        return; // keep open
      }
    }
    onClose(values);
  };
  return (
    <Backdrop onCancel={() => onClose(null)}>
      <h2 className="display text-[22px] text-ink leading-tight">{opts.title}</h2>
      {opts.body && <p className="text-[13.5px] text-ink-300 mt-3 leading-relaxed">{opts.body}</p>}
      <div className="mt-4 flex flex-col gap-3">
        {opts.fields.map((f, i) => (
          <div key={f.id}>
            <label className="block text-[10.5px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-1.5">
              {f.label}{f.required ? " *" : ""}
            </label>
            {f.type === "textarea" ? (
              <textarea
                autoFocus={i === 0}
                value={values[f.id]}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                rows={3}
                className="w-full rounded-2xl border hairline bg-white px-4 py-2.5 text-[14px] focus:outline-none focus:border-sage-300 leading-relaxed"
              />
            ) : (
              <input
                autoFocus={i === 0}
                type={f.type ?? "text"}
                value={values[f.id]}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" && i === opts.fields.length - 1) submit(); }}
                placeholder={f.placeholder}
                className="w-full rounded-2xl border hairline bg-white px-4 py-2.5 text-[14px] focus:outline-none focus:border-sage-300"
              />
            )}
            {f.hint && <p className="text-[11.5px] text-ink-300 mt-1 italic">{f.hint}</p>}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={() => onClose(null)}
          className="rounded-full border hairline bg-white/70 hover:bg-white text-ink-400 hover:text-ink px-4 py-2 text-[12.5px] transition-all"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="rounded-full cta-sage px-5 py-2 text-[12.5px] font-semibold transition-all"
        >
          {opts.confirmLabel ?? "Save"}
        </button>
      </div>
    </Backdrop>
  );
}
