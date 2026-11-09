import type { Readable } from 'node:stream';

import type { Track } from '@/shared/types/track';

export type ResolvedTrack = Omit<Track, 'requestedBy'>;

export interface ResolvedPlaylist {
  title: string;
  tracks: readonly ResolvedTrack[];
  truncated: boolean;
}

export interface AudioSource {
  resolve(url: string): Promise<ResolvedTrack | null>;
  resolvePlaylist(url: string, limit: number): Promise<ResolvedPlaylist | null>;
  stream(track: Track): Promise<Readable>;
}
