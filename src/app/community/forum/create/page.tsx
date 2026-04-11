"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ChevronRight } from "lucide-react";

const BRANDS = [
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

export default function ForumPostCreatePage() {
  const router = useRouter();

  const [brand, setBrand] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      const res = await fetch("/api/forum_post_create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand,
          title,
          content,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create post");

      router.push(`/community/forum/${brand}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create post";
      setError(message);
    } finally {
      setSubmitting(false);
    }
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
          <span className="text-ink">Create Post</span>
        </nav>

        {/* PAGE HEADER */}
        <section className="mb-12 border-b border-border pb-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-4">
            Create a <span className="text-primary">Post</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-xl leading-relaxed">
            Share your experience, ask a question, or start a discussion in your
            car brand's forum.
          </p>
        </section>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

          {/* Brand Selector */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Car Brand <span className="text-primary">*</span>
            </label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
              className="bg-background border border-border px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
            >
              <option value="" disabled>Select a brand</option>
              {BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Post Title */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Post Title <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Strange knocking sound when idling"
              className="bg-background border border-border px-4 py-3 font-mono text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Post Content */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Content <span className="text-primary">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              placeholder="Describe your issue or share your experience in detail..."
              rows={10}
              className="bg-background border border-border px-4 py-3 font-mono text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="font-mono text-xs text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-white px-8 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Post"}
            </button>
            <Link
              href="/community/forum"
              className="border border-border px-8 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:border-ink transition-all"
            >
              Cancel
            </Link>
          </div>

        </form>

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