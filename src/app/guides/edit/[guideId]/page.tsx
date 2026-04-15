"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Upload, X,
  AlertCircle, CheckCircle, Clock, Wrench,
  ImageIcon, Video, RefreshCw, Save, ZoomIn, ZoomOut,
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

// SECTION 5.1: Thumbnail Cropper — 16:9 fixed aspect ratio
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
  const guideId = params?.guideId as string;

  const [wizardStep, setWizardStep] = useState<1|2|3>(1);
  const [loadingGuide, setLoadingGuide] = useState(true);
  const [blocked, setBlocked] = useState("");
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
  // SECTION 5.1: Thumbnail state
  const [existingThumbUrl, setExistingThumbUrl] = useState<string | null>(null);
  const [thumbnail,     setThumbnail]     = useState<File | null>(null);
  const [thumbPreview,  setThumbPreview]  = useState("");
  const [uploadingThumb,setUploadingThumb]= useState(false);
  const [cropSrc,       setCropSrc]       = useState<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const [steps,      setSteps]      = useState<StepDraft[]>([emptyStep(1)]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [saved,      setSaved]      = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement|null)[][]>([]);
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!guideId) return;
    fetch(`/api/guides/${guideId}`)
      .then((r) => r.json())
      .then((guideJson) => {
        if (guideJson.error) { setBlocked(guideJson.error); setLoadingGuide(false); return; }
        const g = guideJson.guide;
        if (g.status === "pending") { setBlocked("This guide is pending review and cannot be edited until reviewed."); setLoadingGuide(false); return; }
        setBrandId(g.brand_id ?? "");
        setModelId(g.model_id ?? "");
        setModelName(g.model_name ?? "");
        setTitle(g.title ?? "");
        setSummary(g.summary ?? "");
        setIntro(g.introduction ?? "");
        setDifficulty(g.difficulty ?? "");
        setTimeReq(g.time_required ?? "");
        setTools(g.tools ?? []);
        // SECTION 5.1: Load existing thumbnail
        if (g.thumbnail_url) {
          setExistingThumbUrl(g.thumbnail_url);
          setThumbPreview(g.thumbnail_url);
        }
        const rawSteps: any[] = guideJson.steps ?? [];
        setSteps(rawSteps.length > 0 ? rawSteps.map(stepFromDB) : [emptyStep(1)]);
        if (g.brand_id) {
          fetch(`/api/car-models/${g.brand_id}`)
            .then((r) => r.json())
            .then((j) => setModels(j.models ?? []));
        }
        setLoadingGuide(false);
      })
      .catch(() => { setBlocked("Failed to load guide."); setLoadingGuide(false); });
  }, [guideId]);

  if (loadingGuide) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col"><Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            <RefreshCw size={14} className="animate-spin" /> Loading guide...
          </div>
        </main>
      </div>
    );
  }

  if (blocked) {
    return (
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
  }

  const loadModels = (bid: string) => {
    if (!bid) { setModels([]); setModelId(""); setModelName(""); return; }
    setLoadingMods(true);
    fetch(`/api/car-models/${bid}`)
      .then((r) => r.json())
      .then((j) => { setModels(j.models ?? []); setLoadingMods(false); });
  };

  // SECTION 5.1: Thumbnail select → open cropper
  const handleThumbnailFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) setCropSrc(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleCropDone = (blob: Blob) => {
    setCropSrc(null);
    const croppedFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
    setThumbnail(croppedFile);
    setThumbPreview(URL.createObjectURL(croppedFile));
  };

  const uploadThumbnailForGuide = async () => {
    if (!thumbnail || !guideId) return;
    setUploadingThumb(true);
    try {
      const fd = new FormData();
      fd.append("file", thumbnail);
      fd.append("guide_id", guideId);
      fd.append("is_thumbnail", "true");
      const res  = await fetch("/api/guides-image-upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok) {
        // Update thumbnail_url in DB via PATCH
        await fetch(`/api/guides/${guideId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thumbnail_url: json.url }),
        });
        setExistingThumbUrl(json.url);
      }
    } catch {}
    setUploadingThumb(false);
  };

  const handleSaveIntro = async () => {
    setError("");
    if (!brandId || !modelId || !title.trim() || !summary.trim() || !difficulty || !timeReq.trim()) {
      setError("Please fill in all required fields before continuing."); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/guides/${guideId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brandId, model_id: modelId, model_name: modelName, title, summary, introduction: intro, difficulty, time_required: timeReq, tools }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save."); return; }
      // Upload new thumbnail if selected
      if (thumbnail) await uploadThumbnailForGuide();
      setWizardStep(2);
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  // SECTION 7: Pass step_number to route images to step_{N}/ subfolder
  const handleImageSelect = async (stepIdx: number, slotIdx: number, file: File) => {
    const preview = URL.createObjectURL(file);
    const slotKey = `${stepIdx}-${slotIdx}`;
    setUploadingSlots((prev) => ({ ...prev, [slotKey]: true }));
    setSteps((prev) => {
      const next = [...prev];
      next[stepIdx] = { ...next[stepIdx], imageFiles: [...next[stepIdx].imageFiles], imagePreviews: [...next[stepIdx].imagePreviews] };
      next[stepIdx].imageFiles[slotIdx] = file;
      next[stepIdx].imagePreviews[slotIdx] = preview;
      return next;
    });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("guide_id", guideId);
    fd.append("step_number", String(steps[stepIdx].step_number));
    const res  = await fetch("/api/guides-image-upload", { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) {
      setSteps((prev) => {
        const next = [...prev];
        next[stepIdx] = { ...next[stepIdx], images: [...next[stepIdx].images] };
        next[stepIdx].images[slotIdx] = json.url;
        return next;
      });
    } else { setError(json.error ?? "Image upload failed."); }
    setUploadingSlots((prev) => { const n = { ...prev }; delete n[slotKey]; return n; });
  };

  const removeImage = (si: number, sl: number) => {
    setSteps((prev) => {
      const next = [...prev];
      next[si] = { ...next[si], images:[...next[si].images], imageFiles:[...next[si].imageFiles], imagePreviews:[...next[si].imagePreviews] };
      next[si].images[sl]=""; next[si].imageFiles[sl]=null; next[si].imagePreviews[sl]="";
      return next;
    });
  };

  const addStep    = () => setSteps((p) => [...p, emptyStep(p.length + 1)]);
  const removeStep = (i: number) => setSteps((p) => p.filter((_,j)=>j!==i).map((s,j)=>({...s,step_number:j+1})));
  const updateStep = (i: number, f: keyof StepDraft, v: string) => setSteps((p) => { const n=[...p]; (n[i] as any)[f]=v; return n; });

  const handleSaveSteps = async () => {
    setError("");
    if (!steps.every((s) => s.instructions.trim())) { setError("Each step must have instructions."); return; }
    setSaving(true);
    try {
      const payload = steps.map((s) => ({ step_number: s.step_number, title: s.title, instructions: s.instructions, images: s.images.filter(Boolean), video_url: s.video_url || null }));
      const res = await fetch(`/api/guides/${guideId}/steps`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ steps: payload }) });
      if (!res.ok) { const j=await res.json(); setError(j.error ?? "Failed."); return; }
      setWizardStep(3);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    setSaving(true);
    const res = await fetch("/api/guides-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guide_id: guideId }) });
    if (res.ok) { setSaved(true); }
    else { const j = await res.json(); setError(j.error ?? "Submission failed."); }
    setSaving(false);
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col"><Navbar />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
            <h2 className="font-black uppercase tracking-tighter text-xl mb-2">Guide Submitted!</h2>
            <p className="text-sm text-muted-foreground mb-6">Your updated guide has been submitted for admin review.</p>
            <button onClick={() => router.push("/profile")} className="px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all">Back to Profile</button>
          </div>
        </main>
      </div>
    );
  }

  const thumbDisplaySrc = thumbPreview || existingThumbUrl || "/no-thumbnail.png";

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      {cropSrc && <ThumbnailCropper src={cropSrc} onCropped={handleCropDone} onCancel={() => setCropSrc(null)} />}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-8">

        <div className="mb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Edit Guide</p>
          <h1 className="font-black uppercase tracking-tighter text-2xl">Update Repair Guide</h1>
          <p className="text-xs text-muted-foreground mt-1">Editing an approved guide will require re-review before it is republished.</p>
        </div>

        {/* Wizard steps */}
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

        {/* STEP 1: Guide Info */}
        {wizardStep === 1 && (
          <div className="space-y-5">
            {/* Brand */}
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

            {/* Model */}
            {brandId && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Model *</label>
                {loadingMods ? (
                  <div className="text-xs text-muted-foreground animate-pulse">Loading models...</div>
                ) : (
                  <select value={modelId} onChange={(e) => { const m = models.find((x) => x.id === e.target.value); setModelId(e.target.value); setModelName(m?.name ?? ""); }}
                    className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary">
                    <option value="">Select a model...</option>
                    {models.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.years})</option>))}
                  </select>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. How to Replace Brake Pads"
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>

            {/* SECTION 5.1: Thumbnail upload/update */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2 flex items-center gap-1.5">
                <ImageIcon size={10} /> Thumbnail <span className="font-normal normal-case tracking-normal">(16:9, optional)</span>
              </label>
              <div className="flex items-start gap-4">
                <div className="relative border border-dashed border-border overflow-hidden bg-secondary/30"
                  style={{ width: 160, aspectRatio: "16/9" }}>
                  <img src={thumbDisplaySrc} alt="Thumbnail" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/no-thumbnail.png"; }} />
                  {(thumbPreview || existingThumbUrl) && (
                    <button onClick={() => { setThumbnail(null); setThumbPreview(""); setExistingThumbUrl(null); }}
                      className="absolute top-1 right-1 bg-ink/70 text-white p-0.5 rounded hover:bg-ink"><X size={10} /></button>
                  )}
                </div>
                <div className="space-y-2 mt-1">
                  <button onClick={() => thumbInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-border hover:bg-secondary transition-colors">
                    <Upload size={12} /> {existingThumbUrl ? "Replace thumbnail" : "Upload thumbnail"}
                  </button>
                  <p className="text-[10px] text-muted-foreground max-w-[160px] leading-relaxed">
                    Will be cropped to 16:9 ratio.
                  </p>
                  <input type="file" accept="image/*" className="hidden" ref={thumbInputRef}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnailFileSelect(f); e.target.value = ""; }} />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Summary *</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="Brief overview..."
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
            </div>

            {/* Note (renamed from Introduction) */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                Note <span className="font-normal text-muted-foreground normal-case tracking-normal">(optional)</span>
              </label>
              <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={4} placeholder="Detailed note, warnings, or background..."
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
            </div>

            {/* Difficulty */}
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

            {/* Time Required */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                <Clock size={10} className="inline mr-1" /> Time Required *
              </label>
              <input type="text" value={timeReq} onChange={(e) => setTimeReq(e.target.value)} placeholder="e.g. 1-2 hours"
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>

            {/* Tools */}
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

            <button onClick={handleSaveIntro} disabled={saving || uploadingThumb}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50">
              {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : <>Save & Continue <ChevronRight size={12} /></>}
            </button>
          </div>
        )}

        {/* STEP 2: Steps */}
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
                        const slotKey = `${si}-${sl}`;
                        const isUploading = !!uploadingSlots[slotKey];
                        return (
                          <div key={sl} className={`relative aspect-video border border-dashed flex items-center justify-center overflow-hidden ${isUploading ? "border-primary/60 bg-primary/5" : "border-border bg-secondary"}`}>
                            {isUploading ? (
                              <div className="flex flex-col items-center gap-1"><RefreshCw size={13} className="animate-spin text-primary" /><span className="text-[9px] text-primary">Uploading...</span></div>
                            ) : preview ? (
                              <>
                                <img src={preview} alt="" className="w-full h-full object-cover" loading="lazy"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => setWizardStep(1)} className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors"><ChevronLeft size={12} /> Back</button>
              <button onClick={handleSaveSteps} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50">
                {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : <>Save & Continue <ChevronRight size={12} /></>}
              </button>
            </div>
          </div>
        )}

        {/* SECTION 5.2: STEP 3: Full Review — all data clearly shown */}
        {wizardStep === 3 && (
          <div className="space-y-5">
            <div className="border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-green-700">Guide updated — review before submitting</p>
                <p className="text-xs text-green-600 mt-0.5">Check everything below. Submit for admin review to publish.</p>
              </div>
            </div>

            <div className="border border-border bg-background p-5 space-y-4">
              {/* Thumbnail first */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Thumbnail</p>
                <div className="w-full max-w-md overflow-hidden border border-border rounded" style={{ aspectRatio: "16/9" }}>
                  <img src={thumbDisplaySrc} alt="Thumbnail" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/no-thumbnail.png"; }} />
                </div>
              </div>

              {/* Title */}
              <h3 className="font-black uppercase tracking-tighter text-lg">{title}</h3>

              {/* Meta grid */}
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

              {/* Steps with images */}
              <div className="border-t border-border pt-4 space-y-3">
                {steps.map((s) => (
                  <div key={s.step_number} className="border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary border-b border-border">
                      <span className="w-6 h-6 bg-ink text-white text-[10px] font-black flex items-center justify-center">{s.step_number}</span>
                      {s.title && <p className="text-xs font-bold">{s.title}</p>}
                    </div>
                    <div className="p-4 space-y-2">
                      {/* Images — large and clear */}
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

            <div className="flex items-center gap-3">
              <button onClick={() => setWizardStep(2)} className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors"><ChevronLeft size={12} /> Back</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50 shadow-[3px_3px_0_0_rgba(0,0,0,0.15)]">
                {saving ? <><RefreshCw size={12} className="animate-spin" /> Submitting...</> : <><Save size={12} /> Submit for Review</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
