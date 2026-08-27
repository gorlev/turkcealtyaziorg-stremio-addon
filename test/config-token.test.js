const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../config');
const { createDefaultSubtitleService } = require('../scraper');
const { decodeSubtitleToken, encodeSubtitleToken } = require('../lib/token');

test('proxy configuration is optional', () => {
  const direct = loadConfig({});
  assert.equal(direct.proxyUrl, null);
  assert.equal(direct.trustProxy, false);

  const proxied = loadConfig({ PROXY_LINK: 'http://proxy.example:8080', TRUST_PROXY: '1' });
  assert.equal(proxied.proxyUrl, 'http://proxy.example:8080/');
  assert.equal(proxied.trustProxy, 1);
});

test('SOCKS proxy schemes are supported', () => {
  for (const scheme of ['socks4', 'socks4a', 'socks5', 'socks5h']) {
    const config = loadConfig({ PROXY_LINK: `${scheme}://proxy.example:1080` });
    assert.equal(config.proxyUrl, `${scheme}://proxy.example:1080`);
    assert.equal(createDefaultSubtitleService({ proxyUrl: config.proxyUrl }).proxyEnabled, true);
  }
});

test('unsupported proxy schemes are rejected', () => {
  assert.throws(() => loadConfig({ PROXY_LINK: 'ftp://proxy.example:21' }), /PROXY_LINK must use/);
});

test('an explicit null proxy override forces direct mode', () => {
  const directService = createDefaultSubtitleService({ proxyUrl: null });
  assert.equal(directService.proxyEnabled, false);
});

test('subtitle tokens preserve all upstream download fields', () => {
  const info = {
    idid: '9992713',
    altid: '825951',
    sidid: 'ef3f43674d6761b08c71fd7ac08c383b',
    referer: 'https://turkcealtyazi.org/sub/825951/example.html',
    isPackage: true,
  };
  assert.deepEqual(decodeSubtitleToken(encodeSubtitleToken(info)), info);
});

test('subtitle token rejects referers outside TurkceAltyazi', () => {
  assert.throws(
    () =>
      encodeSubtitleToken({
        idid: '1',
        altid: '2',
        sidid: 'abcdef1234567890',
        referer: 'https://example.com/sub/2/file.html',
      }),
    /Invalid subtitle referer/,
  );
});
