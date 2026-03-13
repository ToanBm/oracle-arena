import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet } from 'wagmi/chains'
import { defineChain } from 'viem'
import { cookieStorage, createStorage } from 'wagmi'

// Define GenLayer Studionet chain
export const studionet = defineChain({
  id: 61999,
  name: 'GenLayer Studio',
  nativeCurrency: {
    decimals: 18,
    name: 'GenLayer',
    symbol: 'GEN',
  },
  rpcUrls: {
    default: { http: ['https://studio.genlayer.com/api'] },
  },
  testnet: true,
})

export const config = getDefaultConfig({
  appName: 'Oracle Arena',
  projectId: 'YOUR_PROJECT_ID', // Replace with your WalletConnect Project ID
  chains: [studionet as any, mainnet],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
})
