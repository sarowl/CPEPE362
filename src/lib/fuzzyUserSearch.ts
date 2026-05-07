import Fuse from "fuse.js";

export interface FuzzyUser {
  user_id: string;
  name: string;
  created_at: string;
  username?: string;
  email?: string;
}

const fuseOptions: Fuse.IFuseOptions<FuzzyUser> = {
  keys: [
    "name",
    "username",
    "email",
    {
      name: "fullName",
      getFn: (user: FuzzyUser) => user.name,
    },
  ],
  threshold: 0.35, // Adjust for strictness
  distance: 100,
  minMatchCharLength: 1,
  ignoreLocation: true,
  includeScore: true,
  useExtendedSearch: true,
};

export function createFuzzyUserSearch(users: FuzzyUser[]) {
  return new Fuse(users, fuseOptions);
}

export function fuzzyUserFilter(
  users: FuzzyUser[],
  query: string
): FuzzyUser[] {
  if (!query.trim()) return users;
  const fuse = createFuzzyUserSearch(users);
  return fuse.search(query).map((r) => r.item);
}
