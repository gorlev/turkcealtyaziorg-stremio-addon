require('dotenv').config({ quiet: true });

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const config = require('./config');
const landingTemplate = require('./landingTemplate');
const manifest = require('./manifest');
const { createDefaultSubtitleService } = require('./scraper');

const SEARCH_CACHE_SECONDS = 15 * 60;
const EMPTY_CACHE_SECONDS = 2 * 60;
const SUBTITLE_CACHE_SECONDS = 24 * 60 * 60;

function requestBaseUrl(req, configuredUrl, port) {
  if (configuredUrl) return configuredUrl;

  try {
    return new URL(`${req.protocol}://${req.get('host')}`).origin;
  } catch {
    return `http://127.0.0.1:${port}`;
  }
}

function parseMediaId(type, rawId) {
  if (!['movie', 'series'].includes(type)) throw new TypeError('Unsupported media type');
  const parts = rawId.split(':');
  const imdbId = parts[0];
  if (!/^tt\d+$/.test(imdbId)) throw new TypeError('Invalid IMDb id');

  if (type === 'movie') return { imdbId, type, season: null, episode: null };

  const season = Number(parts[1]);
  const episode = Number(parts[2]);
  if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 1) {
    throw new TypeError('Series ids must include a valid season and episode');
  }
  return { imdbId, type, season, episode };
}

function subtitleUrl(baseUrl, subtitle, media) {
  const season = media.season ?? 0;
  const episode = media.episode ?? 0;
  return `${baseUrl}/subtitle/${encodeURIComponent(subtitle.token)}/${season}/${episode}.vtt`;
}

function publicManifest(addonManifest, baseUrl) {
  return {
    ...addonManifest,
    logo: `${baseUrl}/images/logo.png`,
    background: `${baseUrl}/images/background.webp`,
  };
}

function cacheControl({ maxAge, staleRevalidate = 4 * 60 * 60, staleError = 7 * 24 * 60 * 60 }) {
  return `public, max-age=${maxAge}, stale-while-revalidate=${staleRevalidate}, stale-if-error=${staleError}`;
}

function createApp({
  service = createDefaultSubtitleService(),
  appConfig = config,
  addonManifest = manifest,
  logger = console,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', appConfig.trustProxy);

  app.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(
    '/images',
    express.static(path.join(__dirname, 'images'), {
      immutable: true,
      maxAge: '7d',
    }),
  );

  app.get('/', (req, res) => {
    const baseUrl = requestBaseUrl(req, appConfig.publicUrl, appConfig.port);
    res.set(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self' https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'",
    );
    res.type('html').send(landingTemplate(addonManifest, `${baseUrl}/manifest.json`));
  });

  app.get(['/configure', '/addon/configure'], (req, res) => res.redirect(302, '/'));

  app.get(['/manifest.json', '/addon/manifest.json'], (req, res) => {
    const baseUrl = requestBaseUrl(req, appConfig.publicUrl, appConfig.port);
    res.set('Cache-Control', cacheControl({ maxAge: 60 * 60 }));
    res.json(publicManifest(addonManifest, baseUrl));
  });

  const subtitleListRoutes = [
    '/subtitles/:type/:imdbId.json',
    '/subtitles/:type/:imdbId/:query.json',
    '/addon/subtitles/:type/:imdbId.json',
    '/addon/subtitles/:type/:imdbId/:query.json',
  ];

  app.get(subtitleListRoutes, async (req, res) => {
    let media;
    try {
      media = parseMediaId(req.params.type, req.params.imdbId);
    } catch (error) {
      return res.status(400).json({ subtitles: [], error: error.message });
    }

    try {
      const results = await service.findSubtitles(media);
      const baseUrl = requestBaseUrl(req, appConfig.publicUrl, appConfig.port);
      const subtitles = results.map((subtitle) => ({
        id: subtitle.id,
        lang: subtitle.lang,
        url: subtitleUrl(baseUrl, subtitle, media),
      }));

      res.set(
        'Cache-Control',
        cacheControl({ maxAge: subtitles.length > 0 ? SEARCH_CACHE_SECONDS : EMPTY_CACHE_SECONDS }),
      );
      return res.json({ subtitles });
    } catch (error) {
      logger.error?.('Subtitle lookup failed', { error: error.message, imdbId: media.imdbId });
      return res.status(502).json({ subtitles: [] });
    }
  });

  app.get('/subtitle/:token/:season/:episode.vtt', async (req, res) => {
    const season = Number(req.params.season);
    const episode = Number(req.params.episode);
    if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 0) {
      return res.status(400).type('text').send('Invalid season or episode');
    }

    try {
      const subtitle = await service.getSubtitle({
        token: req.params.token,
        season: season || null,
        episode: episode || null,
      });
      const etag = `"${crypto.createHash('sha256').update(subtitle.body).digest('base64url')}"`;
      res.set({
        'Cache-Control': cacheControl({ maxAge: SUBTITLE_CACHE_SECONDS }),
        'Content-Disposition': `inline; filename="${path.parse(subtitle.sourceName).name}.vtt"`,
        'Content-Type': 'text/vtt; charset=utf-8',
        ETag: etag,
      });
      if (req.headers['if-none-match'] === etag) return res.status(304).end();
      return res.send(subtitle.body);
    } catch (error) {
      const clientError = error instanceof TypeError;
      const notFound = /not found|contains no supported/i.test(error.message);
      const status = clientError ? 400 : notFound ? 404 : 502;
      if (status === 502) logger.error?.('Subtitle delivery failed', { error: error.message });
      return res.status(status).type('text').send(status === 404 ? 'Subtitle not found' : 'Subtitle unavailable');
    }
  });

  app.get('/healthz', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok', proxy: service.proxyEnabled ? 'enabled' : 'disabled' });
  });

  app.use((req, res) => res.redirect(302, '/'));
  return app;
}

if (require.main === module) {
  createApp().listen(config.port, () => {
    console.log(`TurkceAltyazi Stremio addon listening on port ${config.port}`);
    console.log(`Outbound proxy: ${config.proxyUrl ? 'enabled' : 'disabled'}`);
  });
}

module.exports = createApp();
module.exports.createApp = createApp;
module.exports.parseMediaId = parseMediaId;
module.exports.publicManifest = publicManifest;
