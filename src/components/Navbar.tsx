"use client";



import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search, ChevronDown, Bookmark, Bell, User,
  Settings, LogOut, Car, Cpu, Users, MessageSquare, BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ── [FROM B] Profile cache: avoids redundant API calls across renders ──────────
const profileCache: { data: any | null; fetchedAt: number | null } = {
  data: null,
  fetchedAt: null,
};
const CACHE_TTL_MS = 60_000; // 1-minute TTL before re-fetching

async function fetchProfileOnce(): Promise<any> {
  const now = Date.now();
  // Return cached data if still fresh
  if (profileCache.data && profileCache.fetchedAt && now - profileCache.fetchedAt < CACHE_TTL_MS) {
    return profileCache.data;
  }
  const res = await fetch("/api/profile_fetch");
  if (!res.ok) throw new Error("Failed to fetch profile");
  const data = await res.json();
  profileCache.data = data;
  profileCache.fetchedAt = Date.now();
  return data;
}

// Exported so other pages (e.g. Settings) can bust the cache after profile updates
export function invalidateProfileCache() {
  profileCache.data = null;
  profileCache.fetchedAt = null;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // ── Auth state ────────────────────────────────────────────────────────────
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // ── [FROM A] Auto Hub icon hover swap state ────────────────────────────────
  const [autoHubHovered, setAutoHubHovered] = useState(false);

  // ── [FROM B] Notification state ───────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // [FROM B] Ref keeps the poll interval from capturing a stale `user` closure
  const userRef = useRef<SupabaseUser | null>(null);
  userRef.current = user;

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    // [FROM A] Initial session check on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Profile picture + notifications on user change ────────────────────────
  useEffect(() => {
    if (!user) {
      setProfilePicture(null);
      setNotifications([]); // [FROM B] clear notifications on sign-out
      return;
    }

    // [FROM B] Use cached profile fetch to avoid extra network requests
    fetchProfileOnce()
      .then((data) => {
        if (data?.user?.profile_picture) {
          setProfilePicture(data.user.profile_picture);
        }
      })
      .catch(() => {});

    // [FROM B] Fetch notifications immediately, then poll every 30 s
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [user?.id]); // depend on user id so effect re-runs only on actual user change

  // ── [FROM B] Fetch notifications via /api/notification/fetch ─────────────
  const fetchNotifications = async () => {
    if (!userRef.current) return; // guard against stale closure
    setNotificationsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/notification/fetch", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // ── [FROM B] Mark unread notifications as read via /api/notification/mark-read
  const markNotificationsAsRead = async () => {
    if (!user || notifications.length === 0) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;
      const res = await fetch("/api/notification/mark-read", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ids: unreadIds }),
      });
      if (res.ok) {
        // Optimistically update local state so badge disappears immediately
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Error marking notifications as read:", err);
    }
  };

  // ── Sign-out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    invalidateProfileCache(); // [FROM B] bust the profile cache on sign-out
    await supabase.auth.signOut();
    router.push("/");
  };

  // [FROM B] Derived: count of unread notifications for badge display
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <nav className="bg-ink flex items-center px-6 h-14 shrink-0 sticky top-0 z-50 border-b border-white/10">
      {/* Logo — unchanged from Folder_A */}
      <Link href="/" className="font-display text-lg font-bold tracking-wide text-primary-foreground mr-8">
        <span className="text-primary">AUTO</span>BOT
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-2 h-full">

        {/* Fix It dropdown — [FROM A] layout with dual-image Auto Hub icon swap */}
        <div className="group relative h-full flex items-center">
          <button className={`flex items-center gap-1 px-4 h-full font-mono text-sm transition-colors ${
            pathname.startsWith("/car-makers") || pathname.startsWith("/guides")
              ? "text-primary"
              : "text-primary-foreground/70 group-hover:text-primary-foreground"
          }`}>
            Fix it <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
          </button>

          <div className="absolute top-14 left-0 w-[500px] flex flex-row bg-ink border border-white/10 shadow-xl rounded-b-md transition-all duration-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 overflow-hidden">
            {/* [FROM A] Auto Hub entry with hover icon-swap using two layered Images */}
            <Link
              href="/car-makers"
              className="flex-1 flex flex-col items-center text-center p-6 hover:bg-white/5 transition-colors group/item"
              onMouseEnter={() => setAutoHubHovered(true)}
              onMouseLeave={() => setAutoHubHovered(false)}
            >
              <div className="mb-3 p-3 rounded-full bg-white/5 group-hover/item:bg-primary transition-all relative w-[50px] h-[50px] flex items-center justify-center">
                {/* Default icon — fades out on hover */}
                <Image
                  src="/autohub-icon-default.png"
                  alt="Auto Hub"
                  width={28}
                  height={28}
                  className="object-contain absolute transition-opacity duration-200"
                  style={{ opacity: autoHubHovered ? 0 : 1 }}
                />
                {/* Hover icon — fades in on hover */}
                <Image
                  src="/autohub-icon-hover.png"
                  alt="Auto Hub"
                  width={28}
                  height={28}
                  className="object-contain absolute transition-opacity duration-200"
                  style={{ opacity: autoHubHovered ? 1 : 0 }}
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-primary-foreground">Auto Hub</span>
                <p className="text-[11px] text-primary-foreground/50 leading-tight mt-1 max-w-[120px]">All-in-one car hub</p>
              </div>
            </Link>

            <div className="w-[1px] bg-white/10 self-stretch" />

            {/* [FROM B] Autobot AI — links to /ai-repair (Folder_B's full AI repair flow) */}
            <HorizontalDropdownItem
              href="/ai-repair"
              icon={<Cpu size={20} />}
              title="Autobot AI"
              subtitle="Smart diagnostic helper"
              isPro
            />
          </div>
        </div>

        {/* Community dropdown — [FROM A] kept /forum shortcut + full community routes */}
        <div className="group relative h-full flex items-center">
          <button className={`flex items-center gap-1 px-4 h-full font-mono text-sm transition-colors ${
            pathname.startsWith("/community") || pathname.startsWith("/forum")
              ? "text-primary"
              : "text-primary-foreground/70 group-hover:text-primary-foreground"
          }`}>
            Community <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
          </button>
          <div className="absolute top-14 left-0 w-[700px] flex flex-row bg-ink border border-white/10 shadow-xl rounded-b-md transition-all duration-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 overflow-hidden">
            {/* [FROM A] Be Involved — contribute to the database */}
            <HorizontalDropdownItem href="/community/contribute" icon={<Users size={20} />} title="Be Involved" subtitle="Contribute to the database" />
            <div className="w-[1px] bg-white/10 self-stretch" />
            {/* [FROM A] Forums — uses /forum path (Folder_A route retained) */}
            <HorizontalDropdownItem href="/forum" icon={<MessageSquare size={20} />} title="Forums" subtitle="Get help from the community" />
            <div className="w-[1px] bg-white/10 self-stretch" />
            {/* [FROM A] Guides */}
            <HorizontalDropdownItem href="/community/guides" icon={<BookOpen size={20} />} title="Guides" subtitle="Step-by-step manuals" />
          </div>
        </div>
      </div>

      {/* Right-side action icons */}
      <div className="ml-auto flex items-center gap-5">

        {/* Search — unchanged from Folder_A */}
        <button
          onClick={() => router.push("/search")}
          className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          title="Search"
        >
          <Search size={20} />
        </button>

        {user && (
          <>
            {/* Bookmarks — [FROM A] active-state highlight preserved */}
            <Link
              href="/bookmarks"
              className={`text-primary-foreground/70 hover:text-primary-foreground transition-colors ${
                pathname === "/bookmarks" ? "text-primary" : ""
              }`}
              title="My Bookmarks"
            >
              <Bookmark size={20} />
            </Link>

            {/* ── [FROM B] Notification Bell — placed beside Bookmark as specified ── */}
            <div className="relative">
              <button
                onClick={() => {
                  const opening = !notificationsOpen;
                  setNotificationsOpen(opening);
                  if (opening) {
                    fetchNotifications(); // refresh list when panel opens
                    setTimeout(markNotificationsAsRead, 300); // slight delay before marking read
                  }
                }}
                className="flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground transition-colors relative"
                title="Notifications"
              >
                {/* Bell icon — filled black when unread notifications exist */}
                <Bell
                  size={20}
                  stroke="white"
                  fill={unreadCount > 0 ? "black" : "none"}
                />
                {/* Red badge showing unread count; capped at "9+" */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown panel */}
              {notificationsOpen && (
                <>
                  {/* Transparent backdrop closes panel when user clicks outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute top-12 right-0 w-80 bg-ink border border-white/10 shadow-xl rounded-md overflow-hidden py-2 z-50">
                    <div className="px-4 py-2 border-b border-white/5">
                      <p className="text-[10px] uppercase tracking-widest text-primary-foreground/40 font-mono">
                        Notifications
                      </p>
                    </div>

                    {notificationsLoading ? (
                      <div className="px-4 py-4 text-center text-xs text-primary-foreground/50">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-4 text-center text-xs text-primary-foreground/50">No notifications</div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.map((notif, idx) => (
                          <div
                            key={idx}
                            className={`px-4 py-3 border-b border-white/5 transition-colors last:border-b-0 ${
                              !notif.is_read
                                ? "bg-primary/20 hover:bg-primary/30" // highlight unread
                                : "hover:bg-white/5"
                            }`}
                          >
                            <p className="text-xs font-semibold text-primary-foreground mb-1">{notif.title}</p>
                            <p className="text-[11px] text-primary-foreground/70 leading-tight">{notif.message}</p>
                            {notif.created_at && (
                              <p className="text-[9px] text-primary-foreground/40 mt-1">
                                {new Date(notif.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* ── End Notification Bell ─────────────────────────────────────── */}
          </>
        )}

        {/* User avatar dropdown / auth buttons */}
        {user ? (
          <div className="group relative h-full flex items-center">
            <button className="flex items-center gap-2 text-primary-foreground/70 group-hover:text-primary-foreground transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:border-primary/60 transition-all overflow-hidden">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setProfilePicture(null)} // [FROM B] cleaner error handler
                  />
                ) : (
                  <User size={18} className="text-primary" />
                )}
              </div>
              <ChevronDown size={12} className="group-hover:rotate-180 transition-transform" />
            </button>

            <div className="absolute top-12 right-0 w-56 bg-ink border border-white/10 shadow-xl rounded-md transition-all duration-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 overflow-hidden py-2">
              <div className="px-4 py-2 mb-1 border-b border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-primary-foreground/40 font-mono">Account</p>
                <p className="text-xs truncate font-medium text-primary-foreground/90">{user.email}</p>
              </div>
              <ProfileLink href="/profile" icon={<User size={14} />} label="My Profile" />
              {/* [FROM B] My Garage links to /garage page (new Folder_B page) */}
              <ProfileLink href="/garage" icon={<Car size={14} />} label="My Garage" />
              <ProfileLink href="/settings" icon={<Settings size={14} />} label="Settings" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-mono text-red-400 hover:bg-white/5 transition-colors"
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          </div>
        ) : (
          <>
            <Link href="/login" className="font-mono text-xs bg-primary text-ink px-4 py-1.5 rounded hover:bg-primary/90 transition-colors">Log In</Link>
            <Link href="/signup" className="font-mono text-xs border border-primary text-primary px-4 py-1.5 rounded hover:bg-primary hover:text-ink transition-colors">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

// [FROM A] HorizontalDropdownItem — unchanged structure, used in both dropdowns
function HorizontalDropdownItem({
  href, title, subtitle, icon, isPro,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  isPro?: boolean;
}) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center text-center p-6 hover:bg-white/5 transition-colors group/item">
      <div className="mb-3 p-3 rounded-full bg-white/5 text-primary group-hover/item:bg-primary group-hover/item:text-ink transition-all">
        {icon}
      </div>
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-primary-foreground">{title}</span>
          {isPro && <span className="text-[9px] bg-primary/20 text-primary px-1 rounded font-mono">AI</span>}
        </div>
        <p className="text-[11px] text-primary-foreground/50 leading-tight mt-1 max-w-[120px]">{subtitle}</p>
      </div>
    </Link>
  );
}

// [FROM A] ProfileLink — unchanged
function ProfileLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 text-xs font-mono text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/5 transition-colors">
      {icon} {label}
    </Link>
  );
}
