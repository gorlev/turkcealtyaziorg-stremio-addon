const path = require('node:path');
const { TextDecoder } = require('node:util');
const unzipper = require('unzipper');

const SUPPORTED_EXTENSIONS = new Set(['.vtt', '.srt', '.ass', '.ssa']);
const EXTENSION_PRIORITY = new Map([
  ['.vtt', 0],
  ['.srt', 1],
  ['.ass', 2],
  ['.ssa', 3],
]);

function decodeUtf16Be(buffer) {
  const swapped = Buffer.allocUnsafe(buffer.length - 2);
  for (let index = 2; index + 1 < buffer.length; index += 2) {
    swapped[index - 2] = buffer[index + 1];
    swapped[index - 1] = buffer[index];
  }
  return new TextDecoder('utf-16le').decode(swapped);
}

function decodeSubtitle(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer.subarray(2));
  }
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return decodeUtf16Be(buffer);

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1254').decode(buffer);
  }
}

function normalizeNewlines(value) {
  return value.replace(/\r\n?/g, '\n').trim();
}

function srtToVtt(value) {
  const normalized = normalizeNewlines(value);
  if (!/\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s+-->/.test(normalized)) {
    throw new Error('The selected SRT file does not contain subtitle cues');
  }

  const cues = normalized.replace(
    /(\d{1,2}:\d{2}:\d{2})[,.](\d{3})(\s+-->\s+\d{1,2}:\d{2}:\d{2})[,.](\d{3})/g,
    '$1.$2$3.$4',
  );
  return `WEBVTT\n\n${cues}\n`;
}

function normalizeVtt(value) {
  const normalized = normalizeNewlines(value);
  const withoutHeader = normalized.replace(/^WEBVTT[^\n]*\n*/i, '');
  if (!/-->/.test(withoutHeader)) throw new Error('The selected VTT file has no cues');
  return `WEBVTT\n\n${withoutHeader}\n`;
}

function splitAssFields(value, fieldCount) {
  const fields = [];
  let remainder = value;
  for (let index = 0; index < fieldCount - 1; index += 1) {
    const comma = remainder.indexOf(',');
    if (comma === -1) return [];
    fields.push(remainder.slice(0, comma));
    remainder = remainder.slice(comma + 1);
  }
  fields.push(remainder);
  return fields;
}

function assTimestampToVtt(value) {
  const match = value.trim().match(/^(\d+):(\d{2}):(\d{2})[.:](\d{2,3})$/);
  if (!match) return null;
  const milliseconds = match[4].length === 2 ? `${match[4]}0` : match[4];
  return `${match[1].padStart(2, '0')}:${match[2]}:${match[3]}.${milliseconds}`;
}

function escapeVttText(value) {
  return value
    .replace(/\{[^}]*\}/g, '')
    .replace(/\\N/gi, '\n')
    .replace(/\\h/gi, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function assToVtt(value) {
  const lines = normalizeNewlines(value).split('\n');
  let inEvents = false;
  let format = [];
  const cues = [];

  for (const line of lines) {
    if (/^\[events\]$/i.test(line.trim())) {
      inEvents = true;
      continue;
    }
    if (inEvents && /^\[/.test(line.trim())) inEvents = false;
    if (!inEvents) continue;

    if (/^format\s*:/i.test(line)) {
      format = line
        .replace(/^format\s*:/i, '')
        .split(',')
        .map((field) => field.trim().toLowerCase());
      continue;
    }
    if (!/^dialogue\s*:/i.test(line) || format.length === 0) continue;

    const fields = splitAssFields(line.replace(/^dialogue\s*:/i, ''), format.length);
    const start = assTimestampToVtt(fields[format.indexOf('start')] || '');
    const end = assTimestampToVtt(fields[format.indexOf('end')] || '');
    const text = fields[format.indexOf('text')];
    if (start && end && text) cues.push(`${start} --> ${end}\n${escapeVttText(text)}`);
  }

  if (cues.length === 0) throw new Error('The selected ASS file has no dialogue cues');
  return `WEBVTT\n\n${cues.join('\n\n')}\n`;
}

function convertToVtt(filename, buffer) {
  const extension = path.extname(filename).toLowerCase();
  const decoded = decodeSubtitle(buffer);
  if (extension === '.vtt') return normalizeVtt(decoded);
  if (extension === '.srt') return srtToVtt(decoded);
  if (extension === '.ass' || extension === '.ssa') return assToVtt(decoded);
  throw new Error(`Unsupported subtitle format: ${extension}`);
}

function matchesEpisode(filename, season, episode) {
  if (!Number.isInteger(season) || !Number.isInteger(episode)) return false;
  const value = filename.toLowerCase();
  const seasonValue = String(season).padStart(2, '0');
  const episodeValue = String(episode).padStart(2, '0');
  const patterns = [
    new RegExp(`(?:^|[^a-z0-9])s0?${season}[^a-z0-9]*e0?${episode}(?:[^0-9]|$)`, 'i'),
    new RegExp(`(?:^|[^0-9])0?${season}x0?${episode}(?:[^0-9]|$)`, 'i'),
    new RegExp(`season[^0-9]*0?${season}[^a-z0-9]+episode[^0-9]*0?${episode}(?:[^0-9]|$)`, 'i'),
    new RegExp(`s${seasonValue}e${episodeValue}`, 'i'),
  ];
  return patterns.some((pattern) => pattern.test(value));
}

function safeEntries(directory, { maxEntries, maxUncompressedBytes }) {
  const entries = directory.files.filter((entry) => {
    const extension = path.extname(entry.path).toLowerCase();
    return entry.type === 'File' && SUPPORTED_EXTENSIONS.has(extension) && !entry.path.includes('__MACOSX');
  });

  if (directory.files.length > maxEntries) throw new Error('Subtitle archive has too many entries');

  const advertisedSize = entries.reduce(
    (total, entry) => total + Number(entry.uncompressedSize || entry.vars?.uncompressedSize || 0),
    0,
  );
  if (advertisedSize > maxUncompressedBytes) {
    throw new Error('Subtitle archive is too large after extraction');
  }
  return entries;
}

async function extractSubtitleFromArchive(
  archive,
  {
    season = null,
    episode = null,
    requireEpisodeMatch = false,
    maxEntries = 200,
    maxUncompressedBytes = 20 * 1024 * 1024,
  } = {},
) {
  const directory = await unzipper.Open.buffer(archive);
  const entries = safeEntries(directory, { maxEntries, maxUncompressedBytes });
  if (entries.length === 0) throw new Error('Subtitle archive contains no supported subtitle files');

  const ranked = entries
    .map((entry) => ({
      entry,
      episodeMatch: matchesEpisode(entry.path, season, episode),
      extensionPriority: EXTENSION_PRIORITY.get(path.extname(entry.path).toLowerCase()) ?? 99,
    }))
    .filter((candidate) => !requireEpisodeMatch || candidate.episodeMatch)
    .sort(
      (left, right) =>
        Number(right.episodeMatch) - Number(left.episodeMatch) ||
        left.extensionPriority - right.extensionPriority ||
        left.entry.path.localeCompare(right.entry.path),
    );

  if (ranked.length === 0) {
    throw new Error(`Requested S${season}E${episode} was not found in the subtitle package`);
  }

  let lastError;
  for (const candidate of ranked) {
    const size = Number(candidate.entry.uncompressedSize || candidate.entry.vars?.uncompressedSize || 0);
    if (size > maxUncompressedBytes) continue;

    try {
      const body = Buffer.from(convertToVtt(candidate.entry.path, await candidate.entry.buffer()), 'utf8');
      if (body.length > maxUncompressedBytes) throw new Error('Converted subtitle is too large');
      return { body, sourceName: path.basename(candidate.entry.path) };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No subtitle entry could be converted');
}

module.exports = {
  convertToVtt,
  extractSubtitleFromArchive,
  matchesEpisode,
};
