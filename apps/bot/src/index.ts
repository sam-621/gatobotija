import { createClient, registerEvents } from '@/client';
import { loadConfig } from '@/config';
import { createAppContext } from '@/context';
import { QueueReleaser } from '@/modules/music/use-cases/queue-releaser';

const config = loadConfig();
const client = createClient();
const appContext = createAppContext(config, client);

registerEvents(client, appContext);

async function shutdown(signal: NodeJS.Signals) {
  appContext.services.logger.info(`Received ${signal}, shutting down`);

  const queueReleaser = new QueueReleaser(appContext);

  for (const guildId of appContext.queues.guildIds()) await queueReleaser.execute({ guildId });

  await client.destroy();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await client.login(config.discord.token);
