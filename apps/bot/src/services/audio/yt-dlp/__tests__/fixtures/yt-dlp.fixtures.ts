export const YtDlpFixtures = {
  VideoInfo: {
    id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    duration: 212.6,
    uploader: 'Rick Astley'
  },
  LiveInfo: {
    id: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio',
    duration: null
  },
  InfoWithoutTitle: {
    id: 'dQw4w9WgXcQ',
    duration: 212.6
  },
  InvalidJsonOutput: 'WARNING: [youtube] Falling back to generic n function search',
  ForbiddenStderr: 'ERROR: HTTP Error 403: Forbidden',
  UnavailableStderr: 'ERROR: [youtube] dQw4w9WgXcQ: Video unavailable',
  PrivateStderr:
    'ERROR: [youtube] dQw4w9WgXcQ: Private video. Sign in if you have been granted access',
  NetworkStderr:
    'ERROR: Unable to download API page: <urlopen error [Errno 8] nodename nor servname>'
} as const;
