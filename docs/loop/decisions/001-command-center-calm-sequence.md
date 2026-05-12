# ADR 001: The post-lock home is a calm sequence, not a dashboard buffet

Date: 2026-05-10
Status: accepted

## Context

`CommandCenter.tsx` shipped in iter-29 with seven section components defined
(`BriefStrip`, `RightNow`, `RecommendedForPhase`, `PendingDecisions`,
`VendorReplies`, `AtAGlance`, `FlagsBlock`), but the `return` rendered only
`BriefStrip` + `RecommendedForPhase`. The session log described a richer
four-section layout; the actual page felt sparse. Today's home was also
silently failing to surface the most urgent thing — pending approval cards
and Watcher warn/critical flags — even though both were ready upstream.

## Decision

The post-lock home renders three sections and only three: BriefStrip,
RightNow (with NoDecisionsRightNow fallback and a conditional FlagsBlock
slipped in when Watcher has warn/critical), and RecommendedForPhase.
Everything else lives on its own module surface: the rest of the pending
queue on `/approvals`, vendor replies on `/vendors`, stats on each
module's own page. Components for those secondary affordances are removed
from `CommandCenter.tsx`.

## Reasoning

The product call from the existing inline comment was right and matches
the Corsia voice: this page is the morning sequence, not a dashboard. The
mistake was leaving five unrendered components in the file, which made
the actual surface look thinner than the doc-comment promised and made
future iterations unsure which shape was canonical. Pruning the file
makes the contract obvious and forces secondary modules to earn their
own visits (each is already polished individually).

## Consequences

- Future iterations editing the post-lock home should add to / refine the
  three-section sequence, not bolt on side panels.
- Removing `PendingDecisions` / `VendorReplies` / `AtAGlance` is reversible
  in one revert; the dependent module pages remain intact.
- `Today.tsx` becomes a thin router (Loading → Welcome/ContinuingDraft →
  CommandCenter) with no dashboard logic of its own. The 700-line
  Dashboard/EditorialHero/BudgetSnapshot/etc. helpers it used to carry
  are now gone.
