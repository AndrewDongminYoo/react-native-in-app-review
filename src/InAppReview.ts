export function isAvailable(): Promise<boolean> {
  return Promise.resolve(false);
}

export function requestReview(): Promise<void> {
  return Promise.resolve();
}

export function openStoreListing(
  _options: { appStoreId?: string } = {},
): Promise<void> {
  return Promise.resolve();
}
