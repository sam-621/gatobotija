import type { ChatInputCommandInteraction } from 'discord.js';
import { vi } from 'vitest';

type OptionValue = string | number | boolean;

interface CreateInteractionParams {
  command: string;
  options?: Record<string, OptionValue>;
  guildId?: string | null;
  voiceChannelId?: string | null;
  wsPing?: number;
}

export function createInteraction({
  command,
  options = {},
  guildId = '200000000000000002',
  voiceChannelId = null,
  wsPing = 42
}: CreateInteractionParams) {
  const getOption = (name: string, required = false) => {
    const value = options[name];

    if (value === undefined && required) throw new Error(`Missing required option ${name}`);

    return value ?? null;
  };

  const interaction = {
    commandName: command,
    guildId,
    deferred: false,
    replied: false,
    isChatInputCommand: () => true,
    client: { ws: { ping: wsPing } },
    member: { voice: { channelId: voiceChannelId } },
    options: {
      getString: getOption,
      getInteger: getOption,
      getNumber: getOption,
      getBoolean: getOption
    },
    reply: vi.fn(async () => {
      interaction.replied = true;
    }),
    deferReply: vi.fn(async () => {
      interaction.deferred = true;
    }),
    editReply: vi.fn(async () => {
      interaction.replied = true;
    }),
    deleteReply: vi.fn(async () => {}),
    followUp: vi.fn(async () => {})
  };

  return interaction as typeof interaction & ChatInputCommandInteraction;
}
