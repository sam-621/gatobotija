import type { Readable } from 'node:stream';

import type { Track } from '@/shared/types/track';

export type ResolvedTrack = Omit<Track, 'requestedBy'>;

export interface AudioSource {
  resolve(url: string): Promise<ResolvedTrack | null>;
  stream(track: Track): Promise<Readable>;
}
