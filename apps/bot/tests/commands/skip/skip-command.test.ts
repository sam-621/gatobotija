import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { SkipCommand } from '@/commands/skip-command';
import { onInteractionCreate } from '@/events/interaction-create';
import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';
import { createInteraction } from '@tests/utils/interaction';

describe('/skip - Command', () => {
  const guildId = '200000000000000002';
  const voiceChannelId = '300000000000000003';
  let appContext: TestAppContext;

  beforeEach(() => {
    appContext = createTestAppContext();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function skipInteraction(channelId: string | null = voiceChannelId) {
    return createInteraction({ command: 'skip', voiceChannelId: channelId });
  }

  test('skips to the next track and replies what is playing now', async () => {
    const stream = Readable.from([]);
    vi.spyOn(appContext.services.audio, 'stream').mockResolvedValue(stream);
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.voiceChannelId = voiceChannelId;
    const interaction = skipInteraction();

    await SkipCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Skipped. Now playing **Take On Me** (3:45)'
    });
    expect(queue.current?.title).toBe('Take On Me');
    expect(queue.upcoming).toEqual([]);
    expect(appContext.services.voice.plays).toEqual([{ guildId: '200000000000000002', stream }]);
  });

  test('stops and replies that the queue is empty when there is no next track', async () => {
    vi.useFakeTimers();
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.voiceChannelId = voiceChannelId;
    const interaction = skipInteraction();

    await SkipCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({ content: 'Skipped. The queue is empty.' });
    expect(queue.current).toBeNull();
    expect(appContext.services.voice.stops).toEqual(['200000000000000002']);
    expect(appContext.services.voice.leaves).toEqual([]);
  });

  test('replies an ephemeral error when the bot is in another voice channel', async () => {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.voiceChannelId = '400000000000000004';
    const interaction = skipInteraction();

    await SkipCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You need to be in my voice channel.',
      flags: 64
    });
    expect(queue.current?.title).toBe('Never Gonna Give You Up');
    expect(appContext.services.voice.plays).toEqual([]);
  });

  test('replies an ephemeral error when nothing is playing', async () => {
    const interaction = skipInteraction();

    await SkipCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Nothing is playing.',
      flags: 64
    });
    expect(appContext.queues.guildIds()).toEqual([]);
    expect(appContext.services.voice.stops).toEqual([]);
  });

  test('replies an ephemeral error when the user is not in a voice channel', async () => {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.voiceChannelId = voiceChannelId;
    const interaction = skipInteraction(null);

    await SkipCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You need to be in a voice channel.',
      flags: 64
    });
    expect(queue.current?.title).toBe('Never Gonna Give You Up');
    expect(appContext.services.voice.plays).toEqual([]);
  });

  test('replies a generic ephemeral error when used outside a guild', async () => {
    const interaction = createInteraction({ command: 'skip', guildId: null });

    await onInteractionCreate(appContext, [SkipCommand])(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Something went wrong.',
      flags: 64
    });
    expect(appContext.queues.guildIds()).toEqual([]);
  });
});
