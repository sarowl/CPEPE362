"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; 
import type { User } from "@supabase/supabase-js";

const Navbar = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 h-16 border-b bg-background">
      <div className="mx-auto flex h-full max-w-[1100px] items-center justify-between px-4">
        {/* Left: Logo */}
        <Link href="/" className="text-lg font-semibold text-foreground">
          AUTOBOT
        </Link>

        {/* Center: Links */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/guides" className="text-sm text-muted-foreground hover:text-foreground">
            Guides
          </Link>
          <Link href="/community" className="text-sm text-muted-foreground hover:text-foreground">
            Community
          </Link>
        </div>

        {/* Right: Search + Profile/Auth */}
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="h-8 w-48 pl-8 text-sm" />
          </div>

          {user ? (
            /* Logged In State */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted text-muted-foreground transition-colors hover:text-foreground">
                  <UserIcon className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/profile">My Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/garage">My Garage</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={handleSignOut}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Logged Out State */
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;