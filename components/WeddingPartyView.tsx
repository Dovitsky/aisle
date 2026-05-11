"use client";

// Wedding party. Maid of honor, best man, bridesmaids, groomsmen, officiant,
// ring bearer, ushers, witnesses — the people standing closest to you on
// the day. Track attire size + color, gift ideas, and whether attire is
// ordered. Two-column split by side so the symmetry stays clean.
//
// Layout: editorial hero with N standing + ordered-progress side stat;
// sage-mono add row; two card-shell columns by side; per-member rows
// with italic Cormorant name + sage-mono role + size/color/gift fields
// and an attire-ordered toggle.

import { useMemo, useState } from "react";
import type { ProjectState, WeddingPartyMember } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { Reveal, CountUp } from "./Atmosphere";

const ROLE_LABEL: Record<WeddingPartyMember["role"], string> = {
  maid_of_honor: "Maid of honor",
  best_man: "Best man",
  bridesmaid: "Bridesmaid",
  groomsman: "Groomsman",
  officiant: "Officiant",
  ring_bearer: "Ring bearer",
  flower_kid: "Flower kid",
  usher: "Usher",
  officiant_witness: "Witness",
  other: "Other",
};

const SIDE_LABEL: Record<"organizer" | "partner", string> = {
  organizer: "Your side",
  partner: "Their side",
};

const SIDE_BLURB: Record<"organizer" | "partner", string> = {
  organizer: "The people standing with you.",
  partner: "The people standing with your partner.",
};

export function WeddingPartyView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [role, setRole] = useState<WeddingPartyMember["role"]>("bridesmaid");
  const [side, setSide] = useState<"organizer" | "partner">("organizer");
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const g = { organizer: [] as WeddingPartyMember[], partner: [] as WeddingPartyMember[] };
    if (state) for (const m of state.weddingParty) g[m.side].push(m);
    return g;
  }, [state]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const post = async (body: object) => {
    setBusy(true);
    try {
      const r = await fetch("/api/wedding-party", {
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
    if (!name) return;
    await post({ op: "add", name, role, side });
    notify({ kind: "info", title: `${name} added`, detail: ROLE_LABEL[role] + " · " + SIDE_LABEL[side] });
    setName("");
  };

  const update = (id: string, patch: Partial<WeddingPartyMember>) =>
    post({ op: "update", id, patch });

  const total = state.weddingParty.length;
  const orderedCount = state.weddingParty.filter((m) => m.attireOrdered).length;
  const orderedPct = total ? Math.round((orderedCount / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Your people · The wedding party
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {total === 0 ? (
              <>The people <span className="italic text-sage-500">standing closest</span>.</>
            ) : total === 1 ? (
              <>One person <span className="italic text-sage-500">at your side</span>.</>
            ) : (
              <>
                <CountUp value={total} /> people{" "}
                <span className="italic text-sage-500">standing with you</span>.
              </>
            )}
          </h1>
          {total > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {orderedCount}<span className="text-ink-300 mx-1">/</span>{total}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                attire ordered · {orderedPct}%
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Maid of honor, best man, bridesmaids, groomsmen, officiant, ring bearer, ushers,
          witnesses — anyone with a role on the day. Track sizes, colors, gift ideas,
          and what&rsquo;s been ordered.
        </p>
      </header>

      {/* Progress rail */}
      {total > 0 && (
        <div className="h-[3px] rounded-full bg-ink/8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sage-500 via-sage-400 to-sage-300 transition-[width] duration-1000"
            style={{ width: `${orderedPct}%` }}
            aria-hidden
          />
        </div>
      )}

      {/* Add row */}
      <Reveal>
        <section className="rounded-card border hairline bg-white/85 px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-4">
            Add someone
          </p>
          <div className="grid sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WeddingPartyMember["role"])}
              className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
            >
              {(Object.keys(ROLE_LABEL) as WeddingPartyMember["role"][]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as "organizer" | "partner")}
              className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
            >
              <option value="organizer">Your side</option>
              <option value="partner">Their side</option>
            </select>
            <button
              onClick={add}
              disabled={busy || !name}
              className="btn-primary"
              style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
            >
              {busy ? "Adding…" : "Add"}
            </button>
          </div>
        </section>
      </Reveal>

      {/* Two-column split */}
      {total === 0 ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No one here yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Add your maid of honor, best man, bridesmaids, groomsmen, officiant —
              anyone with a role on the day. Sizes and gift ideas can come later.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section>
            <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
              The line-up
            </h2>
            <div className="grid lg:grid-cols-2 gap-4">
              {(["organizer", "partner"] as const).map((s) => (
                <SideColumn
                  key={s}
                  side={s}
                  members={grouped[s]}
                  onUpdate={update}
                  onRemove={(id) => post({ op: "delete", id })}
                />
              ))}
            </div>
          </section>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function SideColumn({
  side, members, onUpdate, onRemove,
}: {
  side: "organizer" | "partner";
  members: WeddingPartyMember[];
  onUpdate: (id: string, patch: Partial<WeddingPartyMember>) => void;
  onRemove: (id: string) => void;
}) {
  const orderedCount = members.filter((m) => m.attireOrdered).length;
  return (
    <article className="surface rounded-card card-shell overflow-hidden">
      <header className="px-5 pt-4 pb-3 border-b hairline flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
            {SIDE_LABEL[side]}
          </p>
          <p className="text-[11.5px] text-ink-300 italic mt-0.5">{SIDE_BLURB[side]}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-ink-300 shrink-0">
          {members.length} · <span className="text-sage-500">{orderedCount} ordered</span>
        </span>
      </header>
      {members.length === 0 ? (
        <div className="px-5 py-5 text-[13px] text-ink-300 italic">
          No one on this side yet.
        </div>
      ) : (
        <ul className="flex flex-col">
          {members.map((m, i) => (
            <MemberRow
              key={m.id}
              m={m}
              divider={i < members.length - 1}
              onUpdate={(patch) => onUpdate(m.id, patch)}
              onRemove={() => onRemove(m.id)}
            />
          ))}
        </ul>
      )}
    </article>
  );
}

function MemberRow({
  m, divider, onUpdate, onRemove,
}: {
  m: WeddingPartyMember;
  divider: boolean;
  onUpdate: (patch: Partial<WeddingPartyMember>) => void;
  onRemove: () => void;
}) {
  return (
    <li className={`px-5 py-4 ${divider ? "border-b hairline" : ""}`}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="display italic text-[20px] leading-tight text-ink">{m.name}</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-sage-500 font-mono shrink-0">
          {ROLE_LABEL[m.role]}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          defaultValue={m.attireSize ?? ""}
          onBlur={(e) => {
            if ((e.target.value ?? "") !== (m.attireSize ?? "")) onUpdate({ attireSize: e.target.value });
          }}
          placeholder="Size"
          className="rounded-lg border hairline bg-paper-50 px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:border-sage-300"
        />
        <input
          defaultValue={m.attireColor ?? ""}
          onBlur={(e) => {
            if ((e.target.value ?? "") !== (m.attireColor ?? "")) onUpdate({ attireColor: e.target.value });
          }}
          placeholder="Color"
          className="rounded-lg border hairline bg-paper-50 px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:border-sage-300"
        />
        <input
          defaultValue={m.giftIdea ?? ""}
          onBlur={(e) => {
            if ((e.target.value ?? "") !== (m.giftIdea ?? "")) onUpdate({ giftIdea: e.target.value });
          }}
          placeholder="Gift idea"
          className="rounded-lg border hairline bg-paper-50 px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:border-sage-300"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          onClick={() => onUpdate({ attireOrdered: !m.attireOrdered })}
          className={`text-[10.5px] uppercase tracking-[0.18em] border rounded-full px-2.5 py-1 transition-colors ${
            m.attireOrdered
              ? "bg-sage-500 text-paper-50 border-sage-500"
              : "border-ink/15 text-ink-300 hover:border-sage-300 hover:text-sage-500"
          }`}
        >
          {m.attireOrdered ? "Attire ordered" : "Mark ordered"}
        </button>
        <button
          onClick={onRemove}
          className="text-[10px] uppercase tracking-[0.18em] text-ink-300 hover:text-risk-high transition-colors"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
