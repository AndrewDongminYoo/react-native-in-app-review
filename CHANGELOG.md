# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-06-18

### Fixed

- Android: use `getCurrentActivity()` instead of the deprecated `currentActivity` field in `InAppReviewModule`, preventing a null-activity crash when launching the review flow.

### Changed

- Align `@eslint/js` to the ESLint 9 line (`^9.39.0`) to resolve a peer-dependency version mismatch.
- Update linting tool versions in `trunk.yaml`.

## [0.1.0] - 2026-05-07

### Added

- Initial release of the New Architecture (TurboModule) rewrite wrapping the Google Play In-App Review API (Android) and Apple StoreKit `requestReview` (iOS).
- `isAvailable()`, `requestReview()`, and `openStoreListing({ appStoreId? })` across iOS, Android, and a web no-op fallback.

[0.1.1]: https://github.com/AndrewDongminYoo/react-native-in-app-review/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/AndrewDongminYoo/react-native-in-app-review/releases/tag/v0.1.0
