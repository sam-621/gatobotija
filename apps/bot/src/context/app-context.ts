import type { Client } from 'discord.js';

import type { Config } from '@/config';
import type { AudioSource } from '@/services/audio/audio-source';
import { YtDlpAudioSource } from '@/services/audio/yt-dlp/yt-dlp-audio-source';
import { createLogger, type Logger } from '@/services/logger';
import { DiscordVoicePlayer } from '@/services/voice/discord/discord-voice-player';
import type { VoicePlayer } from '@/services/voice/voice-player';
import { QueueRegistry } from '@/state/queue-registry';

export interface AppContext {
  queues: QueueRegistry;
  services: {
    audio: AudioSource;
    voice: VoicePlayer;
    logger: Logger;
  };
}

export function createAppContext(_config: Config, client: Client): AppContext {
  const logger = createLogger();

  return {
    queues: new QueueRegistry(),
    services: {
      audio: new YtDlpAudioSource(logger),
      voice: new DiscordVoicePlayer(client, logger),
      logger
    }
  };
}
