"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { RefreshCw, ArrowLeft, Wrench, Search, X } from "lucide-react";

type BookmarkedGuide = {
  guide_id: string;
  title: string;
  summary: string;
  brand_id: string;
  model_id: string;
  model_name: string;
  difficulty: string;
  time_required: string;
  created_at: string;
  thumbnail_url?: string | null;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Expert:       "bg-red-50 text-red-700 border-red-200",
};

export default function BookmarksPage() {
  const router = useRouter();
  const [guides, setGuides]   = useState<BookmarkedGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 4.1: Expanded searchable fields for bookmarks
  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return guides;
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return guides.filter((g) => {
      const hay = [g.title, g.brand_id, g.model_name, g.difficulty, g.time_required].join(" ").toLowerCase();
      return keywords.every((k) => hay.includes(k));
    });
  }, [guides, searchQuery]);

  useEffect(() => {
    fetch("/api/guides-likes/mine")
      .then((r) => {
        if (r.status === 401) { setAuthError(true); return { guides: [] }; }
        return r.json();
      })
      .then((json) => {
        setGuides(json.guides ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (authError) {
    // Redirect to login — not authenticated
    router.replace("/login?redirect=/bookmarks");
    return null;
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8 border-b border-border pb-6 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            {/* SECTION 2.1: bookmark-icon-profile.png for this page */}
            <img src="/bookmark-icon-profile.png" alt="Bookmarks" width={28} height={28} className="object-contain" />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">My Collection</p>
              <h1 className="font-black uppercase tracking-tighter text-3xl">Bookmarks</h1>
            </div>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed hidden sm:block">
            Guides you've saved — only visible to you.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <RefreshCw size={14} className="animate-spin" /> Loading bookmarks...
          </div>
        ) : guides.length === 0 ? (
          <div className="border border-dashed border-border flex flex-col items-center justify-center py-20 gap-4">
            <img src="/bookmark-icon-profile.png" alt="" width={40} height={40} className="object-contain opacity-30" />
            <p className="text-sm font-bold text-muted-foreground">No bookmarks yet</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
              Browse repair guides and bookmark the ones you find helpful.
            </p>
            <Link href="/car-makers" className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all mt-1">
              Browse Guides
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-mono mb-3">
              {filteredGuides.length} bookmarked guide{filteredGuides.length !== 1 ? "s" : ""}
            </p>

            {/* 4.1: Search bar */}
            <div className="mb-5 flex items-center gap-2 border border-border bg-background px-3 h-10">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, brand, model, difficulty, time..."
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-ink">
                  <X size={13} />
                </button>
              )}
            </div>

            {filteredGuides.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm border border-dashed border-border">
                No bookmarks match your search.{" "}
                <button onClick={() => setSearchQuery("")} className="text-primary underline">Clear</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGuides.map((guide) => (
                  <BookmarkCard key={guide.guide_id} guide={guide} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink transition-colors"
          >
            <ArrowLeft size={13} /> Back
          </button>
        </div>
      </main>
    </div>
  );
}

// SECTION 3: Bookmark card — same layout as community guides
// Shows thumbnail (full aspect ratio) above the info card
function BookmarkCard({ guide }: { guide: BookmarkedGuide }) {
  const diffColor = DIFFICULTY_COLORS[guide.difficulty] ?? "bg-secondary text-muted-foreground border-border";
  const href = `/guides/${guide.brand_id}/${guide.model_id}/${guide.guide_id}`;
  // SECTION 6: Use actual thumbnail if available; only fallback if genuinely absent
  const thumbnailSrc = guide.thumbnail_url ?? "/no-thumbnail.png";

  return (
    <Link href={href} className="block h-full group">
      <div className="border border-border bg-background hover:border-primary/50 transition-colors flex flex-col h-full overflow-hidden rounded">
        {/* Thumbnail — full aspect ratio (Section 6.2) */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img
            src={thumbnailSrc}
            alt={guide.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.errored) { img.dataset.errored = "1"; img.src = "/no-thumbnail.png"; } else { img.style.display = "none"; }
              }}
          />
        </div>
        <div className="p-4 flex flex-col gap-2 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground capitalize">
              {guide.brand_id} · {guide.model_name}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${diffColor}`}>
              {guide.difficulty}
            </span>
          </div>
          <h3 className="text-sm font-bold leading-snug line-clamp-2">{guide.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-2">{guide.summary}</p>
          <div className="pt-2 border-t border-border mt-auto flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground">{guide.time_required}</span>
            <span className="text-[10px] font-bold text-primary group-hover:underline tracking-wide">VIEW GUIDE →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
