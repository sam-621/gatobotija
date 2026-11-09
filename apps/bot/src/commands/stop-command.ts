import { type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import type { AppContext } from '@/context';
import { PlaybackStopper } from '@/modules/music/use-cases/playback-stopper';

import type { Command } from './command';
import { getGuildId, getVoiceChannelId } from './utils/guild-member';
import { reply } from './utils/reply';

async function execute(interaction: ChatInputCommandInteraction, appContext: AppContext) {
  const playbackStopper = new PlaybackStopper(appContext);

  const result = await playbackStopper.execute({
    guildId: getGuildId(interaction),
    voiceChannelId: getVoiceChannelId(interaction)
  });

  await reply(interaction, result, () => 'Stopped and cleared the queue.');
}

export const StopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops the music, clears the queue and leaves the channel'),
  execute
};
