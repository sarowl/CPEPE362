"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Plus, Clock, Trash2, Edit2,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Eye,
  ArrowLeft, Wrench, Video, X, Package,
} from "lucide-react";
import { StepImageGrid, ThumbnailPreview } from "@/components/StepImageViewer";

interface Guide {
  guide_id: string;
  title: string;
  summary: string;
  brand_id: string;
  model_name: string;
  model_id?: string;
  difficulty: string;
  time_required: string;
  required_parts?: string[];
  status: "draft" | "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
}

interface Notification {
  id: number;
  guide_id: string;
  type: string;
  read: boolean;
  reason?: string | null;
  note?: string | null;
}

interface FullGuide {
  guide_id: string; title: string; summary: string; introduction: string;
  difficulty: string; time_required: string; tools: string[]; required_parts?: string[];
  brand_id: string; model_name: string; status: string;
  thumbnail_url?: string | null;
}
interface Step {
  step_id: string; step_number: number; title: string;
  instructions: string; images: string[]; video_url: string | null;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    description: "Waiting for admin review. You cannot edit while pending.",
    icon: <Clock size={13} className="text-yellow-600" />,
  },
  draft: {
    label: "Draft",
    badge: "bg-secondary text-muted-foreground border-border",
    description: "Not yet submitted. Keep working on it.",
    icon: <Edit2 size={13} className="text-muted-foreground" />,
  },
  approved: {
    label: "Approved",
    badge: "bg-green-50 text-green-700 border-green-200",
    description: "Published and visible to all users. Editing will require re-review.",
    icon: <CheckCircle size={13} className="text-green-600" />,
  },
  rejected: {
    label: "Returned",
    badge: "bg-red-50 text-red-600 border-red-200",
    description: "Not published. Review the admin feedback and edit to resubmit.",
    icon: <XCircle size={13} className="text-red-500" />,
  },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Expert:       "bg-red-50 text-red-700 border-red-200",
};

const STATUS_ORDER: Guide["status"][] = ["pending", "draft", "approved", "rejected"];

// ── YouTube embed helper ─────────────────────────────────────
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
      <div className="mt-3 aspect-video w-full overflow-hidden border border-border">
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
      className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline">
      <Video size={11} /> Watch video
    </a>
  );
}


export default function ProfileContributionsTab() {
  const [guides,         setGuides]         = useState<Guide[]>([]);
  const [notifications,  setNotifications]  = useState<Notification[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [deleting,       setDeleting]       = useState<string | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null);
  const [previewGuideId, setPreviewGuideId] = useState<string | null>(null);
  // 4.3 & 4.4: Search and status filter
  const [searchQuery,    setSearchQuery]    = useState("");
  const [statusFilter,   setStatusFilter]   = useState<Guide["status"] | "all">("all");

  useEffect(() => {
    const loadAll = async () => {
      const [guidesRes, notifRes] = await Promise.all([
        fetch("/api/guides?mine=1"),
        fetch("/api/notifications"),
      ]);
      const guidesJson = await guidesRes.json();
      const notifJson  = notifRes.ok ? await notifRes.json() : {};
      setGuides(guidesJson.guides ?? []);
      setNotifications(notifJson.notifications ?? []);
      setLoading(false);
    };
    loadAll();
  }, []);

  const markRead = async (notifId: number) => {
    await fetch(`/api/notifications?id=${notifId}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
  };

  const handleDelete = async (guideId: string) => {
    setDeleting(guideId);
    const res = await fetch(`/api/guides/${guideId}`, { method: "DELETE" });
    if (res.ok) {
      setGuides((prev) => prev.filter((g) => g.guide_id !== guideId));
      setNotifications((prev) => prev.filter((n) => n.guide_id !== guideId));
    }
    setDeleting(null);
    setConfirmDelete(null);
  };

  const getUnreadNotif = (guideId: string) =>
    notifications.find((n) => n.guide_id === guideId && !n.read);

  // 4.3: Filter by search query — Title, Time, Brand, Model, Difficulty
  // 4.4: Filter by status
  const visibleGuides = guides.filter((g) => {
    const matchesStatus = statusFilter === "all" || g.status === statusFilter;
    if (!matchesStatus) return false;
    if (!searchQuery.trim()) return true;
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = [g.title, g.brand_id, g.model_name, g.difficulty, g.time_required, ...(g.required_parts ?? [])].join(" ").toLowerCase();
    return keywords.every((k) => hay.includes(k));
  });

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = visibleGuides.filter((g) => g.status === status);
    return acc;
  }, {} as Record<Guide["status"], Guide[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <RefreshCw size={14} className="animate-spin" /> Loading your guides...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-black uppercase tracking-tighter text-xl">Contributions</h2>
          <p className="text-xs text-muted-foreground mt-1">All repair guides you've created</p>
        </div>
        <Link
          href="/guides/create?source=contributions"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all shadow-[3px_3px_0_0_rgba(0,0,0,0.1)]"
        >
          <Plus size={12} /> Create Guide
        </Link>
      </div>

      {guides.length === 0 ? (
        <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center py-16 gap-3">
          <BookOpen size={32} className="text-border" />
          <p className="text-sm font-bold text-muted-foreground">No guides yet</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
            Share your repair knowledge with the community. Create your first guide!
          </p>
          <Link href="/guides/create?source=contributions" className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all mt-1">
            <Plus size={12} /> Create Guide
          </Link>
        </div>
      ) : (
        <>
          {/* 4.3: Search bar */}
          <div className="mb-3 flex items-center gap-2 border border-border bg-background px-3 h-9">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, brand, model, difficulty, time..."
              className="h-full flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-ink">
                <X size={12} />
              </button>
            )}
          </div>

          {/* 4.4: Status filter */}
          <div className="mb-5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Filter:</span>
            {([["all", "All"], ["approved", "Approved"], ["rejected", "Returned"], ["draft", "Draft"], ["pending", "Pending"]] as [Guide["status"] | "all", string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-2.5 py-1 text-[10px] font-bold border transition-colors ${
                  statusFilter === val
                    ? "bg-primary text-white border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-8">
          {STATUS_ORDER.map((status) => {
            const list = grouped[status];
            if (list.length === 0) return null;
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  {cfg.icon}
                  <h3 className="font-black uppercase tracking-tighter text-sm">{cfg.label}</h3>
                  <span className="text-[10px] font-mono text-muted-foreground">({list.length})</span>
                  <div className="flex-1 h-px bg-border ml-1" />
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">{cfg.description}</p>
                <div className="space-y-2">
                  {list.map((guide) => {
                    const unread = getUnreadNotif(guide.guide_id);
                    const rejectionNotif = notifications.find(
                      (n) => n.guide_id === guide.guide_id && n.type === "guide_rejected"
                    );
                    return (
                      <GuideCard
                        key={guide.guide_id}
                        guide={guide}
                        unreadNotif={unread ?? null}
                        rejectionReason={guide.status === "rejected" ? (rejectionNotif?.reason ?? null) : null}
                        rejectionNote={guide.status === "rejected" ? (rejectionNotif?.note ?? null) : null}
                        onDelete={() => setConfirmDelete(guide.guide_id)}
                        onPreview={() => setPreviewGuideId(guide.guide_id)}
                        onMarkRead={unread ? () => markRead(unread.id) : undefined}
                        deleting={deleting === guide.guide_id}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

          {visibleGuides.length === 0 && guides.length > 0 && (
            <div className="border border-dashed border-border flex flex-col items-center justify-center py-12 gap-2 text-center">
              <p className="text-sm font-bold text-muted-foreground">No guides match your search or filter.</p>
              <button onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} className="text-xs text-primary underline">Clear filters</button>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm px-4">
          <div className="bg-background border border-border p-6 max-w-sm w-full shadow-[6px_6px_0_0_var(--ink)]">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-black uppercase tracking-tighter text-sm">Delete Guide?</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  This action cannot be undone. All steps and uploaded images will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-xs font-bold border border-border hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={!!deleting}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {deleting ? <><RefreshCw size={11} className="animate-spin" /> Deleting...</> : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [V2 Req #4] Guide preview modal — read-only for any status */}
      {previewGuideId && (
        <GuidePreviewModal
          guideId={previewGuideId}
          onClose={() => setPreviewGuideId(null)}
        />
      )}
    </div>
  );
}

// ── Guide Card ─────────────────────────────────────────────────
function GuideCard({
  guide, unreadNotif, rejectionReason, rejectionNote,
  onDelete, onPreview, onMarkRead, deleting,
}: {
  guide: Guide;
  unreadNotif: Notification | null;
  rejectionReason: string | null;
  rejectionNote: string | null;  // UPDATED 3.2/3.3: admin note
  onDelete: () => void;
  onPreview: () => void;
  onMarkRead?: () => void;
  deleting: boolean;
}) {
  const cfg = STATUS_CONFIG[guide.status];

  // Action permissions per status:
  //   pending  → preview ✓ | edit ✗ | delete ✓
  //   draft    → preview ✓ | edit ✓ | delete ✓
  //   approved → public-view ✓ | edit ✓ | delete ✓  (preview removed — use the public page)
  //   rejected → preview ✓ | edit ✓ | delete ✓
  const canEdit      = guide.status !== "pending";
  const canPublicView = guide.status === "approved" && !!guide.model_id;

  const date = guide.submitted_at ?? guide.updated_at;
  const dateLabel = date
    ? new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div
      className="border border-border bg-background p-4 flex items-start gap-4"
      onClick={() => { if (unreadNotif && onMarkRead) onMarkRead(); }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {unreadNotif && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" title="New notification" />
          )}
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">{dateLabel}</span>
        </div>

        <h4 className="font-bold text-sm truncate">{guide.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {guide.brand_id.charAt(0).toUpperCase() + guide.brand_id.slice(1)} {guide.model_name}
          {" · "}{guide.difficulty}{" · "}{guide.time_required}
        </p>

        {guide.status === "pending" && (
          <p className="text-[10px] text-yellow-600 mt-1.5 flex items-center gap-1">
            <Clock size={10} /> Awaiting admin review — editing locked
          </p>
        )}
        {guide.status === "approved" && (
          <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1">
            <CheckCircle size={10} /> Published — editing will require re-review
          </p>
        )}
        {guide.status === "rejected" && rejectionReason && (
          // UPDATED 3.2/3.3: Show rejection reason AND admin note clearly
          <div className="mt-1.5 space-y-1">
            <p className="text-[10px] text-red-500 flex items-center gap-1">
              <XCircle size={10} /> Returned: {rejectionReason}
            </p>
            {rejectionNote && (
              <p className="text-[10px] text-red-400 pl-3.5 italic">
                Admin note: "{rejectionNote}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Preview — only for non-approved statuses (draft, pending, rejected) */}
        {guide.status !== "approved" && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            title="Preview guide (read-only)"
            className="p-1.5 hover:bg-blue-50 border border-border rounded transition-colors"
          >
            <Eye size={13} className="text-blue-500" />
          </button>
        )}

        {/* Public link — approved guides only (navigates to public page) */}
        {canPublicView && (
          <Link
            href={`/guides/${guide.brand_id}/${guide.model_id}/${guide.guide_id}?source=contributions`}
            title="View published guide (public page)"
            className="p-1.5 hover:bg-green-50 border border-border rounded transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <BookOpen size={13} className="text-green-600" />
          </Link>
        )}

        {/* Edit — not available while pending */}
        {canEdit && (
          <Link
            href={`/guides/edit/${guide.guide_id}?source=contributions`}
            title="Edit guide"
            className="p-1.5 hover:bg-secondary border border-border rounded transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Edit2 size={13} className="text-muted-foreground" />
          </Link>
        )}

        {/* Delete — all statuses */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={deleting}
          title="Delete guide"
          className="p-1.5 hover:bg-red-50 border border-border rounded transition-colors disabled:opacity-50"
        >
          {deleting
            ? <RefreshCw size={13} className="animate-spin text-muted-foreground" />
            : <Trash2 size={13} className="text-red-500" />}
        </button>
      </div>
    </div>
  );
}

// ── [V2 Req #4] Guide Preview Modal ───────────────────────────
// Read-only inline modal that loads and renders a guide exactly
// as it would appear to readers. Works for ALL statuses so the
// owner can see how their guide looks before/after review.
function GuidePreviewModal({
  guideId,
  onClose,
}: {
  guideId: string;
  onClose: () => void;
}) {
  const [guide,   setGuide]   = useState<FullGuide | null>(null);
  const [steps,   setSteps]   = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/guides/${guideId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        setGuide(json.guide);
        setSteps(json.steps ?? []);
      })
      .catch(() => setError("Failed to load guide."))
      .finally(() => setLoading(false));
  }, [guideId]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const statusBadge: Record<string, string> = {
    pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
    draft:    "bg-secondary text-muted-foreground border-border",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/60 backdrop-blur-sm px-4 py-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border w-full max-w-3xl shadow-[8px_8px_0_0_var(--ink)] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary">
          <div className="flex items-center gap-3">
            <Eye size={14} className="text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Guide Preview
            </span>
            {guide && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border ${statusBadge[guide.status] ?? "bg-secondary border-border"}`}>
                {guide.status}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-border rounded transition-colors"
            title="Close preview"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <RefreshCw size={14} className="animate-spin" /> Loading preview...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 py-12 justify-center text-sm text-red-500">
              <AlertCircle size={16} /> {error}
            </div>
          ) : guide ? (
            <div>
              {/* UPDATED: Clickable thumbnail preview */}
              {guide.thumbnail_url && (
                <ThumbnailPreview src={guide.thumbnail_url} alt={guide.title} className="mb-5" />
              )}
              {/* Guide header */}
              <div className="mb-6">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 capitalize">
                  {guide.brand_id} · {guide.model_name}
                </p>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="font-black uppercase tracking-tighter text-xl leading-tight flex-1">
                    {guide.title}
                  </h2>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border shrink-0 ${DIFFICULTY_COLORS[guide.difficulty] ?? "bg-secondary border-border"}`}>
                    {guide.difficulty}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {guide.summary}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {guide.time_required}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen size={11} /> {steps.length} step{steps.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {guide.tools?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Wrench size={10} /> Required Tools
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {guide.tools.map((t, i) => (
                        <span key={i} className="text-xs bg-secondary border border-border px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
               {(guide.required_parts?.length ?? 0) > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Package size={10} /> Required Parts
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(guide.required_parts ?? []).map((p, i) => (
                        <span key={i} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Introduction */}
              <div className="border border-border p-4 mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Introduction</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{guide.introduction}</p>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {steps.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No steps added yet.</p>
                )}
                {steps.map((step) => (
                  <div key={step.step_id} className="border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary border-b border-border">
                      <span className="w-6 h-6 bg-ink text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {step.step_number}
                      </span>
                      <span className="text-xs font-bold">{step.title || `Step ${step.step_number}`}</span>
                    </div>
                    <div className="p-4">
                      <StepImageGrid images={step.images ?? []} stepNumber={step.step_number} />
                      <p className="text-sm leading-relaxed">{step.instructions}</p>
                      {step.video_url && (
                        <VideoEmbed url={step.video_url} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-secondary/50">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Read-only preview — changes require editing
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-border bg-background hover:bg-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}