import { type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import type { AppContext } from '@/context';
import { TrackSkipper } from '@/modules/music/use-cases/track-skipper';
import { formatDuration } from '@/shared/utils/format-duration';

import type { Command } from './command';
import { getGuildId, getVoiceChannelId } from './utils/guild-member';
import { reply } from './utils/reply';

async function execute(interaction: ChatInputCommandInteraction, appContext: AppContext) {
  const trackSkipper = new TrackSkipper(appContext);

  const result = await trackSkipper.execute({
    guildId: getGuildId(interaction),
    voiceChannelId: getVoiceChannelId(interaction)
  });

  await reply(interaction, result, next =>
    next
      ? `Skipped. Now playing **${next.title}** (${formatDuration(next.durationSeconds)})`
      : 'Skipped. The queue is empty.'
  );
}

export const SkipCommand: Command = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Skips the current song'),
  execute
};
