# In-App Review API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `multiply()` scaffold with `isAvailable()`, `requestReview()`, and `openStoreListing()` backed by StoreKit (iOS) and Play In-App Review (Android).

**Architecture:** A thin JS wrapper layer (`InAppReview.native.tsx` / `InAppReview.tsx`) sits on top of a Codegen TurboModule spec (`NativeInAppReview.ts`). Platform-specific implementations extend the auto-generated abstract class/protocol. The Codegen spec uses a flat `appStoreId: string | null` parameter (not an options object) to avoid C++ struct generation in iOS ObjC++; the public JS API wraps this with `{ appStoreId?: string }`.

**Tech Stack:** React Native 0.85, TurboModules + Codegen, StoreKit (iOS 10.3+), Google Play Core `review:2.0.2` (Android), Jest + `@react-native/jest-preset`

---

## File Map

| Action | File                                                         |
| ------ | ------------------------------------------------------------ |
| Modify | `src/NativeInAppReview.ts`                                   |
| Modify | `src/index.tsx`                                              |
| Modify | `src/__tests__/index.test.tsx`                               |
| Create | `src/InAppReview.native.tsx`                                 |
| Create | `src/InAppReview.tsx`                                        |
| Delete | `src/multiply.tsx`                                           |
| Delete | `src/multiply.native.tsx`                                    |
| Modify | `ios/InAppReview.h`                                          |
| Modify | `ios/InAppReview.mm`                                         |
| Modify | `android/build.gradle`                                       |
| Modify | `android/src/main/java/com/inappreview/InAppReviewModule.kt` |
| Modify | `example/src/App.tsx`                                        |
| Modify | `README.md`                                                  |
| Modify | `CLAUDE.md`                                                  |

---

## Task 1: Codegen Spec

**Files:**

- Modify: `src/NativeInAppReview.ts`

- [ ] **Step 1: Replace NativeInAppReview.ts**

```ts
import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  isAvailable(): Promise<boolean>;
  requestReview(): Promise<void>;
  openStoreListing(appStoreId: string | null): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('InAppReview');
```

> Note: `appStoreId` is a flat nullable string — not an options object — so Codegen generates clean `NSString * _Nullable` on iOS and `@Nullable String` on Android instead of C++ structs.

- [ ] **Step 2: Verify typecheck now fails (expected)**

```bash
yarn typecheck
```

Expected: errors referencing `multiply` in `src/multiply.native.tsx`. This confirms we broke the contract and need to implement the new one.

---

## Task 2: JS Layer — Write Failing Tests

**Files:**

- Modify: `src/__tests__/index.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

jest.mock('../NativeInAppReview', () => ({
  isAvailable: jest.fn(),
  requestReview: jest.fn(),
  openStoreListing: jest.fn(),
}));

import NativeInAppReview from '../NativeInAppReview';
import {
  isAvailable,
  openStoreListing,
  requestReview,
} from '../InAppReview.native';

const native = NativeInAppReview as {
  isAvailable: ReturnType<typeof jest.fn>;
  requestReview: ReturnType<typeof jest.fn>;
  openStoreListing: ReturnType<typeof jest.fn>;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isAvailable', () => {
  it('resolves true when native resolves true', async () => {
    native.isAvailable.mockResolvedValueOnce(true);
    expect(await isAvailable()).toBe(true);
  });

  it('resolves false when native resolves false', async () => {
    native.isAvailable.mockResolvedValueOnce(false);
    expect(await isAvailable()).toBe(false);
  });
});

describe('requestReview', () => {
  it('resolves when native resolves', async () => {
    native.requestReview.mockResolvedValueOnce(undefined);
    await expect(requestReview()).resolves.toBeUndefined();
  });

  it('rejects when native rejects', async () => {
    native.requestReview.mockRejectedValueOnce(new Error('REVIEW_FLOW_ERROR'));
    await expect(requestReview()).rejects.toThrow('REVIEW_FLOW_ERROR');
  });
});

describe('openStoreListing', () => {
  it('passes appStoreId string to native', async () => {
    native.openStoreListing.mockResolvedValueOnce(undefined);
    await openStoreListing({ appStoreId: '12345' });
    expect(native.openStoreListing).toHaveBeenCalledWith('12345');
  });

  it('passes null when appStoreId is omitted', async () => {
    native.openStoreListing.mockResolvedValueOnce(undefined);
    await openStoreListing();
    expect(native.openStoreListing).toHaveBeenCalledWith(null);
  });

  it('passes null when options is empty', async () => {
    native.openStoreListing.mockResolvedValueOnce(undefined);
    await openStoreListing({});
    expect(native.openStoreListing).toHaveBeenCalledWith(null);
  });

  it('rejects when native rejects', async () => {
    native.openStoreListing.mockRejectedValueOnce(
      new Error('MISSING_APP_STORE_ID')
    );
    await expect(openStoreListing({})).rejects.toThrow('MISSING_APP_STORE_ID');
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
yarn test
```

Expected: `Cannot find module '../InAppReview.native'`

---

## Task 3: JS Layer — Implementation

**Files:**

- Create: `src/InAppReview.native.tsx`
- Create: `src/InAppReview.tsx`
- Modify: `src/index.tsx`
- Delete: `src/multiply.tsx`
- Delete: `src/multiply.native.tsx`

- [ ] **Step 1: Create `src/InAppReview.native.tsx`**

```ts
import NativeInAppReview from './NativeInAppReview';

export function isAvailable(): Promise<boolean> {
  return NativeInAppReview.isAvailable();
}

export function requestReview(): Promise<void> {
  return NativeInAppReview.requestReview();
}

export function openStoreListing(
  options: { appStoreId?: string } = {}
): Promise<void> {
  return NativeInAppReview.openStoreListing(options.appStoreId ?? null);
}
```

- [ ] **Step 2: Create `src/InAppReview.tsx` (web fallback)**

```ts
export function isAvailable(): Promise<boolean> {
  return Promise.resolve(false);
}

export function requestReview(): Promise<void> {
  return Promise.resolve();
}

export function openStoreListing(
  _options: { appStoreId?: string } = {}
): Promise<void> {
  return Promise.resolve();
}
```

- [ ] **Step 3: Update `src/index.tsx`**

```ts
export { isAvailable, openStoreListing, requestReview } from './InAppReview';
```

- [ ] **Step 4: Delete multiply files**

```bash
rm src/multiply.tsx src/multiply.native.tsx
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
yarn test
```

Expected: all 8 tests pass, 0 failures.

- [ ] **Step 6: Run typecheck**

```bash
yarn typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/NativeInAppReview.ts src/index.tsx src/InAppReview.native.tsx src/InAppReview.tsx src/__tests__/index.test.tsx
git rm src/multiply.tsx src/multiply.native.tsx
git commit -m "feat: implement JS layer for isAvailable, requestReview, openStoreListing"
```

---

## Task 4: iOS Implementation

**Files:**

- Modify: `ios/InAppReview.h`
- Modify: `ios/InAppReview.mm`

- [ ] **Step 1: Replace `ios/InAppReview.h`**

```objc
#import <InAppReviewSpec/InAppReviewSpec.h>

@interface InAppReview : NSObject <NativeInAppReviewSpec>
@end
```

(Unchanged from scaffold — the generated protocol `NativeInAppReviewSpec` now declares the new methods.)

- [ ] **Step 2: Replace `ios/InAppReview.mm`**

```objc
#import "InAppReview.h"
@import StoreKit;
@import UIKit;

@implementation InAppReview

- (void)isAvailable:(RCTPromiseResolveBlock)resolve
             reject:(__unused RCTPromiseRejectBlock)reject
{
  if (@available(iOS 10.3, *)) {
    resolve(@YES);
  } else {
    resolve(@NO);
  }
}

- (void)requestReview:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  if (@available(iOS 14.0, *)) {
    dispatch_async(dispatch_get_main_queue(), ^{
      UIWindowScene *activeScene = nil;
      for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
        if (scene.activationState == UISceneActivationStateForegroundActive &&
            [scene isKindOfClass:[UIWindowScene class]]) {
          activeScene = (UIWindowScene *)scene;
          break;
        }
      }
      if (activeScene) {
        [SKStoreReviewController requestReviewInScene:activeScene];
        resolve(nil);
      } else {
        reject(@"ACTIVITY_NULL", @"No active UIWindowScene found", nil);
      }
    });
  } else if (@available(iOS 10.3, *)) {
    dispatch_async(dispatch_get_main_queue(), ^{
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
      [SKStoreReviewController requestReview];
#pragma clang diagnostic pop
      resolve(nil);
    });
  } else {
    reject(@"UNSUPPORTED", @"iOS 10.3+ required", nil);
  }
}

- (void)openStoreListing:(NSString * _Nullable)appStoreId
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
  if (!appStoreId || appStoreId.length == 0) {
    reject(@"MISSING_APP_STORE_ID", @"appStoreId is required on iOS", nil);
    return;
  }
  NSString *urlString = [NSString stringWithFormat:
    @"itms-apps://itunes.apple.com/app/id%@?action=write-review", appStoreId];
  NSURL *url = [NSURL URLWithString:urlString];
  dispatch_async(dispatch_get_main_queue(), ^{
    [UIApplication.sharedApplication
        openURL:url
        options:@{}
        completionHandler:^(BOOL success) {
      if (success) {
        resolve(nil);
      } else {
        reject(@"OPEN_URL_FAILED", @"Failed to open App Store URL", nil);
      }
    }];
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeInAppReviewSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"InAppReview";
}

@end
```

> `#pragma clang diagnostic` suppresses the deprecation warning for `requestReview` on iOS 10.3–13.x. The deprecated path is intentional — it's the only available API below iOS 14.

- [ ] **Step 3: Commit**

```bash
git add ios/InAppReview.h ios/InAppReview.mm
git commit -m "feat(ios): implement isAvailable, requestReview, openStoreListing via StoreKit"
```

---

## Task 5: Android Implementation

**Files:**

- Modify: `android/build.gradle`
- Modify: `android/src/main/java/com/inappreview/InAppReviewModule.kt`

- [ ] **Step 1: Add Play Review dependency to `android/build.gradle`**

In the `dependencies` block, add after `implementation "com.facebook.react:react-android"`:

```groovy
dependencies {
  implementation "com.facebook.react:react-android"
  implementation "com.google.android.play:review:2.0.2"
}
```

- [ ] **Step 2: Replace `android/src/main/java/com/inappreview/InAppReviewModule.kt`**

```kotlin
package com.inappreview

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.play.core.review.ReviewManagerFactory

class InAppReviewModule(reactContext: ReactApplicationContext) :
    NativeInAppReviewSpec(reactContext) {

  private val reviewManager = ReviewManagerFactory.create(reactContext)

  override fun isAvailable(promise: Promise) {
    val hasPlayStore = try {
      reactApplicationContext.packageManager
        .getPackageInfo("com.android.vending", 0)
      true
    } catch (e: PackageManager.NameNotFoundException) {
      false
    }
    promise.resolve(hasPlayStore)
  }

  override fun requestReview(promise: Promise) {
    reviewManager.requestReviewFlow().addOnCompleteListener { request ->
      if (!request.isSuccessful) {
        promise.reject("REVIEW_FLOW_ERROR", request.exception)
        return@addOnCompleteListener
      }
      val activity = currentActivity
      if (activity == null) {
        promise.reject("ACTIVITY_NULL", "No foreground activity found")
        return@addOnCompleteListener
      }
      reviewManager.launchReviewFlow(activity, request.result)
        .addOnCompleteListener { promise.resolve(null) }
    }
  }

  override fun openStoreListing(appStoreId: String?, promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("OPEN_STORE_FAILED", "No foreground activity found")
      return
    }
    val packageName = reactApplicationContext.packageName
    val marketIntent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName"))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val webIntent = Intent(
      Intent.ACTION_VIEW,
      Uri.parse("https://play.google.com/store/apps/details?id=$packageName")
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      activity.startActivity(marketIntent)
      promise.resolve(null)
    } catch (e: Exception) {
      try {
        activity.startActivity(webIntent)
        promise.resolve(null)
      } catch (e2: Exception) {
        promise.reject("OPEN_STORE_FAILED", "Failed to open Play Store", e2)
      }
    }
  }

  companion object {
    const val NAME = NativeInAppReviewSpec.NAME
  }
}
```

> `isAvailable` checks for the Play Store app (`com.android.vending`) via `PackageManager` — no extra dependency needed. `openStoreListing` ignores `appStoreId` (Android uses the auto-detected package name). The `market://` intent is tried first; the `https://` URL is the fallback.

- [ ] **Step 3: Commit**

```bash
git add android/build.gradle android/src/main/java/com/inappreview/InAppReviewModule.kt
git commit -m "feat(android): implement isAvailable, requestReview, openStoreListing via Play Core"
```

---

## Task 6: Example App + Docs

**Files:**

- Modify: `example/src/App.tsx`
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace `example/src/App.tsx`**

```tsx
import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import {
  isAvailable,
  openStoreListing,
  requestReview,
} from 'react-native-in-app-review';

export default function App() {
  const [status, setStatus] = useState('');

  async function handleIsAvailable() {
    const available = await isAvailable();
    setStatus(`isAvailable: ${available}`);
  }

  async function handleRequestReview() {
    try {
      await requestReview();
      setStatus('requestReview: resolved');
    } catch (e: unknown) {
      setStatus(
        `requestReview error: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  async function handleOpenStoreListing() {
    try {
      // Replace '000000000' with your real App Store ID on iOS
      await openStoreListing({ appStoreId: '000000000' });
      setStatus('openStoreListing: resolved');
    } catch (e: unknown) {
      setStatus(
        `openStoreListing error: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      <Button title="isAvailable" onPress={handleIsAvailable} />
      <Button title="requestReview" onPress={handleRequestReview} />
      <Button title="openStoreListing" onPress={handleOpenStoreListing} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  status: { marginBottom: 20, paddingHorizontal: 20, textAlign: 'center' },
});
```

- [ ] **Step 2: Replace `README.md`**

````md
# react-native-in-app-review

Prompt users to rate your app without leaving it. Wraps the [Google Play In-App Review API](https://developer.android.com/guide/playcore/in-app-review) (Android) and [StoreKit `requestReview`](https://developer.apple.com/documentation/storekit/skstorereviewcontroller) (iOS).

## Installation

```sh
npm install react-native-in-app-review
```

## Usage

```ts
import {
  isAvailable,
  requestReview,
  openStoreListing,
} from 'react-native-in-app-review';

// Check support before prompting
const supported = await isAvailable();

if (supported) {
  await requestReview();
} else {
  // Fall back to opening the store page
  await openStoreListing({ appStoreId: '123456789' }); // appStoreId required on iOS
}
```

## API

### `isAvailable(): Promise<boolean>`

Returns `true` if the device can show a native review dialog:

- **iOS**: `true` on iOS 10.3+
- **Android**: `true` when Google Play Store is installed
- **Web**: always `false`

### `requestReview(): Promise<void>`

Asks the OS to show the review prompt. The OS may silently suppress the dialog (iOS: max ~3 times/year; Android: rate-limited by Play). Resolves regardless of whether a dialog was shown — the OS intentionally hides this from apps.

### `openStoreListing(options?): Promise<void>`

Opens the store page directly.

| Option       | Type     | Required | Description                               |
| ------------ | -------- | -------- | ----------------------------------------- |
| `appStoreId` | `string` | iOS only | Numeric App Store ID (e.g. `'123456789'`) |

- **Android**: opens `market://details?id=<packageName>`, falls back to `https://play.google.com/...`
- **iOS/macOS**: opens `itms-apps://itunes.apple.com/app/id<appStoreId>?action=write-review`

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)

## License

MIT
````

- [ ] **Step 3: Update `CLAUDE.md` — remove "not yet implemented" language**

Find the section under `### What Needs to Be Implemented` and replace it with:

```md
### Implemented API

| Method                              | iOS                                                             | Android                           | Web     |
| ----------------------------------- | --------------------------------------------------------------- | --------------------------------- | ------- |
| `isAvailable()`                     | `true` on iOS 10.3+                                             | `true` when Play Store installed  | `false` |
| `requestReview()`                   | StoreKit `requestReviewInScene` (14+) / `requestReview` (10.3+) | Play Core 2-step flow             | no-op   |
| `openStoreListing({ appStoreId? })` | `itms-apps://` URL                                              | `market://` → `https://` fallback | no-op   |
```

- [ ] **Step 4: Run lint + typecheck**

```bash
yarn lint && yarn typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add example/src/App.tsx README.md CLAUDE.md
git commit -m "docs: update README and example app for new in-app review API"
```
