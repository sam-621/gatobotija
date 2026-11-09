import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Track } from '@/shared/types/track';
import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';

import { TrackSkipper } from './track-skipper';

describe('TrackSkipper', () => {
  const guildId = '200000000000000002';
  const voiceChannelId = '300000000000000003';
  let appContext: TestAppContext;
  let trackSkipper: TrackSkipper;

  beforeEach(() => {
    vi.useFakeTimers();
    appContext = createTestAppContext();
    trackSkipper = new TrackSkipper(appContext);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function playing(...tracks: Track[]) {
    const queue = appContext.queues.get(guildId);
    tracks.forEach(track => queue.add(track));
    queue.voiceChannelId = voiceChannelId;

    return queue;
  }

  test('plays the next track of the queue', async () => {
    const stream = Readable.from([]);
    vi.spyOn(appContext.services.audio, 'stream').mockResolvedValue(stream);
    const queue = playing(TrackFixtures.SongA, TrackFixtures.SongB, TrackFixtures.SongC);

    const result = await trackSkipper.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ title: 'Take On Me' });
    expect(queue.current?.title).toBe('Take On Me');
    expect(queue.upcoming.map(track => track.title)).toEqual(['Africa']);
    expect(appContext.services.voice.plays).toEqual([{ guildId: '200000000000000002', stream }]);
    expect(appContext.services.voice.stops).toEqual([]);
  });

  test('plays the next track when skipping while paused', async () => {
    const queue = playing(TrackFixtures.SongA, TrackFixtures.SongB);
    queue.pause();

    await trackSkipper.execute({ guildId, voiceChannelId });

    expect(queue.current?.title).toBe('Take On Me');
    expect(queue.status).toBe('playing');
  });

  test('stops and leaves after 5 minutes when there is no next track', async () => {
    const queue = playing(TrackFixtures.SongA);

    const result = await trackSkipper.execute({ guildId, voiceChannelId });

    expect(result).toBeNull();
    expect(queue.current).toBeNull();
    expect(appContext.services.voice.stops).toEqual(['200000000000000002']);
    expect(appContext.services.voice.leaves).toEqual([]);

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(appContext.services.voice.leaves).toEqual(['200000000000000002']);
    expect(appContext.queues.guildIds()).toEqual([]);
  });

  test('returns NotInVoiceChannelError before checking the queue', async () => {
    const queue = playing(TrackFixtures.SongA, TrackFixtures.SongB);
    queue.voiceChannelId = '400000000000000004';

    const result = await trackSkipper.execute({ guildId, voiceChannelId: null });

    expect(result).toMatchObject({ code: 'NOT_IN_VOICE_CHANNEL' });
    expect(queue.current?.title).toBe('Never Gonna Give You Up');
  });

  test('returns NotInBotVoiceChannelError when the bot is in another channel', async () => {
    const queue = playing(TrackFixtures.SongA, TrackFixtures.SongB);
    queue.voiceChannelId = '400000000000000004';

    const result = await trackSkipper.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ code: 'NOT_IN_BOT_VOICE_CHANNEL' });
    expect(queue.current?.title).toBe('Never Gonna Give You Up');
    expect(appContext.services.voice.plays).toEqual([]);
  });

  test('returns QueueEmptyError when nothing is playing', async () => {
    const result = await trackSkipper.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ code: 'QUEUE_EMPTY' });
    expect(appContext.queues.guildIds()).toEqual([]);
    expect(appContext.services.voice.stops).toEqual([]);
  });
});
