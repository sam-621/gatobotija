import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PlayCommand } from '@/commands/play-command';
import { onInteractionCreate } from '@/events/interaction-create';
import { AudioResolveFailedError } from '@/services/audio/audio-errors';
import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';
import { createInteraction } from '@tests/utils/interaction';

describe('/play - Command', () => {
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

  function playInteraction(url: string, channelId: string | null = voiceChannelId) {
    return createInteraction({
      command: 'play',
      options: { url },
      voiceChannelId: channelId,
      displayName: 'Rick'
    });
  }

  test('joins the channel and plays the track when nothing is playing', async () => {
    const stream = Readable.from([]);
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongA);
    vi.spyOn(appContext.services.audio, 'stream').mockResolvedValue(stream);
    const interaction = playInteraction('https://youtu.be/dQw4w9WgXcQ?t=42');

    await PlayCommand.execute(interaction, appContext);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith({
      content: 'Now playing **Never Gonna Give You Up** (3:33)'
    });
    expect(appContext.services.audio.resolve).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    const queue = appContext.queues.get(guildId);
    expect(queue.current).toEqual({
      title: 'Never Gonna Give You Up',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      durationSeconds: 213,
      requestedBy: 'Rick'
    });
    expect(queue.upcoming).toEqual([]);
    expect(queue.voiceChannelId).toBe('300000000000000003');
    expect(appContext.services.voice.joins).toEqual([
      { guildId: '200000000000000002', channelId: '300000000000000003' }
    ]);
    expect(appContext.services.voice.plays).toEqual([{ guildId: '200000000000000002', stream }]);
  });

  test('adds the track to the end of the queue when something is playing', async () => {
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(TrackFixtures.SongC);
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.voiceChannelId = voiceChannelId;
    const interaction = playInteraction('https://www.youtube.com/watch?v=FTQbiNvZqaY');

    await PlayCommand.execute(interaction, appContext);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: 'Queued **Africa** (4:55) at position 2'
    });
    expect(queue.current?.title).toBe('Never Gonna Give You Up');
    expect(queue.upcoming).toEqual([
      {
        title: 'Take On Me',
        url: 'https://www.youtube.com/watch?v=djV11Xbc914',
        durationSeconds: 225,
        requestedBy: 'Morten'
      },
      {
        title: 'Africa',
        url: 'https://www.youtube.com/watch?v=FTQbiNvZqaY',
        durationSeconds: 295,
        requestedBy: 'Rick'
      }
    ]);
    expect(appContext.services.voice.joins).toEqual([]);
    expect(appContext.services.voice.plays).toEqual([]);
  });

  test('replies an ephemeral error when the link is not a YouTube video', async () => {
    const resolve = vi.spyOn(appContext.services.audio, 'resolve');
    const interaction = playInteraction('https://www.youtube.com/playlist?list=PL1234567890');

    await PlayCommand.execute(interaction, appContext);

    expect(interaction.deleteReply).toHaveBeenCalled();
    expect(interaction.followUp).toHaveBeenCalledWith({
      content: 'Only YouTube video links are supported.',
      flags: 64
    });
    expect(resolve).not.toHaveBeenCalled();
    expect(appContext.queues.get(guildId).current).toBeNull();
    expect(appContext.services.voice.joins).toEqual([]);
  });

  test('replies an ephemeral error when the bot is playing in another voice channel', async () => {
    const resolve = vi.spyOn(appContext.services.audio, 'resolve');
    const queue = appContext.queues.get(guildId);
    queue.add(TrackFixtures.SongA);
    queue.voiceChannelId = '400000000000000004';
    const interaction = playInteraction(TrackFixtures.SongB.url);

    await PlayCommand.execute(interaction, appContext);

    expect(interaction.followUp).toHaveBeenCalledWith({
      content: "I'm already playing in another voice channel.",
      flags: 64
    });
    expect(resolve).not.toHaveBeenCalled();
    expect(queue.upcoming).toEqual([]);
    expect(appContext.services.voice.joins).toEqual([]);
  });

  test('replies an ephemeral error when the video is not available', async () => {
    vi.spyOn(appContext.services.audio, 'resolve').mockResolvedValue(null);
    const interaction = playInteraction(TrackFixtures.SongA.url);

    await PlayCommand.execute(interaction, appContext);

    expect(interaction.followUp).toHaveBeenCalledWith({
      content: 'That video is not available.',
      flags: 64
    });
    expect(appContext.queues.get(guildId).current).toBeNull();
    expect(appContext.services.voice.joins).toEqual([]);
  });

  test('deletes the deferred reply and follows up with a generic error when resolving fails', async () => {
    vi.spyOn(appContext.services.audio, 'resolve').mockRejectedValue(
      new AudioResolveFailedError(TrackFixtures.SongA.url, 'spawn yt-dlp ENOENT')
    );
    const interaction = playInteraction(TrackFixtures.SongA.url);

    await onInteractionCreate(appContext, [PlayCommand])(interaction);

    expect(interaction.deleteReply).toHaveBeenCalled();
    expect(interaction.followUp).toHaveBeenCalledWith({
      content: 'Something went wrong.',
      flags: 64
    });
    expect(appContext.queues.get(guildId).current).toBeNull();
  });

  test('replies an ephemeral error when the user is not in a voice channel', async () => {
    const resolve = vi.spyOn(appContext.services.audio, 'resolve');
    const interaction = playInteraction(TrackFixtures.SongA.url, null);

    await PlayCommand.execute(interaction, appContext);

    expect(interaction.followUp).toHaveBeenCalledWith({
      content: 'You need to be in a voice channel.',
      flags: 64
    });
    expect(resolve).not.toHaveBeenCalled();
    expect(appContext.queues.get(guildId).current).toBeNull();
    expect(appContext.services.voice.joins).toEqual([]);
  });

  test('replies a generic ephemeral error when used outside a guild', async () => {
    const interaction = createInteraction({
      command: 'play',
      options: { url: TrackFixtures.SongA.url },
      guildId: null
    });

    await onInteractionCreate(appContext, [PlayCommand])(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Something went wrong.',
      flags: 64
    });
    expect(appContext.queues.guildIds()).toEqual([]);
    expect(appContext.services.voice.joins).toEqual([]);
  });
});
