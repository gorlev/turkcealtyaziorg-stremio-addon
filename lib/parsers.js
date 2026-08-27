const cheerio = require('cheerio');
const { validateDownloadInfo } = require('./token');

function absoluteTurkceAltyaziUrl(value, baseUrl = 'https://turkcealtyazi.org') {
  const url = new URL(value, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    throw new TypeError('Unexpected external TurkceAltyazi URL');
  }
  return url.toString();
}

function parseSeriesMarker(row, $) {
  const markers = row
    .find('.alcd b')
    .map((_, element) => $(element).text().trim())
    .get();

  const season = Number.parseInt(markers[0], 10);
  const isPackage = markers.some((value) => value.toLocaleLowerCase('tr-TR') === 'paket');
  const episode = isPackage ? null : Number.parseInt(markers.at(-1), 10);

  return {
    season: Number.isInteger(season) ? season : null,
    episode: Number.isInteger(episode) ? episode : null,
    isPackage,
  };
}

function parseSubtitleCandidates(html, { type, season, episode, baseUrl }) {
  const $ = cheerio.load(html);
  const candidates = [];
  const seen = new Set();

  $('.altyazi-list-wrapper > div > div').each((_, element) => {
    const row = $(element);
    const link = row.find('.alisim .fl a[href^="/sub/"]').first().attr('href');
    const language = row.find('.aldil span').first();
    if (!link || !language.hasClass('flagtr')) return;

    let candidate;
    if (type === 'movie') {
      const discCount = Number.parseInt(row.find('.alcd').text().trim(), 10);
      if (discCount !== 1) return;
      candidate = { season: null, episode: null, isPackage: false };
    } else {
      candidate = parseSeriesMarker(row, $);
      if (season !== null && season !== undefined && candidate.season !== season) return;
      if (
        episode !== null &&
        episode !== undefined &&
        !candidate.isPackage &&
        candidate.episode !== episode
      ) {
        return;
      }
    }

    const pageUrl = absoluteTurkceAltyaziUrl(link, baseUrl);
    if (seen.has(pageUrl)) return;
    seen.add(pageUrl);
    candidates.push({ pageUrl, ...candidate });
  });

  return candidates.sort((left, right) => Number(left.isPackage) - Number(right.isPackage));
}

function parseDownloadInfo(html, referer) {
  const $ = cheerio.load(html);
  const form = $('form[action="/ind"]').first();
  if (!form.length) throw new Error('Subtitle download form was not found');

  return validateDownloadInfo({
    idid: form.find('input[name="idid"]').attr('value'),
    altid: form.find('input[name="altid"]').attr('value'),
    sidid: form.find('input[name="sidid"]').attr('value'),
    referer,
  });
}

module.exports = {
  absoluteTurkceAltyaziUrl,
  parseDownloadInfo,
  parseSubtitleCandidates,
};
