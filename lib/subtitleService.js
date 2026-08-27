const { SingleFlight, TtlCache, createLimiter } = require('./cache');
const { extractSubtitleFromArchive } = require('./archive');
const { decodeSubtitleToken, encodeSubtitleToken } = require('./token');

const SEARCH_TTL_MS = 15 * 60 * 1000;
const NEGATIVE_SEARCH_TTL_MS = 2 * 60 * 1000;
const LISTING_TTL_MS = 15 * 60 * 1000;
const DETAIL_TTL_MS = 6 * 60 * 60 * 1000;
const ARCHIVE_TTL_MS = 6 * 60 * 60 * 1000;
const SUBTITLE_TTL_MS = 24 * 60 * 60 * 1000;

function cleanErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function createSubtitleService({ client, logger = console, detailConcurrency = 4 } = {}) {
  if (!client) throw new TypeError('client is required');

  const searchCache = new TtlCache({ maxEntries: 1_000, maxBytes: 8 * 1024 * 1024 });
  const listingCache = new TtlCache({ maxEntries: 500, maxBytes: 16 * 1024 * 1024 });
  const detailCache = new TtlCache({ maxEntries: 4_000, maxBytes: 16 * 1024 * 1024 });
  const archiveCache = new TtlCache({ maxEntries: 250, maxBytes: 64 * 1024 * 1024 });
  const subtitleCache = new TtlCache({ maxEntries: 1_000, maxBytes: 64 * 1024 * 1024 });
  const searchFlight = new SingleFlight();
  const listingFlight = new SingleFlight();
  const detailFlight = new SingleFlight();
  const archiveFlight = new SingleFlight();
  const subtitleFlight = new SingleFlight();

  async function getDownloadInfo(candidate) {
    const cached = detailCache.get(candidate.pageUrl);
    if (cached) return cached;

    return detailFlight.run(candidate.pageUrl, async () => {
      const secondCached = detailCache.get(candidate.pageUrl);
      if (secondCached) return secondCached;
      const info = await client.getDownloadInfo(candidate.pageUrl);
      const value = { ...info, isPackage: candidate.isPackage };
      detailCache.set(candidate.pageUrl, value, DETAIL_TTL_MS);
      return value;
    });
  }

  async function getListing(imdbId, type) {
    const key = `${type}:${imdbId}`;
    const cached = listingCache.get(key);
    if (cached) return cached;

    return listingFlight.run(key, async () => {
      const secondCached = listingCache.get(key);
      if (secondCached) return secondCached;

      const titlePage = await client.findTitlePage(imdbId);
      if (!titlePage) {
        listingCache.set(key, [], NEGATIVE_SEARCH_TTL_MS);
        return [];
      }

      const candidates = await client.listCandidates(titlePage, {
        type,
        season: null,
        episode: null,
      });
      listingCache.set(key, candidates, LISTING_TTL_MS);
      return candidates;
    });
  }

  async function findSubtitles({ imdbId, type, season = null, episode = null }) {
    const cacheKey = `${type}:${imdbId}:${season || 0}:${episode || 0}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    return searchFlight.run(cacheKey, async () => {
      const secondCached = searchCache.get(cacheKey);
      if (secondCached) return secondCached;

      const listing = await getListing(imdbId, type);
      const candidates = listing
        .filter(
          (candidate) =>
            type === 'movie' ||
            (candidate.season === season &&
              (candidate.isPackage || candidate.episode === episode)),
        )
        .slice(0, 50);
      const limitDetails = createLimiter(detailConcurrency);
      const resolved = await Promise.all(
        candidates.map((candidate) =>
          limitDetails(async () => {
            try {
              const info = await getDownloadInfo(candidate);
              return {
                id: `turkcealtyaziorg-${info.altid}-${season || 0}-${episode || 0}`,
                lang: 'tur',
                token: encodeSubtitleToken(info),
              };
            } catch (error) {
              logger.warn?.('Subtitle candidate was skipped', {
                pageUrl: candidate.pageUrl,
                error: cleanErrorMessage(error),
              });
              return null;
            }
          }),
        ),
      );

      const subtitles = resolved.filter(Boolean);
      searchCache.set(
        cacheKey,
        subtitles,
        subtitles.length > 0 ? SEARCH_TTL_MS : NEGATIVE_SEARCH_TTL_MS,
      );
      return subtitles;
    });
  }

  async function getArchive(info) {
    const cached = archiveCache.get(info.altid);
    if (cached) return cached;

    return archiveFlight.run(info.altid, async () => {
      const secondCached = archiveCache.get(info.altid);
      if (secondCached) return secondCached;
      const archive = await client.downloadArchive(info);
      archiveCache.set(info.altid, archive, ARCHIVE_TTL_MS, archive.length);
      return archive;
    });
  }

  async function getSubtitle({ token, season = null, episode = null }) {
    const info = decodeSubtitleToken(token);
    const cacheKey = `${info.altid}:${season || 0}:${episode || 0}`;
    const cached = subtitleCache.get(cacheKey);
    if (cached) return cached;

    return subtitleFlight.run(cacheKey, async () => {
      const secondCached = subtitleCache.get(cacheKey);
      if (secondCached) return secondCached;

      const archive = await getArchive(info);
      const subtitle = await extractSubtitleFromArchive(archive, {
        season,
        episode,
        requireEpisodeMatch: info.isPackage,
      });
      subtitleCache.set(cacheKey, subtitle, SUBTITLE_TTL_MS, subtitle.body.length);
      return subtitle;
    });
  }

  return {
    findSubtitles,
    getSubtitle,
    proxyEnabled: Boolean(client.proxyEnabled),
  };
}

module.exports = {
  createSubtitleService,
};
