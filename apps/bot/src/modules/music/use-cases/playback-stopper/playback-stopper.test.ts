import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';

import { PlaybackStopper } from './playback-stopper';

describe('PlaybackStopper', () => {
  const guildId = '200000000000000002';
  const voiceChannelId = '300000000000000003';
  let appContext: TestAppContext;
  let playbackStopper: PlaybackStopper;

  beforeEach(() => {
    appContext = createTestAppContext();
    playbackStopper = new PlaybackStopper(appContext);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function playing() {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.voiceChannelId = voiceChannelId;

    return queue;
  }

  test('clears the queue, stops, leaves the channel and deletes the queue', async () => {
    const queue = playing();

    const result = await playbackStopper.execute({ guildId, voiceChannelId });

    expect(result).toBeUndefined();
    expect(queue.current).toBeNull();
    expect(queue.upcoming).toEqual([]);
    expect(appContext.services.voice.stops).toEqual(['200000000000000002']);
    expect(appContext.services.voice.leaves).toEqual(['200000000000000002']);
    expect(appContext.queues.guildIds()).toEqual([]);
  });

  test('cancels the idle timer started while stopping', async () => {
    vi.useFakeTimers();
    const queue = playing();
    const leaveCallback = vi.fn();
    vi.spyOn(appContext.services.voice, 'stop').mockImplementation(() =>
      queue.startIdleTimeout(leaveCallback, 5 * 60 * 1000)
    );

    await playbackStopper.execute({ guildId, voiceChannelId });
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(leaveCallback).not.toHaveBeenCalled();
  });

  test('returns NotInVoiceChannelError before checking the queue', async () => {
    const queue = playing();
    queue.voiceChannelId = '400000000000000004';

    const result = await playbackStopper.execute({ guildId, voiceChannelId: null });

    expect(result).toMatchObject({ code: 'NOT_IN_VOICE_CHANNEL' });
    expect(queue.current?.title).toBe('Never Gonna Give You Up');
  });

  test('returns NotInBotVoiceChannelError when the bot is in another channel', async () => {
    const queue = playing();
    queue.voiceChannelId = '400000000000000004';

    const result = await playbackStopper.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ code: 'NOT_IN_BOT_VOICE_CHANNEL' });
    expect(queue.upcoming.map(track => track.title)).toEqual(['Take On Me']);
    expect(appContext.services.voice.leaves).toEqual([]);
  });

  test('returns QueueEmptyError when nothing is playing', async () => {
    const result = await playbackStopper.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ code: 'QUEUE_EMPTY' });
    expect(appContext.services.voice.stops).toEqual([]);
    expect(appContext.services.voice.leaves).toEqual([]);
  });
});
