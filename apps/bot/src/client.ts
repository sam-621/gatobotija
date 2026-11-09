import { Client, Events, GatewayIntentBits } from 'discord.js';

import { commands } from '@/commands';
import type { AppContext } from '@/context';
import { onInteractionCreate } from '@/events/interaction-create';
import { onReady } from '@/events/ready';

export function createClient() {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
  });
}

export function registerEvents(client: Client, appContext: AppContext) {
  client.once(Events.ClientReady, onReady(appContext));
  client.on(Events.InteractionCreate, onInteractionCreate(appContext, commands));
}
