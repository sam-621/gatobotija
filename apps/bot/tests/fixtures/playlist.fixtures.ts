import { TrackFixtures } from './track.fixtures';

export const PlaylistFixtures = {
  Hits80s: {
    url: 'https://music.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
    title: '80s Hits',
    tracks: [TrackFixtures.SongA, TrackFixtures.SongB],
    truncated: false
  },
  Endless: {
    url: 'https://www.youtube.com/playlist?list=PLlongplaylist0000000000000000000',
    title: 'Endless Hits',
    tracks: [TrackFixtures.SongB, TrackFixtures.SongC],
    truncated: true
  },
  UnknownDurations: {
    url: 'https://www.youtube.com/playlist?list=PLunknowndurations00000000000000',
    title: 'Flat Hits',
    tracks: [TrackFixtures.SongWithoutDuration, TrackFixtures.SongA],
    truncated: false
  },
  Empty: {
    url: 'https://www.youtube.com/playlist?list=PLemptyplaylist00000000000000000',
    title: 'Nothing Here',
    tracks: [],
    truncated: false
  }
} as const;
