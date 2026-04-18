"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Upload, X,
  AlertCircle, CheckCircle, Clock, Wrench, BookOpen, Package,
  ImageIcon, Video, RefreshCw, Send, ZoomIn, ZoomOut, Move,
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

function ThumbnailCropper({
  src, onCropped, onCancel,
}: { src: string; onCropped: (blob: Blob) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom]     = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

  const CROP_W = 480;
  const CROP_H = Math.round(CROP_W / THUMB_ASPECT); // 270

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CROP_W, CROP_H);
    const scale = Math.max(CROP_W / img.naturalWidth, CROP_H / img.naturalHeight) * zoom;
    const dw = img.naturalWidth  * scale;
    const dh = img.naturalHeight * scale;
    const dx = (CROP_W - dw) / 2 + offset.x;
    const dy = (CROP_H - dh) / 2 + offset.y;
    ctx.drawImage(img, dx, dy, dw, dh);
  }, [zoom, offset]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = src;
  }, [src]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my),
    });
  };
  const onMouseUp = () => setDragging(false);

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => { if (blob) onCropped(blob); }, "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-4">
      <div className="bg-background border border-border p-5 w-full max-w-lg shadow-[6px_6px_0_0_var(--ink)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black uppercase tracking-tighter text-sm">Crop Thumbnail (16:9)</h3>
          <button onClick={onCancel} className="p-1 hover:bg-secondary rounded"><X size={14} /></button>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">Drag to pan · Use zoom buttons to adjust</p>
        {/* Canvas crop area */}
        <div className="relative border border-border overflow-hidden cursor-move select-none"
          style={{ width: CROP_W, maxWidth: "100%", aspectRatio: `${CROP_W}/${CROP_H}` }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        >
          <canvas ref={canvasRef} width={CROP_W} height={CROP_H} className="w-full h-full" />
        </div>
        {/* Zoom controls */}
        <div className="flex items-center gap-3 mt-3">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="p-1.5 border border-border hover:bg-secondary rounded"><ZoomOut size={14} /></button>
          <input type="range" min={0.5} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="p-1.5 border border-border hover:bg-secondary rounded"><ZoomIn size={14} /></button>
          <span className="text-[10px] font-mono w-12 text-right">{(zoom * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-bold border border-border hover:bg-secondary">Cancel</button>
          <button onClick={handleCrop} className="px-4 py-2 text-xs font-bold bg-ink text-white hover:bg-ink/80">Apply Crop</button>
        </div>
      </div>
    </div>
  );
}

// ── Inner form component ─────────────────────────────────────────
function CreateGuideForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [wizardStep, setWizardStep] = useState<1|2|3>(1);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?redirect=/guides/create");
      } else {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [router]);

  const paramBrand = searchParams.get("brand") ?? "";
  const paramModel = searchParams.get("model") ?? "";

  const [brandId,    setBrandId]    = useState(paramBrand);
  const [models,     setModels]     = useState<CarModel[]>([]);
  const [modelId,    setModelId]    = useState(paramModel);
  const [modelName,  setModelName]  = useState("");
  const [loadingMods,setLoadingMods]= useState(false);
  const [title,      setTitle]      = useState("");
  const [summary,    setSummary]    = useState("");
  const [note,       setNote]       = useState(""); 
  const [difficulty, setDifficulty] = useState("");
  const [timeReq,    setTimeReq]    = useState("");
  const [toolInput,  setToolInput]  = useState("");
  const [tools,      setTools]      = useState<string[]>([]);
  const [partsInput, setPartsInput] = useState("");
  const [parts,      setParts]      = useState<string[]>([]);
  const [thumbnail,  setThumbnail]  = useState<File|null>(null);
  const [thumbPreview,setThumbPreview] = useState("");
  const [thumbUrl,   setThumbUrl]   = useState("");
  const [uploadingThumb,setUploadingThumb] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement|null>(null);
  const [cropSrc,    setCropSrc]    = useState<string | null>(null);
  const [steps,      setSteps]      = useState<StepDraft[]>([emptyStep(1)]);
  const [guideId,    setGuideId]    = useState<string|null>(null);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [submitted,  setSubmitted]  = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement|null)[][]>([]);
  const [uploadingSlots, setUploadingSlots] = useState<Record<string,boolean>>({});
  const [showTurnToDraftModal, setShowTurnToDraftModal] = useState(false);

  useEffect(() => {
    if (!authChecked) return;
    const brand = searchParams.get("brand") ?? "";
    const model = searchParams.get("model") ?? "";
    if (!brand) return;
    setBrandId(brand);
    setLoadingMods(true);
    fetch(`/api/car-models/${brand}`)
      .then((r) => r.json())
      .then((j) => {
        const list: CarModel[] = j.models ?? [];
        setModels(list);
        if (model) {
          const found = list.find((m) => m.id === model);
          if (found) { setModelId(found.id); setModelName(found.name); }
        }
        setLoadingMods(false);
      })
      .catch(() => setLoadingMods(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw size={14} className="animate-spin" /> Checking authentication...
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
      .then((j) => {
        const list: CarModel[] = j.models ?? [];
        setModels(list);
        if (paramModel) {
          const found = list.find((m) => m.id === paramModel);
          if (found) { setModelId(found.id); setModelName(found.name); }
        }
        setLoadingMods(false);
      });
  };

  // UPDATED 4.2: File selected → open cropper for 16:9 enforcement
  const handleThumbnailFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) setCropSrc(e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  // After cropping: set the cropped blob as the thumbnail
  const handleCropDone = (blob: Blob) => {
    setCropSrc(null);
    const croppedFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
    const preview = URL.createObjectURL(croppedFile);
    setThumbnail(croppedFile);
    setThumbPreview(preview);
  };

  const uploadThumbnailForGuide = async (gId: string) => {
    if (!thumbnail) return;
    setUploadingThumb(true);
    try {
      const fd = new FormData();
      fd.append("file", thumbnail);
      fd.append("guide_id", gId);
      fd.append("is_thumbnail", "true"); // UPDATED 8: new storage path
      const res  = await fetch("/api/guides-image-upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok) setThumbUrl(json.url);
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
      const method = guideId ? "PATCH" : "POST";
      const url    = guideId ? `/api/guides/${guideId}` : "/api/guides";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brandId, model_id: modelId, model_name: modelName, title, summary, introduction: note, difficulty, time_required: timeReq, tools, required_parts: parts }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save."); return; }
      const newGuideId = json.guide.guide_id ?? guideId;
      setGuideId(newGuideId);
      if (thumbnail && newGuideId) await uploadThumbnailForGuide(newGuideId);
      setWizardStep(2);
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  // UPDATED 8: Pass step_number to image upload
  const handleImageSelect = async (stepIdx: number, slotIdx: number, file: File) => {
    if (!guideId) return;
    const slotKey = `${stepIdx}-${slotIdx}`;
    const preview = URL.createObjectURL(file);
    setUploadingSlots((prev) => ({ ...prev, [slotKey]: true }));
    setSteps((prev) => {
      const next = [...prev];
      next[stepIdx] = { ...next[stepIdx], imageFiles: [...next[stepIdx].imageFiles], imagePreviews: [...next[stepIdx].imagePreviews] };
      next[stepIdx].imageFiles[slotIdx]    = file;
      next[stepIdx].imagePreviews[slotIdx] = preview;
      return next;
    });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("guide_id", guideId);
    fd.append("step_number", String(steps[stepIdx].step_number)); // UPDATED 8
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
    setUploadingSlots((prev) => { const n={...prev}; delete n[slotKey]; return n; });
  };

  const removeImage = (si: number, sl: number) => {
    setSteps((prev) => {
      const next = [...prev];
      next[si] = { ...next[si], images:[...next[si].images], imageFiles:[...next[si].imageFiles], imagePreviews:[...next[si].imagePreviews] };
      next[si].images[sl]=""; next[si].imageFiles[sl]=null; next[si].imagePreviews[sl]="";
      return next;
    });
  };

  const addStep    = () => setSteps((p) => [...p, emptyStep(p.length+1)]);
  const removeStep = (i: number) => setSteps((p) => p.filter((_,j)=>j!==i).map((s,j)=>({...s,step_number:j+1})));
  const updateStep = (i: number, f: keyof StepDraft, v: string) => setSteps((p) => { const n=[...p]; (n[i] as any)[f]=v; return n; });

  const handleSaveSteps = async () => {
    setError("");
    if (!steps.every((s) => s.instructions.trim())) { setError("Each step must have instructions."); return; }
    if (!guideId) { setError("Guide not saved yet."); return; }
    setSaving(true);
    try {
      const payload = steps.map((s) => ({ step_number:s.step_number, title:s.title, instructions:s.instructions, images:s.images.filter(Boolean), video_url:s.video_url||null }));
      const res = await fetch(`/api/guides/${guideId}/steps`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({steps:payload}) });
      if (!res.ok) { const j=await res.json(); setError(j.error??"Failed."); return; }
      setWizardStep(3);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  const handleCancelCreation = async () => {
    // If guide was partially created, delete it from DB and storage
    if (guideId) {
      await fetch(`/api/guides/${guideId}`, { method: "DELETE" }).catch(() => {});
    }
    router.push("/profile?tab=contributions");
  };

  const handleTurnToDraft = () => {
    setShowTurnToDraftModal(true);
  };

  const handleTurnToDraftLeave = async () => {
    setShowTurnToDraftModal(false);
    if (!guideId) {
      router.push("/profile?tab=contributions");
      return;
    }
    // Save current step data if on step 2
    if (wizardStep === 2 && steps.every((s) => s.instructions.trim())) {
      setSaving(true);
      try {
        const payload = steps.map((s) => ({ step_number: s.step_number, title: s.title, instructions: s.instructions, images: s.images.filter(Boolean), video_url: s.video_url || null }));
        await fetch(`/api/guides/${guideId}/steps`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ steps: payload }) });
      } catch {} finally { setSaving(false); }
    }
    router.push("/profile?tab=contributions");
  };

  const handleTurnToDraftContinue = () => {
    setShowTurnToDraftModal(false);
    // Stay on current page — user continues editing
  };

  const handleSubmit = async () => {
    if (!guideId) return;
    setError(""); setSubmitting(true);
    try {
      // Spec 6: Enforce storage structure before submitting
      await fetch("/api/guides-storage-cleanup", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({guide_id:guideId}) });
      const res  = await fetch("/api/guides-submit", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({guide_id:guideId}) });
      const json = await res.json();
      if (!res.ok) { setError(json.error??"Submit failed."); return; }
      setSubmitted(true);
    } catch { setError("Network error."); }
    finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col"><Navbar />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-green-100 border border-green-300 flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-green-600"/></div>
            <h1 className="font-black uppercase tracking-tighter text-2xl mb-2">Guide Submitted!</h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">Your guide has been submitted for admin review. You'll be notified once it's approved or if any changes are needed.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={()=>router.push("/profile?tab=contributions")} className="px-5 py-2 bg-primary text-white text-xs font-bold hover:brightness-110">View My Contributions</button>
              <button onClick={()=>router.push("/car-makers")} className="px-5 py-2 border border-border text-xs font-bold hover:bg-secondary">Browse Guides</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      {/* UPDATED 4.2: Thumbnail Cropper overlay */}
      {cropSrc && (
        <ThumbnailCropper
          src={cropSrc}
          onCropped={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="mb-8 border-b border-border pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Fix it / Repair Guides</p>
              <h1 className="font-black uppercase tracking-tighter text-3xl">Create a <span className="text-primary">Guide</span></h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">Share your repair knowledge with the community. Guides are reviewed by admins before publishing.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              {/* Turn to Draft — available immediately under Step 1 */}
              <button
                onClick={handleTurnToDraft}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 border border-border text-xs font-bold hover:bg-secondary transition-colors disabled:opacity-60"
                title="Save as draft and return to contributions"
              >
                {saving ? <RefreshCw size={11} className="animate-spin" /> : null}
                Turn to Draft
              </button>
              {/* Cancel Creation — deletes all data and files */}
              <button
                onClick={handleCancelCreation}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-60"
                title="Cancel creation — no data will be saved"
              >
                <X size={11} /> Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-0 mb-10">
          {[{n:1,label:"Introduction"},{n:2,label:"Steps"},{n:3,label:"Review & Submit"}].map((s,i)=>(
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-2 ${wizardStep===s.n?"text-ink":wizardStep>s.n?"text-primary":"text-muted-foreground"}`}>
                <div className={`w-7 h-7 flex items-center justify-center text-xs font-bold border-2 transition-colors ${wizardStep===s.n?"border-ink bg-ink text-white":wizardStep>s.n?"border-primary bg-primary text-white":"border-border bg-background"}`}>
                  {wizardStep>s.n?<CheckCircle size={13}/>:s.n}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest hidden sm:block">{s.label}</span>
              </div>
              {i<2&&<div className={`flex-1 h-0.5 mx-3 ${wizardStep>s.n?"bg-primary":"bg-border"}`}/>}
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error&&<div className="mb-6 px-4 py-3 bg-red-50 border border-red-300 text-red-700 text-xs flex items-center gap-2"><AlertCircle size={13} className="shrink-0"/> {error}</div>}

        {/* ── STEP 1: INTRODUCTION ── */}
        {wizardStep===1&&(
          <div className="space-y-6">
            {/* Vehicle */}
            <div className="border border-border bg-background p-6">
              <h2 className="font-black uppercase tracking-tighter text-sm mb-4 flex items-center gap-2"><BookOpen size={15} className="text-primary"/> Vehicle</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Brand <span className="text-primary">*</span></label>
                  <select value={brandId} onChange={e=>{setBrandId(e.target.value);setModelId("");setModelName("");loadModels(e.target.value);}}
                    className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink">
                    <option value="">— Select brand —</option>
                    {BRANDS.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Model <span className="text-primary">*</span></label>
                  {loadingMods
                    ? <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><RefreshCw size={12} className="animate-spin"/> Loading...</div>
                    : <select value={modelId} onChange={e=>{setModelId(e.target.value);const m=models.find(x=>x.id===e.target.value);setModelName(m?.name??"");}}
                        disabled={!brandId} className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink disabled:opacity-50">
                        <option value="">— Select model —</option>
                        {models.map(m=><option key={m.id} value={m.id}>{m.name} ({m.years})</option>)}
                      </select>}
                </div>
              </div>
            </div>

            {/* Guide info — UPDATED 4.1: Title first, then Thumbnail, then other fields */}
            <div className="border border-border bg-background p-6">
              <h2 className="font-black uppercase tracking-tighter text-sm mb-4 flex items-center gap-2"><BookOpen size={15} className="text-primary"/> Guide Info</h2>
              <div className="space-y-4">
                {/* Title — first */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Title <span className="text-primary">*</span></label>
                  <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder='"How to Replace Brake Pads on a Toyota Corolla"' className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink"/>
                </div>

                {/* UPDATED 4.1 + 4.2: Thumbnail immediately after Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block flex items-center gap-1.5">
                    <ImageIcon size={11}/> Thumbnail <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional – 16:9, cropped)</span>
                  </label>
                  <div className="flex items-start gap-4">
                    {/* Fixed 16:9 preview box */}
                    <div className={`relative border border-dashed flex items-center justify-center overflow-hidden transition-all bg-secondary/30 ${thumbPreview ? "border-primary/60" : "border-border"}`}
                      style={{ width: 160, aspectRatio: "16/9" }}>
                      {thumbPreview ? (
                        <><img src={thumbPreview} alt="Thumbnail" className="w-full h-full object-cover"/>
                        <button onClick={()=>{setThumbnail(null);setThumbPreview("");setThumbUrl("");}} className="absolute top-1 right-1 bg-ink/70 text-white p-0.5 rounded hover:bg-ink"><X size={10}/></button></>
                      ) : (
                        <button onClick={()=>thumbInputRef.current?.click()} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary p-2 transition-all">
                          <Upload size={16}/><span className="text-[9px] font-bold uppercase tracking-widest">Add Thumbnail</span>
                        </button>
                      )}
                      <input type="file" accept="image/*" className="hidden" ref={thumbInputRef}
                        onChange={e=>{const f=e.target.files?.[0];if(f)handleThumbnailFileSelect(f);e.target.value="";}}/>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed mt-1 max-w-xs">
                      Cover image shown in guide listings. Will be cropped to <strong>16:9</strong> aspect ratio. Use the crop tool to zoom and adjust.
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Summary <span className="text-primary">*</span> <span className="text-muted-foreground font-normal normal-case tracking-normal">(1–2 sentences)</span></label>
                  <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={2} placeholder="Briefly describe what this guide covers..." className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none"/>
                </div>
                {/* UPDATED 4.3: Renamed "Introduction" → "Note" */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Note <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional — background, warnings)</span></label>
                  <textarea value={note} onChange={e=>setNote(e.target.value)} rows={4} placeholder="Describe any special requirements, hazards, or reasons for this repair..." className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none"/>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="border border-border bg-background p-6">
              <h2 className="font-black uppercase tracking-tighter text-sm mb-4 flex items-center gap-2"><Clock size={15} className="text-primary"/> Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Difficulty <span className="text-primary">*</span></label>
                  <div className="flex gap-2 flex-wrap">
                    {DIFFICULTIES.map(d=>(
                      <button key={d} type="button" onClick={()=>setDifficulty(d)}
                        className={`px-3 py-1.5 text-xs font-bold border transition-all ${difficulty===d?"bg-ink text-white border-ink":"bg-background border-border hover:border-ink"}`}>{d}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Time Required <span className="text-primary">*</span></label>
                  <input type="text" value={timeReq} onChange={e=>setTimeReq(e.target.value)} placeholder='"30–45 minutes"' className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink"/>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block"><Package size={11} className="inline mr-1"/> Required Parts</label>
                <div className="flex gap-2">
                  <input type="text" value={partsInput} onChange={e=>setPartsInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&partsInput.trim()){e.preventDefault();setParts(t=>[...t,partsInput.trim()]);setPartsInput("");}}}
                    placeholder="Type a part name and press Enter..." className="flex-1 border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink"/>
                  <button type="button" onClick={()=>{if(partsInput.trim()){setParts(t=>[...t,partsInput.trim()]);setPartsInput("");}}} className="px-3 py-2 border border-border hover:bg-secondary transition-colors"><Plus size={14}/></button>
                </div>
                {parts.length>0&&(
                  <div className="flex flex-wrap gap-2 mt-2">
                    {parts.map((p,i)=>(
                      <span key={i} className="inline-flex items-center gap-1.5 bg-secondary border border-border text-xs px-2 py-1 font-medium">
                        {p}<button onClick={()=>setParts(prev=>prev.filter((_,j)=>j!==i))} className="hover:text-red-500"><X size={11}/></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block"><Wrench size={11} className="inline mr-1"/> Required Tools</label>
                <div className="flex gap-2">
                  <input type="text" value={toolInput} onChange={e=>setToolInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&toolInput.trim()){e.preventDefault();setTools(t=>[...t,toolInput.trim()]);setToolInput("");}}}
                    placeholder="Type a tool name and press Enter..." className="flex-1 border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink"/>
                  <button type="button" onClick={()=>{if(toolInput.trim()){setTools(t=>[...t,toolInput.trim()]);setToolInput("");}}} className="px-3 py-2 border border-border hover:bg-secondary transition-colors"><Plus size={14}/></button>
                </div>
                {tools.length>0&&(
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tools.map((t,i)=>(
                      <span key={i} className="inline-flex items-center gap-1.5 bg-secondary border border-border text-xs px-2 py-1 font-medium">
                        {t}<button onClick={()=>setTools(p=>p.filter((_,j)=>j!==i))} className="hover:text-red-500"><X size={11}/></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleSaveIntro} disabled={saving||uploadingThumb} className="flex items-center gap-2 px-6 py-2.5 bg-ink text-white text-xs font-bold hover:bg-ink/80 disabled:opacity-60">
                {saving?<><RefreshCw size={13} className="animate-spin"/> Saving...</>:<>Continue to Steps <ChevronRight size={13}/></>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: STEPS ── */}
        {wizardStep===2&&(
          <div className="space-y-5">
            <div className="flex items-center justify-between mb-2">
              <div><h2 className="font-black uppercase tracking-tighter text-base">Guide Steps</h2><p className="text-[10px] text-muted-foreground mt-0.5">Each step can have up to 3 photos.</p></div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{steps.length} step{steps.length!==1?"s":""}</span>
            </div>

            {steps.map((step,idx)=>(
              <div key={idx} className="border border-border bg-background overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-secondary border-b border-border">
                  <span className="font-black uppercase tracking-tighter text-sm">Step {step.step_number}</span>
                  {steps.length>1&&<button onClick={()=>removeStep(idx)} className="p-1 hover:bg-red-100 rounded"><Trash2 size={13} className="text-red-500"/></button>}
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Step Title <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input type="text" value={step.title} onChange={e=>updateStep(idx,"title",e.target.value)} placeholder={`e.g. "Remove the wheel"`} className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Instructions <span className="text-primary">*</span></label>
                    <textarea value={step.instructions} onChange={e=>updateStep(idx,"instructions",e.target.value)} rows={4} placeholder="Write clear, complete instructions..." className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><ImageIcon size={11}/> Photos <span className="text-muted-foreground font-normal">(up to 3)</span></label>
                    <div className="grid grid-cols-3 gap-3">
                      {[0,1,2].map(slot=>{
                        const preview=step.imagePreviews[slot]||step.images[slot];
                        const slotKey=`${idx}-${slot}`;
                        const isUploading=!!uploadingSlots[slotKey];
                        return(
                          <div key={slot} className={`relative aspect-video border border-dashed flex items-center justify-center overflow-hidden transition-all duration-200 ${isUploading?"border-primary/60 bg-primary/5 scale-[1.01]":"border-border bg-secondary/30"}`}>
                            {isUploading?(
                              <div className="flex flex-col items-center gap-1.5">
                                <RefreshCw size={15} className="animate-spin text-primary"/>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-primary animate-pulse">Uploading…</span>
                              </div>
                            ):preview?(
                              <><img src={preview} alt="" className="w-full h-full object-cover transition-opacity duration-300"/>
                              <button onClick={()=>removeImage(idx,slot)} className="absolute top-1 right-1 bg-ink/70 text-white p-0.5 rounded hover:bg-ink"><X size={10}/></button></>
                            ):(
                              <button onClick={()=>{if(!fileInputRefs.current[idx])fileInputRefs.current[idx]=[];fileInputRefs.current[idx][slot]?.click();}}
                                className="group flex flex-col items-center gap-1 text-muted-foreground hover:text-primary p-2 transition-all duration-150 active:scale-90 rounded focus:outline-none focus:ring-2 focus:ring-primary/30">
                                <Upload size={16} className="group-hover:scale-110 transition-transform duration-150"/>
                                <span className="text-[9px] font-bold uppercase tracking-widest">Add photo</span>
                              </button>
                            )}
                            <input type="file" accept="image/*" className="hidden"
                              ref={el=>{if(!fileInputRefs.current[idx])fileInputRefs.current[idx]=[];fileInputRefs.current[idx][slot]=el;}}
                              onChange={e=>{const f=e.target.files?.[0];if(f)handleImageSelect(idx,slot,f);e.target.value="";}}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Video size={11}/> Video Link <span className="text-muted-foreground font-normal">(YouTube share link — optional)</span></label>
                    <input type="url" value={step.video_url} onChange={e=>updateStep(idx,"video_url",e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink"/>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addStep} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border hover:border-ink hover:bg-secondary transition-all text-xs font-bold uppercase tracking-widest">
              <Plus size={13}/> Add Another Step
            </button>

            <div className="flex justify-between">
              <button onClick={()=>setWizardStep(1)} className="flex items-center gap-2 px-5 py-2.5 border border-border text-xs font-bold hover:bg-secondary"><ChevronLeft size={13}/> Back</button>
              <button onClick={handleSaveSteps} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-ink text-white text-xs font-bold hover:bg-ink/80 disabled:opacity-60">
                {saving?<><RefreshCw size={13} className="animate-spin"/> Saving...</>:<>Review Guide <ChevronRight size={13}/></>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: REVIEW & SUBMIT ── UPDATED 4.4 ── */}
        {wizardStep===3&&(
          <div className="space-y-6">
            <div className="border border-border bg-background p-6">
              <h2 className="font-black uppercase tracking-tighter text-base mb-1">Review Your Guide</h2>
              <p className="text-xs text-muted-foreground mb-5">Check everything looks good before submitting for admin review.</p>

              {/* UPDATED 4.4: Thumbnail FIRST */}
              {thumbPreview && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Thumbnail</p>
                  <img
                    src={thumbPreview}
                    alt="Thumbnail"
                    className="w-full max-w-md rounded border border-border object-cover"
                    style={{ aspectRatio: "16/9" }}
                  />
                </div>
              )}

              {/* UPDATED 4.4: Title shown prominently */}
              <h3 className="font-black uppercase tracking-tighter text-xl mb-4">{title}</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[{label:"Vehicle",value:`${BRANDS.find(b=>b.id===brandId)?.name??""} ${modelName}`},{label:"Difficulty",value:difficulty},{label:"Time",value:timeReq},{label:"Steps",value:`${steps.length} step${steps.length!==1?"s":""}`}].map(r=>(
                  <div key={r.label} className="bg-secondary px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{r.label}</p><p className="text-sm font-bold mt-0.5 truncate">{r.value}</p></div>
                ))}
              </div>
              <div className="space-y-3 text-sm">
                <div><span className="font-bold">Summary:</span> {summary}</div>
                {/* UPDATED 4.3: label is now "Note" */}
                <div><span className="font-bold">Note:</span> {note.trim() || <span className="text-muted-foreground italic">None</span>}</div>
                <div><span className="font-bold">Required Tools:</span> {tools.length > 0 ? tools.join(", ") : <span className="text-muted-foreground italic">None</span>}</div>
                <div><span className="font-bold">Required Parts:</span> {parts.length > 0 ? parts.join(", ") : <span className="text-muted-foreground italic">None</span>}</div>
              </div>

              {/* UPDATED 4.4: Steps with large images */}
              <div className="mt-5 border-t border-border pt-4 space-y-4">
                {steps.map(s=>(
                  <div key={s.step_number} className="border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary border-b border-border">
                      <span className="w-6 h-6 bg-ink text-white text-[10px] font-black flex items-center justify-center shrink-0">{s.step_number}</span>
                      {s.title&&<p className="text-xs font-bold">{s.title}</p>}
                    </div>
                    <div className="p-4 space-y-3">
                      {/* UPDATED 4.4: Large clear images */}
                      {(s.imagePreviews.some(Boolean) || s.images.some(Boolean)) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {[0,1,2].map(i=>{
                            const src=s.imagePreviews[i]||s.images[i];
                            return src?(
                              <img key={i} src={src}
                                className="w-full aspect-video object-cover border border-border rounded"
                                alt={`Step ${s.step_number} image ${i+1}`}
                                onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}}
                              />
                            ):null;
                          })}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{s.instructions}</p>
                      {s.video_url && <p className="text-[10px] text-primary mt-1">📹 Video attached</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/30 px-4 py-3 text-xs leading-relaxed">
              <strong>Before submitting:</strong> Once submitted, you cannot edit until the guide has been reviewed.
            </div>

            <div className="flex justify-between">
              <button onClick={()=>setWizardStep(2)} className="flex items-center gap-2 px-5 py-2.5 border border-border text-xs font-bold hover:bg-secondary"><ChevronLeft size={13}/> Edit Steps</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 disabled:opacity-60 shadow-[4px_4px_0_0_rgba(0,0,0,0.15)]">
                {submitting?<><RefreshCw size={13} className="animate-spin"/> Submitting...</>:<><Send size={13}/> Submit for Review</>}
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
              Your progress will be saved as a draft. What would you like to do next?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleTurnToDraftLeave}
                className="w-full px-4 py-2.5 bg-ink text-white text-xs font-bold hover:bg-ink/80 transition-colors"
              >
                Leave Edit
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

export default function CreateGuidePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <CreateGuideForm />
    </Suspense>
  );
}
