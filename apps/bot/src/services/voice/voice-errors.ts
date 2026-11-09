import { AppError } from '@/shared/errors/app-error';

export class VoiceConnectionFailedError extends AppError {
  constructor(guildId: string, channelId: string, reason: string) {
    super(`Failed to join voice channel ${channelId} in guild ${guildId}: ${reason}`);
  }
}

export class VoiceNotConnectedError extends AppError {
  constructor(guildId: string) {
    super(`Not connected to a voice channel in guild ${guildId}`);
  }
}
