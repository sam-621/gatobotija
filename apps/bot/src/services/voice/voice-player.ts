import type { Readable } from 'node:stream';

export interface VoicePlayer {
  join(guildId: string, channelId: string): Promise<void>;
  play(guildId: string, stream: Readable): void;
  leave(guildId: string): void;
  onIdle(guildId: string, callback: () => void): void;
  onDisconnect(guildId: string, callback: () => void): void;
  onChannelChange(guildId: string, callback: (channelId: string) => void): void;
}
