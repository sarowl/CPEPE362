"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Upload, X,
  AlertCircle, CheckCircle, Clock, Wrench, Package,
  ImageIcon, Video, RefreshCw, Save, ZoomIn, ZoomOut,
  FileEdit,
} from "lucide-react";

const BRANDS = [
  { name: "Toyota",     id: "toyota"     }, { name: "Mitsubishi", id: "mitsubishi" },
  { name: "BYD",        id: "byd"        }, { name: "Suzuki",     id: "suzuki"     },
  { name: "Isuzu",      id: "isuzu"      }, { name: "Ford",       id: "ford"       },
  { name: "Nissan",     id: "nissan"     }, { name: "Honda",      id: "honda"      },
  { name: "Hyundai",    id: "hyundai"    }, { name: "Kia",        id: "kia"        },
  { name: "Geely",      id: "geely"      }, { name: "MG",         id: "mg"         },
];

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
const THUMB_ASPECT = 16 / 9;

interface CarModel { id: string; name: string; category: string; years: string; }
interface StepDraft {
  step_number: number; title: string; instructions: string;
  images: string[]; imageFiles: (File|null)[]; imagePreviews: string[]; video_url: string;
}
function emptyStep(n: number): StepDraft {
  return { step_number: n, title: "", instructions: "", images: [], imageFiles: [null,null,null], imagePreviews: ["","",""], video_url: "" };
}
function stepFromDB(s: any): StepDraft {
  const imgs = s.images ?? [];
  return {
    step_number:   s.step_number,
    title:         s.title ?? "",
    instructions:  s.instructions ?? "",
    images:        [...imgs, "", "", ""].slice(0, 3),
    imageFiles:    [null, null, null],
    imagePreviews: [...imgs, "", "", ""].slice(0, 3),
    video_url:     s.video_url ?? "",
  };
}

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
        <iframe src={`https://www.youtube.com/embed/${ytId}`} title="Step video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
      </div>
    );
  }
  return null;
}

function ThumbnailCropper({ src, onCropped, onCancel }: { src: string; onCropped: (blob: Blob) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom]     = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const CROP_W = 480; const CROP_H = Math.round(CROP_W / THUMB_ASPECT);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, CROP_W, CROP_H);
    const scale = Math.max(CROP_W / img.naturalWidth, CROP_H / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * scale; const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (CROP_W - dw) / 2 + offset.x, (CROP_H - dh) / 2 + offset.y, dw, dh);
  }, [zoom, offset]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = src;
  }, [src]);
  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-4">
      <div className="bg-background border border-border p-5 w-full max-w-lg shadow-[6px_6px_0_0_var(--ink)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black uppercase tracking-tighter text-sm">Crop Thumbnail (16:9)</h3>
          <button onClick={onCancel} className="p-1 hover:bg-secondary rounded"><X size={14} /></button>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">Drag to pan · Use zoom slider to adjust</p>
        <div className="relative border border-border overflow-hidden cursor-move select-none"
          style={{ width: CROP_W, maxWidth: "100%", aspectRatio: `${CROP_W}/${CROP_H}` }}
          onMouseDown={(e) => { setDragging(true); dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }; }}
          onMouseMove={(e) => { if (!dragging) return; setOffset({ x: dragStart.current.ox + (e.clientX - dragStart.current.mx), y: dragStart.current.oy + (e.clientY - dragStart.current.my) }); }}
          onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}
        >
          <canvas ref={canvasRef} width={CROP_W} height={CROP_H} className="w-full h-full" />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="p-1.5 border border-border hover:bg-secondary rounded"><ZoomOut size={14} /></button>
          <input type="range" min={0.5} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="p-1.5 border border-border hover:bg-secondary rounded"><ZoomIn size={14} /></button>
          <span className="text-[10px] font-mono w-12 text-right">{(zoom * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-bold border border-border hover:bg-secondary">Cancel</button>
          <button onClick={() => { canvasRef.current?.toBlob((b) => { if (b) onCropped(b); }, "image/jpeg", 0.92); }} className="px-4 py-2 text-xs font-bold bg-ink text-white hover:bg-ink/80">Apply Crop</button>
        </div>
      </div>
    </div>
  );
}

export default function EditGuidePage() {
  const router  = useRouter();
  const params  = useParams();
  const searchParams = useSearchParams();
  const guideId = params?.guideId as string;
  const paramSource = searchParams.get("source") ?? "";
  const paramBrand  = searchParams.get("brand") ?? "";
  const paramModel  = searchParams.get("model") ?? "";

  const getRedirectTarget = () => {
    if (paramSource === "community") return "/community/guides";
    if (paramSource === "autohub" && paramBrand && paramModel) return `/guides/${paramBrand}/${paramModel}`;
    return "/profile?tab=contributions";
  };

  const [wizardStep, setWizardStep] = useState<1|2|3>(1);
  const [loadingGuide, setLoadingGuide] = useState(true);
  const [blocked, setBlocked] = useState("");

  // Spec 2.1: Snapshot originals for cancel-restore
  const [origGuideStatus, setOrigGuideStatus] = useState<string>("");
  const [origBrandId,    setOrigBrandId]    = useState("");
  const [origModelId,    setOrigModelId]    = useState("");
  const [origModelName,  setOrigModelName]  = useState("");
  const [origTitle,      setOrigTitle]      = useState("");
  const [origSummary,    setOrigSummary]    = useState("");
  const [origIntro,      setOrigIntro]      = useState("");
  const [origDifficulty, setOrigDifficulty] = useState("");
  const [origTimeReq,    setOrigTimeReq]    = useState("");
  const [origTools,      setOrigTools]      = useState<string[]>([]);
  const [origParts,      setOrigParts]      = useState<string[]>([]);
  const [origThumbUrl,   setOrigThumbUrl]   = useState<string | null>(null);
  const [origSteps,      setOrigSteps]      = useState<StepDraft[]>([]);

  // Working edit state
  const [brandId,    setBrandId]    = useState("");
  const [models,     setModels]     = useState<CarModel[]>([]);
  const [modelId,    setModelId]    = useState("");
  const [modelName,  setModelName]  = useState("");
  const [loadingMods,setLoadingMods]= useState(false);
  const [title,      setTitle]      = useState("");
  const [summary,    setSummary]    = useState("");
  const [intro,      setIntro]      = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [timeReq,    setTimeReq]    = useState("");
  const [toolInput,  setToolInput]  = useState("");
  const [tools,      setTools]      = useState<string[]>([]);
  const [partsInput, setPartsInput] = useState("");
  const [parts,      setParts]      = useState<string[]>([]);
  // Spec 4.1: Thumbnail pending — NOT uploaded to storage until confirmed
  const [existingThumbUrl, setExistingThumbUrl] = useState<string | null>(null);
  const [pendingThumb,     setPendingThumb]     = useState<File | null>(null);
  const [thumbPreview,     setThumbPreview]     = useState("");
  const [cropSrc,          setCropSrc]          = useState<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  // Spec 4.1: Step images pending — NOT uploaded until confirmed
  const [steps,      setSteps]      = useState<StepDraft[]>([emptyStep(1)]);
  const pendingStepFiles = useRef<Record<string, File>>({});
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [saved,      setSaved]      = useState(false);
  const [savedAction, setSavedAction] = useState<"submitted"|"draft"|null>(null);
  const [showTurnToDraftModal, setShowTurnToDraftModal] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement|null)[][]>([]);

  useEffect(() => {
    if (!guideId) return;
    fetch(`/api/guides/${guideId}`)
      .then((r) => r.json())
      .then((guideJson) => {
        if (guideJson.error) { setBlocked(guideJson.error); setLoadingGuide(false); return; }
        const g = guideJson.guide;
        if (g.status === "pending") { setBlocked("This guide is pending review and cannot be edited until reviewed."); setLoadingGuide(false); return; }
        // Save originals
        setOrigGuideStatus(g.status ?? "draft");
        setOrigBrandId(g.brand_id ?? ""); setOrigModelId(g.model_id ?? ""); setOrigModelName(g.model_name ?? "");
        setOrigTitle(g.title ?? ""); setOrigSummary(g.summary ?? ""); setOrigIntro(g.introduction ?? "");
        setOrigDifficulty(g.difficulty ?? ""); setOrigTimeReq(g.time_required ?? ""); setOrigTools(g.tools ?? []); setOrigParts(g.required_parts ?? []);
        setOrigThumbUrl(g.thumbnail_url ?? null);
        // Set working state
        setBrandId(g.brand_id ?? ""); setModelId(g.model_id ?? ""); setModelName(g.model_name ?? "");
        setTitle(g.title ?? ""); setSummary(g.summary ?? ""); setIntro(g.introduction ?? "");
        setDifficulty(g.difficulty ?? ""); setTimeReq(g.time_required ?? ""); setTools(g.tools ?? []); setParts(g.required_parts ?? []);
        if (g.thumbnail_url) { setExistingThumbUrl(g.thumbnail_url); setThumbPreview(g.thumbnail_url); }
        const rawSteps: any[] = guideJson.steps ?? [];
        const loadedSteps = rawSteps.length > 0 ? rawSteps.map(stepFromDB) : [emptyStep(1)];
        setSteps(loadedSteps);
        setOrigSteps(rawSteps.length > 0 ? rawSteps.map(stepFromDB) : [emptyStep(1)]);
        if (g.brand_id) {
          fetch(`/api/car-models/${g.brand_id}`).then((r) => r.json()).then((j) => setModels(j.models ?? []));
        }
        setLoadingGuide(false);
      })
      .catch(() => { setBlocked("Failed to load guide."); setLoadingGuide(false); });
  }, [guideId]);

  if (loadingGuide) return (
    <div className="min-h-screen bg-paper text-ink flex flex-col"><Navbar />
      <main className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <RefreshCw size={14} className="animate-spin" /> Loading guide...
        </div>
      </main>
    </div>
  );

  if (blocked) return (
    <div className="min-h-screen bg-paper text-ink flex flex-col"><Navbar />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm font-bold mb-4">{blocked}</p>
          <button onClick={() => router.back()} className="text-xs text-primary hover:underline">Go back</button>
        </div>
      </main>
    </div>
  );

  const loadModels = (bid: string) => {
    if (!bid) { setModels([]); setModelId(""); setModelName(""); return; }
    setLoadingMods(true);
    fetch(`/api/car-models/${bid}`).then((r) => r.json()).then((j) => { setModels(j.models ?? []); setLoadingMods(false); });
  };

  // Spec 2.1: Cancel Edit — restore originals, no DB/storage writes
  const handleCancelEdit = () => {
    setBrandId(origBrandId); setModelId(origModelId); setModelName(origModelName);
    setTitle(origTitle); setSummary(origSummary); setIntro(origIntro);
    setDifficulty(origDifficulty); setTimeReq(origTimeReq); setTools([...origTools]); setParts([...origParts]);
    setExistingThumbUrl(origThumbUrl); setThumbPreview(origThumbUrl ?? "");
    setPendingThumb(null); setCropSrc(null);
    setSteps(origSteps.map((s) => ({ ...s, images: [...s.images], imageFiles: [null,null,null], imagePreviews: [...s.imagePreviews] })));
    pendingStepFiles.current = {};
    setError("");
    router.push(getRedirectTarget());
  };

  const handleThumbnailFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) setCropSrc(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleCropDone = (blob: Blob) => {
    setCropSrc(null);
    const croppedFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
    setPendingThumb(croppedFile);
    setThumbPreview(URL.createObjectURL(croppedFile));
  };

  // Spec 4.4: Commit thumbnail to storage only on confirmed action
  const commitThumbnail = async (): Promise<void> => {
    if (!pendingThumb || !guideId) return;
    const fd = new FormData();
    fd.append("file", pendingThumb);
    fd.append("guide_id", guideId);
    fd.append("is_thumbnail", "true");
    const res  = await fetch("/api/guides-image-upload", { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) { setExistingThumbUrl(json.url); setThumbPreview(json.url); setPendingThumb(null); }
    else { throw new Error(json.error ?? "Thumbnail upload failed."); }
  };

  // Spec 4.4: Commit all pending step images to storage only on confirmed action
  const commitAllStepImages = async (): Promise<StepDraft[]> => {
    const updatedSteps = steps.map((s) => ({ ...s, images: [...s.images] }));
    for (let si = 0; si < steps.length; si++) {
      for (let sl = 0; sl < 3; sl++) {
        const key = `${si}-${sl}`;
        const file = pendingStepFiles.current[key];
        if (file) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("guide_id", guideId);
          fd.append("step_number", String(steps[si].step_number));
          const res  = await fetch("/api/guides-image-upload", { method: "POST", body: fd });
          const json = await res.json();
          if (res.ok) { updatedSteps[si].images[sl] = json.url; delete pendingStepFiles.current[key]; }
          else { throw new Error(json.error ?? "Image upload failed."); }
        }
      }
    }
    setSteps(updatedSteps);
    return updatedSteps;
  };

  // Step image: local preview only — NOT uploaded yet (Spec 4.1)
  const handleImageSelect = (stepIdx: number, slotIdx: number, file: File) => {
    pendingStepFiles.current[`${stepIdx}-${slotIdx}`] = file;
    const preview = URL.createObjectURL(file);
    setSteps((prev) => {
      const next = [...prev];
      next[stepIdx] = {
        ...next[stepIdx],
        imageFiles: next[stepIdx].imageFiles.map((f, i) => i === slotIdx ? file : f) as (File|null)[],
        imagePreviews: next[stepIdx].imagePreviews.map((p, i) => i === slotIdx ? preview : p),
      };
      return next;
    });
  };

  const removeImage = (si: number, sl: number) => {
    delete pendingStepFiles.current[`${si}-${sl}`];
    setSteps((prev) => {
      const next = [...prev];
      next[si] = {
        ...next[si],
        images: next[si].images.map((v, i) => i === sl ? "" : v),
        imageFiles: next[si].imageFiles.map((f, i) => i === sl ? null : f) as (File|null)[],
        imagePreviews: next[si].imagePreviews.map((p, i) => i === sl ? "" : p),
      };
      return next;
    });
  };

  const addStep    = () => setSteps((p) => [...p, emptyStep(p.length + 1)]);
  const removeStep = (i: number) => setSteps((p) => p.filter((_,j)=>j!==i).map((s,j)=>({...s,step_number:j+1})));
  const updateStep = (i: number, f: keyof StepDraft, v: string) => setSteps((p) => { const n=[...p]; (n[i] as any)[f]=v; return n; });

  // Validate step 1 → move to step 2 (no DB writes)
  const handleNextToSteps = () => {
    setError("");
    if (!brandId || !modelId || !title.trim() || !summary.trim() || !difficulty || !timeReq.trim()) {
      setError("Please fill in all required fields before continuing."); return;
    }
    setWizardStep(2);
  };

  // Validate step 2 → move to review (no DB writes)
  const handleNextToReview = () => {
    setError("");
    if (!steps.every((s) => s.instructions.trim())) { setError("Each step must have instructions."); return; }
    setWizardStep(3);
  };

  // Shared commit logic
  const doCommit = async (statusOverride?: string) => {
    await commitThumbnail();
    const committedSteps = await commitAllStepImages();
    const body: any = { brand_id: brandId, model_id: modelId, model_name: modelName, title, summary, introduction: intro, difficulty, time_required: timeReq, tools, required_parts: parts };
    if (statusOverride) body.status = statusOverride;
    const res = await fetch(`/api/guides/${guideId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed to save guide."); }
    const stepsPayload = committedSteps.map((s) => ({ step_number: s.step_number, title: s.title, instructions: s.instructions, images: s.images.filter(Boolean), video_url: s.video_url || null }));
    const sRes = await fetch(`/api/guides/${guideId}/steps`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ steps: stepsPayload }) });
    if (!sRes.ok) { const j = await sRes.json(); throw new Error(j.error ?? "Failed to save steps."); }
    // Spec 6: Enforce storage structure and clean up stale/invalid files
    await fetch("/api/guides-storage-cleanup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guide_id: guideId }) });
  };

  // Spec 2.2: Turn to Draft — show modal with Leave Edit / Continue Editing
  const handleTurnToDraft = () => {
    setShowTurnToDraftModal(true);
  };

  const handleTurnToDraftConfirm = async () => {
    setShowTurnToDraftModal(false);
    setError(""); setSaving(true);
    try { await doCommit("draft"); setSavedAction("draft"); setSaved(true); }
    catch (e: any) { setError(e.message ?? "Error saving."); }
    finally { setSaving(false); }
  };

  const handleTurnToDraftContinue = () => {
    setShowTurnToDraftModal(false);
  };

  // Spec 3.2: Save Draft — save all, keep current status (draft)
  const handleSaveDraft = async () => {
    setError(""); setSaving(true);
    try { await doCommit(); setSavedAction("draft"); setSaved(true); }
    catch (e: any) { setError(e.message ?? "Error saving."); }
    finally { setSaving(false); }
  };

  // Spec 4.4: Submit for Review — save all + submit
  const handleSubmit = async () => {
    setError(""); setSaving(true);
    try {
      await doCommit();
      const subRes = await fetch("/api/guides-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guide_id: guideId }) });
      if (subRes.ok) { setSavedAction("submitted"); setSaved(true); }
      else { const j = await subRes.json(); setError(j.error ?? "Submission failed."); }
    } catch (e: any) { setError(e.message ?? "Error submitting."); }
    finally { setSaving(false); }
  };

  if (saved) return (
    <div className="min-h-screen bg-paper text-ink flex flex-col"><Navbar />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
          {savedAction === "submitted" ? (
            <><h2 className="font-black uppercase tracking-tighter text-xl mb-2">Guide Submitted!</h2>
            <p className="text-sm text-muted-foreground mb-6">Your updated guide has been submitted for admin review.</p></>
          ) : (
            <><h2 className="font-black uppercase tracking-tighter text-xl mb-2">Saved as Draft</h2>
            <p className="text-sm text-muted-foreground mb-6">Your changes have been saved. You can continue editing or submit later.</p></>
          )}
          <button onClick={() => router.push(getRedirectTarget())} className="px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all">Back to Contributions</button>
        </div>
      </main>
    </div>
  );

  const thumbDisplaySrc = thumbPreview || existingThumbUrl || "/no-thumbnail.png";
  const isDraft = origGuideStatus === "draft";
  const isApprovedOrRejected = origGuideStatus === "approved" || origGuideStatus === "rejected";

  const CancelBtn = () => (
    <button onClick={handleCancelEdit} className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-xs font-bold hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors">
      <X size={12} /> Cancel Edit
    </button>
  );

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      {cropSrc && <ThumbnailCropper src={cropSrc} onCropped={handleCropDone} onCancel={() => setCropSrc(null)} />}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-8">

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Edit Guide</p>
            <h1 className="font-black uppercase tracking-tighter text-2xl">Update Repair Guide</h1>
            {isApprovedOrRejected && <p className="text-xs text-muted-foreground mt-1">Editing an {origGuideStatus === "rejected" ? "returned" : origGuideStatus} guide. Use <strong>Turn to Draft</strong> to save changes — guide will require re-review.</p>}
            {isDraft && <p className="text-xs text-muted-foreground mt-1">Editing a draft. Use <strong>Save Draft</strong> to keep changes or <strong>Submit for Review</strong> to publish.</p>}
          </div>
          {/* Turn to Draft — available immediately under Step 1: Info section */}
          <button
            onClick={handleTurnToDraft}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 border border-border text-xs font-bold hover:bg-secondary transition-colors disabled:opacity-60 shrink-0 mt-1"
            title="Save as draft"
          >
            {saving ? <RefreshCw size={11} className="animate-spin" /> : null}
            Turn to Draft
          </button>
        </div>

        {/* Wizard indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1,2,3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 flex items-center justify-center text-xs font-black border ${wizardStep === s ? "bg-primary text-white border-primary" : wizardStep > s ? "bg-green-500 text-white border-green-500" : "bg-background border-border text-muted-foreground"}`}>
                {wizardStep > s ? <CheckCircle size={12} /> : s}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${wizardStep === s ? "text-ink" : "text-muted-foreground"}`}>
                {s === 1 ? "Info" : s === 2 ? "Steps" : "Review"}
              </span>
              {s < 3 && <ChevronRight size={12} className="text-border" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 mb-5 bg-red-50 border border-red-200 text-xs text-red-600">
            <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* ── WIZARD STEP 1: Info ── */}
        {wizardStep === 1 && (
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Brand *</label>
              <div className="grid grid-cols-4 gap-2">
                {BRANDS.map((b) => (
                  <button key={b.id} onClick={() => { setBrandId(b.id); setModelId(""); setModelName(""); loadModels(b.id); }}
                    className={`px-3 py-2 text-xs font-bold border transition-all ${brandId === b.id ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary"}`}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {brandId && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Model *</label>
                {loadingMods ? <div className="text-xs text-muted-foreground animate-pulse">Loading models...</div> : (
                  <select value={modelId} onChange={(e) => { const m = models.find((x) => x.id === e.target.value); setModelId(e.target.value); setModelName(m?.name ?? ""); }}
                    className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary">
                    <option value="">Select a model...</option>
                    {models.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.years})</option>))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. How to Replace Brake Pads"
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>

            {/* Thumbnail — local preview until confirmed */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2 flex items-center gap-1.5">
                <ImageIcon size={10} /> Thumbnail <span className="font-normal normal-case tracking-normal">(16:9, optional)</span>
              </label>
              <div className="flex items-start gap-4">
                <div className="relative border border-dashed border-border overflow-hidden bg-secondary/30" style={{ width: 160, aspectRatio: "16/9" }}>
                  <img src={thumbDisplaySrc} alt="Thumbnail" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/no-thumbnail.png"; }} />
                  {(thumbPreview || existingThumbUrl) && (
                    <button onClick={() => { setPendingThumb(null); setThumbPreview(""); setExistingThumbUrl(null); }}
                      className="absolute top-1 right-1 bg-ink/70 text-white p-0.5 rounded hover:bg-ink"><X size={10} /></button>
                  )}
                  {pendingThumb && <div className="absolute bottom-0 left-0 right-0 bg-yellow-500/80 text-white text-[8px] font-bold text-center py-0.5">Pending upload</div>}
                </div>
                <div className="space-y-2 mt-1">
                  <button onClick={() => thumbInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-border hover:bg-secondary transition-colors">
                    <Upload size={12} /> {existingThumbUrl ? "Replace thumbnail" : "Upload thumbnail"}
                  </button>
                  <p className="text-[10px] text-muted-foreground max-w-[160px] leading-relaxed">Cropped to 16:9. Uploaded only when you save/submit.</p>
                  <input type="file" accept="image/*" className="hidden" ref={thumbInputRef}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnailFileSelect(f); e.target.value = ""; }} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Summary *</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="Brief overview..."
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                Note <span className="font-normal text-muted-foreground normal-case tracking-normal">(optional)</span>
              </label>
              <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={4} placeholder="Detailed note, warnings, or background..."
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Difficulty *</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`px-3 py-1.5 text-xs font-bold border transition-all ${difficulty === d ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                <Clock size={10} className="inline mr-1" /> Time Required *
              </label>
              <input type="text" value={timeReq} onChange={(e) => setTimeReq(e.target.value)} placeholder="e.g. 1-2 hours"
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                <Package size={10} className="inline mr-1" /> Required Parts
              </label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={partsInput} onChange={(e) => setPartsInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && partsInput.trim()) { setParts((p)=>[...p,partsInput.trim()]); setPartsInput(""); e.preventDefault(); }}}
                  placeholder="Add a part, press Enter"
                  className="flex-1 border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <button onClick={() => { if (partsInput.trim()) { setParts((p)=>[...p,partsInput.trim()]); setPartsInput(""); }}}
                  className="px-3 py-2 bg-secondary border border-border text-xs font-bold hover:bg-border transition-colors"><Plus size={12} /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {parts.map((p, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-2 py-1 bg-secondary border border-border text-xs">
                    {p}<button onClick={() => setParts((prev)=>prev.filter((_,j)=>j!==i))} className="text-muted-foreground hover:text-ink"><X size={10} /></button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                <Wrench size={10} className="inline mr-1" /> Tools Needed
              </label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={toolInput} onChange={(e) => setToolInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && toolInput.trim()) { setTools((p)=>[...p,toolInput.trim()]); setToolInput(""); e.preventDefault(); }}}
                  placeholder="Add a tool, press Enter"
                  className="flex-1 border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <button onClick={() => { if (toolInput.trim()) { setTools((p)=>[...p,toolInput.trim()]); setToolInput(""); }}}
                  className="px-3 py-2 bg-secondary border border-border text-xs font-bold hover:bg-border transition-colors"><Plus size={12} /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tools.map((t, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-2 py-1 bg-secondary border border-border text-xs">
                    {t}<button onClick={() => setTools((p)=>p.filter((_,j)=>j!==i))} className="text-muted-foreground hover:text-ink"><X size={10} /></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <CancelBtn />
              <button onClick={handleNextToSteps}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all">
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* ── WIZARD STEP 2: Steps ── */}
        {wizardStep === 2 && (
          <div className="space-y-4">
            {steps.map((step, si) => (
              <div key={si} className="border border-border bg-background overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary border-b border-border">
                  <span className="w-6 h-6 bg-ink text-white text-[10px] font-black flex items-center justify-center">{step.step_number}</span>
                  <input type="text" value={step.title} onChange={(e) => updateStep(si, "title", e.target.value)}
                    placeholder={`Step ${step.step_number} title`}
                    className="flex-1 bg-transparent text-xs font-bold focus:outline-none placeholder:text-muted-foreground" />
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(si)} className="text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                      <ImageIcon size={10} /> Images (up to 3)
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[0,1,2].map((sl) => {
                        const preview = step.imagePreviews[sl] || step.images[sl];
                        const isPending = !!pendingStepFiles.current[`${si}-${sl}`];
                        return (
                          <div key={sl} className={`relative aspect-video border border-dashed flex items-center justify-center overflow-hidden ${isPending ? "border-yellow-400 bg-yellow-50/50" : "border-border bg-secondary"}`}>
                            {preview ? (
                              <>
                                <img src={preview} alt="" className="w-full h-full object-cover" loading="lazy"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                {isPending && <div className="absolute bottom-0 left-0 right-0 bg-yellow-500/80 text-white text-[8px] font-bold text-center py-0.5">Pending</div>}
                                <button onClick={() => removeImage(si, sl)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white flex items-center justify-center rounded-full"><X size={8} /></button>
                              </>
                            ) : (
                              <button onClick={() => fileInputRefs.current[si]?.[sl]?.click()}
                                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-ink transition-colors">
                                <Upload size={14} /><span className="text-[9px]">Add</span>
                              </button>
                            )}
                            <input type="file" accept="image/*" className="hidden"
                              ref={(el) => { if (!fileInputRefs.current[si]) fileInputRefs.current[si] = []; fileInputRefs.current[si][sl] = el; }}
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(si, sl, f); e.target.value = ""; }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Instructions *</label>
                    <textarea value={step.instructions} onChange={(e) => updateStep(si, "instructions", e.target.value)}
                      rows={3} placeholder="Describe what to do in this step..."
                      className="w-full border border-border bg-background px-3 py-2 text-xs focus:outline-none resize-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1 flex items-center gap-1"><Video size={10} /> Video URL (optional)</label>
                    <input type="url" value={step.video_url} onChange={(e) => updateStep(si, "video_url", e.target.value)}
                      placeholder="https://youtube.com/..." className="w-full border border-border bg-background px-3 py-2 text-xs focus:outline-none" />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addStep} className="w-full border border-dashed border-border py-2.5 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5">
              <Plus size={12} /> Add Step
            </button>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <CancelBtn />
              <button onClick={() => setWizardStep(1)} className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors"><ChevronLeft size={12} /> Back</button>
              <button onClick={handleNextToReview} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all">
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* ── WIZARD STEP 3: Review + Confirm Action ── */}
        {wizardStep === 3 && (
          <div className="space-y-5">
            <div className="border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
              <CheckCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-700">Review your changes</p>
                <p className="text-xs text-blue-600 mt-0.5">Nothing has been saved yet. Choose an action below to confirm.</p>
              </div>
            </div>

            <div className="border border-border bg-background p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Thumbnail</p>
                <div className="w-full max-w-md overflow-hidden border border-border rounded" style={{ aspectRatio: "16/9" }}>
                  <img src={thumbDisplaySrc} alt="Thumbnail" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/no-thumbnail.png"; }} />
                </div>
                {pendingThumb && <p className="text-[10px] text-yellow-600 mt-1">⚠ New thumbnail — will be uploaded on confirm</p>}
              </div>
              <h3 className="font-black uppercase tracking-tighter text-lg">{title}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[{l:"Brand",v:brandId},{l:"Model",v:modelName},{l:"Difficulty",v:difficulty},{l:"Time",v:timeReq},{l:"Steps",v:String(steps.length)}].map(r=>(
                  <div key={r.l} className="bg-secondary px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{r.l}</p>
                    <p className="font-bold mt-0.5 capitalize truncate">{r.v}</p>
                  </div>
                ))}
              </div>
              <div className="text-sm"><span className="font-bold">Summary:</span> {summary}</div>
              {intro && <div className="text-sm"><span className="font-bold">Note:</span> {intro}</div>}
              {tools.length > 0 && <div className="text-sm"><span className="font-bold">Tools:</span> {tools.join(", ")}</div>}
              {parts.length > 0 && <div className="text-sm"><span className="font-bold">Required Parts:</span> {parts.join(", ")}</div>}
              <div className="border-t border-border pt-4 space-y-3">
                {steps.map((s) => (
                  <div key={s.step_number} className="border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary border-b border-border">
                      <span className="w-6 h-6 bg-ink text-white text-[10px] font-black flex items-center justify-center">{s.step_number}</span>
                      {s.title && <p className="text-xs font-bold">{s.title}</p>}
                    </div>
                    <div className="p-4 space-y-2">
                      {(s.imagePreviews.some(Boolean) || s.images.some(Boolean)) && (
                        <div className="grid grid-cols-3 gap-2">
                          {[0,1,2].map((i) => {
                            const src = s.imagePreviews[i] || s.images[i];
                            return src ? (
                              <div key={i} className="w-full overflow-hidden border border-border rounded" style={{ aspectRatio: "16/9" }}>
                                <img src={src} alt={`Step ${s.step_number} img ${i+1}`} className="w-full h-full object-cover" loading="lazy"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{s.instructions}</p>
                      {s.video_url && <VideoEmbed url={s.video_url} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons — based on guide status */}
            <div className="flex items-center gap-3 flex-wrap">
              <CancelBtn />
              <button onClick={() => setWizardStep(2)} className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors">
                <ChevronLeft size={12} /> Back
              </button>
              {/* Spec 3.2: Draft — Save Draft button */}
              {isDraft && (
                <button onClick={handleSaveDraft} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-secondary border border-border text-xs font-bold hover:bg-border transition-all disabled:opacity-50">
                  {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : <><Save size={12} /> Save Draft</>}
                </button>
              )}
              {/* Spec 2.2: Approved/Rejected — Turn to Draft */}
              {isApprovedOrRejected && (
                <button onClick={handleTurnToDraft} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50">
                  {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : <><FileEdit size={12} /> Turn to Draft</>}
                </button>
              )}
              {/* Submit for Review — available for all */}
              <button onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50 shadow-[3px_3px_0_0_rgba(0,0,0,0.15)]">
                {saving ? <><RefreshCw size={12} className="animate-spin" /> Submitting...</> : <><Save size={12} /> Submit for Review</>}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Turn to Draft Modal ── */}
      {showTurnToDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-background border border-border shadow-[6px_6px_0_0_var(--ink)] p-6">
            <h3 className="font-black uppercase tracking-tighter text-base mb-2">Turn to Draft</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Your guide will be saved as a draft and will require re-review before publishing. What would you like to do?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleTurnToDraftConfirm}
                disabled={saving}
                className="w-full px-4 py-2.5 bg-ink text-white text-xs font-bold hover:bg-ink/80 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : "Leave Edit"}
              </button>
              <button
                onClick={handleTurnToDraftContinue}
                className="w-full px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
