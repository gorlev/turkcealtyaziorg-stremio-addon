const DEFAULT_PORT = 3648;

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTrustProxy(value) {
  if (value === undefined || value === null || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;

  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : value;
}

function normalizePublicUrl(value) {
  if (!value) return null;
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('PUBLIC_URL must use http or https');
  }
  return parsed.toString().replace(/\/$/, '');
}

function normalizeProxyUrl(value) {
  if (!value) return null;
  const parsed = new URL(value);
  const supportedProtocols = ['http:', 'https:', 'socks:', 'socks4:', 'socks4a:', 'socks5:', 'socks5h:'];
  if (!supportedProtocols.includes(parsed.protocol)) {
    throw new Error('PROXY_LINK must use http, https, socks4, socks4a, socks5 or socks5h');
  }
  return parsed.toString();
}

function loadConfig(env = process.env) {
  const port = parsePositiveInteger(env.PORT, DEFAULT_PORT);
  const trustProxyValue = env.TRUST_PROXY ?? env.TRUST_PROXY_NUMBER;

  return {
    port,
    publicUrl: normalizePublicUrl(env.PUBLIC_URL || env.ADDON_BASE_URL),
    proxyUrl: normalizeProxyUrl(env.PROXY_LINK),
    trustProxy: parseTrustProxy(trustProxyValue),
    upstreamBaseUrl: 'https://turkcealtyazi.org',
    upstreamConcurrency: parsePositiveInteger(env.UPSTREAM_CONCURRENCY, 8),
    requestTimeoutMs: parsePositiveInteger(env.REQUEST_TIMEOUT_MS, 12_000),
    maxArchiveBytes: parsePositiveInteger(env.MAX_ARCHIVE_BYTES, 10 * 1024 * 1024),
  };
}

module.exports = loadConfig();
module.exports.loadConfig = loadConfig;
