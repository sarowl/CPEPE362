"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, MessageCircle, Tag, RefreshCw, User2, ThumbsUp, ThumbsDown, Clock3, BookOpen } from "lucide-react";
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

type ContentTypeFilter = "all" | "guide" | "forum";

function SearchPageComponent() {
  const [filter, setFilter] = useState<ContentTypeFilter>("all");
  const params = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [selectedBrand, setSelectedBrand] = useState(params.get("brand") ?? "");
  const [notice, setNotice] = useState("");
  const [guides, setGuides] = useState<RealGuide[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(false);

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
        const forumData = await forumRes.json();
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
      const haystack = `${item.title} ${item.content} ${item.brand_id} ${item.model_name ?? item.model_id ?? ""} ${item.Users?.name ?? ""}`.toLowerCase();
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

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Navbar />
      <main className="bg-secondary/40 flex-1 px-4 py-8 md:px-8">
        <section className="mx-auto w-full max-w-6xl rounded-2xl border border-border bg-background p-5 shadow-sm md:p-8">
          <h1 className="text-5xl font-black tracking-tight text-orange-600 drop-shadow-sm">Search</h1>

          <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-white px-4 h-14 shadow-sm focus-within:border-orange-400 transition-all">
            <Search size={20} className="text-orange-400 mr-2" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search guides, forums, car model, brand..."
              className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground font-medium"
            />
            {query ? (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="rounded-full p-2 text-muted-foreground hover:bg-orange-50 transition-colors"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Brand:</span>
              <select
                value={selectedBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="text-xs font-bold border border-border bg-background rounded px-3 py-1.5 focus:outline-none focus:border-orange-400 transition-colors"
              >
                {BRANDS.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${filter === "all" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-600 border-orange-300 hover:bg-orange-50"}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${filter === "guide" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-600 border-orange-300 hover:bg-orange-50"}`}
                onClick={() => setFilter("guide")}
              >
                <BookOpen size={13} /> Guide
              </button>
              <button
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${filter === "forum" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-600 border-orange-300 hover:bg-orange-50"}`}
                onClick={() => setFilter("forum")}
              >
                <MessageCircle size={13} /> Forum
              </button>
            </div>
          </div>

          {notice ? (
            <div className="mt-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
              {notice}{" "}
              <Link href="/login" className="font-semibold underline">
                Go to login
              </Link>
            </div>
          ) : null}

          <div>
            {(filter === "all" || filter === "guide") && (
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

            {(filter === "all" || filter === "forum") && (
              <section className="mt-10">
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="text-3xl font-extrabold tracking-tight">Forums</h2>
                  <span className="text-sm text-primary flex items-center min-w-[60px] justify-end">
                    {loading ? (
                      <>Loading...</>
                    ) : (
                      <>
                        {filteredForum.length} result{filteredForum.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-4 min-h-[80px] w-full">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm w-full">
                      <RefreshCw className="animate-spin" size={16} /> Loading forums...
                    </div>
                  ) : filteredForum.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm border border-dashed border-border rounded">
                      <MessageCircle size={28} className="mx-auto mb-2 opacity-30" />
                      {query ? "No forum posts found for your search." : "No forum posts yet."}
                    </div>
                  ) : (
                    filteredForum.map((post, idx) => (
                      <Link
                        key={post.forum_id}
                        href={user ? `/community/forum/${post.brand_id}/${post.forum_id}` : "/login"}
                        onClick={handleProtectedClick}
                        className={
                          `group flex items-start gap-5 rounded-2xl border border-border bg-white w-full p-7 shadow-md \
                          transition-all duration-300 ease-out \
                          hover:shadow-xl hover:-translate-y-1 hover:border-orange-400 \
                          opacity-0 animate-fade-in`}
                        style={{ maxWidth: "100%", animationDelay: `${idx * 60}ms`, animationFillMode: "forwards" }}
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600 border border-orange-200 shadow-sm group-hover:scale-105 transition-transform duration-300">
                          <MessageCircle size={26} />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                              <Tag size={11} /> Forum
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 border border-orange-300 px-2 py-0.5 text-[11px] uppercase tracking-widest text-orange-700 font-bold">
                              {post.brand_id}
                            </span>
                            {post.model_name && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600 font-semibold">
                                {post.model_name}
                              </span>
                            )}
                            {post.Users?.name && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-[11px] tracking-widest text-gray-700 font-semibold">
                                <User2 size={12} className="text-gray-400" /> by {post.Users.name}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] text-green-700 font-semibold">
                              <ThumbsUp size={12} className="text-green-400" /> {post.likes}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] text-red-700 font-semibold">
                              <ThumbsDown size={12} className="text-red-400" /> {post.dislikes}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] text-blue-700 font-semibold">
                              <MessageCircle size={11} className="text-blue-400" /> {post.comment_count}
                            </span>
                          </div>
                          <p className="text-lg font-extrabold leading-snug line-clamp-2 mb-1 group-hover:text-orange-700 transition-colors">{post.title}</p>
                          <p className="text-[15px] text-muted-foreground line-clamp-3">{post.content}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading search...</div>}>
      <SearchPageComponent />
    </Suspense>
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
  const thumbnailSrc = guide.thumbnail_url || "/no-thumbnail.png";
  return (
    <Link
      href={isLoggedIn ? href : "/login"}
      onClick={onProtectedClick}
      className="group block h-full animate-fade-in"
    >
      <div className="border border-border bg-white hover:border-orange-400 hover:shadow-xl shadow-md transition-all duration-300 flex flex-col h-full overflow-hidden rounded-2xl">
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img
            src={thumbnailSrc}
            alt={guide.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.errored) { img.dataset.errored = "1"; img.src = "/no-thumbnail.png"; } else { img.style.display = "none"; }
            }}
          />
        </div>
        <div className="p-5 flex flex-col gap-2 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-0.5">
              {guide.brand_id} · {guide.model_name}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${diffColor}`}>
              {guide.difficulty}
            </span>
          </div>
          <h3 className="text-lg font-extrabold leading-snug line-clamp-2 mb-1 group-hover:text-orange-700 transition-colors">{guide.title}</h3>
          <p className="text-[15px] text-muted-foreground line-clamp-3">{guide.summary}</p>
          {guide.required_parts && guide.required_parts.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {guide.required_parts.slice(0, 3).map((p, i) => (
                <span key={i} className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 font-medium rounded">{p}</span>
              ))}
              {guide.required_parts.length > 3 && (
                <span className="text-[9px] text-muted-foreground">+{guide.required_parts.length - 3} more</span>
              )}
            </div>
          )}
          <div className="border-t border-border my-2 w-full" />
          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="text-xs text-muted-foreground font-mono tracking-wide flex items-center gap-1">
              <Clock3 size={14} className="inline-block mr-1 text-orange-400" />
              {guide.time_required}
            </span>
            <span className="text-sm font-bold text-orange-600 group-hover:underline group-hover:text-orange-700 transition-colors cursor-pointer select-none">
              {isLoggedIn ? "VIEW GUIDE →" : "🔒 LOGIN TO VIEW"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
