import type { Client } from 'discord.js';

import type { AppContext } from '@/context';

export function onReady(appContext: AppContext) {
  return (client: Client<true>) => {
    appContext.services.logger.info(`Bot ready as ${client.user.tag}`);
  };
}
