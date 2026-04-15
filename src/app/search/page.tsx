"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Wrench, MessageCircle, Tag, RefreshCw, BookOpen, FileText } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

type ForumResult = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  answers: number;
};

type RealGuide = {
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
  tools?: string[];
};

const FORUM_RESULTS: ForumResult[] = [
  {
    id: 1,
    title: "How do I exchange the radiator cooling fan motor from a 2014 Vios?",
    content: "Fan motor from my 2014 Toyota Vios seems dead. Any compatible parts and steps?",
    tags: ["toyota", "vios", "cooling-system"],
    answers: 1,
  },
  {
    id: 2,
    title: "Does Toyota Vista 1996 have an aircon filter?",
    content: "If yes, where is it located and how do I remove it safely?",
    tags: ["toyota", "vista", "aircon"],
    answers: 2,
  },
  {
    id: 3,
    title: "My Toyota Vitz jerks while driving",
    content: "Not CVT anymore? Any assistance would be appreciated.",
    tags: ["toyota", "vitz", "transmission"],
    answers: 0,
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Expert:       "bg-red-50 text-red-700 border-red-200",
};

type ContentTypeFilter = "all" | "guides" | "forums" | "documents";

function SearchPageComponent() {
  const params = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [notice, setNotice] = useState("");
  const [guides, setGuides] = useState<RealGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState<ContentTypeFilter>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    async function fetchAllGuides() {
      setLoading(true);
      try {
        const res = await fetch("/api/guides");
        const data = await res.json();
        setGuides(data.guides || []);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    fetchAllGuides();
  }, []);

  const keywords = useMemo(() => {
    return query
      .toLowerCase()
      .split(/\s+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [query]);

  // 4.1: Expanded searchable fields — Title, Time, Brand, Model, Difficulty, Tools
  const filteredGuides = useMemo(() => {
    if (!query.trim()) return guides;
    return guides.filter((item) => {
      const haystack = [
        item.title,
        item.model_name,
        item.brand_id,
        item.summary,
        item.difficulty,
        item.time_required,
        ...(item.tools ?? []),
      ].join(" ").toLowerCase();
      return keywords.every((k) => haystack.includes(k));
    });
  }, [guides, query, keywords]);

  const filteredForum = useMemo(() => {
    if (!keywords.length) return FORUM_RESULTS;
    return FORUM_RESULTS.filter((item) => {
      const haystack = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase();
      return keywords.every((k) => haystack.includes(k));
    });
  }, [keywords]);

  const handleSearch = (value: string) => {
    setQuery(value);
    const trimmed = value.trim();
    if (trimmed) {
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
      return;
    }
    router.replace("/search");
  };

  const handleProtectedClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user) return;
    e.preventDefault();
    setNotice("Login is required to view full content.");
  };

  const TYPE_FILTERS: { value: ContentTypeFilter; label: string; icon: React.ReactNode }[] = [
    { value: "all",       label: "All",       icon: <Search size={12} /> },
    { value: "guides",    label: "Guides",    icon: <BookOpen size={12} /> },
    { value: "forums",    label: "Forums",    icon: <MessageCircle size={12} /> },
    { value: "documents", label: "Documents", icon: <FileText size={12} /> },
  ];

  const showGuides    = contentType === "all" || contentType === "guides";
  const showForums    = contentType === "all" || contentType === "forums";
  const showDocuments = contentType === "all" || contentType === "documents";

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Navbar />
      <main className="bg-secondary/40 flex-1 px-4 py-8 md:px-8">
        <section className="mx-auto w-full max-w-6xl rounded-2xl border border-border bg-background p-5 shadow-sm md:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Search</h1>

          {/* Search bar */}
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-background px-3 h-11">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by title, brand, model, difficulty, tools, time..."
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query ? (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="rounded p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          {/* 4.2: Content Type Filter */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Show:</span>
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setContentType(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors ${
                  contentType === f.value
                    ? "bg-primary text-white border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {notice ? (
            <div className="mt-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
              {notice}{" "}
              <Link href="/login" className="font-semibold underline">
                Go to login
              </Link>
            </div>
          ) : null}

          {/* Guides Section */}
          {showGuides && (
            <section className="mt-8">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-3xl font-extrabold tracking-tight">Guides</h2>
                <span className="text-sm text-primary">
                  {loading ? "Loading..." : `${filteredGuides.length} result${filteredGuides.length !== 1 ? "s" : ""}`}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <RefreshCw size={14} className="animate-spin" /> Loading guides...
                </div>
              ) : filteredGuides.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  {query ? "No guides found for your search." : "No approved guides yet."}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGuides.map((guide) => (
                    <SearchGuideCard
                      key={guide.guide_id}
                      guide={guide}
                      isLoggedIn={!!user}
                      onProtectedClick={handleProtectedClick}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Forums Section */}
          {showForums && (
            <section className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-3xl font-extrabold tracking-tight">Answers</h2>
                <span className="text-sm text-primary">
                  {filteredForum.length} result{filteredForum.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-4">
                {filteredForum.map((post) => (
                  <Link
                    key={post.id}
                    href={`/community/forum/${post.id}`}
                    onClick={handleProtectedClick}
                    className="flex items-start gap-4 rounded-2xl border border-border p-4 transition-colors hover:border-primary/50"
                  >
                    <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                      <MessageCircle size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                          <Tag size={11} /> Forum
                        </span>
                      </div>
                      <p className="line-clamp-2 text-base font-semibold leading-snug">{post.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      {post.answers} {post.answers === 1 ? "answer" : "answers"}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Documents Section */}
          {showDocuments && (
            <section className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-3xl font-extrabold tracking-tight">Documents</h2>
                <span className="text-sm text-primary">0 results</span>
              </div>
              <div className="py-10 text-center text-muted-foreground text-sm border border-dashed border-border rounded">
                <FileText size={28} className="mx-auto mb-2 opacity-30" />
                No documents available yet.
              </div>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}

// Search Guide Card — full 16:9 thumbnail, expanded search fields
function SearchGuideCard({
  guide,
  isLoggedIn,
  onProtectedClick,
}: {
  guide: RealGuide;
  isLoggedIn: boolean;
  onProtectedClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const diffColor = DIFFICULTY_COLORS[guide.difficulty] ?? "bg-secondary text-muted-foreground border-border";
  const href = `/guides/${guide.brand_id}/${guide.model_id}/${guide.guide_id}`;
  const thumbnailSrc = guide.thumbnail_url ?? "/no-thumbnail.png";

  return (
    <Link
      href={isLoggedIn ? href : "/login"}
      onClick={onProtectedClick}
      className="block h-full"
    >
      <div className="border border-border bg-background hover:border-primary/50 transition-colors group flex flex-col h-full overflow-hidden rounded-lg">
        {/* Full 16:9 aspect ratio thumbnail */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img
            src={thumbnailSrc}
            alt={guide.title}
            className="w-full h-full object-cover"
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
            <span className="text-[10px] font-bold text-primary group-hover:underline tracking-wide">
              {isLoggedIn ? "VIEW GUIDE →" : "🔒 LOGIN TO VIEW"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading search...</div>}>
      <SearchPageComponent />
    </Suspense>
  );
}
