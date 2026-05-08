// Single source of truth for the display name of an agent.
// For now only Maestro is renameable, but the helper is shaped to extend.

import type { AgentName, ProjectState } from "./types";

export function agentDisplayName(state: { maestroName?: string } | null | undefined, agent: AgentName): string {
  if (agent === "Maestro" && state?.maestroName) return state.maestroName;
  return agent;
}

export function maestroName(state: ProjectState | { maestroName?: string } | null | undefined): string {
  return state?.maestroName?.trim() || "Maestro";
}
