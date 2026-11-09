import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { AudioStreamFailedError } from '@/services/audio/audio-errors';
import { VoiceConnectionFailedError, VoiceNotConnectedError } from '@/services/voice/voice-errors';
import { PlaylistFixtures } from '@tests/fixtures/playlist.fixtures';
import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';

import { TrackEnqueuer } from './track-enqueuer';

describe('TrackEnqueuer', () => {
  const guildId = '200000000000000002';
  const voiceChannelId = '300000000000000003';
  let appContext: TestAppContext;
  let trackEnqueuer: TrackEnqueuer;

  beforeEach(() => {
    appContext = createTestAppContext();
    trackEnqueuer = new TrackEnqueuer(appContext);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function enqueue(url: string, channelId: string | null = voiceChannelId) {
    return trackEnqueuer.execute({ guildId, voiceChannelId: channelId, url, requestedBy: 'Rick' });
  }

  test('joins, registers onIdle and plays the track at position 0 when nothing is playing', async () => {
    const stream = Readable.from([]);
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    vi.spyOn(appContext.services.audio, 'stream').mockResolvedValue(stream);
    const onIdle = vi.spyOn(appContext.services.voice, 'onIdle');
    const onDisconnect = vi.spyOn(appContext.services.voice, 'onDisconnect');

    const result = await enqueue('https://youtu.be/dQw4w9WgXcQ');

    expect(result).toEqual({
      track: {
        title: 'Never Gonna Give You Up',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationSeconds: 213,
        requestedBy: 'Rick'
      },
      position: 0
    });
    expect(appContext.services.audio.resolve).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    expect(appContext.services.voice.joins).toEqual([
      { guildId: '200000000000000002', channelId: '300000000000000003' }
    ]);
    expect(onIdle).toHaveBeenCalledWith('200000000000000002', expect.any(Function));
    expect(onDisconnect).toHaveBeenCalledWith('200000000000000002', expect.any(Function));
    expect(appContext.services.voice.plays).toEqual([{ guildId: '200000000000000002', stream }]);
    expect(appContext.queues.get(guildId).voiceChannelId).toBe('300000000000000003');
  });

  test('advances the queue when the voice becomes idle', async () => {
    const streamB = Readable.from([]);
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    await enqueue(TrackFixtures.SongA.url);
    appContext.queues.get(guildId).add(TrackFixtures.SongB);
    vi.spyOn(appContext.services.audio, 'stream').mockResolvedValue(streamB);

    appContext.services.voice.emitIdle(guildId);
    await vi.waitFor(() => expect(appContext.services.voice.plays).toHaveLength(2));

    expect(appContext.queues.get(guildId).current?.title).toBe('Take On Me');
  });

  test('leaves the channel 5 minutes after the queue ends', async () => {
    vi.useFakeTimers();
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    await enqueue(TrackFixtures.SongA.url);

    appContext.services.voice.emitIdle(guildId);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 - 1);

    expect(appContext.services.voice.leaves).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);

    expect(appContext.services.voice.leaves).toEqual(['200000000000000002']);
    expect(appContext.queues.guildIds()).toEqual([]);
  });

  test('deletes the queue when the voice is disconnected', async () => {
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    await enqueue(TrackFixtures.SongA.url);
    appContext.queues.get(guildId).add(TrackFixtures.SongB);

    appContext.services.voice.emitDisconnect(guildId);
    await vi.waitFor(() => expect(appContext.queues.guildIds()).toEqual([]));

    expect(appContext.services.voice.leaves).toEqual(['200000000000000002']);
  });

  test('updates the voice channel of the queue when the bot is moved', async () => {
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    await enqueue(TrackFixtures.SongA.url);

    appContext.services.voice.emitChannelChange(guildId, '400000000000000004');

    expect(appContext.queues.get(guildId).voiceChannelId).toBe('400000000000000004');
  });

  test('adds the track to the queue at position N without playing when something is playing', async () => {
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongC);
    const stream = vi.spyOn(appContext.services.audio, 'stream');
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.voiceChannelId = voiceChannelId;

    const result = await enqueue(TrackFixtures.SongC.url);

    expect(result).toMatchObject({ track: { title: 'Africa' }, position: 2 });
    expect(queue.upcoming.map(track => track.title)).toEqual(['Take On Me', 'Africa']);
    expect(appContext.services.voice.joins).toEqual([]);
    expect(stream).not.toHaveBeenCalled();
  });

  test('cancels the idle timer when a track is added to an idle queue', async () => {
    vi.useFakeTimers();
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    const leaveCallback = vi.fn();
    appContext.queues.get(guildId).startIdleTimeout(leaveCallback, 5 * 60 * 1000);

    await enqueue(TrackFixtures.SongA.url);
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(leaveCallback).not.toHaveBeenCalled();
    expect(appContext.queues.get(guildId).current?.title).toBe('Never Gonna Give You Up');
  });

  test('joins and plays the first track of a playlist and queues the rest when nothing is playing', async () => {
    const stream = Readable.from([]);
    vi.spyOn(appContext.services.audio, 'resolvePlaylist').mockResolvedValue(
      PlaylistFixtures.Hits80s
    );
    vi.spyOn(appContext.services.audio, 'stream').mockResolvedValue(stream);
    const resolve = vi.spyOn(appContext.services.audio, 'resolve');

    const result = await enqueue(PlaylistFixtures.Hits80s.url);

    expect(result).toEqual({
      title: '80s Hits',
      count: 2,
      truncated: false,
      startedTrack: {
        title: 'Never Gonna Give You Up',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationSeconds: 213,
        requestedBy: 'Rick'
      },
      position: 0
    });
    expect(appContext.services.audio.resolvePlaylist).toHaveBeenCalledWith(
      'https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG',
      100
    );
    expect(resolve).not.toHaveBeenCalled();
    const queue = appContext.queues.get(guildId);
    expect(queue.current?.title).toBe('Never Gonna Give You Up');
    expect(queue.upcoming).toEqual([
      {
        title: 'Take On Me',
        url: 'https://www.youtube.com/watch?v=djV11Xbc914',
        durationSeconds: 225,
        requestedBy: 'Rick'
      }
    ]);
    expect(appContext.services.voice.joins).toEqual([
      { guildId: '200000000000000002', channelId: '300000000000000003' }
    ]);
    expect(appContext.services.voice.plays).toEqual([{ guildId: '200000000000000002', stream }]);
  });

  test('advances to the next playlist track when the voice becomes idle', async () => {
    vi.spyOn(appContext.services.audio, 'resolvePlaylist').mockResolvedValue(
      PlaylistFixtures.Hits80s
    );
    await enqueue(PlaylistFixtures.Hits80s.url);

    appContext.services.voice.emitIdle(guildId);
    await vi.waitFor(() => expect(appContext.services.voice.plays).toHaveLength(2));

    expect(appContext.queues.get(guildId).current?.title).toBe('Take On Me');
  });

  test('adds every playlist track to the end of the queue without playing when something is playing', async () => {
    vi.spyOn(appContext.services.audio, 'resolvePlaylist').mockResolvedValue(
      PlaylistFixtures.Endless
    );
    const stream = vi.spyOn(appContext.services.audio, 'stream');
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongC);
    queue.voiceChannelId = voiceChannelId;

    const result = await enqueue(PlaylistFixtures.Endless.url);

    expect(result).toEqual({
      title: 'Endless Hits',
      count: 2,
      truncated: true,
      startedTrack: null,
      position: 2
    });
    expect(queue.upcoming.map(track => track.title)).toEqual(['Africa', 'Take On Me', 'Africa']);
    expect(queue.upcoming.map(track => track.requestedBy)).toEqual(['David', 'Rick', 'Rick']);
    expect(appContext.services.voice.joins).toEqual([]);
    expect(stream).not.toHaveBeenCalled();
  });

  test('returns NotInVoiceChannelError before validating the url', async () => {
    const resolve = vi.spyOn(appContext.services.audio, 'resolve');

    const result = await enqueue('not a url', null);

    expect(result).toMatchObject({ code: 'NOT_IN_VOICE_CHANNEL' });
    expect(resolve).not.toHaveBeenCalled();
    expect(appContext.queues.guildIds()).toEqual([]);
  });

  test('returns InvalidYoutubeUrlError before checking the voice channel', async () => {
    const resolve = vi.spyOn(appContext.services.audio, 'resolve');
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.voiceChannelId = '400000000000000004';

    const result = await enqueue('https://vimeo.com/123456789');

    expect(result).toMatchObject({ code: 'INVALID_YOUTUBE_URL' });
    expect(resolve).not.toHaveBeenCalled();
  });

  test('returns DifferentVoiceChannelError before resolving the video', async () => {
    const resolve = vi.spyOn(appContext.services.audio, 'resolve');
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.voiceChannelId = '400000000000000004';

    const result = await enqueue(TrackFixtures.SongB.url);

    expect(result).toMatchObject({ code: 'DIFFERENT_VOICE_CHANNEL' });
    expect(resolve).not.toHaveBeenCalled();
    expect(queue.upcoming).toEqual([]);
  });

  test('returns DifferentVoiceChannelError when another channel started playing while resolving', async () => {
    vi.spyOn(appContext.services.audio, 'resolve').mockImplementation(async () => {
      const queue = appContext.queues.get(guildId);
      queue.add(TrackFixtures.SongA);
      queue.voiceChannelId = '400000000000000004';

      return TrackFixtures.SongB;
    });

    const result = await enqueue(TrackFixtures.SongB.url);

    expect(result).toMatchObject({ code: 'DIFFERENT_VOICE_CHANNEL' });
    expect(appContext.queues.get(guildId).upcoming).toEqual([]);
    expect(appContext.services.voice.joins).toEqual([]);
  });

  test('returns TrackNotFoundError when the video is not available', async () => {
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(null);

    const result = await enqueue(TrackFixtures.SongA.url);

    expect(result).toMatchObject({ code: 'TRACK_NOT_FOUND' });
    expect(appContext.queues.get(guildId).current).toBeNull();
    expect(appContext.services.voice.joins).toEqual([]);
  });

  test('returns PlaylistNotFoundError when the playlist is not available', async () => {
    vi.spyOn(appContext.services.audio, 'resolvePlaylist').mockResolvedValue(null);

    const result = await enqueue(PlaylistFixtures.Hits80s.url);

    expect(result).toMatchObject({ code: 'PLAYLIST_NOT_FOUND' });
    expect(appContext.queues.get(guildId).current).toBeNull();
    expect(appContext.services.voice.joins).toEqual([]);
  });

  test('returns PlaylistNotFoundError when the playlist has no available tracks', async () => {
    vi.spyOn(appContext.services.audio, 'resolvePlaylist').mockResolvedValue(
      PlaylistFixtures.Empty
    );

    const result = await enqueue(PlaylistFixtures.Empty.url);

    expect(result).toMatchObject({ code: 'PLAYLIST_NOT_FOUND' });
    expect(appContext.queues.get(guildId).current).toBeNull();
    expect(appContext.services.voice.joins).toEqual([]);
  });

  test('returns DifferentVoiceChannelError when another channel started playing while resolving the playlist', async () => {
    vi.spyOn(appContext.services.audio, 'resolvePlaylist').mockImplementation(async () => {
      const queue = appContext.queues.get(guildId);
      queue.add(TrackFixtures.SongC);
      queue.voiceChannelId = '400000000000000004';

      return PlaylistFixtures.Hits80s;
    });

    const result = await enqueue(PlaylistFixtures.Hits80s.url);

    expect(result).toMatchObject({ code: 'DIFFERENT_VOICE_CHANNEL' });
    expect(appContext.queues.get(guildId).upcoming).toEqual([]);
    expect(appContext.services.voice.joins).toEqual([]);
  });

  test('skips to the tracks queued meanwhile when the first track fails to stream', async () => {
    const stream = Readable.from([]);
    const error = new AudioStreamFailedError(TrackFixtures.SongA.url, 'spawn yt-dlp ENOENT');
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    vi.spyOn(appContext.services.audio, 'stream')
      .mockImplementationOnce(async () => {
        appContext.queues.get(guildId).add(TrackFixtures.SongB);
        throw error;
      })
      .mockResolvedValueOnce(stream);

    await expect(enqueue(TrackFixtures.SongA.url)).rejects.toBe(error);

    expect(appContext.queues.get(guildId).current?.title).toBe('Take On Me');
    expect(appContext.services.voice.plays).toEqual([{ guildId: '200000000000000002', stream }]);
    expect(appContext.services.voice.leaves).toEqual([]);
  });

  test('destroys the stream, advances and rethrows when the voice fails to play the first track', async () => {
    const stream = Readable.from([]);
    const error = new VoiceNotConnectedError(guildId);
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    vi.spyOn(appContext.services.audio, 'stream').mockResolvedValue(stream);
    vi.spyOn(appContext.services.voice, 'play').mockImplementation(() => {
      throw error;
    });

    await expect(enqueue(TrackFixtures.SongA.url)).rejects.toBe(error);

    expect(stream.destroyed).toBe(true);
    expect(appContext.queues.get(guildId).current).toBeNull();
  });

  test('destroys the stream and throws without playing when the queue was released while streaming', async () => {
    const stream = Readable.from([]);
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    vi.spyOn(appContext.services.audio, 'stream').mockImplementation(async () => {
      appContext.queues.delete(guildId);
      appContext.queues.get(guildId).add(TrackFixtures.SongB);

      return stream;
    });

    await expect(enqueue(TrackFixtures.SongA.url)).rejects.toThrow(
      'Queue of guild 200000000000000002 was released before playback started'
    );

    expect(stream.destroyed).toBe(true);
    expect(appContext.services.voice.plays).toEqual([]);
    expect(appContext.queues.get(guildId).current?.title).toBe('Take On Me');
  });

  test('delegates to QueueAdvancer and rethrows when the first track fails to stream', async () => {
    vi.useFakeTimers();
    const error = new AudioStreamFailedError(TrackFixtures.SongA.url, 'spawn yt-dlp ENOENT');
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    vi.spyOn(appContext.services.audio, 'stream').mockRejectedValue(error);

    await expect(enqueue(TrackFixtures.SongA.url)).rejects.toBe(error);

    expect(appContext.queues.get(guildId).current).toBeNull();
    expect(appContext.services.voice.leaves).toEqual([]);

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(appContext.services.voice.leaves).toEqual(['200000000000000002']);
    expect(appContext.queues.guildIds()).toEqual([]);
  });

  test('leaves, deletes the queue and rethrows when joining fails', async () => {
    const error = new VoiceConnectionFailedError(
      guildId,
      voiceChannelId,
      'The operation was aborted'
    );
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    vi.spyOn(appContext.services.voice, 'join').mockRejectedValue(error);

    await expect(enqueue(TrackFixtures.SongA.url)).rejects.toBe(error);

    expect(appContext.services.voice.leaves).toEqual(['200000000000000002']);
    expect(appContext.queues.guildIds()).toEqual([]);
    expect(appContext.services.voice.plays).toEqual([]);
  });
});
