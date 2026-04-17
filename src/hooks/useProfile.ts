// hooks/useProfile.ts
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useProfile(userId: string | undefined) {
  return useSWR(
    userId ? "/api/profile_fetch" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000, // won't re-fetch within 60s
    }
  );
}