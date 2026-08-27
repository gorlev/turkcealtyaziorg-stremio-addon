const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../index');

async function startApp(service) {
  const app = createApp({
    service,
    appConfig: { port: 3648, publicUrl: null, trustProxy: false },
    logger: { error() {} },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test('manifest is installable without configuration and legacy addon path still works', async (t) => {
  const service = { proxyEnabled: false, findSubtitles: async () => [], getSubtitle: async () => null };
  const { server, baseUrl } = await startApp(service);
  t.after(() => server.close());

  for (const path of ['/manifest.json', '/addon/manifest.json']) {
    const response = await fetch(`${baseUrl}${path}`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.behaviorHints.configurationRequired, false);
    assert.equal(body.logo, `${baseUrl}/images/logo.png`);
    assert.equal(body.background, `${baseUrl}/images/background.webp`);
  }
});

test('series response contains an episode-specific public VTT URL', async (t) => {
  const service = {
    proxyEnabled: false,
    findSubtitles: async () => [{ id: 'ta-20-1-2', lang: 'tur', token: 'safe-token' }],
    getSubtitle: async () => ({
      body: Buffer.from('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nMerhaba\n'),
      sourceName: 'Show.S01E02.srt',
    }),
  };
  const { server, baseUrl } = await startApp(service);
  t.after(() => server.close());

  const listResponse = await fetch(`${baseUrl}/subtitles/series/tt1234567:1:2.json`);
  const list = await listResponse.json();
  assert.equal(list.subtitles.length, 1);
  assert.equal(list.subtitles[0].url, `${baseUrl}/subtitle/safe-token/1/2.vtt`);

  const fileResponse = await fetch(list.subtitles[0].url);
  assert.equal(fileResponse.headers.get('content-type'), 'text/vtt; charset=utf-8');
  assert.match(await fileResponse.text(), /Merhaba/);
});

test('landing page has the new install experience and no crypto donation copy', async (t) => {
  const service = { proxyEnabled: false, findSubtitles: async () => [], getSubtitle: async () => null };
  const { server, baseUrl } = await startApp(service);
  t.after(() => server.close());

  const response = await fetch(baseUrl);
  const html = await response.text();
  assert.match(html, /Stremio'ya Ekle/);
  assert.match(html, /Resmî olmayan topluluk eklentisi/);
  assert.doesNotMatch(html, /BTC|ETH|USDT|bağış/i);
});
