import { jest, expect, beforeEach, afterEach, describe, it } from '@jest/globals';
import { pingService, startKeepAlive, stopKeepAlive } from '../../src/utils/keepAlive.js';
import config from '../../src/config/index.js';

describe('KeepAlive Ping Utility Unit Tests', () => {
  const originalFetch = globalThis.fetch;
  const originalConfig = { ...config.keepAlive };

  beforeEach(() => {
    stopKeepAlive();
    jest.clearAllMocks();
  });

  afterEach(() => {
    stopKeepAlive();
    globalThis.fetch = originalFetch;
    config.keepAlive = { ...originalConfig };
  });

  it('pingService successfully performs GET request and returns status code', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const status = await pingService('https://example.com/health');

    expect(status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/health',
      expect.objectContaining({
        method: 'GET',
        headers: { 'User-Agent': 'Vetanam-KeepAlive/1.0' },
      }),
    );
  });

  it('pingService handles non-ok response status gracefully', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const status = await pingService('https://example.com/health');
    expect(status).toBe(503);
  });

  it('pingService handles fetch errors without throwing', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const status = await pingService('https://example.com/health');
    expect(status).toBeNull();
  });

  it('startKeepAlive returns null when keepAlive is disabled', () => {
    config.keepAlive = {
      enabled: false,
      url: 'https://example.com/health',
      intervalMs: 1000,
    };

    const timer = startKeepAlive();
    expect(timer).toBeNull();
  });

  it('startKeepAlive returns null when url is not set', () => {
    config.keepAlive = {
      enabled: true,
      url: '',
      intervalMs: 1000,
    };

    const timer = startKeepAlive();
    expect(timer).toBeNull();
  });

  it('startKeepAlive starts interval and stopKeepAlive clears it', () => {
    jest.useFakeTimers();

    config.keepAlive = {
      enabled: true,
      url: 'https://example.com',
      intervalMs: 5000,
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const timer = startKeepAlive();
    expect(timer).not.toBeNull();

    jest.advanceTimersByTime(5000);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/health',
      expect.any(Object),
    );

    stopKeepAlive();
    jest.useRealTimers();
  });
});
