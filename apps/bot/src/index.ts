import { createClient } from '@/client';
import { loadConfig } from '@/config';
import { createAppContext } from '@/context';

const config = loadConfig();
const appContext = createAppContext(config);
const client = createClient(appContext);

async function shutdown(signal: NodeJS.Signals) {
  appContext.services.logger.info(`Received ${signal}, shutting down`);
  await client.destroy();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await client.login(config.discord.token);
