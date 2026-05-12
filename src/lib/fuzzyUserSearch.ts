import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";

// Accept any user type with required fields
type GenericUser = { user_id: string; name: string; email?: string; username?: string };

const fuseOptions: IFuseOptions<GenericUser> = {
  keys: [
    "name",
    "username",
    "email",
    {
      name: "fullName",
      getFn: (user: GenericUser) => user.name,
    },
  ],
  threshold: 0.35, // Adjust for strictness
  distance: 100,
  minMatchCharLength: 1,
  ignoreLocation: true,
  includeScore: true,
  useExtendedSearch: true,
};

export function createFuzzyUserSearch<T extends GenericUser>(users: T[]) {
  return new Fuse(users, fuseOptions);
}

export function fuzzyUserFilter<T extends GenericUser>(users: T[], query: string): T[] {
  if (!query.trim()) return users;
  const fuse = createFuzzyUserSearch(users);
  return fuse.search(query).map((r) => r.item);
}
