import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addMenuItem, appendApproval, deleteMenuItem, mutate,
  readState, setDietaryResolution, setMenu, updateGuest, updateMenuItem,
} from "@/lib/store";
import {
  larderParse, computeConflicts, catererBrief, tableServiceNotes,
} from "@/lib/agents/larder";
import { ALLERGEN_CODES, DIETARY_PREFS, type AllergenCode, type DietaryPref, type MenuCourse, type MenuItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const AllergenEnum = z.enum(ALLERGEN_CODES);
const PrefEnum = z.enum(DIETARY_PREFS);
const SevEnum = z.enum(["anaphylactic", "severe", "moderate", "intolerant"]);

const Body = z.discriminatedUnion("op", [
  // Set the structured allergen + preference fields on a guest manually.
  z.object({
    op: z.literal("set_guest"),
    guestId: z.string(),
    allergens: z.array(z.object({
      code: AllergenEnum,
      severity: SevEnum,
      notes: z.string().optional(),
    })).optional(),
    preferences: z.array(PrefEnum).optional(),
    notes: z.string().optional(),
  }),
  // Run Larder over every guest's free-text dietary entry to fill in structured fields.
  z.object({ op: z.literal("parse_all") }),
  // Run Larder on a single guest's free-text dietary string.
  z.object({ op: z.literal("parse_guest"), guestId: z.string() }),
  // Compute conflicts (no-op write; returned alongside state).
  z.object({ op: z.literal("compute_conflicts") }),
  // Generate an Approval Card carrying the caterer brief.
  z.object({ op: z.literal("propose_caterer_brief"), vendorId: z.string().optional() }),
  // Menu CRUD
  z.object({ op: z.literal("add_menu"), item: z.object({
    course: z.enum(["passed","first","main_meat","main_fish","main_veg","side","dessert","cake","kids","late_night","non_alc","alc"]),
    name: z.string().min(1),
    description: z.string().default(""),
    containsAllergens: z.array(AllergenEnum).default([]),
    isVegan: z.boolean().optional(),
    isVegetarian: z.boolean().optional(),
    isGlutenFree: z.boolean().optional(),
    isDairyFree: z.boolean().optional(),
    isKosher: z.boolean().optional(),
    isHalal: z.boolean().optional(),
    isPescatarian: z.boolean().optional(),
    isAlcoholic: z.boolean().optional(),
    vendorId: z.string().optional(),
  })}),
  z.object({ op: z.literal("update_menu"), id: z.string(), patch: z.record(z.unknown()) }),
  z.object({ op: z.literal("delete_menu"), id: z.string() }),
  z.object({ op: z.literal("seed_menu") }),
  // Resolve a single (guest, menuItem) conflict; null clears.
  z.object({
    op: z.literal("resolve"),
    guestId: z.string(),
    menuItemId: z.string(),
    resolution: z.object({
      kind: z.enum(["alt_meal", "menu_changed", "guest_acknowledged", "dismissed"]),
      alternateItemName: z.string().optional(),
      note: z.string().optional(),
    }).nullable(),
  }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });

  const data = parsed.data;
  const state = await readState();

  switch (data.op) {
    case "set_guest": {
      const after = await updateGuest(data.guestId, {
        allergens: data.allergens,
        dietaryPreferences: data.preferences,
        dietaryNotes: data.notes,
      });
      return NextResponse.json({ state: after });
    }
    case "parse_guest": {
      const g = state.guests.find((x) => x.id === data.guestId);
      if (!g) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
      const text = (g.dietary ?? "") + (g.dietaryNotes ? "\n" + g.dietaryNotes : "");
      const parsed = await larderParse(text);
      const after = await updateGuest(data.guestId, {
        allergens: parsed.allergens,
        dietaryPreferences: parsed.preferences,
        dietaryNotes: parsed.notes,
      });
      return NextResponse.json({ state: after, parsed });
    }
    case "parse_all": {
      let touched = 0;
      let last = state;
      for (const g of state.guests) {
        const text = (g.dietary ?? "") + (g.dietaryNotes ? "\n" + g.dietaryNotes : "");
        if (!text.trim()) continue;
        const out = await larderParse(text);
        if (out.allergens.length || out.preferences.length || out.notes) {
          last = await updateGuest(g.id, {
            allergens: out.allergens,
            dietaryPreferences: out.preferences,
            dietaryNotes: out.notes,
          });
          touched += 1;
        }
      }
      return NextResponse.json({ state: last, touched });
    }
    case "compute_conflicts": {
      const conflicts = computeConflicts(state);
      const tableNotes = tableServiceNotes(state);
      return NextResponse.json({ state, conflicts, tableNotes });
    }
    case "propose_caterer_brief": {
      const brief = catererBrief(state);
      const caterer = data.vendorId
        ? state.vendors.find((v) => v.id === data.vendorId)
        : state.vendors.find((v) => v.category === "Caterer" && (v.status === "contracted" || v.status === "paid"))
          ?? state.vendors.find((v) => v.category === "Caterer");
      if (!caterer) {
        return NextResponse.json({ error: "No caterer to send to. Contract a caterer first or pass a vendorId." }, { status: 412 });
      }
      const after = await appendApproval({
        agent: "Larder", phase: "logistics",
        title: `Send dietary brief to ${caterer.name}?`,
        rationale: `${brief.guestCount} guests, ${brief.allergenSummary.length} allergen rollup categories, ${brief.criticalGuests.length} critical (anaphylactic/severe). Approving sends the full brief via your Gmail alias and asks the caterer to confirm cross-contamination protocol.`,
        risk: brief.criticalGuests.length > 0 ? "high" : "medium",
        action: {
          kind: "send_email",
          to: `${caterer.name} (via AISLE alias)`,
          subject: `Dietary brief — ${state.brief?.organizerName ?? ""} & ${state.brief?.partnerName ?? ""} (${brief.guestCount} guests)`,
          body: brief.body,
        },
      });
      return NextResponse.json({ state: after, brief });
    }
    case "add_menu": {
      const after = await addMenuItem(data.item);
      return NextResponse.json({ state: after });
    }
    case "update_menu": {
      const after = await updateMenuItem(data.id, data.patch as Partial<MenuItem>);
      return NextResponse.json({ state: after });
    }
    case "delete_menu": {
      const after = await deleteMenuItem(data.id);
      return NextResponse.json({ state: after });
    }
    case "resolve": {
      const after = await setDietaryResolution(
        data.guestId,
        data.menuItemId,
        data.resolution ? { ...data.resolution, resolvedAt: new Date().toISOString() } : null,
      );
      const conflicts = computeConflicts(after);
      return NextResponse.json({ state: after, conflicts });
    }
    case "seed_menu": {
      // A realistic three-course wedding menu so the cross-check has signal.
      const items: Omit<MenuItem, "id">[] = [
        { course: "passed" as MenuCourse, name: "Whipped ricotta on grilled bread", description: "Lemon, honey, sea salt", containsAllergens: ["dairy", "gluten"] as AllergenCode[], isVegetarian: true },
        { course: "passed" as MenuCourse, name: "Tuna tartare on cucumber", description: "Sesame, lime, scallion", containsAllergens: ["fish", "sesame", "soy"] as AllergenCode[], isPescatarian: true, isDairyFree: true, isGlutenFree: true },
        { course: "passed" as MenuCourse, name: "Beet & goat cheese tartlet", description: "Roasted beet, goat cheese, thyme", containsAllergens: ["dairy", "gluten"] as AllergenCode[], isVegetarian: true },
        { course: "first" as MenuCourse, name: "Heirloom tomato salad", description: "Burrata, basil, aged balsamic", containsAllergens: ["dairy"] as AllergenCode[], isVegetarian: true, isGlutenFree: true },
        { course: "main_meat" as MenuCourse, name: "Grilled hanger steak", description: "Chimichurri, roasted fingerlings", containsAllergens: [] as AllergenCode[], isDairyFree: true, isGlutenFree: true },
        { course: "main_fish" as MenuCourse, name: "Pan-roasted halibut", description: "Saffron broth, fennel, leek", containsAllergens: ["fish", "dairy"] as AllergenCode[], isPescatarian: true, isGlutenFree: true },
        { course: "main_veg" as MenuCourse, name: "Wild mushroom risotto", description: "Parmesan, truffle oil", containsAllergens: ["dairy"] as AllergenCode[], isVegetarian: true, isGlutenFree: true },
        { course: "side" as MenuCourse, name: "Roasted seasonal vegetables", description: "Olive oil, sea salt, lemon", containsAllergens: [] as AllergenCode[], isVegan: true, isGlutenFree: true, isDairyFree: true, isKosher: true, isHalal: true },
        { course: "dessert" as MenuCourse, name: "Lemon olive oil cake", description: "Crème fraîche, candied lemon", containsAllergens: ["dairy", "gluten", "egg"] as AllergenCode[], isVegetarian: true },
        { course: "kids" as MenuCourse, name: "Buttered pasta + grilled chicken tenders", description: "Apple slices on the side", containsAllergens: ["dairy", "gluten"] as AllergenCode[] },
        { course: "late_night" as MenuCourse, name: "Mini cheeseburger sliders", description: "On potato bun", containsAllergens: ["dairy", "gluten", "soy", "egg"] as AllergenCode[] },
      ];
      const after = await setMenu(items.map((i) => ({ ...i, id: Math.random().toString(36).slice(2, 12) })));
      return NextResponse.json({ state: after });
    }
  }
}
