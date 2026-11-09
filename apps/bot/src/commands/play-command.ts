import { type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import type { AppContext } from '@/context';
import { TrackEnqueuer } from '@/modules/music/use-cases/track-enqueuer';
import { formatDuration } from '@/shared/utils/format-duration';

import type { Command } from './command';
import { getDisplayName, getGuildId, getVoiceChannelId } from './utils/guild-member';
import { reply } from './utils/reply';

async function execute(interaction: ChatInputCommandInteraction, appContext: AppContext) {
  const guildId = getGuildId(interaction);

  await interaction.deferReply();

  const trackEnqueuer = new TrackEnqueuer(appContext);

  const result = await trackEnqueuer.execute({
    guildId,
    voiceChannelId: getVoiceChannelId(interaction),
    url: interaction.options.getString('url', true),
    requestedBy: getDisplayName(interaction)
  });

  await reply(interaction, result, enqueued => {
    if ('track' in enqueued) {
      const { track, position } = enqueued;
      const label = `**${track.title}** (${formatDuration(track.durationSeconds)})`;

      return position === 0 ? `Now playing ${label}` : `Queued ${label} at position ${position}`;
    }

    const { title, count, truncated, startedTrack } = enqueued;
    const limitNote = truncated ? ' (only the first 100)' : '';
    const queued = `Queued **${count}** tracks from **${title}**${limitNote}.`;

    if (!startedTrack) return queued;

    const duration = startedTrack.durationSeconds
      ? ` (${formatDuration(startedTrack.durationSeconds)})`
      : '';

    return `${queued} Now playing **${startedTrack.title}**${duration}`;
  });
}

export const PlayCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a YouTube video or playlist, or adds it to the queue')
    .addStringOption(option =>
      option.setName('url').setDescription('YouTube video or playlist link').setRequired(true)
    ),
  execute
};
