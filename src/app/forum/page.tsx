"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { fuzzySearchForums } from "@/lib/fuzzySystemSearch";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ThumbsUp, ThumbsDown, MessageCircle, Plus, RefreshCw,
  ChevronDown, ChevronUp, Pencil, Trash2, Check, X, Filter,
  Search, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface ForumPost {
  forum_id: string;
  brand_id: string;
  model_id?: string | null;
  model_name?: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  likes: number;
  dislikes: number;
  comment_count: number;
  Users: { name: string };
}

// Tracks per-post user reaction to prevent double-voting and enable optimistic UI
type ReactionMap = Record<string, "like" | "dislike" | null>;

const BRANDS = [
  { name: "All Brands", id: "" },
  { name: "Toyota", id: "toyota" },
  { name: "Mitsubishi", id: "mitsubishi" },
  { name: "BYD", id: "byd" },
  { name: "Suzuki", id: "suzuki" },
  { name: "Isuzu", id: "isuzu" },
  { name: "Ford", id: "ford" },
  { name: "Nissan", id: "nissan" },
  { name: "Honda", id: "honda" },
  { name: "Hyundai", id: "hyundai" },
  { name: "Kia", id: "kia" },
  { name: "Geely", id: "geely" },
  { name: "MG", id: "mg" },
];

function truncateWords(text: string, limit: number) {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return { text, truncated: false };
  return { text: words.slice(0, limit).join(" ") + "...", truncated: true };
}

type SortOption = "latest" | "oldest" | "popular";

function ForumPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  // Read brand from URL param so redirect from Auto Hub auto-filters
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") ?? "");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Search & sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("latest");

  // Debounce search input for performance
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Track per-post user reactions (optimistic UI, no page reload)
  const [reactions, setReactions] = useState<ReactionMap>({});
  // Track which posts are currently processing a vote (prevents double-clicks)
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedBrand
        ? `/api/forum_posts_all?brandId=${selectedBrand}`
        : "/api/forum_posts_all";
      const res = await fetch(url);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedBrand]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // After posts load, fetch the current user's reactions for all posts
  useEffect(() => {
    if (!user || posts.length === 0) {
      setReactions({});
      return;
    }
    async function fetchMyReactions() {
      const postIds = posts.map((p) => p.forum_id);
      const { data: votes } = await supabase
        .from("ForumVote")
        .select("target_id, vote")
        .eq("user_id", user!.id)
        .eq("target_type", "post")
        .in("target_id", postIds);

      const map: ReactionMap = {};
      postIds.forEach((id) => { map[id] = null; });
      (votes || []).forEach((v: { target_id: string; vote: number }) => {
        map[v.target_id] = v.vote === 1 ? "like" : v.vote === -1 ? "dislike" : null;
      });
      setReactions(map);
    }
    fetchMyReactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, posts.length]);

  const handleVote = async (postId: string, vote: 1 | -1) => {
    if (!user) return;
    // Prevent concurrent votes on the same post
    if (votingIds.has(postId)) return;

    const voteLabel: "like" | "dislike" = vote === 1 ? "like" : "dislike";
    const currentReaction = reactions[postId] ?? null;
    const isToggleOff = currentReaction === voteLabel;

    // --- Optimistic update (no scroll disruption) ---
    setVotingIds((prev) => new Set(prev).add(postId));

    setPosts((prev) =>
      prev.map((p) => {
        if (p.forum_id !== postId) return p;
        let { likes, dislikes } = p;
        // Remove previous reaction
        if (currentReaction === "like") likes = Math.max(0, likes - 1);
        if (currentReaction === "dislike") dislikes = Math.max(0, dislikes - 1);
        // Apply new reaction (skip if toggling off)
        if (!isToggleOff) {
          if (vote === 1) likes += 1;
          else dislikes += 1;
        }
        return { ...p, likes, dislikes };
      })
    );
    setReactions((prev) => ({
      ...prev,
      [postId]: isToggleOff ? null : voteLabel,
    }));

    try {
      await fetch("/api/forum_vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_id: postId, target_type: "post", vote }),
      });
      // Background sync to reconcile true counts without affecting scroll
      fetch(selectedBrand ? `/api/forum_posts_all?brandId=${selectedBrand}` : "/api/forum_posts_all")
        .then((r) => r.json())
        .then((data) => { if (data.posts) setPosts(data.posts); })
        .catch(() => { /* ignore */ });
    } catch {
      // Revert on failure
      setReactions((prev) => ({ ...prev, [postId]: currentReaction }));
      fetchPosts();
    } finally {
      setVotingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    setDeletingId(postId);
    await fetch("/api/forum_post_delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forum_id: postId }),
    });
    setDeletingId(null);
    fetchPosts();
  };

  const startEdit = (post: ForumPost) => {
    setEditingPost(post.forum_id);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  const saveEdit = async (postId: string) => {
    setSavingEdit(true);
    await fetch("/api/forum_post_update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forum_id: postId, title: editTitle, content: editContent }),
    });
    setSavingEdit(false);
    setEditingPost(null);
    fetchPosts();
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  // Apply brand filter → fuzzy search → sort
  const processedPosts = React.useMemo(() => {
    let result = selectedBrand
      ? posts.filter((p) => p.brand_id === selectedBrand)
      : posts;

    if (debouncedQuery.trim()) {
      result = fuzzySearchForums(result, debouncedQuery);
    }

    result = [...result].sort((a, b) => {
      if (sortBy === "latest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "popular") return b.likes - a.likes;
      return 0;
    });

    return result;
  }, [posts, selectedBrand, debouncedQuery, sortBy]);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex gap-6">

        {/* LEFT SIDEBAR - Brand Filter */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 gap-2">
          <div className="sticky top-20">
            <div className="mb-3 flex items-center gap-2">
              <Filter size={14} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                Filter by Brand
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {BRANDS.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => setSelectedBrand(brand.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-left rounded text-xs font-mono transition-colors ${
                    selectedBrand === brand.id
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-ink hover:bg-secondary"
                  }`}
                >
                  {brand.id && (
                    <img
                      src={`/car-makers/${brand.id}.png`}
                      alt={brand.name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <span className="capitalize">{brand.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">
                <span className="text-primary">Forum</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? `${processedPosts.length} result${processedPosts.length !== 1 ? "s" : ""} for "${searchQuery}"`
                  : selectedBrand
                    ? `Showing posts for ${BRANDS.find((b) => b.id === selectedBrand)?.name ?? selectedBrand}`
                    : "All community forum posts"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className="md:hidden flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-xs"
              >
                <Filter size={12} /> Filter
              </button>
              {user && (
                <Link
                  href={selectedBrand ? `/community/forum/create?brand=${selectedBrand}&source=forum` : "/community/forum/create?source=forum"}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all"
                >
                  <Plus size={13} /> New Post
                </Link>
              )}
            </div>
          </div>

          {/* Search & Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search input */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, brand, model, or username..."
                className="w-full pl-9 pr-4 py-2 border border-border bg-background font-mono text-xs text-ink placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-1 hidden sm:inline">Sort:</span>
              {([
                { key: "latest", label: "Latest", icon: <ArrowDown size={11} /> },
                { key: "oldest", label: "Oldest", icon: <ArrowUp size={11} /> },
                { key: "popular", label: "Popular", icon: <ArrowUpDown size={11} /> },
              ] as { key: SortOption; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`flex items-center gap-1 px-3 py-2 font-mono text-[10px] uppercase tracking-widest border transition-colors ${
                    sortBy === key
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "border-border text-muted-foreground hover:border-ink hover:text-ink"
                  }`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile brand filter */}
          {filterOpen && (
            <div className="md:hidden mb-4 p-3 border border-border bg-background rounded">
              <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Filter by Brand</p>
              <div className="flex flex-wrap gap-2">
                {BRANDS.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => { setSelectedBrand(brand.id); setFilterOpen(false); }}
                    className={`px-2 py-1 text-xs font-mono border rounded capitalize transition-colors ${
                      selectedBrand === brand.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <RefreshCw size={14} className="animate-spin" /> Loading posts...
            </div>
          ) : processedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded gap-3">
              <MessageCircle size={32} className="text-muted-foreground/40" />
              <p className="text-sm font-bold text-muted-foreground">No posts yet</p>
              {user && (
                <Link
                  href={selectedBrand ? `/community/forum/create?brand=${selectedBrand}&source=forum` : "/community/forum/create?source=forum"}
                  className="bg-primary text-primary-foreground px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all"
                >
                  + Create First Post
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {processedPosts.map((post) => {
                const isExpanded = expandedPosts.has(post.forum_id);
                const { text: previewText, truncated } = truncateWords(post.content, 110);
                const isOwner = user?.id === post.user_id;
                const isEditing = editingPost === post.forum_id;
                const myReaction = reactions[post.forum_id] ?? null;
                const isVoting = votingIds.has(post.forum_id);

                return (
                  <div
                    key={post.forum_id}
                    className="border border-border bg-background rounded-lg overflow-hidden hover:border-primary/40 transition-colors"
                  >
                    <div className="p-5">
                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mb-2">
                        <span className="capitalize font-semibold text-primary">{post.brand_id}</span>
                        {post.model_name ? (
                          <>
                            <span>·</span>
                            <span className="capitalize">{post.model_name}</span>
                          </>
                        ) : null}
                        <span>·</span>
                        <span>{post.Users?.name || "Unknown"}</span>
                        <span>·</span>
                        <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      {isEditing ? (
                        <div className="flex flex-col gap-3">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="border border-border bg-background px-3 py-2 text-sm font-bold w-full focus:outline-none focus:border-primary"
                          />
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={5}
                            className="border border-border bg-background px-3 py-2 text-sm w-full focus:outline-none focus:border-primary resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => saveEdit(post.forum_id)}
                              disabled={savingEdit}
                              className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 text-xs font-mono font-bold disabled:opacity-50"
                            >
                              <Check size={12} /> {savingEdit ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingPost(null)}
                              className="flex items-center gap-1 border border-border px-3 py-1.5 text-xs font-mono"
                            >
                              <X size={12} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Link
                            href={user ? `/community/forum/${post.brand_id}/${post.forum_id}` : "/login"}
                            className="block mb-2"
                          >
                            <h3 className="text-base font-bold leading-snug hover:text-primary transition-colors">
                              {post.title}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {isExpanded ? post.content : previewText}
                          </p>
                          {truncated && (
                            <button
                              onClick={() => toggleExpand(post.forum_id)}
                              className="mt-2 flex items-center gap-1 text-xs text-primary font-mono hover:underline"
                            >
                              {isExpanded ? (
                                <><ChevronUp size={12} /> Show less</>
                              ) : (
                                <><ChevronDown size={12} /> Show more</>
                              )}
                            </button>
                          )}
                        </>
                      )}

                      {/* Actions */}
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 flex-wrap">
                        <button
                          onClick={() => handleVote(post.forum_id, 1)}
                          disabled={!user || isOwner || isVoting}
                          title={
                            !user ? "Login to react"
                            : isOwner ? "Cannot react to your own post"
                            : myReaction === "like" ? "Remove like"
                            : "Like"
                          }
                          className={`flex items-center gap-1.5 text-xs transition-colors disabled:cursor-not-allowed ${
                            myReaction === "like"
                              ? "text-green-600 font-bold"
                              : "text-muted-foreground hover:text-green-600"
                          }`}
                        >
                          <ThumbsUp size={13} className={myReaction === "like" ? "fill-green-600" : ""} />
                          {post.likes}
                        </button>
                        <button
                          onClick={() => handleVote(post.forum_id, -1)}
                          disabled={!user || isOwner || isVoting}
                          title={
                            !user ? "Login to react"
                            : isOwner ? "Cannot react to your own post"
                            : myReaction === "dislike" ? "Remove dislike"
                            : "Dislike"
                          }
                          className={`flex items-center gap-1.5 text-xs transition-colors disabled:cursor-not-allowed ${
                            myReaction === "dislike"
                              ? "text-red-500 font-bold"
                              : "text-muted-foreground hover:text-red-500"
                          }`}
                        >
                          <ThumbsDown size={13} className={myReaction === "dislike" ? "fill-red-500" : ""} />
                          {post.dislikes}
                        </button>
                        <Link
                          href={user ? `/community/forum/${post.brand_id}/${post.forum_id}` : "/login"}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <MessageCircle size={13} /> {post.comment_count} comments
                        </Link>
                        {isOwner && !isEditing && (
                          <>
                            <button
                              onClick={() => startEdit(post)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(post.forum_id)}
                              disabled={deletingId === post.forum_id}
                              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={12} /> {deletingId === post.forum_id ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <ForumPageInner />
    </Suspense>
  );
}