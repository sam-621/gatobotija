import { type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import type { AppContext } from '@/context';
import { PlaybackResumer } from '@/modules/music/use-cases/playback-resumer';

import type { Command } from './command';
import { getGuildId, getVoiceChannelId } from './utils/guild-member';
import { reply } from './utils/reply';

async function execute(interaction: ChatInputCommandInteraction, appContext: AppContext) {
  const playbackResumer = new PlaybackResumer(appContext);

  const result = await playbackResumer.execute({
    guildId: getGuildId(interaction),
    voiceChannelId: getVoiceChannelId(interaction)
  });

  await reply(interaction, result, track => `Resumed **${track.title}**.`);
}

export const ResumeCommand: Command = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resumes the paused song'),
  execute
};
