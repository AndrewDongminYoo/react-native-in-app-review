# react-native-in-app-review

A React Native TurboModule that wraps the **Google Play In-App Review API** (Android) and **Apple StoreKit `requestReview`** (iOS), allowing apps to prompt users for ratings and reviews without leaving the app.

Built on the New Architecture (TurboModules + Codegen).

## Installation

```sh
npm install react-native-in-app-review
# or
yarn add react-native-in-app-review
```

### Android

No additional setup required. The library adds `com.google.android.play:review` automatically via its `build.gradle`.

The in-app review dialog only appears on devices with Google Play Store installed.

### iOS

No additional setup required. StoreKit is linked automatically via the podspec.

The OS rate-limits review prompts to approximately 3 times per 365-day period.

## API

### `isAvailable(): Promise<boolean>`

Returns `true` when in-app review is supported on the current device.

- **Android**: checks whether the Google Play Store (`com.android.vending`) is installed.
- **iOS**: always resolves `true` (StoreKit is always present on iOS devices).

### `requestReview(): Promise<void>`

Triggers the native in-app review dialog. The OS decides whether to show the dialog or silently suppress it (rate-limiting, eligibility, etc.).

- **Android**: calls `ReviewManager.requestReviewFlow()` then `launchReviewFlow()`. Rejects with `REVIEW_FLOW_ERROR` if the flow cannot be obtained.
- **iOS**: calls `SKStoreReviewController.requestReviewInScene(_:)` (iOS 14+) or `SKStoreReviewController.requestReview()` (fallback). Always resolves — StoreKit never reports failure to the caller.

### `openStoreListing(options?: { appStoreId?: string }): Promise<void>`

Opens the store listing page directly.

- **Android**: opens `market://details?id=<id>`, falling back to the Play Store web URL. If `appStoreId` is omitted, defaults to the app's own package name.
- **iOS**: opens the App Store via `itms-apps://` deep-link. `appStoreId` is **required** on iOS; rejects with `MISSING_APP_STORE_ID` if not provided.

## Usage

```tsx
import {
  isAvailable,
  requestReview,
  openStoreListing,
} from 'react-native-in-app-review';

// Check availability before showing any UI related to reviews
const available = await isAvailable();

// Trigger the in-app review dialog
await requestReview();

// Open the store listing (e.g. from a "Rate us" button)
// iOS: appStoreId is required
// Android: appStoreId is optional (defaults to the app's package name)
await openStoreListing({ appStoreId: '1234567890' });
```

## Platform Notes

| Behaviour                               | Android                          | iOS                                 |
| --------------------------------------- | -------------------------------- | ----------------------------------- |
| `isAvailable`                           | Checks for Play Store            | Always `true`                       |
| `requestReview` failure mode            | Rejects with `REVIEW_FLOW_ERROR` | Never rejects                       |
| `openStoreListing` without `appStoreId` | Uses package name                | Rejects with `MISSING_APP_STORE_ID` |
| Rate-limiting                           | Managed by Play Core             | Managed by StoreKit (≈ 3×/year)     |

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT
