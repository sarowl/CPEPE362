import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";

export interface SearchableGuide {
  guide_id: string;
  title: string;
  summary: string;
  difficulty: string;
  time_required: string;
  brand_id: string;
  model_id: string;
  model_name: string;
  user_id: string;
  created_at: string;
  thumbnail_url?: string | null;
  tools?: string[];
  required_parts?: string[];
}

export interface SearchableForum {
  forum_id: string;
  brand_id: string;
  model_id?: string | null;
  model_name?: string | null;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  likes: number;
  dislikes: number;
  comment_count: number;
  Users: { name: string };
}

export interface SearchableBrand {
  id: string;
  name: string;
}

export interface SearchableModel {
  id: string;
  name: string;
  brand_id: string;
}

const guideOptions: IFuseOptions<SearchableGuide> = {
  keys: [
    "title",
    "summary",
    "difficulty",
    "time_required",
    "model_name",
    "brand_id",
    "tools",
    "required_parts"
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 1,
  includeScore: true,
};

const forumOptions: IFuseOptions<SearchableForum> = {
  keys: [
    "title",
    "content",
    "brand_id",
    "model_name",
    "Users.name"
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 1,
  includeScore: true,
};

const brandOptions: IFuseOptions<SearchableBrand> = {
  keys: ["name", "id"],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 1,
  includeScore: true,
};

const modelOptions: IFuseOptions<SearchableModel> = {
  keys: ["name", "id", "brand_id"],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 1,
  includeScore: true,
};

export function fuzzySearchGuides(guides: SearchableGuide[], query: string): SearchableGuide[] {
  if (!query.trim()) return guides;
  const fuse = new Fuse(guides, guideOptions);
  return fuse.search(query).map(r => r.item);
}

// Accepts extra fields (e.g., updated_at) and returns the original object for compatibility
export function fuzzySearchForums<T extends SearchableForum>(forums: T[], query: string): T[] {
  if (!query.trim()) return forums;
  const fuse = new Fuse(forums, forumOptions);
  return fuse.search(query).map(r => r.item as T);
}

export function fuzzySearchBrands(brands: SearchableBrand[], query: string): SearchableBrand[] {
  if (!query.trim()) return brands;
  const fuse = new Fuse(brands, brandOptions);
  return fuse.search(query).map(r => r.item);
}

export function fuzzySearchModels(models: SearchableModel[], query: string): SearchableModel[] {
  if (!query.trim()) return models;
  const fuse = new Fuse(models, modelOptions);
  return fuse.search(query).map(r => r.item);
}
