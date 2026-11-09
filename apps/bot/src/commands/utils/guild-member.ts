import type { ChatInputCommandInteraction } from 'discord.js';

import { AppError } from '@/shared/errors/app-error';

class NotInGuildError extends AppError {
  constructor(commandName: string) {
    super(`Command /${commandName} was used outside a guild`);
  }
}

export function getGuildId(interaction: ChatInputCommandInteraction): string {
  if (!interaction.guildId) throw new NotInGuildError(interaction.commandName);

  return interaction.guildId;
}

export function getVoiceChannelId(interaction: ChatInputCommandInteraction): string | null {
  const member = interaction.member;

  if (!member || !('voice' in member)) return null;

  return member.voice.channelId;
}

export function getDisplayName(interaction: ChatInputCommandInteraction): string {
  const member = interaction.member;

  if (member && 'displayName' in member) return member.displayName;

  return interaction.user.displayName;
}
