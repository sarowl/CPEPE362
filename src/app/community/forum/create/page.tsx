"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
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

interface CarModel {
  id: string;
  name: string;
  slug: string;
  category: string;
  years: string;
}

function ForumPostCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?redirect=/community/forum/create");
      } else {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [router]);

  // Pre-select brand/model from URL query params (e.g. ?brand=toyota&model=<uuid>)
  const preselectedBrand = searchParams.get("brand") ?? "";
  const preselectedModel = searchParams.get("model") ?? "";
  // source: "forum" | "autohub" — controls post-creation redirect behaviour
  const source = searchParams.get("source") ?? "";

  const [brand, setBrand] = useState(preselectedBrand);
  const [modelId, setModelId] = useState(preselectedModel);
  const [models, setModels] = useState<CarModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch models whenever brand changes
  useEffect(() => {
    if (!brand) {
      setModels([]);
      setModelId("");
      return;
    }
    async function fetchModels() {
      try {
        setModelsLoading(true);
        // Only reset modelId if brand changed from preselected
        if (brand !== preselectedBrand) setModelId("");
        const res = await fetch(`/api/car-models/${brand}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch models");
        setModels(data.models);
      } catch (err: unknown) {
        console.error(err instanceof Error ? err.message : "Failed to fetch models");
        setModels([]);
      } finally {
        setModelsLoading(false);
      }
    }
    fetchModels();
  }, [brand]);

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
          model_id: modelId || null,
          title,
          content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create post");

      // --- Redirect logic ---
      // From Forum page → always go back to /forum
      if (source === "forum") {
        router.push("/forum");
        return;
      }
      // From Auto Hub (brand page) → go to model view if model selected,
      // otherwise go to /forum filtered by brand
      if (source === "autohub") {
        if (modelId) {
          // Navigate to the specific model guides/forum page
          router.push(`/guides/${brand}/${modelId}`);
        } else {
          // Brand only — go to forum filtered by brand
          router.push(`/forum?brand=${brand}`);
        }
        return;
      }
      // Default fallback (direct URL access, etc.)
      router.push("/forum");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      {!authChecked && (
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Checking authentication...
          </div>
        </main>
      )}
      {authChecked && (
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8">

        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-8">
          <Link href="/forum" className="hover:text-primary transition-colors">Forum</Link>
          <ChevronRight size={10} />
          <span className="text-ink">Create Post</span>
        </nav>

        {/* PAGE HEADER */}
        <section className="mb-12 border-b border-border pb-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-4">
            Create a <span className="text-primary">Post</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-xl leading-relaxed">
            Share your experience, ask a question, or start a discussion about your car.
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
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Model Selector */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Car Model <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={!brand || modelsLoading}
              className="bg-background border border-border px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!brand ? "Select a brand first" : modelsLoading ? "Loading models..." : "All models (no specific model)"}
              </option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {brand && !modelsLoading && models.length === 0 && (
              <p className="font-mono text-[10px] text-red-500">No models available for this brand.</p>
            )}
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

          {error && <p className="font-mono text-xs text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-white px-8 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Post"}
            </button>
            <Link
              href="/forum"
              className="border border-border px-8 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:border-ink transition-all"
            >
              Cancel
            </Link>
          </div>
        </form>

        <footer className="mt-20 py-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            © 2026 Autobot Systems // Community Forum
          </p>
        </footer>
      </main>
      )}
    </div>
  );
}

export default function ForumPostCreatePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <ForumPostCreateForm />
    </Suspense>
  );
}
