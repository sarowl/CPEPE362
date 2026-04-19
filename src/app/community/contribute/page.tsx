"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { BookOpen, MessageCircle, Plus } from "lucide-react";

export default function ContributePage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16">
        <section className="mb-12 border-b border-border pb-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-4">
            Be <span className="text-primary">Involved</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-xl leading-relaxed">
            The Autobot community runs on shared knowledge. Whether you know how to fix a squeaky brake
            or just want to ask a question — your contribution matters.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Write a Guide */}
          <div className="border border-border bg-background p-8 flex flex-col gap-4 hover:border-primary transition-colors group">
            <div className="p-3 rounded-full bg-primary/10 text-primary w-fit group-hover:bg-primary group-hover:text-white transition-all">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter mb-1">Write a Guide</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Share step-by-step repair instructions for a specific car model. Help others fix their
                vehicles with your firsthand experience.
              </p>
            </div>
            <Link
              href="/guides/create"
              className="mt-auto flex items-center gap-2 bg-primary text-white px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all w-fit"
            >
              <Plus size={13} /> Create a Guide
            </Link>
          </div>

          {/* Start a Forum Post */}
          <div className="border border-border bg-background p-8 flex flex-col gap-4 hover:border-primary transition-colors group">
            <div className="p-3 rounded-full bg-primary/10 text-primary w-fit group-hover:bg-primary group-hover:text-white transition-all">
              <MessageCircle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter mb-1">Start a Discussion</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask a question, share an experience, or start a conversation about your car.
                The community is here to help.
              </p>
            </div>
            <Link
              href="/community/forum/create"
              className="mt-auto flex items-center gap-2 border border-primary text-primary px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all w-fit"
            >
              <MessageCircle size={13} /> Create a Post
            </Link>
          </div>
        </div>

        <footer className="mt-20 py-12 border-t border-border">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            © 2026 Autobot Systems // Community Contributions
          </p>
        </footer>
      </main>
    </div>
  );
}
