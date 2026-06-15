"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Film, Tv2, Sparkles, BookOpen, Search, Settings, AlertCircle } from "lucide-react";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/tv", label: "TV Shows", icon: Tv2 },
  { href: "/anime", label: "Anime", icon: Sparkles },
  { href: "/collections", label: "Collections", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/review", label: "Review", icon: AlertCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-56 bg-surface border-r border-white/5 z-30">
      <div className="flex items-center justify-center px-5 h-16 border-b border-white/5 flex-shrink-0">
        <span style={{ fontSize: 16, fontWeight: 500, color: "#fff", letterSpacing: "0.22em", textTransform: "uppercase" }}>VAULT</span>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group", active ? "bg-white/10 text-white" : "text-[#555] hover:text-white hover:bg-white/5")}>
                <Icon className={cn("flex-shrink-0 transition-colors", active ? "text-white" : "text-[#555] group-hover:text-white")} size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="px-3 py-4 border-t border-white/5">
        <Link href="/settings" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group", pathname === "/settings" ? "bg-white/10 text-white" : "text-[#555] hover:text-white hover:bg-white/5")}>
          <Settings size={18} className={cn(pathname === "/settings" ? "text-white" : "text-[#555] group-hover:text-white")} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
