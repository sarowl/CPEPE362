"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ChevronRight, ThumbsUp, ThumbsDown, MessageCircle, Plus, RefreshCw } from "lucide-react";

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

function truncateWords(text: string, limit: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + "...";
}

export default function BrandForumPage() {
  const params = useParams();
  const brandId = params?.brandId as string;
  const brandName = brandId ? brandId.charAt(0).toUpperCase() + brandId.slice(1) : "";

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!brandId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/forum_posts_all?brandId=${brandId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch posts");
      setPosts(data.posts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw size={14} className="animate-spin" /> Loading Posts...
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Something went wrong</h1>
            <p className="font-mono text-xs text-muted-foreground mb-4">{error}</p>
            <Link href="/forum" className="text-primary font-mono text-xs uppercase tracking-widest hover:underline">
              ← Back to Forum
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">

        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-8">
          <Link href="/forum" className="hover:text-primary transition-colors">Forum</Link>
          <ChevronRight size={10} />
          <span className="text-ink">{brandName}</span>
        </nav>

        {/* HERO */}
        <section className="flex flex-col md:flex-row gap-8 mb-16 items-start border-b border-border pb-12">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-start gap-8 mb-6">
              <div className="h-24 w-24 md:h-32 md:w-32 flex-shrink-0 flex items-center justify-center border-2 border-border p-4 bg-background shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
                <img
                  src={`/car-makers/${brandId}.png`}
                  alt={`${brandName} logo`}
                  className="max-h-full max-w-full object-contain filter grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="flex flex-col justify-center h-full pt-2">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8] mb-2">
                  {brandName}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-orange-500" />
                  <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
                    {posts.length} Posts
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl font-medium mt-4">
              Community discussions for {brandName} vehicles. Ask questions, share experiences, and help fellow {brandName} owners.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 items-center">
              <Link href="/forum" className="flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:border-ink transition-all">
                ← Back to Forum
              </Link>
              <Link
                href={`/community/forum/create?brand=${brandId}`}
                className="bg-orange-500 text-white px-6 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all"
              >
                + Create Post
              </Link>
            </div>
          </div>
        </section>

        {/* POSTS HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Forum Posts</h2>
            <div className="h-1 w-12 bg-orange-500 mt-1" />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            {posts.length} Posts
          </span>
        </div>

        {/* EMPTY STATE */}
        {posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 border border-border bg-background">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">No posts yet</p>
            <Link
              href={`/community/forum/create?brand=${brandId}`}
              className="bg-orange-500 text-white px-6 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all"
            >
              + Create the First Post
            </Link>
          </div>
        )}

        {/* POSTS GRID */}
        {posts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.forum_id}
                href={`/community/forum/${brandId}/${post.forum_id}`}
                className="group relative flex flex-col bg-background border border-border transition-all duration-200 hover:border-orange-500 hover:-translate-y-1 overflow-hidden rounded"
              >
                <div className="p-5 flex-1">
                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mb-2">
                    <span className="font-semibold">{post.Users?.name || "Unknown"}</span>
                    <span>·</span>
                    <span>
                      {new Date(post.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </span>
                    {post.model_name ? (
                      <>
                        <span>·</span>
                        <span className="capitalize">{post.model_name}</span>
                      </>
                    ) : null}
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tight leading-snug group-hover:text-orange-600 transition-colors mb-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {truncateWords(post.content, 50)}
                  </p>
                </div>

                {/* Stats */}
                <div className="px-5 pb-4 border-t border-border pt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ThumbsUp size={11} /> {post.likes}</span>
                  <span className="flex items-center gap-1"><ThumbsDown size={11} /> {post.dislikes}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={11} /> {post.comment_count}</span>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={10} className="text-orange-500" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <footer className="mt-20 py-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            © 2026 Autobot Systems // Community Forum
          </p>
        </footer>
      </main>
    </div>
  );
}
