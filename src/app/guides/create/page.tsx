"use client";

// ================================================================
// FILE: src/app/guides/create/page.tsx
//
// FIX (User Fix #3): Redirect user to login page when they click
//   "Create Guide" but have not logged in yet.
//
//   Added an auth check useEffect that runs on mount:
//   - Calls GET /api/guides (which returns 401 if unauthenticated).
//   - If 401 is returned, the user is redirected to /login with
//     a ?redirect=/guides/create query param so they land back
//     here after logging in.
//   - Shows a loading screen while the auth check is in progress
//     to prevent a flash of the form before the redirect fires.
// ================================================================

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Upload, X,
  AlertCircle, CheckCircle, Clock, Wrench, BookOpen,
  ImageIcon, Video, RefreshCw, Send,
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

// ── Inner form component (needs useSearchParams so must be inside Suspense) ──
function CreateGuideForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [wizardStep, setWizardStep] = useState<1|2|3>(1);

  // ── Auth guard (User Fix #3) ────────────────────────────────
  // Check if the user is logged in before rendering the form.
  // /api/guides returns 401 for unauthenticated requests.
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/guides")
      .then((res) => {
        if (res.status === 401) {
          // Not logged in — redirect to login, return here after
          router.replace("/login?redirect=/guides/create");
        } else {
          setAuthChecked(true);
        }
      })
      .catch(() => {
        // Network error — still allow the form to render
        setAuthChecked(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-populate from query params: ?brand=toyota&model=<modelId>
  const paramBrand = searchParams.get("brand") ?? "";
  const paramModel = searchParams.get("model") ?? "";

  const [brandId,    setBrandId]    = useState(paramBrand);
  const [models,     setModels]     = useState<CarModel[]>([]);
  const [modelId,    setModelId]    = useState(paramModel);
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
  const [guideId,    setGuideId]    = useState<string|null>(null);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [submitted,  setSubmitted]  = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement|null)[][]>([]);
  // Track uploading state per (stepIdx-slotIdx) key for visual feedback
  const [uploadingSlots, setUploadingSlots] = useState<Record<string,boolean>>({});

  // [V2 Req #3] Auto-load models when brand is pre-selected from URL params.
  // Without this useEffect, the models list stays empty and the model dropdown
  // shows "Select model" even when a model was passed via ?brand=x&model=y.
  //
  // FIX (V2 Req #3): useSearchParams() inside a Suspense boundary returns ""
  // on the first render. useState(paramBrand) captures that empty string as
  // initial state, so brandId stays "" even when ?brand=toyota is in the URL.
  // After auth resolves, searchParams are stable — re-read them here and
  // explicitly set brandId so the dropdown is populated and the model selected.
  useEffect(() => {
    if (!authChecked) return;
    const brand = searchParams.get("brand") ?? "";
    const model = searchParams.get("model") ?? "";
    if (!brand) return;

    setBrandId(brand); // sync in case useState initialised with ""
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
  }, [authChecked]); // runs once, after auth resolves and searchParams are stable

  // Show loading while auth check runs
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

  // Load models when brand changes (or on mount if brand pre-set from query)
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

  // Step 1 → 2: save draft intro
  const handleSaveIntro = async () => {
    setError("");
    if (!brandId || !modelId || !title.trim() || !summary.trim() || !intro.trim() || !difficulty || !timeReq.trim()) {
      setError("Please fill in all required fields before continuing."); return;
    }
    setSaving(true);
    try {
      const method = guideId ? "PATCH" : "POST";
      const url    = guideId ? `/api/guides/${guideId}` : "/api/guides";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brandId, model_id: modelId, model_name: modelName, title, summary, introduction: intro, difficulty, time_required: timeReq, tools }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save."); return; }
      setGuideId(json.guide.guide_id ?? guideId);
      setWizardStep(2);
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  // Image select + upload
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

  // Step 2 → 3: save steps
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

  // Step 3: submit for review
  const handleSubmit = async () => {
    if (!guideId) return;
    setError(""); setSubmitting(true);
    try {
      const res  = await fetch("/api/guides-submit", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({guide_id:guideId}) });
      const json = await res.json();
      if (!res.ok) { setError(json.error??"Submit failed."); return; }
      setSubmitted(true);
    } catch { setError("Network error."); }
    finally { setSubmitting(false); }
  };

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col"><Navbar />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-green-100 border border-green-300 flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-green-600"/></div>
            <h1 className="font-black uppercase tracking-tighter text-2xl mb-2">Guide Submitted!</h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">Your guide has been submitted for admin review. You'll be notified once it's approved or if any changes are needed.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={()=>router.push("/profile")} className="px-5 py-2 bg-primary text-white text-xs font-bold hover:brightness-110">View My Guides</button>
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
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="mb-8 border-b border-border pb-6">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Fix it / Repair Guides</p>
          <h1 className="font-black uppercase tracking-tighter text-3xl">Create a <span className="text-primary">Guide</span></h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">Share your repair knowledge with the community. Guides are reviewed by admins before publishing.</p>
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

            {/* Guide info */}
            <div className="border border-border bg-background p-6">
              <h2 className="font-black uppercase tracking-tighter text-sm mb-4 flex items-center gap-2"><BookOpen size={15} className="text-primary"/> Guide Info</h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Title <span className="text-primary">*</span></label>
                  <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder='"How to Replace Brake Pads on a Toyota Corolla"' className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Summary <span className="text-primary">*</span> <span className="text-muted-foreground font-normal normal-case tracking-normal">(1–2 sentences)</span></label>
                  <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={2} placeholder="Briefly describe what this guide covers..." className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Introduction <span className="text-primary">*</span> <span className="text-muted-foreground font-normal normal-case tracking-normal">(background, warnings)</span></label>
                  <textarea value={intro} onChange={e=>setIntro(e.target.value)} rows={4} placeholder="Describe any special requirements, hazards, or reasons for this repair..." className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none"/>
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
              <button onClick={handleSaveIntro} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-ink text-white text-xs font-bold hover:bg-ink/80 disabled:opacity-60">
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

        {/* ── STEP 3: REVIEW & SUBMIT ── */}
        {wizardStep===3&&(
          <div className="space-y-6">
            <div className="border border-border bg-background p-6">
              <h2 className="font-black uppercase tracking-tighter text-base mb-1">Review Your Guide</h2>
              <p className="text-xs text-muted-foreground mb-5">Check everything looks good before submitting for admin review.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[{label:"Vehicle",value:`${BRANDS.find(b=>b.id===brandId)?.name??""} ${modelName}`},{label:"Difficulty",value:difficulty},{label:"Time",value:timeReq},{label:"Steps",value:`${steps.length} step${steps.length!==1?"s":""}`}].map(r=>(
                  <div key={r.label} className="bg-secondary px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{r.label}</p><p className="text-sm font-bold mt-0.5 truncate">{r.value}</p></div>
                ))}
              </div>
              <div className="space-y-3 text-sm">
                <div><span className="font-bold">Title:</span> {title}</div>
                <div><span className="font-bold">Summary:</span> {summary}</div>
                {tools.length>0&&<div><span className="font-bold">Tools:</span> {tools.join(", ")}</div>}
              </div>
              <div className="mt-5 border-t border-border pt-4 space-y-2">
                {steps.map(s=>(
                  <div key={s.step_number} className="flex items-start gap-3 py-2">
                    <span className="w-6 h-6 bg-ink text-white text-[10px] font-black flex items-center justify-center shrink-0">{s.step_number}</span>
                    <div className="flex-1 min-w-0">
                      {s.title&&<p className="text-xs font-bold">{s.title}</p>}
                      <p className="text-xs text-muted-foreground line-clamp-2">{s.instructions}</p>
                      {s.images.filter(Boolean).length>0&&(
                        <div className="flex gap-1.5 mt-1.5">
                          {s.images.filter(Boolean).map((url,i)=><img key={i} src={url} className="w-12 h-8 object-cover border border-border" alt=""/>)}
                        </div>
                      )}
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
    </div>
  );
}

// ── Wrapped export — useSearchParams requires Suspense ────────
export default function CreateGuidePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <CreateGuideForm />
    </Suspense>
  );
}