const test = require('node:test');
const assert = require('node:assert/strict');
const { convertToVtt, extractSubtitleFromArchive, matchesEpisode } = require('../lib/archive');
const { createZip } = require('../test-support/helpers');

const e13 = '1\n00:00:01,000 --> 00:00:02,000\nOn üçüncü bölüm\n';
const e01 = '1\n00:00:03,000 --> 00:00:04,000\nBirinci bölüm\n';

test('episode matching recognizes common season and episode filename formats', () => {
  assert.equal(matchesEpisode('Show.S10E01.WEB.srt', 10, 1), true);
  assert.equal(matchesEpisode('Show - 10x01 - WEB.srt', 10, 1), true);
  assert.equal(matchesEpisode('Show.S10E13.WEB.srt', 10, 1), false);
});

test('season package extraction selects the requested episode instead of the first ZIP entry', async () => {
  const archive = await createZip({
    'Show.S10E13.WEB.srt': e13,
    'Show.S10E01.WEB.srt': e01,
  });

  const result = await extractSubtitleFromArchive(archive, {
    season: 10,
    episode: 1,
    requireEpisodeMatch: true,
  });

  assert.equal(result.sourceName, 'Show.S10E01.WEB.srt');
  assert.match(result.body.toString(), /^WEBVTT/);
  assert.match(result.body.toString(), /Birinci bölüm/);
  assert.doesNotMatch(result.body.toString(), /On üçüncü bölüm/);
});

test('season package extraction never falls back to an unrelated episode', async () => {
  const archive = await createZip({ 'Show.S10E13.srt': e13 });
  await assert.rejects(
    extractSubtitleFromArchive(archive, { season: 10, episode: 1, requireEpisodeMatch: true }),
    /S10E1 was not found/,
  );
});

test('ASS dialogue is converted into WebVTT', () => {
  const ass = `[Events]\nFormat: Layer, Start, End, Style, Text\nDialogue: 0,0:00:01.20,0:00:03.40,Default,Merhaba\\NDünya`;
  const output = convertToVtt('subtitle.ass', Buffer.from(ass));
  assert.match(output, /00:00:01.200 --> 00:00:03.400/);
  assert.match(output, /Merhaba\nDünya/);
});
