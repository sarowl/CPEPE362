import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: "pkce",
    },
    // Explicit storage configuration to ensure bucket access works correctly
    // and public URLs are constructed from the right endpoint.
    global: {
      headers: {
        "x-supabase-storage-url": `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`,
      },
    },
  }
);
