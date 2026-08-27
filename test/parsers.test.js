const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDownloadInfo, parseSubtitleCandidates } = require('../lib/parsers');

function row({ href, language = 'flagtr', marker = '<b>01</b><b>01</b>', disc = null }) {
  return `<div>
    <div class="alisim"><div class="fl"><a href="${href}">Altyazı</a></div></div>
    <div class="aldil"><span class="${language}"></span></div>
    <div class="alcd">${disc ?? marker}</div>
  </div>`;
}

test('series parser returns the exact episode before matching season packages', () => {
  const html = `<div class="altyazi-list-wrapper"><div>
    ${row({ href: '/sub/300/show.html', marker: '<b>01</b><b>Paket</b>' })}
    ${row({ href: '/sub/301/show.html', marker: '<b>01</b><b>02</b>' })}
    ${row({ href: '/sub/302/show.html', marker: '<b>01</b><b>03</b>' })}
    ${row({ href: '/sub/303/show.html', language: 'flagen', marker: '<b>01</b><b>02</b>' })}
  </div></div>`;

  const candidates = parseSubtitleCandidates(html, {
    type: 'series',
    season: 1,
    episode: 2,
    baseUrl: 'https://turkcealtyazi.org',
  });

  assert.deepEqual(
    candidates.map(({ pageUrl, isPackage }) => ({ pageUrl, isPackage })),
    [
      { pageUrl: 'https://turkcealtyazi.org/sub/301/show.html', isPackage: false },
      { pageUrl: 'https://turkcealtyazi.org/sub/300/show.html', isPackage: true },
    ],
  );
});

test('movie parser accepts only Turkish single-disc subtitles', () => {
  const html = `<div class="altyazi-list-wrapper"><div>
    ${row({ href: '/sub/101/movie.html', disc: '1' })}
    ${row({ href: '/sub/102/movie.html', disc: '2' })}
  </div></div>`;

  const candidates = parseSubtitleCandidates(html, {
    type: 'movie',
    baseUrl: 'https://turkcealtyazi.org',
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].pageUrl, 'https://turkcealtyazi.org/sub/101/movie.html');
});

test('download parser carries idid, altid and sidid together', () => {
  const html = `<form method="post" action="/ind"><div>
    <input type="hidden" name="idid" value="9992713">
    <input type="hidden" name="altid" value="825951">
    <input type="hidden" name="sidid" value="ef3f43674d6761b08c71fd7ac08c383b">
  </div></form>`;

  assert.deepEqual(
    parseDownloadInfo(html, 'https://turkcealtyazi.org/sub/825951/example.html'),
    {
      idid: '9992713',
      altid: '825951',
      sidid: 'ef3f43674d6761b08c71fd7ac08c383b',
      referer: 'https://turkcealtyazi.org/sub/825951/example.html',
      isPackage: false,
    },
  );
});
