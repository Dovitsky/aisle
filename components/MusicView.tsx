"use client";

import { useState } from "react";
import type { MusicCue, MusicSlot, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

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
  do_not_play: "Do-not-play",
};

const ORDER: MusicSlot[] = ["processional", "ceremony_music", "recessional", "cocktail_hour", "introduction", "first_dance", "parent_dance", "dinner", "open_dancing", "last_dance", "do_not_play"];

export function MusicView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState<MusicSlot | null>(null);
  const [draftSong, setDraftSong] = useState("");
  const [draftArtist, setDraftArtist] = useState("");

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/music", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const propose = () => post({ op: "propose" }, "propose");
  const lock = () => post({ op: "propose_lock" }, "lock");

  const addCue = (slot: MusicSlot) => {
    if (!draftSong || !draftArtist) return;
    post({ op: "add", slot, song: draftSong, artist: draftArtist }, "add");
    setDraftSong(""); setDraftArtist(""); setAdding(null);
  };

  const cuesBySlot: Record<MusicSlot, MusicCue[]> = ORDER.reduce((acc, slot) => {
    acc[slot] = state.music.filter((c) => c.slot === slot);
    return acc;
  }, {} as Record<MusicSlot, MusicCue[]>);

  const guestRequests = state.guests.filter((g) => g.songRequest).map((g) => `"${g.songRequest}" — ${g.fullName}`);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Cantor"
        title="Music"
        subtitle="Setlist and brief for the band/DJ. Guest song requests from RSVPs feed in here."
      />

      <div className="flex gap-2 flex-wrap">
        <button onClick={propose} disabled={!!busy || !state.brief?.locked} className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
          {busy === "propose" ? "Cantor working…" : state.music.length ? "Re-propose" : "Have Cantor propose a setlist"}
        </button>
        {state.music.length > 0 && (
          <button onClick={lock} disabled={!!busy} className="rounded-2xl border hairline bg-white/80 hover:bg-white px-4 py-2 text-sm transition-colors disabled:opacity-50">
            Propose lock
          </button>
        )}
      </div>

      {guestRequests.length > 0 && (
        <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
          <h2 className="display text-base">Guest requests so far ({guestRequests.length})</h2>
          <ul className="mt-2 text-[13px] text-ink-400 list-disc pl-5 space-y-0.5">
            {guestRequests.slice(0, 8).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </section>
      )}

      {state.music.length === 0 ? (
        <EmptyState title="No setlist yet" hint="Cantor will produce one entry per ceremony slot, plus 3-5 each for cocktail hour, dinner, and open dancing." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-3 stagger">
          {ORDER.map((slot) => {
            const cues = cuesBySlot[slot];
            return (
              <section key={slot} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="display text-base">{SLOT_LABEL[slot]}</h3>
                  <button onClick={() => setAdding(adding === slot ? null : slot)} className="btn-ghost">
                    {adding === slot ? "cancel" : "+ add"}
                  </button>
                </div>
                {adding === slot && (
                  <div className="mt-2 grid grid-cols-2 gap-2 animate-fade-in-soft">
                    <input value={draftSong} onChange={(e) => setDraftSong(e.target.value)} placeholder="Song" className="rounded border hairline bg-white/80 px-2 py-1 text-sm focus:outline-none" />
                    <input value={draftArtist} onChange={(e) => setDraftArtist(e.target.value)} placeholder="Artist" className="rounded border hairline bg-white/80 px-2 py-1 text-sm focus:outline-none" />
                    <button onClick={() => addCue(slot)} disabled={!draftSong || !draftArtist} className="col-span-2 rounded bg-ink text-paper-50 py-1.5 text-sm font-medium hover:bg-ink-400 transition-colors disabled:opacity-50">Add</button>
                  </div>
                )}
                <ul className="mt-2 divide-y hairline">
                  {cues.map((c) => (
                    <li key={c.id} className="py-1.5">
                      <div className="text-[14px]">{c.song}</div>
                      <div className="text-[11px] text-ink-300">{c.artist}{c.notes ? ` · ${c.notes}` : ""}{c.guestRequest ? " · guest request" : ""}</div>
                    </li>
                  ))}
                  {cues.length === 0 && <li className="py-1 text-[12px] text-ink-300 italic">empty</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
