import type { Track } from '@/shared/types/track';

export const PlaybackStatus = {
  Idle: 'idle',
  Playing: 'playing',
  Paused: 'paused'
} as const;

export type PlaybackStatus = (typeof PlaybackStatus)[keyof typeof PlaybackStatus];

export class GuildQueue {
  voiceChannelId: string | null = null;
  private currentTrack: Track | null = null;
  private upcomingTracks: Track[] = [];
  private playbackStatus: PlaybackStatus = PlaybackStatus.Idle;
  private idleTimeout: NodeJS.Timeout | null = null;

  get current(): Track | null {
    return this.currentTrack;
  }

  get upcoming(): readonly Track[] {
    return this.upcomingTracks;
  }

  get status(): PlaybackStatus {
    return this.playbackStatus;
  }

  add(track: Track): number {
    this.cancelIdleTimeout();

    if (!this.currentTrack) {
      this.currentTrack = track;
      this.playbackStatus = PlaybackStatus.Playing;

      return 0;
    }

    this.upcomingTracks.push(track);

    return this.upcomingTracks.length;
  }

  next(): Track | null {
    this.currentTrack = this.upcomingTracks.shift() ?? null;
    this.playbackStatus = this.currentTrack ? PlaybackStatus.Playing : PlaybackStatus.Idle;

    return this.currentTrack;
  }

  pause() {
    if (this.currentTrack) this.playbackStatus = PlaybackStatus.Paused;
  }

  resume() {
    if (this.currentTrack) this.playbackStatus = PlaybackStatus.Playing;
  }

  clear() {
    this.cancelIdleTimeout();
    this.currentTrack = null;
    this.upcomingTracks = [];
    this.playbackStatus = PlaybackStatus.Idle;
  }

  startIdleTimeout(callback: () => void, delayMs: number) {
    this.cancelIdleTimeout();
    this.idleTimeout = setTimeout(() => {
      this.idleTimeout = null;
      callback();
    }, delayMs);
  }

  cancelIdleTimeout() {
    if (this.idleTimeout) clearTimeout(this.idleTimeout);

    this.idleTimeout = null;
  }
}
