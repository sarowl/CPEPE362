"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Wrench, MessageCircle, Tag } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type GuideResult = {
  id: number;
  title: string;
  make: string;
  model: string;
  description: string;
  image: string;
};

type ForumResult = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  answers: number;
};

const GUIDE_RESULTS: GuideResult[] = [
  {
    id: 1,
    title: "2007-2011 Toyota Camry Sun Visor Replacement",
    make: "Toyota",
    model: "Camry",
    description: "Guide to replace a worn sun visor with basic hand tools.",
    image: "/toyota-camry.jpg",
  },
  {
    id: 2,
    title: "2019-2024 Ford Ranger Basic Maintenance and Troubleshooting",
    make: "Ford",
    model: "Ranger",
    description: "Complete guide for oil change, brake inspection, battery check, and common pickup troubleshooting procedures.",
    image: "/ford-ranger.png",
  },
  {
    id: 3,
    title: "2017-2024 Kia Picanto Preventive Maintenance",
    make: "Kia",
    model: "Picanto",
    description: "Step-by-step city-car maintenance guide covering fluids, spark plugs, filters, and routine inspection points.",
    image: "/kia-picanto.png",
  },
  {
    id: 4,
    title: "2013-2024 Chevrolet Trailblazer Service and Repair Guide",
    make: "Chevrolet",
    model: "Trailblazer",
    description: "SUV-focused maintenance and repair instructions for suspension checks, cooling system service, and drivetrain diagnostics.",
    image: "/chevrolet-trailblazer.png",
  },
];

const FORUM_RESULTS: ForumResult[] = [
  {
    id: 1,
    title: "How do I exchange the radiator cooling fan motor from a 2014 Vios?",
    content: "Fan motor from my 2014 Toyota Vios seems dead. Any compatible parts and steps?",
    tags: ["toyota", "vios", "cooling-system"],
    answers: 1,
  },
  {
    id: 2,
    title: "Does Toyota Vista 1996 have an aircon filter?",
    content: "If yes, where is it located and how do I remove it safely?",
    tags: ["toyota", "vista", "aircon"],
    answers: 2,
  },
  {
    id: 3,
    title: "My Toyota Vitz jerks while driving",
    content: "Not CVT anymore? Any assistance would be appreciated.",
    tags: ["toyota", "vitz", "transmission"],
    answers: 0,
  },
];

const SEARCH_CATEGORIES = ["All", "Store", "Devices", "Guides", "Wikis", "Answers", "Pages", "News", "Documents"];

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  const keywords = useMemo(() => {
    return query
      .toLowerCase()
      .split(/\s+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [query]);

  const filteredGuides = useMemo(() => {
    if (!keywords.length) return GUIDE_RESULTS;

    return GUIDE_RESULTS.filter((item) => {
      const haystack = `${item.title} ${item.make} ${item.model} ${item.description}`.toLowerCase();
      return keywords.every((k) => haystack.includes(k));
    });
  }, [keywords]);

  const filteredForum = useMemo(() => {
    if (!keywords.length) return FORUM_RESULTS;

    return FORUM_RESULTS.filter((item) => {
      const haystack = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase();
      return keywords.every((k) => haystack.includes(k));
    });
  }, [keywords]);

  const handleSearch = (value: string) => {
    setQuery(value);
    const trimmed = value.trim();

    if (trimmed) {
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
      return;
    }

    router.replace("/search");
  };

  const handleProtectedClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user) return;

    e.preventDefault();
    setNotice("Login is required to view full content.");
  };

  return (
    <main className="bg-secondary/40 min-h-[calc(100vh-56px)] px-4 py-8 md:px-8">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-border bg-background p-5 shadow-sm md:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Search</h1>

        <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-background px-3 h-11">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by keyword"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="rounded p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-border pb-3">
          {SEARCH_CATEGORIES.map((category, idx) => (
            <span
              key={category}
              className={`text-sm font-semibold ${idx === 0 ? "text-foreground" : "text-foreground/70"}`}
            >
              {category}
            </span>
          ))}
        </div>

        {notice ? (
          <div className="mt-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
            {notice} <Link href="/login" className="font-semibold underline">Go to login</Link>
          </div>
        ) : null}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight">Guides</h2>
            <span className="text-sm text-primary">See all {filteredGuides.length} results</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/guides/${guide.id}`}
                onClick={handleProtectedClick}
                className="flex gap-3 rounded-2xl border border-border p-3 transition-colors hover:border-primary/50"
              >
                <Image
                  src={guide.image}
                  alt={guide.title}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                      <Wrench size={11} /> Repair Guide
                    </span>
                  </div>
                  <p className="line-clamp-2 text-base font-semibold leading-snug">{guide.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {guide.description} ({guide.make} {guide.model})
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight">Answers</h2>
            <span className="text-sm text-primary">See all {filteredForum.length} results</span>
          </div>

          <div className="space-y-4">
            {filteredForum.map((post) => (
              <Link
                key={post.id}
                href={`/community/forum/${post.id}`}
                onClick={handleProtectedClick}
                className="flex items-start gap-4 rounded-2xl border border-border p-4 transition-colors hover:border-primary/50"
              >
                <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <MessageCircle size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                      <Tag size={11} /> Forum
                    </span>
                  </div>
                  <p className="line-clamp-2 text-base font-semibold leading-snug">{post.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                </div>

                <div className="text-right text-xs text-muted-foreground">
                  {post.answers} {post.answers === 1 ? "answer" : "answers"}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}