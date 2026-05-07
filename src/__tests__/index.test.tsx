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
