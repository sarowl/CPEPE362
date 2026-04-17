"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const heroBg      = "/hero-bg.jpg";
const cardGuides  = "/card-guides.jpg";
const cardAi      = "/card-ai.jpg";
const cardCommunity = "/card-community.jpg";

type RecentGuide = {
  guide_id: string;
  title: string;
  summary: string;
  brand_id: string;
  model_id: string;
  model_name: string;
  difficulty: string;
  time_required: string;
  created_at: string;
};

export default function HomePage() {
  const [user, setUser]             = useState<User | null>(null);
  const [search, setSearch]         = useState("");
  const [recentGuides, setRecent]   = useState<RecentGuide[]>([]);
  const [loadingGuides, setLoading] = useState(true);

  // Auth listener with initial session check (from JANN)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch 7 most recent approved guides (from JANN)
  useEffect(() => {
    fetch("/api/guides")
      .then((r) => r.json())
      .then((d) => {
        const all: RecentGuide[] = d.guides ?? [];
        setRecent(all.slice(0, 7));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Navigate to /search with query param (from JANN)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(search.trim())}`;
    } else {
      window.location.href = "/search";
    }
  };

  return (
    <div className="flex flex-col animate-fade-in">
      {/* HERO */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 py-28 md:py-40"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-ink/75" />
        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-6">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-primary-foreground leading-tight">
            The Free Repair Guide
          </h1>
          <p className="font-mono text-sm md:text-base text-primary-foreground/70">
            for every car, written by real mechanics
          </p>

          {/* Search bar — navigates to /search with query param */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full max-w-lg flex items-center bg-background rounded-sm overflow-hidden shadow-lg border border-border"
          >
            <div className="pl-4 text-muted-foreground">
              <Search size={18} />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Try "Toyota Corolla brake pads"'
              className="flex-1 h-12 bg-transparent font-mono text-sm px-3 text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="bg-primary text-primary-foreground font-mono text-xs font-bold px-5 h-12 flex items-center tracking-wide hover:opacity-90 transition-opacity"
            >
              SEARCH
            </button>
          </form>

          <p className="font-mono text-xs text-primary-foreground/50">or</p>

          <Link
            href="/community/guides"
            className="font-mono text-sm text-primary-foreground border border-primary-foreground/40 px-6 py-2.5 hover:bg-primary-foreground/10 transition-colors"
          >
            Browse All Guides
          </Link>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-3 tracking-tight">
          Never take broken for an answer
        </h2>
        <p className="font-mono text-xs text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Get the instructions you need with AI-powered diagnostics and the expertise of a robust community.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            image={cardGuides}
            title="Step-by-Step Guides"
            description="Learn how to fix anything with simple, easy-to-follow instructions created by real mechanics."
            linkTo="/community/guides"
            linkLabel="Find a Guide"
          />
          {/* AI card links to /ai-repair (merged from JANN) */}
          <FeatureCard
            image={cardAi}
            title="AI Repair Assistant"
            description="Describe your symptoms and let our AI diagnose the issue, suggest parts, and walk you through the fix."
            linkTo={user ? "/ai-repair" : "/login"}
            linkLabel={user ? "Ask the AI" : "Login to Use AI"}
          />
          {/* Community card links to /forum (merged from JANN) */}
          <FeatureCard
            image={cardCommunity}
            title="A Community of Fixers"
            description="No one knows how to fix everything, but everyone knows how to fix something. Join the conversation."
            linkTo="/forum"
            linkLabel="Join the Community →"
          />
        </div>
      </section>

      {/* RECENT REPAIR GUIDES — 7 most recent, horizontal scroll carousel */}
      <section className="bg-secondary/30 py-16 px-6 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Recent Repair Guides
            </h2>
            <Link
              href="/community/guides"
              className="flex items-center gap-1 font-mono text-xs text-primary hover:underline tracking-wide"
            >
              Show All Guides <ChevronRight size={13} />
            </Link>
          </div>

          {loadingGuides ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading guides...
            </div>
          ) : recentGuides.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No approved guides yet.{" "}
              {user && (
                <Link href="/guides/create" className="text-primary underline">
                  Be the first to create one!
                </Link>
              )}
            </div>
          ) : (
            /* Horizontal scrollable carousel with snap behavior */
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border">
              {recentGuides.map((guide) => (
                <div
                  key={guide.guide_id}
                  className="border border-border p-5 flex flex-col gap-2 hover:border-primary/50 transition-colors bg-background snap-start shrink-0 w-72"
                >
                  <div className="font-mono text-[10px] tracking-widest text-primary uppercase">
                    {guide.brand_id} · {guide.model_name}
                  </div>
                  <div className="text-sm font-bold leading-snug line-clamp-2">{guide.title}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {guide.difficulty} · {guide.time_required}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-2 mt-auto line-clamp-2">
                    {guide.summary}
                  </div>
                  <div className="pt-2">
                    {user ? (
                      <Link
                        href={`/guides/${guide.brand_id}/${guide.model_id}/${guide.guide_id}`}
                        className="font-mono text-[10px] font-bold text-primary hover:underline tracking-wide"
                      >
                        VIEW GUIDE →
                      </Link>
                    ) : (
                      <div className="font-mono text-[10px] text-muted-foreground italic">
                        🔒 Login to view full guide
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER CTA — links to /ai-repair for logged-in users */}
      <section className="bg-ink py-16 px-6 text-center">
        <h2 className="text-xl md:text-2xl font-extrabold text-primary-foreground mb-3">
          Ready to fix it yourself?
        </h2>
        <p className="font-mono text-xs text-primary-foreground/60 mb-6 max-w-md mx-auto">
          Join thousands of DIY mechanics using Autobot to diagnose, repair, and maintain their vehicles.
        </p>
        <Link
          href={user ? "/ai-repair" : "/signup"}
          className="inline-block bg-primary text-primary-foreground font-mono text-sm font-bold px-8 py-3 tracking-wide hover:opacity-90 transition-opacity"
        >
          {user ? "START DIAGNOSING →" : "JOIN AUTOBOT →"}
        </Link>
      </section>
    </div>
  );
}

// FeatureCard sub-component — unchanged from development
function FeatureCard({
  image, title, description, linkTo, linkLabel,
}: {
  image: string; title: string; description: string; linkTo: string; linkLabel: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden border border-border bg-background hover:border-primary/50 transition-colors group">
      <div className="w-full h-48 overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <h3 className="text-base font-bold">{title}</h3>
        <p className="font-mono text-xs text-muted-foreground leading-relaxed flex-1">{description}</p>
        <Link href={linkTo} className="mt-2 font-mono text-xs font-bold text-primary hover:underline tracking-wide">
          {linkLabel} →
        </Link>
      </div>
    </div>
  );
}