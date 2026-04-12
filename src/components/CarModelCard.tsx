"use client";

import React from "react";
import Link from "next/link";
import { Plus, ImageIcon } from "lucide-react";
import { resolveCarModelImage, getCarTypeImage } from "@/lib/carTypeImage";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CarModel {
  id: string;
  name: string;
  years: string;
  category: string;
  model_img?: string | null; // NEW: Supabase Storage public URL (Admin Fix #4)
}

interface CarModelCardProps {
  model: CarModel;
  brandId: string;
  brandName: string;
  guideCount?: number;
  forumCount?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CarModelCard({ model, brandId, brandName, guideCount = 0, forumCount = 0 }: CarModelCardProps) {
  // Image source priority:
  //   1. model_img from Supabase Storage (uploaded via admin) — if available
  //   2. Default image based on car type/category (e.g. /Car Types/sedan.png)
  //   3. /no-thumbnail.png — last-resort fallback for unknown categories
  const hasUploadedImage = !!model.model_img;
  const imgSrc = resolveCarModelImage(model.model_img, model.category);

  return (
    <Link
      href={`/guides/${brandId}/${model.id}`}
      className="
        group relative flex flex-col
        bg-background border border-border
        transition-all duration-200
        hover:border-orange-500 hover:-translate-y-1
        hover:shadow-[8px_8px_0px_0px_#f97316]
        overflow-hidden
      "
    >
      {/* ── Category Badge ─────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <span className="
          inline-block font-mono text-[9px] uppercase tracking-widest
          px-2 py-0.5 border font-bold
          text-zinc-500 border-zinc-200 bg-zinc-50
          group-hover:text-orange-600 group-hover:border-orange-500 group-hover:bg-orange-50
          transition-colors
        ">
          {model.category}
        </span>
      </div>

      {/* ── Model Image ────────────────────────────────────────────────── */}
      <div className="relative w-full aspect-[16/9] flex items-center justify-center px-4 py-3 bg-secondary/20">
        <img
          src={imgSrc}
          alt={`${brandName} ${model.name}`}
          onError={(e) => {
            // If the resolved image fails, fall back to no-thumbnail
            (e.currentTarget as HTMLImageElement).src = "/no-thumbnail.png";
          }}
          className={`
            w-full h-full object-contain
            transition-transform duration-300
            group-hover:scale-105
            ${!hasUploadedImage ? "opacity-70" : ""}
          `}
        />
      </div>

      {/* ── Model Name ─────────────────────────────────────────────────── */}
      <div className="px-4 pb-8 border-t border-border pt-3">
        <h3 className="
          text-lg font-black uppercase tracking-tighter leading-none
          group-hover:text-orange-600 transition-colors
        ">
          {model.name}
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{model.years}</p>
      </div>

      {/* ── 6.1: Data Indicators — Approved Guides + Forums (bottom-right) ── */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        <span
          title={`${guideCount} approved guide${guideCount !== 1 ? "s" : ""}`}
          className="flex items-center gap-0.5 bg-orange-50 border border-orange-200 text-orange-700 text-[8px] font-bold px-1.5 py-0.5 rounded-sm"
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          {guideCount}
        </span>
        <span
          title={`${forumCount} forum thread${forumCount !== 1 ? "s" : ""}`}
          className="flex items-center gap-0.5 bg-zinc-50 border border-zinc-200 text-zinc-500 text-[8px] font-bold px-1.5 py-0.5 rounded-sm"
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {forumCount}
        </span>
      </div>

      {/* ── Decorative corners ─────────────────────────────────────────── */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Plus size={10} className="text-orange-500" />
      </div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-border group-hover:border-orange-500 transition-colors" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-border group-hover:border-orange-500 transition-colors" />
    </Link>
  );
}