"use client";

import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useSwitchChain
} from "wagmi";
import { studionet } from "./wagmi";
import { error, userRejected } from "../utils/toast";

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

export function WalletProvider({ children }: { children: ReactNode }) {
  // SSR Safety: return a dummy provider if we're on the server or if Wagmi isn't ready
  // This prevents the "useConfig must be used within WagmiProvider" error during build
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    const dummyState: WalletState = {
      address: null,
      chainId: null,
      isConnected: false,
      isLoading: false,
      isMetaMaskInstalled: false,
      isOnCorrectNetwork: false,
    };
    const dummyValue: WalletContextValue = {
      ...dummyState,
      connectWallet: async () => "",
      disconnectWallet: () => {},
      switchWalletAccount: async () => "",
    };
    return <WalletContext.Provider value={dummyValue}>{children}</WalletContext.Provider>;
  }

  return <WalletProviderInner>{children}</WalletProviderInner>;
}

function WalletProviderInner({ children }: { children: ReactNode }) {
  const { address, isConnected, chainId, isConnecting } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const connectWallet = async () => {
    try {
      const connector = connectors.find(c => c.id === 'injected') || connectors[0];
      if (!connector) throw new Error("No wallet connector found");
      
      const result = await connectAsync({ connector, chainId: studionet.id });
      
      if (result.chainId !== studionet.id) {
        try {
          await switchChainAsync({ chainId: studionet.id });
        } catch (e) {
          console.error("Failed to switch to Studionet:", e);
        }
      }
      
      return result.accounts[0];
    } catch (err: any) {
      if (err.message?.includes("rejected")) {
        userRejected("Connection cancelled");
      } else {
        error("Failed to connect wallet", { description: err.message });
      }
      throw err;
    }
  };

  const disconnectWallet = () => {
    disconnect();
  };

  const switchWalletAccount = async () => {
    return connectWallet();
  };

  const state: WalletState = useMemo(() => ({
    address: address || null,
    chainId: chainId ? `0x${chainId.toString(16)}` : null,
    isConnected,
    isLoading: isConnecting,
    isMetaMaskInstalled: typeof window !== 'undefined' && !!window.ethereum,
    isOnCorrectNetwork: chainId === studionet.id,
  }), [address, isConnected, chainId, isConnecting]);

  const value: WalletContextValue = {
    ...state,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
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
