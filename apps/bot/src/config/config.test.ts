import { afterEach, describe, expect, test, vi } from 'vitest';

import { loadConfig } from './config';

describe('loadConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('returns the environment mapped to camelCase', () => {
    expect(loadConfig()).toEqual({
      nodeEnv: 'test',
      discord: {
        token: 'test-token',
        clientId: '100000000000000001',
        guildId: '200000000000000002'
      }
    });
  });

  test('throws naming the variable when one is missing', () => {
    vi.stubEnv('DISCORD_TOKEN', undefined);

    expect(() => loadConfig()).toThrow('DISCORD_TOKEN');
  });

  test('throws naming the variable when one has an invalid format', () => {
    vi.stubEnv('DISCORD_GUILD_ID', 'not-a-snowflake');

    expect(() => loadConfig()).toThrow('DISCORD_GUILD_ID');
  });
});
