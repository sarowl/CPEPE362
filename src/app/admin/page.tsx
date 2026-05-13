"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminGuard, clearAdminSession } from "@/lib/useAdminGuard";
import { supabase } from "@/lib/supabase";
import AdminGuidesTab from "@/components/admin/AdminGuidesTab";
import {
  Users, BookOpen, Car, FileText, BarChart2, MessageSquare,
  LogOut, Shield, ChevronRight, Plus, CheckCircle, XCircle,
  Clock, Trash2, Ban, RefreshCw, Search, Bell, Upload, X,
  Edit2, AlertCircle, ImageIcon, ZoomIn, ZoomOut, Eye
} from "lucide-react";

import { resolveCarModelImage } from "@/lib/carTypeImage";
import { fuzzyUserFilter } from "@/lib/fuzzyUserSearch";


// ── CarImageCropper (unchanged) ───────────────────────────────
function CarImageCropper({
  src, onCropped, onCancel,
}: { src: string; onCropped: (blob: Blob) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom]     = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

  const CROP_W = 480;
  const CROP_H = Math.round(CROP_W / (16 / 9)); // 270

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 px-4">
      <div className="bg-background border border-border p-5 w-full max-w-lg shadow-[6px_6px_0_0_var(--ink)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black uppercase tracking-tighter text-sm">Crop Image (16:9)</h3>
          <button onClick={onCancel} className="p-1 hover:bg-secondary rounded"><X size={14} /></button>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">Drag to pan · Use zoom buttons to adjust</p>
        <div
          className="relative border border-border overflow-hidden cursor-move select-none"
          style={{ width: CROP_W, maxWidth: "100%", aspectRatio: `${CROP_W}/${CROP_H}` }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
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
          <button onClick={handleCrop} className="px-4 py-2 text-xs font-bold bg-ink text-white hover:bg-ink/80">Apply Crop</button>
        </div>
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────
const BRANDS = [
  { name:"Toyota",id:"toyota"},{name:"Mitsubishi",id:"mitsubishi"},
  { name:"BYD",id:"byd"},{name:"Suzuki",id:"suzuki"},
  { name:"Isuzu",id:"isuzu"},{name:"Ford",id:"ford"},
  { name:"Nissan",id:"nissan"},{name:"Honda",id:"honda"},
  { name:"Hyundai",id:"hyundai"},{name:"Kia",id:"kia"},
  { name:"Geely",id:"geely"},{name:"MG",id:"mg"},
];
const MODEL_TYPES = ["Sedan","SUV","Hatchback","Pickup Truck","Van","MPV","Crossover","Coupe","Convertible","Wagon","Electric","Hybrid","Sports","Truck","EV"];

type Tab = "users"|"guides"|"car-models"|"documents"|"forum";

interface UserRow { user_id: string; name: string; email: string; created_at: string; last_sign_in_at: string | null; status: "Active" | "Suspended" | "Pending"; provider?: string;  }
interface CarModelRow { id:string; name:string; slug:string; category:string; years:string; info?:string; model_img?:string; brand_id:string; }
interface AddModelForm{ name:string; category:string; years:string; info:string; imageFile:File|null; imagePreview:string; }
interface EditModelForm{ name:string; category:string; years:string; info:string; imageFile:File|null; imagePreview:string; }

const emptyAdd  = ():AddModelForm  => ({name:"",category:"",years:"",info:"",imageFile:null,imagePreview:""});
const emptyEdit = (m:CarModelRow):EditModelForm => ({name:m.name,category:m.category,years:m.years,info:m.info??"",imageFile:null,imagePreview:m.model_img?`${m.model_img}?t=${Date.now()}`:"" });

// ── AdminPage ─────────────────────────────────────────────────
export default function AdminPage() {
  const session = useAdminGuard();
  const router  = useRouter();

  const [activeTab,     setActiveTab]     = useState<Tab>("users");
  const [users,         setUsers]         = useState<UserRow[]>([]);
  const [userStatuses,  setUserStatuses]  = useState<Record<string,"Active"|"Suspended"|"Pending">>({});
  const [carModels,     setCarModels]     = useState<Record<string,CarModelRow[]|null>>({});
  const [expandedBrand, setExpandedBrand] = useState<string|null>(null);
  const [searchUser,    setSearchUser]    = useState("");
  const [loadingUsers,  setLoadingUsers]  = useState(false);
  const [noticeMsg,     setNoticeMsg]     = useState<{text:string;type:"ok"|"err"}|null>(null);

  // Pending guides count for notification bell
  const [pendingCount, setPendingCount] = useState(0);

  // Add model modal
  const [addModelFor,  setAddModelFor]  = useState<string|null>(null);
  const [addForm,      setAddForm]      = useState<AddModelForm>(emptyAdd());
  const [addLoading,   setAddLoading]   = useState(false);
  const [addError,     setAddError]     = useState("");
  const addImageRef = useRef<HTMLInputElement|null>(null);
  const [addCropSrc,   setAddCropSrc]   = useState<string|null>(null);

  // Edit model modal
  const [editModel,    setEditModel]    = useState<CarModelRow|null>(null);
  const [editForm,     setEditForm]     = useState<EditModelForm|null>(null);
  const [editLoading,  setEditLoading]  = useState(false);
  const [editError,    setEditError]    = useState("");
  const editImageRef = useRef<HTMLInputElement|null>(null);
  const [editCropSrc,  setEditCropSrc]  = useState<string|null>(null);

  // Delete model confirm
  const [deleteModel,       setDeleteModel]       = useState<CarModelRow|null>(null);
  const [deleteLoading,     setDeleteLoading]     = useState(false);

  // Delete user confirm
  const [deleteUser,        setDeleteUser]        = useState<UserRow|null>(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState("");

  // Orphaned folder cleanup
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Guide model_id migration fix
  const [fkeyFixLoading, setFkeyFixLoading] = useState(false);
  const [fkeyFixResult,  setFkeyFixResult]  = useState<{guides:{checked:number;fixed:number;skipped:number;unmatched:number}|null; forum:{checked:number;fixed:number;skipped:number;unmatched:number}|null}|null>(null);
  // Forum model_id fix

  // ── Documents tab state ──────────────────────────────────────
  const [docBrandId,          setDocBrandId]          = useState("");
  const [docModels,           setDocModels]           = useState<{id:string;name:string}[]>([]);
  const [docModelId,          setDocModelId]          = useState("");
  const [docManualType,       setDocManualType]       = useState<"user_manual"|"service_manual">("user_manual");
  const [docTitle,            setDocTitle]            = useState("");
  const [docFile,             setDocFile]             = useState<File|null>(null);
  const [docUploading,        setDocUploading]        = useState(false);
  const [docError,            setDocError]            = useState("");
  const [manuals,             setManuals]             = useState<any[]>([]);
  const [manualsLoading,      setManualsLoading]      = useState(false);
  const [viewManualId,        setViewManualId]        = useState<string|null>(null);
  const [viewUrls,            setViewUrls]            = useState<{viewUrl:string;downloadUrl:string}|null>(null);
  const [viewUrlLoading,      setViewUrlLoading]      = useState(false);
  const [deleteManualId,      setDeleteManualId]      = useState<string|null>(null);
  const [deleteManualName,    setDeleteManualName]    = useState("");
  const [deleteManualLoading, setDeleteManualLoading] = useState(false);

  // Reported Forums
  const [reportedPosts, setReportedPosts] = useState<{forum_id:string;title:string;brand_id:string;content:string;report_reason:string|null;Users:{name:string}}[]>([]);
  const [viewReportedPost, setViewReportedPost] = useState<{forum_id:string;title:string;brand_id:string;content:string;report_reason:string|null;Users:{name:string}}|null>(null);
  const [forumLoading, setForumLoading] = useState(false);

  // ── Toast ────────────────────────────────────────────────────
  const toast = useCallback((text:string, type:"ok"|"err"="ok")=>{
    setNoticeMsg({text,type}); setTimeout(()=>setNoticeMsg(null),5000);
  },[]);

  // Fetch Reported Forums
  const fetchReportedPosts = useCallback(async () => {
    setForumLoading(true);
    try {
      const res = await fetch("/api/forum_reported_posts");
      const json = await res.json();
      setReportedPosts(json.posts ?? []);
    } catch {
      toast("Failed to load reported posts.", "err");
    } finally {
      setForumLoading(false);
    }
  }, [toast]);

  const handleDeleteReportedPost = async (forum_id: string) => {
    if (!session?.email) return;
    const res = await fetch("/api/forum_post_delete_admin", {
     method: "DELETE",
     headers: { 
        "Content-Type": "application/json",
        "x-admin-email": session.email,
      },
      body: JSON.stringify({ forum_id }),
    });
    if (res.ok) {
      setReportedPosts(prev => prev.filter(p => p.forum_id !== forum_id));
      toast("Post deleted.");
    } else {
      toast("Failed to delete post.", "err");
    }
  };

  const handleIgnoreReport = async (forum_id: string) => {
    const res = await fetch("/api/forum_post_ignore_report", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forum_id }),
    });
    if (res.ok) {
      setReportedPosts(prev => prev.filter(p => p.forum_id !== forum_id));
      toast("Report ignored.");
    } else {
      toast("Failed to ignore report.", "err");
    }
  };
  
  useEffect(() => { if (activeTab === "forum") fetchReportedPosts(); }, [activeTab, fetchReportedPosts]);


  // ── Fetch pending count on mount ─────────────────────────────
  useEffect(()=>{
    if (!session?.email) return;
    fetch("/api/guides-review", { headers:{ "x-admin-email": session.email } })
      .then(r=>r.json())
      .then(j=>{ setPendingCount(j.pendingCount ?? 0); })
      .catch(()=>{});
  },[session?.email]);

  // ── Storage Auto-Sync ────────────────────────────────────────
  useEffect(()=>{
    if (!session?.email) return;
    fetch("/api/car-models-storage-sync", {
      method: "POST",
      headers: { "x-admin-email": session.email },
    }).catch(()=>{});
  },[session?.email]);

  // ── Users ────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
  if (!session?.email) return; // ← guard here
  setLoadingUsers(true);
  const res = await fetch("/api/admin-get-users", {
    headers: { "x-admin-email": session.email },
  });
  const json = await res.json();

  if (!res.ok) {
    toast(`Failed to load users: ${json.error}`, "err");
    setLoadingUsers(false);
    return;
  }

  const rows: UserRow[] = json.users;
  setUsers(rows);

  const map: Record<string, "Active" | "Suspended" | "Pending"> = {};
  rows.forEach((r: any) => { map[r.user_id] = r.status; });
  setUserStatuses(map);

  setLoadingUsers(false);
}, [toast, session?.email]);

  useEffect(()=>{ if(activeTab==="users") fetchUsers(); },[activeTab,fetchUsers]);

  // ── Car models ───────────────────────────────────────────────
  const fetchAllModels = useCallback(async () => {
    const loading: Record<string, CarModelRow[] | null> = {};
    BRANDS.forEach(b => { loading[b.id] = null; });
    setCarModels(loading);

    const { data, error } = await supabase
      .from("car_models")
      .select("id, name, slug, category, years, model_img, info, brand_id")
      .order("name");

    if (error) {
      toast(`Failed to load car models: ${error.message}`, "err");
      const empty: Record<string, CarModelRow[]> = {};
      BRANDS.forEach(b => { empty[b.id] = []; });
      setCarModels(empty);
      return;
    }

    const grouped: Record<string, CarModelRow[]> = {};
    BRANDS.forEach(b => { grouped[b.id] = []; });
    (data ?? []).forEach((m: any) => {
      const bid = m.brand_id as string;
      if (!grouped[bid]) grouped[bid] = [];
      grouped[bid].push(m as CarModelRow);
    });
    setCarModels(grouped);
  }, [toast]);

  useEffect(() => {
    if (activeTab === "car-models") fetchAllModels();
  }, [activeTab, fetchAllModels]);

  const handleBrandToggle = (brandId: string) => {
    setExpandedBrand(prev => (prev === brandId ? null : brandId));
  };

  // ── Documents: fetch models when brand changes ───────────────
  useEffect(()=>{
    if(!docBrandId){ setDocModels([]); setDocModelId(""); return; }
    supabase.from("car_models").select("id,name").eq("brand_id",docBrandId).order("name")
      .then(({data})=>{ setDocModels(data??[]); setDocModelId(""); });
  },[docBrandId]);

  // ── Documents: fetch manuals list ────────────────────────────
  const fetchManuals = useCallback(async()=>{
    setManualsLoading(true);
    const res  = await fetch("/api/manuals/list");
    const json = await res.json();
    setManuals(json.manuals??[]);
    setManualsLoading(false);
  },[]);

  useEffect(()=>{ if(activeTab==="documents") fetchManuals(); },[activeTab,fetchManuals]);

  // ── Documents: upload ────────────────────────────────────────
  // ── Documents: upload ────────────────────────────────────────
  const handleManualUpload = async () => {
    setDocError("");
    if(!docBrandId)     { setDocError("Select a brand.");     return; }
    if(!docModelId)     { setDocError("Select a car model."); return; }
    if(!docTitle.trim()){ setDocError("Enter a title.");      return; }
    if(!docFile)        { setDocError("Choose a PDF file.");  return; }
    
    setDocUploading(true);

    try {
      const adminEmail = session?.email ?? "";

      // STEP 1: The Handshake (Get the Presigned URL)
      // Note: Make sure the route matches the filename you created (e.g., /api/manuals/generate-upload-url)
      const urlRes = await fetch("/api/manuals/generate-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail,
        },
        body: JSON.stringify({
          brandId: docBrandId,
          modelId: docModelId,
          fileName: docFile.name,
          fileType: docFile.type,
        }),
      });

      const urlJson = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlJson.error ?? "Failed to get upload URL");

      const { signedUrl, fileKey } = urlJson;

      // STEP 2: The Direct Upload (Bypass Next.js, send straight to Backblaze)
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        body: docFile,
        headers: {
          "Content-Type": docFile.type,
        },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload PDF directly to storage.");

      // STEP 3: The Record (Save metadata to Supabase)
      // Note: You must create this route: /api/manuals/save-metadata
      const dbRes = await fetch("/api/manuals/save-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail,
        },
        body: JSON.stringify({
          brandId: docBrandId,
          modelId: docModelId,
          manualType: docManualType,
          title: docTitle.trim(),
          fileKey: fileKey,
          fileName: docFile.name,
          fileSize: docFile.size,
        }),
      });

      const dbJson = await dbRes.json();
      if (!dbRes.ok) throw new Error(dbJson.error ?? "Failed to save metadata to database.");

      // Cleanup on success
      toast(`"${docTitle.trim()}" uploaded successfully.`);
      setDocTitle(""); 
      setDocFile(null); 
      setDocBrandId(""); 
      setDocModelId(""); 
      setDocModels([]);
      fetchManuals();

    } catch (err: any) {
      console.error("Upload error:", err);
      setDocError(err.message ?? "An unexpected upload error occurred.");
    } finally {
      setDocUploading(false);
    }
  };

  // ── Documents: open viewer ───────────────────────────────────
  const handleOpenViewer = async(manualId:string)=>{
    setViewManualId(manualId); setViewUrls(null); setViewUrlLoading(true);
    const res  = await fetch(`/api/manuals/url?id=${manualId}`);
    const json = await res.json();
    setViewUrls(json); setViewUrlLoading(false);
  };

  // ── Documents: delete ────────────────────────────────────────
  const handleDeleteManual = async()=>{
    if(!deleteManualId||!session?.email) return;
    setDeleteManualLoading(true);
    const res = await fetch("/api/manuals/delete",{
      method:"DELETE",
      headers:{"Content-Type":"application/json","x-admin-email":session.email},
      body:JSON.stringify({manual_id:deleteManualId}),
    });
    if(res.ok){
      setManuals(prev=>prev.filter(m=>m.id!==deleteManualId));
      toast(`"${deleteManualName}" deleted.`);
    } else {
      const j=await res.json(); toast(j.error??"Delete failed.","err");
    }
    setDeleteManualLoading(false); setDeleteManualId(null); setDeleteManualName("");
  };

  // ── Add model ────────────────────────────────────────────────
  const handleAddModelSubmit=async()=>{
    if(!addModelFor) return; setAddError("");
    if(!addForm.name.trim()){setAddError("Model name required.");return;}
    if(!addForm.category.trim()){setAddError("Model type required.");return;}
    if(!addForm.years.trim()){setAddError("Year required.");return;}
    setAddLoading(true);
    try {
      const res=await fetch("/api/car-models-add",{method:"POST",headers:{"Content-Type":"application/json","x-admin-email":session?.email??""},
        body:JSON.stringify({brand_id:addModelFor,name:addForm.name.trim(),category:addForm.category.trim(),years:addForm.years.trim(),info:addForm.info.trim()||null})});
      const json=await res.json();
      if(!res.ok){setAddError(json.error??"Error.");setAddLoading(false);return;}
      let newModel:CarModelRow={...json.model,brand_id:addModelFor};

      if(addForm.imageFile){
        const fd=new FormData();
        fd.append("file",addForm.imageFile);
        fd.append("model_id",newModel.id);
        const imgRes=await fetch("/api/car-models-image-upload",{method:"POST",headers:{"x-admin-email":session?.email??""},body:fd});
        const imgJson=await imgRes.json();
        if(imgRes.ok) newModel={...newModel,model_img:`${imgJson.url}?t=${Date.now()}`};
      }

      fetch("/api/car-models-storage-sync",{method:"POST",headers:{"x-admin-email":session?.email??""}}).catch(()=>{});
      setCarModels(prev=>({...prev,[addModelFor]:[...(prev[addModelFor]??[]),newModel]}));
      toast(`"${newModel.name}" added to ${BRANDS.find(b=>b.id===addModelFor)?.name}.`);
      setAddModelFor(null); setAddForm(emptyAdd());
    } catch{ setAddError("Network error."); }
    setAddLoading(false);
  };

  // ── Edit model ───────────────────────────────────────────────
  const handleEditSubmit=async()=>{
    if(!editModel||!editForm) return; setEditError("");
    if(!editForm.name.trim()){setEditError("Model name required.");return;}
    if(!editForm.category.trim()){setEditError("Model type required.");return;}
    if(!editForm.years.trim()){setEditError("Year required.");return;}
    setEditLoading(true);
    try {
      const res=await fetch("/api/car-models-update",{method:"PATCH",
        headers:{"Content-Type":"application/json","x-admin-email":session?.email??""},
        body:JSON.stringify({model_id:editModel.id,name:editForm.name.trim(),category:editForm.category.trim(),years:editForm.years.trim(),info:editForm.info.trim()||null})});
      const json=await res.json();
      if(!res.ok){setEditError(json.error??"Error.");setEditLoading(false);return;}
      let updated:CarModelRow={...json.model};

      if(editForm.imageFile){
        const fd=new FormData();
        fd.append("file",editForm.imageFile);
        fd.append("model_id",editModel.id);
        const imgRes=await fetch("/api/car-models-image-upload",{method:"POST",headers:{"x-admin-email":session?.email??""},body:fd});
        const imgJson=await imgRes.json();
        if(imgRes.ok) updated={...updated,model_img:`${imgJson.url}?t=${Date.now()}`};
      }

      setCarModels(prev=>{
        const brandList=prev[editModel.brand_id];
        if(!Array.isArray(brandList)) return prev;
        return{...prev,[editModel.brand_id]:brandList.map(m=>m.id===editModel.id?{...updated,brand_id:editModel.brand_id}:m)};
      });
      toast(`"${updated.name}" updated.`);
      setEditModel(null); setEditForm(null);
    } catch{ setEditError("Network error."); }
    setEditLoading(false);
  };

  // ── Delete model ─────────────────────────────────────────────
  const handleDeleteModel=async()=>{
    if(!deleteModel) return;
    setDeleteLoading(true);
    const res=await fetch("/api/car-models-update",{method:"DELETE",
      headers:{"Content-Type":"application/json","x-admin-email":session?.email??""},
      body:JSON.stringify({model_id:deleteModel.id})});
    if(res.ok){
      setCarModels(prev=>{
        const brandList=prev[deleteModel.brand_id];
        if(!Array.isArray(brandList)) return prev;
        return{...prev,[deleteModel.brand_id]:brandList.filter(m=>m.id!==deleteModel.id)};
      });
      toast(`"${deleteModel.name}" deleted.`);
    } else {
      const j=await res.json(); toast(j.error??"Delete failed.","err");
    }
    setDeleteLoading(false);
    setDeleteModel(null);
  };

  // ── Delete user ──────────────────────────────────────────────
  const handleDeleteUser=async()=>{
    if(!deleteUser||!session?.email) return;
    if(deleteUserConfirm.trim().toLowerCase()!==(deleteUser.name??"").trim().toLowerCase()){
      toast("Name confirmation does not match. Deletion cancelled.","err");
      return;
    }
    setDeleteUserLoading(true);
    const res=await fetch("/api/admin-delete-user",{method:"DELETE",
      headers:{"Content-Type":"application/json","x-admin-email":session.email},
      body:JSON.stringify({user_id:deleteUser.user_id,confirm_name:deleteUserConfirm.trim()})});
    if(res.ok){
      setUsers(prev=>prev.filter(u=>u.user_id!==deleteUser.user_id));
      setUserStatuses(prev=>{const n={...prev};delete n[deleteUser.user_id];return n;});
      toast(`"${deleteUser.name}" has been deleted.`);
    } else {
      const j=await res.json(); toast(j.error??"Delete failed.","err");
    }
    setDeleteUserLoading(false);
    setDeleteUser(null);
    setDeleteUserConfirm("");
  };

  if (!session) return null;

  const filteredUsers = fuzzyUserFilter(users, searchUser);

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">

      {/* ── Car Model Image Crop Modals ── */}
      {addCropSrc && (
        <CarImageCropper
          src={addCropSrc}
          onCropped={(blob) => {
            const file = new File([blob], "car-model-image.jpg", { type: "image/jpeg" });
            setAddForm(prev => ({ ...prev, imageFile: file, imagePreview: URL.createObjectURL(blob) }));
            setAddCropSrc(null);
          }}
          onCancel={() => setAddCropSrc(null)}
        />
      )}
      {editCropSrc && (
        <CarImageCropper
          src={editCropSrc}
          onCropped={(blob) => {
            const file = new File([blob], "car-model-image.jpg", { type: "image/jpeg" });
            setEditForm(prev => prev ? { ...prev, imageFile: file, imagePreview: URL.createObjectURL(blob) } : prev);
            setEditCropSrc(null);
          }}
          onCancel={() => setEditCropSrc(null)}
        />
      )}

      {/* ── Notification toast ── */}
      {noticeMsg && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 text-sm font-bold shadow-lg border
          ${noticeMsg.type==="ok"?"bg-green-50 border-green-200 text-green-800":"bg-red-50 border-red-200 text-red-800"}`}>
          {noticeMsg.text}
        </div>
      )}

      {/* ── Top bar ── */}
      <header className="bg-ink text-primary-foreground flex items-center px-6 h-14 shrink-0 sticky top-0 z-50 border-b border-white/10">
        <div className="flex items-center gap-2 mr-auto">
          <Shield size={16} className="text-primary"/>
          <span className="font-display font-bold tracking-wide text-sm">
            <span className="text-primary">AUTO</span>BOT Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-primary-foreground/50 font-mono hidden md:block">{session.name}</span>
          <button
            className="relative p-1.5 hover:bg-secondary/20 rounded"
            onClick={() => setActiveTab("guides")}
            title={pendingCount > 0 ? `${pendingCount} guide(s) pending review` : "No pending guides"}
          >
            <Bell size={14} className="text-primary-foreground/70"/>
            {pendingCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-[7px] text-white font-bold leading-none">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              </span>
            )}
          </button>
          <button onClick={()=>{clearAdminSession();router.push("/login");}}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-foreground/70 hover:text-primary-foreground border border-white/10 hover:border-white/30 transition-all">
            <LogOut size={12}/> Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── Sidebar ── */}
        <aside className="w-52 shrink-0 border-r border-border bg-background flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="flex flex-col p-3 gap-0.5">
            {([
              {id:"users",     icon:<Users size={14}/>,        label:"Users"},
              {id:"guides",    icon:<BookOpen size={14}/>,     label:"Guides", badge: pendingCount},
              {id:"car-models",icon:<Car size={14}/>,          label:"Car Models"},
              {id:"documents", icon:<FileText size={14}/>,     label:"Documents"},
              {id:"forum",     icon:<MessageSquare size={14}/>,label:"Forum"},
            ] as {id:Tab;icon:React.ReactNode;label:string;badge?:number}[]).map(item=>(
              <button key={item.id} onClick={()=>setActiveTab(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition-all text-left
                  ${activeTab===item.id
                    ?"bg-ink text-primary-foreground"
                    :"text-muted-foreground hover:bg-secondary hover:text-ink"}`}>
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0
                  ? <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">{item.badge > 99 ? "99+" : item.badge}</span>
                  : null}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto p-8">

          {/* ── USERS ── */}
          {activeTab==="users"&&(
            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Users</p>
                  <h2 className="font-black uppercase tracking-tighter text-base mt-0.5">User Management</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchUsers}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-secondary transition-colors text-xs font-semibold">
                    <RefreshCw size={12} className={`text-muted-foreground ${loadingUsers?"animate-spin":""}`}/>
                    <span className="text-muted-foreground">Refresh</span>
                  </button>
                  <button
                    onClick={async()=>{
                      if(!session?.email) return;
                      setCleanupLoading(true);
                      try{
                        const res=await fetch("/api/admin-guides-folder-cleanup",{
                          method:"POST",
                          headers:{"Content-Type":"application/json","x-admin-email":session.email},
                        });
                        const j=await res.json();
                        if(res.ok){
                          if(j.orphaned?.length>0){
                            toast(`Cleanup done — removed ${j.orphaned.length} orphaned folder(s), ${j.deleted} file(s).`);
                          } else {
                            toast("No orphaned Guide folders found. Storage is clean.");
                          }
                        } else {
                          toast(j.error??"Cleanup failed.","err");
                        }
                      } catch(e:any){ toast(e.message??"Cleanup failed.","err"); }
                      setCleanupLoading(false);
                    }}
                    disabled={cleanupLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-300 hover:bg-orange-50 transition-colors text-xs font-semibold disabled:opacity-60">
                    {cleanupLoading
                      ? <RefreshCw size={12} className="text-orange-500 animate-spin"/>
                      : <Trash2 size={12} className="text-orange-500"/>}
                    <span className="text-orange-500">Cleanup Orphans</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 border border-border bg-background px-3 mb-4 w-full max-w-xs">
                <Search size={13} className="text-muted-foreground shrink-0"/>
                <input value={searchUser} onChange={e=>setSearchUser(e.target.value)}
                  placeholder="Search users..." className="flex-1 h-9 bg-transparent text-xs focus:outline-none font-mono"/>
              </div>
              <div className="border border-border bg-background overflow-hidden">
                <div className="grid grid-cols-[1fr_1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_auto] gap-3 px-5 py-2.5 bg-secondary border-b border-border">
                  {["Name","Email","Provider","Account Created","Last Sign In","Status","Actions"].map(h=>(
                    <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{h}</span>
                  ))}
                </div>
                {loadingUsers
                  ?<div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground"><RefreshCw size={13} className="animate-spin"/> Loading users...</div>
                  :filteredUsers.length===0
                    ?<div className="py-10 text-center text-sm text-muted-foreground">No users found.</div>
                    :filteredUsers.map((u,i)=>(
                      <UserTableRow key={u.user_id} user={u} status={userStatuses[u.user_id]??"Active"}
                        isLast={i===filteredUsers.length-1}
                        onStatusChange={(uid,s)=>setUserStatuses(p=>({...p,[uid]:s}))}
                        onToast={toast}
                        onDeleteUser={setDeleteUser}
                        adminEmail={session.email}/>
                    ))
                }
              </div>
            </section>
          )}

          {/* ── GUIDES ── */}
          {activeTab==="guides"&&(
            <AdminGuidesTab
              adminEmail={session.email}
              onToast={toast}
              onPendingCountChange={setPendingCount}
            />
          )}

          {/* ── CAR MODELS ── */}
          {activeTab==="car-models"&&(
            <section>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Car Models</p>
                  <h2 className="font-black uppercase tracking-tighter text-base mt-0.5">Car Model Management</h2>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={async()=>{
                      setFkeyFixLoading(true);
                      setFkeyFixResult(null);
                      try{
                        const [gRes,fRes]=await Promise.all([
                          fetch("/api/guides-model-id-fix",{method:"POST",headers:{"x-admin-email":session?.email??""}}),
                          fetch("/api/forum-fix-model-ids",{method:"POST",headers:{"x-admin-email":session?.email??""}})
                        ]);
                        const [gJ,fJ]=await Promise.all([gRes.json(),fRes.json()]);
                        if(gJ.error||fJ.error){toast(`Fix failed: ${gJ.error??fJ.error}`,"err");}
                        else{
                          setFkeyFixResult({guides:gJ,forum:fJ});
                          toast(`Done — ${(gJ.fixed??0)+(fJ.fixed??0)} record(s) fixed.`,"ok");
                        }
                      }catch(e:any){toast(`Fix error: ${e.message}`,"err");}
                      finally{setFkeyFixLoading(false);}
                    }}
                    disabled={fkeyFixLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold border border-primary text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50">
                    {fkeyFixLoading ? <RefreshCw size={11} className="animate-spin"/> : <RefreshCw size={11}/>}
                    Fix FKey IDs
                  </button>
                  {fkeyFixResult&&(
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Guides: ✓ {fkeyFixResult.guides?.fixed??0} fixed · {fkeyFixResult.guides?.skipped??0} ok · {fkeyFixResult.guides?.unmatched??0} unmatched
                      {" | "}Forum: ✓ {fkeyFixResult.forum?.fixed??0} fixed · {fkeyFixResult.forum?.skipped??0} ok · {fkeyFixResult.forum?.unmatched??0} unmatched
                    </span>
                  )}
                  <button onClick={fetchAllModels} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold border border-border hover:bg-secondary transition-colors">
                    <RefreshCw size={11}/> Refresh
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {BRANDS.map(brand=>{
                  const models=carModels[brand.id];
                  return(
                    <div key={brand.id} className="border border-border bg-background overflow-hidden">
                      <button
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-secondary/50 transition-colors text-left"
                        onClick={()=>handleBrandToggle(brand.id)}>
                        <img src={`/car-makers/${brand.id}.png`} alt={brand.name} className="w-7 h-7 object-contain grayscale" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                        <span className="font-bold text-xs uppercase tracking-widest flex-1">{brand.name}</span>
                        {models===null||models===undefined
                          ?<span className="text-[9px] font-mono text-muted-foreground uppercase"><RefreshCw size={9} className="inline animate-spin mr-1"/>loading</span>
                          :<span className="text-[9px] font-mono text-muted-foreground uppercase">{models.length} model{models.length!==1?"s":""}</span>
                        }
                        <ChevronRight size={13} className={`text-muted-foreground transition-transform duration-200 ${expandedBrand===brand.id?"rotate-90":""}`}/>
                      </button>
                      {expandedBrand===brand.id&&(
                        <div className="border-t border-border bg-secondary/20 px-5 py-4">
                          {(models===null||models===undefined)&&<div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><RefreshCw size={11} className="animate-spin"/> Loading...</div>}
                          {Array.isArray(models)&&models.length===0&&<p className="text-xs text-muted-foreground py-1 mb-3">No models yet for this brand.</p>}
                          {Array.isArray(models)&&models.length>0&&(
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                              {models.map(m=>(
                                <div key={m.id} className="bg-background border border-border overflow-hidden group">
                                  <div className="relative aspect-video bg-secondary/50 flex items-center justify-center overflow-hidden">
                                    <img
                                      src={resolveCarModelImage(m.model_img, m.category)}
                                      alt={m.name}
                                      className={`w-full h-full object-cover${!m.model_img?" opacity-80":""}`}
                                      onError={(e)=>{(e.target as HTMLImageElement).src="/no-thumbnail.png";}}
                                    />
                                  </div>
                                  <div className="px-3 py-2.5">
                                    <p className="font-bold text-xs truncate">{m.name}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.category}{m.years?` · ${m.years}`:""}</p>
                                    {m.info&&<p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{m.info}</p>}
                                  </div>
                                  <div className="flex border-t border-border">
                                    <button
                                      onClick={()=>{setEditModel({...m,brand_id:brand.id});setEditForm(emptyEdit({...m,brand_id:brand.id}));setEditError("");}}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold hover:bg-secondary transition-colors border-r border-border">
                                      <Edit2 size={11}/> Edit
                                    </button>
                                    <button
                                      onClick={()=>setDeleteModel({...m,brand_id:brand.id})}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 transition-colors">
                                      <Trash2 size={11}/> Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={()=>{setAddForm(emptyAdd());setAddError("");setAddModelFor(brand.id);}}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border border-dashed border-border hover:border-ink hover:bg-secondary transition-all mt-1">
                            <Plus size={11}/> Add Model to {brand.name}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── DOCUMENTS ── */}
          {activeTab==="documents"&&(
            <section>
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Documents</p>
                  <h2 className="font-black uppercase tracking-tighter text-base mt-0.5">Document Management</h2>
                </div>
                <button onClick={fetchManuals}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-secondary transition-colors text-xs font-semibold">
                  <RefreshCw size={12} className={manualsLoading?"animate-spin":""}/>
                  <span className="text-muted-foreground">Refresh</span>
                </button>
              </div>

              {/* Upload panel */}
              <div className="border border-border bg-background p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Upload size={14} className="text-muted-foreground"/>
                  <h3 className="text-xs font-black uppercase tracking-tighter">Upload Vehicle Manual (PDF)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Brand <span className="text-primary">*</span></label>
                    <select value={docBrandId} onChange={e=>setDocBrandId(e.target.value)}
                      className="w-full border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-ink">
                      <option value="">— Select Brand —</option>
                      {BRANDS.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Car Model <span className="text-primary">*</span></label>
                    <select value={docModelId} onChange={e=>setDocModelId(e.target.value)}
                      disabled={!docBrandId||docModels.length===0}
                      className="w-full border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-ink disabled:opacity-50">
                      <option value="">{!docBrandId?"Select a brand first":docModels.length===0?"No models found":"— Select Model —"}</option>
                      {docModels.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Manual Type <span className="text-primary">*</span></label>
                    <select value={docManualType} onChange={e=>setDocManualType(e.target.value as any)}
                      className="w-full border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-ink">
                      <option value="user_manual">User Manual</option>
                      <option value="service_manual">Service Manual</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Title <span className="text-primary">*</span></label>
                    <input type="text" placeholder="e.g. Corolla Cross 2023 Owner's Manual"
                      value={docTitle} onChange={e=>setDocTitle(e.target.value)}
                      className="w-full border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-ink"/>
                  </div>
                </div>
                <div className="space-y-1 mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">PDF File <span className="text-primary">*</span></label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border hover:border-ink cursor-pointer text-xs font-bold text-muted-foreground hover:text-ink transition-all">
                      <FileText size={13}/> {docFile ? docFile.name : "Choose PDF"}
                      <input type="file" accept=".pdf,application/pdf" className="hidden"
                        onChange={e=>{ const f=e.target.files?.[0]; if(f) setDocFile(f); e.target.value=""; }}/>
                    </label>
                    {docFile&&<span className="text-[10px] text-muted-foreground font-mono">{(docFile.size/1024/1024).toFixed(2)} MB</span>}
                    {docFile&&(
                      <button onClick={()=>setDocFile(null)} className="p-1 hover:bg-secondary rounded">
                        <X size={12} className="text-muted-foreground"/>
                      </button>
                    )}
                  </div>
                </div>
                {docError&&<p className="text-xs text-red-600 flex items-center gap-1.5 mb-3"><XCircle size={12}/> {docError}</p>}
                <button onClick={handleManualUpload} disabled={docUploading}
                  className="flex items-center gap-2 px-5 py-2 bg-ink text-white text-xs font-bold hover:bg-ink/80 disabled:opacity-60 transition-colors">
                  {docUploading?<><RefreshCw size={12} className="animate-spin"/> Uploading...</>:<><Upload size={12}/> Upload Manual</>}
                </button>
              </div>

              {/* Manuals table */}
              <div className="border border-border bg-background overflow-hidden">
                <div className="grid grid-cols-[2.5fr_1fr_0.8fr_0.7fr_auto] gap-4 px-5 py-2.5 bg-secondary border-b border-border">
                  {["Title","Model","Type","Size","Actions"].map(h=>(
                    <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{h}</span>
                  ))}
                </div>
                {manualsLoading
                  ?<div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground"><RefreshCw size={13} className="animate-spin"/> Loading...</div>
                  :manuals.length===0
                    ?<div className="py-14 text-center text-sm text-muted-foreground">No manuals uploaded yet.</div>
                    :manuals.map((m,i)=>(
                      <div key={m.id}
                        className={`grid grid-cols-[2.5fr_1fr_0.8fr_0.7fr_auto] gap-4 px-5 py-3 items-center hover:bg-secondary/30 transition-colors ${i<manuals.length-1?"border-b border-border":""}`}>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{m.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{m.file_name}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate">{m.car_models?.name??"-"}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 border w-fit
                          ${m.manual_type==="user_manual"
                            ?"bg-blue-50 text-blue-700 border-blue-200"
                            :"bg-amber-50 text-amber-700 border-amber-200"}`}>
                          {m.manual_type==="user_manual"?"User":"Service"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {(m.file_size/1024/1024).toFixed(1)} MB
                        </span>
                        <div className="flex items-center gap-1">
                          <button title="View PDF" onClick={()=>handleOpenViewer(m.id)}
                            className="p-1.5 hover:bg-secondary rounded">
                            <FileText size={13} className="text-blue-500"/>
                          </button>
                          <button title="Delete" onClick={()=>{ setDeleteManualId(m.id); setDeleteManualName(m.title); }}
                            className="p-1.5 hover:bg-red-50 rounded">
                            <Trash2 size={13} className="text-red-500"/>
                          </button>
                        </div>
                      </div>
                    ))
                }
              </div>
            </section>
          )}

          {/* ── FORUM ── */}
          {activeTab==="forum"&&(
            <section>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Forum</p>
                  <h2 className="font-black uppercase tracking-tighter text-base mt-0.5">Forum Moderation</h2>
                </div>
                <button onClick={fetchReportedPosts}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-secondary transition-colors text-xs font-semibold">
                  <RefreshCw size={12} className={`text-muted-foreground ${forumLoading?"animate-spin":""}`}/>
                  <span className="text-muted-foreground">Refresh</span>
                </button>
              </div>
              <div className="border border-border bg-background overflow-hidden">
                <div className="grid grid-cols-[2.5fr_1.5fr_0.8fr_auto] gap-4 px-5 py-2.5 bg-secondary border-b border-border">
                  {["Post","Author","Status","Actions"].map(h=>(
                    <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{h}</span>
                  ))}
                </div>
                {forumLoading
                  ? <div className="py-14 text-center text-xs text-muted-foreground">Loading...</div>
                  : reportedPosts.length === 0
                    ? <div className="py-14 text-center text-sm text-muted-foreground">No reported posts.</div>
                    : reportedPosts.map((p, i) => (
                        <div key={p.forum_id}
                          className={`grid grid-cols-[2.5fr_1.5fr_0.8fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-secondary/30 transition-colors ${i < reportedPosts.length - 1 ? "border-b border-border" : ""}`}>
                          <span className="text-xs font-medium truncate" title={p.title}>{p.title}</span>
                          <span className="text-xs text-muted-foreground truncate">{p.Users?.name ?? "Unknown"}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 border w-fit bg-red-50 text-red-600 border-red-200">
                            Reported
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewReportedPost(p)}
                              className="p-1.5 hover:bg-secondary rounded"
                              title="View Post"
                            >
                              <Eye size={13} className="text-muted-foreground"/>
                            </button>
                            <button
                              onClick={() => handleIgnoreReport(p.forum_id)}
                              className="p-1.5 hover:bg-yellow-50 rounded"
                              title="Ignore Report"
                            >
                              <XCircle size={13} className="text-yellow-500"/>
                            </button>
                            <button
                              onClick={() => handleDeleteReportedPost(p.forum_id)}
                              className="p-1.5 hover:bg-red-50 rounded"
                              title="Delete Post"
                            >
                              <Trash2 size={13} className="text-red-500"/>
                            </button>
                          </div>
                        </div>
                      ))
                }
              </div>
            </section>
          )}

        </main>
      </div>

      {/* ══ VIEW REPORTED POST MODAL ══ */}
      {viewReportedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4"
          onClick={() => setViewReportedPost(null)}>
          <div className="w-full max-w-lg bg-background border border-border shadow-[8px_8px_0_0_var(--ink)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary sticky top-0">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground capitalize">{viewReportedPost.brand_id}</p>
                <h3 className="font-black uppercase tracking-tighter text-sm mt-0.5">{viewReportedPost.title}</h3>
              </div>
              <button onClick={() => setViewReportedPost(null)} className="p-1 hover:bg-border rounded">
                <X size={15} className="text-muted-foreground"/>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Author</p>
                <p className="text-sm">{viewReportedPost.Users?.name ?? "Unknown"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Post Content</p>
                <p className="text-sm leading-relaxed text-ink/80 border border-border bg-secondary/30 px-4 py-3">{viewReportedPost.content}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Report Reason</p>
                <p className="text-sm text-red-600 font-medium">{viewReportedPost.report_reason ?? "No reason provided"}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background">
              <button onClick={() => { handleIgnoreReport(viewReportedPost.forum_id); setViewReportedPost(null); }}
                className="px-4 py-2 text-xs font-bold border border-yellow-300 text-yellow-600 hover:bg-yellow-50">
                Ignore Report
              </button>
              <button onClick={() => { handleDeleteReportedPost(viewReportedPost.forum_id); setViewReportedPost(null); }}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5">
                <Trash2 size={11}/> Delete Post
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ══ ADD MODEL MODAL ══ */}
      {addModelFor&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-background border border-border shadow-[8px_8px_0_0_var(--ink)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary sticky top-0">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{BRANDS.find(b=>b.id===addModelFor)?.name}</p>
                <h3 className="font-black uppercase tracking-tighter text-sm mt-0.5">Add New Model</h3>
              </div>
              <button onClick={()=>{setAddModelFor(null);setAddError("");}} className="p-1 hover:bg-border rounded"><X size={15} className="text-muted-foreground"/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Model Name <span className="text-primary">*</span></label>
                <input type="text" placeholder="e.g. Corolla Cross" value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))} className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink" autoFocus/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Model Type <span className="text-primary">*</span></label>
                <select value={addForm.category} onChange={e=>setAddForm(f=>({...f,category:e.target.value}))} className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink">
                  <option value="">— Select type —</option>
                  {MODEL_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Year <span className="text-primary">*</span></label>
                <input type="text" placeholder="e.g. 2023  or  2020–2024" value={addForm.years} onChange={e=>setAddForm(f=>({...f,years:e.target.value}))} className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink"/>
                <p className="text-[10px] text-muted-foreground">Single year or range (e.g. 2020–2024).</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Info <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional)</span></label>
                <textarea rows={2} placeholder="Brief notes about this model..." value={addForm.info} onChange={e=>setAddForm(f=>({...f,info:e.target.value}))} className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Model Image <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional — 16:9, cropped)</span></label>
                {addForm.imagePreview
                  ?<div className="relative w-full border border-border overflow-hidden" style={{aspectRatio:"16/9"}}>
                    <img src={addForm.imagePreview} alt="preview" className="w-full h-full object-cover"/>
                    <button onClick={()=>setAddForm(f=>({...f,imageFile:null,imagePreview:""}))} className="absolute top-1 right-1 bg-ink/70 text-white p-0.5 rounded"><X size={10}/></button>
                    <button onClick={()=>addImageRef.current?.click()} className="absolute bottom-1 right-1 bg-ink/70 text-white px-2 py-0.5 text-[9px] font-bold rounded">Change</button>
                  </div>
                  :<button onClick={()=>addImageRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-dashed border-border hover:border-ink text-xs font-bold text-muted-foreground hover:text-ink transition-all">
                    <Upload size={13}/> Choose Image (will crop to 16:9)
                  </button>
                }
                <input ref={addImageRef} type="file" accept="image/*" className="hidden"
                  onChange={e=>{const f=e.target.files?.[0];if(f){setAddCropSrc(URL.createObjectURL(f));}e.target.value="";}}/>
              </div>
              {addError&&<p className="text-xs text-red-600 flex items-center gap-1.5"><XCircle size={12}/> {addError}</p>}
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background">
              <button onClick={()=>{setAddModelFor(null);setAddError("");}} className="px-4 py-2 text-xs font-bold border border-border hover:bg-secondary" disabled={addLoading}>Cancel</button>
              <button onClick={handleAddModelSubmit} disabled={addLoading} className="px-5 py-2 text-xs font-bold bg-primary text-white hover:brightness-110 disabled:opacity-60 flex items-center gap-2">
                {addLoading?<><RefreshCw size={12} className="animate-spin"/> Saving...</>:<><Plus size={12}/> Add Model</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ EDIT MODEL MODAL ══ */}
      {editModel&&editForm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-background border border-border shadow-[8px_8px_0_0_var(--ink)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary sticky top-0">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Edit Model</p>
                <h3 className="font-black uppercase tracking-tighter text-sm mt-0.5">{editModel.name}</h3>
              </div>
              <button onClick={()=>{setEditModel(null);setEditForm(null);setEditError("");}} className="p-1 hover:bg-border rounded"><X size={15} className="text-muted-foreground"/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Model Name <span className="text-primary">*</span></label>
                <input type="text" value={editForm.name} onChange={e=>setEditForm(f=>f?{...f,name:e.target.value}:f)} className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink" autoFocus/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Model Type <span className="text-primary">*</span></label>
                <select value={editForm.category} onChange={e=>setEditForm(f=>f?{...f,category:e.target.value}:f)} className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink">
                  <option value="">— Select type —</option>
                  {MODEL_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Year <span className="text-primary">*</span></label>
                <input type="text" value={editForm.years} onChange={e=>setEditForm(f=>f?{...f,years:e.target.value}:f)} className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Info</label>
                <textarea rows={2} value={editForm.info} onChange={e=>setEditForm(f=>f?{...f,info:e.target.value}:f)} className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                  {editForm.imagePreview ? "Replace Image" : "Add Image"} <span className="text-muted-foreground font-normal normal-case tracking-normal">(16:9, cropped)</span>
                </label>
                {editForm.imagePreview
                  ?<div className="space-y-2">
                    <div className="relative w-full border border-border overflow-hidden" style={{aspectRatio:"16/9"}}>
                      <img src={editForm.imagePreview} alt="preview" className="w-full h-full object-cover"/>
                      <button onClick={()=>editImageRef.current?.click()} className="absolute bottom-1 right-1 bg-ink/70 text-white px-2 py-0.5 text-[9px] font-bold rounded">Replace</button>
                    </div>
                  </div>
                  :<button onClick={()=>editImageRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-dashed border-border hover:border-ink text-xs font-bold text-muted-foreground hover:text-ink transition-all">
                    <Upload size={13}/> Choose Image (will crop to 16:9)
                  </button>
                }
                <input ref={editImageRef} type="file" accept="image/*" className="hidden"
                  onChange={e=>{const f=e.target.files?.[0];if(f){setEditCropSrc(URL.createObjectURL(f));}e.target.value="";}}/>
                {editForm.imageFile&&<p className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle size={10}/> New image selected — will be saved on update.</p>}
              </div>
              {editError&&<p className="text-xs text-red-600 flex items-center gap-1.5"><XCircle size={12}/> {editError}</p>}
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background">
              <button onClick={()=>{setEditModel(null);setEditForm(null);setEditError("");}} className="px-4 py-2 text-xs font-bold border border-border hover:bg-secondary" disabled={editLoading}>Cancel</button>
              <button onClick={handleEditSubmit} disabled={editLoading} className="px-5 py-2 text-xs font-bold bg-primary text-white hover:brightness-110 disabled:opacity-60 flex items-center gap-2">
                {editLoading?<><RefreshCw size={12} className="animate-spin"/> Saving...</>:<><CheckCircle size={12}/> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE MODEL CONFIRM MODAL ══ */}
      {deleteModel&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-background border border-border shadow-[6px_6px_0_0_var(--ink)] p-6">
            <div className="flex items-start gap-3 mb-5">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5"/>
              <div>
                <h4 className="font-black uppercase tracking-tighter text-sm">Delete Model?</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  This will permanently delete <strong>{deleteModel.name}</strong> and remove its image from storage. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setDeleteModel(null)} className="px-4 py-2 text-xs font-bold border border-border hover:bg-secondary" disabled={deleteLoading}>Cancel</button>
              <button onClick={handleDeleteModel} disabled={deleteLoading} className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-1.5">
                {deleteLoading?<><RefreshCw size={11} className="animate-spin"/> Deleting...</>:<><Trash2 size={11}/> Yes, Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE USER CONFIRM MODAL ══ */}
      {deleteUser&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-background border border-border shadow-[6px_6px_0_0_var(--ink)] p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5"/>
              <div>
                <h4 className="font-black uppercase tracking-tighter text-sm">Delete User?</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  This will permanently delete <strong>{deleteUser.name}</strong> and all their data,
                  including their Guides storage folder. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                Type the user&apos;s name to confirm
              </label>
              <input
                autoFocus
                value={deleteUserConfirm}
                onChange={e=>setDeleteUserConfirm(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==="Enter" && deleteUserConfirm.trim().toLowerCase()===(deleteUser.name??"").trim().toLowerCase())
                    handleDeleteUser();
                }}
                placeholder={deleteUser.name ?? ""}
                className="w-full border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {deleteUserConfirm.length>0 && deleteUserConfirm.trim().toLowerCase()!==(deleteUser.name??"").trim().toLowerCase() && (
                <p className="text-[10px] text-red-500 mt-1">Name does not match.</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={()=>{setDeleteUser(null);setDeleteUserConfirm("");}}
                className="px-4 py-2 text-xs font-bold border border-border hover:bg-secondary" disabled={deleteUserLoading}>Cancel</button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteUserLoading||deleteUserConfirm.trim().toLowerCase()!==(deleteUser.name??"").trim().toLowerCase()}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 flex items-center gap-1.5">
                {deleteUserLoading?<><RefreshCw size={11} className="animate-spin"/> Deleting...</>:<><Trash2 size={11}/> Yes, Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PDF VIEWER MODAL ══ */}
      {viewManualId&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-4xl bg-background border border-border shadow-[8px_8px_0_0_var(--ink)] flex flex-col" style={{height:"90vh"}}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary shrink-0">
              <h3 className="font-black uppercase tracking-tighter text-sm">PDF Viewer</h3>
              <div className="flex items-center gap-2">
                {viewUrls&&(
                  <a href={viewUrls.downloadUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-secondary text-xs font-bold transition-colors">
                    <Upload size={11} className="rotate-180"/> Download
                  </a>
                )}
                <button onClick={()=>{ setViewManualId(null); setViewUrls(null); }}
                  className="p-1 hover:bg-border rounded"><X size={14}/></button>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-secondary/30">
              {viewUrlLoading
                ?<div className="flex items-center justify-center h-full gap-2 text-xs text-muted-foreground"><RefreshCw size={13} className="animate-spin"/> Loading PDF...</div>
                :viewUrls
                  ?<iframe src={viewUrls.viewUrl} className="w-full h-full border-0" title="PDF Viewer"/>
                  :<div className="flex items-center justify-center h-full text-xs text-red-500">Failed to load PDF.</div>
              }
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE MANUAL CONFIRM MODAL ══ */}
      {deleteManualId&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-background border border-border shadow-[6px_6px_0_0_var(--ink)] p-6">
            <div className="flex items-start gap-3 mb-5">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5"/>
              <div>
                <h4 className="font-black uppercase tracking-tighter text-sm">Delete Manual?</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  This will permanently delete <strong>{deleteManualName}</strong> from storage and the database. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={()=>{ setDeleteManualId(null); setDeleteManualName(""); }}
                className="px-4 py-2 text-xs font-bold border border-border hover:bg-secondary" disabled={deleteManualLoading}>
                Cancel
              </button>
              <button onClick={handleDeleteManual} disabled={deleteManualLoading}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-1.5">
                {deleteManualLoading?<><RefreshCw size={11} className="animate-spin"/> Deleting...</>:<><Trash2 size={11}/> Yes, Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── UserTableRow sub-component ────────────────────────────────
function UserTableRow({
  user, status, isLast, onStatusChange, onToast, onDeleteUser, adminEmail,
}: {
  user: UserRow;
  status: "Active" | "Suspended" | "Pending";
  isLast: boolean;
  onStatusChange: (uid: string, s: "Active" | "Suspended" | "Pending") => void;
  onToast: (m: string, t?: "ok" | "err") => void;
  onDeleteUser: (u: UserRow) => void;
  adminEmail: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleToggleSuspend = async () => {
    const action = status === "Suspended" ? "activate" : "suspend";
    setLoading(true);
    try {
      const res = await fetch("/api/admin-suspend-user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail,
        },
        body: JSON.stringify({ user_id: user.user_id, action }),
      });
      const j = await res.json();
      if (res.ok) {
        const newStatus = action === "suspend" ? "Suspended" : "Active";
        onStatusChange(user.user_id, newStatus);
        onToast(action === "suspend" ? `"${user.name}" suspended.` : `"${user.name}" reactivated.`);
      } else {
        onToast(j.error ?? "Action failed.", "err");
      }
    } catch {
      onToast("Network error.", "err");
    }
    setLoading(false);
  };

  const ss = {
    Active:    "bg-green-50 text-green-700 border-green-200",
    Suspended: "bg-red-50 text-red-600 border-red-200",
    Pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  }[status];

  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
    : "—";

  const lastSignIn = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
    : "Never";

  return (
    <div className={`grid grid-cols-[1fr_1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-secondary/30 transition-colors ${!isLast ? "border-b border-border" : ""}`}>
      <span className="text-xs font-medium truncate" title={user.name}>{user.name}</span>
      <span className="text-xs text-muted-foreground truncate" title={user.email}>{user.email}</span>
      <span className="text-xs text-muted-foreground capitalize" title={user.provider}>{user.provider ?? "—"}</span>
      <span className="text-xs text-muted-foreground">{joined}</span>
      <span className="text-xs text-muted-foreground">{lastSignIn}</span>
      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border w-fit ${ss}`}>{status}</span>
      <div className="flex items-center gap-1">
        {loading
          ? <span className="p-1.5"><RefreshCw size={13} className="animate-spin text-muted-foreground" /></span>
          : status === "Suspended"
            ? <button title="Reactivate" onClick={handleToggleSuspend} className="p-1.5 hover:bg-green-100 rounded"><CheckCircle size={13} className="text-green-600" /></button>
            : <button title="Suspend" onClick={handleToggleSuspend} className="p-1.5 hover:bg-yellow-100 rounded"><Ban size={13} className="text-yellow-600" /></button>
        }
        <button title="Delete" onClick={() => onDeleteUser(user)} disabled={loading} className="p-1.5 hover:bg-red-100 rounded disabled:opacity-40">
          <Trash2 size={13} className="text-red-500" />
        </button>
      </div>
    </div>
  );
}