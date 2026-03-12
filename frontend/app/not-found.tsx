"use client";

import Link from "next/link";
import { Terminal, Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in">
      <div className="relative">
        <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full scale-150 animate-pulse" />
        <div className="relative bg-background border border-border p-8 rounded-sm shadow-2xl">
          <AlertCircle className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-6xl font-black italic tracking-tighter mb-2 text-foreground">404</h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            PROTOCOL_ERROR: RESOURCE_NOT_FOUND
          </p>
        </div>
      </div>

      <div className="max-w-md space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The requested data node is inaccessible or has been purged from the consensus layer.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild variant="outline" className="h-12 px-8 text-[11px] font-bold uppercase tracking-[0.2em] border-[#0E1922]/30 rounded-sm w-full sm:w-auto">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              RETURN_HOME
            </Link>
          </Button>
          
          <Button asChild className="h-12 px-8 text-[11px] font-bold uppercase tracking-[0.2em] bg-primary text-white hover:bg-primary/90 rounded-sm w-full sm:w-auto">
            <Link href="/oracle">
              <Terminal className="w-4 h-4 mr-2" />
              SYSTEM_ARENA
            </Link>
          </Button>
        </div>
      </div>

      <div className="pt-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/30 bg-muted/10">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            MONITORING_ACTIVE // V1.0
          </span>
        </div>
      </div>
    </div>
  );
}
