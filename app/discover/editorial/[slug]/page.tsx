import Link from "next/link";
import { notFound } from "next/navigation";
import { EDITORIAL } from "@/lib/discover/editorial";

export default async function EditorialDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = EDITORIAL.find((a) => a.slug === slug);
  if (!article) notFound();
  return (
    <div className="max-w-[680px] mx-auto pb-24">
      <Link href="/discover" className="text-[10.5px] uppercase tracking-[0.26em] text-ink-300 hover:text-sage-500 transition-colors">
        ← Discover
      </Link>
      <div className="relative rounded-card overflow-hidden bg-paper-200 mt-6" style={{ aspectRatio: "5 / 3" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={article.cover} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <p className="text-[10.5px] uppercase tracking-[0.26em] text-sage-500 font-mono mt-7">{article.category} · {article.readMinutes} min</p>
      <h1 className="display text-[36px] sm:text-[44px] mt-3 leading-[1.1]">{article.title}</h1>
      <p className="display italic text-[18px] text-ink-400 mt-5 leading-relaxed">{article.excerpt}</p>
      <div className="rounded-card border hairline glass px-6 py-10 mt-8 text-center">
        <p className="display italic text-[20px] text-sage-500">Coming soon.</p>
        <p className="text-[13px] text-ink-300 mt-2 leading-relaxed max-w-md mx-auto">
          We're writing this one with care. In the meantime, the rest of the editorial library lives back on Discover.
        </p>
      </div>
    </div>
  );
}
