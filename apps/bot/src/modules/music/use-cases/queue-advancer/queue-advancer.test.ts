import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { AudioStreamFailedError } from '@/services/audio/audio-errors';
import { VoiceNotConnectedError } from '@/services/voice/voice-errors';
import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';

import { QueueAdvancer } from './queue-advancer';

describe('QueueAdvancer', () => {
  const guildId = '200000000000000002';
  let appContext: TestAppContext;
  let queueAdvancer: QueueAdvancer;

  beforeEach(() => {
    vi.useFakeTimers();
    appContext = createTestAppContext();
    queueAdvancer = new QueueAdvancer(appContext);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('plays the next track of the queue', async () => {
    const stream = Readable.from([]);
    vi.spyOn(appContext.services.audio, 'stream').mockResolvedValue(stream);
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.add(TrackFixtures.SongC);

    const result = await queueAdvancer.execute({ guildId });

    expect(result).toEqual({
      title: 'Take On Me',
      url: 'https://www.youtube.com/watch?v=djV11Xbc914',
      durationSeconds: 225,
      requestedBy: 'Morten'
    });
    expect(queue.current?.title).toBe('Take On Me');
    expect(queue.upcoming.map(track => track.title)).toEqual(['Africa']);
    expect(appContext.services.audio.stream).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://www.youtube.com/watch?v=djV11Xbc914' })
    );
    expect(appContext.services.voice.plays).toEqual([{ guildId: '200000000000000002', stream }]);
  });

  test('stays in the channel when the queue ends and leaves after 5 minutes', async () => {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);

    const result = await queueAdvancer.execute({ guildId });

    expect(result).toBeNull();
    expect(queue.current).toBeNull();
    expect(appContext.services.voice.leaves).toEqual([]);

    vi.advanceTimersByTime(5 * 60 * 1000 - 1);

    expect(appContext.services.voice.leaves).toEqual([]);

    vi.advanceTimersByTime(1);

    expect(appContext.services.voice.leaves).toEqual(['200000000000000002']);
    expect(appContext.queues.guildIds()).toEqual([]);
  });

  test('does not leave when a track is added before the 5 minutes', async () => {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    await queueAdvancer.execute({ guildId });

    vi.advanceTimersByTime(4 * 60 * 1000);
    queue.add(TrackFixtures.SongB);
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(appContext.services.voice.leaves).toEqual([]);
    expect(appContext.queues.find(guildId)).toBe(queue);
  });

  test('does nothing when the guild has no queue', async () => {
    const result = await queueAdvancer.execute({ guildId });

    expect(result).toBeNull();
    expect(appContext.queues.guildIds()).toEqual([]);
    expect(appContext.services.voice.plays).toEqual([]);
  });

  test('destroys the stream without playing it when the queue was released meanwhile', async () => {
    const stream = Readable.from([]);
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    vi.spyOn(appContext.services.audio, 'stream').mockImplementation(async () => {
      appContext.queues.delete(guildId);

      return stream;
    });

    const result = await queueAdvancer.execute({ guildId });
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(result).toBeNull();
    expect(stream.destroyed).toBe(true);
    expect(appContext.services.voice.plays).toEqual([]);
    expect(appContext.services.voice.leaves).toEqual([]);
  });

  test('skips a track whose stream fails and plays the following one', async () => {
    const stream = Readable.from([]);
    const error = new AudioStreamFailedError(TrackFixtures.SongB.url, 'spawn yt-dlp ENOENT');
    vi.spyOn(appContext.services.audio, 'stream')
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(stream);
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.add(TrackFixtures.SongC);

    const result = await queueAdvancer.execute({ guildId });

    expect(result).toMatchObject({ title: 'Africa' });
    expect(queue.current?.title).toBe('Africa');
    expect(appContext.services.voice.plays).toEqual([{ guildId: '200000000000000002', stream }]);
    expect(appContext.services.logger.error).toHaveBeenCalledWith(
      'Failed to play track, skipping it',
      error,
      { guildId: '200000000000000002', url: 'https://www.youtube.com/watch?v=djV11Xbc914' }
    );
  });

  test('destroys the stream and skips the track when the voice fails to play it', async () => {
    const stream = Readable.from([]);
    vi.spyOn(appContext.services.audio, 'stream').mockResolvedValue(stream);
    vi.spyOn(appContext.services.voice, 'play').mockImplementation(() => {
      throw new VoiceNotConnectedError(guildId);
    });
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);

    const result = await queueAdvancer.execute({ guildId });

    expect(result).toBeNull();
    expect(stream.destroyed).toBe(true);
    expect(queue.current).toBeNull();
  });

  test('stops without skipping when the queue was released while a track failed', async () => {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.add(TrackFixtures.SongC);
    const stream = vi.spyOn(appContext.services.audio, 'stream').mockImplementation(async () => {
      appContext.queues.delete(guildId);
      throw new AudioStreamFailedError(TrackFixtures.SongB.url, 'spawn yt-dlp ENOENT');
    });

    const result = await queueAdvancer.execute({ guildId });
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(result).toBeNull();
    expect(stream).toHaveBeenCalledOnce();
    expect(appContext.services.voice.leaves).toEqual([]);
  });

  test('starts the 5 minute timer when every remaining track fails to stream', async () => {
    vi.spyOn(appContext.services.audio, 'stream').mockRejectedValue(
      new AudioStreamFailedError(TrackFixtures.SongB.url, 'spawn yt-dlp ENOENT')
    );
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);

    const result = await queueAdvancer.execute({ guildId });
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(result).toBeNull();
    expect(appContext.services.voice.plays).toEqual([]);
    expect(appContext.services.voice.leaves).toEqual(['200000000000000002']);
  });
});
