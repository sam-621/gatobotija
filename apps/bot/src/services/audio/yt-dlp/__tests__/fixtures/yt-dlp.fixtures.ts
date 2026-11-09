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
  PlaylistInfo: {
    id: 'PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
    title: '80s Hits',
    entries: [
      {
        id: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        duration: 212.6,
        availability: null
      },
      { id: 'aaaaaaaaaaa', title: '[Private video]', duration: null, availability: null },
      { id: 'bbbbbbbbbbb', title: '[Deleted video]', duration: null, availability: null },
      {
        id: 'ccccccccccc',
        title: 'Members Only Song',
        duration: 180,
        availability: 'subscriber_only'
      },
      { id: null, title: 'Song Without Id', duration: 200, availability: null },
      { id: 'djV11Xbc914', title: 'Take On Me', duration: null, availability: 'public' },
      { id: 'FTQbiNvZqaY', title: 'Africa', duration: 295, availability: 'unlisted' }
    ]
  },
  LongPlaylistInfo: {
    id: 'PLlongplaylist0000000000000000000',
    title: 'Endless Hits',
    entries: Array.from({ length: 101 }, (_, index) => ({
      id: `song${String(index).padStart(7, '0')}`,
      title: `Song ${index + 1}`,
      duration: 200,
      availability: null
    }))
  },
  LongPlaylistWithPrivateInfo: {
    id: 'PLlongplaylist0000000000000000000',
    title: 'Endless Hits',
    entries: Array.from({ length: 101 }, (_, index) => ({
      id: `song${String(index).padStart(7, '0')}`,
      title: index === 0 ? '[Private video]' : `Song ${index + 1}`,
      duration: 200,
      availability: null
    }))
  },
  PlaylistWithoutTitle: {
    id: 'PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
    entries: []
  },
  InvalidJsonOutput: 'WARNING: [youtube] Falling back to generic n function search',
  ForbiddenStderr: 'ERROR: HTTP Error 403: Forbidden',
  UnavailableStderr: 'ERROR: [youtube] dQw4w9WgXcQ: Video unavailable',
  PrivateStderr:
    'ERROR: [youtube] dQw4w9WgXcQ: Private video. Sign in if you have been granted access',
  PlaylistNotFoundStderr:
    'ERROR: [youtube:tab] PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG: YouTube said: The playlist does not exist.',
  PrivatePlaylistStderr:
    'ERROR: [youtube:tab] PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG: YouTube said: This playlist is private.',
  NetworkStderr:
    'ERROR: Unable to download API page: <urlopen error [Errno 8] nodename nor servname>'
} as const;
