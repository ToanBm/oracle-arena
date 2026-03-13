"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { error, userRejected } from "../utils/toast";

const STUDIONET_CHAIN_ID = 61999;
const STUDIONET_HEX = "0xF22F";

export interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isMetaMaskInstalled: boolean;
  isOnCorrectNetwork: boolean;
}

interface WalletContextValue extends WalletState {
  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
  switchWalletAccount: () => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const eth = () => (window as any).ethereum;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  useEffect(() => {
    setIsMetaMaskInstalled(!!eth());
    if (!eth()) return;

    eth().request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts.length > 0) setAddress(accounts[0]);
    });
    eth().request({ method: "eth_chainId" }).then(setChainId);

    const onAccounts = (accounts: string[]) => setAddress(accounts.length > 0 ? accounts[0] : null);
    const onChain = (id: string) => setChainId(id);

    eth().on("accountsChanged", onAccounts);
    eth().on("chainChanged", onChain);
    return () => {
      eth().removeListener("accountsChanged", onAccounts);
      eth().removeListener("chainChanged", onChain);
    };
  }, []);

  const switchToStudionet = async () => {
    try {
      await eth().request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: STUDIONET_HEX }],
      });
    } catch (switchErr: any) {
      if (switchErr.code === 4902) {
        await eth().request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: STUDIONET_HEX,
            chainName: "GenLayer Studio",
            nativeCurrency: { name: "GenLayer", symbol: "GEN", decimals: 18 },
            rpcUrls: ["https://studio.genlayer.com/api"],
          }],
        });
      }
    }
  };

  const connectWallet = useCallback(async () => {
    if (!eth()) throw new Error("No wallet found. Please install MetaMask.");
    setIsLoading(true);
    try {
      const accounts: string[] = await eth().request({ method: "eth_requestAccounts" });
      setAddress(accounts[0]);
      await switchToStudionet();
      return accounts[0];
    } catch (err: any) {
      if (err.code === 4001) {
        userRejected("Connection cancelled");
      } else {
        error("Failed to connect wallet", { description: err.message });
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => setAddress(null), []);

  const isConnected = !!address;
  const isOnCorrectNetwork = chainId?.toLowerCase() === STUDIONET_HEX.toLowerCase();

  const value: WalletContextValue = {
    address,
    chainId,
    isConnected,
    isLoading,
    isMetaMaskInstalled,
    isOnCorrectNetwork,
    connectWallet,
    disconnectWallet,
    switchWalletAccount: connectWallet,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
