"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountPanel } from "./AccountPanel";
import { Sun, Moon, Terminal } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const navItems = [
    { name: "Arena", href: "/" },
    { name: "Trivia", href: "/oracle" },
    { name: "Leaderboard", href: "/leaderboard" },
  ];

  return (
    <nav className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[90%] px-0">
      <div className="flex items-center justify-between h-20 bg-transparent px-4">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-3 transition-all hover:opacity-80 group"
          >
             <div className="bg-primary/10 w-10 h-10 rounded-sm border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <Terminal className="w-5 h-5 text-primary" />
             </div>
             <span className="text-sm font-black italic tracking-tighter text-foreground">ORACLE ARENA</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`transition-all text-sm font-bold rounded-sm px-5 py-2 ${
                    isActive 
                      ? "text-primary bg-primary/5 border border-[#0E1922]/30" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-white/5 transition-all active:scale-95 border border-[#0E1922]/30 bg-white/5"
          >
            {mounted && (
              theme === "dark" ? (
                <Sun className="w-4.5 h-4.5 text-primary" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-secondary" />
              )
            )}
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <AccountPanel />
        </div>
      </div>
    </nav>
  );
}
