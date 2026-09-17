import config from '../config/index.js';

let pingIntervalTimer = null;

/**
 * Ping the health endpoint to prevent server from idling.
 * @param {string} url Target health endpoint URL
 * @returns {Promise<number|null>} HTTP status code or null on failure
 */
export async function pingService(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Vetanam-KeepAlive/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      console.log(`[KeepAlive] Ping successful (${res.status}) for ${url}`);
    } else {
      console.warn(`[KeepAlive] Ping returned status ${res.status} for ${url}`);
    }
    return res.status;
  } catch (err) {
    console.warn(`[KeepAlive] Ping failed for ${url}:`, err.message);
    return null;
  }
}

/**
 * Start the scheduled keep-alive ping mechanism.
 * @returns {NodeJS.Timeout|null} Timer instance or null if disabled
 */
export function startKeepAlive() {
  const { enabled, url, intervalMs } = config.keepAlive;

  if (!enabled || !url) {
    return null;
  }

  const targetUrl = url.endsWith('/health') ? url : `${url.replace(/\/$/, '')}/health`;

  console.log(`[KeepAlive] Scheduled to ping ${targetUrl} every ${intervalMs / 1000}s`);

  pingIntervalTimer = setInterval(() => {
    pingService(targetUrl);
  }, intervalMs);

  if (pingIntervalTimer && typeof pingIntervalTimer.unref === 'function') {
    pingIntervalTimer.unref();
  }

  return pingIntervalTimer;
}

/**
 * Stop the keep-alive ping timer.
 */
export function stopKeepAlive() {
  if (pingIntervalTimer) {
    clearInterval(pingIntervalTimer);
    pingIntervalTimer = null;
  }
}
