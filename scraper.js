require('dotenv').config({ quiet: true });

const config = require('./config');
const { createSubtitleService } = require('./lib/subtitleService');
const { createTurkceAltyaziClient } = require('./lib/turkcealtyaziClient');

function createDefaultSubtitleService(overrides = {}) {
  const proxyUrl = Object.prototype.hasOwnProperty.call(overrides, 'proxyUrl')
    ? overrides.proxyUrl
    : config.proxyUrl;
  const client =
    overrides.client ||
    createTurkceAltyaziClient({
      baseUrl: overrides.upstreamBaseUrl || config.upstreamBaseUrl,
      proxyUrl,
      timeoutMs: overrides.requestTimeoutMs || config.requestTimeoutMs,
      maxArchiveBytes: overrides.maxArchiveBytes || config.maxArchiveBytes,
      concurrency: overrides.upstreamConcurrency || config.upstreamConcurrency,
    });

  return createSubtitleService({
    client,
    logger: overrides.logger,
    detailConcurrency: overrides.detailConcurrency || 4,
  });
}

module.exports = {
  createDefaultSubtitleService,
};
