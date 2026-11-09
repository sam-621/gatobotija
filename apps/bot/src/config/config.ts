import { z } from 'zod';

import { AppError } from '@/shared/errors/app-error';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().regex(/^\d+$/),
  DISCORD_GUILD_ID: z.string().regex(/^\d+$/)
});

class InvalidConfigError extends AppError {
  constructor(details: string) {
    super(`Invalid environment variables:\n${details}`);
  }
}

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig() {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) throw new InvalidConfigError(z.prettifyError(result.error));

  return {
    nodeEnv: result.data.NODE_ENV,
    discord: {
      token: result.data.DISCORD_TOKEN,
      clientId: result.data.DISCORD_CLIENT_ID,
      guildId: result.data.DISCORD_GUILD_ID
    }
  };
}
