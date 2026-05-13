"use client";

// Six invitation templates. each is a presentational component that
// renders a print-ready invitation card given the resolved copy. The
// surrounding view supplies a fixed-aspect frame and handles preview
// scaling, so each template can assume a logical 600x840 surface and
// position freely.

import type { InvitationTemplateId } from "@/lib/types";

export interface InvitationCopy {
  organizerName: string;
  partnerName: string;
  headerLine: string;
  dateLine: string;
  yearLine: string;
  ceremonyTime: string;
  venueLine: string;
  venueAddress: string;
  receptionLine: string;
  rsvpUrl: string;
  accentColor: string;
}

export const TEMPLATE_META: { id: InvitationTemplateId; label: string; vibe: string }[] = [
  { id: "editorial", label: "Editorial", vibe: "Classic serif, generous whitespace." },
  { id: "monogram", label: "Monogram", vibe: "Initials in script, names below." },
  { id: "asymmetric", label: "Asymmetric", vibe: "Date left, names right, sage rule." },
  { id: "pressed", label: "Pressed", vibe: "Letterpress all-caps, double border." },
  { id: "botanical", label: "Botanical", vibe: "Illustrated vines in the corners." },
  { id: "modern", label: "Modern", vibe: "Minimal sans, tight grid." },
];

export function InvitationCard({
  template, copy, scale = 1,
}: {
  template: InvitationTemplateId;
  copy: InvitationCopy;
  scale?: number;
}) {
  const Component = TEMPLATE_COMPONENTS[template] ?? Editorial;
  return (
    <div
      className="relative bg-paper-50 shadow-card border hairline overflow-hidden"
      style={{
        width: 600 * scale,
        height: 840 * scale,
        // Inner content rendered at unscaled coords and transformed,
        // so each template can think in absolute 600x840.
      }}
    >
      <div
        style={{
          width: 600,
          height: 840,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <Component {...copy} />
      </div>
    </div>
  );
}

// ---- Template components ----------------------------------------------

function Editorial(c: InvitationCopy) {
  return (
    <div className="w-full h-full flex flex-col items-center text-center px-16 py-20 text-ink" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
      <p className="text-[10px] uppercase tracking-[0.42em] font-mono mt-4" style={{ color: c.accentColor }}>
        {c.headerLine}
      </p>
      <div className="flex-1 flex flex-col justify-center items-center gap-3">
        <h1 className="text-[68px] leading-[0.95] font-light">{c.organizerName}</h1>
        <p className="text-[44px] italic font-light" style={{ color: c.accentColor }}>&</p>
        <h1 className="text-[68px] leading-[0.95] font-light">{c.partnerName}</h1>
      </div>
      <div className="flex flex-col items-center gap-1 mb-2">
        <p className="text-[15px] tracking-[0.06em]">{c.dateLine}</p>
        {c.yearLine && <p className="text-[15px] italic" style={{ color: c.accentColor }}>{c.yearLine}</p>}
        <p className="text-[14px] mt-2">{c.ceremonyTime}</p>
        <div className="w-12 h-px my-3" style={{ background: c.accentColor }} />
        <p className="text-[16px] italic">{c.venueLine}</p>
        <p className="text-[12px] text-ink-300">{c.venueAddress}</p>
        <p className="text-[12px] text-ink-300 mt-3 italic">{c.receptionLine}</p>
      </div>
    </div>
  );
}

function Monogram(c: InvitationCopy) {
  const i1 = (c.organizerName?.[0] ?? "").toUpperCase();
  const i2 = (c.partnerName?.[0] ?? "").toUpperCase();
  return (
    <div className="w-full h-full flex flex-col items-center text-center px-12 py-20 text-ink" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
      <div className="flex items-center justify-center mt-8" style={{ color: c.accentColor }}>
        <span className="text-[180px] leading-none font-light italic translate-y-2">{i1}</span>
        <span className="text-[180px] leading-none font-light italic -translate-x-8">{i2}</span>
      </div>
      <p className="text-[10px] uppercase tracking-[0.38em] font-mono mt-3 text-ink-300">{c.headerLine}</p>
      <h2 className="text-[32px] mt-3 font-light leading-tight">
        {c.organizerName} <span className="italic" style={{ color: c.accentColor }}>&</span> {c.partnerName}
      </h2>
      <div className="flex-1" />
      <div className="text-[13px] tracking-[0.06em] flex flex-col gap-1">
        <p>{c.dateLine}</p>
        <p className="italic" style={{ color: c.accentColor }}>{c.ceremonyTime}</p>
        <p className="mt-3 italic">{c.venueLine}</p>
        <p className="text-[11px] text-ink-300">{c.venueAddress}</p>
      </div>
    </div>
  );
}

function Asymmetric(c: InvitationCopy) {
  return (
    <div className="w-full h-full grid grid-cols-[180px_1fr] text-ink px-10 py-14 gap-6" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
      <aside className="flex flex-col justify-between border-r-2 pr-6" style={{ borderColor: c.accentColor }}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.36em] font-mono" style={{ color: c.accentColor }}>{c.headerLine}</p>
        </div>
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-ink-300">Date</p>
          <p className="text-[18px] leading-tight mt-1">{c.dateLine}</p>
          {c.yearLine && <p className="text-[16px] italic mt-0.5" style={{ color: c.accentColor }}>{c.yearLine}</p>}
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-ink-300 mt-6">Hour</p>
          <p className="text-[16px] leading-tight mt-1 italic">{c.ceremonyTime}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300">RSVP</p>
          <p className="text-[12px] mt-1 break-all">{c.rsvpUrl}</p>
        </div>
      </aside>
      <section className="flex flex-col justify-center pl-2">
        <h1 className="text-[60px] leading-[0.95] font-light">{c.organizerName}</h1>
        <p className="text-[44px] italic font-light my-1" style={{ color: c.accentColor }}>&</p>
        <h1 className="text-[60px] leading-[0.95] font-light">{c.partnerName}</h1>
        <div className="mt-10">
          <p className="text-[18px] italic">{c.venueLine}</p>
          <p className="text-[12.5px] text-ink-300 mt-1">{c.venueAddress}</p>
          <p className="text-[12px] text-ink-300 mt-4 italic">{c.receptionLine}</p>
        </div>
      </section>
    </div>
  );
}

function Pressed(c: InvitationCopy) {
  return (
    <div className="w-full h-full p-8" style={{ background: "#FBF8F1" }}>
      <div className="w-full h-full border-2 p-3" style={{ borderColor: c.accentColor }}>
        <div className="w-full h-full border flex flex-col items-center justify-between text-center px-12 py-12" style={{ borderColor: c.accentColor, fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
          <p className="text-[11px] uppercase tracking-[0.5em] font-mono" style={{ color: c.accentColor }}>{c.headerLine}</p>
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-[34px] uppercase tracking-[0.32em] font-light leading-snug">{c.organizerName}</h1>
            <p className="text-[14px] uppercase tracking-[0.5em] italic" style={{ color: c.accentColor }}>and</p>
            <h1 className="text-[34px] uppercase tracking-[0.32em] font-light leading-snug">{c.partnerName}</h1>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[12px] uppercase tracking-[0.36em]">{c.dateLine}</p>
            <p className="text-[12px] uppercase tracking-[0.36em]" style={{ color: c.accentColor }}>{c.ceremonyTime}</p>
            <div className="w-10 h-px my-2" style={{ background: c.accentColor }} />
            <p className="text-[14px] italic">{c.venueLine}</p>
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-ink-300 mt-3">{c.receptionLine}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Botanical(c: InvitationCopy) {
  return (
    <div className="w-full h-full relative text-ink overflow-hidden" style={{ background: "#FBF8F1", fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
      {/* Decorative vine corners */}
      <svg className="absolute top-0 left-0" width="220" height="220" viewBox="0 0 200 200" fill="none">
        <g stroke={c.accentColor} strokeWidth="1" fill="none">
          <path d="M0 100 Q 40 40 100 0" />
          <path d="M0 60 Q 60 60 100 20" />
          <circle cx="30" cy="80" r="6" fill={c.accentColor} opacity="0.18" />
          <circle cx="70" cy="40" r="9" fill={c.accentColor} opacity="0.22" />
          <ellipse cx="50" cy="120" rx="3" ry="9" fill={c.accentColor} opacity="0.4" />
          <ellipse cx="20" cy="40" rx="3" ry="8" fill={c.accentColor} opacity="0.4" />
          <ellipse cx="90" cy="80" rx="3" ry="8" fill={c.accentColor} opacity="0.4" transform="rotate(40 90 80)" />
        </g>
      </svg>
      <svg className="absolute bottom-0 right-0 rotate-180" width="220" height="220" viewBox="0 0 200 200" fill="none">
        <g stroke={c.accentColor} strokeWidth="1" fill="none">
          <path d="M0 100 Q 40 40 100 0" />
          <path d="M0 60 Q 60 60 100 20" />
          <circle cx="30" cy="80" r="6" fill={c.accentColor} opacity="0.18" />
          <circle cx="70" cy="40" r="9" fill={c.accentColor} opacity="0.22" />
          <ellipse cx="50" cy="120" rx="3" ry="9" fill={c.accentColor} opacity="0.4" />
          <ellipse cx="20" cy="40" rx="3" ry="8" fill={c.accentColor} opacity="0.4" />
        </g>
      </svg>

      <div className="relative h-full flex flex-col items-center justify-center text-center px-16 py-20">
        <p className="text-[11px] uppercase tracking-[0.42em] font-mono mb-4" style={{ color: c.accentColor }}>
          {c.headerLine}
        </p>
        <h1 className="text-[60px] leading-[0.95] font-light italic">{c.organizerName}</h1>
        <p className="text-[36px] italic my-1" style={{ color: c.accentColor }}>&</p>
        <h1 className="text-[60px] leading-[0.95] font-light italic">{c.partnerName}</h1>
        <p className="text-[15px] tracking-[0.08em] mt-8">{c.dateLine}</p>
        <p className="text-[14px] italic" style={{ color: c.accentColor }}>{c.ceremonyTime}</p>
        <p className="text-[16px] italic mt-4">{c.venueLine}</p>
        <p className="text-[12px] text-ink-300">{c.venueAddress}</p>
        <p className="text-[11px] uppercase tracking-[0.22em] mt-4 text-ink-300">{c.receptionLine}</p>
      </div>
    </div>
  );
}

function Modern(c: InvitationCopy) {
  return (
    <div className="w-full h-full bg-white text-ink p-16 flex flex-col" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      <div className="flex items-center justify-between mb-12">
        <p className="text-[10px] uppercase tracking-[0.32em] text-ink-300">{c.headerLine}</p>
        <div className="w-12 h-[2px]" style={{ background: c.accentColor }} />
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-[44px] uppercase tracking-[0.16em] font-light leading-[1.15]">
          {c.organizerName}
        </h1>
        <p className="text-[14px] uppercase tracking-[0.6em] my-3" style={{ color: c.accentColor }}>and</p>
        <h1 className="text-[44px] uppercase tracking-[0.16em] font-light leading-[1.15]">
          {c.partnerName}
        </h1>
      </div>
      <div className="grid grid-cols-2 gap-6 mt-12 text-[12px]">
        <div>
          <p className="text-[9px] uppercase tracking-[0.32em] text-ink-300 mb-1">Date</p>
          <p className="leading-tight">{c.dateLine}</p>
          {c.yearLine && <p className="leading-tight">{c.yearLine}</p>}
          <p className="text-[11px] text-ink-300 mt-1">{c.ceremonyTime}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.32em] text-ink-300 mb-1">Venue</p>
          <p className="leading-tight">{c.venueLine}</p>
          <p className="text-[11px] text-ink-300">{c.venueAddress}</p>
          <p className="text-[10px] uppercase tracking-[0.22em] mt-2 text-ink-300">{c.receptionLine}</p>
        </div>
      </div>
    </div>
  );
}

const TEMPLATE_COMPONENTS: Record<InvitationTemplateId, (c: InvitationCopy) => React.JSX.Element> = {
  editorial: Editorial,
  monogram: Monogram,
  asymmetric: Asymmetric,
  pressed: Pressed,
  botanical: Botanical,
  modern: Modern,
};
