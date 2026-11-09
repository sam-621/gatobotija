import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { StopCommand } from '@/commands/stop-command';
import { onInteractionCreate } from '@/events/interaction-create';
import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';
import { createInteraction } from '@tests/utils/interaction';

describe('/stop - Command', () => {
  const guildId = '200000000000000002';
  const voiceChannelId = '300000000000000003';
  let appContext: TestAppContext;

  beforeEach(() => {
    appContext = createTestAppContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function stopInteraction(channelId: string | null = voiceChannelId) {
    return createInteraction({ command: 'stop', voiceChannelId: channelId });
  }

  function playing() {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.voiceChannelId = voiceChannelId;

    return queue;
  }

  test('clears the queue and leaves the voice channel', async () => {
    playing();
    const interaction = stopInteraction();

    await StopCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({ content: 'Stopped and cleared the queue.' });
    expect(appContext.queues.guildIds()).toEqual([]);
    expect(appContext.services.voice.stops).toEqual(['200000000000000002']);
    expect(appContext.services.voice.leaves).toEqual(['200000000000000002']);
  });

  test('replies an ephemeral error when the bot is in another voice channel', async () => {
    const queue = playing();
    queue.voiceChannelId = '400000000000000004';
    const interaction = stopInteraction();

    await StopCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You need to be in my voice channel.',
      flags: 64
    });
    expect(queue.current?.title).toBe('Never Gonna Give You Up');
    expect(appContext.services.voice.leaves).toEqual([]);
  });

  test('replies an ephemeral error when nothing is playing', async () => {
    const interaction = stopInteraction();

    await StopCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Nothing is playing.',
      flags: 64
    });
    expect(appContext.services.voice.leaves).toEqual([]);
  });

  test('replies an ephemeral error when the user is not in a voice channel', async () => {
    const queue = playing();
    const interaction = stopInteraction(null);

    await StopCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You need to be in a voice channel.',
      flags: 64
    });
    expect(queue.upcoming.map(track => track.title)).toEqual(['Take On Me']);
    expect(appContext.services.voice.leaves).toEqual([]);
  });

  test('replies a generic ephemeral error when used outside a guild', async () => {
    const interaction = createInteraction({ command: 'stop', guildId: null });

    await onInteractionCreate(appContext, [StopCommand])(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Something went wrong.',
      flags: 64
    });
    expect(appContext.services.voice.leaves).toEqual([]);
  });
});
