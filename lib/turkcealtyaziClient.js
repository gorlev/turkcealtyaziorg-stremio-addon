const http = require('node:http');
const https = require('node:https');
const axios = require('axios');
const { HttpProxyAgent, HttpsProxyAgent } = require('hpagent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { createLimiter } = require('./cache');
const { absoluteTurkceAltyaziUrl, parseDownloadInfo, parseSubtitleCandidates } = require('./parsers');
const { validateDownloadInfo } = require('./token');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

function createAgents(proxyUrl, maxSockets) {
  if (proxyUrl) {
    const protocol = new URL(proxyUrl).protocol;
    if (protocol.startsWith('socks')) {
      const agent = new SocksProxyAgent(proxyUrl, {
        keepAlive: true,
        maxSockets,
      });
      return { httpAgent: agent, httpsAgent: agent };
    }

    const options = {
      proxy: proxyUrl,
      keepAlive: true,
      keepAliveMsecs: 2_000,
      maxSockets,
      maxFreeSockets: Math.min(maxSockets, 8),
    };
    return {
      httpAgent: new HttpProxyAgent(options),
      httpsAgent: new HttpsProxyAgent(options),
    };
  }

  return {
    httpAgent: new http.Agent({ keepAlive: true, maxSockets, maxFreeSockets: 8 }),
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets, maxFreeSockets: 8 }),
  };
}

function createTurkceAltyaziClient({
  baseUrl = 'https://turkcealtyazi.org',
  proxyUrl = null,
  timeoutMs = 12_000,
  maxArchiveBytes = 10 * 1024 * 1024,
  concurrency = 8,
} = {}) {
  const origin = new URL(baseUrl).origin;
  const limit = createLimiter(concurrency);
  const agents = createAgents(proxyUrl, concurrency);
  const client = axios.create({
    baseURL: origin,
    timeout: timeoutMs,
    maxContentLength: maxArchiveBytes,
    maxBodyLength: maxArchiveBytes,
    proxy: false,
    ...agents,
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'tr,en-US;q=0.9,en;q=0.8',
      'User-Agent': USER_AGENT,
    },
  });

  function request(config) {
    return limit(() => client.request(config));
  }

  async function getPage(url) {
    const pageUrl = absoluteTurkceAltyaziUrl(url, origin);
    const response = await request({ method: 'GET', url: pageUrl });
    return response.data;
  }

  return {
    proxyEnabled: Boolean(proxyUrl),

    async findTitlePage(imdbId) {
      if (!/^tt\d+$/.test(imdbId)) throw new TypeError('Invalid IMDb id');
      const response = await request({
        method: 'GET',
        url: '/things_.php',
        params: { t: 99, term: imdbId.slice(2) },
      });

      const first = Array.isArray(response.data) ? response.data[0] : null;
      return first?.url ? absoluteTurkceAltyaziUrl(first.url, origin) : null;
    },

    async listCandidates(pageUrl, query) {
      const html = await getPage(pageUrl);
      return parseSubtitleCandidates(html, { ...query, baseUrl: origin });
    },

    async getDownloadInfo(pageUrl) {
      const html = await getPage(pageUrl);
      return parseDownloadInfo(html, pageUrl);
    },

    async downloadArchive(downloadInfo) {
      const info = validateDownloadInfo(downloadInfo);
      const form = new URLSearchParams({
        idid: info.idid,
        altid: info.altid,
        sidid: info.sidid,
      });

      const response = await request({
        method: 'POST',
        url: '/ind',
        data: form.toString(),
        responseType: 'arraybuffer',
        headers: {
          Accept: 'application/zip,application/octet-stream;q=0.9,*/*;q=0.8',
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: origin,
          Referer: info.referer,
        },
      });

      const archive = Buffer.from(response.data);
      const isZip = archive.length >= 4 && archive[0] === 0x50 && archive[1] === 0x4b;
      if (!isZip) throw new Error('TurkceAltyazi returned a non-ZIP response');
      return archive;
    },
  };
}

module.exports = {
  createTurkceAltyaziClient,
};
