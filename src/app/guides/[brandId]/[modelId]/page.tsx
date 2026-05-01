"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ChevronRight, Plus, User, Clock, BookOpen, ArrowLeft, ThumbsUp, ThumbsDown, ListChecks, Wrench, Package, MessageCircle } from "lucide-react";

import { resolveCarModelImage } from "@/lib/carTypeImage";

interface Guide {
  guide_id: string;
  title: string;
  summary: string;
  difficulty: string;
  time_required: string;
  brand_id: string;
  model_name: string;
  user_id: string;
  created_at: string;
  thumbnail_url?: string | null;
  tools: string[];
  required_parts: string[];
  step_count: number;
  like_count: number;
  dislike_count: number;
}

interface ForumPost {
  forum_id: string;
  brand_id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  likes: number;
  dislikes: number;
  comment_count: number;
  Users: { name: string };
}

interface Document {
  document_id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size: number;
  thumbnail_url?: string | null;
  created_at: string;
  user_id: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-50 text-green-700 border-green-200",
  Intermediate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Expert:       "bg-red-50 text-red-700 border-red-200",
};

const DIFFICULTY_BAR: Record<string, string> = {
  Beginner:     "bg-green-400",
  Intermediate: "bg-yellow-400",
  Advanced:     "bg-orange-400",
  Expert:       "bg-red-500",
};

function truncateWords(text: string, limit: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + "...";
}

export default function ModelGuidesPage() {
  const params  = useParams();
  const router  = useRouter();
  const brandId = params?.brandId as string;
  const modelId = params?.modelId as string;

  const [guides,        setGuides]        = useState<Guide[]>([]);
  const [forumPosts,    setForumPosts]    = useState<ForumPost[]>([]);
  const [documents,     setDocuments]     = useState<Document[]>([]);
  const [creators,      setCreators]      = useState<Record<string, string>>({});
  const [modelName,     setModelName]     = useState("");
  const [modelInfo,     setModelInfo]     = useState<string | null>(null);
  const [modelImg,      setModelImg]      = useState<string | null>(null);
  const [modelCategory, setModelCategory] = useState("");
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState<"guides" | "forum" | "documents">("guides");

  useEffect(() => {
    if (!brandId || !modelId) return;

    fetch(`/api/car-models/${brandId}`)
      .then((r) => r.json())
      .then((j) => {
        const model = (j.models ?? []).find((m: any) => m.id === modelId);
        if (model) {
          setModelName(model.name);
          setModelInfo(model.info ?? null);
          setModelImg(model.model_img ?? null);
          setModelCategory(model.category ?? "");
        }
      });

    // Fetch guides
    fetch(`/api/guides/by-model?model_id=${modelId}`)
      .then((r) => r.json())
      .then(async (json) => {
        const list: Guide[] = json.guides ?? [];
        setGuides(list);

        const uniqueUserIds = [...new Set(list.map((g) => g.user_id))];
        const nameMap: Record<string, string> = {};
        await Promise.all(
          uniqueUserIds.map(async (uid) => {
            const res  = await fetch(`/api/profile_fetch?user_id=${uid}`);
            const data = await res.json();
            nameMap[uid] = data?.user?.name ?? "Community Member";
          })
        );
        setCreators(nameMap);
      })
      .finally(() => setLoading(false));

    // Fetch forum posts for this model
    fetch(`/api/forum_posts_all?modelId=${modelId}`)
      .then((r) => r.json())
      .then((json) => {
        setForumPosts(json.posts ?? []);
      })
      .catch(() => {});

    // Fetch documents for this model
    fetch(`/api/documents/by-model?model_id=${modelId}`)
      .then((r) => r.json())
      .then((json) => {
        setDocuments(json.documents ?? []);
      })
      .catch(() => {});
  }, [brandId, modelId]);

  const brandLabel = brandId ? brandId.charAt(0).toUpperCase() + brandId.slice(1) : "";
  const createGuideUrl = `/guides/create?brand=${brandId}&model=${modelId}&source=autohub`;
  const createPostUrl  = `/community/forum/create?brand=${brandId}&model=${modelId}&source=autohub`;

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col animate-fade-in">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-6">
          <Link href="/car-makers" className="hover:text-primary underline-offset-2 hover:underline cursor-pointer transition-colors">Directory</Link>
          <ChevronRight size={10} />
          <Link href={`/guides/${brandId}`} className="hover:text-primary underline-offset-2 hover:underline cursor-pointer transition-colors">{brandLabel}</Link>
          <ChevronRight size={10} />
          <span className="text-ink">{modelName}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 border-b border-border pb-6">
          <div className="flex items-start gap-5 flex-1">
            {/* Model image */}
            <div className="w-32 shrink-0 aspect-video border border-border overflow-hidden bg-secondary/20">
              <img
                src={resolveCarModelImage(modelImg, modelCategory)}
                alt={modelName}
                className={`w-full h-full object-cover${!modelImg ? " opacity-80" : ""}`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-thumbnail.png"; }}
              />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tighter text-3xl">
                {brandLabel} <span className="text-primary">{modelName}</span>
              </h1>
              {modelInfo && (
                <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">{modelInfo}</p>
              )}
              {!modelInfo && (
                <p className="text-sm text-muted-foreground mt-1">Repair guides and community posts</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1"><BookOpen size={11} /> {guides.length} Guide{guides.length !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><MessageCircle size={11} /> {forumPosts.length} Forum Post{forumPosts.length !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Package size={11} /> {documents.length} Document{documents.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab("guides")}
            className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === "guides" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            <BookOpen size={12} className="inline mr-1.5" />Repair Guides ({guides.length})
          </button>
          <button
            onClick={() => setActiveTab("forum")}
            className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === "forum" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            <MessageCircle size={12} className="inline mr-1.5" />Forum Posts ({forumPosts.length})
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === "documents" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            <Package size={12} className="inline mr-1.5" />Documents ({documents.length})
          </button>
        </div>

        {/* Guides Tab */}
        {activeTab === "guides" && (
          <>
            {loading ? (
              <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">Loading guides...</div>
            ) : guides.length === 0 ? (
              <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center py-20 gap-4">
                <BookOpen size={36} className="text-border" />
                <div className="text-center">
                  <p className="text-sm font-bold">No guides created for this model yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Would you like to create one?</p>
                </div>
                <Link href={createGuideUrl} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all">
                  <Plus size={13} /> Create a Guide
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {guides.map((guide) => (
                    <GuideCard
                      key={guide.guide_id}
                      guide={guide}
                      brandId={brandId}
                      modelId={modelId}
                      creatorName={creators[guide.user_id] ?? "..."}
                    />
                  ))}
                </div>
                <div className="mt-8 border border-dashed border-border p-5 flex items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">Know a fix that isn't listed here? Share your knowledge.</p>
                  <Link href={createGuideUrl} className="shrink-0 flex items-center gap-2 px-4 py-2 border border-primary text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all">
                    <Plus size={12} /> Create a Guide
                  </Link>
                </div>
              </>
            )}
          </>
        )}

        {/* Forum Tab */}
        {activeTab === "forum" && (
          <>
            {forumPosts.length === 0 ? (
              <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center py-20 gap-4">
                <MessageCircle size={36} className="text-border" />
                <div className="text-center">
                  <p className="text-sm font-bold">No forum posts for this model yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Start the conversation!</p>
                </div>
                <Link href={createPostUrl} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold hover:brightness-110 transition-all">
                  <Plus size={13} /> Create a Post
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {forumPosts.map((post) => (
                  <Link
                    key={post.forum_id}
                    href={`/community/forum/${post.brand_id}/${post.forum_id}`}
                    className="border border-border bg-background rounded-lg overflow-hidden hover:border-primary/40 transition-colors p-5 block"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mb-2">
                      <span className="capitalize font-semibold text-primary">{post.brand_id}</span>
                      <span>·</span>
                      <span>{post.Users?.name || "Unknown"}</span>
                      <span>·</span>
                      <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <h3 className="text-base font-bold leading-snug mb-2 hover:text-primary transition-colors">{post.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{truncateWords(post.content, 50)}</p>
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><ThumbsUp size={12} /> {post.likes}</span>
                      <span className="flex items-center gap-1"><ThumbsDown size={12} /> {post.dislikes}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comment_count} comments</span>
                    </div>
                  </Link>
                ))}
                <div className="mt-4 border border-dashed border-border p-5 flex items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">Have a question or experience to share?</p>
                  <Link href={createPostUrl} className="shrink-0 flex items-center gap-2 px-4 py-2 border border-primary text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all">
                    <MessageCircle size={12} /> Create a Post
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <>
            {documents.length === 0 ? (
              <div className="border border-dashed border-border bg-background flex flex-col items-center justify-center py-20 gap-4">
                <Package size={36} className="text-border" />
                <div className="text-center">
                  <p className="text-sm font-bold">No documents available for this model yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Check back soon for manuals and documentation.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.document_id}
                    document={doc}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-10 flex items-center">
          <button
            onClick={() => router.push(`/guides/${brandId}`)}
            className="flex items-center gap-2 px-3 py-1.5 border border-border text-[11px] font-bold uppercase tracking-widest bg-background text-ink hover:bg-[#474757] hover:text-white hover:border-[#474757] transition-all"
          >
            <ArrowLeft size={12} /> Back to Models
          </button>
        </div>

      </main>
    </div>
  );
}

function GuideCard({
  guide, brandId, modelId, creatorName,
}: {
  guide: Guide;
  brandId: string;
  modelId: string;
  creatorName: string;
}) {
  const diffColor = DIFFICULTY_COLORS[guide.difficulty] ?? "bg-secondary text-muted-foreground border-border";
  const diffBar   = DIFFICULTY_BAR[guide.difficulty]   ?? "bg-border";
  const href      = `/guides/${brandId}/${modelId}/${guide.guide_id}?source=autohub`;
  const hasThumbnail = !!guide.thumbnail_url;
  const thumbnailSrc = guide.thumbnail_url ?? "/no-thumbnail.png";

  const tools    = guide.tools          ?? [];
  const parts    = guide.required_parts ?? [];

  return (
    <Link
      href={href}
      className="group border border-border bg-background hover:border-primary hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--primary)] transition-all duration-200 flex flex-col overflow-hidden rounded"
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <img
          src={thumbnailSrc}
          alt={guide.title}
          className={`w-full h-full object-cover${!hasThumbnail ? " opacity-80" : ""}`}
          loading="lazy"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.errored) { img.dataset.errored = "1"; img.src = "/no-thumbnail.png"; } else { img.style.display = "none"; }
          }}
        />
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${diffBar}`} />
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground capitalize">
            {guide.brand_id} · {guide.model_name}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border shrink-0 ${diffColor}`}>
            {guide.difficulty}
          </span>
        </div>

        <h3 className="font-black uppercase tracking-tighter text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {guide.title}
        </h3>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {guide.summary}
        </p>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-1 mb-1">
            <Package size={10} className="text-muted-foreground shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Required Parts</span>
          </div>
          {parts.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic">None</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {parts.map((p, i) => (
                <span key={i} className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 font-medium">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-1.5">
          <div className="flex items-center gap-1 mb-1">
            <Wrench size={10} className="text-muted-foreground shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tools Needed</span>
          </div>
          {tools.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic">None</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {tools.map((t, i) => (
                <span key={i} className="text-[9px] bg-secondary border border-border text-ink px-1.5 py-0.5 font-medium">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border mt-auto">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock size={10} /> {guide.time_required}
            </span>
            <span className="flex items-center gap-1">
              <ListChecks size={10} /> {guide.step_count} {guide.step_count === 1 ? "step" : "steps"}
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <ThumbsUp size={10} /> {guide.like_count}
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <ThumbsDown size={10} /> {guide.dislike_count}
            </span>
            <span className="flex items-center gap-1">
              <User size={10} /> {creatorName}
            </span>
          </div>
          <ChevronRight size={13} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
      </div>
    </Link>
  );
}

function DocumentCard({
  document,
}: {
  document: Document;
}) {
  const hasThumbnail = !!document.thumbnail_url;
  const thumbnailSrc = document.thumbnail_url ?? "/no-thumbnail.png";
  
  const getFileTypeColor = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes("pdf")) return "bg-red-50 border-red-200 text-red-700";
    if (type.includes("doc")) return "bg-blue-50 border-blue-200 text-blue-700";
    if (type.includes("sheet") || type.includes("xls")) return "bg-green-50 border-green-200 text-green-700";
    return "bg-secondary border-border text-muted-foreground";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <a
      href={document.file_url}
      download
      className="group border border-border bg-background hover:border-primary hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--primary)] transition-all duration-200 flex flex-col overflow-hidden rounded"
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <img
          src={thumbnailSrc}
          alt={document.title}
          className={`w-full h-full object-cover${!hasThumbnail ? " opacity-80" : ""}`}
          loading="lazy"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.errored) { img.dataset.errored = "1"; img.src = "/no-thumbnail.png"; } else { img.style.display = "none"; }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-primary text-white rounded-full p-3 flex items-center justify-center">
            <Package size={20} />
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border shrink-0 ${getFileTypeColor(document.file_type)}`}>
            {document.file_type}
          </span>
        </div>

        <h3 className="font-black uppercase tracking-tighter text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {document.title}
        </h3>

        {document.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {document.description}
          </p>
        )}

        <div className="pt-2 border-t border-border mt-auto">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package size={10} /> {formatFileSize(document.file_size)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} /> {new Date(document.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
          Download <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </a>
  );
}
