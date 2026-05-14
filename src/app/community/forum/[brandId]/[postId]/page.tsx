"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ChevronRight, ThumbsUp, ThumbsDown, Pencil, X, Check, Flag, Trash2 } from "lucide-react";
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
  Users: {
    name: string;
  };
}

interface ForumComment {
  comment_id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  Users: {
    name: string;
  };
}

interface VoteCounts {
  likes: number;
  dislikes: number;
}

export default function ForumPostPage() {
  const params = useParams();
  const brandId = params?.brandId as string;
  const postId = params?.postId as string;
  const brandName = brandId
    ? brandId.charAt(0).toUpperCase() + brandId.slice(1)
    : "";

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [postVotes, setPostVotes] = useState<VoteCounts>({ likes: 0, dislikes: 0 });
  const [commentVotes, setCommentVotes] = useState<Record<string, VoteCounts>>({});
  const [myReaction, setMyReaction] = useState<"like" | "dislike" | null>(null);
  // Per-comment reaction tracking (prevents inflation on repeated clicks)
  const [myCommentReactions, setMyCommentReactions] = useState<Record<string, "like" | "dislike" | null>>({});
  const [voting, setVoting] = useState(false);
  // Track which comment is currently processing a vote
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Post edit state
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");
  const [savingPost, setSavingPost] = useState(false);

  // Comment edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // Forum Post Report Function
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  
  // Forum Post Report Window
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [selectedReason, setSelectedReason] = useState("");

  const REPORT_REASONS = [
    "Spam or advertising",
    "Misinformation",
    "Harassment or hate speech",
    "Inappropriate content",
    "Off-topic or wrong brand",
    "Other",
  ];

  useEffect(() => {
    if (showReportModal) {
     document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showReportModal]);  
  
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
    if (!postId) return;

    async function fetchPost() {
      try {
        setLoading(true);
        const res = await fetch(`/api/forum_post_fetch?postId=${postId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to fetch post");

        setPost(data.post);
        setComments(data.comments);
        setPostVotes(data.postVotes);
        setCommentVotes(data.commentVotes);
        setMyReaction(data.myReaction ?? null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch post";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [postId]);

  // After loading comments, fetch the current user's comment reactions
  useEffect(() => {
    if (!user || comments.length === 0) {
      setMyCommentReactions({});
      return;
    }
    async function fetchMyCommentReactions() {
      const commentIds = comments.map((c) => c.comment_id);
      const { data: votes } = await supabase
        .from("ForumVote")
        .select("target_id, vote")
        .eq("user_id", user!.id)
        .eq("target_type", "comment")
        .in("target_id", commentIds);

      const map: Record<string, "like" | "dislike" | null> = {};
      commentIds.forEach((id) => { map[id] = null; });
      (votes || []).forEach((v: { target_id: string; vote: number }) => {
        map[v.target_id] = v.vote === 1 ? "like" : v.vote === -1 ? "dislike" : null;
      });
      setMyCommentReactions(map);
    }
    fetchMyCommentReactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, comments.length]);

  const refreshPost = async () => {
    const res = await fetch(`/api/forum_post_fetch?postId=${postId}`);
    const data = await res.json();
    if (res.ok) {
      setPost(data.post);
      setComments(data.comments);
      setPostVotes(data.postVotes);
      setCommentVotes(data.commentVotes);
      setMyReaction(data.myReaction ?? null);

      // Re-sync comment reactions if user is logged in
      if (user && data.comments && data.comments.length > 0) {
        const commentIds = data.comments.map((c: ForumComment) => c.comment_id);
        const { data: votes } = await supabase
          .from("ForumVote")
          .select("target_id, vote")
          .eq("user_id", user.id)
          .eq("target_type", "comment")
          .in("target_id", commentIds);

        const map: Record<string, "like" | "dislike" | null> = {};
        commentIds.forEach((id: string) => { map[id] = null; });
        (votes || []).forEach((v: { target_id: string; vote: number }) => {
          map[v.target_id] = v.vote === 1 ? "like" : v.vote === -1 ? "dislike" : null;
        });
        setMyCommentReactions(map);
      }
    }
  };

  const handleVote = async (targetId: string, targetType: "post" | "comment", vote: 1 | -1) => {
    if (!post) return;
    if (targetType === "post" && user?.id === post.user_id) return;

    const voteLabel: "like" | "dislike" = vote === 1 ? "like" : "dislike";

    if (targetType === "post") {
      // Prevent concurrent post votes
      if (voting) return;
      const currentReaction = myReaction;
      const isToggleOff = currentReaction === voteLabel;

      setVoting(true);
      // Optimistic update for post votes
      setMyReaction(isToggleOff ? null : voteLabel);
      setPostVotes((prev) => {
        let { likes, dislikes } = prev;
        if (currentReaction === "like") likes = Math.max(0, likes - 1);
        if (currentReaction === "dislike") dislikes = Math.max(0, dislikes - 1);
        if (!isToggleOff) {
          if (vote === 1) likes += 1;
          else dislikes += 1;
        }
        return { likes, dislikes };
      });

      try {
        const res = await fetch("/api/forum_vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_id: targetId, target_type: targetType, vote }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to vote");
        // Background reconcile
        refreshPost();
      } catch (err: unknown) {
        // Revert
        setMyReaction(currentReaction);
        refreshPost();
        console.error(err instanceof Error ? err.message : "Failed to vote");
      } finally {
        setVoting(false);
      }
    } else {
      // Comment vote — prevent concurrent votes on same comment
      if (votingCommentId === targetId) return;
      const currentReaction = myCommentReactions[targetId] ?? null;
      const isToggleOff = currentReaction === voteLabel;

      setVotingCommentId(targetId);
      // Optimistic update for comment votes
      setMyCommentReactions((prev) => ({ ...prev, [targetId]: isToggleOff ? null : voteLabel }));
      setCommentVotes((prev) => {
        const cv = prev[targetId] ?? { likes: 0, dislikes: 0 };
        let { likes, dislikes } = cv;
        if (currentReaction === "like") likes = Math.max(0, likes - 1);
        if (currentReaction === "dislike") dislikes = Math.max(0, dislikes - 1);
        if (!isToggleOff) {
          if (vote === 1) likes += 1;
          else dislikes += 1;
        }
        return { ...prev, [targetId]: { likes, dislikes } };
      });

      try {
        const res = await fetch("/api/forum_vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_id: targetId, target_type: targetType, vote }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to vote");
        // Background reconcile
        refreshPost();
      } catch (err: unknown) {
        // Revert
        setMyCommentReactions((prev) => ({ ...prev, [targetId]: currentReaction }));
        refreshPost();
        console.error(err instanceof Error ? err.message : "Failed to vote");
      } finally {
        setVotingCommentId(null);
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/forum_comment_create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, content: comment }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post comment");

      setComment("");
      await refreshPost();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to post comment";
      console.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = () => {
    if (!post) return;
    setEditPostTitle(post.title);
    setEditPostContent(post.content);
    setIsEditingPost(true);
  };

  const handleSavePost = async () => {
    if (!post) return;
    try {
      setSavingPost(true);
      const res = await fetch("/api/forum_post_update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forum_id: post.forum_id,
          title: editPostTitle,
          content: editPostContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update post");

      setIsEditingPost(false);
      await refreshPost();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update post";
      console.error(message);
    } finally {
      setSavingPost(false);
    }
  };

  const handleEditComment = (c: ForumComment) => {
    setEditingCommentId(c.comment_id);
    setEditCommentContent(c.content);
  };

  const handleSaveComment = async (commentId: string) => {
    try {
      setSavingComment(true);
      const res = await fetch("/api/forum_comment_update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: commentId,
          content: editCommentContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update comment");

      setEditingCommentId(null);
      await refreshPost();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update comment";
      console.error(message);
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async (comment_id: string) => {
    try {
      const res = await fetch("/api/forum_comment_delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id }),
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.comment_id !== comment_id));
      }
    } catch {
      // silently fail
    }
  };

  const handleReport = async () => {
    if (!post) return;
    setReporting(true);
    try {
    const finalReason = selectedReason === "Other" ? reportReason : selectedReason;
     await fetch("/api/forum_post_report", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forum_id: post.forum_id, report_reason: finalReason }),
      });
      setReported(true);
      setShowReportModal(false);
    } catch {
      // silently fail
    } finally {
     setReporting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {  
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
        <Navbar />
        <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 flex items-center justify-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
            Loading Post...
          </div>
        </main>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !post) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
        <Navbar />
        <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">
              Post Not Found
            </h1>
            <Link
              href={`/community/forum/${brandId}`}
              className="text-primary font-mono text-xs uppercase tracking-widest hover:underline"
            >
              ← Back to {brandName} Forum
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── Page ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8">

        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-8">
          <Link href="/forum" className="hover:text-primary transition-colors">
            Forum
          </Link>
          <ChevronRight size={10} />
          <Link href={`/community/forum/${brandId}`} className="hover:text-primary transition-colors">
            {brandName}
          </Link>
          <ChevronRight size={10} />
          <span className="text-ink truncate max-w-[200px]">{post.title}</span>
        </nav>

        {/* POST SECTION */}
        <section className="bg-background border border-border p-8 mb-8">

          {/* Post Title */}
          {isEditingPost ? (
            <input
              type="text"
              value={editPostTitle}
              onChange={(e) => setEditPostTitle(e.target.value)}
              className="w-full bg-paper border border-border px-4 py-3 font-black text-2xl uppercase tracking-tighter mb-4 focus:outline-none focus:border-primary transition-colors"
            />
          ) : (
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight mb-4">
              {post.title}
            </h1>
          )}

          {/* Post Meta */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {post.Users?.name || "Unknown"}
              </span>
              <span className="h-px w-4 bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="h-px w-4 bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold capitalize">
                {post.brand_id}
              </span>
              {post.model_name ? (
                <>
                  <span className="h-px w-4 bg-border" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold capitalize">
                    {post.model_name}
                  </span>
                </>
              ) : null}
            </div>

            {/* Edit button — only visible to post owner */}
            {user?.id === post.user_id && !isEditingPost && (
              <button
                onClick={handleEditPost}
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
              >
                <Pencil size={11} /> Edit
              </button>
            )}

            {/* Save / Cancel — visible when editing */}
            {user?.id === post.user_id && isEditingPost && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSavePost}
                  disabled={savingPost}
                  className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary hover:brightness-110 transition-colors disabled:opacity-50"
                >
                  <Check size={11} /> {savingPost ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditingPost(false)}
                  className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X size={11} /> Cancel
                </button>
              </div>
            )}
          </div>

          {/* Post Content */}
          {isEditingPost ? (
            <textarea
              value={editPostContent}
              onChange={(e) => setEditPostContent(e.target.value)}
              rows={10}
              className="w-full bg-paper border border-border px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-primary transition-colors resize-none mb-8"
            />
          ) : (
            <p className="text-sm leading-relaxed text-ink/80 whitespace-pre-line mb-8">
              {post.content}
            </p>
          )}

          {/* Post Votes */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-4">
            <button
              onClick={() => handleVote(post.forum_id, "post", 1)}
              disabled={!user || user.id === post.user_id || voting}
              title={
                !user ? "Login to react"
                : user?.id === post.user_id ? "Cannot react to your own post"
                : myReaction === "like" ? "Remove like"
                : "Like"
              }
              className={`flex items-center gap-2 border px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                myReaction === "like"
                  ? "bg-green-600 text-white border-green-600"
                  : "border-border hover:border-primary hover:text-primary"
              }`}
            >
              <ThumbsUp size={13} />
              <span>{postVotes.likes}</span>
            </button>
            <button
              onClick={() => handleVote(post.forum_id, "post", -1)}
              disabled={!user || user.id === post.user_id || voting}
              title={
                !user ? "Login to react"
                : user?.id === post.user_id ? "Cannot react to your own post"
                : myReaction === "dislike" ? "Remove dislike"
                : "Dislike"
              }
              className={`flex items-center gap-2 border px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                myReaction === "dislike"
                  ? "bg-red-600 text-white border-red-600"
                  : "border-border hover:border-red-500 hover:text-red-500"
              }`}
            >
              <ThumbsDown size={13} />
              <span>{postVotes.dislikes}</span>
            </button>
          </div>
            {user && user.id !== post.user_id && (
            <>
              <button
                onClick={() => setShowReportModal(true)}
                disabled={reported}
                className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest transition-colors disabled:cursor-not-allowed ${
                  reported ? "text-red-500 font-bold" : "text-muted-foreground hover:text-red-500"
                }`}
              >
                <Flag size={11} />
                {reported ? "Reported" : "Report"}
              </button>

              {showReportModal && (
                <div
                  className="z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm"
                  style={{ position: "fixed", top: "-400px", left: 0, right: 0, bottom: 0 }}
                  onClick={() => setShowReportModal(false)}
                >
                  <div
                    className="bg-background border border-border w-full max-w-md shadow-[8px_8px_0_0_var(--ink)] p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 className="font-black uppercase tracking-tighter text-base mb-1">Report Post</h2>
                    <p className="text-xs text-muted-foreground mb-4">Select a reason for reporting this post.</p>
          
                    <div className="flex flex-col gap-2 mb-4">
                      {REPORT_REASONS.map((reason) => (
                        <button
                          key={reason}
                          onClick={() => setSelectedReason(reason)}
                          className={`text-left px-4 py-2.5 border font-mono text-xs uppercase tracking-widest transition-colors ${
                            selectedReason === reason
                              ? "bg-ink text-white border-ink"
                              : "bg-background border-border hover:border-ink"
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    {selectedReason === "Other" && (
                      <textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        rows={3}
                        placeholder="Describe the issue..."
                        className="w-full bg-background border border-border px-4 py-3 font-mono text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none mb-4"
                      />
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleReport}
                        disabled={reporting || !selectedReason || (selectedReason === "Other" && !reportReason.trim())}
                        className="bg-red-500 text-white px-6 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reporting ? "Submitting..." : "Submit Report"}
                      </button>
                      <button
                        onClick={() => setShowReportModal(false)}
                        className="border border-border px-6 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:border-ink transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  </div>
              )}
            </>
          )}
          </div>

        </section>

        {/* COMMENTS HEADER */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">
              Comments
            </h2>
            <div className="h-1 w-12 bg-primary mt-1" />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            {comments.length} Comments
          </span>
        </div>

        {/* EMPTY COMMENTS STATE */}
        {comments.length === 0 && (
          <div className="flex items-center justify-center py-12 border border-border bg-background mb-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              No comments yet. Be the first to reply.
            </p>
          </div>
        )}

        {/* COMMENTS LIST */}
        {comments.length > 0 && (
          <div className="flex flex-col gap-4 mb-10">
            {comments.map((c) => {
              const commentReaction = myCommentReactions[c.comment_id] ?? null;
              const isVotingComment = votingCommentId === c.comment_id;

              return (
                <div key={c.comment_id} className="bg-background border border-border p-6">

                  {/* Comment Meta */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                        {c.Users?.name || "Unknown"}
                      </span>
                      <span className="h-px w-4 bg-border" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Edit/Delete buttons — only visible to comment owner */}
                    {user?.id === c.user_id && editingCommentId !== c.comment_id && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEditComment(c)}
                          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil size={11} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteComment(c.comment_id)}
                          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    )}

                    {/* Save / Cancel — visible when editing */}
                    {user?.id === c.user_id && editingCommentId === c.comment_id && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSaveComment(c.comment_id)}
                          disabled={savingComment}
                          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary hover:brightness-110 transition-colors disabled:opacity-50"
                        >
                          <Check size={11} /> {savingComment ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <X size={11} /> Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comment Content */}
                  {editingCommentId === c.comment_id ? (
                    <textarea
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      rows={4}
                      className="w-full bg-paper border border-border px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-primary transition-colors resize-none mb-4"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-ink/80 mb-4">
                      {c.content}
                    </p>
                  )}

                  {/* Comment Votes */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleVote(c.comment_id, "comment", 1)}
                      disabled={!user || isVotingComment}
                      title={
                        !user ? "Login to react"
                        : commentReaction === "like" ? "Remove like"
                        : "Like"
                      }
                      className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors disabled:cursor-not-allowed ${
                        commentReaction === "like"
                          ? "text-green-600 font-bold"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      <ThumbsUp size={11} className={commentReaction === "like" ? "fill-green-600" : ""} />
                      <span>{commentVotes[c.comment_id]?.likes || 0}</span>
                    </button>
                    <button
                      onClick={() => handleVote(c.comment_id, "comment", -1)}
                      disabled={!user || isVotingComment}
                      title={
                        !user ? "Login to react"
                        : commentReaction === "dislike" ? "Remove dislike"
                        : "Dislike"
                      }
                      className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors disabled:cursor-not-allowed ${
                        commentReaction === "dislike"
                          ? "text-red-500 font-bold"
                          : "text-muted-foreground hover:text-red-500"
                      }`}
                    >
                      <ThumbsDown size={11} className={commentReaction === "dislike" ? "fill-red-500" : ""} />
                      <span>{commentVotes[c.comment_id]?.dislikes || 0}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* COMMENT INPUT */}
        <section className="border-t border-border pt-8">
          <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-4">
            Leave a Comment
          </h3>
          <form onSubmit={handleCommentSubmit} className="flex flex-col gap-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              placeholder="Write your comment here..."
              rows={5}
              className="bg-background border border-border px-4 py-3 font-mono text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-white px-8 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>
        </section>

        {/* FOOTER */}
        <footer className="mt-20 py-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            © 2026 Autobot Systems // Community Forum
          </p>
        </footer>
      </main>
    </div>
  );
}
