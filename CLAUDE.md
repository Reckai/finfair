# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FinFair is a React Native (Expo 54) mobile app for tracking shared expenses between pairs (couples). Users authenticate via Telegram bot, add expenses with split modes, and view debt balances. The backend is a separate service (not in this repo) at `http://192.168.0.187:3000`.

## Commands

```bash
# Start Expo dev server
npx expo start

# Start on specific platform
npx expo start --android
npx expo start --ios

# Type check (requires node_modules installed)
npx tsc --noEmit

# Install dependencies
npm install
```

No test framework is configured.

## Architecture

### Navigation Flow
`App.tsx` → `AppNavigator` (conditional auth check via Zustand store):
- **Not authenticated:** `Auth` stack screen → `AuthScreen`
- **Authenticated:** `Main` stack screen → Bottom tabs (Dashboard, AddTransaction, History, Settings)

### State Management
Single Zustand store (`src/store/useAppStore.ts`) holds all app state: user, transactions, settlements, categories, pairId, settings. No persistence layer — state resets on app restart (auth token persisted separately via `expo-secure-store`).

### Data Flow: API → Frontend Types
Backend returns `ApiTransaction` (amount as `string`, nullables) → `transactionAdapter.ts` converts to frontend `Transaction` (amount as `number`, undefineds). Always use adapter functions (`apiToTransaction`, `transactionToCreatePayload`) when crossing this boundary.

### Split Mode System
Transactions use `splitMode` (`PERSONAL` | `PARTNER` | `HALF`) + `userId` to determine expense ownership and debt:
- `PERSONAL` — payer's own expense, no debt
- `PARTNER` — full amount is debt (payer paid for the other person)
- `HALF` — 50/50 split, half is debt

Debt calculation (`utils/debtCalculator.ts`) and category breakdown (`utils/categoryCalculator.ts`) both depend on comparing `tx.userId` against `currentUserId`.

### Icon Mapping
Backend categories use MaterialCommunityIcons names (`food`, `cart`, `car`). Frontend uses Ionicons. The mapping lives in `constants/categories.ts` → `resolveIconName()` and `iconMap`.

### Key Conventions
- `categoryId` is `number` (matches backend), not `string`
- `SplitModeToggle` component is exported from `OwnerToggle.tsx` (file not renamed)
- Currency is Ukrainian Hryvnia (₴), locale is `ru` for date-fns formatting
- UI text is mixed Ukrainian/Russian

## API Integration

All HTTP calls go through `services/api.ts` (Axios singleton with JWT interceptor). Domain-specific services wrap it:
- `services/transactions.ts` — CRUD via `/transactions` and `/transactions/pair`
- `services/pairs.ts` — pair management via `/pairs/*`
- `services/auth.ts` — Telegram auth flow via `/auth/telegram`, deep link scheme `finfair://`

Auth flow: App opens Telegram bot → bot generates one-time token → deep link back to app (`finfair://auth?token=XXX`) → app exchanges token for JWT via `/auth/telegram`.
