const TOKEN_VERSION = 1;
const MAX_TOKEN_LENGTH = 2048;

function validateDownloadInfo(info) {
  if (!info || typeof info !== 'object') throw new TypeError('Invalid subtitle token');

  const idid = String(info.idid || '');
  const altid = String(info.altid || '');
  const sidid = String(info.sidid || '');
  const referer = String(info.referer || '');

  if (!/^\d{1,16}$/.test(idid) || !/^\d{1,16}$/.test(altid)) {
    throw new TypeError('Invalid subtitle identifiers');
  }
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(sidid)) {
    throw new TypeError('Invalid sidid');
  }

  const refererUrl = new URL(referer);
  if (refererUrl.origin !== 'https://turkcealtyazi.org') {
    throw new TypeError('Invalid subtitle referer');
  }
  if (!refererUrl.pathname.startsWith(`/sub/${altid}/`)) {
    throw new TypeError('Subtitle referer does not match altid');
  }

  return {
    idid,
    altid,
    sidid,
    referer: refererUrl.toString(),
    isPackage: Boolean(info.isPackage),
  };
}

function encodeSubtitleToken(info) {
  const value = validateDownloadInfo(info);
  return Buffer.from(JSON.stringify({ v: TOKEN_VERSION, ...value })).toString('base64url');
}

function decodeSubtitleToken(token) {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    throw new TypeError('Invalid subtitle token');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch {
    throw new TypeError('Invalid subtitle token');
  }

  if (payload.v !== TOKEN_VERSION) throw new TypeError('Unsupported subtitle token');
  return validateDownloadInfo(payload);
}

module.exports = {
  decodeSubtitleToken,
  encodeSubtitleToken,
  validateDownloadInfo,
};
