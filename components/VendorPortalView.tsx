"use client";

// VendorPortal. what the vendor sees when they click the magic link in
// the inquiry email. Heavily redacted view: only THEIR slice. The couple's
// personal addresses, full guest list, full budget, and other vendor names
// are deliberately not exposed.
//
// In production this is keyed by a signed magic-link token; the demo here
// uses a select so a single user can switch between vendors.

import { useEffect, useMemo, useState } from "react";
import { useToast } from "./Toast";
import { PageHeader, Stat } from "./ui";
import { Reveal } from "./Atmosphere";

type PortalData = {
  self: {
    id: string;
    name: string;
    category: string;
    city: string;
    status: string;
    contractedUsd?: number;
    paidUsd?: number;
    thread: { id: string; at: string; direction: "inbound" | "outbound"; body: string }[];
  } | null;
  wedding: {
    dateWindow: string;
    region: string;
    guestCount: number;
    aliasFrom: string;
  } | null;
  vendorList: { id: string; name: string; category: string }[];
};

const STATUS_LABEL: Record<string, string> = {
  shortlisted: "On the shortlist",
  contacted: "In conversation",
  quoting: "Quoting",
  negotiating: "Negotiating",
  contracted: "Booked",
  paid: "Booked & paid",
  passed: "Set aside",
};

export function VendorPortalView() {
  const { notify } = useToast();
  const [data, setData] = useState<PortalData | null>(null);
  const [vendorId, setVendorId] = useState<string>("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load(vendorId);
  }, [vendorId]);

  async function load(id?: string) {
    const r = await fetch("/api/vendor-portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vendorId: id || undefined }),
    });
    const j = (await r.json()) as PortalData & { error?: string };
    if (!("error" in j) || !j.error) setData(j);
  }

  const sendReply = async () => {
    if (!data?.self || !reply.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/vendors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "simulate_inbound", vendorId: data.self.id }),
      });
      setReply("");
      notify({
        kind: "info",
        title: "Reply sent",
        detail: "Their team will see it within a few minutes.",
      });
      await load(vendorId);
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(() => {
    if (!data?.self) return null;
    const inbound = data.self.thread.filter((m) => m.direction === "inbound").length;
    const outbound = data.self.thread.filter((m) => m.direction === "outbound").length;
    return { inbound, outbound, total: data.self.thread.length };
  }, [data]);

  if (!data) {
    return <div className="pt-12 text-center text-ink-300">Loading portal…</div>;
  }

  return (
    <div className="flex flex-col gap-10 pb-12">
      <PageHeader
        eyebrow="Vendor portal"
        title={
          <>
            {data.self ? data.self.name : "Vendor"} portal
          </>
        }
        subtitle="You see only your slice of this wedding. your inquiry, your contract, your messages. The couple's personal address, the guest list, the budget envelope, and the other vendors stay private to their team."
      />

      {/* Vendor switcher (demo helper) */}
      <Reveal>
        <section className="surface rounded-card border hairline shadow-card p-5">
          <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3">
            Acting as
          </p>
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="text-[14px] border hairline rounded-lg bg-white/85 px-3 py-2 focus:outline-none focus:border-sage-300 min-w-[260px]"
          >
            <option value="">, Pick a vendor ,</option>
            {data.vendorList.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.category}
              </option>
            ))}
          </select>
          <p className="text-[12px] text-ink-300 italic mt-2 leading-relaxed">
            In production each vendor signs in via a magic link in the inquiry
            email. Here we use a switcher so you can preview the view from
            different vendors' perspectives.
          </p>
        </section>
      </Reveal>

      {!data.self ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl mx-auto text-center">
            <p className="display text-[24px] leading-tight">
              Pick a vendor above to see their view.
            </p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Each vendor's portal shows only what they need. their inquiry,
              the basic facts about the wedding, their contract, and the
              message thread with the couple's team.
            </p>
          </div>
        </Reveal>
      ) : (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
            <Stat label="Status" value={STATUS_LABEL[data.self.status] ?? data.self.status} />
            <Stat
              label="Contract"
              value={data.self.contractedUsd ? `$${data.self.contractedUsd.toLocaleString()}` : ","}
              sub={data.self.paidUsd ? `$${data.self.paidUsd.toLocaleString()} paid` : undefined}
            />
            <Stat label="Inbound" value={stats?.inbound ?? 0} sub="From you" />
            <Stat label="Outbound" value={stats?.outbound ?? 0} sub="From their team" />
          </div>

          {/* Inquiry facts */}
          {data.wedding && (
            <Reveal>
              <section className="surface rounded-card border hairline shadow-card p-5">
                <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3">
                  The inquiry
                </p>
                <dl className="grid grid-cols-[110px_1fr] gap-y-2.5 text-[13.5px]">
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono pt-0.5">
                    Date window
                  </dt>
                  <dd>{data.wedding.dateWindow}</dd>

                  <dt className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono pt-0.5">
                    Region
                  </dt>
                  <dd>{data.wedding.region}</dd>

                  <dt className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono pt-0.5">
                    Guest count
                  </dt>
                  <dd className="tabular-nums">{data.wedding.guestCount}</dd>

                  <dt className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono pt-0.5">
                    Reply to
                  </dt>
                  <dd className="font-mono text-[12.5px]">{data.wedding.aliasFrom}</dd>
                </dl>
                <p className="text-[12px] text-ink-300 italic mt-4 leading-relaxed">
                  The couple's real email isn't exposed here. every message
                  threads through their team alias.
                </p>
              </section>
            </Reveal>
          )}

          {/* Message thread */}
          <Reveal>
            <section className="surface rounded-card border hairline shadow-card p-5">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono">
                  Message thread
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">
                  {stats?.total ?? 0} message{(stats?.total ?? 0) === 1 ? "" : "s"}
                </p>
              </div>

              {data.self.thread.length === 0 ? (
                <p className="text-[13.5px] text-ink-300 italic py-4">
                  No messages yet. the couple's team will reach out shortly.
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {data.self.thread.map((m) => {
                    // Inbound = from the couple's team toward the vendor.
                    // Outbound (in store terms) = from this vendor.
                    // Render the vendor's own messages on the right.
                    const fromVendor = m.direction === "inbound";
                    return (
                      <li
                        key={m.id}
                        className={`max-w-[85%] text-[13.5px] leading-relaxed rounded-2xl px-4 py-2.5 ${
                          fromVendor
                            ? "self-end bg-ink text-paper-50 rounded-br-md ml-auto"
                            : "self-start bg-paper-200/70"
                        }`}
                      >
                        <div
                          className={`text-[10px] uppercase tracking-[0.18em] font-mono mb-1 ${
                            fromVendor ? "text-paper-50/60" : "text-ink-300"
                          }`}
                        >
                          {fromVendor ? "From you" : "From their team"}
                          {m.at && (
                            <>
                              <span className="mx-1.5">·</span>
                              {new Date(m.at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap">{m.body}</div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-5 flex gap-2 items-end">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Reply to the couple's team…"
                  className="flex-1 rounded-2xl border hairline bg-white/85 px-4 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:border-sage-300 resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={busy || !reply.trim()}
                  className="rounded-2xl cta-sage px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50 shrink-0 self-end"
                >
                  {busy ? "Sending…" : "Send"}
                </button>
              </div>
              <p className="text-[12px] text-ink-300 italic mt-3 leading-relaxed">
                Their team's inbox parses your reply automatically. quotes,
                availability, follow-ups all thread back onto your card.
              </p>
            </section>
          </Reveal>
        </>
      )}
    </div>
  );
}
