import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ResumeCommand } from '@/commands/resume-command';
import { onInteractionCreate } from '@/events/interaction-create';
import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';
import { createInteraction } from '@tests/utils/interaction';

describe('/resume - Command', () => {
  const guildId = '200000000000000002';
  const voiceChannelId = '300000000000000003';
  let appContext: TestAppContext;

  beforeEach(() => {
    appContext = createTestAppContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function resumeInteraction(channelId: string | null = voiceChannelId) {
    return createInteraction({ command: 'resume', voiceChannelId: channelId });
  }

  function paused() {
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.voiceChannelId = voiceChannelId;
    queue.pause();

    return queue;
  }

  test('resumes the paused track', async () => {
    const queue = paused();
    const interaction = resumeInteraction();

    await ResumeCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Resumed **Never Gonna Give You Up**.'
    });
    expect(queue.status).toBe('playing');
    expect(appContext.services.voice.resumes).toEqual(['200000000000000002']);
  });

  test('replies an ephemeral error when the bot is in another voice channel', async () => {
    const queue = paused();
    queue.voiceChannelId = '400000000000000004';
    const interaction = resumeInteraction();

    await ResumeCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You need to be in my voice channel.',
      flags: 64
    });
    expect(queue.status).toBe('paused');
    expect(appContext.services.voice.resumes).toEqual([]);
  });

  test('replies an ephemeral error when nothing is paused', async () => {
    const queue = paused();
    queue.resume();
    const interaction = resumeInteraction();

    await ResumeCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({ content: 'Nothing is paused.', flags: 64 });
    expect(appContext.services.voice.resumes).toEqual([]);
  });

  test('replies an ephemeral error when the user is not in a voice channel', async () => {
    const queue = paused();
    const interaction = resumeInteraction(null);

    await ResumeCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You need to be in a voice channel.',
      flags: 64
    });
    expect(queue.status).toBe('paused');
    expect(appContext.services.voice.resumes).toEqual([]);
  });

  test('replies a generic ephemeral error when used outside a guild', async () => {
    const interaction = createInteraction({ command: 'resume', guildId: null });

    await onInteractionCreate(appContext, [ResumeCommand])(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Something went wrong.',
      flags: 64
    });
    expect(appContext.services.voice.resumes).toEqual([]);
  });
});
