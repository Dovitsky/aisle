"use client";

// Guest-facing registry page. Renders at /wed/[slug]/registry with no auth.
// Guests browse items, mark as purchased, or contribute to cash funds / group gifts.

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";

interface RegistryItemPublic {
  id: string;
  item: string;
  vendor: string;
  priceUsd: number;
  category: string;
  url?: string;
  imageUrl?: string;
  status: "wanted" | "purchased";
  quantityNeeded: number;
  quantityFulfilled: number;
  groupGifting: boolean;
  fundTargetUsd?: number;
  fundRaisedUsd: number;
  fundDescription?: string;
}

interface RegistryPayload {
  couple: { organizerName: string; partnerName: string; dateWindow: string; region: string };
  items: RegistryItemPublic[];
}

const CATEGORY_LABEL: Record<string, string> = {
  kitchen: "Kitchen", dining: "Dining", bedroom: "Bedroom", bath: "Bath",
  experience: "Experiences", cash_fund: "Cash Funds", charity: "Charity", other: "Everything Else",
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL);

type ModalState =
  | { kind: "closed" }
  | { kind: "purchase"; item: RegistryItemPublic }
  | { kind: "contribute"; item: RegistryItemPublic }
  | { kind: "done"; item: RegistryItemPublic; action: string };

export default function GuestRegistryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [data, setData] = useState<RegistryPayload | null>(null);
  const [missing, setMissing] = useState(false);
  const [modal, setModal] = useState<ModalState>({ kind: "closed" });

  const reload = () => {
    if (!slug) return;
    fetch(`/api/wed/${slug}/registry`)
      .then(async (r) => {
        if (r.status === 404) { setMissing(true); return null; }
        return r.json();
      })
      .then((j: RegistryPayload | null) => { if (j) setData(j); })
      .catch(() => setMissing(true));
  };

  useEffect(() => { reload(); }, [slug]);

  if (missing) return <NotFound />;
  if (!data) return <Loading />;

  return (
    <div className="min-h-screen w-full bg-paper text-ink">
      {/* Hero */}
      <header className="relative px-6 lg:px-12 pt-16 pb-8 lg:pt-24 lg:pb-12 max-w-[900px] mx-auto">
        <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono">
          {data.couple.region}
        </p>
        <h1
          className="mt-4 leading-[0.94] tracking-[-0.015em]"
          style={{
            fontFamily: '"Cormorant", "Cormorant Garamond", Georgia, serif',
            fontWeight: 300,
            fontSize: "clamp(40px, 7vw, 80px)",
          }}
        >
          {data.couple.organizerName}
          <span className="italic text-sage-500"> & </span>
          {data.couple.partnerName}
        </h1>
        <p
          className="italic text-ink-300 mt-3"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: "clamp(18px, 3vw, 24px)" }}
        >
          Gift Registry
        </p>
      </header>

      <Divider />

      {/* Stats */}
      <div className="px-6 lg:px-12 py-8 max-w-[900px] mx-auto">
        <RegistryStats items={data.items} />
      </div>

      {/* Category sections */}
      <RegistryGrid items={data.items} onPurchase={(it) => setModal({ kind: "purchase", item: it })}
        onContribute={(it) => setModal({ kind: "contribute", item: it })} />

      <footer className="px-6 lg:px-12 py-12 max-w-[900px] mx-auto text-[10px] uppercase tracking-[0.32em] text-ink-200 font-mono text-center">
        corsia · {data.couple.organizerName} & {data.couple.partnerName}
      </footer>

      {/* Purchase modal */}
      {modal.kind === "purchase" && (
        <PurchaseModal item={modal.item} slug={slug!}
          onClose={() => setModal({ kind: "closed" })}
          onDone={() => { setModal({ kind: "done", item: modal.item, action: "purchased" }); reload(); }} />
      )}
      {modal.kind === "contribute" && (
        <ContributeModal item={modal.item} slug={slug!}
          onClose={() => setModal({ kind: "closed" })}
          onDone={() => { setModal({ kind: "done", item: modal.item, action: "contributed to" }); reload(); }} />
      )}
      {modal.kind === "done" && (
        <DoneModal item={modal.item} action={modal.action}
          onClose={() => setModal({ kind: "closed" })} />
      )}
    </div>
  );
}

// ---- Components -------------------------------------------------------

function RegistryStats({ items }: { items: RegistryItemPublic[] }) {
  const total = items.length;
  const fulfilled = items.filter((i) => i.status === "purchased" || i.quantityFulfilled >= i.quantityNeeded).length;
  const remaining = total - fulfilled;

  return (
    <div className="grid grid-cols-3 gap-4 max-w-md">
      <StatBox label="Total" value={total} />
      <StatBox label="Claimed" value={fulfilled} color="text-sage-500" />
      <StatBox label="Available" value={remaining} />
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-[32px] leading-none tabular-nums ${color ?? "text-ink"}`}
        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 300 }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
        {label}
      </div>
    </div>
  );
}

function RegistryGrid({
  items, onPurchase, onContribute,
}: {
  items: RegistryItemPublic[];
  onPurchase: (it: RegistryItemPublic) => void;
  onContribute: (it: RegistryItemPublic) => void;
}) {
  const groups: Record<string, RegistryItemPublic[]> = {};
  for (const it of items) {
    groups[it.category] = groups[it.category] ?? [];
    groups[it.category].push(it);
  }
  const orderedCats = Object.keys(groups).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
  );

  return (
    <div className="px-6 lg:px-12 max-w-[900px] mx-auto pb-12">
      {orderedCats.map((cat) => (
        <section key={cat} className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono mb-5">
            {CATEGORY_LABEL[cat] ?? cat}
          </p>
          <div className="grid gap-3">
            {groups[cat].map((it) => (
              <ItemCard key={it.id} item={it} onPurchase={() => onPurchase(it)}
                onContribute={() => onContribute(it)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ItemCard({
  item, onPurchase, onContribute,
}: {
  item: RegistryItemPublic;
  onPurchase: () => void;
  onContribute: () => void;
}) {
  const isFund = item.category === "cash_fund" && item.fundTargetUsd;
  const fulfilled = item.status === "purchased" || item.quantityFulfilled >= item.quantityNeeded;
  const fundPct = isFund
    ? Math.min(100, Math.round((item.fundRaisedUsd / item.fundTargetUsd!) * 100))
    : 0;

  return (
    <div className={`rounded-[12px] border border-ink/8 bg-white/70 px-5 py-4 transition-shadow hover:shadow-card ${
      fulfilled ? "opacity-55" : ""
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] text-ink leading-snug truncate"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}>
              {item.item}
            </h3>
            {item.groupGifting && !isFund && (
              <span className="text-[9px] uppercase tracking-[0.14em] bg-sage-100 text-sage-500 rounded-full px-2 py-0.5 shrink-0">
                Group Gift
              </span>
            )}
          </div>
          <p className="text-[12px] text-ink-300 mt-0.5">
            {item.vendor}
            {item.url && (
              <> · <a href={item.url} target="_blank" rel="noopener" className="text-sage-400 hover:text-sage-500 underline">
                view at store
              </a></>
            )}
          </p>
          {item.quantityNeeded > 1 && !isFund && (
            <p className="text-[11px] text-ink-200 mt-1">
              {item.quantityFulfilled} of {item.quantityNeeded} fulfilled
            </p>
          )}
          {isFund && item.fundDescription && (
            <p className="text-[13px] text-ink-300 mt-2 italic leading-relaxed">
              {item.fundDescription}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[20px] tabular-nums text-ink leading-none"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}>
            ${item.priceUsd.toLocaleString()}
          </div>
          {isFund && (
            <div className="text-[10px] text-ink-200 mt-0.5">
              goal
            </div>
          )}
        </div>
      </div>

      {/* Fund progress bar */}
      {isFund && (
        <div className="mt-3">
          <div className="h-2 bg-ink/5 rounded-full overflow-hidden">
            <div className="h-full bg-sage-400 rounded-full transition-all duration-500"
              style={{ width: `${fundPct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-ink-300">${item.fundRaisedUsd.toLocaleString()} raised</span>
            <span className="text-[10px] text-sage-500">{fundPct}%</span>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="mt-3 pt-3 border-t border-ink/5">
        {fulfilled ? (
          <span className="text-[11px] uppercase tracking-[0.18em] text-sage-500">
            {isFund && fundPct >= 100 ? "Fully funded" : "Claimed"}
          </span>
        ) : isFund || item.groupGifting ? (
          <button onClick={onContribute}
            className="text-[12px] uppercase tracking-[0.16em] text-sage-500 hover:text-sage-600 transition-colors font-medium">
            Contribute →
          </button>
        ) : (
          <button onClick={onPurchase}
            className="text-[12px] uppercase tracking-[0.16em] text-sage-500 hover:text-sage-600 transition-colors font-medium">
            I&rsquo;ll get this →
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Modals ------------------------------------------------------------

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-paper-50 rounded-[16px] shadow-card border border-ink/8 max-w-md w-full p-6">
        {children}
      </div>
    </div>
  );
}

function PurchaseModal({
  item, slug, onClose, onDone,
}: {
  item: RegistryItemPublic; slug: string; onClose: () => void; onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const remaining = item.quantityNeeded - item.quantityFulfilled;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/wed/${slug}/registry`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "purchase", id: item.id, guestName: name.trim(), quantity: qty }),
      });
      onDone();
    } finally { setBusy(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
        Mark as purchased
      </p>
      <h3 className="text-[22px] text-ink leading-snug mb-1"
        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, fontStyle: "italic" }}>
        {item.item}
      </h3>
      <p className="text-[13px] text-ink-300 mb-5">${item.priceUsd.toLocaleString()} · {item.vendor}</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-300 mb-1.5">Your name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required
            placeholder="Your full name"
            className="w-full rounded-lg border border-ink/10 bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-sage-500 transition-colors" />
        </div>
        {remaining > 1 && (
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-300 mb-1.5">
              Quantity ({remaining} still needed)
            </label>
            <input type="number" min={1} max={remaining} value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              className="w-full rounded-lg border border-ink/10 bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-sage-500 transition-colors" />
          </div>
        )}
        <button type="submit" disabled={busy || !name.trim()}
          className="w-full rounded-full bg-sage-500 text-paper-50 py-3 text-[12px] uppercase tracking-[0.18em] font-medium hover:bg-sage-600 transition-colors disabled:opacity-50">
          {busy ? "Saving…" : "Confirm purchase"}
        </button>
      </form>
    </Overlay>
  );
}

function ContributeModal({
  item, slug, onClose, onDone,
}: {
  item: RegistryItemPublic; slug: string; onClose: () => void; onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const remaining = item.fundTargetUsd ? item.fundTargetUsd - item.fundRaisedUsd : item.priceUsd;
  const presets = [25, 50, 100, 250].filter((v) => v <= remaining);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    setBusy(true);
    try {
      await fetch(`/api/wed/${slug}/registry`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "contribute", id: item.id, guestName: name.trim(), amountUsd: parseFloat(amount) }),
      });
      onDone();
    } finally { setBusy(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
        Contribute
      </p>
      <h3 className="text-[22px] text-ink leading-snug mb-1"
        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, fontStyle: "italic" }}>
        {item.item}
      </h3>
      {item.fundDescription && (
        <p className="text-[13px] text-ink-300 italic mb-3">{item.fundDescription}</p>
      )}
      {item.fundTargetUsd && (
        <div className="mb-5">
          <div className="h-2 bg-ink/5 rounded-full overflow-hidden">
            <div className="h-full bg-sage-400 rounded-full" style={{
              width: `${Math.min(100, Math.round((item.fundRaisedUsd / item.fundTargetUsd) * 100))}%`
            }} />
          </div>
          <p className="text-[11px] text-ink-300 mt-1">
            ${item.fundRaisedUsd.toLocaleString()} of ${item.fundTargetUsd.toLocaleString()} · ${remaining.toLocaleString()} remaining
          </p>
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-300 mb-1.5">Your name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required
            placeholder="Your full name"
            className="w-full rounded-lg border border-ink/10 bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-sage-500 transition-colors" />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-300 mb-1.5">Amount ($)</label>
          {presets.length > 0 && (
            <div className="flex gap-2 mb-2">
              {presets.map((p) => (
                <button key={p} type="button" onClick={() => setAmount(String(p))}
                  className={`rounded-full px-3 py-1.5 text-[12px] border transition-colors ${
                    amount === String(p)
                      ? "bg-ink text-paper-50 border-ink"
                      : "border-ink/12 text-ink-300 hover:border-ink/30"
                  }`}>
                  ${p}
                </button>
              ))}
            </div>
          )}
          <input type="number" min={1} max={remaining} value={amount}
            onChange={(e) => setAmount(e.target.value)} required placeholder="Amount"
            className="w-full rounded-lg border border-ink/10 bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-sage-500 transition-colors" />
        </div>
        <button type="submit" disabled={busy || !name.trim() || !amount}
          className="w-full rounded-full bg-sage-500 text-paper-50 py-3 text-[12px] uppercase tracking-[0.18em] font-medium hover:bg-sage-600 transition-colors disabled:opacity-50">
          {busy ? "Saving…" : `Contribute $${amount || "0"}`}
        </button>
      </form>
    </Overlay>
  );
}

function DoneModal({
  item, action, onClose,
}: {
  item: RegistryItemPublic; action: string; onClose: () => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <div className="text-center py-4">
        <div className="text-[40px] mb-3">✓</div>
        <h3 className="text-[24px] text-ink leading-snug"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, fontStyle: "italic" }}>
          Thank you!
        </h3>
        <p className="text-[14px] text-ink-300 mt-2 leading-relaxed">
          You&rsquo;ve {action} <strong>{item.item}</strong>.
          {item.url && (
            <> You can purchase it at <a href={item.url} target="_blank" rel="noopener"
              className="text-sage-500 underline">the store</a>.</>
          )}
        </p>
        <button onClick={onClose}
          className="mt-5 rounded-full bg-sage-500 text-paper-50 px-6 py-2.5 text-[12px] uppercase tracking-[0.18em] font-medium hover:bg-sage-600 transition-colors">
          Done
        </button>
      </div>
    </Overlay>
  );
}

// ---- Shared ------------------------------------------------------------

function Divider() {
  return <div className="px-6 lg:px-12 max-w-[900px] mx-auto"><div className="h-px bg-ink/8" /></div>;
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-[12px] uppercase tracking-[0.22em] text-ink-300 font-mono">
      Loading…
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-paper">
      <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono mb-4">404</p>
      <h1 className="text-[36px] text-ink leading-tight"
        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 300, fontStyle: "italic" }}>
        Registry not found.
      </h1>
      <p className="text-[14px] text-ink-300 mt-3 max-w-[40ch] leading-relaxed">
        Check the address printed on your invitation.
      </p>
    </div>
  );
}
