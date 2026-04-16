"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, MessageCircle, Tag, RefreshCw, BookOpen, FileText, ThumbsUp, ThumbsDown } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

type ForumPost = {
  forum_id: string;
  brand_id: string;
  model_id?: string | null;
  model_name?: string | null;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  likes: number;
  dislikes: number;
  comment_count: number;
  Users: { name: string };
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
  required_parts?: string[];
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Expert:       "bg-red-50 text-red-700 border-red-200",
};

type ContentTypeFilter = "all" | "guides" | "forums" | "documents";

const BRANDS = [
  { id: "", name: "All Brands" },
  { id: "toyota", name: "Toyota" },
  { id: "mitsubishi", name: "Mitsubishi" },
  { id: "byd", name: "BYD" },
  { id: "suzuki", name: "Suzuki" },
  { id: "isuzu", name: "Isuzu" },
  { id: "ford", name: "Ford" },
  { id: "nissan", name: "Nissan" },
  { id: "honda", name: "Honda" },
  { id: "hyundai", name: "Hyundai" },
  { id: "kia", name: "Kia" },
  { id: "geely", name: "Geely" },
  { id: "mg", name: "MG" },
];

function SearchPageComponent() {
  const params = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [selectedBrand, setSelectedBrand] = useState(params.get("brand") ?? "");
  const [notice, setNotice] = useState("");
  const [guides, setGuides] = useState<RealGuide[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
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
    setSelectedBrand(params.get("brand") ?? "");
  }, [params]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const brandParam = selectedBrand ? `brandId=${encodeURIComponent(selectedBrand)}` : "";
        const guideUrl = brandParam ? `/api/guides?${brandParam}` : "/api/guides";
        const forumUrl = selectedBrand
          ? `/api/forum_posts_all?brandId=${encodeURIComponent(selectedBrand)}${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`
          : `/api/forum_posts_all${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`;

        const [guidesRes, forumRes] = await Promise.all([
          fetch(guideUrl),
          fetch(forumUrl),
        ]);
        const guidesData = await guidesRes.json();
        const forumData  = await forumRes.json();
        setGuides(guidesData.guides || []);
        setForumPosts(forumData.posts || []);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    fetchData();
  }, [selectedBrand, query]);

  const keywords = useMemo(() => {
    return query
      .toLowerCase()
      .split(/\s+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [query]);

  const filteredGuides = useMemo(() => {
    let results = guides;
    if (selectedBrand) {
      results = results.filter((item) => item.brand_id === selectedBrand);
    }
    if (!query.trim()) return results;
    return results.filter((item) => {
      const haystack = [
        item.title,
        item.model_name,
        item.brand_id,
        item.summary,
        item.difficulty,
        item.time_required,
        ...(item.tools ?? []),
        ...(item.required_parts ?? []),
      ].join(" ").toLowerCase();
      return keywords.every((k) => haystack.includes(k));
    });
  }, [guides, query, keywords, selectedBrand]);

  const filteredForum = useMemo(() => {
    let results = forumPosts;
    if (selectedBrand) {
      results = results.filter((item) => item.brand_id === selectedBrand);
    }
    if (!keywords.length) return results;
    return results.filter((item) => {
      const haystack = `${item.title} ${item.content} ${item.brand_id} ${item.model_name || item.model_id || ""} ${item.Users?.name ?? ""}`.toLowerCase();
      return keywords.every((k) => haystack.includes(k));
    });
  }, [forumPosts, keywords, selectedBrand]);

  const handleSearch = (value: string) => {
    setQuery(value);
    const trimmed = value.trim();
    const queryString = trimmed ? `q=${encodeURIComponent(trimmed)}` : "";
    const brandString = selectedBrand ? `brand=${encodeURIComponent(selectedBrand)}` : "";
    const joined = [queryString, brandString].filter(Boolean).join("&");
    router.replace(joined ? `/search?${joined}` : "/search");
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    const queryString = query.trim() ? `q=${encodeURIComponent(query.trim())}` : "";
    const brandString = brand ? `brand=${encodeURIComponent(brand)}` : "";
    const joined = [queryString, brandString].filter(Boolean).join("&");
    router.replace(joined ? `/search?${joined}` : "/search");
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

          {/* Content Type Filter */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Brand:</span>
              <select
                value={selectedBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="text-xs font-bold border border-border bg-background px-3 py-1.5 focus:outline-none"
              >
                {BRANDS.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
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
                <h2 className="text-3xl font-extrabold tracking-tight">Forum Posts</h2>
                <span className="text-sm text-primary">
                  {loading ? "Loading..." : `${filteredForum.length} result${filteredForum.length !== 1 ? "s" : ""}`}
                </span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <RefreshCw size={14} className="animate-spin" /> Loading forum posts...
                </div>
              ) : filteredForum.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm border border-dashed border-border rounded">
                  <MessageCircle size={28} className="mx-auto mb-2 opacity-30" />
                  {query ? "No forum posts found for your search." : "No forum posts yet."}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredForum.map((post) => (
                    <Link
                      key={post.forum_id}
                      href={user ? `/community/forum/${post.brand_id}/${post.forum_id}` : "/login"}
                      onClick={handleProtectedClick}
                      className="group block overflow-hidden rounded-2xl border border-border bg-background transition-all hover:border-primary/50"
                    >
                      <div className="p-5">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mb-2">
                          <span className="font-semibold text-primary capitalize">{post.brand_id}</span>
                          {post.model_name ? (
                            <>
                              <span>·</span>
                              <span className="capitalize">{post.model_name}</span>
                            </>
                          ) : null}
                          <span>·</span>
                          <span>{post.Users?.name || "Unknown"}</span>
                          <span>·</span>
                          <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                        <h3 className="text-base font-bold leading-snug mb-2 line-clamp-2">{post.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.content}</p>
                      </div>
                      <div className="border-t border-border px-5 pb-5 pt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><ThumbsUp size={11} /> {post.likes}</span>
                        <span className="flex items-center gap-1"><ThumbsDown size={11} /> {post.dislikes}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={11} /> {post.comment_count}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
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
  const hasThumbnail = !!guide.thumbnail_url;
  const thumbnailSrc = guide.thumbnail_url ?? "/no-thumbnail.png";

  return (
    <Link
      href={isLoggedIn ? href : "/login"}
      onClick={onProtectedClick}
      className="block h-full"
    >
      <div className="border border-border bg-background hover:border-primary/50 transition-colors group flex flex-col h-full overflow-hidden rounded-lg">
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img
            src={thumbnailSrc}
            alt={guide.title}
            className={`w-full h-full object-cover${!hasThumbnail ? " opacity-80" : ""}`}
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
          {guide.required_parts && guide.required_parts.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {guide.required_parts.slice(0, 3).map((p, i) => (
                <span key={i} className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 font-medium">{p}</span>
              ))}
              {guide.required_parts.length > 3 && (
                <span className="text-[9px] text-muted-foreground">+{guide.required_parts.length - 3} more</span>
              )}
            </div>
          )}
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
