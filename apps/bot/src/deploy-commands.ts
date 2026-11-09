import { REST, Routes } from 'discord.js';

import { createClient } from '@/client';
import { commands } from '@/commands';
import { loadConfig } from '@/config';
import { createAppContext } from '@/context';

const config = loadConfig();
const appContext = createAppContext(config, createClient());
const rest = new REST().setToken(config.discord.token);

await rest.put(Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId), {
  body: commands.map(command => command.data.toJSON())
});

appContext.services.logger.info(
  `Registered ${commands.length} commands in guild ${config.discord.guildId}`
);
