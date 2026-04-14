"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Plus } from "lucide-react";

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

export default function ForumPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">

        {/* HERO SECTION */}
        <section className="flex flex-col md:flex-row gap-8 mb-16 items-start border-b border-border pb-12">
          <div className="flex-1">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none">
                Answer <span className="text-primary">Forum</span>
              </h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl font-medium">
              Join the community. Ask questions, share experiences, and get help
              from fellow car owners. Select a brand below to enter its forum.
            </p>
          </div>
        </section>

        {/* DIRECTORY HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">
              Select a Brand
            </h2>
            <div className="h-1 w-12 bg-primary mt-1" />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            {BRANDS.length} Brand Forums
          </span>
        </div>

        {/* BRAND GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {BRANDS.map((brand) => (
            <Link
              key={brand.id}
              href={`/community/forum/${brand.id}`}
              className="group relative aspect-square flex flex-col items-center justify-center
                         bg-background border border-border transition-all duration-200
                         hover:border-ink hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--primary)]"
            >
              <div className="h-20 w-20 mb-4 flex items-center justify-center p-2 transition-all">
                <img
                  src={`/car-makers/${brand.id}.png`}
                  alt={`${brand.name} logo`}
                  className="max-h-full max-w-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              </div>

              <span className="font-bold text-[11px] uppercase tracking-widest text-ink/60 group-hover:text-ink">
                {brand.name}
              </span>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={10} className="text-primary" />
              </div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-border group-hover:border-primary" />
            </Link>
          ))}
        </div>

        {/* FOOTER */}
        <footer className="mt-20 py-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            © 2026 Autobot Systems // Community Forum
          </p>
        </footer>
      </main>
    </div>
  );
}