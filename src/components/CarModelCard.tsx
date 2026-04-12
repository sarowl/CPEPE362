"use client";

// ================================================================
//   Changes:
//   1. Added `model_img?: string` to the CarModel interface so the
//      field flows through from the API response.
//   2. Image src logic:
//      - If model_img is set (uploaded via admin panel), use it.
//      - Otherwise fall back to the local /car-models/ path for
//        models that already had a static image (backwards compat).
//   3. If neither exists, shows a neutral placeholder so the card
//      still renders cleanly.
//
//   This should makes the image visible to BOTH users and admin (Admin #4).
// ================================================================

import React from "react";
import Link from "next/link";
import { Plus, ImageIcon } from "lucide-react";

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
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CarModelCard({ model, brandId, brandName }: CarModelCardProps) {
  // Image source priority:
  //   1. model_img from Supabase Storage (uploaded via admin, Admin Fix #4)
  //   2. Local static file (legacy fallback for pre-existing models)
  //   3. null → placeholder rendered below
  const imgSrc = model.model_img || `/car-models/${brandId}/${model.id}.png`;

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
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`${brandName} ${model.name}`}
            onError={(e) => {
              // If both sources fail (e.g. local file missing), show placeholder
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const placeholder = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (placeholder) placeholder.style.display = "flex";
            }}
            className="
              w-full h-full object-contain
              transition-transform duration-300
              group-hover:scale-105
            "
          />
        ) : null}

        {/* Placeholder shown when no image is available */}
        <div
          style={{ display: imgSrc ? "none" : "flex" }}
          className="w-full h-full items-center justify-center flex-col gap-1 text-muted-foreground"
        >
          <ImageIcon size={28} className="opacity-30" />
          <span className="text-[9px] uppercase tracking-widest font-bold opacity-30">No image</span>
        </div>
      </div>

      {/* ── Model Name ─────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 border-t border-border pt-3">
        <h3 className="
          text-lg font-black uppercase tracking-tighter leading-none
          group-hover:text-orange-600 transition-colors
        ">
          {model.name}
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{model.years}</p>
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