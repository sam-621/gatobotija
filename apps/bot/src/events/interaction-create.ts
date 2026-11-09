import { type ChatInputCommandInteraction, type Interaction, MessageFlags } from 'discord.js';

import type { Command } from '@/commands/command';
import type { AppContext } from '@/context';

const GENERIC_ERROR_MESSAGE = 'Something went wrong.';

export function onInteractionCreate(appContext: AppContext, commands: Command[]) {
  return async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.find(item => item.data.name === interaction.commandName);

    if (!command) {
      appContext.services.logger.error(`Unknown command /${interaction.commandName}`);
      await replyGenericError(interaction, appContext);

      return;
    }

    try {
      await command.execute(interaction, appContext);
    } catch (error) {
      appContext.services.logger.error(`Command /${interaction.commandName} failed`, error, {
        guildId: interaction.guildId
      });
      await replyGenericError(interaction, appContext);
    }
  };
}

async function replyGenericError(interaction: ChatInputCommandInteraction, appContext: AppContext) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: GENERIC_ERROR_MESSAGE, flags: MessageFlags.Ephemeral });

      return;
    }

    await interaction.reply({ content: GENERIC_ERROR_MESSAGE, flags: MessageFlags.Ephemeral });
  } catch (error) {
    appContext.services.logger.error('Failed to send the generic error reply', error);
  }
}
