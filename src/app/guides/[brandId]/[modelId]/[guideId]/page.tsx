"use client";


import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import {
  Clock, Wrench, Package, ChevronRight, ArrowLeft, User,
  AlertCircle, BookOpen, Video, ThumbsUp, ThumbsDown, RefreshCw,
} from "lucide-react";

interface Guide {
  guide_id: string; title: string; summary: string; introduction: string;
  difficulty: string; time_required: string; tools: string[]; required_parts: string[];
  status: string; brand_id: string; model_name: string; user_id: string;
  created_at: string;
  thumbnail_url?: string | null;
}
interface Step {
  step_id: string; step_number: number; title: string;
  instructions: string; images: string[]; video_url: string | null;
}
interface Creator { name: string; user_id: string; }

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Expert:       "bg-red-50 text-red-700 border-red-200",
};

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.pathname.includes("/shorts/")) return u.pathname.split("/shorts/")[1];
  } catch {}
  return null;
}

function VideoEmbed({ url }: { url: string }) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="mt-4 aspect-video w-full overflow-hidden border border-border">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title="Step video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline">
      <Video size={12} /> Watch video for this step
    </a>
  );
}

export default function GuideViewPage() {
  const params  = useParams();
  const router  = useRouter();
  const guideId = params?.guideId as string;
  const searchParams = useSearchParams();
  const source = searchParams.get("source"); // "community", "contributions", or null (autohub)

  const [guide,        setGuide]        = useState<Guide | null>(null);
  const [steps,        setSteps]        = useState<Step[]>([]);
  const [creator,      setCreator]      = useState<Creator | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [likes,        setLikes]        = useState(0);
  const [dislikes,     setDislikes]     = useState(0);
  const [myReaction,   setMyReaction]   = useState<"like" | "dislike" | null>(null);
  const [myUserId,     setMyUserId]     = useState<string | null>(null);
  const [reacting,     setReacting]     = useState(false);
  const [bookmarked,   setBookmarked]   = useState(false);
  const [bookmarking,  setBookmarking]  = useState(false);

  useEffect(() => {
    if (!guideId) return;
    fetch(`/api/guides/${guideId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); setLoading(false); return; }
        setGuide(json.guide);
        setSteps(json.steps ?? []);
        return fetch(`/api/profile_fetch?user_id=${json.guide.user_id}`);
      })
      .then((r) => r?.json())
      .then((j) => {
        if (j?.user) setCreator({ name: j.user.name, user_id: j.user.user_id });
      })
      .catch(() => setError("Failed to load guide."))
      .finally(() => setLoading(false));
  }, [guideId]);

  useEffect(() => {
    if (!guideId) return;
    fetch(`/api/guides-likes?guide_id=${guideId}`)
      .then((r) => r.json())
      .then((json) => {
        setLikes(json.likes ?? 0);
        setDislikes(json.dislikes ?? 0);
        setMyReaction(json.myReaction ?? null);
        setMyUserId(json.myUserId ?? null);
        setBookmarked(json.bookmarked ?? false);
      })
      .catch(() => {});
  }, [guideId]);

  const handleReact = async (reaction: "like" | "dislike") => {
    if (reacting) return;
    const newReaction = myReaction === reaction ? null : reaction;
    setReacting(true);
    try {
      const res = await fetch("/api/guides-likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guide_id: guideId, reaction: newReaction }),
      });
      const json = await res.json();
      if (res.ok) { setLikes(json.likes ?? 0); setDislikes(json.dislikes ?? 0); setMyReaction(json.myReaction); }
    } catch (_) {}
    setReacting(false);
  };

  const handleBookmark = async () => {
    if (!isLoggedIn || bookmarking) return;
    setBookmarking(true);
    try {
      const res = await fetch("/api/guides-likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guide_id: guideId, action: "bookmark" }),
      });
      const json = await res.json();
      if (res.ok) setBookmarked(json.bookmarked ?? !bookmarked);
    } catch (_) {}
    setBookmarking(false);
  };

  const isOwnGuide = !!(guide && myUserId && guide.user_id === myUserId);
  const isLoggedIn = !!myUserId;

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

  // UPDATED 6.4: Only use fallback if thumbnail_url is genuinely absent
  const thumbnailSrc = guide.thumbnail_url ?? "/no-thumbnail.png";

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
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              {/* UPDATED 6.1: Title first */}
              <h1 className="font-black uppercase tracking-tighter text-2xl leading-tight mb-2">{guide.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{guide.summary}</p>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border shrink-0 ${DIFFICULTY_COLORS[guide.difficulty] ?? "bg-secondary border-border"}`}>
              {guide.difficulty}
            </span>
          </div>

          {/* UPDATED 6.1: Thumbnail immediately after title */}
          <div className="mb-4 w-full overflow-hidden border border-border rounded" style={{ aspectRatio: "16/9" }}>
            <img
              src={thumbnailSrc}
              alt={guide.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.errored) {
                  img.dataset.errored = "1";
                  img.src = "/no-thumbnail.png";
                } else {
                  img.style.display = "none";
                }
              }}
              loading="lazy"
            />
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
                <User size={12} />
                <span>by{" "}
                  <Link href={`/user/${creator.user_id}`} className="font-bold text-ink hover:text-primary hover:underline transition-colors">
                    {creator.name}
                  </Link>
                </span>
              </div>
            )}
          </div>

          {/* Tools */}
          {guide.tools?.length > 0 && (
            <div className="mb-4">
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

          {/* Required Parts */}
          {guide.required_parts?.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <Package size={11} /> Required Parts
              </p>
              <div className="flex flex-wrap gap-2">
                {guide.required_parts.map((p: string, i: number) => (
                  <span key={i} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 font-medium">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Like / Dislike / Bookmark row */}
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Was this guide helpful?</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => handleReact("like")}
                disabled={reacting || isOwnGuide || !isLoggedIn}
                title={isOwnGuide ? "Cannot react to your own guide" : !isLoggedIn ? "Log in to like" : myReaction === "like" ? "Remove like" : "Like"}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-all disabled:cursor-not-allowed ${myReaction === "like" ? "bg-green-600 text-white border-green-600" : "bg-background border-border text-muted-foreground hover:border-green-400 hover:text-green-600 disabled:opacity-40"}`}
              >
                {reacting && myReaction !== "like" ? <RefreshCw size={11} className="animate-spin" /> : <ThumbsUp size={12} />}
                <span>{likes}</span>
              </button>
              <button
                onClick={() => handleReact("dislike")}
                disabled={reacting || isOwnGuide || !isLoggedIn}
                title={isOwnGuide ? "Cannot react to your own guide" : !isLoggedIn ? "Log in to rate" : myReaction === "dislike" ? "Remove dislike" : "Dislike"}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-all disabled:cursor-not-allowed ${myReaction === "dislike" ? "bg-red-600 text-white border-red-600" : "bg-background border-border text-muted-foreground hover:border-red-400 hover:text-red-500 disabled:opacity-40"}`}
              >
                {reacting && myReaction !== "dislike" ? <RefreshCw size={11} className="animate-spin" /> : <ThumbsDown size={12} />}
                <span>{dislikes}</span>
              </button>
              {!isLoggedIn && <Link href="/login" className="text-[10px] text-muted-foreground hover:text-primary underline">Log in to react</Link>}
              {/* Bookmark button — always visible when logged in and not own guide */}
              {isLoggedIn && !isOwnGuide && (
                <button
                  onClick={handleBookmark}
                  disabled={bookmarking}
                  title={bookmarked ? "Remove bookmark" : "Bookmark this guide"}
                  className={`flex items-center justify-center w-9 h-9 border transition-all disabled:cursor-not-allowed ml-2 active:scale-90 ${bookmarked ? "bg-primary border-primary" : "bg-background border-border hover:border-primary"}`}
                >
                  {bookmarking ? (
                    <RefreshCw size={14} className="animate-spin text-muted-foreground" />
                  ) : (
                    <img
                      src="/bookmark-icon-profile.png"
                      alt={bookmarked ? "Bookmarked" : "Bookmark"}
                      width={16}
                      height={16}
                      className="object-contain"
                      style={{ filter: bookmarked ? "brightness(10)" : "opacity(0.4)" }}
                    />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Note/Introduction — UPDATED 4.3: labelled "Note" */}
        {guide.introduction && (
          <div className="border border-border bg-background p-6 mb-6">
            <h2 className="font-black uppercase tracking-tighter text-sm mb-3">Note</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{guide.introduction}</p>
          </div>
        )}

        {/* Steps — UPDATED 5: images load correctly, proper scaling */}
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
                {step.images?.filter(Boolean).length > 0 && (
                  // UPDATED 5: Large, clear images, correct aspect ratio, no distortion
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    {step.images.filter(Boolean).map((url, i) => (
                      <div key={i} className="w-full overflow-hidden border border-border rounded" style={{ aspectRatio: "16/9" }}>
                        <img
                          src={url}
                          alt={`Step ${step.step_number} photo ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm leading-relaxed">{step.instructions}</p>
                {step.video_url && <VideoEmbed url={step.video_url} />}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
          <button
            onClick={() => {
              if (source === "community") router.push("/community/guides");
              else if (source === "contributions") router.push("/profile?tab=contributions");
              else router.back();
            }}
            className="flex items-center gap-2 px-3 py-1.5 border border-border text-[11px] font-bold uppercase tracking-widest bg-background text-ink hover:bg-[#474757] hover:text-white hover:border-[#474757] transition-all"
          >
            <ArrowLeft size={13} /> Back
          </button>
          {creator && (
            <Link href={`/user/${creator.user_id}`} className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
              By {creator.name}
            </Link>
          )}
        </div>

      </main>
    </div>
  );
}
