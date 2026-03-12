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

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    setMounted(true);
  }, []);

  const { resolvedTheme } = useTheme();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {mounted ? (
            <RainbowKitProvider 
              theme={resolvedTheme === "dark" ? darkTheme() : lightTheme()}
              modalSize="compact"
            >
              <WalletProvider>
                {children}
                <Toaster position="top-right" theme="system" richColors closeButton offset="80px" />
              </WalletProvider>
            </RainbowKitProvider>
          ) : (
            <div className="min-h-screen bg-background" />
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
