"use client";

// The decision card — atomic unit of the product.
// Plain language. Quiet chrome. Three actions.

import { useState } from "react";
import type { ApprovalCard as ApprovalCardT, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { agentDisplayName } from "@/lib/displayName";
import { Spotlight } from "./Atmosphere";

const RISK_COPY: Record<ApprovalCardT["risk"], { label: string; cls: string; dot: string }> = {
  low:    { label: "Easy",        cls: "text-sage-500 border-sage-300/40 bg-sage-50",   dot: "bg-sage-400" },
  medium: { label: "Worth a look", cls: "text-risk-medium border-risk-medium/30 bg-risk-medium/5", dot: "bg-risk-medium" },
  high:   { label: "Big call",    cls: "text-risk-high border-risk-high/30 bg-risk-high/5", dot: "bg-risk-high" },
};

const STATUS_COPY: Record<Exclude<ApprovalCardT["status"], "pending">, { label: string; cls: string }> = {
  approved: { label: "Done",   cls: "text-sage-500" },
  edited:   { label: "Edited", cls: "text-ink-400" },
  rejected: { label: "Passed", cls: "text-risk-high" },
};

function ActionPreview({ a }: { a: ApprovalCardT["action"] }) {
  switch (a.kind) {
    case "send_email":
      return (
        <div className="rounded-xl border hairline bg-white overflow-hidden">
          <div className="px-4 py-3 grid grid-cols-[60px_1fr] gap-y-1.5 text-[13.5px] border-b hairline">
            <span className="text-ink-300">To</span>
            <span className="font-medium truncate">{a.to}</span>
            <span className="text-ink-300">Subject</span>
            <span className="font-medium">{a.subject}</span>
          </div>
          <pre className="px-4 py-4 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-ink-400">
            {a.body}
          </pre>
        </div>
      );
    case "book_vendor":
      return (
        <Box>
          <Mini>{a.category}</Mini>
          <div className="mt-1 display text-2xl">{a.vendor}</div>
          <div className="text-ink-300 text-[13px] mt-1">~${a.estimate.toLocaleString()}</div>
        </Box>
      );
    case "lock_brief":
      return (
        <Box>
          <Mini>The brief</Mini>
          <div className="mt-1 italic text-ink-400 text-[14px]">{a.summary}</div>
        </Box>
      );
    case "schedule_payment":
      return (
        <Box className="grid grid-cols-3 gap-3 text-[13px]">
          <div><Mini>Vendor</Mini><div className="font-medium truncate mt-0.5">{a.vendor}</div></div>
          <div><Mini>Amount</Mini><div className="display text-lg mt-0.5">${a.amountUsd.toLocaleString()}</div></div>
          <div><Mini>Due</Mini><div className="font-medium mt-0.5">{a.dueDate}</div></div>
        </Box>
      );
    case "send_message":
      return (
        <Box>
          <Mini>To {a.to}</Mini>
          <p className="mt-2 whitespace-pre-wrap text-[13.5px]">{a.body}</p>
        </Box>
      );
    case "sign_contract":
      return (
        <Box>
          <div className="flex items-baseline justify-between">
            <Mini>Contract</Mini>
            <span className="display text-lg">${a.estimate.toLocaleString()}</span>
          </div>
          <div className="mt-1 font-medium">{a.vendor}</div>
          {a.redlines.length > 0 && (
            <ul className="mt-3 text-[12.5px] text-ink-400 list-disc pl-4 space-y-1">
              {a.redlines.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </Box>
      );
    case "lock_seating":
      return (
        <Box className="grid grid-cols-2 gap-3 text-[13px]">
          <div><Mini>Tables</Mini><div className="display text-2xl mt-0.5">{a.tableCount}</div></div>
          <div><Mini>Seats</Mini><div className="display text-2xl mt-0.5">{a.guestCount}</div></div>
        </Box>
      );
    case "send_save_the_date":
    case "send_invitations":
      return (
        <Box className="grid grid-cols-2 gap-3 text-[13px]">
          <div><Mini>Going out to</Mini><div className="display text-2xl mt-0.5">{a.recipients}</div></div>
          <div><Mini>How</Mini><div className="font-medium capitalize mt-0.5">{a.format}</div></div>
        </Box>
      );
    case "publish_design":
      return (
        <Box>
          <Mini>Direction</Mini>
          <div className="mt-1 display text-lg">{a.title}</div>
        </Box>
      );
    case "block_hotel_rooms":
      return (
        <Box className="grid grid-cols-3 gap-3 text-[13px]">
          <div className="col-span-3"><Mini>Hotel</Mini><div className="font-medium mt-0.5">{a.hotel}</div></div>
          <div><Mini>Rooms</Mini><div className="display text-xl mt-0.5">{a.rooms}</div></div>
          <div className="col-span-2"><Mini>Per night</Mini><div className="display text-xl mt-0.5">${a.nightlyRate}</div></div>
        </Box>
      );
    case "purchase_registry_item":
      return (
        <Box>
          <div className="flex items-baseline justify-between">
            <div className="font-medium truncate">{a.item}</div>
            <span className="display text-lg">${a.amountUsd}</span>
          </div>
          <div className="text-[12.5px] text-ink-300 mt-1">{a.vendor}</div>
        </Box>
      );
    case "lock_vows":
      return (
        <Box>
          <Mini>Vows · {a.whose === "organizer" ? "yours" : "theirs"}</Mini>
          <div className="mt-1 display text-xl">{a.wordCount} words</div>
        </Box>
      );
    case "publish_engagement_announcement":
      return (
        <Box>
          <Mini>{a.channel}</Mini>
          <p className="mt-2 whitespace-pre-wrap text-[13.5px]">{a.copy}</p>
        </Box>
      );
    case "lock_setlist":
      return (
        <Box>
          <Mini>The setlist</Mini>
          <div className="mt-1 display text-xl">{a.cueCount} cues</div>
        </Box>
      );
    case "lock_ceremony":
      return (
        <Box>
          <Mini>Ceremony</Mini>
          <div className="mt-1 display text-xl">{a.sectionCount} moments</div>
        </Box>
      );
    case "lock_cake":
      return (
        <Box className="grid grid-cols-2 gap-3 text-[13px]">
          <div><Mini>Tiers</Mini><div className="display text-2xl mt-0.5">{a.tiers}</div></div>
          <div><Mini>Slices</Mini><div className="display text-2xl mt-0.5">{a.servings}</div></div>
        </Box>
      );
    case "publish_website":
      return (
        <Box>
          <Mini>Address</Mini>
          <div className="mt-1 font-mono text-[13.5px]">aisle.wedding/{a.slug}</div>
        </Box>
      );
    case "file_marriage_license":
      return (
        <Box>
          <Mini>Filing in</Mini>
          <div className="mt-1 display text-lg">{a.county}, {a.state}</div>
        </Box>
      );
    case "lock_stationery_suite":
      return (
        <Box>
          <Mini>Piece</Mini>
          <div className="mt-1 display text-lg capitalize">{a.piece.replace(/_/g, " ")}</div>
        </Box>
      );
    case "send_caterer_brief":
      return (
        <Box className="grid grid-cols-2 gap-3 text-[13px]">
          <div><Mini>For</Mini><div className="font-medium mt-0.5 truncate">{a.vendor}</div></div>
          <div><Mini>Allergens flagged</Mini><div className="display text-xl mt-0.5">{a.allergenCount}</div></div>
        </Box>
      );
  }
}

function Box({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border hairline bg-white p-4 ${className}`}>{children}</div>
  );
}
function Mini({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.18em] text-ink-300">{children}</div>;
}

export function ApprovalCardView({ card }: { card: ApprovalCardT }) {
  const { state, setState } = useProject();
  const [open, setOpen] = useState(false);
  const [showRationale, setShowRationale] = useState(false);
  const [busy, setBusy] = useState<null | "approve" | "edit" | "reject">(null);
  const [note, setNote] = useState("");
  const risk = RISK_COPY[card.risk];
  const isResolved = card.status !== "pending";

  const decide = async (decision: "approved" | "rejected" | "edited") => {
    setBusy(decision === "approved" ? "approve" : decision === "rejected" ? "reject" : "edit");
    try {
      const r = await fetch("/api/approvals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: card.id, decision, note: note || undefined }),
      });
      const j = (await r.json()) as { state: ProjectState };
      if (j.state) setState(j.state);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Spotlight
      as="article"
      className={`group relative surface rounded-card card-shell shadow-card hover:shadow-cardHover transition-all duration-300 hover:-translate-y-0.5 overflow-hidden animate-fade-in ${
        isResolved ? "opacity-65" : ""
      }`}
    >
      <header className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative inline-block w-1.5 h-1.5" aria-hidden>
              <span className={`absolute inset-0 rounded-full ${risk.dot} animate-breathe`} />
              <span className={`absolute inset-0 rounded-full ${risk.dot}`} />
            </span>
            <span className="eyebrow truncate">{agentDisplayName(state, card.agent)}</span>
          </div>
          <span
            className={`shrink-0 text-[10px] uppercase tracking-[0.16em] border rounded-full px-2 py-0.5 ${risk.cls}`}
          >
            {risk.label}
          </span>
        </div>
        <h3 className="display text-[22px] leading-[1.15] text-ink text-balance">{card.title}</h3>
      </header>

      <div className="px-5 pb-3">
        {open ? (
          <div className="animate-fade-in-soft"><ActionPreview a={card.action} /></div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="text-[13px] text-ink-300 underline-offset-4 hover:underline hover:text-ink transition-colors"
          >
            See the details
          </button>
        )}
      </div>

      <div className="px-5 pb-3">
        <button
          onClick={() => setShowRationale((v) => !v)}
          className="btn-ghost flex items-center gap-1.5"
          aria-expanded={showRationale}
        >
          <span className={`inline-block w-3 transition-transform ${showRationale ? "rotate-90" : ""}`}>›</span>
          Why
        </button>
        {showRationale && (
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400 whitespace-pre-wrap animate-fade-in-soft">
            {card.rationale}
          </p>
        )}
      </div>

      {!isResolved ? (
        <>
          {busy === "edit" && (
            <div className="px-5 pb-3 animate-fade-in-soft">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="What should change?"
                className="w-full rounded-xl border hairline bg-white px-3 py-2.5 text-[14px] focus:outline-none"
                autoFocus
              />
            </div>
          )}
          <footer className="grid grid-cols-3 text-[14px] border-t hairline">
            <button
              onClick={() => decide("rejected")}
              disabled={!!busy}
              className="py-3.5 text-ink-300 hover:text-risk-high hover:bg-risk-high/5 transition-colors disabled:opacity-50"
            >
              {busy === "reject" ? "…" : "Pass"}
            </button>
            <button
              onClick={() => {
                if (busy === "edit") decide("edited");
                else setBusy("edit");
              }}
              disabled={busy && busy !== "edit" ? true : false}
              className="py-3.5 text-ink-400 border-x hairline hover:bg-paper-200/60 transition-colors disabled:opacity-50"
            >
              {busy === "edit" ? "Send change" : "Tweak"}
            </button>
            <button
              onClick={() => decide("approved")}
              disabled={!!busy}
              className="py-3.5 text-ink font-semibold bg-sage-50 hover:bg-sage-100 transition-colors disabled:opacity-50"
            >
              {busy === "approve" ? "…" : "Yes"}
            </button>
          </footer>
        </>
      ) : (
        <footer className="px-5 py-3 border-t hairline flex items-baseline justify-between gap-2">
          <div
            className={`flex items-center gap-2 ${
              STATUS_COPY[card.status as Exclude<ApprovalCardT["status"], "pending">].cls
            }`}
          >
            <span className="text-[14px]">
              {card.status === "approved" ? "✓" : card.status === "rejected" ? "×" : "✎"}
            </span>
            <span className="small-caps text-[10.5px]">
              {STATUS_COPY[card.status as Exclude<ApprovalCardT["status"], "pending">].label}
            </span>
          </div>
          <time className="text-[11px] text-ink-300">
            {card.resolvedAt &&
              new Date(card.resolvedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
          </time>
          {card.rejectionNote && (
            <p className="basis-full mt-1 text-ink-400 text-[13px] italic">{card.rejectionNote}</p>
          )}
        </footer>
      )}
    </Spotlight>
  );
}
