"use client";

// Music. Cantor proposes a setlist organized by slot (processional through
// last dance), with a "do-not-play" list. Guest song requests from RSVPs
// feed straight in.
//
// Layout: editorial hero with side stat (slots filled / total cues +
// guest-request count). Pull-setlist CTA lives in a sage-mono propose
// card. Guest requests render as their own card-shell. Cues group into
// chronological card-shell tracks; do-not-play tinted oxblood and pinned
// at end. Lock CTA at the bottom.

import { useMemo, useState } from "react";
import type { MusicCue, MusicSlot, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { Reveal, CountUp } from "./Atmosphere";
import { ThoughtStream } from "./ThoughtStream";

const SLOT_LABEL: Record<MusicSlot, string> = {
  processional: "Processional",
  ceremony_music: "Ceremony music",
  recessional: "Recessional",
  cocktail_hour: "Cocktail hour",
  introduction: "Reception entrance",
  first_dance: "First dance",
  parent_dance: "Parent dance",
  dinner: "Dinner",
  open_dancing: "Open dancing",
  last_dance: "Last dance",
  do_not_play: "Do not play",
};

const SLOT_BLURB: Record<MusicSlot, string> = {
  processional: "Walking down the aisle",
  ceremony_music: "Background during the vows",
  recessional: "Walking back up after",
  cocktail_hour: "Background while guests mingle",
  introduction: "Your big entrance into the reception",
  first_dance: "The two of you, alone on the floor",
  parent_dance: "Parent / child dances",
  dinner: "Background while guests eat",
  open_dancing: "The party",
  last_dance: "Closing song",
  do_not_play: "Songs to never play",
};

// Order matters — chronological through the day, with "do_not_play" pinned at end.
const ORDER: MusicSlot[] = [
  "processional", "ceremony_music", "recessional",
  "cocktail_hour", "introduction", "first_dance", "parent_dance",
  "dinner", "open_dancing", "last_dance", "do_not_play",
];

export function MusicView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState<MusicSlot | null>(null);
  const [draftSong, setDraftSong] = useState("");
  const [draftArtist, setDraftArtist] = useState("");

  const cuesBySlot = useMemo(() => {
    const m: Record<MusicSlot, MusicCue[]> = ORDER.reduce((acc, slot) => {
      acc[slot] = [];
      return acc;
    }, {} as Record<MusicSlot, MusicCue[]>);
    if (state) for (const c of state.music) m[c.slot]?.push(c);
    return m;
  }, [state]);

  const guestRequests = useMemo(() => {
    if (!state) return [];
    return state.guests
      .filter((g) => g.songRequest)
      .map((g) => ({ song: g.songRequest!, by: g.fullName }));
  }, [state]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/music", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        if (key === "propose") {
          notify({
            kind: "agent",
            agent: "Cantor",
            title: `${j.state.music.length} cues lined up`,
            detail: "Edit any slot — the band/DJ brief reflects what's in here.",
          });
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const addCue = async (slot: MusicSlot) => {
    if (!draftSong || !draftArtist) return;
    await post({ op: "add", slot, song: draftSong, artist: draftArtist }, "add");
    setDraftSong("");
    setDraftArtist("");
    setAdding(null);
  };

  const briefLocked = !!state.brief?.locked;
  const total = state.music.length;
  const slotsFilled = ORDER.filter((s) => s !== "do_not_play" && cuesBySlot[s].length > 0).length;
  const totalSlots = ORDER.length - 1;
  const guestRequestCount = guestRequests.length;
  const dnpCount = cuesBySlot.do_not_play.length;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Cantor · The setlist
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {total === 0 ? (
              <>The <span className="italic text-sage-500">soundtrack</span> of the day.</>
            ) : (
              <>
                <CountUp value={total} /> cues,{" "}
                <span className="italic text-sage-500">{slotsFilled} of {totalSlots} slots</span>.
              </>
            )}
          </h1>
          {total > 0 && guestRequestCount > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {guestRequestCount}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                from guests
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Cantor pulls a starting setlist by slot — processional through last dance — and a
          do-not-play list. Guest song requests from RSVPs feed straight in. Whatever's here
          is what your band or DJ will see.
        </p>
      </header>

      {/* Propose card */}
      {!briefLocked ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-6 py-5 max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
              Not yet
            </p>
            <p className="text-[14px] text-ink leading-relaxed">
              Lock the brief first and Cantor can pull a starting setlist that fits your
              tone, headcount, and venue acoustics.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section className="rounded-card border hairline bg-white/85 px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
              {total === 0 ? "Pull a starting setlist" : "Re-do, with new direction"}
            </p>
            <p className="text-[14px] text-ink-300 leading-relaxed max-w-[60ch]">
              {total === 0
                ? "One cue per ceremony slot — processional, recessional, first dance — plus 3–5 each for cocktail hour, dinner, and open dancing."
                : "Replaces the entire setlist. Manual edits below will be lost."}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => post({ op: "propose" }, "propose")}
                disabled={!!busy}
                className="btn-primary"
                style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
              >
                {busy === "propose"
                  ? "Cantor working…"
                  : total === 0
                    ? "Pull a setlist together"
                    : "Try a different setlist"}
              </button>
              {busy === "propose" && <ThoughtStream kind="agent-thinking" tone="sage" size="sm" />}
            </div>
          </section>
        </Reveal>
      )}

      {/* Guest requests */}
      {guestRequests.length > 0 && (
        <Reveal>
          <section className="surface rounded-card card-shell overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b hairline">
              <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
                From your guests' RSVPs
              </p>
              <p className="text-[11.5px] text-ink-300 italic mt-0.5">
                Whatever they typed in the song-request field comes here automatically.
              </p>
            </div>
            <ul className="px-5 py-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[13.5px]">
              {guestRequests.slice(0, 12).map((r, i) => (
                <li key={i} className="flex items-baseline gap-2 leading-relaxed">
                  <span aria-hidden className="text-sage-400 shrink-0">♪</span>
                  <span className="italic">&ldquo;{r.song}&rdquo;</span>
                  <span className="text-ink-300 text-[12px] truncate">— {r.by}</span>
                </li>
              ))}
            </ul>
            {guestRequests.length > 12 && (
              <p className="px-5 pb-4 text-[12px] text-ink-300 italic">
                + {guestRequests.length - 12} more — full list goes to the band/DJ.
              </p>
            )}
          </section>
        </Reveal>
      )}

      {/* The setlist */}
      {total === 0 && briefLocked ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No setlist yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Click <span className="text-ink not-italic">Pull a setlist together</span> above and Cantor
              will draft cues across every slot — processional through last dance — plus a place to
              jot songs to never play.
            </p>
          </div>
        </Reveal>
      ) : total > 0 ? (
        <Reveal>
          <section>
            <div className="flex items-baseline justify-between gap-3 mb-5">
              <h2 className="display italic text-[22px] text-ink leading-tight">
                Through the day
              </h2>
              {dnpCount > 0 && (
                <span className="text-[10px] uppercase tracking-[0.18em] text-risk-high font-mono">
                  {dnpCount} on the do-not-play list
                </span>
              )}
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              {ORDER.map((slot) => {
                const cues = cuesBySlot[slot];
                const isDoNotPlay = slot === "do_not_play";
                return (
                  <SlotCard
                    key={slot}
                    slot={slot}
                    cues={cues}
                    isDoNotPlay={isDoNotPlay}
                    adding={adding === slot}
                    draftSong={draftSong}
                    draftArtist={draftArtist}
                    onToggleAdd={() => setAdding(adding === slot ? null : slot)}
                    onChangeSong={setDraftSong}
                    onChangeArtist={setDraftArtist}
                    onAdd={() => addCue(slot)}
                  />
                );
              })}
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Lock CTA */}
      {total > 0 && (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-6 py-5 max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
              When it's ready
            </p>
            <p className="text-[14px] text-ink leading-relaxed">
              Lock the setlist to send it through Decisions for couple review, then on to the band
              or DJ. You can still edit individual cues after locking.
            </p>
            <button
              onClick={() => post({ op: "propose_lock" }, "lock")}
              disabled={!!busy}
              className="mt-4 text-[11px] uppercase tracking-[0.18em] border border-sage-300 hover:border-sage-500 text-sage-500 rounded-full px-3.5 py-1.5 transition-colors"
            >
              {busy === "lock" ? "Working…" : "Send setlist to decisions to lock"}
            </button>
          </div>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function SlotCard({
  slot, cues, isDoNotPlay, adding, draftSong, draftArtist,
  onToggleAdd, onChangeSong, onChangeArtist, onAdd,
}: {
  slot: MusicSlot;
  cues: MusicCue[];
  isDoNotPlay: boolean;
  adding: boolean;
  draftSong: string;
  draftArtist: string;
  onToggleAdd: () => void;
  onChangeSong: (v: string) => void;
  onChangeArtist: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <article
      className={`surface rounded-card card-shell hover:shadow-cardHover transition-all overflow-hidden ${
        isDoNotPlay ? "ring-1 ring-risk-medium/25" : ""
      }`}
    >
      <header className="px-5 pt-4 pb-3 border-b hairline flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] uppercase tracking-[0.22em] font-mono ${
            isDoNotPlay ? "text-risk-high" : "text-sage-500"
          }`}>
            {isDoNotPlay ? "Off-limits" : SLOT_LABEL[slot]}
          </p>
          <h3 className={`display italic text-[20px] leading-tight mt-0.5 ${
            isDoNotPlay ? "text-risk-high" : "text-ink"
          }`}>
            {isDoNotPlay ? SLOT_LABEL[slot] : SLOT_BLURB[slot]}
          </h3>
        </div>
        <button
          onClick={onToggleAdd}
          className="text-[10.5px] uppercase tracking-[0.18em] text-ink-300 hover:text-sage-500 transition-colors shrink-0"
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </header>

      <div className="px-5 py-4">
        {adding && (
          <div className="mb-3 grid grid-cols-2 gap-2 animate-fade-in-soft">
            <input
              value={draftSong}
              onChange={(e) => onChangeSong(e.target.value)}
              placeholder="Song"
              className="rounded-lg border hairline bg-paper-50 px-3 py-1.5 text-[13px] focus:outline-none focus:border-sage-300"
            />
            <input
              value={draftArtist}
              onChange={(e) => onChangeArtist(e.target.value)}
              placeholder="Artist"
              className="rounded-lg border hairline bg-paper-50 px-3 py-1.5 text-[13px] focus:outline-none focus:border-sage-300"
            />
            <button
              onClick={onAdd}
              disabled={!draftSong || !draftArtist}
              className="col-span-2 text-[11px] uppercase tracking-[0.18em] py-2 rounded-lg bg-sage-500 text-paper-50 disabled:opacity-50 transition-opacity"
            >
              Add to {SLOT_LABEL[slot].toLowerCase()}
            </button>
          </div>
        )}
        {cues.length === 0 ? (
          <p className="text-[13px] text-ink-300 italic">Empty for now.</p>
        ) : (
          <ul className="divide-y hairline">
            {cues.map((c) => (
              <li key={c.id} className="py-2 first:pt-0 last:pb-0">
                <div className="text-[14.5px] flex items-baseline gap-2">
                  <span
                    aria-hidden
                    className={`shrink-0 ${isDoNotPlay ? "text-risk-medium" : "text-sage-400"}`}
                  >
                    {isDoNotPlay ? "✕" : "♪"}
                  </span>
                  <span className="truncate text-ink">{c.song}</span>
                </div>
                <div className="text-[11.5px] text-ink-300 mt-0.5 ml-5 leading-relaxed">
                  {c.artist}
                  {c.notes ? ` · ${c.notes}` : ""}
                  {c.guestRequest ? " · guest request" : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
