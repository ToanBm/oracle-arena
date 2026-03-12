# Gemini Developer Guide - Oracle Arena (GenLayer)

This file serves as a memory for Gemini CLI to ensure consistent and successful development on the Oracle Arena project.

## 🛠 GenLayer Development Rules

### 1. Deterministic Contract State (`DISAGREE` Fix)
To avoid validator disagreement during deployment or transaction execution:
- **Time Synchronization:** Never use `gl.message.timestamp`. Instead, use the helper to parse `gl.message_raw["datetime"]`.
- **Minimalistic `__init__`:** Declare `TreeMap` at the class level. VM handles the initialization.
- **Seeding Data:** Use a separate `@gl.public.write` function (e.g., `seed_solo_challenges()`) to populate initial data AFTER deployment.

## 🎨 UI/UX Design System: "Minimalist Studio"

### 1. Visual Hierarchy & Radii
- **Main Panels / Modals:** Hardcoded **16px** (Use `.studio-panel`).
- **Sub-components / Lists / Cards:** **8px** (`rounded-md`).
- **Action Elements / Buttons / Badges / Tabs / Inputs:** **4px** (`rounded-sm`).

### 2. Typography Standard
- **Metadata / Labels / Status:** `text-[11px]`, ALL CAPS, `tracking-[0.2em]`.
- **Body Content:** `text-sm` (14px).
- **AI Feedback / Headings:** `text-base` (16px) or larger.
- **Italic Usage:** Use italics for Scenario descriptions and Quote blocks to enhance the "Oracle" feel.

### 3. Theme & Contrast (Light Mode focus)
- **Border Principle:** Use `#0E1922` as the base border color. Apply with opacity (e.g., `border-[#0E1922]/30`) to create sharp, technical gray lines.
- **Backgrounds:** Light Mode uses `#f1f5f9` (Background) and `#ffffff` (Cards).
- **Navigation:** Header is `bg-transparent` with **90% width**. Content must maintain a **24px gap** from the header bottom.

## 🔑 Infrastructure
- **Wallet:** Use **Wagmi + RainbowKit**. Custom chains for GenLayer Studionet are defined in `@/lib/genlayer/wagmi.ts`.
- **Modals:** Use `createPortal` to `document.body` to avoid clipping issues. Logic must be in the main return flow to prevent focus loss during re-renders.

## 📌 Deployment Commands
- **Deploy Prompt Gladiator:** `npx genlayer deploy --contract contracts/prompt_arena.py`
- **Deploy Oracle Arena:** `npx genlayer deploy --contract contracts/oracle_arena.py`
- **Seeding:** `npx genlayer write <ADDRESS> seed_solo_challenges`
