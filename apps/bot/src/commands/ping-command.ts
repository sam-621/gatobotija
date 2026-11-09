import { type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import type { AppContext } from '@/context';

import type { Command } from './command';
import { reply } from './utils/reply';

async function execute(interaction: ChatInputCommandInteraction, _appContext: AppContext) {
  await reply(interaction, interaction.client.ws.ping, ping => `Pong! ${ping}ms`);
}

export const PingCommand: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Checks that the bot is online'),
  execute
};
