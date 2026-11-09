import { Readable } from 'node:stream';
import { vi } from 'vitest';

import type { AppContext } from '@/context';
import type { AudioSource } from '@/services/audio/audio-source';
import { DummyVoicePlayer } from '@/services/voice/dummy/dummy-voice-player';
import { QueueRegistry } from '@/state/queue-registry';

export type TestAppContext = AppContext & {
  services: AppContext['services'] & { voice: DummyVoicePlayer };
};

export function createTestAppContext(): TestAppContext {
  const audio: AudioSource = {
    resolve: async () => null,
    stream: async () => Readable.from([])
  };

  return {
    queues: new QueueRegistry(),
    services: {
      audio,
      voice: new DummyVoicePlayer(),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      }
    }
  };
}
