"use client";


import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ChevronRight, Plus, User, Clock, BookOpen, ArrowLeft } from "lucide-react";

import { resolveCarModelImage } from "@/lib/carTypeImage";

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
  thumbnail_url?: string | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Expert:       "bg-red-50 text-red-700 border-red-200",
};

const DIFFICULTY_BAR: Record<string, string> = {
  Beginner:     "bg-green-400",
  Intermediate: "bg-yellow-400",
  Advanced:     "bg-orange-400",
  Expert:       "bg-red-500",
};

export default function ModelGuidesPage() {
  const params  = useParams();
  const router  = useRouter();
  const brandId = params?.brandId as string;
  const modelId = params?.modelId as string;

  const [guides,    setGuides]    = useState<Guide[]>([]);
  const [creators,  setCreators]  = useState<Record<string, string>>({});
  const [modelName, setModelName] = useState("");
  const [modelInfo, setModelInfo] = useState<string | null>(null);
  const [modelImg,  setModelImg]  = useState<string | null>(null);
  const [modelCategory, setModelCategory] = useState("");
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!brandId || !modelId) return;

    fetch(`/api/car-models/${brandId}`)
      .then((r) => r.json())
      .then((j) => {
        const model = (j.models ?? []).find((m: any) => m.id === modelId);
        if (model) {
          setModelName(model.name);
          setModelInfo(model.info ?? null);
          setModelImg(model.model_img ?? null);
          setModelCategory(model.category ?? "");
        }
      });

    fetch(`/api/guides/by-model?model_id=${modelId}`)
      .then((r) => r.json())
      .then(async (json) => {
        const list: Guide[] = json.guides ?? [];
        setGuides(list);

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
  const createGuideUrl = `/guides/create?brand=${brandId}&model=${modelId}`;

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-6">
          <Link href="/car-makers" className="hover:text-ink transition-colors">Directory</Link>
          <ChevronRight size={10} />
          <Link href={`/guides/${brandId}`} className="hover:text-ink transition-colors">{brandLabel}</Link>
          <ChevronRight size={10} />
          <span className="text-ink">{modelName}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 border-b border-border pb-6">
          <div className="flex items-start gap-5 flex-1">
            {/* Model image */}
            <div className="w-32 shrink-0 aspect-video border border-border overflow-hidden bg-secondary/20">
              <img
                src={resolveCarModelImage(modelImg, modelCategory)}
                alt={modelName}
                className={`w-full h-full object-cover${!modelImg ? " opacity-70" : ""}`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-thumbnail.png"; }}
              />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tighter text-3xl">
                {brandLabel} <span className="text-primary">{modelName}</span>
              </h1>
              {/* Model info text below model name (Spec 3.5) */}
              {modelInfo && (
                <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">{modelInfo}</p>
              )}
              {!modelInfo && (
                <p className="text-sm text-muted-foreground mt-1">Repair guides created by the community</p>
              )}
            </div>
          </div>
          <Link
            href={createGuideUrl}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,0.15)]"
          >
            <Plus size={13} /> Create a Guide
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">Loading guides...</div>
        ) : guides.length === 0 ? (
          <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center py-20 gap-4">
            <BookOpen size={36} className="text-border" />
            <div className="text-center">
              <p className="text-sm font-bold">No guides created for this model yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Would you like to create one?</p>
            </div>
            <Link href={createGuideUrl} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all">
              <Plus size={13} /> Create a Guide
            </Link>
          </div>
        ) : (
          <>
            {/* SECTION 4: Improved guide cards with thumbnail above info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {guides.map((guide) => (
                <GuideCard
                  key={guide.guide_id}
                  guide={guide}
                  brandId={brandId}
                  modelId={modelId}
                  creatorName={creators[guide.user_id] ?? "..."}
                />
              ))}
            </div>

            <div className="mt-8 border border-dashed border-border p-5 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">Know a fix that isn't listed here? Share your knowledge.</p>
              <Link href={createGuideUrl} className="shrink-0 flex items-center gap-2 px-4 py-2 border border-primary text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all">
                <Plus size={12} /> Create a Guide
              </Link>
            </div>
          </>
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

// SECTION 4: Improved guide card — thumbnail (full aspect ratio) above info
function GuideCard({
  guide, brandId, modelId, creatorName,
}: {
  guide: Guide;
  brandId: string;
  modelId: string;
  creatorName: string;
}) {
  const diffColor = DIFFICULTY_COLORS[guide.difficulty] ?? "bg-secondary text-muted-foreground border-border";
  const diffBar   = DIFFICULTY_BAR[guide.difficulty]   ?? "bg-border";
  const href      = `/guides/${brandId}/${modelId}/${guide.guide_id}`;
  // SECTION 6: Use actual stored thumbnail; only fallback if genuinely absent
  const hasThumbnail = !!guide.thumbnail_url;
  const thumbnailSrc = guide.thumbnail_url ?? "/no-thumbnail.png";

  return (
    <Link
      href={href}
      className="group border border-border bg-background hover:border-primary hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--primary)] transition-all duration-200 flex flex-col overflow-hidden rounded"
    >
      {/* SECTION 4: Thumbnail above info — full aspect ratio */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <img
          src={thumbnailSrc}
          alt={guide.title}
          className={`w-full h-full object-cover${!hasThumbnail ? " opacity-70" : ""}`}
          loading="lazy"
          onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.errored) { img.dataset.errored = "1"; img.src = "/no-thumbnail.png"; } else { img.style.display = "none"; }
              }}
        />
        {/* Difficulty bar at bottom of thumbnail */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${diffBar}`} />
      </div>

      {/* Info card */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        {/* Brand/difficulty row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground capitalize">
            {guide.brand_id} · {guide.model_name}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border shrink-0 ${diffColor}`}>
            {guide.difficulty}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-black uppercase tracking-tighter text-sm leading-snug group-hover:text-primary transition-colors flex-1 line-clamp-2">
          {guide.title}
        </h3>

        {/* Summary */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {guide.summary}
        </p>

        {/* Meta footer */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border mt-auto">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Clock size={10} /> {guide.time_required}</span>
            <span className="flex items-center gap-1"><User size={10} /> {creatorName}</span>
          </div>
          <ChevronRight size={13} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
      </div>
    </Link>
  );
}
