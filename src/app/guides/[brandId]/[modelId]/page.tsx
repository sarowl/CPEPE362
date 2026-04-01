"use client";

// ================================================================
// PURPOSE: Shows all approved guides for a specific car model.
//          If none exist, prompts user to create one.
// ================================================================

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ChevronRight, Plus, User, Clock, BookOpen, ArrowLeft } from "lucide-react";

interface Guide {
  guide_id: string;
  title: string;
  summary: string;
  difficulty: string;
  time_required: string;
  brand_id: string;
  model_name: string;
  user_id: string;
  created_at: string;
}
interface Creator { user_id: string; name: string; }

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced: "bg-orange-50 text-orange-700 border-orange-200",
  Expert: "bg-red-50 text-red-700 border-red-200",
};

export default function ModelGuidesPage() {
  const params  = useParams();
  const router  = useRouter();
  const brandId = params?.brandId as string;
  const modelId = params?.modelId as string;

  const [guides,    setGuides]    = useState<Guide[]>([]);
  const [creators,  setCreators]  = useState<Record<string, string>>({});
  const [modelName, setModelName] = useState("");
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!brandId || !modelId) return;
    // Fetch model name
    fetch(`/api/car-models/${brandId}`)
      .then((r) => r.json())
      .then((j) => {
        const model = (j.models ?? []).find((m: any) => m.id === modelId);
        if (model) setModelName(model.name);
      });

    // Fetch approved guides for this model
    fetch(`/api/guides/by-model?model_id=${modelId}`)
      .then((r) => r.json())
      .then(async (json) => {
        const list: Guide[] = json.guides ?? [];
        setGuides(list);

        // Batch-fetch creator names
        const uniqueUserIds = [...new Set(list.map((g) => g.user_id))];
        const nameMap: Record<string, string> = {};
        await Promise.all(
          uniqueUserIds.map(async (uid) => {
            const res  = await fetch(`/api/profile_fetch?user_id=${uid}`);
            const data = await res.json();
            nameMap[uid] = data?.user?.name ?? "Community Member";
          })
        );
        setCreators(nameMap);
      })
      .finally(() => setLoading(false));
  }, [brandId, modelId]);

  const brandLabel = brandId ? brandId.charAt(0).toUpperCase() + brandId.slice(1) : "";

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-6">
          <Link href="/car-makers" className="hover:text-ink transition-colors">Guides</Link>
          <ChevronRight size={10} />
          <Link href={`/guides/${brandId}`} className="hover:text-ink transition-colors">{brandLabel}</Link>
          <ChevronRight size={10} />
          <span className="text-ink">{modelName}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 border-b border-border pb-6">
          <div>
            <h1 className="font-black uppercase tracking-tighter text-3xl">
              {brandLabel} <span className="text-primary">{modelName}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Repair guides created by the community</p>
          </div>
          <Link
            href="/guides/create"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,0.15)]"
          >
            <Plus size={13} /> Create a Guide
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">Loading guides...</div>
        ) : guides.length === 0 ? (
          /* Empty state */
          <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center py-20 gap-4">
            <BookOpen size={36} className="text-border" />
            <div className="text-center">
              <p className="text-sm font-bold">No guides created for this model yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Would you like to create one?</p>
            </div>
            <Link
              href="/guides/create"
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all"
            >
              <Plus size={13} /> Create a Guide
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {guides.map((guide) => (
              <Link
                key={guide.guide_id}
                href={`/guides/${brandId}/${modelId}/${guide.guide_id}`}
                className="group border border-border bg-background hover:border-primary hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--primary)] transition-all duration-200 flex flex-col"
              >
                {/* Top color bar by difficulty */}
                <div className={`h-1 w-full ${
                  guide.difficulty === "Beginner" ? "bg-green-400" :
                  guide.difficulty === "Intermediate" ? "bg-yellow-400" :
                  guide.difficulty === "Advanced" ? "bg-orange-400" : "bg-red-500"
                }`} />

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-black uppercase tracking-tighter text-sm leading-snug group-hover:text-primary transition-colors flex-1">
                      {guide.title}
                    </h3>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border shrink-0 ${DIFFICULTY_COLORS[guide.difficulty] ?? "bg-secondary border-border"}`}>
                      {guide.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2 flex-1">
                    {guide.summary}
                  </p>

                  <div className="flex items-center justify-between gap-3 mt-auto pt-3 border-t border-border">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {guide.time_required}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={10} /> {creators[guide.user_id] ?? "..."}
                      </span>
                    </div>
                    <ChevronRight size={13} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink transition-colors">
            <ArrowLeft size={13} /> Back to models
          </button>
        </div>

      </main>
    </div>
  );
}