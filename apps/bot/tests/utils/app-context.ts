import { vi } from 'vitest';

import type { AppContext } from '@/context';

export function createTestAppContext(): AppContext {
  return {
    services: {
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      }
    }
  };
}
