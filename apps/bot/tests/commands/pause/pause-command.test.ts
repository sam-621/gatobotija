import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PauseCommand } from '@/commands/pause-command';
import { onInteractionCreate } from '@/events/interaction-create';
import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';
import { createInteraction } from '@tests/utils/interaction';

describe('/pause - Command', () => {
  const guildId = '200000000000000002';
  const voiceChannelId = '300000000000000003';
  let appContext: TestAppContext;

  beforeEach(() => {
    appContext = createTestAppContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function pauseInteraction(channelId: string | null = voiceChannelId) {
    return createInteraction({ command: 'pause', voiceChannelId: channelId });
  }

  function playing() {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.voiceChannelId = voiceChannelId;

    return queue;
  }

  test('pauses the current track', async () => {
    const queue = playing();
    const interaction = pauseInteraction();

    await PauseCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Paused **Never Gonna Give You Up**.'
    });
    expect(queue.status).toBe('paused');
    expect(appContext.services.voice.pauses).toEqual(['200000000000000002']);
  });

  test('replies an ephemeral error when the bot is in another voice channel', async () => {
    const queue = playing();
    queue.voiceChannelId = '400000000000000004';
    const interaction = pauseInteraction();

    await PauseCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You need to be in my voice channel.',
      flags: 64
    });
    expect(queue.status).toBe('playing');
    expect(appContext.services.voice.pauses).toEqual([]);
  });

  test('replies an ephemeral error when nothing is playing', async () => {
    const interaction = pauseInteraction();

    await PauseCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Nothing is playing.',
      flags: 64
    });
    expect(appContext.services.voice.pauses).toEqual([]);
  });

  test('replies an ephemeral error when it is already paused', async () => {
    const queue = playing();
    queue.pause();
    const interaction = pauseInteraction();

    await PauseCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({ content: 'Already paused.', flags: 64 });
    expect(queue.status).toBe('paused');
    expect(appContext.services.voice.pauses).toEqual([]);
  });

  test('replies an ephemeral error when the user is not in a voice channel', async () => {
    const queue = playing();
    const interaction = pauseInteraction(null);

    await PauseCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You need to be in a voice channel.',
      flags: 64
    });
    expect(queue.status).toBe('playing');
    expect(appContext.services.voice.pauses).toEqual([]);
  });

  test('replies a generic ephemeral error when used outside a guild', async () => {
    const interaction = createInteraction({ command: 'pause', guildId: null });

    await onInteractionCreate(appContext, [PauseCommand])(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Something went wrong.',
      flags: 64
    });
    expect(appContext.services.voice.pauses).toEqual([]);
  });
});
