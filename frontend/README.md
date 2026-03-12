# Oracle Arena Frontend

Next.js frontend for Oracle Arena — AI-powered trivia game on the GenLayer blockchain.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` — Leave empty (PromptArena not deployed)
   - `NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS` — Oracle Arena contract address
   - `NEXT_PUBLIC_STUDIO_URL` — GenLayer Studio URL (default: https://studio.genlayer.com/api)

## Development

```bash
bun dev
```

Open [http://localhost:3000/oracle](http://localhost:3000/oracle) in your browser.

## Build

```bash
bun run build
bun start
```

## Tech Stack

- **Next.js 15** — React framework with App Router
- **TypeScript** — Type safety
- **Tailwind CSS v4** — Styling with custom glass-morphism theme
- **genlayer-js** — GenLayer blockchain SDK
- **TanStack Query (React Query)** — Data fetching and caching
- **Radix UI** — Accessible component primitives
- **shadcn/ui** — Pre-built UI components

## Wallet Management

The app uses GenLayer's account system:
- **Create Account**: Generate a new private key
- **Import Account**: Import existing private key
- **Export Account**: Export your private key (secured)
- **Disconnect**: Clear stored account data

Accounts are stored in browser's localStorage for development convenience.

## Features

- **Create Rooms**: Start a trivia game room and invite others
- **Join Rooms**: Enter by room ID and wait in the lobby
- **AI-Generated Questions**: Weekly questions created via LLM consensus (Optimistic Democracy)
- **Answer & Score**: 10-minute timed rounds, answers locked in on-chain
- **XP Leaderboard**: Rank players by XP earned from correct answers
- **Glass-morphism UI**: Premium dark theme with OKLCH colors, backdrop blur effects, and smooth animations
- **Real-time Updates**: Automatic data fetching with TanStack Query polling
