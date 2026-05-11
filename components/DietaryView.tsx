"use client";

// Dietary command center. Larder agent.
// Per-guest structured allergens + preferences, menu cross-check, caterer brief.

import { useEffect, useMemo, useState } from "react";
import {
  ALLERGEN_CODES, ALLERGEN_LABEL, DIETARY_PREFS, DIETARY_PREF_LABEL,
  type AllergenCode, type AllergenEntry, type AllergenSeverity,
  type DietaryConflict, type DietaryPref, type Guest, type MenuItem,
  type ProjectState,
} from "@/lib/types";
// (DietaryConflict imported above)
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader, Stat } from "./ui";

const COURSE_LABEL: Record<MenuItem["course"], string> = {
  passed: "Passed",
  first: "First",
  main_meat: "Main · meat",
  main_fish: "Main · fish",
  main_veg: "Main · veg",
  side: "Side",
  dessert: "Dessert",
  cake: "Cake",
  kids: "Kids",
  late_night: "Late-night",
  non_alc: "Non-alc",
  alc: "Alcohol",
};

const SEVERITY_TONE: Record<AllergenSeverity, string> = {
  anaphylactic: "border-risk-high/40 text-risk-high bg-risk-high/10",
  severe: "border-risk-high/30 text-risk-high bg-risk-high/5",
  moderate: "border-risk-medium/30 text-risk-medium bg-risk-medium/5",
  intolerant: "border-ink/15 text-ink-300 bg-paper-200/40",
};

export function DietaryView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<DietaryConflict[]>([]);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    void fetch("/api/dietary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "compute_conflicts" }) })
      .then((r) => r.json())
      .then((j) => setConflicts(j.conflicts ?? []));
  }, [state?.guests, state?.menu]);

  const stats = useMemo(() => {
    if (!state) return null;
    const yes = state.guests.filter((g) => g.rsvp === "yes" || g.rsvp === "maybe");
    const withAllergens = yes.filter((g) => (g.allergens?.length ?? 0) > 0).length;
    const withPrefs = yes.filter((g) => (g.dietaryPreferences?.length ?? 0) > 0).length;
    const critical = yes.filter((g) => (g.allergens ?? []).some((a) => a.severity === "anaphylactic" || a.severity === "severe")).length;
    const allergenRollup: Record<string, { sev: AllergenSeverity; count: number }> = {};
    const sevRank: Record<AllergenSeverity, number> = { anaphylactic: 4, severe: 3, moderate: 2, intolerant: 1 };
    for (const g of yes) {
      for (const a of g.allergens ?? []) {
        const cur = allergenRollup[a.code];
        if (!cur) allergenRollup[a.code] = { sev: a.severity, count: 1 };
        else {
          cur.count += 1;
          if (sevRank[a.severity] > sevRank[cur.sev]) cur.sev = a.severity;
        }
      }
    }
    const allergenList = Object.entries(allergenRollup)
      .map(([code, v]) => ({ code: code as AllergenCode, severity: v.sev, count: v.count }))
      .sort((a, b) => sevRank[b.severity] - sevRank[a.severity] || b.count - a.count);
    const prefRollup: Record<string, number> = {};
    for (const g of yes) {
      for (const p of g.dietaryPreferences ?? []) prefRollup[p] = (prefRollup[p] ?? 0) + 1;
    }
    const prefList = Object.entries(prefRollup)
      .map(([code, count]) => ({ code: code as DietaryPref, count }))
      .sort((a, b) => b.count - a.count);
    return { yes: yes.length, withAllergens, withPrefs, critical, allergenList, prefList };
  }, [state]);

  if (loading || !state || !stats) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object, key: string) => {
    setBusy(key); setError(null);
    try {
      const r = await fetch("/api/dietary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState; error?: string; conflicts?: DietaryConflict[] };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
      if (j.conflicts) setConflicts(j.conflicts);
    } finally { setBusy(null); }
  };

  const guestsWithDietary = state.guests.filter((g) => {
    const yes = g.rsvp === "yes" || g.rsvp === "maybe";
    const hasAny = (g.allergens?.length ?? 0) > 0 || (g.dietaryPreferences?.length ?? 0) > 0 || (g.dietary && g.dietary.trim().length > 0);
    return yes && hasAny;
  });

  const unresolvedCritical = conflicts.filter((c) => c.severity === "critical" && !c.resolution);
  const unresolvedWarn = conflicts.filter((c) => c.severity === "warn" && !c.resolution);
  const resolvedConflicts = conflicts.filter((c) => c.resolution);

  const resolve = async (c: DietaryConflict, kind: "alt_meal" | "menu_changed" | "guest_acknowledged" | "dismissed", alternateItemName?: string) => {
    setBusy("resolve-" + c.guestId + c.menuItemId);
    try {
      const r = await fetch("/api/dietary", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "resolve",
          guestId: c.guestId,
          menuItemId: c.menuItemId,
          resolution: { kind, alternateItemName },
        }),
      });
      const j = (await r.json()) as { state?: ProjectState; conflicts?: DietaryConflict[] };
      if (j.state) setState(j.state);
      if (j.conflicts) setConflicts(j.conflicts);
    } finally { setBusy(null); }
  };
  const unresolve = async (c: DietaryConflict) => {
    setBusy("resolve-" + c.guestId + c.menuItemId);
    try {
      const r = await fetch("/api/dietary", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "resolve", guestId: c.guestId, menuItemId: c.menuItemId, resolution: null }),
      });
      const j = (await r.json()) as { state?: ProjectState; conflicts?: DietaryConflict[] };
      if (j.state) setState(j.state);
      if (j.conflicts) setConflicts(j.conflicts);
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Dietary"
        title="Dietary & allergens"
        subtitle="Allergens, dietary preferences, menu cross-checks, and the brief your caterer actually needs. Critical entries get separate-prep protocol."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <Stat label="Confirmed guests" value={stats.yes} />
        <Stat label="With allergens" value={stats.withAllergens} tone={stats.withAllergens > 0 ? "medium" : "muted"} />
        <Stat label="With preferences" value={stats.withPrefs} tone="muted" />
        <Stat label="Critical (severe / anaphylactic)" value={stats.critical} tone={stats.critical > 0 ? "high" : "muted"} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => post({ op: "parse_all" }, "parse")}
          disabled={!!busy}
          className="rounded-2xl cta-sage px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy === "parse" ? "Larder parsing…" : "Parse free-text dietary fields"}
        </button>
        <button
          onClick={() => post({ op: "compute_conflicts" }, "conflicts")}
          disabled={!!busy}
          className="rounded-2xl border hairline bg-white/80 hover:bg-white px-4 py-2 text-sm transition-colors disabled:opacity-50"
        >
          Recompute conflicts
        </button>
        <button
          onClick={() => post({ op: "propose_caterer_brief" }, "brief")}
          disabled={!!busy || stats.yes === 0}
          className="rounded-2xl border hairline bg-white/80 hover:bg-white px-4 py-2 text-sm transition-colors disabled:opacity-50"
        >
          {busy === "brief" ? "Drafting…" : "Send caterer brief"}
        </button>
      </div>

      {error && <p className="text-sm text-risk-high">{error}</p>}

      {/* Critical conflicts banner */}
      {unresolvedCritical.length > 0 && (
        <section className="rounded-card border border-risk-high/30 bg-risk-high/5 p-4 sm:p-5">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="display text-lg text-risk-high">⚠ {unresolvedCritical.length} critical conflict{unresolvedCritical.length === 1 ? "" : "s"}</span>
          </div>
          <p className="text-[13px] text-ink-400 mb-2">
            A guest with an anaphylactic / severe allergy is matched against a menu item containing that allergen. These need explicit separate-prep protocol from the caterer.
          </p>
          <ul className="divide-y border-t border-risk-high/20">
            {unresolvedCritical.map((c, i) => (
              <li key={i} className="py-3 text-[13px] grid gap-2">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div>
                    <span className="font-medium">{c.guestName}</span>
                    <span className="text-ink-300">. {c.menuItemName} <span className="text-[11px]">({COURSE_LABEL[c.course]})</span></span>
                  </div>
                  <span className="text-risk-high text-[12px]">{c.reason}</span>
                </div>
                <ResolutionRow conflict={c} onResolve={resolve} busy={busy} state={state} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {unresolvedWarn.length > 0 && (
        <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
          <h2 className="display text-lg mb-2">Soft conflicts ({unresolvedWarn.length})</h2>
          <p className="text-[13px] text-ink-300 mb-2">Preference mismatches and lower-severity allergens. Resolve by offering an alternate course.</p>
          <ul className="divide-y hairline max-h-[420px] overflow-y-auto">
            {unresolvedWarn.map((c, i) => (
              <li key={i} className="py-3 text-[13px] grid gap-2">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div>
                    <span className="font-medium">{c.guestName}</span>
                    <span className="text-ink-300">. {c.menuItemName} <span className="text-[11px]">({COURSE_LABEL[c.course]})</span></span>
                  </div>
                  <span className="text-risk-medium text-[12px]">{c.reason}</span>
                </div>
                <ResolutionRow conflict={c} onResolve={resolve} busy={busy} state={state} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {resolvedConflicts.length > 0 && (
        <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h2 className="display text-lg">Resolved ({resolvedConflicts.length})</h2>
            <span className="eyebrow text-risk-low">✓ acknowledged</span>
          </div>
          <ul className="divide-y hairline max-h-[280px] overflow-y-auto">
            {resolvedConflicts.map((c, i) => (
              <li key={i} className="py-2 text-[12px] grid grid-cols-[1fr_auto] gap-2">
                <div className="text-ink-300">
                  <span className="text-ink">{c.guestName}</span>. {c.menuItemName} ·{" "}
                  <span className="text-risk-low">{c.resolution!.kind.replace("_", " ")}</span>
                  {c.resolution!.alternateItemName && <> · <span className="italic">{c.resolution!.alternateItemName}</span></>}
                </div>
                <button onClick={() => unresolve(c)} disabled={!!busy} className="btn-ghost">undo</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Allergen rollup matrix */}
      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <h2 className="display text-xl mb-3">Allergen rollup</h2>
        {stats.allergenList.length === 0 ? (
          <p className="text-sm text-ink-300 italic">No allergens recorded yet.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {stats.allergenList.map((a) => (
              <li key={a.code} className={`rounded-card border px-3 py-2 ${SEVERITY_TONE[a.severity]}`}>
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">{ALLERGEN_LABEL[a.code]}</span>
                  <span className="display text-xl tabular-nums">{a.count}</span>
                </div>
                <div className="text-[11px] uppercase tracking-[0.14em] mt-0.5 capitalize">worst: {a.severity}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Preference rollup */}
      {stats.prefList.length > 0 && (
        <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
          <h2 className="display text-xl mb-3">Dietary preferences</h2>
          <div className="flex flex-wrap gap-2">
            {stats.prefList.map((p) => (
              <span key={p.code} className="text-[12px] rounded-full border hairline bg-white/60 px-3 py-1.5">
                {DIETARY_PREF_LABEL[p.code]} <span className="text-ink-300 ml-1 tabular-nums">{p.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Menu cross-check */}
      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
          <h2 className="display text-xl">Menu</h2>
          {state.menu.length === 0 && (
            <button
              onClick={() => post({ op: "seed_menu" }, "seed")}
              disabled={!!busy}
              className="rounded-2xl border hairline bg-white/80 hover:bg-white px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
            >
              Add a sample 3-course menu
            </button>
          )}
        </div>
        {state.menu.length === 0 ? (
          <EmptyState
            title="No menu yet"
            hint="We'll cross-check every dish against every guest's allergens and preferences. Add courses here, or pull in a sample menu to see how it works."
          />
        ) : (
          <ul className="divide-y hairline">
            {state.menu.map((m) => (
              <li key={m.id} className="py-2.5 text-[13px]">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 text-[11px] text-ink-300 uppercase tracking-[0.14em]">{COURSE_LABEL[m.course]}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {m.containsAllergens.map((a) => (
                      <span key={a} className="text-[10px] uppercase tracking-[0.14em] border border-risk-medium/30 bg-risk-medium/5 text-risk-medium rounded-full px-2 py-0.5">
                        {ALLERGEN_LABEL[a]}
                      </span>
                    ))}
                    {m.isVegan && <DietBadge>Vegan</DietBadge>}
                    {m.isVegetarian && !m.isVegan && <DietBadge>V</DietBadge>}
                    {m.isGlutenFree && <DietBadge>GF</DietBadge>}
                    {m.isDairyFree && <DietBadge>DF</DietBadge>}
                    {m.isKosher && <DietBadge>Kosher</DietBadge>}
                    {m.isHalal && <DietBadge>Halal</DietBadge>}
                  </div>
                </div>
                {m.description && <div className="text-[12px] text-ink-300 mt-0.5">{m.description}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Per-guest dietary records */}
      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <h2 className="display text-xl mb-3">Per guest</h2>
        {guestsWithDietary.length === 0 ? (
          <EmptyState
            title="No dietary records yet"
            hint="When RSVPs come in, free-text dietary entries land on each guest. Click 'Parse' above to convert them into structured allergen + preference data, or edit any guest manually below."
          />
        ) : (
          <ul className="divide-y hairline">
            {guestsWithDietary.map((g) => {
              const isEditing = editingGuestId === g.id;
              return (
                <li key={g.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div>
                      <div className="text-[14px] font-medium">{g.fullName}</div>
                      <div className="text-[11px] text-ink-300">{g.rsvp.replace("_", " ")}{g.meal ? ` · ${g.meal}` : ""}</div>
                    </div>
                    <button
                      onClick={() => setEditingGuestId(isEditing ? null : g.id)}
                      className="btn-ghost"
                    >
                      {isEditing ? "Done" : "Edit"}
                    </button>
                  </div>
                  {!isEditing ? (
                    <ReadOnlyDietary guest={g} />
                  ) : (
                    <DietaryEditor guest={g} onSave={(allergens, preferences, notes) => {
                      void post({ op: "set_guest", guestId: g.id, allergens, preferences, notes }, "g-" + g.id);
                      setEditingGuestId(null);
                    }} onParse={() => post({ op: "parse_guest", guestId: g.id }, "p-" + g.id)} parsing={busy === "p-" + g.id} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ResolutionRow({
  conflict, onResolve, busy, state,
}: {
  conflict: DietaryConflict;
  onResolve: (c: DietaryConflict, kind: "alt_meal" | "menu_changed" | "guest_acknowledged" | "dismissed", alt?: string) => void;
  busy: string | null;
  state: ProjectState;
}) {
  const [showAlt, setShowAlt] = useState(false);
  const [altName, setAltName] = useState("");

  // Suggest alternates from the menu. anything matching the same course family that
  // does NOT contain the offending allergen.
  const suggestions = state.menu.filter((m) => {
    if (m.id === conflict.menuItemId) return false;
    if (conflict.course.startsWith("main")) return m.course === "main_meat" || m.course === "main_fish" || m.course === "main_veg";
    if (conflict.course === "kids") return m.course === "kids" || m.course === "main_veg";
    if (conflict.course === "cake" || conflict.course === "dessert") return m.course === "dessert" || m.course === "cake";
    return m.course === conflict.course;
  }).slice(0, 4);

  const key = "resolve-" + conflict.guestId + conflict.menuItemId;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <button
        onClick={() => setShowAlt((v) => !v)}
        disabled={busy === key}
        className="chip chip-off"
      >
        {showAlt ? "Cancel alt-meal" : "Alt meal →"}
      </button>
      {showAlt && (
        <>
          <input
            value={altName}
            onChange={(e) => setAltName(e.target.value)}
            placeholder="What they'll be served instead"
            list={`alt-${conflict.guestId}-${conflict.menuItemId}`}
            className="rounded-full border hairline bg-white/80 px-3 py-1 text-[12px] focus:outline-none w-56"
          />
          <datalist id={`alt-${conflict.guestId}-${conflict.menuItemId}`}>
            {suggestions.map((s) => <option key={s.id} value={s.name} />)}
          </datalist>
          <button
            onClick={() => { if (altName.trim()) onResolve(conflict, "alt_meal", altName.trim()); }}
            disabled={busy === key || !altName.trim()}
            className="chip chip-on"
          >
            Save
          </button>
        </>
      )}
      <button onClick={() => onResolve(conflict, "menu_changed")} disabled={busy === key} className="chip chip-off">Menu changed</button>
      <button onClick={() => onResolve(conflict, "guest_acknowledged")} disabled={busy === key} className="chip chip-off">Guest knows</button>
      <button onClick={() => onResolve(conflict, "dismissed")} disabled={busy === key} className="chip chip-off">Dismiss</button>
    </div>
  );
}

function DietBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.14em] border border-risk-low/30 bg-risk-low/5 text-risk-low rounded-full px-2 py-0.5">
      {children}
    </span>
  );
}

function ReadOnlyDietary({ guest }: { guest: Guest }) {
  const allergens = guest.allergens ?? [];
  const prefs = guest.dietaryPreferences ?? [];
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {allergens.map((a, i) => (
        <span key={i} className={`text-[11px] uppercase tracking-[0.14em] border rounded-full px-2 py-0.5 ${SEVERITY_TONE[a.severity]}`}>
          {ALLERGEN_LABEL[a.code]} · {a.severity}
        </span>
      ))}
      {prefs.map((p) => (
        <span key={p} className="text-[11px] rounded-full border hairline bg-white/60 px-2 py-0.5 text-ink-400">
          {DIETARY_PREF_LABEL[p]}
        </span>
      ))}
      {guest.dietary && allergens.length === 0 && prefs.length === 0 && (
        <span className="text-[11px] text-ink-300 italic">free-text only. click Edit to parse: "{guest.dietary}"</span>
      )}
      {!guest.dietary && allergens.length === 0 && prefs.length === 0 && (
        <span className="text-[11px] text-ink-300 italic">none</span>
      )}
    </div>
  );
}

function DietaryEditor({ guest, onSave, onParse, parsing }: {
  guest: Guest;
  onSave: (allergens: AllergenEntry[], preferences: DietaryPref[], notes: string) => void;
  onParse: () => void;
  parsing: boolean;
}) {
  const [allergens, setAllergens] = useState<AllergenEntry[]>(guest.allergens ?? []);
  const [prefs, setPrefs] = useState<DietaryPref[]>(guest.dietaryPreferences ?? []);
  const [notes, setNotes] = useState(guest.dietaryNotes ?? guest.dietary ?? "");

  const toggleAllergen = (code: AllergenCode) => {
    setAllergens((cur) => {
      if (cur.some((a) => a.code === code)) return cur.filter((a) => a.code !== code);
      return [...cur, { code, severity: "moderate" }];
    });
  };
  const setSeverity = (code: AllergenCode, sev: AllergenSeverity) => {
    setAllergens((cur) => cur.map((a) => (a.code === code ? { ...a, severity: sev } : a)));
  };
  const togglePref = (p: DietaryPref) => {
    setPrefs((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  };

  return (
    <div className="mt-3 space-y-3 animate-fade-in-soft">
      <div>
        <div className="eyebrow mb-1.5">Free-text (from RSVP)</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="What they wrote on the response card or RSVP form."
          className="w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={onParse}
          disabled={parsing || !notes.trim()}
          className="mt-1 btn-ghost"
        >
          {parsing ? "Parsing…" : "→ Pull out the dietary notes"}
        </button>
      </div>

      <div>
        <div className="eyebrow mb-1.5">Allergens</div>
        <div className="flex flex-wrap gap-1.5">
          {ALLERGEN_CODES.map((code) => {
            const entry = allergens.find((a) => a.code === code);
            return (
              <div key={code} className="inline-flex items-stretch rounded-full border hairline overflow-hidden">
                <button
                  onClick={() => toggleAllergen(code)}
                  className={`text-[11px] uppercase tracking-[0.14em] px-2.5 py-1 transition-colors ${
                    entry ? `${SEVERITY_TONE[entry.severity]}` : "text-ink-300 hover:bg-paper-200/40"
                  }`}
                >
                  {ALLERGEN_LABEL[code]}
                </button>
                {entry && (
                  <select
                    value={entry.severity}
                    onChange={(e) => setSeverity(code, e.target.value as AllergenSeverity)}
                    className="text-[11px] uppercase tracking-[0.14em] border-l hairline bg-white/60 px-2 py-1 focus:outline-none"
                  >
                    <option value="anaphylactic">anaphylactic</option>
                    <option value="severe">severe</option>
                    <option value="moderate">moderate</option>
                    <option value="intolerant">intolerant</option>
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="eyebrow mb-1.5">Preferences</div>
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_PREFS.map((p) => (
            <button
              key={p}
              onClick={() => togglePref(p)}
              className={`chip ${prefs.includes(p) ? "chip-on" : "chip-off"}`}
            >
              {DIETARY_PREF_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSave(allergens, prefs, notes)}
        className="rounded-2xl cta-sage px-4 py-2 text-sm font-medium transition-colors"
      >
        Save
      </button>
    </div>
  );
}
