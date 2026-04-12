"use client";

// ================================================================
// FILE: src/app/guides/edit/[guideId]/page.tsx
//
// FIX #7: Edit guide — loads existing guide data into the form,
//         allows updating instead of creating a new one.
//
// Differences from /guides/create:
//  - Fetches guide + steps on mount, pre-fills all fields
//  - Always uses PATCH (not POST) for guide header
//  - Always uses PUT for steps (replace all)
//  - Clearly labeled as "Edit Guide" not "Create Guide"
//  - Disabled for guides with status = 'pending'
// ================================================================

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Upload, X,
  AlertCircle, CheckCircle, Clock, Wrench,
  ImageIcon, Video, RefreshCw, Save,
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

export default function EditGuidePage() {
  const router  = useRouter();
  const params  = useParams();
  const guideId = params?.guideId as string;

  const [wizardStep, setWizardStep] = useState<1|2|3>(1);
  const [loadingGuide, setLoadingGuide] = useState(true);
  const [blocked, setBlocked] = useState("");

  // Form fields
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
  const [steps,      setSteps]      = useState<StepDraft[]>([emptyStep(1)]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [saved,      setSaved]      = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement|null)[][]>([]);

  // ── Load existing guide on mount ─────────────────────────────
  useEffect(() => {
    if (!guideId) return;
    Promise.all([
      fetch(`/api/guides/${guideId}`).then((r) => r.json()),
    ]).then(([guideJson]) => {
      if (guideJson.error) { setBlocked(guideJson.error); setLoadingGuide(false); return; }
      const g = guideJson.guide;
      if (g.status === "pending") {
        setBlocked("This guide is pending review and cannot be edited until reviewed.");
        setLoadingGuide(false); return;
      }
      setBrandId(g.brand_id ?? "");
      setModelId(g.model_id ?? "");
      setModelName(g.model_name ?? "");
      setTitle(g.title ?? "");
      setSummary(g.summary ?? "");
      setIntro(g.introduction ?? "");
      setDifficulty(g.difficulty ?? "");
      setTimeReq(g.time_required ?? "");
      setTools(g.tools ?? []);

      const rawSteps: any[] = guideJson.steps ?? [];
      setSteps(rawSteps.length > 0 ? rawSteps.map(stepFromDB) : [emptyStep(1)]);

      // Load models for the brand
      if (g.brand_id) {
        fetch(`/api/car-models/${g.brand_id}`)
          .then((r) => r.json())
          .then((j) => setModels(j.models ?? []));
      }
      setLoadingGuide(false);
    }).catch(() => {
      setBlocked("Failed to load guide.");
      setLoadingGuide(false);
    });
  }, [guideId]);

  if (loadingGuide) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col">
        <Navbar />
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
      <div className="min-h-screen bg-paper text-ink flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm font-bold mb-4">{blocked}</p>
            <button onClick={() => router.back()} className="text-xs text-primary hover:underline">
              Go back
            </button>
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

  const handleSaveIntro = async () => {
    setError("");
    if (!brandId || !modelId || !title.trim() || !summary.trim() || !intro.trim() || !difficulty || !timeReq.trim()) {
      setError("Please fill in all required fields before continuing."); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/guides/${guideId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brandId, model_id: modelId, model_name: modelName,
          title, summary, introduction: intro,
          difficulty, time_required: timeReq, tools,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save."); return; }
      setWizardStep(2);
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  const handleImageSelect = async (stepIdx: number, slotIdx: number, file: File) => {
    const preview = URL.createObjectURL(file);
    setSteps((prev) => {
      const next = [...prev];
      next[stepIdx] = { ...next[stepIdx], imageFiles: [...next[stepIdx].imageFiles], imagePreviews: [...next[stepIdx].imagePreviews] };
      next[stepIdx].imageFiles[slotIdx]    = file;
      next[stepIdx].imagePreviews[slotIdx] = preview;
      return next;
    });
    const fd = new FormData(); fd.append("file", file); fd.append("guide_id", guideId);
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
    setSaving(true);
    try {
      const payload = steps.map((s) => ({
        step_number:  s.step_number,
        title:        s.title,
        instructions: s.instructions,
        images:       s.images.filter(Boolean),
        video_url:    s.video_url || null,
      }));
      const res = await fetch(`/api/guides/${guideId}/steps`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: payload }),
      });
      if (!res.ok) { const j=await res.json(); setError(j.error ?? "Failed."); return; }
      setWizardStep(3);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    setSaving(true);
    const res = await fetch("/api/guides-submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guide_id: guideId }),
    });
    if (res.ok) { setSaved(true); }
    else { const j = await res.json(); setError(j.error ?? "Submission failed."); }
    setSaving(false);
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
            <h2 className="font-black uppercase tracking-tighter text-xl mb-2">Guide Submitted!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your updated guide has been submitted for admin review. You'll be notified once it's approved.
            </p>
            <button onClick={() => router.push("/profile")} className="px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all">
              Back to Profile
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Edit Guide
          </p>
          <h1 className="font-black uppercase tracking-tighter text-2xl">Update Repair Guide</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Editing an approved guide will require re-review before it is republished.
          </p>
        </div>

        {/* Wizard steps */}
        <div className="flex items-center gap-3 mb-8">
          {[1,2,3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 flex items-center justify-center text-xs font-black border ${
                wizardStep === s ? "bg-primary text-white border-primary" :
                wizardStep > s  ? "bg-green-500 text-white border-green-500" :
                                  "bg-background border-border text-muted-foreground"
              }`}>
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

        {/* ── STEP 1: Guide Info ─────────────────────────────────── */}
        {wizardStep === 1 && (
          <div className="space-y-5">
            {/* Brand */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                Brand *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {BRANDS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setBrandId(b.id); setModelId(""); setModelName(""); loadModels(b.id); }}
                    className={`px-3 py-2 text-xs font-bold border transition-all ${
                      brandId === b.id ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Model */}
            {brandId && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                  Model *
                </label>
                {loadingMods ? (
                  <div className="text-xs text-muted-foreground animate-pulse">Loading models...</div>
                ) : (
                  <select
                    value={modelId}
                    onChange={(e) => {
                      const m = models.find((x) => x.id === e.target.value);
                      setModelId(e.target.value);
                      setModelName(m?.name ?? "");
                    }}
                    className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Select a model...</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.years})</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Title *</label>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How to Replace Brake Pads"
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Summary *</label>
              <textarea
                value={summary} onChange={(e) => setSummary(e.target.value)}
                rows={2} placeholder="Brief overview..."
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Introduction */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Introduction *</label>
              <textarea
                value={intro} onChange={(e) => setIntro(e.target.value)}
                rows={4} placeholder="Detailed introduction..."
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Difficulty *</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-1.5 text-xs font-bold border transition-all ${
                      difficulty === d ? "bg-primary text-white border-primary" : "bg-background border-border hover:border-primary"
                    }`}
                  >{d}</button>
                ))}
              </div>
            </div>

            {/* Time Required */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                <Clock size={10} className="inline mr-1" /> Time Required *
              </label>
              <input
                type="text" value={timeReq} onChange={(e) => setTimeReq(e.target.value)}
                placeholder="e.g. 1-2 hours"
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Tools */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                <Wrench size={10} className="inline mr-1" /> Tools Needed
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text" value={toolInput}
                  onChange={(e) => setToolInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && toolInput.trim()) { setTools((p)=>[...p,toolInput.trim()]); setToolInput(""); e.preventDefault(); }}}
                  placeholder="Add a tool, press Enter"
                  className="flex-1 border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => { if (toolInput.trim()) { setTools((p)=>[...p,toolInput.trim()]); setToolInput(""); }}}
                  className="px-3 py-2 bg-secondary border border-border text-xs font-bold hover:bg-border transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tools.map((t, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-2 py-1 bg-secondary border border-border text-xs">
                    {t}
                    <button onClick={() => setTools((p)=>p.filter((_,j)=>j!==i))} className="text-muted-foreground hover:text-ink">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveIntro} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
              {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : <>Save &amp; Continue <ChevronRight size={12} /></>}
            </button>
          </div>
        )}

        {/* ── STEP 2: Steps ─────────────────────────────────────── */}
        {wizardStep === 2 && (
          <div className="space-y-4">
            {steps.map((step, si) => (
              <div key={si} className="border border-border bg-background overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary border-b border-border">
                  <span className="w-6 h-6 bg-ink text-white text-[10px] font-black flex items-center justify-center">
                    {step.step_number}
                  </span>
                  <input
                    type="text" value={step.title}
                    onChange={(e) => updateStep(si, "title", e.target.value)}
                    placeholder={`Step ${step.step_number} title`}
                    className="flex-1 bg-transparent text-xs font-bold focus:outline-none placeholder:text-muted-foreground"
                  />
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(si)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  {/* Images */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                      <ImageIcon size={10} /> Images (up to 3)
                    </p>
                    <div className="flex gap-2">
                      {[0,1,2].map((sl) => (
                        <div key={sl} className="relative w-24 h-16 border border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary">
                          {step.imagePreviews[sl] ? (
                            <>
                              <img src={step.imagePreviews[sl]} alt="" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeImage(si, sl)}
                                className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white flex items-center justify-center rounded-full"
                              >
                                <X size={8} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => fileInputRefs.current[si]?.[sl]?.click()}
                              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-ink transition-colors"
                            >
                              <Upload size={14} />
                              <span className="text-[9px]">Add</span>
                            </button>
                          )}
                          <input
                            type="file" accept="image/*" className="hidden"
                            ref={(el) => {
                              if (!fileInputRefs.current[si]) fileInputRefs.current[si] = [];
                              fileInputRefs.current[si][sl] = el;
                            }}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(si, sl, f); e.target.value = ""; }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Instructions */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                      Instructions *
                    </label>
                    <textarea
                      value={step.instructions}
                      onChange={(e) => updateStep(si, "instructions", e.target.value)}
                      rows={3} placeholder="Describe what to do in this step..."
                      className="w-full border border-border bg-background px-3 py-2 text-xs focus:outline-none resize-none"
                    />
                  </div>
                  {/* Video */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1 flex items-center gap-1">
                      <Video size={10} /> Video URL (optional)
                    </label>
                    <input
                      type="url" value={step.video_url}
                      onChange={(e) => updateStep(si, "video_url", e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="w-full border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addStep}
              className="w-full border border-dashed border-border py-2.5 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={12} /> Add Step
            </button>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setWizardStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors"
              >
                <ChevronLeft size={12} /> Back
              </button>
              <button
                onClick={handleSaveSteps} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : <>Save &amp; Continue <ChevronRight size={12} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & Submit ────────────────────────────── */}
        {wizardStep === 3 && (
          <div>
            <div className="border border-green-200 bg-green-50 p-4 mb-6 flex items-start gap-3">
              <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-green-700">Guide updated successfully!</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Submit it for admin review to publish it. If it was previously approved, it will need re-review.
                </p>
              </div>
            </div>

            <div className="border border-border bg-background p-5 mb-6">
              <h3 className="font-black uppercase tracking-tighter text-sm mb-3">{title}</h3>
              <p className="text-xs text-muted-foreground mb-3">{summary}</p>
              <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                <span>Brand: <strong className="text-ink capitalize">{brandId}</strong></span>
                <span>Model: <strong className="text-ink">{modelName}</strong></span>
                <span>Difficulty: <strong className="text-ink">{difficulty}</strong></span>
                <span>Time: <strong className="text-ink">{timeReq}</strong></span>
                <span>Steps: <strong className="text-ink">{steps.length}</strong></span>
                {tools.length > 0 && <span>Tools: <strong className="text-ink">{tools.length}</strong></span>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setWizardStep(2)}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-xs font-bold hover:bg-secondary transition-colors"
              >
                <ChevronLeft size={12} /> Back
              </button>
              <button
                onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50 shadow-[3px_3px_0_0_rgba(0,0,0,0.15)]"
              >
                {saving ? <><RefreshCw size={12} className="animate-spin" /> Submitting...</> : <><Save size={12} /> Submit for Review</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
