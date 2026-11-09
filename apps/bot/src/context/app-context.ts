import type { Config } from '@/config';
import { createLogger, type Logger } from '@/services/logger';

export interface AppContext {
  services: {
    logger: Logger;
  };
}

export function createAppContext(_config: Config): AppContext {
  return {
    services: {
      logger: createLogger()
    }
  };
}
