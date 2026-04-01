// ============================================================
// PURPOSE: Hardcoded admin accounts (no Supabase table needed).
//          Add more admin objects here to create additional admins.
// ============================================================

export interface AdminAccount {
  email: string;
  password: string;
  name: string;
}

/**
 * List of admin accounts.
 * These bypass Supabase auth and redirect directly to /admin.
 * Add more entries to create additional admin accounts.
 */
export const ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    email: "admin@autobot.com",
    password: "Admin@1234",
    name: "Super Admin",
  },
  {
    email: "admin2@autobot.com",
    password: "Admin@1234",
    name: "Content Moderator",
  },
];

/**
 * Check if the given email + password match any admin account.
 * Returns the matching AdminAccount or null.
 */
export function findAdmin(email: string, password: string): AdminAccount | null {
  return (
    ADMIN_ACCOUNTS.find(
      (a) => a.email === email && a.password === password
    ) ?? null
  );
}

/**
 * Check if an email belongs to any admin account (email-only check).
 * Useful for quick role detection after login.
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_ACCOUNTS.some((a) => a.email === email);
}