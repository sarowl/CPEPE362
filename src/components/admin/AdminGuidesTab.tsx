"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, XCircle, ChevronRight, BookOpen,
  RefreshCw, Clock, User, ArrowLeft,
} from "lucide-react";

// Rejection reason options from spec
const REJECTION_REASONS = [
  "Incomplete",
  "Unreliable",
  "Unrealistic",
  "Too Simple",
  "Poor Photos",
  "Other",
];

interface PendingGuide {
  guide_id: string;
  title: string;
  summary: string;
  brand_id: string;
  model_name: string;
  difficulty: string;
  time_required: string;
  submitted_at: string;
  user_id: string;
}
interface UserGroup {
  user_id: string;
  user_name: string;
  guides: PendingGuide[];
}
interface FullGuide {
  guide_id: string; title: string; summary: string; introduction: string;
  difficulty: string; time_required: string; tools: string[];
  brand_id: string; model_name: string;
}
interface Step {
  step_id: string; step_number: number; title: string;
  instructions: string; images: string[];
}

export default function AdminGuidesTab({
  adminEmail,
  onToast,
}: {
  adminEmail: string;
  onToast: (msg: string, type?: "ok" | "err") => void;
}) {
  const [groups,      setGroups]      = useState<UserGroup[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expandedUser,setExpandedUser]= useState<string | null>(null);

  // Full guide review state
  const [reviewGuide, setReviewGuide] = useState<{ guide: FullGuide; steps: Step[] } | null>(null);
  const [reviewing,   setReviewing]   = useState(false);
  const [rejectMode,  setRejectMode]  = useState(false);
  const [rejectReason,setRejectReason]= useState("");
  const [rejectNote,  setRejectNote]  = useState("");
  const [actioning,   setActioning]   = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/guides-review", {
      headers: { "x-admin-email": adminEmail },
    });
    const json = await res.json();
    setGroups(json.groups ?? []);
    setLoading(false);
  }, [adminEmail]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // Load full guide for review
  const openGuide = async (guideId: string) => {
    setReviewing(true);
    setRejectMode(false);
    setRejectReason("");
    setRejectNote("");
    const res  = await fetch(`/api/guides/${guideId}`, {
      headers: { "x-admin-email": adminEmail },
    });
    const json = await res.json();
    setReviewGuide({ guide: json.guide, steps: json.steps ?? [] });
    setReviewing(false);
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (!reviewGuide) return;
    if (action === "reject" && !rejectReason) { onToast("Select a rejection reason.", "err"); return; }
    setActioning(true);
    const res = await fetch("/api/guides-review", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-email": adminEmail },
      body: JSON.stringify({
        guide_id: reviewGuide.guide.guide_id,
        action,
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

  // ── Full guide reader view ──────────────────────────────────
  if (reviewGuide) {
    const { guide, steps } = reviewGuide;
    return (
      <div>
        <button
          onClick={() => setReviewGuide(null)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink mb-5 transition-colors"
        >
          <ArrowLeft size={13} /> Back to pending list
        </button>

        <div className="border border-border bg-background p-6 mb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                {guide.brand_id} · {guide.model_name}
              </p>
              <h2 className="font-black uppercase tracking-tighter text-lg">{guide.title}</h2>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-yellow-200 bg-yellow-50 text-yellow-700 shrink-0">Pending</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{guide.summary}</p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
            <span>Difficulty: <strong className="text-ink">{guide.difficulty}</strong></span>
            <span>Time: <strong className="text-ink">{guide.time_required}</strong></span>
            {guide.tools?.length > 0 && <span>Tools: <strong className="text-ink">{guide.tools.join(", ")}</strong></span>}
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Introduction</p>
            <p className="text-sm leading-relaxed">{guide.introduction}</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step) => (
            <div key={step.step_id} className="border border-border bg-background overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary border-b border-border">
                <span className="w-6 h-6 bg-ink text-white text-[10px] font-black flex items-center justify-center">{step.step_number}</span>
                <span className="text-xs font-bold">{step.title || `Step ${step.step_number}`}</span>
              </div>
              <div className="p-4">
                {step.images?.filter(Boolean).length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {step.images.filter(Boolean).map((url, i) => (
                      <img key={i} src={url} alt="" className="h-20 w-32 object-cover border border-border" />
                    ))}
                  </div>
                )}
                <p className="text-sm leading-relaxed">{step.instructions}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reject form */}
        {rejectMode && (
          <div className="border border-red-200 bg-red-50 p-5 mb-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-red-700">Rejection Reason</p>
            <div className="flex flex-wrap gap-2">
              {REJECTION_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRejectReason(r)}
                  className={`px-3 py-1.5 text-xs font-bold border transition-all
                    ${rejectReason === r ? "bg-red-600 text-white border-red-600" : "bg-white border-red-200 text-red-700 hover:border-red-400"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-red-700 block">Additional Note (optional)</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={2}
                placeholder="Add a note to help the author improve their guide..."
                className="w-full border border-red-200 bg-white px-3 py-2 text-xs focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAction("approve")}
            disabled={actioning || rejectMode}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle size={13} /> Approve
          </button>

          {!rejectMode ? (
            <button
              onClick={() => setRejectMode(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 border border-red-300 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
            >
              <XCircle size={13} /> Reject
            </button>
          ) : (
            <>
              <button
                onClick={() => handleAction("reject")}
                disabled={actioning || !rejectReason}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actioning ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={13} />}
                Confirm Reject
              </button>
              <button
                onClick={() => setRejectMode(false)}
                className="px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          <button
            onClick={() => setReviewGuide(null)}
            className="px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors ml-auto"
          >
            Decide Later
          </button>
        </div>
      </div>
    );
  }

  // ── Pending list view ───────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Guides</p>
          <h2 className="font-black uppercase tracking-tighter text-base mt-0.5">Pending Review</h2>
        </div>
        <button onClick={fetchPending} className="p-1.5 border border-border hover:bg-secondary transition-colors" title="Refresh">
          <RefreshCw size={13} className={`text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-14 text-xs text-muted-foreground">
          <RefreshCw size={13} className="animate-spin" /> Loading pending guides...
        </div>
      ) : groups.length === 0 ? (
        <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center py-20 gap-3">
          <BookOpen size={32} className="text-border" />
          <p className="text-sm font-bold text-muted-foreground">No guides pending review</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
            Once users submit repair guides, they'll appear here grouped by author for your review.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.user_id} className="border border-border bg-background overflow-hidden">
              {/* User row */}
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
                <ChevronRight
                  size={13}
                  className={`text-muted-foreground transition-transform ${expandedUser === group.user_id ? "rotate-90" : ""}`}
                />
              </button>

              {/* Guide list for this user */}
              {expandedUser === group.user_id && (
                <div className="border-t border-border bg-secondary/10 divide-y divide-border">
                  {group.guides.map((guide) => (
                    <div key={guide.guide_id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate">{guide.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {guide.brand_id} {guide.model_name} · {guide.difficulty} ·{" "}
                          <span className="inline-flex items-center gap-0.5">
                            <Clock size={9} /> {guide.time_required}
                          </span>
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                        {new Date(guide.submitted_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </span>
                      <button
                        onClick={() => openGuide(guide.guide_id)}
                        disabled={reviewing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-ink text-white hover:bg-ink/80 transition-colors disabled:opacity-50 shrink-0"
                      >
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
  );
}