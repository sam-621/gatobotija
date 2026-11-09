import type { Readable } from 'node:stream';

import type { VoicePlayer } from '../voice-player';

export class DummyVoicePlayer implements VoicePlayer {
  readonly joins: { guildId: string; channelId: string }[] = [];
  readonly plays: { guildId: string; stream: Readable }[] = [];
  readonly pauses: string[] = [];
  readonly resumes: string[] = [];
  readonly stops: string[] = [];
  readonly leaves: string[] = [];
  private readonly idleCallbacks = new Map<string, () => void>();
  private readonly disconnectCallbacks = new Map<string, () => void>();
  private readonly channelChangeCallbacks = new Map<string, (channelId: string) => void>();

  async join(guildId: string, channelId: string) {
    this.joins.push({ guildId, channelId });
  }

  play(guildId: string, stream: Readable) {
    this.plays.push({ guildId, stream });
  }

  pause(guildId: string) {
    this.pauses.push(guildId);
  }

  resume(guildId: string) {
    this.resumes.push(guildId);
  }

  stop(guildId: string) {
    this.stops.push(guildId);
  }

  leave(guildId: string) {
    this.leaves.push(guildId);
    this.idleCallbacks.delete(guildId);
    this.disconnectCallbacks.delete(guildId);
    this.channelChangeCallbacks.delete(guildId);
  }

  onIdle(guildId: string, callback: () => void) {
    this.idleCallbacks.set(guildId, callback);
  }

  onDisconnect(guildId: string, callback: () => void) {
    this.disconnectCallbacks.set(guildId, callback);
  }

  onChannelChange(guildId: string, callback: (channelId: string) => void) {
    this.channelChangeCallbacks.set(guildId, callback);
  }

  emitChannelChange(guildId: string, channelId: string) {
    this.channelChangeCallbacks.get(guildId)?.(channelId);
  }

  emitIdle(guildId: string) {
    this.idleCallbacks.get(guildId)?.();
  }

  emitDisconnect(guildId: string) {
    const callback = this.disconnectCallbacks.get(guildId);

    this.idleCallbacks.delete(guildId);
    this.disconnectCallbacks.delete(guildId);
    this.channelChangeCallbacks.delete(guildId);
    callback?.();
  }
}
