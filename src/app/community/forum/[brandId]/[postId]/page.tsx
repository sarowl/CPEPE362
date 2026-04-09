"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";

const FILLER_POST = {
  id: "1",
  title: "My brake pads wore out after only 20,000 km — is this normal?",
  author: "JuanDelaCruz",
  date: "Apr 1, 2026",
  content: `I recently had my brake pads checked and the mechanic told me they were already worn out after just 20,000 km. I mostly drive in the city with moderate traffic. I've had other cars before and they usually last around 40,000 to 50,000 km before needing replacement.

Is this normal for this brand or is there something wrong with how I'm driving? The mechanic suggested I upgrade to ceramic pads but I'm not sure if that's the right call. Would appreciate any advice from fellow owners who have experienced the same issue.`,
  likes: 34,
  dislikes: 2,
};

const FILLER_COMMENTS = [
  {
    id: "c1",
    author: "MariaClara",
    date: "Apr 1, 2026",
    content:
      "This happened to me too. Turns out I was riding the brakes a lot in traffic without realizing it. Try to coast more and brake less frequently. Made a huge difference for me.",
    likes: 12,
    dislikes: 0,
  },
  {
    id: "c2",
    author: "PedroP",
    date: "Apr 2, 2026",
    content:
      "20,000 km is definitely on the low end. I would get a second opinion from another mechanic. Some shops recommend replacements earlier than necessary.",
    likes: 8,
    dislikes: 1,
  },
  {
    id: "c3",
    author: "CarlosM",
    date: "Apr 2, 2026",
    content:
      "Ceramic pads are worth it in the long run. They last longer and produce less dust. A bit more expensive upfront but you save more over time.",
    likes: 21,
    dislikes: 0,
  },
  {
    id: "c4",
    author: "LuisaR",
    date: "Apr 3, 2026",
    content:
      "Check if your brake calipers are sticking. That can cause uneven and accelerated wear on the pads even if your driving habits are fine.",
    likes: 17,
    dislikes: 0,
  },
];

export default function ForumPostPage() {
  const params = useParams();
  const brandId = params?.brandId as string;
  const brandName = brandId
    ? brandId.charAt(0).toUpperCase() + brandId.slice(1)
    : "";

  const [comment, setComment] = useState("");

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Backend implementation to follow
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8">

        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-8">
          <Link href="/community/forum" className="hover:text-primary transition-colors">
            Forum
          </Link>
          <ChevronRight size={10} />
          <Link href={`/community/forum/${brandId}`} className="hover:text-primary transition-colors">
            {brandName}
          </Link>
          <ChevronRight size={10} />
          <span className="text-ink truncate max-w-[200px]">{FILLER_POST.title}</span>
        </nav>

        {/* POST SECTION */}
        <section className="bg-background border border-border p-8 mb-8">

          {/* Post Title */}
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight mb-4">
            {FILLER_POST.title}
          </h1>

          {/* Post Meta */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {FILLER_POST.author}
            </span>
            <span className="h-px w-4 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {FILLER_POST.date}
            </span>
          </div>

          {/* Post Content */}
          <p className="text-sm leading-relaxed text-ink/80 whitespace-pre-line mb-8">
            {FILLER_POST.content}
          </p>

          {/* Post Votes */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <button className="flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:border-primary hover:text-primary transition-all">
              <ThumbsUp size={13} />
              <span>{FILLER_POST.likes}</span>
            </button>
            <button className="flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all">
              <ThumbsDown size={13} />
              <span>{FILLER_POST.dislikes}</span>
            </button>
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
            {FILLER_COMMENTS.length} Comments
          </span>
        </div>

        {/* COMMENTS LIST */}
        <div className="flex flex-col gap-4 mb-10">
          {FILLER_COMMENTS.map((c) => (
            <div key={c.id} className="bg-background border border-border p-6">

              {/* Comment Meta */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {c.author}
                </span>
                <span className="h-px w-4 bg-border" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {c.date}
                </span>
              </div>

              {/* Comment Content */}
              <p className="text-sm leading-relaxed text-ink/80 mb-4">
                {c.content}
              </p>

              {/* Comment Votes */}
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                  <ThumbsUp size={11} />
                  <span>{c.likes}</span>
                </button>
                <button className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors">
                  <ThumbsDown size={11} />
                  <span>{c.dislikes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

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
                className="bg-primary text-white px-8 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                Post Comment
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