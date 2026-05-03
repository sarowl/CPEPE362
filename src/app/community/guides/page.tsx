"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Fuse from "fuse.js";
import type { FuseResultMatch } from "fuse.js";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, Wrench, Plus, RefreshCw } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

type Guide = {
  guide_id: string;
  title: string;
  summary: string;
  difficulty: string;
  time_required: string;
  brand_id: string;
  model_id: string;
  model_name: string;
  user_id: string;
  created_at: string;
  thumbnail_url?: string | null;
  required_parts?: string[];
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Expert:       "bg-red-50 text-red-700 border-red-200",
};

export default function CommunityGuidesPage() {
  const router = useRouter();
  const [user, setUser]     = useState<User | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetch("/api/guides")
      .then((r) => r.json())
      .then((d) => { setGuides(d.guides ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);


  // Debounce query input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Fuse.js setup
  const fuse = useMemo(() =>
    new Fuse(guides, {
      keys: [
        "title",
        "model_name",
        "brand_id",
        "summary",
        "difficulty",
        "time_required",
        "required_parts"
      ],
      threshold: 0.4, // typo-tolerance
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    }),
    [guides]
  );

  const filtered = useMemo(() => {
    if (!debouncedQuery) return guides.map(g => ({ item: g, matches: undefined }));
    return fuse.search(debouncedQuery);
  }, [debouncedQuery, fuse, guides]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;
    if (e.key === "ArrowDown") {
      setActiveIndex((prev) => (prev + 1) % filtered.length);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      e.preventDefault();
    } else if (e.key === "Enter" && activeIndex >= 0 && filtered[activeIndex]?.item) {
      const href = `/guides/${filtered[activeIndex].item.brand_id}/${filtered[activeIndex].item.model_id}/${filtered[activeIndex].item.guide_id}?source=community`;
      window.location.href = href;
    }
  }, [filtered, activeIndex]);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8 border-b border-border pb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Community</p>
            <h1 className="font-black uppercase tracking-tighter text-3xl">
              Repair <span className="text-primary">Guides</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
              Browse all community-created repair guides. Use the search bar to filter by keyword, brand, or model.
            </p>
          </div>
          {user && (
            <Link
              href="/guides/create?source=community"
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all"
            >
              <Plus size={13} /> Create Guide
            </Link>
          )}
        </div>

        {/* Search bar */}
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 border border-border bg-background px-3 h-11 rounded">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
              onKeyDown={handleKeyDown}
              placeholder='Search by keyword, brand, model, difficulty...'
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search guides"
            />
            {query && (
              <button onClick={() => { setQuery(""); setActiveIndex(-1); }} className="rounded p-1 text-muted-foreground hover:bg-secondary">
                <X size={14} />
              </button>
            )}
          </div>
          {/* Results dropdown for keyboard navigation (optional, can be removed if not needed) */}
        </div>

        {/* Stats */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">
            {loading ? "Loading..." : `${filtered.length} guide${filtered.length !== 1 ? "s" : ""}${debouncedQuery ? " found" : " available"}`}
          </span>
          {!user && (
            <span className="text-xs text-muted-foreground">
              <Link href="/login" className="text-primary underline font-semibold">Log in</Link> to view full guides and create your own.
            </span>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <RefreshCw size={14} className="animate-spin" /> Loading guides...
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border rounded flex flex-col items-center justify-center py-20 gap-3">
            <Wrench size={32} className="text-muted-foreground/40" />
            <p className="text-sm font-bold text-muted-foreground">
              {debouncedQuery ? "No guides match your search" : "No approved guides yet"}
            </p>
            {debouncedQuery && (
              <button onClick={() => { setQuery(""); setActiveIndex(-1); }} className="text-xs text-primary underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((result, idx) => (
              <GuideCard
                key={result.item.guide_id}
                guide={result.item}
                isLoggedIn={!!user}
                matches={result.matches ? Array.from(result.matches) : undefined}
                highlight={debouncedQuery.length > 0}
                isActive={activeIndex === idx}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Highlight helper
function highlightText(text: string, matches: FuseResultMatch[] | undefined, key: string) {
  if (!matches) return text;
  const match = matches.find((m) => m.key === key);
  if (!match || !match.indices.length) return text;
  let lastIndex = 0;
  const parts = [];
  match.indices.forEach(([start, end], i) => {
    if (lastIndex < start) parts.push(text.slice(lastIndex, start));
    parts.push(<span key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(start, end + 1)}</span>);
    lastIndex = end + 1;
  });
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

interface GuideCardProps {
  guide: Guide;
  isLoggedIn: boolean;
  matches?: FuseResultMatch[];
  highlight?: boolean;
  isActive?: boolean;
}

function GuideCard({ guide, isLoggedIn, matches, highlight, isActive }: GuideCardProps) {
  const diffColor = DIFFICULTY_COLORS[guide.difficulty] ?? "bg-secondary text-muted-foreground border-border";
  const href = `/guides/${guide.brand_id}/${guide.model_id}/${guide.guide_id}?source=community`;
  const hasThumbnail = !!guide.thumbnail_url;
  const thumbnailSrc = guide.thumbnail_url ?? "/no-thumbnail.png";

  const cardBorder = isActive ? "border-primary ring-2 ring-primary/30" : "border-border";

  return (
    <Link href={isLoggedIn ? href : "/login"} className={`block h-full focus:outline-none ${isActive ? "ring-2 ring-primary/30" : ""}`}
      tabIndex={0}
    >
      <div className={`border bg-background hover:border-primary/50 transition-colors group flex flex-col h-full overflow-hidden ${cardBorder}`}>
        {/* Thumbnail */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img
            src={thumbnailSrc}
            alt={guide.title}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105${!hasThumbnail ? " opacity-80" : ""}`}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.errored) { img.dataset.errored = "1"; img.src = "/no-thumbnail.png"; } else { img.style.display = "none"; }
            }}
          />
        </div>
        <div className="p-5 flex flex-col gap-2 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground capitalize">
              {highlight ? highlightText(guide.brand_id, matches, "brand_id") : guide.brand_id} · {highlight ? highlightText(guide.model_name, matches, "model_name") : guide.model_name}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${diffColor}`}>
              {highlight ? highlightText(guide.difficulty, matches, "difficulty") : guide.difficulty}
            </span>
          </div>
          <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-[#ca3500] transition-colors">
            {highlight ? highlightText(guide.title, matches, "title") : guide.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3">
            {highlight ? highlightText(guide.summary, matches, "summary") : guide.summary}
          </p>
          {guide.required_parts && guide.required_parts.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {guide.required_parts.slice(0, 3).map((p, i) => (
                <span key={i} className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 font-medium">
                  {highlight ? highlightText(p, matches, `required_parts.${i}`) : p}
                </span>
              ))}
              {guide.required_parts.length > 3 && (
                <span className="text-[9px] text-muted-foreground">+{guide.required_parts.length - 3} more</span>
              )}
            </div>
          )}
          <div className="pt-2 border-t border-border mt-auto flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground">{guide.time_required}</span>
            <span className="text-[10px] font-bold text-primary group-hover:underline tracking-wide">
              {isLoggedIn ? "VIEW GUIDE →" : "LOGIN TO VIEW"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
