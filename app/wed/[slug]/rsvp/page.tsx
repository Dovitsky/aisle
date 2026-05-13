"use client";

// Standalone guest-facing RSVP. Mirrors the embedded form on /wed/<slug>
// but with first-class meal / dietary / song-request fields. Linked
// directly from invitation emails (rsvpUrl on the invitation template).

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface PublicPayload {
  site: { slug: string; rsvpEnabled: boolean };
  couple: { organizerName: string; partnerName: string; dateWindow: string; region: string };
}

type Stage =
  | { kind: "name" }
  | { kind: "form"; guestName: string }
  | { kind: "submitting"; guestName: string }
  | { kind: "done"; guestName: string; rsvp: "yes" | "maybe" | "no" }
  | { kind: "error"; message: string; guestName?: string };

const MEAL_OPTIONS = ["Beef", "Chicken", "Fish", "Vegetarian", "Vegan", "Kids menu"];

export default function StandaloneRsvpPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [data, setData] = useState<PublicPayload | null>(null);
  const [missing, setMissing] = useState(false);

  const [name, setName] = useState("");
  const [rsvp, setRsvp] = useState<"yes" | "maybe" | "no">("yes");
  const [plusOneName, setPlusOneName] = useState("");
  const [meal, setMeal] = useState("");
  const [dietary, setDietary] = useState("");
  const [songRequest, setSongRequest] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "name" });

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
  if (!data.site.rsvpEnabled) return <NotYetOpen couple={data.couple} />;

  const proceedToForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStage({ kind: "form", guestName: name.trim() });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const guestName = stage.kind === "form" ? stage.guestName : name.trim();
    setStage({ kind: "submitting", guestName });
    try {
      const body = {
        name: guestName,
        rsvp,
        plusOneName: rsvp !== "no" ? plusOneName : undefined,
        meal: rsvp !== "no" ? meal : undefined,
        dietary: rsvp !== "no" ? dietary : undefined,
        songRequest: rsvp !== "no" ? songRequest : undefined,
      };
      const r = await fetch(`/api/wed/${slug}/rsvp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string; name?: string };
      if (!r.ok || j.error) {
        setStage({ kind: "error", message: j.error ?? "Something went wrong.", guestName });
        return;
      }
      setStage({ kind: "done", guestName: j.name ?? guestName, rsvp });
    } catch (err) {
      setStage({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
        guestName,
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-paper text-ink">
      <header className="relative px-6 lg:px-12 pt-16 pb-8 lg:pt-24 lg:pb-12 max-w-[760px] mx-auto">
        <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono">
          {data.couple.region}
        </p>
        <h1
          className="mt-4 leading-[0.94] tracking-[-0.015em]"
          style={{
            fontFamily: '"Cormorant", "Cormorant Garamond", Georgia, serif',
            fontWeight: 300,
            fontSize: "clamp(40px, 7vw, 76px)",
          }}
        >
          {data.couple.organizerName}
          <span className="italic text-sage-500"> & </span>
          {data.couple.partnerName}
        </h1>
        <p
          className="italic text-ink-300 mt-3"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: "clamp(18px, 3vw, 24px)" }}
        >
          {data.couple.dateWindow} · RSVP
        </p>
      </header>

      <Divider />

      <section className="px-6 lg:px-12 py-12 max-w-[680px] mx-auto">
        {stage.kind === "name" && (
          <form onSubmit={proceedToForm} className="flex flex-col gap-5">
            <p className="text-[15px] text-ink-400 leading-relaxed">
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
              className="btn-primary self-start disabled:opacity-50"
              style={{ paddingInline: "1.4rem" }}
            >
              Find my invitation →
            </button>
          </form>
        )}

        {(stage.kind === "form" || stage.kind === "submitting" || stage.kind === "error") && (
          <form onSubmit={submit} className="flex flex-col gap-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
                Hello, {stage.kind === "form" ? stage.guestName : stage.kind === "submitting" ? stage.guestName : stage.guestName ?? name}
              </p>
              <p className="display italic text-[26px] text-ink leading-snug">
                Will you join us?
              </p>
            </div>

            <ChoiceRow
              value={rsvp}
              onChange={setRsvp}
              options={[
                { id: "yes", label: "Yes" },
                { id: "maybe", label: "Maybe" },
                { id: "no", label: "Sorry, no" },
              ]}
            />

            {rsvp !== "no" && (
              <>
                <Field
                  label="Plus-one name (optional)"
                  value={plusOneName}
                  onChange={setPlusOneName}
                  placeholder="Their full name"
                />
                <div>
                  <p className="display italic text-[17px] text-ink mb-2">Meal choice</p>
                  <div className="flex flex-wrap gap-2">
                    {MEAL_OPTIONS.map((opt) => {
                      const active = meal === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setMeal(opt)}
                          className={`rounded-full px-4 py-2 text-[13px] border transition-colors ${
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
                </div>
                <Field
                  label="Dietary restrictions or allergies (optional)"
                  value={dietary}
                  onChange={setDietary}
                  multiline
                  placeholder="Nut allergy, gluten-free, vegetarian, etc."
                />
                <Field
                  label="Song request (optional)"
                  value={songRequest}
                  onChange={setSongRequest}
                  placeholder='"Tiny Dancer" by Elton John'
                />
              </>
            )}

            {stage.kind === "error" && (
              <p className="text-[13px] text-risk-high leading-relaxed">{stage.message}</p>
            )}

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={stage.kind === "submitting"}
                className="btn-primary"
                style={{ paddingInline: "1.6rem" }}
              >
                {stage.kind === "submitting" ? "Sending…" : "Send my reply"}
              </button>
              <button
                type="button"
                onClick={() => setStage({ kind: "name" })}
                className="text-[11px] uppercase tracking-[0.2em] text-ink-300 hover:text-ink"
              >
                Not me. start over
              </button>
            </div>
          </form>
        )}

        {stage.kind === "done" && (
          <div className="rounded-card border hairline bg-white/70 px-7 py-10">
            <p className="display italic text-[28px] leading-tight text-ink">
              Thank you, {stage.guestName}.
            </p>
            <p className="text-[14.5px] text-ink-400 mt-3 leading-relaxed">
              {stage.rsvp === "no"
                ? "We're sorry you can't make it. We'll miss you."
                : stage.rsvp === "maybe"
                  ? "We've noted you as a maybe. Drop us a line when you know."
                  : "We've got your reply. We can't wait to celebrate with you."}
            </p>
          </div>
        )}
      </section>

      <footer className="px-6 lg:px-12 py-12 max-w-[760px] mx-auto text-[10px] uppercase tracking-[0.32em] text-ink-200 font-mono text-center">
        corsia · {data.couple.organizerName} & {data.couple.partnerName}
      </footer>
    </div>
  );
}

// ---- Pieces ------------------------------------------------------------

function ChoiceRow<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 max-w-[420px]">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-4 py-3 text-[13px] uppercase tracking-[0.2em] transition-all border ${
              active
                ? opt.id === "yes"
                  ? "bg-sage-500 text-paper-50 border-sage-500"
                  : opt.id === "maybe"
                    ? "bg-sage-200 text-ink border-sage-300"
                    : "bg-ink-300 text-paper-50 border-ink-300"
                : "bg-white border-ink/15 text-ink-300 hover:border-ink/40 hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
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

function Divider() {
  return (
    <div className="px-6 lg:px-12 max-w-[760px] mx-auto">
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
      <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono mb-4">404</p>
      <h1 className="display italic text-[36px] text-ink leading-tight">
        We can&rsquo;t find that wedding.
      </h1>
      <p className="text-[14px] text-ink-300 mt-3 max-w-[40ch] leading-relaxed">
        Check the address printed on your invitation. Spelling matters.
      </p>
    </div>
  );
}

function NotYetOpen({ couple }: { couple: PublicPayload["couple"] }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-paper">
      <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono mb-4">
        {couple.organizerName} & {couple.partnerName}
      </p>
      <h1 className="display italic text-[36px] text-ink leading-tight max-w-[40ch]">
        RSVPs haven&rsquo;t opened yet.
      </h1>
      <p className="text-[14px] text-ink-300 mt-3 max-w-[40ch] leading-relaxed">
        Save the date for {couple.dateWindow}. The couple will share the form here soon.
      </p>
    </div>
  );
}
