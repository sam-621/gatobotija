const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

export function parseYoutubeUrl(input: string): string | null {
  const url = toUrl(input.trim());

  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) return null;

  const videoId = extractVideoId(url);

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) return null;

  return `https://www.youtube.com/watch?v=${videoId}`;
}

function toUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function extractVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') return segments.length === 1 ? segments[0] : null;

  if (host !== 'youtube.com' && host !== 'music.youtube.com') return null;

  if (url.pathname === '/watch') return url.searchParams.get('v');

  if (host === 'youtube.com' && segments[0] === 'shorts' && segments.length === 2) {
    return segments[1];
  }

  return null;
}
