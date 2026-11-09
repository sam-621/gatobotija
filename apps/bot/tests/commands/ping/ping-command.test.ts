import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PingCommand } from '@/commands/ping-command';
import type { AppContext } from '@/context';
import { createTestAppContext } from '@tests/utils/app-context';
import { createInteraction } from '@tests/utils/interaction';

describe('/ping - Command', () => {
  let appContext: AppContext;

  beforeEach(() => {
    appContext = createTestAppContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('replies with the websocket latency visible to everyone', async () => {
    const interaction = createInteraction({ command: 'ping', wsPing: 42 });

    await PingCommand.execute(interaction, appContext);

    expect(interaction.reply).toHaveBeenCalledWith({ content: 'Pong! 42ms' });
  });
});
