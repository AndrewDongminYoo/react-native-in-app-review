# In-App Review API Design

**Date:** 2026-05-07
**Status:** Approved

## Overview

Replace the `multiply()` scaffold with a real in-app review API. The library wraps the Google Play In-App Review API (Android) and Apple StoreKit `requestReview` (iOS) so apps can prompt users for ratings without leaving the app.

Three public methods:

| Method                              | Return             | Description                                        |
| ----------------------------------- | ------------------ | -------------------------------------------------- |
| `isAvailable()`                     | `Promise<boolean>` | Whether the device can show a native review dialog |
| `requestReview()`                   | `Promise<void>`    | Attempt to show the OS review prompt               |
| `openStoreListing({ appStoreId? })` | `Promise<void>`    | Open the store page directly                       |

## API Surface

### JS exports (`src/index.tsx`)

```ts
export { isAvailable, requestReview, openStoreListing } from './InAppReview';
```

Named exports only (no default export). Consistent with the existing TurboModule scaffold pattern and works cleanly with `verbatimModuleSyntax`.

### Codegen Spec (`src/NativeInAppReview.ts`)

```ts
import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  isAvailable(): Promise<boolean>;
  requestReview(): Promise<void>;
  openStoreListing(options: { appStoreId?: string }): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('InAppReview');
```

`options` is passed as an object so Codegen maps it to `ReadableMap` on Android and `NSDictionary` on iOS — required for optional fields in TurboModule specs.

## Platform Split

Metro resolves `.native.tsx` over `.tsx` automatically:

| File                         | Platform      | Behaviour                |
| ---------------------------- | ------------- | ------------------------ |
| `src/InAppReview.native.tsx` | iOS + Android | Delegates to TurboModule |
| `src/InAppReview.tsx`        | Web / other   | No-op fallback           |

### Web Fallback (`src/InAppReview.tsx`)

- `isAvailable()` → `Promise.resolve(false)`
- `requestReview()` → `Promise.resolve()`
- `openStoreListing()` → `Promise.resolve()` (no-op; no `window.open` — store URLs are not meaningful in a browser context)

## iOS Implementation

**File:** `ios/InAppReview.mm`

### `isAvailable`

Returns `true` when running iOS 10.3+, which is StoreKit's minimum deployment target. Always resolves (never rejects).

### `requestReview`

- iOS 14.0+: `[SKStoreReviewController requestReviewInScene:scene]` using the foreground active `UIWindowScene`.
- iOS 10.3 – 13.x: `[SKStoreReviewController requestReview]` (deprecated but still functional).
- Below iOS 10.3: rejects with `UNSUPPORTED`.
- **Must run on main thread** — all UIKit calls dispatched via `dispatch_get_main_queue()`.
- The OS silently rate-limits prompts (max ~3/year). The promise resolves after `launchReviewFlow` completes regardless of whether a dialog was shown — this matches OS behaviour that intentionally hides suppression from apps.

### `openStoreListing`

- Requires `appStoreId` in options. Rejects with `MISSING_APP_STORE_ID` if absent.
- Opens: `itms-apps://itunes.apple.com/app/id{appStoreId}?action=write-review`
- Uses `UIApplication openURL:options:completionHandler:`. Rejects with `OPEN_URL_FAILED` if the OS returns `NO`.

## Android Implementation

**Files:** `android/src/main/java/com/inappreview/InAppReviewModule.kt`, `android/build.gradle`

### New dependency

```groovy
implementation "com.google.android.play:review:2.0.2"
implementation "com.google.android.play:review-ktx:2.0.2"
```

### `isAvailable`

Checks Google Play Services availability via `GoogleApiAvailability.isGooglePlayServicesAvailable()`. Returns `true` when result is `ConnectionResult.SUCCESS`. Always resolves.

### `requestReview`

Two-step async flow required by Play Core:

1. `reviewManager.requestReviewFlow()` — fetches a `ReviewInfo` token.
2. `reviewManager.launchReviewFlow(activity, reviewInfo)` — shows the dialog.

Error paths:

- `requestReviewFlow` failure → reject with `REVIEW_FLOW_ERROR`.
- `currentActivity == null` → reject with `ACTIVITY_NULL` (app in background).
- `launchReviewFlow` completion always resolves (OS hides suppression, matching iOS behaviour).

The `ReviewManager` instance is created once at module init via `ReviewManagerFactory.create(reactContext)`.

### `openStoreListing`

- Package name auto-detected: `reactApplicationContext.packageName`.
- Primary intent: `market://details?id={packageName}` (`Intent.ACTION_VIEW`).
- Fallback (if Play Store not installed): `https://play.google.com/store/apps/details?id={packageName}` opened via browser.
- Rejects with `OPEN_STORE_FAILED` if neither resolves.

## Error Codes

| Code                   | Platform | Cause                                           |
| ---------------------- | -------- | ----------------------------------------------- |
| `UNSUPPORTED`          | iOS      | OS version below 10.3                           |
| `MISSING_APP_STORE_ID` | iOS      | `openStoreListing` called without `appStoreId`  |
| `OPEN_URL_FAILED`      | iOS      | `UIApplication openURL` returned NO             |
| `REVIEW_FLOW_ERROR`    | Android  | `requestReviewFlow` task failed                 |
| `ACTIVITY_NULL`        | Android  | `currentActivity` is null when launching review |
| `OPEN_STORE_FAILED`    | Android  | Both market:// and https:// intents failed      |

## Files to Change

| Action  | File                                                         |
| ------- | ------------------------------------------------------------ |
| Replace | `src/NativeInAppReview.ts`                                   |
| Replace | `src/index.tsx`                                              |
| Delete  | `src/multiply.tsx`                                           |
| Delete  | `src/multiply.native.tsx`                                    |
| Create  | `src/InAppReview.tsx`                                        |
| Create  | `src/InAppReview.native.tsx`                                 |
| Replace | `ios/InAppReview.h`                                          |
| Replace | `ios/InAppReview.mm`                                         |
| Replace | `android/src/main/java/com/inappreview/InAppReviewModule.kt` |
| Update  | `android/build.gradle` (add Play Review deps)                |
| Update  | `example/src/App.tsx` (demonstrate new API)                  |
| Update  | `README.md`                                                  |
| Update  | `CLAUDE.md` (remove "not yet implemented" note)              |

## Out of Scope

- macOS / Windows / tvOS support
- Detecting whether the review dialog was actually shown (the OS intentionally prevents this)
- Workarounds for the OS rate limit
