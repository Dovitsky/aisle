// Cartographer. seating chart agent (build brief §4.5).
//
// Combines:
//   1. Typed constraint model (hard separation, hard placement, strong/soft affinity, comfort, aesthetic).
//   2. Simulated-annealing solver in pure TS that returns the lowest-cost arrangement.
//   3. (Outside this file) LLM layer that turns NL → typed constraints, and explanation layer.
//
// Build brief target: solve a 100-guest, 12-table chart in under 2 seconds.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Guest, SeatingTable, SeatingConstraint, SeatingChart } from "../types";

// ---- Cost model ---------------------------------------------------------

const HARD_SEPARATION_PENALTY = 1_000_000; // never violated by good solutions
const HARD_PLACEMENT_PENALTY = 1_000_000;
const STRONG_AFFINITY_BONUS = 50;          // negative cost when satisfied
const SOFT_AFFINITY_BONUS = 10;
const OVER_CAPACITY_PENALTY = 500;
const COMFORT_PENALTY = 80;                // accessibility violations
const AESTHETIC_WEIGHT = 5;                // mild balance preference

export function scoreArrangement(
  assignments: Record<string, string>,
  tables: SeatingTable[],
  constraints: SeatingConstraint[],
  guests: Guest[],
): number {
  let cost = 0;

  // Capacity
  const tableCounts: Record<string, number> = {};
  for (const tid of Object.values(assignments)) {
    tableCounts[tid] = (tableCounts[tid] ?? 0) + 1;
  }
  for (const t of tables) {
    const over = (tableCounts[t.id] ?? 0) - t.capacity;
    if (over > 0) cost += over * OVER_CAPACITY_PENALTY;
  }

  // Constraints
  for (const c of constraints) {
    const [a, b] = c.guestIds;
    const ta = assignments[a];
    const tb = assignments[b];
    switch (c.kind) {
      case "hard_separation":
        if (ta && tb && ta === tb) cost += HARD_SEPARATION_PENALTY;
        break;
      case "hard_placement":
        if (c.tableId && ta && ta !== c.tableId) cost += HARD_PLACEMENT_PENALTY;
        break;
      case "strong_affinity":
        if (ta && tb && ta === tb) cost -= STRONG_AFFINITY_BONUS * (c.weight ?? 1);
        else cost += STRONG_AFFINITY_BONUS * 0.2;
        break;
      case "soft_affinity":
        if (ta && tb && ta === tb) cost -= SOFT_AFFINITY_BONUS * (c.weight ?? 1);
        break;
      case "comfort":
        if (c.tableId && ta && ta !== c.tableId) cost += COMFORT_PENALTY;
        break;
      case "aesthetic":
        // Mild side-balancing. keep both sides represented at most tables.
        // Computed once per arrangement below.
        break;
    }
  }

  // Aesthetic: penalize tables that are 100% one side.
  const sideByTable: Record<string, { organizer: number; partner: number; both: number }> = {};
  for (const g of guests) {
    const tid = assignments[g.id];
    if (!tid) continue;
    const cur = sideByTable[tid] ?? { organizer: 0, partner: 0, both: 0 };
    if (g.side === "organizer" || g.side === "partner" || g.side === "both") {
      cur[g.side] += 1;
    }
    sideByTable[tid] = cur;
  }
  for (const counts of Object.values(sideByTable)) {
    const total = counts.organizer + counts.partner + counts.both;
    if (total >= 4) {
      const dominant = Math.max(counts.organizer, counts.partner);
      if (dominant / total > 0.85) cost += AESTHETIC_WEIGHT * total;
    }
  }

  return cost;
}

// ---- Simulated annealing -----------------------------------------------

function rngSeeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function solveSeating(
  guests: Guest[],
  tables: SeatingTable[],
  constraints: SeatingConstraint[],
  options: { maxIterations?: number; seed?: number; initial?: Record<string, string> } = {},
): { assignments: Record<string, string>; cost: number } {
  if (tables.length === 0 || guests.length === 0) {
    return { assignments: {}, cost: 0 };
  }
  const rand = rngSeeded(options.seed ?? Date.now());
  const tableIds = tables.map((t) => t.id);
  const capacities: Record<string, number> = {};
  tables.forEach((t) => (capacities[t.id] = t.capacity));

  // Initial assignment
  const assignment: Record<string, string> = options.initial
    ? { ...options.initial }
    : {};
  if (!options.initial) {
    // Honor hard placements first.
    const placement = new Map<string, string>();
    for (const c of constraints) {
      if (c.kind === "hard_placement" && c.tableId) {
        for (const g of c.guestIds) placement.set(g, c.tableId);
      }
    }
    let cursor = 0;
    for (const g of guests) {
      if (placement.has(g.id)) {
        assignment[g.id] = placement.get(g.id)!;
      } else {
        // Round robin across tables, skipping fully placed ones if possible.
        let tries = 0;
        while (tries < tableIds.length) {
          const tid = tableIds[(cursor + tries) % tableIds.length];
          const used = Object.values(assignment).filter((x) => x === tid).length;
          if (used < (capacities[tid] ?? 8)) {
            assignment[g.id] = tid;
            cursor = (cursor + 1) % tableIds.length;
            break;
          }
          tries += 1;
        }
        if (!assignment[g.id]) assignment[g.id] = tableIds[cursor++ % tableIds.length];
      }
    }
  }

  let cost = scoreArrangement(assignment, tables, constraints, guests);
  const guestList = guests.map((g) => g.id);
  const N = guestList.length;
  const iters = Math.max(2000, Math.min(options.maxIterations ?? N * 200, 200_000));

  let temperature = 100;
  const cooling = Math.pow(0.5 / temperature, 1 / iters);

  for (let i = 0; i < iters; i += 1) {
    // Pick two distinct guests; either swap their tables or move one.
    const a = guestList[Math.floor(rand() * N)];
    const b = guestList[Math.floor(rand() * N)];
    if (a === b) continue;
    const ta = assignment[a];
    const tb = assignment[b];
    if (rand() < 0.5) {
      // Swap
      assignment[a] = tb;
      assignment[b] = ta;
    } else {
      // Move a to a random table
      const newT = tableIds[Math.floor(rand() * tableIds.length)];
      assignment[a] = newT;
    }
    const newCost = scoreArrangement(assignment, tables, constraints, guests);
    const delta = newCost - cost;
    if (delta <= 0 || rand() < Math.exp(-delta / temperature)) {
      cost = newCost;
    } else {
      // Revert
      assignment[a] = ta;
      assignment[b] = tb;
    }
    temperature *= cooling;
  }

  return { assignments: assignment, cost };
}

// Pretty-print explanation: "Why is Aunt Karen here?" → walk constraints involving her.
export function explainSeat(
  guestId: string,
  chart: SeatingChart,
  guests: Guest[],
): string {
  const tid = chart.assignments[guestId];
  if (!tid) return "This guest isn't seated yet.";
  const t = chart.tables.find((x) => x.id === tid);
  const guest = guests.find((g) => g.id === guestId);
  if (!t || !guest) return "Couldn't find that guest.";
  const reasons: string[] = [`${guest.fullName} is at ${t.label}.`];
  for (const c of chart.constraints) {
    if (!c.guestIds.includes(guestId)) continue;
    const otherId = c.guestIds.find((g) => g !== guestId);
    const other = otherId ? guests.find((g) => g.id === otherId) : null;
    switch (c.kind) {
      case "hard_separation":
        if (other) reasons.push(`Hard separation from ${other.fullName} (${c.reason ?? "no reason given"}).`);
        break;
      case "strong_affinity":
        if (other) reasons.push(`Strong affinity with ${other.fullName}${c.reason ? `. ${c.reason}` : ""}.`);
        break;
      case "soft_affinity":
        if (other) reasons.push(`Soft affinity with ${other.fullName}.`);
        break;
      case "hard_placement":
        reasons.push(`Hard placement at this table${c.reason ? `. ${c.reason}` : ""}.`);
        break;
      case "comfort":
        reasons.push(`Comfort: ${c.reason ?? "accessibility/dietary preference"}.`);
        break;
    }
  }
  return reasons.join(" ");
}

// LLM layer: parse natural-language instructions into typed constraints.
export async function parseInstruction(args: {
  text: string;
  guests: Guest[];
  tables: SeatingTable[];
}): Promise<SeatingConstraint[]> {
  if (!hasApiKey()) return offlineParse(args);

  const namesById = args.guests.map((g) => `${g.id}: ${g.fullName}`).join("\n");
  const tablesById = args.tables.map((t) => `${t.id}: ${t.label}`).join("\n");

  const prompt = `Guests:
${namesById}

Tables:
${tablesById}

Instruction: ${args.text}

Output JSON only:
{
  "constraints": [
    {
      "kind": "hard_separation"|"hard_placement"|"strong_affinity"|"soft_affinity"|"comfort"|"aesthetic",
      "guestIds": ["<id>", "<id>"],   // 1 id for hard_placement+comfort, 2 ids for affinity/separation
      "tableId": "<id>"?,              // only for hard_placement / comfort
      "weight": 1-3?,                  // affinity strength
      "reason": "short string"
    }
  ]
}`;

  const SYSTEM = `You are Cartographer's parser. Convert natural language into seating constraints.
Always reference guests and tables by their literal id (uppercase or lowercase as given). Never invent ids.
Conservative defaults: when in doubt, prefer "soft_affinity" over "strong_affinity" and "soft" over "hard".`;

  const resp = await client().messages.create({
    model: MODELS.specialist,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json) as { constraints: unknown[] };
    return (parsed.constraints ?? [])
      .map(coerceConstraint)
      .filter((c): c is SeatingConstraint => !!c)
      .map((c) => ({ ...c, id: rid() }));
  } catch {
    return offlineParse(args);
  }
}

function coerceConstraint(raw: unknown): Omit<SeatingConstraint, "id"> | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const validKinds = ["hard_separation", "hard_placement", "strong_affinity", "soft_affinity", "comfort", "aesthetic"] as const;
  if (!(validKinds as readonly string[]).includes(r.kind as string)) return null;
  const guestIds = (Array.isArray(r.guestIds) ? r.guestIds : []).map(String);
  if (!guestIds.length) return null;
  return {
    kind: r.kind as SeatingConstraint["kind"],
    guestIds,
    tableId: typeof r.tableId === "string" ? r.tableId : undefined,
    weight: typeof r.weight === "number" ? r.weight : undefined,
    reason: typeof r.reason === "string" ? r.reason : undefined,
  };
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function offlineParse(args: { text: string; guests: Guest[]; tables: SeatingTable[] }): SeatingConstraint[] {
  // Very simple regex parser: "do not seat A near B" / "A and B together"
  const lower = args.text.toLowerCase();
  const findGuest = (token: string) =>
    args.guests.find((g) => g.fullName.toLowerCase().includes(token.toLowerCase()));
  const constraints: SeatingConstraint[] = [];
  // "Don't seat X with/near/at the same table as Y"
  const sepRe = /(?:don.?t|do not|never)\s+seat\s+([\w. -]+?)\s+(?:with|near|next to|at the same table as)\s+([\w. -]+)/i;
  const m1 = args.text.match(sepRe);
  if (m1) {
    const a = findGuest(m1[1].trim());
    const b = findGuest(m1[2].trim());
    if (a && b) constraints.push({ id: rid(), kind: "hard_separation", guestIds: [a.id, b.id], reason: "Couple instruction" });
  }
  // "Seat X with Y" / "X and Y together"
  const togRe = /(?:seat|put)\s+([\w. -]+?)\s+(?:with|near|next to)\s+([\w. -]+)|([\w. -]+?)\s+and\s+([\w. -]+?)\s+together/i;
  const m2 = args.text.match(togRe);
  if (m2) {
    const a = findGuest((m2[1] ?? m2[3] ?? "").trim());
    const b = findGuest((m2[2] ?? m2[4] ?? "").trim());
    if (a && b) constraints.push({ id: rid(), kind: "strong_affinity", guestIds: [a.id, b.id], weight: 2, reason: "Couple instruction" });
  }
  if (!constraints.length && /no api key/i.test(lower)) return [];
  return constraints;
}
