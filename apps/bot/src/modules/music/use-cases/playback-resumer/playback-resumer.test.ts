import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';

import { PlaybackResumer } from './playback-resumer';

describe('PlaybackResumer', () => {
  const guildId = '200000000000000002';
  const voiceChannelId = '300000000000000003';
  let appContext: TestAppContext;
  let playbackResumer: PlaybackResumer;

  beforeEach(() => {
    appContext = createTestAppContext();
    playbackResumer = new PlaybackResumer(appContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function paused() {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.voiceChannelId = voiceChannelId;
    queue.pause();

    return queue;
  }

  test('resumes the paused track', async () => {
    const queue = paused();

    const result = await playbackResumer.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ title: 'Never Gonna Give You Up' });
    expect(queue.status).toBe('playing');
    expect(appContext.services.voice.resumes).toEqual(['200000000000000002']);
  });

  test('returns NotInVoiceChannelError before checking the queue', async () => {
    const queue = paused();
    queue.voiceChannelId = '400000000000000004';

    const result = await playbackResumer.execute({ guildId, voiceChannelId: null });

    expect(result).toMatchObject({ code: 'NOT_IN_VOICE_CHANNEL' });
    expect(queue.status).toBe('paused');
  });

  test('returns NotInBotVoiceChannelError when the bot is in another channel', async () => {
    const queue = paused();
    queue.voiceChannelId = '400000000000000004';

    const result = await playbackResumer.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ code: 'NOT_IN_BOT_VOICE_CHANNEL' });
    expect(queue.status).toBe('paused');
    expect(appContext.services.voice.resumes).toEqual([]);
  });

  test('returns NotPausedError when it is playing', async () => {
    const queue = paused();
    queue.resume();

    const result = await playbackResumer.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ code: 'NOT_PAUSED' });
    expect(appContext.services.voice.resumes).toEqual([]);
  });

  test('returns NotPausedError when nothing is playing', async () => {
    const result = await playbackResumer.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ code: 'NOT_PAUSED' });
    expect(appContext.queues.guildIds()).toEqual([]);
  });
});
