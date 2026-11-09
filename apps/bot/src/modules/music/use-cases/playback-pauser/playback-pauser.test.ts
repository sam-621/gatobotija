import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';

import { PlaybackPauser } from './playback-pauser';

describe('PlaybackPauser', () => {
  const guildId = '200000000000000002';
  const voiceChannelId = '300000000000000003';
  let appContext: TestAppContext;
  let playbackPauser: PlaybackPauser;

  beforeEach(() => {
    appContext = createTestAppContext();
    playbackPauser = new PlaybackPauser(appContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function playing() {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.voiceChannelId = voiceChannelId;

    return queue;
  }

  test('pauses the current track', async () => {
    const queue = playing();

    const result = await playbackPauser.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ title: 'Never Gonna Give You Up' });
    expect(queue.status).toBe('paused');
    expect(appContext.services.voice.pauses).toEqual(['200000000000000002']);
  });

  test('returns NotInVoiceChannelError before checking the queue', async () => {
    const queue = playing();
    queue.voiceChannelId = '400000000000000004';

    const result = await playbackPauser.execute({ guildId, voiceChannelId: null });

    expect(result).toMatchObject({ code: 'NOT_IN_VOICE_CHANNEL' });
    expect(queue.status).toBe('playing');
  });

  test('returns NotInBotVoiceChannelError when the bot is in another channel', async () => {
    const queue = playing();
    queue.voiceChannelId = '400000000000000004';

    const result = await playbackPauser.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ code: 'NOT_IN_BOT_VOICE_CHANNEL' });
    expect(queue.status).toBe('playing');
    expect(appContext.services.voice.pauses).toEqual([]);
  });

  test('returns QueueEmptyError when nothing is playing', async () => {
    const result = await playbackPauser.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ code: 'QUEUE_EMPTY' });
    expect(appContext.queues.guildIds()).toEqual([]);
    expect(appContext.services.voice.pauses).toEqual([]);
  });

  test('returns AlreadyPausedError when it is already paused', async () => {
    const queue = playing();
    queue.pause();

    const result = await playbackPauser.execute({ guildId, voiceChannelId });

    expect(result).toMatchObject({ code: 'ALREADY_PAUSED' });
    expect(queue.status).toBe('paused');
    expect(appContext.services.voice.pauses).toEqual([]);
  });
});
