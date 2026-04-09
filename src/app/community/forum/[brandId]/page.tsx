"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ChevronRight, ThumbsUp, ThumbsDown, MessageSquare, Plus } from "lucide-react";

const FILLER_POSTS = [
  {
    id: "1",
    title: "My brake pads wore out after only 20,000 km — is this normal?",
    author: "JuanDela Cruz",
    date: "Apr 1, 2026",
    likes: 34,
    dislikes: 2,
    comments: 12,
  },
  {
    id: "2",
    title: "Strange knocking sound from the engine when idling",
    author: "MariaClara",
    date: "Apr 2, 2026",
    likes: 21,
    dislikes: 1,
    comments: 8,
  },
  {
    id: "3",
    title: "Best oil brand for high mileage engines?",
    author: "PedroP",
    date: "Apr 2, 2026",
    likes: 57,
    dislikes: 4,
    comments: 23,
  },
  {
    id: "4",
    title: "AC stops cooling after 30 minutes of driving",
    author: "CarlosM",
    date: "Apr 3, 2026",
    likes: 18,
    dislikes: 0,
    comments: 6,
  },
  {
    id: "5",
    title: "How often should I change my transmission fluid?",
    author: "LuisaR",
    date: "Apr 3, 2026",
    likes: 44,
    dislikes: 3,
    comments: 17,
  },
  {
    id: "6",
    title: "Check engine light keeps coming back after clearing codes",
    author: "AntonioB",
    date: "Apr 4, 2026",
    likes: 29,
    dislikes: 1,
    comments: 14,
  },
];

export default function BrandForumPage() {
  const params = useParams();
  const brandId = params?.brandId as string;

  const brandName = brandId
    ? brandId.charAt(0).toUpperCase() + brandId.slice(1)
    : "";

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">

        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-8">
          <Link href="/community/forum" className="hover:text-primary transition-colors">
            Forum
          </Link>
          <ChevronRight size={10} />
          <span className="text-ink">{brandName}</span>
        </nav>

        {/* HERO SECTION */}
        <section className="flex flex-col md:flex-row gap-8 mb-16 items-start border-b border-border pb-12">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-start gap-8 mb-6">

              {/* Brand Logo */}
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
                    {FILLER_POSTS.length} Posts
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl font-medium mt-4">
              Community discussions for {brandName} vehicles. Ask questions, share
              experiences, and help fellow {brandName} owners.
            </p>

            <div className="mt-6 flex flex-wrap gap-4 items-center">
              <Link
                href="/community/forum"
                className="flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:border-ink transition-all"
              >
                ← Back to Forums
              </Link>
              <Link
                href="/community/forum/create"
                className="bg-orange-500 text-white px-6 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                + Create Post
              </Link>
            </div>
          </div>
        </section>

        {/* POSTS HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">
              Forum Posts
            </h2>
            <div className="h-1 w-12 bg-orange-500 mt-1" />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            {FILLER_POSTS.length} Posts
          </span>
        </div>

        {/* POSTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FILLER_POSTS.map((post) => (
            <Link
              key={post.id}
              href={`/community/forum/${brandId}/${post.id}`}
              className="group relative flex flex-col bg-background border border-border transition-all duration-200 hover:border-orange-500 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#f97316] overflow-hidden"
            >
              {/* Post Title */}
              <div className="p-5 flex-1">
                <h3 className="text-sm font-black uppercase tracking-tight leading-snug group-hover:text-orange-600 transition-colors">
                  {post.title}
                </h3>
              </div>

              {/* Post Meta */}
              <div className="px-5 pb-5 border-t border-border pt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    {post.author}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    {post.date}
                  </span>
                </div>

                {/* Votes and Comments */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    <ThumbsUp size={11} />
                    <span>{post.likes}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    <ThumbsDown size={11} />
                    <span>{post.dislikes}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    <MessageSquare size={11} />
                    <span>{post.comments}</span>
                  </div>
                </div>
              </div>

              {/* Decorative corners */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={10} className="text-orange-500" />
              </div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-border group-hover:border-orange-500 transition-colors" />
            </Link>
          ))}
        </div>

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