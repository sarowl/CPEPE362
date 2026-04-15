/**
 * storageUrl.ts
 *
 * Builds a Supabase Storage public URL directly from the project URL,
 * bypassing the SDK's `getPublicUrl()` which can sometimes return an
 * incorrect base when the storage endpoint is misconfigured.
 *
 * Usage:
 *   import { getStoragePublicUrl } from "@/lib/storageUrl";
 *   const url = getStoragePublicUrl("Autobot_Storage", "Guides/userId/guideId/thumbnail/img.jpg");
 */
export function getStoragePublicUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
