"use client";

// Mood Board studio. pin canvas + Maestro generation.
// Per AISLE_DISCOVER_MOODBOARD spec.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { useDialog } from "./Dialog";
import { Reveal, BreathingDot } from "./Atmosphere";
import { ThoughtStream } from "./ThoughtStream";
import type { MoodBoard, Pin } from "@/lib/types";

const VIBE_CHIPS = [
  "Italian", "golden hour", "candles", "garden", "minimal",
  "florals", "coastal", "vintage", "linen", "sage", "cream",
  "barn", "greenhouse", "moody",
];

const PROMPT_EXAMPLES = [
  "An Italian seaside reception at golden hour, long table under a pergola, dripping candles, terracotta tones.",
  "A garden ceremony at dusk in a quiet New England field, wildflowers, soft sage and cream linens.",
  "A reception in a converted greenhouse, hanging ivy, long taper candles, deep green and ivory palette.",
  "An old-money garden party, white tents, blue-and-white china, peonies, late-spring lawn.",
];

export function MoodBoardView() {
  const { state } = useProject();
  const [boards, setBoards] = useState<MoodBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/mood-boards");
      const j = (await r.json()) as { boards: MoodBoard[] };
      setBoards(j.boards ?? []);
      if (j.boards?.length && !activeBoardId) setActiveBoardId(j.boards[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!activeBoardId) return;
    void (async () => {
      const r = await fetch(`/api/mood-boards/${activeBoardId}/pins`);
      const j = (await r.json()) as { pins: Pin[] };
      setPins(j.pins ?? []);
    })();
  }, [activeBoardId]);

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeBoardId) ?? null,
    [boards, activeBoardId],
  );

  if (loading) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  // Refresh helpers
  const refreshBoards = async () => {
    const r = await fetch("/api/mood-boards");
    const j = (await r.json()) as { boards: MoodBoard[] };
    setBoards(j.boards ?? []);
  };
  const refreshPins = async () => {
    if (!activeBoardId) return;
    const r = await fetch(`/api/mood-boards/${activeBoardId}/pins`);
    const j = (await r.json()) as { pins: Pin[] };
    setPins(j.pins ?? []);
  };

  return (
    <div className="flex flex-col gap-10 pb-24">
      {/* Header. sticky */}
      <header className="sticky top-[60px] z-20 bg-white/85 backdrop-blur -mx-5 lg:-mx-12 px-5 lg:px-12 py-4 border-b hairline">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-2.5 text-[10.5px]">
              <BreathingDot />
              Mood board
            </p>
            <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
              <BoardPicker
                boards={boards}
                activeBoardId={activeBoardId}
                onPick={setActiveBoardId}
                onCreate={() => setShowCreateBoard(true)}
              />
              {activeBoard && (
                <span className="text-[12px] text-ink-300 italic">
                  {pins.length} {pins.length === 1 ? "pin" : "pins"} · last edited{" "}
                  {timeAgo(activeBoard.updatedAt)}
                </span>
              )}
            </div>
          </div>

          {/* Primary actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-2xl border hairline bg-white/80 hover:bg-white hover:border-sage-300 px-4 py-2 text-[12.5px] font-medium text-ink-400 hover:text-ink transition-all"
            >
              + Add image
            </button>
            <button
              onClick={() => setShowGen(true)}
              className="rounded-2xl cta-sage px-4 py-2 text-[12.5px] font-semibold transition-colors"
              style={{ boxShadow: "0 8px 22px -10px rgba(79,93,68,0.55)" }}
            >
              ✦ Generate with Maestro
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Board settings"
              className="rounded-full w-9 h-9 flex items-center justify-center text-ink-300 hover:text-ink hover:bg-paper-200 transition-colors"
            >
              ⚙
            </button>
          </div>
        </div>
      </header>

      {/* Pins masonry */}
      <Reveal>
        {pins.length === 0 ? (
          <div className="rounded-card border hairline bg-white/55 px-7 py-16 text-center max-w-xl mx-auto">
            <p className="display italic text-[24px] text-sage-500 leading-tight">
              Pin something. Maestro will start seeing what you see.
            </p>
            <p className="text-[13.5px] text-ink-300 mt-3 leading-relaxed">
              Add an image from your camera roll, paste a URL, or browse{" "}
              <Link href="/discover" className="underline-offset-4 underline hover:text-sage-500">
                Discover
              </Link>
              . Or. describe a vibe and let Maestro generate it.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 stagger">
            {pins.map((p) => (
              <PinCard
                key={p.id}
                pin={p}
                boards={boards}
                onMutate={refreshPins}
                onBoardChanged={async () => { await refreshBoards(); await refreshPins(); }}
              />
            ))}
          </div>
        )}
      </Reveal>

      {showAdd && activeBoardId && (
        <AddImageModal
          boardId={activeBoardId}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); refreshPins(); refreshBoards(); }}
        />
      )}
      {showGen && activeBoardId && (
        <GeneratePanel
          boardId={activeBoardId}
          onClose={() => setShowGen(false)}
          onSaved={() => { refreshPins(); refreshBoards(); }}
        />
      )}
      {showSettings && activeBoard && (
        <BoardSettingsModal
          board={activeBoard}
          onClose={() => setShowSettings(false)}
          onChanged={async () => { await refreshBoards(); setShowSettings(false); }}
          onDeleted={async () => {
            await refreshBoards();
            setShowSettings(false);
            const remaining = (await (await fetch("/api/mood-boards")).json() as { boards: MoodBoard[] }).boards;
            setActiveBoardId(remaining[0]?.id ?? null);
          }}
        />
      )}
      {showCreateBoard && (
        <CreateBoardModal
          onClose={() => setShowCreateBoard(false)}
          onCreated={(b) => { setShowCreateBoard(false); refreshBoards(); setActiveBoardId(b.id); }}
        />
      )}
    </div>
  );
}

// ---------- Board picker ----------

function BoardPicker({
  boards, activeBoardId, onPick, onCreate,
}: { boards: MoodBoard[]; activeBoardId: string | null; onPick: (id: string) => void; onCreate: () => void }) {
  const active = boards.find((b) => b.id === activeBoardId);
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="display text-[28px] lg:text-[32px] text-ink hover:text-sage-500 transition-colors flex items-baseline gap-2 leading-none"
      >
        <span className="italic">{active?.name ?? ","}</span>
        <span className="text-[14px] text-ink-300 not-italic" aria-hidden>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <ul className="absolute top-full left-0 mt-2 w-64 rounded-card border hairline bg-white shadow-card z-40 py-1.5 animate-fade-in">
            {boards.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => { onPick(b.id); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 hover:bg-paper-100 transition-colors flex items-baseline justify-between gap-3 ${
                    b.id === activeBoardId ? "bg-sage-50/40" : ""
                  }`}
                >
                  <span className="display italic text-[16px] text-ink">{b.name}</span>
                  <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-ink-300">
                    {b.pinCount}
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => { onCreate(); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sage-500 hover:bg-sage-50/40 transition-colors text-[13px] uppercase tracking-[0.18em] font-mono"
              >
                + new board
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

// ---------- Pin card ----------

function PinCard({
  pin, boards, onMutate, onBoardChanged,
}: { pin: Pin; boards: MoodBoard[]; onMutate: () => Promise<void>; onBoardChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const remove = async () => {
    setBusy(true);
    try {
      await fetch(`/api/pins/${pin.id}`, { method: "DELETE" });
      await onMutate();
    } finally { setBusy(false); }
  };
  const move = async (toBoardId: string) => {
    setBusy(true);
    try {
      await fetch(`/api/pins/${pin.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toBoardId }),
      });
      await onBoardChanged();
    } finally { setBusy(false); setShowMove(false); }
  };
  return (
    <div className="group relative rounded-card overflow-hidden bg-paper-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pin.imageUrl} alt={pin.caption ?? ""} loading="lazy"
        className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.02]" />

      {/* Source badge */}
      {pin.source === "generated" && (
        <span className="absolute top-2.5 left-2.5 rounded-full bg-white/85 backdrop-blur text-sage-500 px-2.5 py-0.5 text-[9.5px] uppercase tracking-[0.22em] font-mono">
          ✦ generated
        </span>
      )}
      {pin.source === "discover" && (
        <span className="absolute top-2.5 left-2.5 rounded-full bg-white/85 backdrop-blur text-ink-400 px-2.5 py-0.5 text-[9.5px] uppercase tracking-[0.22em] font-mono">
          discover
        </span>
      )}

      {/* Hover toolbar */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/55 via-black/15 to-transparent flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={() => setShowMove(true)}
          disabled={busy}
          className="rounded-full bg-white/85 backdrop-blur text-ink px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-mono hover:bg-white"
        >
          Move
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-full bg-white/85 backdrop-blur text-risk-high px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-mono hover:bg-white"
        >
          Remove
        </button>
      </div>

      {/* Move-to picker */}
      {showMove && (
        <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex flex-col items-stretch justify-center p-3 animate-fade-in">
          <div className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-paper-50 mb-2 text-center">
            Move to
          </div>
          <ul className="flex flex-col gap-1">
            {boards.filter((b) => b.id !== pin.boardId).map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => move(b.id)}
                  disabled={busy}
                  className="w-full rounded-md bg-white/90 hover:bg-white text-ink px-3 py-2 text-[12px] disabled:opacity-50 transition-colors text-left flex items-baseline justify-between gap-2"
                >
                  <span className="display italic text-[15px]">{b.name}</span>
                  <span className="text-[10px] text-ink-300 font-mono">{b.pinCount}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setShowMove(false)}
            className="mt-2 text-[11px] uppercase tracking-[0.18em] text-paper-50/80 hover:text-paper-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Add image modal ----------

function AddImageModal({
  boardId, onClose, onAdded,
}: { boardId: string; onClose: () => void; onAdded: () => void }) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  const addUrl = async () => {
    if (!/^https?:\/\//.test(url)) {
      setErr("Must be a direct link to a JPG, PNG, or WebP image."); return;
    }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/mood-boards/${boardId}/pins`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "url", imageUrl: url, sourceMetadata: { url } }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Failed.");
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const addUpload = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setErr("Image must be JPG, PNG, or WebP."); return;
    }
    if (file.size > 10 * 1024 * 1024) { setErr("Max 10MB."); return; }
    setBusy(true); setErr(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const r = await fetch(`/api/mood-boards/${boardId}/pins`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "upload", imageUrl: dataUrl, sourceMetadata: { fileName: file.name, fileSize: file.size } }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Failed.");
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="surface rounded-card border hairline shadow-card max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-[10.5px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3">Add image</div>
        <div className="flex gap-1 p-1 rounded-full border hairline bg-white/40 mb-4 w-fit">
          {(["upload", "url"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1 rounded-full text-[11px] uppercase tracking-[0.18em] transition-colors ${
                tab === t ? "bg-ink text-paper-50" : "text-ink-300 hover:text-ink"
              }`}
            >
              {t === "upload" ? "Upload" : "From URL"}
            </button>
          ))}
        </div>

        {tab === "upload" ? (
          <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed hairline bg-paper-100/40 hover:bg-paper-100 cursor-pointer py-12 px-4 transition-colors">
            <span className="display italic text-[15px] text-ink-400">Drop an image here</span>
            <span className="text-[12px] text-ink-300 mt-1">or click to choose · JPG / PNG / WebP · 10MB max</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void addUpload(f); }}
              disabled={busy}
            />
          </label>
        ) : (
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full rounded-2xl border hairline bg-white px-4 py-3 text-[14px] focus:outline-none focus:border-sage-300"
            />
            <p className="text-[12px] text-ink-300 mt-2 italic">Must be a direct link to a JPG, PNG, or WebP image.</p>
            <button
              onClick={addUrl}
              disabled={busy || !url}
              className="cta-sage mt-3 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add image"}
            </button>
          </div>
        )}

        {err && <p className="text-[12px] text-risk-high mt-3">{err}</p>}
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ---------- Generate panel ----------

function GeneratePanel({
  boardId, onClose, onSaved,
}: { boardId: string; onClose: () => void; onSaved: () => void }) {
  const { notify } = useToast();
  const [prompt, setPrompt] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  // Cycle placeholder
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PROMPT_EXAMPLES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const generate = async () => {
    if (prompt.trim().length < 3) { setErr("Tell Maestro what you'd like to see."); return; }
    setBusy(true); setErr(null); setImages([]); setSaved({});
    try {
      const r = await fetch("/api/mood-boards/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId, prompt }),
      });
      const j = (await r.json()) as { images?: string[]; remaining?: number; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Generation failed.");
      setImages(j.images ?? []);
      if (typeof j.remaining === "number") setRemaining(j.remaining);
      if ((j.images ?? []).length > 0) {
        notify({
          kind: "agent",
          agent: "Maestro",
          title: `${j.images!.length} images ready`,
          detail: "Tap any to save it to your board.",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      notify({ kind: "error", title: "Generation failed", detail: msg });
    } finally {
      setBusy(false);
    }
  };

  const saveToBoard = async (idx: number) => {
    const url = images[idx];
    if (!url || saved[idx]) return;
    try {
      await fetch(`/api/mood-boards/${boardId}/pins`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "generated", imageUrl: url, generatedPrompt: prompt }),
      });
      setSaved((s) => ({ ...s, [idx]: true }));
      onSaved();
      notify({ kind: "approval", title: "Saved to your board", duration: 3000 });
    } catch {/* ignore */}
  };

  const addChip = (chip: string) => {
    setPrompt((p) => p ? `${p.replace(/[.,]\s*$/, "")}, ${chip}` : chip);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full sm:max-w-[520px] h-full bg-[#F8F8F4] overflow-y-auto p-6 sm:p-7 shadow-cardHover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.26em] text-sage-500 font-mono">
              Generate with Maestro
            </p>
            <h2 className="display italic text-[22px] text-sage-500 mt-1.5 leading-tight">
              Describe the vibe you&apos;re chasing.
            </h2>
          </div>
          <button onClick={onClose} className="text-[22px] text-ink-300 hover:text-ink leading-none">×</button>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={PROMPT_EXAMPLES[placeholderIdx]}
          rows={5}
          className="w-full mt-5 rounded-2xl border hairline bg-white p-5 text-[15px] leading-relaxed focus:outline-none focus:border-sage-300 placeholder:text-ink-200 placeholder:italic"
          style={{ minHeight: 140 }}
        />

        {/* Vibe chips */}
        <div className="mt-3 flex gap-1.5 flex-wrap">
          {VIBE_CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => addChip(c)}
              className="rounded-full border hairline bg-white/70 hover:bg-white hover:border-sage-300 px-3 py-1 text-[11.5px] text-ink-400 hover:text-ink transition-all"
            >
              + {c}
            </button>
          ))}
        </div>

        <p className="text-[12px] text-ink-300 mt-4 italic">
          Maestro will generate four images. Save the ones you love.
        </p>

        {busy && (
          <div className="mt-4">
            <ThoughtStream kind="image-gen" tone="sage" size="sm" intervalMs={2200} />
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={generate}
            disabled={busy || prompt.trim().length < 3}
            className="rounded-2xl bg-sage-500 text-paper-50 hover:bg-sage-600 px-5 py-3 text-[13.5px] font-semibold disabled:opacity-50 transition-colors"
          >
            {busy ? "Painting…" : "✦ Generate four"}
          </button>
          <button onClick={onClose} className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors">
            Cancel
          </button>
          {remaining !== null && (
            <span className="text-[11px] text-ink-300 font-mono uppercase tracking-[0.18em] ml-auto">
              {remaining} / day left
            </span>
          )}
        </div>

        {err && <p className="text-[12px] text-risk-high mt-3">{err}</p>}

        {/* Result grid */}
        {(busy || images.length > 0) && (
          <div className="grid grid-cols-2 gap-3 mt-7 stagger">
            {[0, 1, 2, 3].map((i) => {
              const url = images[i];
              if (!url && busy) {
                return (
                  <div
                    key={i}
                    className="relative rounded-card bg-sage-100 animate-pulse-soft overflow-hidden"
                    style={{ aspectRatio: "1 / 1", animationDuration: "1.5s" }}
                  >
                    {/* Each tile gets its own staggered thought so the
                        whole grid feels like it's actively working, not
                        sitting silent. */}
                    {i === 0 && (
                      <div
                        className="absolute inset-0 flex items-end justify-start p-4 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(247,244,237,0) 50%, rgba(247,244,237,0.55) 100%)",
                        }}
                      >
                        <ThoughtStream kind="image-gen" tone="ink" size="xs" intervalMs={2000} />
                      </div>
                    )}
                  </div>
                );
              }
              if (!url) return null;
              return (
                <div key={i} className="group relative rounded-card overflow-hidden bg-paper-200" style={{ aspectRatio: "1 / 1" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Generated ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  {!saved[i] ? (
                    <button
                      onClick={() => saveToBoard(i)}
                      className="absolute bottom-2 right-2 rounded-full bg-white/90 backdrop-blur text-ink px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] font-mono hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✓ Save to board
                    </button>
                  ) : (
                    <span className="absolute bottom-2 right-2 rounded-full bg-sage-500 text-paper-50 px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] font-mono">
                      Saved
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {images.length > 0 && !busy && (
          <div className="flex items-baseline gap-3 mt-5">
            <button
              onClick={generate}
              className="rounded-2xl border hairline bg-white/70 hover:bg-white text-ink px-4 py-2 text-[12.5px] font-medium transition-colors"
            >
              Generate four more
            </button>
            <button
              onClick={onClose}
              className="text-[11px] uppercase tracking-[0.18em] text-sage-500 hover:text-ink transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Create-board modal ----------

function CreateBoardModal({ onClose, onCreated }: { onClose: () => void; onCreated: (b: MoodBoard) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const create = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/mood-boards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Failed.");
      const j = (await r.json()) as { board: MoodBoard };
      onCreated(j.board);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="surface rounded-card border hairline shadow-card max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-[10.5px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3">New board</div>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void create(); }}
          placeholder="Welcome bag, signage, honeymoon…"
          maxLength={80}
          className="w-full rounded-2xl border hairline bg-white px-4 py-3 text-[14px] focus:outline-none focus:border-sage-300"
        />
        {err && <p className="text-[12px] text-risk-high mt-2">{err}</p>}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors">
            Cancel
          </button>
          <button
            onClick={create}
            disabled={busy || !name.trim()}
            className="rounded-2xl cta-sage px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50 transition-colors"
          >
            {busy ? "Creating…" : "Create board"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Board settings modal ----------

function BoardSettingsModal({
  board, onClose, onChanged, onDeleted,
}: { board: MoodBoard; onClose: () => void; onChanged: () => Promise<void>; onDeleted: () => Promise<void> }) {
  const dialog = useDialog();
  const [name, setName] = useState(board.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/mood-boards/${board.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Failed.");
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };
  const remove = async () => {
    const ok = await dialog.confirm({
      title: `Delete "${board.name}"?`,
      body: `${board.pinCount} ${board.pinCount === 1 ? "pin" : "pins"} on this board will be removed too. This can't be undone.`,
      confirmLabel: "Delete board",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/mood-boards/${board.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Default boards can't be deleted.");
      await onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="surface rounded-card border hairline shadow-card max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-[10.5px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3">Board settings</div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="w-full rounded-2xl border hairline bg-white px-4 py-3 text-[14px] focus:outline-none focus:border-sage-300"
        />
        {board.gateScope && (
          <p className="text-[12px] text-ink-300 mt-2 italic">
            This board is gated. your partner doesn&apos;t see it.
          </p>
        )}
        {err && <p className="text-[12px] text-risk-high mt-2">{err}</p>}
        <div className="flex justify-between gap-3 mt-4">
          <button
            onClick={remove}
            disabled={busy || board.isDefault}
            className="text-[11px] uppercase tracking-[0.18em] text-risk-high hover:text-risk-high/80 transition-colors disabled:opacity-30"
            title={board.isDefault ? "Default boards can't be deleted" : ""}
          >
            Delete board
          </button>
          <div className="flex gap-3 items-center">
            <button onClick={onClose} className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-2xl cta-sage px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50 transition-colors"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- helpers ----------

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const d = Math.round(ms / (1000 * 60 * 60 * 24));
  if (d < 1) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
