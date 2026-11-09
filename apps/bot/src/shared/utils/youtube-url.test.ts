import { describe, expect, test } from 'vitest';

import { parseYoutubeUrl } from './youtube-url';

describe('parseYoutubeUrl', () => {
  test.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtu.be/dQw4w9WgXcQ',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://m.youtube.com/shorts/dQw4w9WgXcQ',
    '  https://youtu.be/dQw4w9WgXcQ  '
  ])('returns the normalized video url for %s', input => {
    expect(parseYoutubeUrl(input)).toEqual({
      kind: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    });
  });

  test.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890&index=2',
    'https://www.youtube.com/watch?list=PL1234567890&v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?t=42',
    'https://youtu.be/dQw4w9WgXcQ?si=abcdef',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ&feature=share'
  ])('returns the normalized video url ignoring extra parameters for %s', input => {
    expect(parseYoutubeUrl(input)).toEqual({
      kind: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    });
  });

  test.each([
    'https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
    'https://youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
    'https://m.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
    'https://music.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
    'https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG&si=abcdef',
    '  https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG  '
  ])('returns the normalized playlist url for %s', input => {
    expect(parseYoutubeUrl(input)).toEqual({
      kind: 'playlist',
      url: 'https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG'
    });
  });

  test.each([
    'never gonna give you up',
    '',
    'https://www.youtube.com/playlist?list=RDdQw4w9WgXcQ',
    'https://music.youtube.com/playlist?list=RDCLAK5uy_kmPRjHDECIcuVwnKsx2Ng7fyNgFKWNJFs',
    'https://www.youtube.com/playlist',
    'https://www.youtube.com/playlist?list=',
    'https://youtu.be/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
    'https://www.notyoutube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
    'https://www.youtube.com/watch?list=PL1234567890',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/@RickAstleyYT',
    'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
    'https://youtu.be/',
    'https://music.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.notyoutube.com/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com/123456789',
    'https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8',
    'ftp://www.youtube.com/watch?v=dQw4w9WgXcQ'
  ])('returns null for %s', input => {
    expect(parseYoutubeUrl(input)).toBeNull();
  });
});
