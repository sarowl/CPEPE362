"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, XCircle, ChevronRight, BookOpen,
  RefreshCw, Clock, User, ArrowLeft, History,
  Trash2, Eye, AlertCircle, X,
} from "lucide-react";

const REJECTION_REASONS = [
  "Incomplete", "Unreliable", "Unrealistic",
  "Too Simple", "Poor Photos", "Other",
];

interface PendingGuide {
  guide_id: string; title: string; summary: string;
  brand_id: string; model_name: string; difficulty: string;
  time_required: string; submitted_at: string; user_id: string;
}
interface UserGroup { user_id: string; user_name: string; guides: PendingGuide[]; }
interface FullGuide {
  guide_id: string; title: string; summary: string; introduction: string;
  difficulty: string; time_required: string; tools: string[]; required_parts?: string[];
  brand_id: string; model_name: string;
  thumbnail_url?: string | null; // UPDATED 6.1
}
interface Step {
  step_id: string; step_number: number; title: string;
  instructions: string; images: string[]; video_url?: string | null;
}
interface HistoryGuide {
  guide_id: string; title: string; summary: string;
  brand_id: string; model_id: string; model_name: string;
  difficulty: string; time_required: string; required_parts?: string[];
  status: "approved" | "rejected";
  reviewed_at: string; reviewed_by: string; user_name: string;
  rejection: { reason: string; note: string | null } | null;
}

type AdminTab = "pending" | "history";

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
  return null;
}


export default function AdminGuidesTab({
  adminEmail,
  onToast,
  onPendingCountChange,
}: {
  adminEmail: string;
  onToast: (msg: string, type?: "ok" | "err") => void;
  onPendingCountChange?: (count: number) => void;
}) {
  const [adminTab,     setAdminTab]     = useState<AdminTab>("pending");

  // ── Pending state ─────────────────────────────────────────────
  const [groups,       setGroups]       = useState<UserGroup[]>([]);
  const [loadingPend,  setLoadingPend]  = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [reviewGuide,  setReviewGuide]  = useState<{ guide: FullGuide; steps: Step[] } | null>(null);
  const [reviewing,    setReviewing]    = useState(false);
  const [rejectMode,   setRejectMode]   = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote,   setRejectNote]   = useState("");
  const [actioning,    setActioning]    = useState(false);

  // ── History state ─────────────────────────────────────────────
  const [historyGuides,  setHistoryGuides]  = useState<HistoryGuide[]>([]);
  const [loadingHist,    setLoadingHist]    = useState(false);
  const [historyView,    setHistoryView]    = useState<{ guide: FullGuide; steps: Step[] } | null>(null);
  const [deletingHist,   setDeletingHist]   = useState<string | null>(null);
  const [confirmDelHist, setConfirmDelHist] = useState<string | null>(null);
  // Spec 5: Search + filter for history
  const [historySearch,    setHistorySearch]    = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "approved" | "rejected">("all");

  // ── Fetch pending guides ──────────────────────────────────────
  const fetchPending = useCallback(async () => {
    setLoadingPend(true);
    const res  = await fetch("/api/guides-review", { headers: { "x-admin-email": adminEmail } });
    const json = await res.json();
    const grps: UserGroup[] = json.groups ?? [];
    setGroups(grps);
    onPendingCountChange?.(json.pendingCount ?? grps.reduce((s, g) => s + g.guides.length, 0));
    setLoadingPend(false);
  }, [adminEmail, onPendingCountChange]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // ── Fetch review history ──────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setLoadingHist(true);
    const res  = await fetch("/api/guides-history", { headers: { "x-admin-email": adminEmail } });
    const json = await res.json();
    setHistoryGuides(json.guides ?? []);
    setLoadingHist(false);
  }, [adminEmail]);

  useEffect(() => {
    if (adminTab === "history") fetchHistory();
  }, [adminTab, fetchHistory]);

  // ── Open a guide for full reading ────────────────────────────
  const openGuide = async (guideId: string, forHistory = false) => {
    setReviewing(true);
    setRejectMode(false); setRejectReason(""); setRejectNote("");
    const [guideRes, stepsRes] = await Promise.all([
      fetch(`/api/guides/${guideId}`, { headers: { "x-admin-email": adminEmail } }),
      fetch(`/api/guides/${guideId}/steps`, { headers: { "x-admin-email": adminEmail } }),
    ]);
    const guideJson = await guideRes.json();
    const stepsJson = await stepsRes.json();
    const payload = { guide: guideJson.guide, steps: stepsJson.steps ?? [] };
    if (forHistory) setHistoryView(payload);
    else            setReviewGuide(payload);
    setReviewing(false);
  };

  // ── Approve / reject ─────────────────────────────────────────
  const handleAction = async (action: "approve" | "reject") => {
    if (!reviewGuide) return;
    if (action === "reject" && !rejectReason) { onToast("Select a rejection reason.", "err"); return; }
    setActioning(true);
    const res = await fetch("/api/guides-review", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-email": adminEmail },
      body: JSON.stringify({
        guide_id: reviewGuide.guide.guide_id, action,
        reason: rejectReason || undefined,
        note:   rejectNote   || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) { onToast(json.error ?? "Action failed.", "err"); setActioning(false); return; }
    onToast(action === "approve" ? "Guide approved and published!" : "Guide rejected. Author will be notified.");
    setReviewGuide(null);
    fetchPending();
    setActioning(false);
  };

  // ── Soft-delete from admin history ───────────────────────────
  const handleDeleteFromHistory = async (guideId: string) => {
    setDeletingHist(guideId);
    const res = await fetch(`/api/guides-history?guide_id=${guideId}`, {
      method: "DELETE",
      headers: { "x-admin-email": adminEmail },
    });
    if (res.ok) {
      setHistoryGuides((prev) => prev.filter((g) => g.guide_id !== guideId));
      onToast("Removed from history view.");
    } else {
      const json = await res.json();
      onToast(json.error ?? "Delete failed.", "err");
    }
    setDeletingHist(null);
    setConfirmDelHist(null);
  };

  // ── Shared step reader (used for both pending review & history) ─
  const renderGuideReader = (
    guide: FullGuide,
    steps: Step[],
    onBack: () => void,
    badge?: React.ReactNode
  ) => (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink mb-5 transition-colors">
        <ArrowLeft size={13} /> Back
      </button>

      <div className="border border-border bg-background p-6 mb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              {guide.brand_id} · {guide.model_name}
            </p>
            <h2 className="font-black uppercase tracking-tighter text-lg">{guide.title}</h2>
          </div>
          {badge}
        </div>
        <p className="text-sm text-muted-foreground mb-4">{guide.summary}</p>
        {/* UPDATED 6.1: Thumbnail immediately after title */}
        <div className="mb-4 w-full overflow-hidden border border-border rounded" style={{ aspectRatio: "16/9" }}>
          <img
            src={guide.thumbnail_url ?? "/no-thumbnail.png"}
            alt={guide.title}
            className={`w-full h-full object-cover${!guide.thumbnail_url ? " opacity-70" : ""}`}
            loading="lazy"
            onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.errored) { img.dataset.errored = "1"; img.src = "/no-thumbnail.png"; } else { img.style.display = "none"; }
              }}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
          <span>Difficulty: <strong className="text-ink">{guide.difficulty}</strong></span>
          <span>Time: <strong className="text-ink">{guide.time_required}</strong></span>
          {guide.tools?.length > 0 && <span>Tools: <strong className="text-ink">{guide.tools.join(", ")}</strong></span>}
          {guide.required_parts?.length > 0 && <span>Parts: <strong className="text-ink">{guide.required_parts.join(", ")}</strong></span>}
        </div>
        <div className="border-t border-border pt-4">
          {/* UPDATED 4.3: label is now "Note" */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Note</p>
          <p className="text-sm leading-relaxed">{guide.introduction}</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {steps.length === 0 && <p className="text-xs text-muted-foreground italic px-1">No steps found.</p>}
        {steps.map((step) => (
          <div key={step.step_id} className="border border-border bg-background overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary border-b border-border">
              <span className="w-6 h-6 bg-ink text-white text-[10px] font-black flex items-center justify-center">{step.step_number}</span>
              <span className="text-xs font-bold">{step.title || `Step ${step.step_number}`}</span>
            </div>
            <div className="p-4">
              {/* UPDATED 5: Large clear images with correct aspect ratio for thorough admin review */}
              {step.images?.filter(Boolean).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  {step.images.filter(Boolean).map((url, i) => (
                    <div key={i} className="w-full overflow-hidden border border-border rounded" style={{ aspectRatio: "16/9" }}>
                      <img
                        src={url}
                        alt={`Step ${step.step_number} image ${i + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm leading-relaxed">{step.instructions}</p>
              {step.video_url && <VideoEmbed url={step.video_url} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── History full view ─────────────────────────────────────────
  if (historyView) {
    return renderGuideReader(historyView.guide, historyView.steps, () => setHistoryView(null));
  }

  // ── Pending full review view ──────────────────────────────────
  if (reviewGuide) {
    return (
      <div>
        {renderGuideReader(
          reviewGuide.guide,
          reviewGuide.steps,
          () => setReviewGuide(null),
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-yellow-200 bg-yellow-50 text-yellow-700 shrink-0">
            Pending Review
          </span>
        )}

        {rejectMode && (
          <div className="border border-red-200 bg-red-50 p-5 mb-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-red-700">Rejection Reason</p>
            <div className="flex flex-wrap gap-2">
              {REJECTION_REASONS.map((r) => (
                <button key={r} onClick={() => setRejectReason(r)}
                  className={`px-3 py-1.5 text-xs font-bold border transition-all ${rejectReason === r ? "bg-red-600 text-white border-red-600" : "bg-white border-red-200 text-red-700 hover:border-red-400"}`}
                >{r}</button>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-red-700 block">Additional Note (optional)</label>
              <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                rows={2} placeholder="Add a note to help the author improve..."
                className="w-full border border-red-200 bg-white px-3 py-2 text-xs focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {!rejectMode ? (
            <>
              <button onClick={() => handleAction("approve")} disabled={actioning}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50">
                {actioning ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={13} />} Approve
              </button>
              <button onClick={() => setRejectMode(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-red-300 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors">
                <XCircle size={13} /> Reject
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleAction("reject")} disabled={actioning || !rejectReason}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
                {actioning ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={13} />} Confirm Reject
              </button>
              <button onClick={() => setRejectMode(false)}
                className="px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors">Cancel</button>
            </>
          )}
          <button onClick={() => setReviewGuide(null)}
            className="px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors ml-auto">Decide Later</button>
        </div>
      </div>
    );
  }

  // ── Main tab shell ────────────────────────────────────────────
  return (
    <div>
      {/* Tab switcher */}
      <div className="flex items-center gap-0 mb-6 border-b border-border">
        {([["pending", "Pending Review", <Clock size={12} />], ["history", "History", <History size={12} />]] as const).map(([id, label, icon]) => (
          <button key={id} onClick={() => setAdminTab(id as AdminTab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              adminTab === id ? "border-primary text-ink" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {icon} {label}
            {id === "pending" && groups.length > 0 && (
              <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                {groups.reduce((s, g) => s + g.guides.length, 0)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PENDING TAB ─────────────────────────────────────────── */}
      {adminTab === "pending" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Guides</p>
              <h2 className="font-black uppercase tracking-tighter text-base mt-0.5">Pending Review</h2>
            </div>
            <button onClick={fetchPending} className="p-1.5 border border-border hover:bg-secondary transition-colors" title="Refresh">
              <RefreshCw size={13} className={`text-muted-foreground ${loadingPend ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingPend ? (
            <div className="flex items-center justify-center gap-2 py-14 text-xs text-muted-foreground">
              <RefreshCw size={13} className="animate-spin" /> Loading pending guides...
            </div>
          ) : groups.length === 0 ? (
            <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center py-20 gap-3">
              <BookOpen size={32} className="text-border" />
              <p className="text-sm font-bold text-muted-foreground">No guides pending review</p>
              <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
                Once users submit repair guides, they'll appear here grouped by author.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.user_id} className="border border-border bg-background overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/50 transition-colors text-left"
                    onClick={() => setExpandedUser(expandedUser === group.user_id ? null : group.user_id)}
                  >
                    <div className="w-7 h-7 bg-secondary border border-border flex items-center justify-center shrink-0">
                      <User size={13} className="text-muted-foreground" />
                    </div>
                    <span className="font-bold text-sm flex-1">{group.user_name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      {group.guides.length} guide{group.guides.length !== 1 ? "s" : ""} pending
                    </span>
                    <ChevronRight size={13} className={`text-muted-foreground transition-transform ${expandedUser === group.user_id ? "rotate-90" : ""}`} />
                  </button>

                  {expandedUser === group.user_id && (
                    <div className="border-t border-border bg-secondary/10 divide-y divide-border">
                      {group.guides.map((guide) => (
                        <div key={guide.guide_id} className="flex items-center gap-4 px-5 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate">{guide.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {guide.brand_id} {guide.model_name} · {guide.difficulty} ·{" "}
                              <span className="inline-flex items-center gap-0.5"><Clock size={9} /> {guide.time_required}</span>
                            </p>
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                            {new Date(guide.submitted_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                          </span>
                          <button onClick={() => openGuide(guide.guide_id)} disabled={reviewing}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-ink text-white hover:bg-ink/80 transition-colors disabled:opacity-50 shrink-0">
                            {reviewing ? <RefreshCw size={11} className="animate-spin" /> : "Review"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────── */}
      {adminTab === "history" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Guides</p>
              <h2 className="font-black uppercase tracking-tighter text-base mt-0.5">Review History</h2>
            </div>
            <button onClick={fetchHistory} className="p-1.5 border border-border hover:bg-secondary transition-colors" title="Refresh">
              <RefreshCw size={13} className={`text-muted-foreground ${loadingHist ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Spec 5.1: Search Bar */}
          <div className="mb-3">
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search by title, creator, brand, model, difficulty, time required, date..."
              className="w-full border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          {/* Spec 5.2: Filter Tabs */}
          <div className="flex items-center gap-2 mb-4">
            {(["all", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setHistoryStatusFilter(f)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                  historyStatusFilter === f
                    ? f === "approved" ? "bg-green-600 text-white border-green-600"
                    : f === "rejected" ? "bg-red-600 text-white border-red-600"
                    : "bg-primary text-white border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary"
                }`}
              >
                {f === "all" ? "All" : f === "approved" ? "Approved" : "Rejected"}
              </button>
            ))}
            {(historySearch || historyStatusFilter !== "all") && (
              <button
                onClick={() => { setHistorySearch(""); setHistoryStatusFilter("all"); }}
                className="ml-auto px-2 py-1.5 text-[10px] text-muted-foreground hover:text-ink border border-border hover:bg-secondary transition-colors flex items-center gap-1"
              >
                <X size={10} /> Clear
              </button>
            )}
          </div>

          {loadingHist ? (
            <div className="flex items-center justify-center gap-2 py-14 text-xs text-muted-foreground">
              <RefreshCw size={13} className="animate-spin" /> Loading history...
            </div>
          ) : (() => {
            const q = historySearch.trim().toLowerCase();
            const filtered = historyGuides.filter((g) => {
              if (historyStatusFilter !== "all" && g.status !== historyStatusFilter) return false;
              if (!q) return true;
              const dateStr = g.reviewed_at ? new Date(g.reviewed_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }).toLowerCase() : "";
              return (
                g.title.toLowerCase().includes(q) ||
                g.user_name.toLowerCase().includes(q) ||
                g.brand_id.toLowerCase().includes(q) ||
                g.model_name.toLowerCase().includes(q) ||
                g.difficulty.toLowerCase().includes(q) ||
                g.time_required.toLowerCase().includes(q) ||
                (g.required_parts ?? []).some((p) => p.toLowerCase().includes(q)) ||
                dateStr.includes(q)
              );
            });
            return filtered.length === 0 ? (
              <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center py-20 gap-3">
                <History size={32} className="text-border" />
                <p className="text-sm font-bold text-muted-foreground">{historyGuides.length === 0 ? "No reviewed guides yet" : "No results found"}</p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  {historyGuides.length === 0 ? "Approved and rejected guides will appear here." : "Try adjusting your search or filter."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((guide) => (
                  <div key={guide.guide_id} className="border border-border bg-background p-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                          guide.status === "approved" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"
                        }`}>
                          {guide.status === "approved" ? "Approved" : "Rejected"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {guide.reviewed_at ? new Date(guide.reviewed_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </span>
                      </div>
                      <p className="font-bold text-sm truncate">{guide.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        <span className="capitalize">{guide.brand_id}</span> · {guide.model_name} · by {guide.user_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {guide.difficulty} · {guide.time_required}
                      </p>
                      {guide.status === "rejected" && guide.rejection && (
                        <p className="text-[10px] text-red-500 mt-1">
                          Reason: {guide.rejection.reason}
                          {guide.rejection.note && ` — ${guide.rejection.note}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openGuide(guide.guide_id, true)} disabled={reviewing}
                      title="View guide"
                      className="p-1.5 hover:bg-secondary border border-border transition-colors disabled:opacity-50">
                      <Eye size={13} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => setConfirmDelHist(guide.guide_id)}
                      title="Remove from history (guide data kept)"
                      className="p-1.5 hover:bg-red-50 border border-border transition-colors">
                      <Trash2 size={13} className="text-red-500" />
                    </button>
                  </div>
                </div>
                ))}
              </div>
            );
          })()}

          {/* Confirm soft-delete overlay */}
          {confirmDelHist && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm px-4">
              <div className="bg-background border border-border p-6 max-w-sm w-full shadow-[6px_6px_0_0_var(--ink)]">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black uppercase tracking-tighter text-sm">Remove from History?</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      This removes the guide from your admin history view only.
                      The guide and all its data remain intact in the database.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setConfirmDelHist(null)}
                    className="px-4 py-2 text-xs font-bold border border-border hover:bg-secondary transition-colors">Cancel</button>
                  <button onClick={() => handleDeleteFromHistory(confirmDelHist)} disabled={!!deletingHist}
                    className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-1.5">
                    {deletingHist ? <><RefreshCw size={11} className="animate-spin" /> Removing...</> : "Yes, Remove"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
