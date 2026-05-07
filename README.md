# react-native-in-app-review

A React Native TurboModule that wraps the **Google Play In-App Review API** (Android) and **Apple StoreKit `requestReview`** (iOS), allowing apps to prompt users for ratings and reviews without leaving the app.

Built on the New Architecture (TurboModules + Codegen).

## Requirements

|              | Minimum                           |
| ------------ | --------------------------------- |
| React Native | 0.76+ (New Architecture required) |
| Android      | API 24 (Android 7.0)              |
| iOS          | 10.3                              |

> This library is a **TurboModule** and requires the New Architecture. If your project is still on the Old Architecture, use [MinaSamir11/react-native-in-app-review](https://github.com/MinaSamir11/react-native-in-app-review) instead.

## Installation

```sh
npm install react-native-in-app-review
# or
yarn add react-native-in-app-review
```

### iOS

Run `pod install` after installation:

```sh
cd ios && pod install
```

StoreKit is linked automatically via the podspec — no manual framework addition needed.

### Android

No additional setup required. `com.google.android.play:review` is declared in the library's `build.gradle` and resolved automatically by Gradle.

> **Requirement**: The in-app review dialog only works on devices with **Google Play Store installed**. It will not appear on emulators without Play Store or on non-Google Android devices.

## API

### `isAvailable(): Promise<boolean>`

Returns `true` when in-app review is supported on the current device. Call this before showing any review-related UI.

```ts
const supported = await isAvailable();
```

| Platform | Returns                                                          |
| -------- | ---------------------------------------------------------------- |
| Android  | `true` if Google Play Store (`com.android.vending`) is installed |
| iOS      | Always `true` — StoreKit is always present on iOS                |
| Web      | Always `false`                                                   |

---

### `requestReview(): Promise<void>`

Asks the OS to show the native in-app review dialog.

```ts
await requestReview();
```

**Important**: The promise resolving does **not** mean the dialog was shown. The OS decides silently whether to display or suppress the prompt based on rate-limiting and eligibility rules. Your app cannot detect this distinction by design.

| Platform  | Rejects when                                            |
| --------- | ------------------------------------------------------- |
| Android   | `requestReviewFlow()` fails — code: `REVIEW_FLOW_ERROR` |
| Android   | No foreground activity — code: `ACTIVITY_NULL`          |
| iOS (14+) | No active `UIWindowScene` found — code: `ACTIVITY_NULL` |
| iOS       | Never rejects for the review prompt itself              |

---

### `openStoreListing(options?): Promise<void>`

Opens the store page directly. Use this as a fallback when `isAvailable()` returns `false`, or as an alternative "Rate us" action.

```ts
await openStoreListing({ appStoreId: '1234567890' });
```

| Option       | Type     | Platform | Notes                                      |
| ------------ | -------- | -------- | ------------------------------------------ |
| `appStoreId` | `string` | iOS only | Numeric App Store ID — **required on iOS** |

| Platform | Behaviour                                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Android  | Opens `market://details?id=<packageName>`, falls back to `https://play.google.com/store/apps/details?id=<packageName>` |
| iOS      | Opens `itms-apps://itunes.apple.com/app/id<appStoreId>?action=write-review`                                            |

| Rejects with           | Cause                                                          |
| ---------------------- | -------------------------------------------------------------- |
| `MISSING_APP_STORE_ID` | iOS — `appStoreId` not provided                                |
| `INVALID_URL`          | iOS — URL could not be constructed from the given `appStoreId` |
| `OPEN_URL_FAILED`      | iOS — OS could not open the URL                                |
| `OPEN_STORE_FAILED`    | Android — both `market://` and `https://` intents failed       |
| `ACTIVITY_NULL`        | Android — no foreground activity                               |

## Usage

### Recommended pattern

```ts
import {
  isAvailable,
  openStoreListing,
  requestReview,
} from 'react-native-in-app-review';

async function promptForReview() {
  const supported = await isAvailable();

  if (supported) {
    await requestReview();
    // Note: resolving here does NOT confirm the dialog was shown.
    // The OS may suppress it silently due to rate-limiting.
  } else {
    // Fallback: open the store page directly.
    // iOS requires your numeric App Store ID.
    await openStoreListing({ appStoreId: '1234567890' });
  }
}
```

### With error handling

```ts
import { openStoreListing, requestReview } from 'react-native-in-app-review';

async function handleRateUs() {
  try {
    await requestReview();
  } catch (e) {
    // Rejected on Android when the review flow fails or the app is in background.
    // Fall back to opening the store page.
    try {
      await openStoreListing({ appStoreId: '1234567890' });
    } catch {
      // Handle gracefully — the user can still find the app manually.
    }
  }
}
```

## When to Prompt

The OS rate-limits review prompts and will silently suppress requests that come too frequently or too early in an app's lifecycle. Prompting at the right moment increases the chance the dialog is actually shown.

**Good moments to call `requestReview()`:**

- After a user completes a key action (finishes a purchase, completes a level, achieves a goal)
- After several successful sessions — not on the first launch
- When the user has just experienced a positive outcome

**Avoid calling `requestReview()`:**

- On app launch or in `useEffect` with no user interaction
- After an error, crash, or frustrating UX moment
- From a button tap labeled "Rate us" — the OS may suppress the native dialog, leaving the user confused. Use `openStoreListing` instead for explicit "Rate us" buttons.
- More than once per user session

## Caveats

### The OS controls whether the dialog appears

Both Google Play and Apple StoreKit rate-limit review prompts. The limits are approximately:

| Platform | Limit                                                |
| -------- | ---------------------------------------------------- |
| iOS      | ~3 times per 365-day period per app                  |
| Android  | Quota managed by Play Core (not publicly documented) |

Once the limit is hit, `requestReview()` resolves immediately with no dialog shown. Your app cannot detect this. Design your flow so that the user is not left waiting for a dialog that will never appear.

### Android: real device and Play Store account required

The Play In-App Review API requires:

1. The device has Google Play Store installed
2. The user is **signed in to a Google account** on the device
3. The app is **available on Google Play** (published to at least an internal testing track)

In development (local debug builds not uploaded to Play Console), `requestReviewFlow()` may fail or the dialog may not appear. Use Google's [FakeReviewManager](https://developer.android.com/guide/playcore/in-app-review/test) for local testing — this library does not expose it directly, so test via the example app pattern with a real internal-track build.

### iOS: Simulator vs real device

| Environment              | Behaviour                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Simulator                | Shows a **mock** dialog that looks identical to the real one. Rate-limiting does not apply.                                       |
| Real device (debug)      | Rate-limiting applies. Use `Settings > [App Name] > Reset Review Prompt` (if available) or delete and reinstall the app to reset. |
| Real device (TestFlight) | Real StoreKit prompts, rate-limiting applies.                                                                                     |

### `requestReview` does not guarantee a dialog

Do not tie any app logic to the assumption that `requestReview()` resolving means a rating was submitted or a dialog was shown. The promise only indicates that the OS received the request.

## Platform Notes

| Behaviour                               | Android                          | iOS                                 |
| --------------------------------------- | -------------------------------- | ----------------------------------- |
| `isAvailable()`                         | Checks for Play Store            | Always `true`                       |
| `requestReview()` failure               | Rejects with `REVIEW_FLOW_ERROR` | Never rejects for the prompt itself |
| `openStoreListing` without `appStoreId` | Uses app package name            | Rejects with `MISSING_APP_STORE_ID` |
| Rate-limiting                           | Managed by Play Core             | Managed by StoreKit (≈ 3×/year)     |
| Test environment                        | FakeReviewManager (not exposed)  | Simulator shows mock dialog         |

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT
