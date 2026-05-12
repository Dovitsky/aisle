"use client";

// Public guest-facing wedding website. Renders at /wed/[slug] with no auth,
// no internal Corsia chrome, no chat dock. Just the couple's site, the RSVP
// form, and the practical bits guests need (story, schedule, travel, FAQs).

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { RsvpQuestion } from "@/lib/types";

interface PublicPayload {
  site: {
    slug: string;
    hero: string;
    story: string;
    schedulePublished: boolean;
    rsvpEnabled: boolean;
    registryLinked: boolean;
    travelGuide: string;
    faqs: { q: string; a: string }[];
    customRsvpQuestions: RsvpQuestion[];
  };
  couple: {
    organizerName: string;
    partnerName: string;
    dateWindow: string;
    region: string;
  };
  schedule: { kind: string; date: string; location: string }[];
}

export default function WeddingSitePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [data, setData] = useState<PublicPayload | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/wed/${slug}`)
      .then(async (r) => {
        if (r.status === 404) { setMissing(true); return null; }
        return r.json();
      })
      .then((j: PublicPayload | null) => { if (j) setData(j); })
      .catch(() => setMissing(true));
  }, [slug]);

  if (missing) return <NotFound />;
  if (!data) return <Loading />;

  return <PublicSite data={data} slug={slug!} />;
}

// --------------------------------------------------------------------

function PublicSite({ data, slug }: { data: PublicPayload; slug: string }) {
  return (
    <div className="min-h-screen w-full bg-paper text-ink">
      {/* HERO */}
      <header className="relative px-6 lg:px-12 pt-16 pb-12 lg:pt-24 lg:pb-16 max-w-[900px] mx-auto">
        <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono">
          {data.couple.region}
        </p>
        <h1
          className="display mt-4 leading-[0.94] tracking-[-0.015em]"
          style={{
            fontFamily: '"Cormorant", "Cormorant Garamond", Georgia, serif',
            fontWeight: 300,
            fontSize: "clamp(48px, 9vw, 112px)",
          }}
        >
          {data.couple.organizerName}{" "}
          <span className="italic text-sage-500">&</span>{" "}
          {data.couple.partnerName}
        </h1>
        <p className="display italic text-ink-300 text-[20px] lg:text-[26px] mt-4">
          {data.couple.dateWindow}
        </p>
      </header>

      <Divider />

      {/* STORY */}
      <Section eyebrow="Welcome">
        <p className="text-[15.5px] lg:text-[16.5px] text-ink-400 leading-[1.7] max-w-[60ch] whitespace-pre-line">
          {data.site.story}
        </p>
      </Section>

      {/* RSVP */}
      {data.site.rsvpEnabled && (
        <>
          <Divider />
          <Section eyebrow="RSVP">
            <RsvpForm data={data} slug={slug} />
          </Section>
        </>
      )}

      {/* SCHEDULE */}
      {data.site.schedulePublished && data.schedule.length > 0 && (
        <>
          <Divider />
          <Section eyebrow="Schedule">
            <ul className="flex flex-col">
              {data.schedule.map((e, i) => (
                <li
                  key={i}
                  className={`py-3.5 grid grid-cols-[120px_1fr] gap-4 ${
                    i < data.schedule.length - 1 ? "border-b hairline" : ""
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-ink-300 font-mono">
                    {e.date}
                  </div>
                  <div>
                    <div className="display italic text-[18px] leading-tight">
                      {humanKind(e.kind)}
                    </div>
                    <div className="text-[13px] text-ink-300 mt-1">{e.location}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}

      {/* TRAVEL */}
      {data.site.travelGuide && (
        <>
          <Divider />
          <Section eyebrow="Travel">
            <p className="text-[15px] text-ink-400 leading-[1.7] max-w-[60ch] whitespace-pre-line">
              {data.site.travelGuide}
            </p>
          </Section>
        </>
      )}

      {/* FAQs */}
      {data.site.faqs.length > 0 && (
        <>
          <Divider />
          <Section eyebrow="FAQ">
            <ul className="flex flex-col">
              {data.site.faqs.map((f, i) => (
                <li
                  key={i}
                  className={`py-4 ${i < data.site.faqs.length - 1 ? "border-b hairline" : ""}`}
                >
                  <div className="display italic text-[18px] text-ink leading-snug">{f.q}</div>
                  <div className="text-[14px] text-ink-300 mt-1.5 leading-relaxed">{f.a}</div>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}

      <footer className="px-6 lg:px-12 py-12 max-w-[900px] mx-auto text-[10px] uppercase tracking-[0.32em] text-ink-200 font-mono text-center">
        corsia · {data.couple.organizerName} & {data.couple.partnerName}
      </footer>
    </div>
  );
}

// --------------------------------------------------------------------

type Stage =
  | { kind: "name" }
  | { kind: "answer"; name: string }
  | { kind: "submitting"; name: string }
  | { kind: "done"; name: string }
  | { kind: "error"; message: string; name?: string };

function RsvpForm({ data, slug }: { data: PublicPayload; slug: string }) {
  const [name, setName] = useState("");
  const [rsvp, setRsvp] = useState<"yes" | "maybe" | "no">("yes");
  const [plusOneName, setPlusOneName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<Stage>({ kind: "name" });

  const visibleQuestions = useMemo(
    () =>
      data.site.customRsvpQuestions.filter(
        (q) => !q.appliesToOnlyAttending || rsvp !== "no",
      ),
    [data.site.customRsvpQuestions, rsvp],
  );

  const proceedToAnswers = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStage({ kind: "answer", name: name.trim() });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = stage.kind === "answer" ? stage.name : name;
    setStage({ kind: "submitting", name: finalName });
    try {
      const r = await fetch(`/api/wed/${slug}/rsvp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          rsvp,
          plusOneName: plusOneName || undefined,
          answers,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string; name?: string };
      if (!r.ok || j.error) {
        setStage({ kind: "error", message: j.error ?? "Something went wrong.", name: finalName });
        return;
      }
      setStage({ kind: "done", name: j.name ?? finalName });
    } catch (err) {
      setStage({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
        name: finalName,
      });
    }
  };

  if (stage.kind === "done") {
    return (
      <div className="rounded-card border hairline bg-white/70 px-7 py-10 max-w-[520px]">
        <p className="display italic text-[28px] leading-tight text-ink">
          Thank you, {stage.name}.
        </p>
        <p className="text-[14.5px] text-ink-400 mt-3 leading-relaxed">
          {rsvp === "no"
            ? "We're sorry you can't make it — we'll miss you."
            : rsvp === "maybe"
              ? "We've noted you as a maybe. Drop us a line when you know."
              : "We've got your reply. We can't wait to celebrate with you."}
        </p>
      </div>
    );
  }

  if (stage.kind === "name") {
    return (
      <form onSubmit={proceedToAnswers} className="max-w-[520px]">
        <p className="text-[15px] text-ink-400 leading-relaxed mb-5">
          Type your name as it appears on your invitation.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="w-full rounded-lg border hairline bg-white px-4 py-3 text-[16px] focus:outline-none focus:border-sage-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="btn-primary mt-4"
          style={{ paddingInline: "1.4rem" }}
        >
          Find my invitation →
        </button>
      </form>
    );
  }

  // answer / submitting / error
  const submitting = stage.kind === "submitting";
  const errorMsg = stage.kind === "error" ? stage.message : null;

  return (
    <form onSubmit={submit} className="max-w-[640px] flex flex-col gap-7">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
          Hello, {stage.kind === "answer" ? stage.name : (stage.kind === "submitting" || stage.kind === "error") ? stage.name : name}
        </p>
        <p className="display italic text-[24px] text-ink leading-snug">
          Will you join us?
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-[420px]">
        {(["yes", "maybe", "no"] as const).map((r) => {
          const active = rsvp === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRsvp(r)}
              className={`rounded-full px-4 py-3 text-[13px] uppercase tracking-[0.2em] transition-all border ${
                active
                  ? r === "yes"
                    ? "bg-sage-500 text-paper-50 border-sage-500"
                    : r === "maybe"
                      ? "bg-sage-200 text-ink border-sage-300"
                      : "bg-ink-300 text-paper-50 border-ink-300"
                  : "bg-white border-ink/15 text-ink-300 hover:border-ink/40 hover:text-ink"
              }`}
            >
              {r === "yes" ? "Yes" : r === "maybe" ? "Maybe" : "Sorry, no"}
            </button>
          );
        })}
      </div>

      {/* Plus-one (only if attending) */}
      {rsvp !== "no" && (
        <Field
          label="Plus-one name (optional)"
          value={plusOneName}
          onChange={setPlusOneName}
          placeholder="Their full name"
        />
      )}

      {/* Custom questions */}
      {visibleQuestions.length > 0 && (
        <div className="flex flex-col gap-5">
          {visibleQuestions.map((q) => (
            <Question
              key={q.id}
              q={q}
              value={answers[q.id] ?? ""}
              onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
            />
          ))}
        </div>
      )}

      {errorMsg && (
        <p className="text-[13px] text-risk-high leading-relaxed">{errorMsg}</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{ paddingInline: "1.6rem" }}
        >
          {submitting ? "Sending…" : "Send my reply"}
        </button>
        {stage.kind === "answer" && (
          <button
            type="button"
            onClick={() => setStage({ kind: "name" })}
            className="text-[11px] uppercase tracking-[0.2em] text-ink-300 hover:text-ink"
          >
            Not me — start over
          </button>
        )}
      </div>
    </form>
  );
}

// --------------------------------------------------------------------

function Question({
  q, value, onChange,
}: {
  q: RsvpQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  if (q.kind === "yes_no") {
    return (
      <fieldset>
        <legend className="display italic text-[17px] text-ink mb-2">{q.question}</legend>
        <div className="flex gap-2">
          {["Yes", "No"].map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`rounded-full px-5 py-2 text-[12.5px] uppercase tracking-[0.2em] border transition-all ${
                  active
                    ? "bg-ink text-paper-50 border-ink"
                    : "bg-white border-ink/15 text-ink-300 hover:border-ink/40 hover:text-ink"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }
  if (q.kind === "choice" && q.options && q.options.length > 0) {
    return (
      <fieldset>
        <legend className="display italic text-[17px] text-ink mb-2">{q.question}</legend>
        <div className="flex flex-wrap gap-2">
          {q.options.map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`rounded-full px-4 py-2 text-[13px] border transition-all ${
                  active
                    ? "bg-ink text-paper-50 border-ink"
                    : "bg-white border-ink/15 text-ink-400 hover:border-ink/40 hover:text-ink"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }
  // text
  return (
    <Field
      label={q.question}
      value={value}
      onChange={onChange}
      multiline
    />
  );
}

function Field({
  label, value, onChange, placeholder, multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="display italic text-[17px] text-ink">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="rounded-lg border hairline bg-white px-4 py-3 text-[15px] leading-relaxed focus:outline-none focus:border-sage-500 transition-colors"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-lg border hairline bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-sage-500 transition-colors"
        />
      )}
    </label>
  );
}

// --------------------------------------------------------------------

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="px-6 lg:px-12 py-12 max-w-[900px] mx-auto">
      <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono mb-6">
        {eyebrow}
      </p>
      {children}
    </section>
  );
}

function Divider() {
  return (
    <div className="px-6 lg:px-12 max-w-[900px] mx-auto">
      <div className="h-px bg-ink/8" />
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-[12px] uppercase tracking-[0.22em] text-ink-300 font-mono">
      Loading…
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-paper">
      <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono mb-4">
        404
      </p>
      <h1 className="display italic text-[36px] text-ink leading-tight">
        We can't find that wedding.
      </h1>
      <p className="text-[14px] text-ink-300 mt-3 max-w-[40ch] leading-relaxed">
        Check the address printed on your invitation. Spelling matters.
      </p>
    </div>
  );
}

function humanKind(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
