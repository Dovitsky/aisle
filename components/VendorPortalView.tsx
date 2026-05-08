"use client";

// Vendor portal — lightweight web slice for vendors (PRD §8.2).

import { useEffect, useState } from "react";
import { EmptyState, PageHeader } from "./ui";

type PortalData = {
  self: { id: string; name: string; category: string; city: string; status: string;
    contractedUsd?: number; paidUsd?: number; thread: { id: string; at: string; direction: "inbound" | "outbound"; body: string }[]; } | null;
  wedding: { dateWindow: string; region: string; guestCount: number; aliasFrom: string } | null;
  vendorList: { id: string; name: string; category: string }[];
};

export function VendorPortalView() {
  const [data, setData] = useState<PortalData | null>(null);
  const [vendorId, setVendorId] = useState<string>("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load(vendorId);
  }, [vendorId]);

  async function load(id?: string) {
    const r = await fetch("/api/vendor-portal", {
      method: "POST", headers: { "content-type": "application/json" },
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
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "simulate_inbound", vendorId: data.self.id }),
      });
      setReply("");
      await load(vendorId);
    } finally { setBusy(false); }
  };

  if (!data) return <div className="pt-10 text-center text-ink-300">Loading portal…</div>;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Vendor portal"
        title={`${data.self?.name ?? "Vendor"} portal`}
        subtitle="You see only your slice. The couple's personal address, guest list, budget, and other vendors are not visible."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <label className="text-[12px] text-ink-300 mr-2">Acting as</label>
        <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="text-sm border hairline rounded-lg bg-white/80 px-2 py-1.5 focus:outline-none">
          <option value="">— pick vendor —</option>
          {data.vendorList.map((v) => (
            <option key={v.id} value={v.id}>{v.name} · {v.category}</option>
          ))}
        </select>
      </section>

      {!data.self ? (
        <EmptyState title="Pick a vendor above" hint="Vendor portal access is keyed by magic link in production; here it's a select for the demo." />
      ) : (
        <>
          {data.wedding && (
            <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
              <h2 className="display text-xl">Inquiry</h2>
              <dl className="mt-2 grid grid-cols-[120px_1fr] gap-y-1 text-[13px]">
                <dt className="text-ink-300">Date window</dt><dd>{data.wedding.dateWindow}</dd>
                <dt className="text-ink-300">Region</dt><dd>{data.wedding.region}</dd>
                <dt className="text-ink-300">Guests</dt><dd className="tabular-nums">{data.wedding.guestCount}</dd>
                <dt className="text-ink-300">From</dt><dd className="font-mono text-[12px]">{data.wedding.aliasFrom}</dd>
                <dt className="text-ink-300">Status</dt><dd className="capitalize">{data.self.status}</dd>
                {data.self.contractedUsd && <><dt className="text-ink-300">Contracted</dt><dd className="tabular-nums">${data.self.contractedUsd.toLocaleString()}</dd></>}
                {data.self.paidUsd && <><dt className="text-ink-300">Paid</dt><dd className="tabular-nums">${data.self.paidUsd.toLocaleString()}</dd></>}
              </dl>
            </section>
          )}

          <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
            <h2 className="display text-xl">Messages</h2>
            <ul className="mt-3 flex flex-col gap-2 stagger">
              {data.self.thread.map((m) => (
                <li key={m.id} className={`max-w-[85%] text-[13px] leading-relaxed rounded-2xl px-3 py-2 ${
                  m.direction === "inbound" ? "self-end bg-ink text-paper-50 rounded-br-md ml-auto" : "self-start bg-paper-200/70"
                }`}>
                  <div className="eyebrow text-[10px] mb-1 opacity-80">
                    {m.direction === "outbound" ? "From AISLE" : "From you"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                </li>
              ))}
              {data.self.thread.length === 0 && <li className="text-sm text-ink-300 italic">No messages yet.</li>}
            </ul>
            <div className="mt-3 flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Reply to the couple's planning team…"
                className="flex-1 rounded-2xl border hairline bg-white/80 px-3.5 py-2.5 text-sm focus:outline-none"
              />
              <button onClick={sendReply} disabled={busy || !reply.trim()} className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50">
                {busy ? "…" : "Send"}
              </button>
            </div>
            <p className="text-[11px] text-ink-300 mt-2">
              Demo helper — your real reply gets parsed by Triage on the couple&apos;s side.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
