import NativeInAppReview from "./NativeInAppReview";

export function isAvailable(): Promise<boolean> {
  return NativeInAppReview.isAvailable();
}

export function requestReview(): Promise<void> {
  return NativeInAppReview.requestReview();
}

export function openStoreListing(
  options: { appStoreId?: string } = {},
): Promise<void> {
  return NativeInAppReview.openStoreListing(options.appStoreId ?? null);
}
