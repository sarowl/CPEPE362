"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared Lightbox — rendered via React portal directly on document.body.
//
// WHY PORTALS:
//   • Any ancestor with overflow:hidden clips position:fixed children in
//     browsers that create a new stacking/containing block (e.g. when the
//     ancestor also has transform, will-change, or backdrop-filter).
//   • The guide step cards use overflow:hidden; the Contributions modal
//     uses backdrop-filter + overflow-y:auto.  Both trap a naive fixed div.
//   • createPortal moves the DOM node to <body> so it is a true viewport
//     overlay regardless of where in the React tree it is declared.
// ─────────────────────────────────────────────────────────────────────────────
interface LightboxProps {
  images: string[];
  initialIndex?: number;
  label?: string;
  onClose: () => void;
}

function Lightbox({ images, initialIndex = 0, label, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  const hasMultiple = images.length > 1;

  // Portal target must be resolved client-side only
  useEffect(() => { setMounted(true); }, []);

  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + images.length) % images.length),
    [images.length],
  );
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % images.length),
    [images.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (hasMultiple && e.key === "ArrowLeft") prev();
      if (hasMultiple && e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMultiple, onClose, prev, next]);

  // Lock body scroll while open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      style={{ animation: "lbFadeIn 120ms ease-out both" }}
      onClick={onClose}
    >
      {/* Label + counter */}
      {label && (
        <div className="absolute top-4 left-4 z-10 text-[10px] font-mono uppercase tracking-widest text-white/60 select-none pointer-events-none">
          {label}
          {hasMultiple && (
            <span className="ml-2 text-white/40">{current + 1} / {images.length}</span>
          )}
        </div>
      )}

      {/* Close button — always top-right */}
      <button
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/25 active:scale-95 text-white text-xs font-bold border border-white/20 transition-all rounded"
      >
        <X size={14} /> Close
      </button>

      {/* Left arrow */}
      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="Previous image"
          className="absolute left-3 sm:left-6 z-10 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/25 active:scale-95 border border-white/20 text-white transition-all rounded-full"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/*
        Image container — fixed viewport-relative size so the image is always
        centred on screen, never displaced by page scroll position.
        object-fit:contain scales low-res images up cleanly without cropping.
      */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: "min(92vw, 1100px)", height: "min(85vh, 800px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={current}
          src={images[current]}
          alt={label ? `${label} — image ${current + 1}` : `Image ${current + 1}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
            display: "block",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            animation: "lbFadeIn 150ms ease-out both",
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      {/* Right arrow */}
      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          aria-label="Next image"
          className="absolute right-3 sm:right-6 z-10 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/25 active:scale-95 border border-white/20 text-white transition-all rounded-full"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Dot indicators */}
      {hasMultiple && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrent(idx); }}
              aria-label={`Go to image ${idx + 1}`}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === current ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes lbFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1);    }
        }
      `}</style>
    </div>
  );

  // Only portal once we're client-side
  if (!mounted) return null;
  return createPortal(content, document.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// StepImageGrid — clickable step image thumbnails with isolated lightbox
// ─────────────────────────────────────────────────────────────────────────────
interface StepImageGridProps {
  images: (string | null | undefined)[];
  stepNumber: number;
  className?: string;
}

export function StepImageGrid({ images, stepNumber, className = "" }: StepImageGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const validImages = images.filter((u): u is string => !!u);
  if (validImages.length === 0) return null;

  return (
    <>
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 ${className}`}>
        {validImages.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="w-full overflow-hidden border border-border rounded group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ aspectRatio: "16/9" }}
            aria-label={`View Step ${stepNumber} image ${i + 1} in full size`}
            title="Click to view full size"
          >
            <img
              src={url}
              alt={`Step ${stepNumber} photo ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                if (el.parentElement) el.parentElement.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center pointer-events-none">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">
                <ZoomIn size={10} /> View Full Size
              </span>
            </div>
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={validImages}
          initialIndex={lightboxIndex}
          label={`Step ${stepNumber}`}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThumbnailPreview — clickable guide thumbnail with lightbox support
// ─────────────────────────────────────────────────────────────────────────────
interface ThumbnailPreviewProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Pass true when thumbnail is absent (placeholder) — disables click */
  isPlaceholder?: boolean;
}

export function ThumbnailPreview({ src, alt, className = "", isPlaceholder }: ThumbnailPreviewProps) {
  const [open, setOpen] = useState(false);

  const resolvedSrc = src || "/no-thumbnail.png";
  const clickable = !!src && !isPlaceholder;

  return (
    <>
      <div
        className={`w-full overflow-hidden border border-border rounded relative group ${clickable ? "cursor-zoom-in" : ""} ${className}`}
        style={{ aspectRatio: "16/9" }}
        onClick={clickable ? () => setOpen(true) : undefined}
        role={clickable ? "button" : undefined}
        aria-label={clickable ? `View ${alt} in full size` : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") setOpen(true); } : undefined}
      >
        <img
          src={resolvedSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-transform duration-200 ${clickable ? "group-hover:scale-105" : ""}`}
          loading="lazy"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.errored) {
              img.dataset.errored = "1";
              img.src = "/no-thumbnail.png";
            } else {
              img.style.display = "none";
            }
          }}
        />
        {clickable && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1.5 rounded">
              <ZoomIn size={11} /> View Full Size
            </span>
          </div>
        )}
      </div>

      {open && (
        <Lightbox
          images={[resolvedSrc]}
          label={alt}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default StepImageGrid;
