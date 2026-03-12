"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { config } from "@/lib/genlayer/wagmi";
import { Toaster } from "sonner";
import { WalletProvider } from "@/lib/genlayer/WalletProvider";
import { ThemeProvider, useTheme } from "next-themes";
import React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// This component isolates all Wagmi/RainbowKit logic and ONLY renders on the client
const BlockchainProvider = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // IMPORTANT: Do NOT render children until mounted to ensure WagmiProvider is active
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            CONNECTING_TO_GENLAYER...
          </p>
        </div>
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider 
        theme={resolvedTheme === "dark" ? darkTheme() : lightTheme()}
        modalSize="compact"
      >
        <WalletProvider>
          {children}
          <Toaster 
            position="top-right" 
            theme="system" 
            richColors 
            closeButton 
            offset="80px" 
          />
        </WalletProvider>
      </RainbowKitProvider>
    </WagmiProvider>
  );
};

// Use dynamic with ssr: false to completely bypass server-side rendering for the blockchain stack
const ClientOnlyBlockchainProvider = dynamic(
  () => Promise.resolve(BlockchainProvider),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ClientOnlyBlockchainProvider>
          {children}
        </ClientOnlyBlockchainProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
