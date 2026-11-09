export const TrackFixtures = {
  SongA: {
    title: 'Never Gonna Give You Up',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    durationSeconds: 213,
    requestedBy: 'Rick'
  },
  SongB: {
    title: 'Take On Me',
    url: 'https://www.youtube.com/watch?v=djV11Xbc914',
    durationSeconds: 225,
    requestedBy: 'Morten'
  },
  SongC: {
    title: 'Africa',
    url: 'https://www.youtube.com/watch?v=FTQbiNvZqaY',
    durationSeconds: 295,
    requestedBy: 'David'
  },
  SongWithoutDuration: {
    title: 'Blinding Lights',
    url: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ',
    durationSeconds: 0,
    requestedBy: 'Abel'
  }
} as const;
