"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, ChevronDown, Bookmark, Bell, User, Settings, LogOut, Car, FileText, Cpu, Users, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase"; 
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!user) {
        setProfilePicture(null);
        return;
      }

      try {
        const res = await fetch("/api/profile_fetch");
        const data = await res.json();
        if (res.ok && data.user?.profile_picture) {
          setProfilePicture(data.user.profile_picture);
        }
      } catch (error) {
        console.error("Error fetching profile picture:", error);
      }
    };

    fetchProfilePicture();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const fetchNotifications = async () => {
    if (!user) return;

    setNotificationsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) return;

      const res = await fetch("/api/notification/fetch", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationsAsRead = async () => {
    if (!user || notifications.length === 0) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) return;

      const unreadIds = notifications
        .filter((n: any) => !n.is_read)
        .map((n: any) => n.id);

      if (unreadIds.length === 0) return;

      const res = await fetch("/api/notification/mark-read", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: unreadIds }),
      });

      if (res.ok) {
        // Update local state to reflect read status
        setNotifications((prev: any[]) =>
          prev.map((n: any) => ({ ...n, is_read: true }))
        );
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <nav className="bg-ink flex items-center px-6 h-14 shrink-0 sticky top-0 z-50 border-b border-white/10">
      <Link href="/" className="font-display text-lg font-bold tracking-wide text-primary-foreground mr-8">
        <span className="text-primary">AUTO</span>BOT
      </Link>

      <div className="hidden md:flex items-center gap-2 h-full">
        
        <div className="group relative h-full flex items-center">
          <button className={`flex items-center gap-1 px-4 h-full font-mono text-sm transition-colors ${pathname.startsWith('/guides') ? 'text-primary' : 'text-primary-foreground/70 group-hover:text-primary-foreground'}`}>
            Fix it <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
          </button>
          
          <div className="absolute top-14 left-0 w-[500px] flex flex-row bg-ink border border-white/10 shadow-xl rounded-b-md transition-all duration-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 overflow-hidden">
            <HorizontalDropdownItem 
              href="/car-makers" 
              icon={<FileText size={20}/>} 
              title="Repair Guides" 
              subtitle="Step-by-step manuals" 
            />
            <div className="w-[1px] bg-white/10 self-stretch" /> 
            <HorizontalDropdownItem 
              href="/ai-repair" 
              icon={<Cpu size={20}/>} 
              title="Autobot AI" 
              subtitle="Smart diagnostic helper" 
              isPro 
            />
          </div>
        </div>

        <div className="group relative h-full flex items-center">
          <button className={`flex items-center gap-1 px-4 h-full font-mono text-sm transition-colors ${pathname.startsWith('/community') ? 'text-primary' : 'text-primary-foreground/70 group-hover:text-primary-foreground'}`}>
            Community <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
          </button>
          
          <div className="absolute top-14 left-0 w-[500px] flex flex-row bg-ink border border-white/10 shadow-xl rounded-b-md transition-all duration-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 overflow-hidden">
            <HorizontalDropdownItem 
              href="/community/contribute" 
              icon={<Users size={20}/>}
              title="Be Involved" 
              subtitle="Contribute to the database" 
            />
            <div className="w-[1px] bg-white/10 self-stretch" />
            <HorizontalDropdownItem 
              href="/community/forum" 
              icon={<MessageSquare size={20}/>}
              title="Answer Forum" 
              subtitle="Get help from the community" 
            />
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-5">
        {user && (
          <>
            <Link href="/bookmarks" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors" title="Bookmarked Guides">
              <Bookmark size={20} />
            </Link>

            <div 
              className="relative"
            >
              <button 
                onClick={async () => {
                  setNotificationsOpen(!notificationsOpen);
                  if (!notificationsOpen) {
                    fetchNotifications();
                    setTimeout(markNotificationsAsRead, 300);
                  }
                }}
                className="flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground transition-colors relative"
                title="Notifications"
              >
                <Bell size={20} stroke="white" fill={notifications.filter((n: any) => !n.is_read).length > 0 ? "black" : "none"} />
                {notifications.filter((n: any) => !n.is_read).length > 0 && (
                  <span className="absolute -top-1 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notifications.filter((n: any) => !n.is_read).length > 9 ? "9+" : notifications.filter((n: any) => !n.is_read).length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute top-12 right-0 w-80 bg-ink border border-white/10 shadow-xl rounded-md overflow-hidden py-2 z-50">
                    <div className="px-4 py-2 border-b border-white/5">
                      <p className="text-[10px] uppercase tracking-widest text-primary-foreground/40 font-mono">Notifications</p>
                    </div>
                    
                    {notificationsLoading ? (
                      <div className="px-4 py-4 text-center text-xs text-primary-foreground/50">
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-4 text-center text-xs text-primary-foreground/50">
                        No notifications
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.map((notif: any, idx: number) => (
                          <div 
                            key={idx} 
                            className={`px-4 py-3 border-b border-white/5 transition-colors last:border-b-0 ${
                              !notif.is_read 
                                ? "bg-primary/20 hover:bg-primary/30" 
                                : "hover:bg-white/5"
                            }`}
                          >
                            <p className="text-xs font-semibold text-primary-foreground mb-1">
                              {notif.title}
                            </p>
                            <p className="text-[11px] text-primary-foreground/70 leading-tight">
                              {notif.message}
                            </p>
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
          </>
        )}

        {user ? (
          <div className="group relative h-full flex items-center">
            <button className="flex items-center gap-2 text-primary-foreground/70 group-hover:text-primary-foreground transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:border-primary/60 transition-all overflow-hidden">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                    }}
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
              <ProfileLink href="/profile" icon={<User size={14}/>} label="My Profile" />
              <ProfileLink href="/garage" icon={<Car size={14}/>} label="My Garage" />
              <ProfileLink href="/settings" icon={<Settings size={14}/>} label="Settings" />
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
            <Link href="/login" className="font-mono text-xs bg-primary text-ink px-4 py-1.5 rounded hover:bg-primary/90 transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="font-mono text-xs border border-primary text-primary px-4 py-1.5 rounded hover:bg-primary hover:text-ink transition-colors">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

/* --- HELPER COMPONENTS --- */

function HorizontalDropdownItem({ href, title, subtitle, icon, isPro }: { href: string; title: string; subtitle: string; icon?: React.ReactNode; isPro?: boolean }) {
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

function ProfileLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 text-xs font-mono text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/5 transition-colors">
      {icon} {label}
    </Link>
  );
}