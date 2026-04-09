"use client";

// ================================================================
// Public user profile — anyone can visit /user/<userId>
//
// Shows:
//  - About section (name, occupation, about text, profile pic)
//  - Total likes / dislikes across all approved guides
//  - List of approved guides (view/read only — NO edit)
//
// -: Guide creator name is clickable → opens this page
// -: Other users can view/read guides, like/dislike, NOT edit
// ================================================================

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  ThumbsUp, ThumbsDown, BookOpen, Clock, ChevronRight,
  ArrowLeft, User, Briefcase, RefreshCw, AlertCircle,
} from "lucide-react";

interface UserProfile {
  user_id: string;
  name: string;
  about: string | null;
  occupation: string | null;
  profile_pic: string | null;
  created_at: string;
}
interface ApprovedGuide {
  guide_id: string;
  title: string;
  summary: string;
  brand_id: string;
  model_id: string;
  model_name: string;
  difficulty: string;
  time_required: string;
  created_at: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Expert:       "bg-red-50 text-red-700 border-red-200",
};

export default function PublicUserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const [user,           setUser]           = useState<UserProfile | null>(null);
  const [guides,         setGuides]         = useState<ApprovedGuide[]>([]);
  const [totalLikes,     setTotalLikes]     = useState(0);
  const [totalDislikes,  setTotalDislikes]  = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/user-public/${userId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        setUser(json.user);
        setGuides(json.approvedGuides ?? []);
        setTotalLikes(json.totalLikes ?? 0);
        setTotalDislikes(json.totalDislikes ?? 0);
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            <RefreshCw size={14} className="animate-spin" /> Loading profile...
          </div>
        </main>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm font-bold">{error || "User not found."}</p>
            <button onClick={() => router.back()} className="mt-4 text-xs text-muted-foreground hover:text-ink underline">
              Go back
            </button>
          </div>
        </main>
      </div>
    );
  }

  const joinYear = new Date(user.created_at).getFullYear();

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft size={13} /> Back
        </button>

        {/* Profile header */}
        <div className="border border-border bg-background p-6 mb-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 border-2 border-border bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
              {user.profile_pic ? (
                <img src={user.profile_pic} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User size={28} className="text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-black uppercase tracking-tighter text-2xl leading-tight">
                {user.name || "Anonymous"}
              </h1>
              {user.occupation && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Briefcase size={11} /> {user.occupation}
                </div>
              )}
              <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-widest">
                Member since {joinYear}
              </p>
            </div>

            {/* Like/dislike totals */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <ThumbsUp size={14} />
                  <span className="font-black text-lg">{totalLikes}</span>
                </div>
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Likes</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-500">
                  <ThumbsDown size={14} />
                  <span className="font-black text-lg">{totalDislikes}</span>
                </div>
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Dislikes</p>
              </div>
            </div>
          </div>

          {/* About */}
          {user.about && (
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">About</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{user.about}</p>
            </div>
          )}
        </div>

        {/* Approved Guides */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={14} className="text-primary" />
            <h2 className="font-black uppercase tracking-tighter text-base">
              Published Guides
            </h2>
            <span className="text-[10px] font-mono text-muted-foreground">({guides.length})</span>
          </div>

          {guides.length === 0 ? (
            <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center py-16 gap-3">
              <BookOpen size={28} className="text-border" />
              <p className="text-sm font-bold text-muted-foreground">No published guides yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {guides.map((guide) => (
                <Link
                  key={guide.guide_id}
                  href={`/guides/${guide.brand_id}/${guide.model_id}/${guide.guide_id}`}
                  className="group block border border-border bg-background p-4 hover:border-primary hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--primary)] transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-bold text-sm group-hover:text-primary transition-colors">
                      {guide.title}
                    </h3>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border shrink-0 ${DIFFICULTY_COLORS[guide.difficulty] ?? "bg-secondary border-border"}`}>
                      {guide.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{guide.summary}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="capitalize">{guide.brand_id}</span>
                    <ChevronRight size={9} />
                    <span>{guide.model_name}</span>
                    <span className="ml-auto flex items-center gap-1">
                      <Clock size={9} /> {guide.time_required}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
