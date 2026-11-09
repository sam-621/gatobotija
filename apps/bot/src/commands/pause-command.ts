import { type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import type { AppContext } from '@/context';
import { PlaybackPauser } from '@/modules/music/use-cases/playback-pauser';

import type { Command } from './command';
import { getGuildId, getVoiceChannelId } from './utils/guild-member';
import { reply } from './utils/reply';

async function execute(interaction: ChatInputCommandInteraction, appContext: AppContext) {
  const playbackPauser = new PlaybackPauser(appContext);

  const result = await playbackPauser.execute({
    guildId: getGuildId(interaction),
    voiceChannelId: getVoiceChannelId(interaction)
  });

  await reply(interaction, result, track => `Paused **${track.title}**.`);
}

export const PauseCommand: Command = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pauses the current song'),
  execute
};
