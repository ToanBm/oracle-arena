"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { User, LogOut, Terminal, Wallet, Activity, ShieldCheck, ChevronDown } from "lucide-react";
import { useWallet } from "@/lib/genlayer/wallet";
import { usePlayerPoints } from "@/lib/hooks/usePromptArena";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function AccountPanel() {
  const {
    address,
    isConnected,
    isOnCorrectNetwork,
    disconnectWallet,
  } = useWallet();

  const { data: points = 0 } = usePlayerPoints(address);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const isConnectedAndReady = ready && account && chain;

        if (!ready) {
          return (
            <div
              aria-hidden={true}
              className="opacity-0 pointer-events-none"
            />
          );
        }

        if (!isConnectedAndReady) {
          return (
            <Button
              onClick={openConnectModal}
              variant="outline"
              className="h-10 px-6 text-[11px] font-bold uppercase tracking-[0.2em] border-[#0E1922]/30 text-primary hover:bg-primary hover:text-white rounded-sm transition-all shadow-lg shadow-primary/5"
            >
              <Wallet className="w-3.5 h-3.5 mr-2" />
              CONNECT_NODE
            </Button>
          );
        }

        if (chain.unsupported) {
          return (
            <Button
              onClick={openChainModal}
              variant="outline"
              className="h-10 px-6 text-[11px] font-bold uppercase tracking-[0.2em] border-destructive/50 text-destructive hover:bg-destructive hover:text-white rounded-sm transition-all"
            >
              NETWORK_MISMATCH
            </Button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {/* Network Badge */}
            <button
              onClick={openChainModal}
              className="hidden md:flex items-center gap-2 h-10 px-4 rounded-sm bg-muted/10 border border-[#0E1922]/30 hover:bg-muted/20 transition-all"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {chain.name}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
            </button>

            {/* Identity Dashboard Trigger */}
            <Dialog>
              <div className="flex items-center">
                <div className="bg-muted/10 h-10 px-5 rounded-sm flex items-center gap-5 border border-[#0E1922]/30">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-bold mono-text text-foreground">
                      {account.displayName}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold mono-text text-foreground">{points}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">XP</span>
                  </div>
                </div>

                <DialogTrigger asChild>
                  <Button variant="outline" className="h-10 w-10 p-0 border-[#0E1922]/30 bg-muted/10 hover:bg-muted/20 rounded-sm ml-2 transition-all group">
                    <User className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Button>
                </DialogTrigger>
              </div>

              <DialogContent className="studio-panel border-border max-w-sm bg-card p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    IDENTITY_DASHBOARD // V1.0
                  </h2>
                </div>

                <div className="p-8 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">ASSIGNED_ADDRESS</p>
                      <div className="p-4 bg-background border border-border mono-text text-xs break-all leading-relaxed rounded-md text-foreground/80">
                        {address}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-md border border-border bg-muted/5 space-y-1.5">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">CUMULATIVE_XP</p>
                        <p className="text-3xl font-black italic tracking-tighter text-foreground">{points}</p>
                      </div>
                      <div className="p-5 rounded-md border border-border bg-muted/5 space-y-1.5">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">NODE_STATUS</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${isOnCorrectNetwork ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-destructive animate-pulse"}`} />
                          <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
                            {isOnCorrectNetwork ? "ONLINE" : "DESYNC"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border space-y-3">
                    <Button
                      onClick={openAccountModal}
                      variant="outline"
                      className="w-full h-12 text-[11px] font-bold uppercase tracking-[0.2em] rounded-sm border-border hover:bg-muted"
                    >
                      MANAGE_WALLET
                    </Button>

                    <Button
                      onClick={() => disconnectWallet()}
                      className="w-full h-12 text-[11px] font-bold uppercase tracking-[0.2em] text-destructive border-destructive/20 hover:bg-destructive hover:text-white rounded-sm transition-all"
                      variant="outline"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      TERMINATE_LINK
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
