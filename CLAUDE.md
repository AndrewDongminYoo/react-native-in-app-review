# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A React Native TurboModule library that wraps the **Google Play In-App Review API** (Android) and **Apple StoreKit `requestReview`** (iOS) so apps can prompt users for ratings without leaving the app. Forked from [MinaSamir11/react-native-in-app-review](https://github.com/MinaSamir11/react-native-in-app-review) and migrated to the New Architecture (TurboModules + Codegen).

## Common Commands

```bash
# Root package
yarn install          # install all workspaces
yarn typecheck        # tsc --noEmit
yarn lint             # eslint
yarn test             # jest (unit tests)
yarn prepare          # compile src → lib/ via react-native-builder-bob (required before publishing)

# Single test file
yarn test src/__tests__/index.test.tsx

# Example app
yarn example android  # run on Android emulator/device
yarn example ios      # run on iOS simulator
yarn example start    # Metro bundler only

# Native builds (via Turbo)
yarn turbo run build:android
yarn turbo run build:ios

# Release
yarn release          # release-it: bumps version, publishes npm, creates GitHub release
```

## Architecture

### TurboModule Data Flow

```
src/NativeInAppReview.ts   ← Codegen spec (Spec interface = single source of truth)
        │
        ├── Android codegen → NativeInAppReviewSpec.kt (abstract class, auto-generated)
        │       └── InAppReviewModule.kt  extends NativeInAppReviewSpec
        │               registered by InAppReviewPackage.kt : BaseReactPackage
        │
        └── iOS codegen → NativeInAppReviewSpecJSI (C++ JSI glue, auto-generated)
                └── InAppReview.mm  implements NativeInAppReviewSpec
                        bridged via getTurboModule → NativeInAppReviewSpecJSI
```

### Platform Entry Points

| File                                                          | Role                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/NativeInAppReview.ts`                                    | Codegen spec — defines every method that crosses the JS↔native bridge      |
| `src/index.ts`                                                | Public JS API (re-exports from `InAppReview.native.ts` / `InAppReview.ts`) |
| `src/InAppReview.native.ts`                                   | Native implementation — calls `InAppReview` TurboModule                    |
| `src/InAppReview.ts`                                          | Web/non-native fallback — pure JS                                          |
| `ios/InAppReview.h` / `.mm`                                   | Obj-C++ implementation of the spec                                         |
| `android/src/main/java/com/inappreview/InAppReviewModule.kt`  | Kotlin implementation                                                      |
| `android/src/main/java/com/inappreview/InAppReviewPackage.kt` | Module registration                                                        |

### Key Conventions

- **Codegen first**: Any new native method must be added to `Spec` in `NativeInAppReview.ts` before touching native code. The codegen name (`InAppReviewSpec`) maps to `codegenConfig.name` in `package.json`.
- **Platform split**: Use `foo.native.ts` for the native call-through and `foo.ts` for the web fallback. Metro resolves `.native` automatically.
- **No JSX in native shims**: `*.native.ts` files only import from `NativeInAppReview.ts` — they contain no JSX and use the `.ts` extension.
- **Kotlin style**: Android module extends the codegen-generated abstract class `NativeInAppReviewSpec`. Never extend `ReactContextBaseJavaModule` directly.
- **iOS style**: `InAppReview.mm` must implement `getTurboModule:` returning `NativeInAppReviewSpecJSI` for JSI binding.

### Build Pipeline

`react-native-builder-bob` compiles TypeScript to `lib/` with two targets (configured in `package.json` → `react-native-builder-bob`):

- `module` (ESM, for Metro/bundlers)
- `typescript` (type declarations)

`turbo.json` declares `build:android` and `build:ios` tasks that run the example app native builds with proper input hashing for CI caching.

### Implemented API

| Method                              | iOS                                                    | Android                           | Web     |
| ----------------------------------- | ------------------------------------------------------ | --------------------------------- | ------- |
| `isAvailable()`                     | Always `true` (StoreKit always present)                | `true` when Play Store installed  | `false` |
| `requestReview()`                   | `requestReviewInScene` (14+) / `requestReview` (10.3+) | Play Core 2-step flow             | no-op   |
| `openStoreListing({ appStoreId? })` | `itms-apps://` deep-link (appStoreId required)         | `market://` → `https://` fallback | no-op   |

## Workspace Layout

```
react-native-in-app-review/   ← library root (yarn workspace)
├── src/                      ← TypeScript source; compiled to lib/
├── ios/                      ← Obj-C++ TurboModule
├── android/                  ← Kotlin TurboModule + build.gradle
├── InAppReview.podspec       ← CocoaPods spec
├── lib/                      ← compiled output (gitignored, generated by yarn prepare)
└── example/                  ← standalone RN app (yarn workspace)
    ├── src/App.tsx
    ├── ios/
    └── android/
```

## Native SDK Requirements

- **Android**: Requires Google Play Core library (`com.google.android.play:review`). Only works on devices with Google Play Store installed. `minSdkVersion` is 24.
- **iOS**: Requires StoreKit. Review prompts are rate-limited by the OS (max ~3 times per 365 days). Test with `SKStoreReviewController` in simulator — it shows a mock dialog.
