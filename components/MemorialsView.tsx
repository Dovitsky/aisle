"use client";

// Memorials. Quietly carry the people who can't be there. Ceremony
// mention, memorial table, lit candle, reserved seat, boutonnière charm.
//
// Layout: editorial hero with sage-italic count, add row, then memorials
// grouped by side ("Your side" / "Their side" / "Both") so the layout
// reads as two intimate columns rather than one flat grid.

import { useMemo, useState } from "react";
import type { Memorial, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { Reveal, CountUp } from "./Atmosphere";

const TREATMENT_LABEL: Record<Memorial["treatment"], string> = {
  memorial_table: "Memorial table",
  ceremony_mention: "Ceremony mention",
  candle: "Lit candle",
  reserved_seat: "Reserved seat",
  boutonniere_charm: "Boutonnière charm",
};

const TREATMENT_BLURB: Record<Memorial["treatment"], string> = {
  memorial_table: "A small table near the entry with a photo and a candle.",
  ceremony_mention: "A line in the officiant's script. Quiet, never long.",
  candle: "Lit at the start of the ceremony, held through the vows.",
  reserved_seat: "An empty chair in the front row with their name.",
  boutonniere_charm: "A photo charm or pin worn on the boutonnière or bouquet.",
};

const SIDE_LABEL: Record<Memorial["side"], string> = {
  organizer: "Your side",
  partner: "Their side",
  both: "Both",
};

const SIDE_BLURB: Record<Memorial["side"], string> = {
  organizer: "People you'll be carrying.",
  partner: "People your partner will be carrying.",
  both: "Held together.",
};

const SIDE_ORDER: Memorial["side"][] = ["organizer", "partner", "both"];

export function MemorialsView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [side, setSide] = useState<Memorial["side"]>("organizer");
  const [treatment, setTreatment] = useState<Memorial["treatment"]>("ceremony_mention");
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const g: Record<Memorial["side"], Memorial[]> = { organizer: [], partner: [], both: [] };
    if (state) for (const m of state.memorials) g[m.side].push(m);
    return g;
  }, [state]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const post = async (body: object) => {
    setBusy(true);
    try {
      const r = await fetch("/api/memorials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!name || !relationship) return;
    await post({ op: "add", name, relationship, side, treatment });
    notify({
      kind: "info",
      title: `${name} added`,
      detail: TREATMENT_LABEL[treatment],
    });
    setName("");
    setRelationship("");
  };

  const total = state.memorials.length;
  const yourSide = grouped.organizer.length + grouped.both.length;
  const theirSide = grouped.partner.length + grouped.both.length;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          In memory · Quietly carried
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {total === 0 ? (
              <>The ones we'll <span className="italic text-sage-500">carry</span>.</>
            ) : total === 1 ? (
              <>One name <span className="italic text-sage-500">held close</span>.</>
            ) : (
              <>
                <CountUp value={total} /> names{" "}
                <span className="italic text-sage-500">held close</span>.
              </>
            )}
          </h1>
          {total > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {yourSide}
                <span className="text-ink-300 mx-1">/</span>
                {theirSide}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                yours · theirs
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          A handful of small, intentional ways to remember someone who can't be there.
          Whatever you pick, it stays small — these moments work best when they don't draw
          attention to themselves.
        </p>
      </header>

      {/* Add row */}
      <Reveal>
        <section className="rounded-card border hairline bg-white/85 px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-4">
            Add someone
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Eleanor"
                className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">Relationship</span>
              <input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Grandmother"
                className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono mb-2">Whose side</p>
            <div className="flex flex-wrap gap-1.5">
              {SIDE_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`text-[11px] uppercase tracking-[0.16em] border rounded-full px-3 py-1 transition-colors ${
                    side === s
                      ? "bg-ink text-paper-50 border-ink"
                      : "border-ink/15 text-ink-400 hover:border-ink/30 hover:text-ink"
                  }`}
                >
                  {SIDE_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono mb-2">Treatment</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TREATMENT_LABEL) as Memorial["treatment"][]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTreatment(t)}
                  className={`text-[11px] uppercase tracking-[0.16em] border rounded-full px-3 py-1 transition-colors ${
                    treatment === t
                      ? "bg-sage-500 text-paper-50 border-sage-500"
                      : "border-ink/15 text-ink-400 hover:border-ink/30 hover:text-ink"
                  }`}
                >
                  {TREATMENT_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-ink-300 italic mt-2.5 leading-relaxed">
              {TREATMENT_BLURB[treatment]}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              onClick={add}
              disabled={busy || !name || !relationship}
              className="btn-primary"
              style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
            >
              {busy ? "Adding…" : "Add"}
            </button>
            {!busy && (!name || !relationship) && (
              <span className="text-[11px] uppercase tracking-[0.18em] text-ink-300">
                Name &amp; relationship
              </span>
            )}
          </div>
        </section>
      </Reveal>

      {/* Memorials grouped by side */}
      {total === 0 ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No one here yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Add someone above and we'll thread their tribute through the right moment of
              the day — a line in the script, a chair held empty, a candle lit just before vows.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section>
            <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
              Held close
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {SIDE_ORDER.map((s) => {
                const items = grouped[s];
                if (items.length === 0) return null;
                return <SideColumn key={s} side={s} items={items} onPost={post} />;
              })}
            </div>
          </section>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function SideColumn({
  side, items, onPost,
}: {
  side: Memorial["side"];
  items: Memorial[];
  onPost: (body: object) => Promise<void>;
}) {
  return (
    <article className="surface rounded-card card-shell hover:shadow-cardHover transition-all overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b hairline">
        <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
          {SIDE_LABEL[side]}
        </p>
        <p className="text-[11.5px] text-ink-300 italic mt-0.5">{SIDE_BLURB[side]}</p>
      </div>
      <ul className="flex flex-col">
        {items.map((m, i) => (
          <MemorialRow
            key={m.id}
            m={m}
            divider={i < items.length - 1}
            onPost={onPost}
          />
        ))}
      </ul>
    </article>
  );
}

function MemorialRow({
  m, divider, onPost,
}: {
  m: Memorial;
  divider: boolean;
  onPost: (body: object) => Promise<void>;
}) {
  return (
    <li className={`px-5 py-4 ${divider ? "border-b hairline" : ""}`}>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="display italic text-[20px] leading-tight text-ink">
          {m.name}
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-sage-500 font-mono shrink-0">
          {TREATMENT_LABEL[m.treatment]}
        </span>
      </div>
      <p className="text-[12.5px] text-ink-300">{m.relationship}</p>
      <textarea
        defaultValue={m.notes ?? ""}
        onBlur={(e) => onPost({ op: "update", id: m.id, patch: { notes: e.target.value } })}
        rows={2}
        placeholder="A favorite phrase of theirs, a song, a story…"
        className="mt-3 w-full rounded-lg border hairline bg-paper-50 px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:border-sage-300 resize-none"
      />
    </li>
  );
}
