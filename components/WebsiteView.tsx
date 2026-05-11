"use client";

// Wedding website editor.
//
// Hero panel with the public URL and section toggles, then a stack of
// editable content cards (story, travel guide, FAQs), and a Smart RSVP
// section where the couple curates which custom questions guests answer
// when they reply. Question routing tags show which agent each answer
// feeds. Larder for dietary, Cantor for songs, etc.

import { useState } from "react";
import Link from "next/link";
import type { ProjectState, RsvpQuestion } from "@/lib/types";
import { useProject } from "./StateProvider";
import { Reveal } from "./Atmosphere";

const ROUTE_LABEL: Record<NonNullable<RsvpQuestion["routesTo"]>, string> = {
  larder: "→ Larder (dietary)",
  cantor: "→ Cantor (playlist)",
  quartermaster: "→ Quartermaster (welcome bag)",
  cartographer: "→ Cartographer (seating)",
  none: "",
};

export function WebsiteView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object, key: string) => {
    setBusy(key);
    setError(null);
    try {
      const r = await fetch("/api/site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) setError(j.error ?? `Error ${r.status}`);
      if (j.state) setState(j.state);
    } finally {
      setBusy(null);
    }
  };

  const site = state.site;
  const briefLocked = !!state.brief?.locked;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Wedding website
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            Wedding website.
          </h1>
          {site && (
            <a
              href={`/wed/${site.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] uppercase tracking-[0.18em] text-ink hover:text-sage-500 transition-colors"
            >
              Preview live →
            </a>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          The public site at{" "}
          <span className="font-mono text-ink">aisle.wedding/{site?.slug ?? "your-names"}</span>.
          Schedule, smart RSVP, travel guide, registry links, FAQs.
        </p>
      </header>

      {!briefLocked && !site && (
        <div className="rounded-card border hairline bg-white/60 px-5 py-4 text-[14px]">
          Seal the dossier first.{" "}
          <Link href="/dossier" className="underline-offset-4 underline hover:text-sage-500">
            Open dossier
          </Link>
          .
        </div>
      )}

      {error && <p className="text-sm text-risk-high">{error}</p>}

      {!site ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No site yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Set up a wedding site for your guests. schedule, RSVP, travel guide, registry, FAQs. We'll start you off with three RSVP questions (meal choice, dietary needs, a song request) and we'll feed the answers right back into your menu and music.
            </p>
            <button
              onClick={() => post({ op: "init" }, "init")}
              disabled={busy !== null || !briefLocked}
              className="btn-primary mt-5"
            >
              {busy === "init" ? "Initializing…" : "Initialize wedding site"}
            </button>
          </div>
        </Reveal>
      ) : (
        <>
          {/* Section toggles */}
          <Reveal>
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
                What's published
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Toggle
                  label="Schedule"
                  hint="Pre-events, ceremony, reception, brunch"
                  on={site.schedulePublished}
                  onClick={() => post({ op: "update", patch: { schedulePublished: !site.schedulePublished } }, "sp")}
                />
                <Toggle
                  label="RSVP form"
                  hint={`${site.customRsvpQuestions?.length ?? 0} custom questions`}
                  on={site.rsvpEnabled}
                  onClick={() => post({ op: "update", patch: { rsvpEnabled: !site.rsvpEnabled } }, "re")}
                />
                <Toggle
                  label="Registry"
                  hint="Cross-link your registry picks"
                  on={site.registryLinked}
                  onClick={() => post({ op: "update", patch: { registryLinked: !site.registryLinked } }, "rl")}
                />
              </div>
            </section>
          </Reveal>

          {/* Content fields */}
          <Reveal>
            <section className="grid gap-5">
              <h2 className="display italic text-[22px] text-ink leading-tight">
                Content
              </h2>
              <Field
                label="Hero text"
                defaultValue={site.hero}
                onSave={(v) => post({ op: "update", patch: { hero: v } }, "hero")}
              />
              <Field
                label="Story / about"
                defaultValue={site.story}
                onSave={(v) => post({ op: "update", patch: { story: v } }, "story")}
                multiline
              />
              <Field
                label="Travel guide"
                defaultValue={site.travelGuide}
                onSave={(v) => post({ op: "update", patch: { travelGuide: v } }, "tg")}
                multiline
              />
              <Field
                label="Optional password"
                defaultValue={site.password ?? ""}
                onSave={(v) => post({ op: "update", patch: { password: v } }, "pw")}
              />
            </section>
          </Reveal>

          {/* SMART RSVP. custom questions editor */}
          <Reveal>
            <section>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <h2 className="display italic text-[22px] text-ink leading-tight">
                    Smart RSVP
                  </h2>
                  <p className="text-[12.5px] text-ink-300 mt-1 leading-snug max-w-[52ch]">
                    Custom questions guests answer when they reply. Answers flow to the right specialist automatically.
                  </p>
                </div>
              </div>

              <ul className="flex flex-col gap-3">
                {(site.customRsvpQuestions ?? []).map((q) => (
                  <RsvpQuestionRow
                    key={q.id}
                    q={q}
                    onSave={(updated) => post({ op: "update_question", id: q.id, question: updated }, `uq-${q.id}`)}
                    onRemove={() => post({ op: "remove_question", id: q.id }, `rq-${q.id}`)}
                    busyKey={busy}
                  />
                ))}
              </ul>

              <RsvpQuestionAdder
                onAdd={(q) => post({ op: "add_question", question: q }, "add-q")}
                busy={busy === "add-q"}
              />
            </section>
          </Reveal>

          {/* FAQs */}
          <Reveal>
            <section>
              <h2 className="display italic text-[22px] text-ink leading-tight mb-4">FAQs</h2>
              <ul className="flex flex-col">
                {site.faqs.map((f, i) => (
                  <li
                    key={i}
                    className={`py-3.5 ${i < site.faqs.length - 1 ? "border-b hairline" : ""}`}
                  >
                    <div className="text-[14px] text-ink leading-snug">{f.q}</div>
                    <div className="text-[13px] text-ink-300 mt-1 leading-relaxed">{f.a}</div>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>

          {/* CTA */}
          <Reveal>
            <div className="flex items-center gap-4">
              <button
                onClick={() => post({ op: "propose_publish" }, "pub")}
                disabled={busy !== null}
                className="btn-primary"
              >
                {busy === "pub" ? "Queueing…" : "Propose publish"}
              </button>
              <span className="text-[11px] uppercase tracking-[0.22em] text-ink-300">
                Lands as an Approval Card
              </span>
            </div>
          </Reveal>
        </>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function RsvpQuestionRow({
  q, onSave, onRemove, busyKey,
}: {
  q: RsvpQuestion;
  onSave: (updated: Omit<RsvpQuestion, "id">) => void;
  onRemove: () => void;
  busyKey: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RsvpQuestion>(q);

  if (!editing) {
    return (
      <li className="surface rounded-card card-shell px-5 py-4 group flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="display italic text-[18px] text-ink leading-snug">
              {q.question}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-sage-500 font-mono">
              {q.kind === "yes_no" ? "Yes / No" : q.kind === "choice" ? "Choice" : "Open text"}
            </span>
            {q.required && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">required</span>
            )}
            {q.appliesToOnlyAttending && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">attending only</span>
            )}
          </div>
          {q.kind === "choice" && q.options && q.options.length > 0 && (
            <div className="text-[12.5px] text-ink-300 mt-1.5 font-mono">
              {q.options.join(" · ")}
            </div>
          )}
          {q.routesTo && q.routesTo !== "none" && (
            <div className="text-[10px] uppercase tracking-[0.2em] text-sage-500/80 font-mono mt-1.5">
              {ROUTE_LABEL[q.routesTo]}
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] uppercase tracking-[0.2em] text-ink-300 hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Edit
          </button>
          <button
            onClick={onRemove}
            disabled={busyKey === `rq-${q.id}`}
            className="text-[10px] uppercase tracking-[0.2em] text-risk-high/70 hover:text-risk-high opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Remove
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-card border hairline bg-white/85 p-5 grid gap-3 animate-fade-in-soft">
      <Field
        label="Question"
        defaultValue={draft.question}
        onSave={(v) => setDraft({ ...draft, question: v })}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select
          label="Type"
          value={draft.kind}
          options={[
            { v: "text", label: "Open text" },
            { v: "choice", label: "Choice" },
            { v: "yes_no", label: "Yes / No" },
          ]}
          onChange={(v) => setDraft({ ...draft, kind: v as RsvpQuestion["kind"] })}
        />
        <Select
          label="Routes to"
          value={draft.routesTo ?? "none"}
          options={[
            { v: "none", label: "None" },
            { v: "larder", label: "Larder · dietary" },
            { v: "cantor", label: "Cantor · playlist" },
            { v: "quartermaster", label: "Quartermaster · welcome bag" },
            { v: "cartographer", label: "Cartographer · seating" },
          ]}
          onChange={(v) => setDraft({ ...draft, routesTo: v as RsvpQuestion["routesTo"] })}
        />
        <div className="flex items-end gap-4">
          <Checkbox
            label="Required"
            checked={!!draft.required}
            onChange={(b) => setDraft({ ...draft, required: b })}
          />
          <Checkbox
            label="Attending only"
            checked={!!draft.appliesToOnlyAttending}
            onChange={(b) => setDraft({ ...draft, appliesToOnlyAttending: b })}
          />
        </div>
      </div>
      {draft.kind === "choice" && (
        <Field
          label="Options (comma-separated)"
          defaultValue={(draft.options ?? []).join(", ")}
          onSave={(v) =>
            setDraft({
              ...draft,
              options: v.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
        />
      )}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => {
            const { ...rest } = draft;
            onSave(rest);
            setEditing(false);
          }}
          className="btn-primary"
          style={{ paddingInline: "1.2rem", paddingBlock: "0.55rem" }}
        >
          Save
        </button>
        <button
          onClick={() => {
            setDraft(q);
            setEditing(false);
          }}
          className="text-[11px] uppercase tracking-[0.2em] text-ink-300 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}

function RsvpQuestionAdder({
  onAdd, busy,
}: {
  onAdd: (q: Omit<RsvpQuestion, "id">) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [kind, setKind] = useState<RsvpQuestion["kind"]>("text");
  const [optionsRaw, setOptionsRaw] = useState("");
  const [routesTo, setRoutesTo] = useState<RsvpQuestion["routesTo"]>("none");
  const [required, setRequired] = useState(false);
  const [attendingOnly, setAttendingOnly] = useState(true);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 text-[11px] uppercase tracking-[0.2em] text-ink hover:text-sage-500 transition-colors self-start"
      >
        + Add question
      </button>
    );
  }

  const submit = () => {
    if (!question.trim()) return;
    onAdd({
      question: question.trim(),
      kind,
      options: kind === "choice" ? optionsRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      routesTo,
      required,
      appliesToOnlyAttending: attendingOnly,
    });
    setOpen(false);
    setQuestion("");
    setOptionsRaw("");
    setKind("text");
    setRoutesTo("none");
    setRequired(false);
    setAttendingOnly(true);
  };

  return (
    <div className="mt-4 rounded-card border hairline bg-white/85 p-5 grid gap-3 animate-fade-in-soft">
      <Field label="Question" defaultValue="" onSave={setQuestion} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select
          label="Type"
          value={kind}
          options={[
            { v: "text", label: "Open text" },
            { v: "choice", label: "Choice" },
            { v: "yes_no", label: "Yes / No" },
          ]}
          onChange={(v) => setKind(v as RsvpQuestion["kind"])}
        />
        <Select
          label="Routes to"
          value={routesTo ?? "none"}
          options={[
            { v: "none", label: "None" },
            { v: "larder", label: "Larder · dietary" },
            { v: "cantor", label: "Cantor · playlist" },
            { v: "quartermaster", label: "Quartermaster · welcome bag" },
            { v: "cartographer", label: "Cartographer · seating" },
          ]}
          onChange={(v) => setRoutesTo(v as RsvpQuestion["routesTo"])}
        />
        <div className="flex items-end gap-4">
          <Checkbox label="Required" checked={required} onChange={setRequired} />
          <Checkbox label="Attending only" checked={attendingOnly} onChange={setAttendingOnly} />
        </div>
      </div>
      {kind === "choice" && (
        <Field
          label="Options (comma-separated)"
          defaultValue=""
          onSave={setOptionsRaw}
        />
      )}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={submit}
          disabled={busy || !question.trim()}
          className="btn-primary"
          style={{ paddingInline: "1.2rem", paddingBlock: "0.55rem" }}
        >
          {busy ? "…" : "Add"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] uppercase tracking-[0.2em] text-ink-300 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------

function Field({
  label, defaultValue, onSave, multiline,
}: {
  label: string;
  defaultValue: string;
  onSave: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">{label}</span>
      {multiline ? (
        <textarea
          defaultValue={defaultValue}
          onBlur={(e) => onSave(e.target.value)}
          rows={3}
          className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] leading-relaxed focus:outline-none focus:border-sage-300"
        />
      ) : (
        <input
          defaultValue={defaultValue}
          onBlur={(e) => onSave(e.target.value)}
          className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
        />
      )}
    </label>
  );
}

function Select({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { v: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-ink cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-sage-500"
      />
      <span className="uppercase tracking-[0.16em] text-[10.5px] text-ink-300 font-mono">
        {label}
      </span>
    </label>
  );
}

function Toggle({
  label, hint, on, onClick,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-card border px-4 py-3 transition-all ${
        on
          ? "bg-ink text-paper-50 border-ink"
          : "hairline bg-white/70 hover:bg-white hover:border-ink/20"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="display italic text-[17px] leading-tight">{label}</span>
        <span className={`text-[10px] uppercase tracking-[0.22em] font-mono ${on ? "text-sage-300" : "text-ink-300"}`}>
          {on ? "Live" : "Off"}
        </span>
      </div>
      {hint && (
        <div className={`text-[11.5px] mt-1 leading-snug ${on ? "text-paper-50/70" : "text-ink-300"}`}>
          {hint}
        </div>
      )}
    </button>
  );
}
