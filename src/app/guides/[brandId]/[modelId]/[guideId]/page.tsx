"use client";

// ================================================================
// PURPOSE: Renders a full approved guide for any user to read.
//          Shows steps, images, tools, and creator profile.
// ================================================================

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Clock, Wrench, ChevronRight, ArrowLeft, User, AlertCircle, BookOpen, Video } from "lucide-react";

interface Guide {
  guide_id: string; title: string; summary: string; introduction: string;
  difficulty: string; time_required: string; tools: string[];
  status: string; brand_id: string; model_name: string; user_id: string;
  created_at: string;
}
interface Step {
  step_id: string; step_number: number; title: string;
  instructions: string; images: string[]; video_url: string | null;
}
interface Creator { name: string; }

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced: "bg-orange-50 text-orange-700 border-orange-200",
  Expert: "bg-red-50 text-red-700 border-red-200",
};

export default function GuideViewPage() {
  const params  = useParams();
  const router  = useRouter();
  const guideId = params?.guideId as string;

  const [guide,   setGuide]   = useState<Guide | null>(null);
  const [steps,   setSteps]   = useState<Step[]>([]);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!guideId) return;
    fetch(`/api/guides/${guideId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); setLoading(false); return; }
        setGuide(json.guide);
        setSteps(json.steps ?? []);
        // Fetch creator profile name
        return fetch(`/api/profile_fetch?user_id=${json.guide.user_id}`);
      })
      .then((r) => r?.json())
      .then((j) => { if (j?.user) setCreator({ name: j.user.name }); })
      .catch(() => setError("Failed to load guide."))
      .finally(() => setLoading(false));
  }, [guideId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground animate-pulse">Loading guide...</div>
        </main>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm font-bold">{error || "Guide not found."}</p>
            <button onClick={() => router.back()} className="mt-4 text-xs text-muted-foreground hover:text-ink underline">Go back</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-6">
          <Link href="/car-makers" className="hover:text-ink transition-colors">Guides</Link>
          <ChevronRight size={10} />
          <Link href={`/guides/${guide.brand_id}`} className="hover:text-ink transition-colors capitalize">{guide.brand_id}</Link>
          <ChevronRight size={10} />
          <span className="text-ink">{guide.model_name}</span>
        </div>

        {/* Guide header */}
        <div className="border border-border bg-background p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="font-black uppercase tracking-tighter text-2xl leading-tight mb-2">{guide.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{guide.summary}</p>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border shrink-0 ${DIFFICULTY_COLORS[guide.difficulty] ?? "bg-secondary border-border"}`}>
              {guide.difficulty}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock size={12} /> <span>{guide.time_required}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BookOpen size={12} /> <span>{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
            </div>
            {creator && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User size={12} /> <span>by <strong className="text-ink">{creator.name}</strong></span>
              </div>
            )}
          </div>

          {/* Tools */}
          {guide.tools?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <Wrench size={11} /> Required Tools
              </p>
              <div className="flex flex-wrap gap-2">
                {guide.tools.map((t, i) => (
                  <span key={i} className="text-xs bg-secondary border border-border px-2 py-0.5 font-medium">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Introduction */}
        <div className="border border-border bg-background p-6 mb-6">
          <h2 className="font-black uppercase tracking-tighter text-sm mb-3">Introduction</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{guide.introduction}</p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.step_id} className="border border-border bg-background overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-secondary border-b border-border">
                <span className="w-7 h-7 bg-ink text-white text-xs font-black flex items-center justify-center shrink-0">
                  {step.step_number}
                </span>
                <h3 className="font-bold text-sm">{step.title || `Step ${step.step_number}`}</h3>
              </div>

              <div className="p-5">
                {/* Images */}
                {step.images?.filter(Boolean).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    {step.images.filter(Boolean).map((url, i) => (
                      <img key={i} src={url} alt={`Step ${step.step_number} photo ${i + 1}`} className="w-full aspect-video object-cover border border-border" />
                    ))}
                  </div>
                )}

                <p className="text-sm leading-relaxed">{step.instructions}</p>

                {/* Video link */}
                {step.video_url && (
                  <a
                    href={step.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                  >
                    <Video size={12} /> Watch video for this step
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink transition-colors">
            <ArrowLeft size={13} /> Back to models
          </button>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            © {new Date(guide.created_at).getFullYear()} Autobot Systems
          </p>
        </div>

      </main>
    </div>
  );
}