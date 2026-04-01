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
  Edit2, AlertCircle, ImageIcon,
} from "lucide-react";

const BRANDS = [
  { name:"Toyota",id:"toyota"},{name:"Mitsubishi",id:"mitsubishi"},
  { name:"BYD",id:"byd"},{name:"Suzuki",id:"suzuki"},
  { name:"Isuzu",id:"isuzu"},{name:"Ford",id:"ford"},
  { name:"Nissan",id:"nissan"},{name:"Honda",id:"honda"},
  { name:"Hyundai",id:"hyundai"},{name:"Kia",id:"kia"},
  { name:"Geely",id:"geely"},{name:"MG",id:"mg"},
];
const MODEL_TYPES = ["Sedan","SUV","Hatchback","Pickup Truck","Van / MPV","Crossover","Coupe","Convertible","Wagon","Electric"];

type Tab = "users"|"guides"|"car-models"|"documents"|"reports"|"forum";

interface UserRow     { user_id:string; name:string; created_at:string; }
interface CarModelRow { id:string; name:string; slug:string; category:string; years:string; info?:string; model_img?:string; brand_id:string; }
interface AddModelForm{ name:string; category:string; years:string; info:string; imageFile:File|null; imagePreview:string; }
interface EditModelForm{ name:string; category:string; years:string; info:string; imageFile:File|null; imagePreview:string; }

const emptyAdd  = ():AddModelForm  => ({name:"",category:"",years:"",info:"",imageFile:null,imagePreview:""});
const emptyEdit = (m:CarModelRow):EditModelForm => ({name:m.name,category:m.category,years:m.years,info:m.info??"",imageFile:null,imagePreview:m.model_img??""});

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

  // Edit model modal
  const [editModel,    setEditModel]    = useState<CarModelRow|null>(null);
  const [editForm,     setEditForm]     = useState<EditModelForm|null>(null);
  const [editLoading,  setEditLoading]  = useState(false);
  const [editError,    setEditError]    = useState("");
  const editImageRef = useRef<HTMLInputElement|null>(null);

  // Delete model confirm
  const [deleteModel,       setDeleteModel]       = useState<CarModelRow|null>(null);
  const [deleteLoading,     setDeleteLoading]     = useState(false);

  // Delete user confirm
  const [deleteUser,        setDeleteUser]        = useState<UserRow|null>(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  const toast = useCallback((text:string, type:"ok"|"err"="ok")=>{
    setNoticeMsg({text,type}); setTimeout(()=>setNoticeMsg(null),5000);
  },[]);

  // ── Fetch pending count on mount (for notification bell) ──
  useEffect(()=>{
    if (!session?.email) return;
    fetch("/api/guides-review", { headers:{ "x-admin-email": session.email } })
      .then(r=>r.json())
      .then(j=>{ setPendingCount(j.pendingCount ?? 0); })
      .catch(()=>{});
  },[session?.email]);

  // ── Users ──────────────────────────────────────────────────
  const fetchUsers = useCallback(async()=>{
    setLoadingUsers(true);
    const{data,error}=await supabase.from("Users").select("user_id,name,created_at").order("created_at",{ascending:false});
    if(error){ toast(`Failed to load users: ${error.message}`,"err"); }
    else {
      const rows:UserRow[]=(data??[]).map((u:any)=>({user_id:u.user_id,name:u.name??"Unknown",created_at:u.created_at??""}));
      setUsers(rows);
      const map:Record<string,"Active"|"Suspended"|"Pending">={};
      rows.forEach(r=>{map[r.user_id]="Active";});
      setUserStatuses(map);
    }
    setLoadingUsers(false);
  },[toast]);

  useEffect(()=>{ if(activeTab==="users") fetchUsers(); },[activeTab,fetchUsers]);

  // ── Car models ─────────────────────────────────────────────
  const loadModels = async(brandId:string)=>{
    if(carModels[brandId]!==undefined) return;
    setCarModels(prev=>({...prev,[brandId]:null}));
    const res=await fetch(`/api/car-models/${brandId}`);
    const json=await res.json();
    setCarModels(prev=>({...prev,[brandId]:json.models??[]}));
  };
  const handleBrandToggle=(brandId:string)=>{
    if(expandedBrand===brandId){setExpandedBrand(null);}
    else{setExpandedBrand(brandId);loadModels(brandId);}
  };

  // ── Add model ──────────────────────────────────────────────
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
        fd.append("brand_id",addModelFor);
        fd.append("model_id",newModel.id);
        fd.append("slug",newModel.slug);
        const imgRes=await fetch("/api/car-models-image-upload",{method:"POST",headers:{"x-admin-email":session?.email??""},body:fd});
        const imgJson=await imgRes.json();
        if(imgRes.ok) newModel={...newModel,model_img:imgJson.url};
      }

      setCarModels(prev=>({...prev,[addModelFor]:[...(prev[addModelFor]??[]),newModel]}));
      toast(`"${newModel.name}" added to ${BRANDS.find(b=>b.id===addModelFor)?.name}.`);
      setAddModelFor(null); setAddForm(emptyAdd());
    } catch{ setAddError("Network error."); }
    setAddLoading(false);
  };

  // ── Edit model ─────────────────────────────────────────────
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
        fd.append("brand_id",editModel.brand_id);
        fd.append("model_id",editModel.id);
        fd.append("slug",updated.slug||editModel.slug);
        const imgRes=await fetch("/api/car-models-image-upload",{method:"POST",headers:{"x-admin-email":session?.email??""},body:fd});
        const imgJson=await imgRes.json();
        if(imgRes.ok) updated={...updated,model_img:imgJson.url};
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

  // ── Delete model ───────────────────────────────────────────
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

  // ── Delete user ───────────────────────────────────────────
  const handleDeleteUser=async()=>{
    if(!deleteUser||!session?.email) return;
    setDeleteUserLoading(true);
    const res=await fetch("/api/admin-delete-user",{method:"DELETE",
      headers:{"Content-Type":"application/json","x-admin-email":session.email},
      body:JSON.stringify({user_id:deleteUser.user_id})});
    if(res.ok){
      setUsers(prev=>prev.filter(u=>u.user_id!==deleteUser.user_id));
      setUserStatuses(prev=>{const n={...prev};delete n[deleteUser.user_id];return n;});
      toast(`"${deleteUser.name}" has been deleted.`);
    } else {
      const j=await res.json(); toast(j.error??"Delete failed.","err");
    }
    setDeleteUserLoading(false);
    setDeleteUser(null);
  };

  if (!session) return null;

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchUser.toLowerCase()));

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
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
          {/* Bell — red only when there are pending guides */}
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
              {id:"users",     icon:<Users size={14}/>,    label:"Users"},
              {id:"guides",    icon:<BookOpen size={14}/>, label:"Guides", badge: pendingCount},
              {id:"car-models",icon:<Car size={14}/>,      label:"Car Models"},
              {id:"documents", icon:<FileText size={14}/>, label:"Documents"},
              {id:"reports",   icon:<BarChart2 size={14}/>,label:"Reports"},
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

          {/* ── USERS ────────────────────────────────────────── */}
          {activeTab==="users"&&(
            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Users</p>
                  <h2 className="font-black uppercase tracking-tighter text-base mt-0.5">User Management</h2>
                </div>
                <button onClick={fetchUsers} className="p-1.5 border border-border hover:bg-secondary transition-colors">
                  <RefreshCw size={13} className={`text-muted-foreground ${loadingUsers?"animate-spin":""}`}/>
                </button>
              </div>
              {/* Search */}
              <div className="flex items-center gap-2 border border-border bg-background px-3 mb-4 w-full max-w-xs">
                <Search size={13} className="text-muted-foreground shrink-0"/>
                <input value={searchUser} onChange={e=>setSearchUser(e.target.value)}
                  placeholder="Search users..." className="flex-1 h-9 bg-transparent text-xs focus:outline-none font-mono"/>
              </div>
              {/* Table */}
              <div className="border border-border bg-background overflow-hidden">
                <div className="grid grid-cols-[2fr_1.4fr_0.9fr_auto] gap-4 px-5 py-2.5 bg-secondary border-b border-border">
                  {["Name","Joined","Status","Actions"].map(h=>(
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
                        onDeleteUser={setDeleteUser}/>
                    ))
                }
              </div>
            </section>
          )}

          {/* ── GUIDES ───────────────────────────────────────── */}
          {activeTab==="guides"&&(
            <AdminGuidesTab
              adminEmail={session.email}
              onToast={toast}
              onPendingCountChange={setPendingCount}
            />
          )}

          {/* ── CAR MODELS ───────────────────────────────────── */}
          {activeTab==="car-models"&&(
            <section>
              <div className="mb-5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Car Models</p>
                <h2 className="font-black uppercase tracking-tighter text-base mt-0.5">Car Model Management</h2>
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
                        {Array.isArray(models)&&<span className="text-[9px] font-mono text-muted-foreground uppercase">{models.length} model{models.length!==1?"s":""}</span>}
                        <ChevronRight size={13} className={`text-muted-foreground transition-transform duration-200 ${expandedBrand===brand.id?"rotate-90":""}`}/>
                      </button>

                      {expandedBrand===brand.id&&(
                        <div className="border-t border-border bg-secondary/20 px-5 py-4">
                          {models===null&&<div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><RefreshCw size={11} className="animate-spin"/> Loading...</div>}
                          {Array.isArray(models)&&models.length===0&&<p className="text-xs text-muted-foreground py-1 mb-3">No models yet for this brand.</p>}

                          {Array.isArray(models)&&models.length>0&&(
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                              {models.map(m=>(
                                <div key={m.id} className="bg-background border border-border overflow-hidden group">
                                  <div className="relative aspect-video bg-secondary/50 flex items-center justify-center overflow-hidden">
                                    {m.model_img
                                      ?<img src={m.model_img} alt={m.name} className="w-full h-full object-cover"/>
                                      :<div className="flex flex-col items-center gap-1 text-muted-foreground/40"><ImageIcon size={20}/><span className="text-[9px]">No image</span></div>
                                    }
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

          {/* ── DOCUMENTS ──────────────────────────────────── */}
          {activeTab==="documents"&&(
            <section>
              <div className="mb-5"><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Documents</p><h2 className="font-black uppercase tracking-tighter text-base mt-0.5">Document Management</h2></div>
              <div className="border border-dashed border-border bg-background p-10 flex flex-col items-center justify-center gap-3 mb-6">
                <div className="w-12 h-12 bg-secondary flex items-center justify-center"><Upload size={22} className="text-muted-foreground"/></div>
                <p className="text-sm font-bold">Upload a Vehicle Manual (PDF)</p>
                <div className="flex flex-wrap gap-3 mt-2 items-center justify-center">
                  <select className="border border-border bg-background px-3 py-2 text-xs focus:outline-none"><option value="">— Select Brand —</option>{BRANDS.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
                  <label className="px-3 py-2 border border-border bg-secondary text-xs font-bold cursor-pointer">Choose PDF<input type="file" accept=".pdf" className="hidden" onChange={()=>toast("PDF selected — upload coming soon.")}/></label>
                  <button onClick={()=>toast("Document upload coming soon.")} className="px-4 py-2 bg-primary text-white text-xs font-bold hover:brightness-110">Upload</button>
                </div>
              </div>
              <div className="border border-border bg-background overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-2.5 bg-secondary border-b border-border">{["Document","Brand","Uploaded","Actions"].map(h=><span key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{h}</span>)}</div>
                <div className="py-14 text-center text-sm text-muted-foreground">No documents uploaded yet.</div>
              </div>
            </section>
          )}

          {/* ── REPORTS ──────────────────────────────────────── */}
          {activeTab==="reports"&&(
            <section>
              <div className="mb-5"><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Reports</p><h2 className="font-black uppercase tracking-tighter text-base mt-0.5">Platform Reports</h2></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[{label:"Total Users",value:users.length||"—",icon:<Users size={17}/>,accent:"border-blue-200 bg-blue-50",text:"text-blue-600"},
                  {label:"Active Guides",value:"—",icon:<BookOpen size={17}/>,accent:"border-green-200 bg-green-50",text:"text-green-600"},
                  {label:"Pending Reviews",value:pendingCount||"—",icon:<Clock size={17}/>,accent:"border-yellow-200 bg-yellow-50",text:"text-yellow-600"},
                  {label:"Filed Reports",value:"—",icon:<BarChart2 size={17}/>,accent:"border-red-200 bg-red-50",text:"text-red-500"}].map(s=>(
                  <div key={s.label} className={`border p-5 ${s.accent}`}><span className={`${s.text} mb-3 block`}>{s.icon}</span><p className="text-2xl font-black">{s.value}</p><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p></div>
                ))}
              </div>
              <div className="border border-border bg-background p-8 flex flex-col items-center justify-center h-52 gap-2"><BarChart2 size={28} className="text-border"/><p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Chart Area — Coming Soon</p></div>
            </section>
          )}

          {/* ── FORUM ────────────────────────────────────────── */}
          {activeTab==="forum"&&(
            <section>
              <div className="mb-5"><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin / Forum</p><h2 className="font-black uppercase tracking-tighter text-base mt-0.5">Forum Moderation</h2></div>
              <div className="border border-border bg-background overflow-hidden">
                <div className="grid grid-cols-[2.5fr_1.5fr_0.8fr_auto] gap-4 px-5 py-2.5 bg-secondary border-b border-border">{["Post","Author","Status","Actions"].map(h=><span key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{h}</span>)}</div>
                <div className="py-14 text-center text-sm text-muted-foreground">No reported posts.</div>
              </div>
            </section>
          )}

        </main>
      </div>

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
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Model Image <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional)</span></label>
                {addForm.imagePreview
                  ?<div className="relative w-32 h-20 border border-border overflow-hidden">
                    <img src={addForm.imagePreview} alt="preview" className="w-full h-full object-cover"/>
                    <button onClick={()=>setAddForm(f=>({...f,imageFile:null,imagePreview:""}))} className="absolute top-1 right-1 bg-ink/70 text-white p-0.5 rounded"><X size={10}/></button>
                  </div>
                  :<button onClick={()=>addImageRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-dashed border-border hover:border-ink text-xs font-bold text-muted-foreground hover:text-ink transition-all">
                    <Upload size={13}/> Choose Image
                  </button>
                }
                <input ref={addImageRef} type="file" accept="image/*" className="hidden"
                  onChange={e=>{const f=e.target.files?.[0];if(f){setAddForm(prev=>({...prev,imageFile:f,imagePreview:URL.createObjectURL(f)}));}e.target.value="";}}/>
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
                  {editForm.imagePreview?"Replace Image":"Add Image"}
                </label>
                {editForm.imagePreview
                  ?<div className="flex items-start gap-3">
                    <div className="relative w-32 h-20 border border-border overflow-hidden shrink-0">
                      <img src={editForm.imagePreview} alt="preview" className="w-full h-full object-cover"/>
                    </div>
                    <button onClick={()=>editImageRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-dashed border-border hover:border-ink text-xs font-bold text-muted-foreground hover:text-ink transition-all">
                      <Upload size={13}/> Replace
                    </button>
                  </div>
                  :<button onClick={()=>editImageRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-dashed border-border hover:border-ink text-xs font-bold text-muted-foreground hover:text-ink transition-all">
                    <Upload size={13}/> Choose Image
                  </button>
                }
                <input ref={editImageRef} type="file" accept="image/*" className="hidden"
                  onChange={e=>{const f=e.target.files?.[0];if(f){setEditForm(prev=>prev?{...prev,imageFile:f,imagePreview:URL.createObjectURL(f)}:prev);}e.target.value="";}}/>
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

      {/* ══ DELETE CONFIRM MODAL ══ */}
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
            <div className="flex items-start gap-3 mb-5">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5"/>
              <div>
                <h4 className="font-black uppercase tracking-tighter text-sm">Delete User?</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  This will permanently delete <strong>{deleteUser.name}</strong> and all their data. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setDeleteUser(null)} className="px-4 py-2 text-xs font-bold border border-border hover:bg-secondary" disabled={deleteUserLoading}>Cancel</button>
              <button onClick={handleDeleteUser} disabled={deleteUserLoading} className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-1.5">
                {deleteUserLoading?<><RefreshCw size={11} className="animate-spin"/> Deleting...</>:<><Trash2 size={11}/> Yes, Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── UserTableRow sub-component ────────────────────────────────
function UserTableRow({user,status,isLast,onStatusChange,onToast,onDeleteUser}:{user:UserRow;status:"Active"|"Suspended"|"Pending";isLast:boolean;onStatusChange:(uid:string,s:"Active"|"Suspended"|"Pending")=>void;onToast:(m:string,t?:"ok"|"err")=>void;onDeleteUser:(u:UserRow)=>void;}) {
  const ss={Active:"bg-green-50 text-green-700 border-green-200",Suspended:"bg-red-50 text-red-600 border-red-200",Pending:"bg-yellow-50 text-yellow-700 border-yellow-200"}[status];
  const joined=user.created_at?new Date(user.created_at).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"}):"—";
  return(
    <div className={`grid grid-cols-[2fr_1.4fr_0.9fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-secondary/30 transition-colors ${!isLast?"border-b border-border":""}`}>
      <span className="text-xs font-medium truncate">{user.name}</span>
      <span className="text-xs text-muted-foreground">{joined}</span>
      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border w-fit ${ss}`}>{status}</span>
      <div className="flex items-center gap-1">
        {status==="Suspended"
          ?<button title="Activate" onClick={()=>{onStatusChange(user.user_id,"Active");onToast(`${user.name} activated.`);}} className="p-1.5 hover:bg-green-100 rounded"><CheckCircle size={13} className="text-green-600"/></button>
          :<button title="Suspend"  onClick={()=>{onStatusChange(user.user_id,"Suspended");onToast(`${user.name} suspended.`);}} className="p-1.5 hover:bg-yellow-100 rounded"><Ban size={13} className="text-yellow-600"/></button>}
        <button title="Delete" onClick={()=>onDeleteUser(user)} className="p-1.5 hover:bg-red-100 rounded"><Trash2 size={13} className="text-red-500"/></button>
      </div>
    </div>
  );
}