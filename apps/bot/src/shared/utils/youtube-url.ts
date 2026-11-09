export const YoutubeLinkKind = {
  Video: 'video',
  Playlist: 'playlist'
} as const;

export type YoutubeLinkKind = (typeof YoutubeLinkKind)[keyof typeof YoutubeLinkKind];

interface YoutubeLink {
  kind: YoutubeLinkKind;
  url: string;
}

const VIDEO_ID_PATTERN = /^[\w-]{11}$/;
const PLAYLIST_ID_PATTERN = /^[\w-]+$/;
const MIX_PREFIX = 'RD';

export function parseYoutubeUrl(input: string): YoutubeLink | null {
  const url = toUrl(input.trim());

  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) return null;

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const segments = url.pathname.split('/').filter(Boolean);

  if (isPlaylistPath(host, url)) return toPlaylistLink(url.searchParams.get('list'));

  const videoId = extractVideoId(host, segments, url);

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) return null;

  return { kind: YoutubeLinkKind.Video, url: `https://www.youtube.com/watch?v=${videoId}` };
}

function toUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function isPlaylistPath(host: string, url: URL): boolean {
  return (host === 'youtube.com' || host === 'music.youtube.com') && url.pathname === '/playlist';
}

function toPlaylistLink(playlistId: string | null): YoutubeLink | null {
  if (!playlistId || !PLAYLIST_ID_PATTERN.test(playlistId)) return null;

  if (playlistId.startsWith(MIX_PREFIX)) return null;

  return {
    kind: YoutubeLinkKind.Playlist,
    url: `https://www.youtube.com/playlist?list=${playlistId}`
  };
}

function extractVideoId(host: string, segments: string[], url: URL): string | null {
  if (host === 'youtu.be') return segments.length === 1 ? segments[0] : null;

  if (host !== 'youtube.com' && host !== 'music.youtube.com') return null;

  if (url.pathname === '/watch') return url.searchParams.get('v');

  if (host === 'youtube.com' && segments[0] === 'shorts' && segments.length === 2) {
    return segments[1];
  }

  return null;
}
