import Link from "next/link";
import { notFound } from "next/navigation";
import { findVibe } from "@/lib/discover/vibes";
import { DISCOVER_VENUES } from "@/lib/discover/venues";
import { REAL_WEDDINGS } from "@/lib/discover/weddings";

export default async function VibeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vibe = findVibe(slug);
  if (!vibe) notFound();
  const venues = DISCOVER_VENUES.filter((v) => v.vibeTags.includes(slug));
  const weddings = REAL_WEDDINGS.filter((w) => w.vibeTags.includes(slug));

  return (
    <div className="flex flex-col gap-12 pb-24">
      {/* Hero */}
      <section className="relative rounded-card overflow-hidden bg-paper-200" style={{ aspectRatio: "16 / 7" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={vibe.image} alt={vibe.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-7 lg:p-10">
          <p className="text-[10.5px] uppercase tracking-[0.26em] font-mono text-paper-50/80">A vibe</p>
          <h1 className="display italic text-paper-50 text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.0] mt-2">{vibe.name}</h1>
          <p className="text-paper-50/85 text-[14px] mt-3 max-w-[640px] leading-relaxed">{vibe.description}</p>
        </div>
      </section>

      {/* Palette */}
      <section>
        <p className="text-[10.5px] uppercase tracking-[0.26em] font-mono text-sage-500 mb-3">Palette</p>
        <div className="flex gap-2">
          {vibe.palette.map((c) => (
            <div key={c} className="flex flex-col items-start">
              <div className="w-16 h-16 rounded-md border hairline" style={{ background: c }} aria-label={c} />
              <span className="text-[10px] text-ink-300 font-mono mt-1.5">{c}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Signature pieces */}
      <section>
        <p className="text-[10.5px] uppercase tracking-[0.26em] font-mono text-sage-500 mb-3">Signature pieces</p>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {vibe.signaturePieces.map((p) => (
            <li key={p} className="rounded-card border hairline bg-white/70 px-4 py-3 display italic text-[15px] text-ink leading-tight">{p}</li>
          ))}
        </ul>
      </section>

      {/* Venues that match */}
      {venues.length > 0 && (
        <section>
          <h2 className="display text-[26px] mb-5">Venues in this vibe</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((v) => (
              <article key={v.id} className="rounded-card overflow-hidden border hairline bg-white">
                <div className="relative bg-paper-200" style={{ aspectRatio: "16 / 9" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.image} alt={v.name} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="display text-[18px] text-ink leading-tight">{v.name}</h3>
                  <p className="text-[12px] text-ink-300 mt-0.5">{v.city}</p>
                  <p className="display italic text-[14px] text-ink-400 mt-2 leading-relaxed">{v.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Real weddings in this vibe */}
      {weddings.length > 0 && (
        <section>
          <h2 className="display text-[26px] mb-5">Real weddings in this vibe</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {weddings.map((w) => (
              <article key={w.id} className="rounded-card overflow-hidden border hairline bg-white">
                <div className="relative bg-paper-200" style={{ aspectRatio: "16 / 9" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.hero} alt={w.couple} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="display text-[18px] text-ink leading-tight">{w.couple}</h3>
                  <p className="text-[12px] text-ink-300 mt-0.5">{w.region} · {w.season}</p>
                  <p className="display italic text-[13.5px] text-ink-400 mt-2 leading-relaxed line-clamp-2">&ldquo;{w.pullQuote}&rdquo;</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Start a board */}
      <section className="rounded-card border hairline glass px-7 py-10 text-center">
        <p className="display italic text-[24px] text-ink leading-tight">Start a board with this vibe</p>
        <p className="text-[13.5px] text-ink-300 mt-2 leading-relaxed max-w-md mx-auto">
          Pin photos, add your own, and let Maestro generate variations until the room is exactly right.
        </p>
        <Link href="/mood-board" className="cta-sage inline-block mt-5 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all">
          Open mood board →
        </Link>
      </section>
    </div>
  );
}
