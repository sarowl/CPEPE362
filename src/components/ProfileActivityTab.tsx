"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, FileText, RefreshCw, ExternalLink } from "lucide-react";

interface ForumPost {
  forum_id: string;
  title: string;
  brand_id: string;
  created_at: string;
}

interface ForumComment {
  comment_id: string;
  content: string;
  created_at: string;
  post_id: string;
  ForumPost: {
    forum_id: string;
    title: string;
    brand_id: string;
  };
}

type FilterType = "posts" | "comments";

function truncate(text: string, words: number) {
  const arr = text.split(" ");
  return arr.length > words ? arr.slice(0, words).join(" ") + "..." : text;
}

export default function ProfileActivityTab() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("posts");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/forum_user_activity");
      const json = await res.json();
      setPosts(json.posts ?? []);
      setComments(json.comments ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <RefreshCw size={14} className="animate-spin" /> Loading activity...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-black uppercase tracking-tighter text-xl">Activity</h2>
          <p className="text-xs text-muted-foreground mt-1">Your forum posts and comments</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFilter("posts")}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest border transition-colors ${
            filter === "posts"
              ? "bg-ink text-white border-ink"
              : "bg-background border-border hover:border-ink"
          }`}
        >
          <FileText size={11} />
          Posts
          <span className="ml-1 text-[10px]">({posts.length})</span>
        </button>
        <button
          onClick={() => setFilter("comments")}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest border transition-colors ${
            filter === "comments"
              ? "bg-ink text-white border-ink"
              : "bg-background border-border hover:border-ink"
          }`}
        >
          <MessageSquare size={11} />
          Comments
          <span className="ml-1 text-[10px]">({comments.length})</span>
        </button>
      </div>

      {/* Posts */}
      {filter === "posts" && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="py-14 text-center border border-border bg-background">
              <p className="text-sm text-muted-foreground">No posts yet.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.forum_id}
                className="flex items-start justify-between gap-4 border border-border bg-background px-5 py-4 hover:bg-secondary/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 capitalize">
                    {post.brand_id}
                  </p>
                  <p className="text-sm font-bold uppercase tracking-tight leading-snug truncate">
                    {post.title}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1.5">
                    {new Date(post.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
                <Link
                  href={`/community/forum/${post.brand_id}/${post.forum_id}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-border hover:border-ink font-mono text-[10px] uppercase tracking-widest transition-colors"
                >
                  <ExternalLink size={10} /> View
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* Comments */}
      {filter === "comments" && (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="py-14 text-center border border-border bg-background">
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.comment_id}
                className="flex items-start justify-between gap-4 border border-border bg-background px-5 py-4 hover:bg-secondary/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 capitalize">
                    {comment.ForumPost?.brand_id} · {comment.ForumPost?.title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {truncate(comment.content, 20)}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1.5">
                    {new Date(comment.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
                <Link
                  href={`/community/forum/${comment.ForumPost?.brand_id}/${comment.ForumPost?.forum_id}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-border hover:border-ink font-mono text-[10px] uppercase tracking-widest transition-colors"
                >
                  <ExternalLink size={10} /> View
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}