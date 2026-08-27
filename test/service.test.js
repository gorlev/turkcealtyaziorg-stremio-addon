const test = require('node:test');
const assert = require('node:assert/strict');
const { createSubtitleService } = require('../lib/subtitleService');
const { createZip, delay } = require('../test-support/helpers');

test('concurrent searches and downloads share one upstream operation', async () => {
  const archive = await createZip({
    'Show.S10E13.srt': '1\n00:00:01,000 --> 00:00:02,000\nE13\n',
    'Show.S10E01.srt': '1\n00:00:01,000 --> 00:00:02,000\nE01\n',
  });
  const calls = { find: 0, list: 0, detail: 0, download: 0 };
  const client = {
    proxyEnabled: false,
    async findTitlePage() {
      calls.find += 1;
      await delay(15);
      return 'https://turkcealtyazi.org/mov/1/show.html';
    },
    async listCandidates() {
      calls.list += 1;
      return [
        {
          pageUrl: 'https://turkcealtyazi.org/sub/20/show.html',
          season: 10,
          episode: null,
          isPackage: true,
        },
      ];
    },
    async getDownloadInfo() {
      calls.detail += 1;
      await delay(10);
      return {
        idid: '10',
        altid: '20',
        sidid: 'abcdef1234567890',
        referer: 'https://turkcealtyazi.org/sub/20/show.html',
      };
    },
    async downloadArchive() {
      calls.download += 1;
      await delay(15);
      return archive;
    },
  };
  const service = createSubtitleService({ client, logger: { warn() {}, error() {} } });

  const searches = await Promise.all(
    Array.from({ length: 25 }, () =>
      service.findSubtitles({ imdbId: 'tt1520211', type: 'series', season: 10, episode: 1 }),
    ),
  );
  assert.deepEqual(calls, { find: 1, list: 1, detail: 1, download: 0 });

  await service.findSubtitles({ imdbId: 'tt1520211', type: 'series', season: 10, episode: 2 });
  assert.deepEqual(calls, { find: 1, list: 1, detail: 1, download: 0 });

  const token = searches[0][0].token;
  const subtitles = await Promise.all(
    Array.from({ length: 25 }, () => service.getSubtitle({ token, season: 10, episode: 1 })),
  );
  assert.equal(calls.download, 1);
  assert.match(subtitles[0].body.toString(), /E01/);
});
