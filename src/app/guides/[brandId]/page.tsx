"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import CarModelCard from "@/components/CarModelCard";
import { ChevronRight, ArrowLeft, Plus, MessageCircle } from "lucide-react";

interface CarModel {
  id: string;
  name: string;
  slug: string;
  category: string;
  years: string;
  model_img?: string | null;
  info?: string | null;
}

export default function BrandModelsPage() {
  const params = useParams();
  const brandId = params?.brandId as string;

  const [models, setModels] = useState<CarModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [guideCounts, setGuideCounts] = useState<Record<string, number>>({});
  const [forumCounts, setForumCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!brandId) return;

    async function fetchModels() {
      try {
        setLoading(true);
        const res = await fetch(`/api/car-models/${brandId}`);
        if (!res.ok) throw new Error("Brand not found");
        const data = await res.json();
        setModels(data.models);

        // Fetch guide counts and forum counts per model in parallel
        const guideCts: Record<string, number> = {};
        const forumCts: Record<string, number> = {};

        await Promise.all(
          (data.models as CarModel[]).map(async (m) => {
            try {
              const [guideRes, forumRes] = await Promise.all([
                fetch(`/api/guides/by-model?model_id=${m.id}`),
                fetch(`/api/forum_posts_all?modelId=${m.id}`),
              ]);
              const guideData = await guideRes.json();
              const forumData = await forumRes.json();
              guideCts[m.id] = (guideData.guides ?? []).length;
              forumCts[m.id] = (forumData.posts ?? []).length;
            } catch {
              guideCts[m.id] = 0;
              forumCts[m.id] = 0;
            }
          })
        );
        setGuideCounts(guideCts);
        setForumCounts(forumCts);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, [brandId]);

  const brandName = brandId
    ? brandId.charAt(0).toUpperCase() + brandId.slice(1)
    : "";

  const categories = [...new Set(models.map((m) => m.category))];
  const filteredModels = activeCategory
    ? models.filter((m) => m.category === activeCategory)
    : models;

  if (loading) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
              Loading Models...
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-32 bg-border animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || models.length === 0) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">
              Brand Not Found
            </h1>
            <Link href="/car-makers" className="text-primary font-mono text-xs uppercase tracking-widest hover:underline">
              ← Back to Directory
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
          <Link href="/car-makers" className="hover:text-primary transition-colors">
            Directory
          </Link>
          <ChevronRight size={10} />
          <span className="text-ink">{brandName}</span>
        </nav>

        {/* HERO SECTION */}
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
                  <span className="h-px w-8 bg-primary" />
                  <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
                    {models.length} Units Cataloged
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl font-medium mt-4">
              Browse repair guides, community forum posts, and maintenance manuals for all{" "}
              {brandName} models. Select a model below to access documentation and discussions.
            </p>

            <div className="mt-6 flex flex-wrap gap-4 items-center">
              <Link
                href="/car-makers"
                className="flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:border-ink transition-all"
              >
                <ArrowLeft size={12} /> Back to Directory
              </Link>

              <Link
                href={`/guides/create?brand=${brandId}`}
                className="flex items-center gap-2 bg-primary text-white px-6 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <Plus size={13} /> Create a Guide
              </Link>

              <Link
                href={`/community/forum/create?brand=${brandId}&source=autohub`}
                className="flex items-center gap-2 border border-primary text-primary px-6 py-2 font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
              >
                <MessageCircle size={13} /> Create a Post
              </Link>
            </div>
          </div>
        </section>

        {/* CATEGORY FILTER PILLS */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1 border font-bold transition-all ${
              activeCategory === null
                ? "text-primary border-primary bg-primary/5 shadow-[0_0_12px_rgba(var(--primary),0.15)]"
                : "text-zinc-500 border-zinc-200 bg-zinc-50 hover:border-zinc-400"
            }`}
          >
            All Models
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1 border font-bold transition-all ${
                activeCategory === cat
                  ? "text-primary border-primary bg-primary/5"
                  : "text-zinc-500 border-zinc-200 bg-zinc-50 hover:border-zinc-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* DIRECTORY HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">
              Model Directory
            </h2>
            <div className="h-1 w-12 bg-primary mt-1" />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            {filteredModels.length} Models Displayed
          </span>
        </div>

        {/* MODELS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredModels.map((model) => (
            <CarModelCard
              key={model.slug}
              model={{
                id: model.id,
                name: model.name,
                years: model.years,
                category: model.category,
                model_img: model.model_img ?? null,
              }}
              brandId={brandId}
              brandName={brandName}
              guideCount={guideCounts[model.id] ?? 0}
              forumCount={forumCounts[model.id] ?? 0}
            />
          ))}
        </div>

        {/* TECHNICAL FOOTER */}
        <footer className="mt-20 py-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            © 2026 Autobot Systems // Collaborative Diagnostic Database
          </p>
        </footer>
      </main>
    </div>
  );
}
