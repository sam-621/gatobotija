import { SlashCommandBuilder } from 'discord.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Command } from '@/commands/command';
import type { AppContext } from '@/context';
import { createTestAppContext } from '@tests/utils/app-context';
import { createInteraction } from '@tests/utils/interaction';

import { onInteractionCreate } from './interaction-create';

describe('interactionCreate - Event', () => {
  let appContext: AppContext;
  let commands: Command[];

  beforeEach(() => {
    appContext = createTestAppContext();
    commands = [
      {
        data: new SlashCommandBuilder().setName('ok').setDescription('Works'),
        execute: vi.fn(async interaction => {
          await interaction.reply({ content: 'done' });
        })
      },
      {
        data: new SlashCommandBuilder().setName('broken').setDescription('Throws'),
        execute: vi.fn(async () => {
          throw new Error('boom');
        })
      }
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('executes the command matching the interaction name', async () => {
    const interaction = createInteraction({ command: 'ok' });

    await onInteractionCreate(appContext, commands)(interaction);

    expect(commands[0].execute).toHaveBeenCalledWith(interaction, appContext);
    expect(interaction.reply).toHaveBeenCalledWith({ content: 'done' });
    expect(appContext.services.logger.error).not.toHaveBeenCalled();
  });

  test('replies a generic ephemeral error when the command is unknown', async () => {
    const interaction = createInteraction({ command: 'missing' });

    await onInteractionCreate(appContext, commands)(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Something went wrong.',
      flags: 64
    });
    expect(appContext.services.logger.error).toHaveBeenCalledWith('Unknown command /missing');
  });

  test('replies a generic ephemeral error and logs it when the command throws', async () => {
    const interaction = createInteraction({ command: 'broken' });

    await onInteractionCreate(appContext, commands)(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Something went wrong.',
      flags: 64
    });
    expect(appContext.services.logger.error).toHaveBeenCalledWith(
      'Command /broken failed',
      expect.objectContaining({ message: 'boom' }),
      { guildId: '200000000000000002' }
    );
  });

  test('deletes the deferred reply and follows up with a generic ephemeral error when the command throws after deferring', async () => {
    const interaction = createInteraction({ command: 'broken' });
    await interaction.deferReply();

    await onInteractionCreate(appContext, commands)(interaction);

    expect(interaction.deleteReply).toHaveBeenCalled();
    expect(interaction.followUp).toHaveBeenCalledWith({
      content: 'Something went wrong.',
      flags: 64
    });
    expect(interaction.reply).not.toHaveBeenCalled();
  });
});
