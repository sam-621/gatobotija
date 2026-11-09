import { type ChatInputCommandInteraction, MessageFlags } from 'discord.js';

import { BusinessError } from '@/shared/errors/business-error';

export async function reply<T>(
  interaction: ChatInputCommandInteraction,
  result: T,
  render: (value: Exclude<T, BusinessError>) => string
) {
  if (result instanceof BusinessError) {
    await respond(interaction, result.message, true);

    return;
  }

  await respond(interaction, render(result as Exclude<T, BusinessError>), false);
}

async function respond(
  interaction: ChatInputCommandInteraction,
  content: string,
  ephemeral: boolean
) {
  if (interaction.deferred && ephemeral) {
    await interaction.deleteReply();
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });

    return;
  }

  if (interaction.deferred) {
    await interaction.editReply({ content });

    return;
  }

  await interaction.reply(ephemeral ? { content, flags: MessageFlags.Ephemeral } : { content });
}
