"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CarModel {
  id: string;
  name: string;
  years: string;
  category: string;
}

interface CarModelCardProps {
  model: CarModel;
  brandId: string;
  brandName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CarModelCard({ model, brandId, brandName }: CarModelCardProps) {
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
      <div className="relative w-full aspect-[16/9] flex items-center justify-center px-4 py-3">
        <img
          src={`/car-models/${brandId}/${model.id}.png`}
          alt={`${brandName} ${model.name}`}
          className="
            w-full h-full object-contain
            transition-transform duration-300
            group-hover:scale-105
          "
        />
      </div>

      {/* ── Model Name ─────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 border-t border-border pt-3">
        <h3 className="
          text-lg font-black uppercase tracking-tighter leading-none
          group-hover:text-orange-600 transition-colors
        ">
          {model.name}
        </h3>
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