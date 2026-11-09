import { z } from 'zod';

import type { AppContext } from '@/context';
import {
  DifferentVoiceChannelError,
  InvalidYoutubeUrlError,
  NotInVoiceChannelError,
  PlaylistNotFoundError,
  TrackNotFoundError
} from '@/modules/music/music-errors';
import { QueueAdvancer } from '@/modules/music/use-cases/queue-advancer';
import { QueueReleaser } from '@/modules/music/use-cases/queue-releaser';
import type { ResolvedTrack } from '@/services/audio/audio-source';
import { AppError } from '@/shared/errors/app-error';
import type { Track } from '@/shared/types/track';
import { UseCase } from '@/shared/use-case';
import { parseYoutubeUrl, YoutubeLinkKind } from '@/shared/utils/youtube-url';
import type { GuildQueue } from '@/state/guild-queue';

const EnqueueTrackSchema = z.object({
  guildId: z.string().min(1),
  voiceChannelId: z.string().min(1).nullable(),
  url: z.string().min(1),
  requestedBy: z.string().min(1)
});

class QueueReleasedError extends AppError {
  constructor(guildId: string) {
    super(`Queue of guild ${guildId} was released before playback started`);
  }
}

interface EnqueuedTrack {
  track: Track;
  position: number;
}

interface EnqueuedPlaylist {
  title: string;
  count: number;
  truncated: boolean;
  startedTrack: Track | null;
  position: number;
}

interface EnqueueRequest {
  guildId: string;
  voiceChannelId: string;
  requestedBy: string;
}

interface EnqueuedTracks {
  tracks: Track[];
  position: number;
}

export class TrackEnqueuer extends UseCase<typeof EnqueueTrackSchema> {
  private static readonly PLAYLIST_LIMIT = 100;

  constructor(private readonly appContext: AppContext) {
    super(EnqueueTrackSchema);
  }

  async run(
    input: z.output<typeof EnqueueTrackSchema>
  ): Promise<
    | EnqueuedTrack
    | EnqueuedPlaylist
    | NotInVoiceChannelError
    | InvalidYoutubeUrlError
    | DifferentVoiceChannelError
    | TrackNotFoundError
    | PlaylistNotFoundError
  > {
    if (!input.voiceChannelId) return new NotInVoiceChannelError();

    const link = parseYoutubeUrl(input.url);

    if (!link) return new InvalidYoutubeUrlError();

    if (this.isPlayingElsewhere(input.guildId, input.voiceChannelId)) {
      return new DifferentVoiceChannelError();
    }

    const request: EnqueueRequest = {
      guildId: input.guildId,
      voiceChannelId: input.voiceChannelId,
      requestedBy: input.requestedBy
    };

    if (link.kind === YoutubeLinkKind.Playlist) return this.enqueuePlaylist(request, link.url);

    return this.enqueueVideo(request, link.url);
  }

  private async enqueueVideo(
    request: EnqueueRequest,
    url: string
  ): Promise<EnqueuedTrack | DifferentVoiceChannelError | TrackNotFoundError> {
    const resolved = await this.appContext.services.audio.resolve(url);

    if (!resolved) return new TrackNotFoundError();

    const enqueued = await this.enqueue(request, [resolved]);

    if (enqueued instanceof DifferentVoiceChannelError) return enqueued;

    return { track: enqueued.tracks[0], position: enqueued.position };
  }

  private async enqueuePlaylist(
    request: EnqueueRequest,
    url: string
  ): Promise<EnqueuedPlaylist | DifferentVoiceChannelError | PlaylistNotFoundError> {
    const playlist = await this.appContext.services.audio.resolvePlaylist(
      url,
      TrackEnqueuer.PLAYLIST_LIMIT
    );

    if (!playlist || playlist.tracks.length === 0) return new PlaylistNotFoundError();

    const enqueued = await this.enqueue(request, playlist.tracks);

    if (enqueued instanceof DifferentVoiceChannelError) return enqueued;

    return {
      title: playlist.title,
      count: enqueued.tracks.length,
      truncated: playlist.truncated,
      startedTrack: enqueued.position === 0 ? enqueued.tracks[0] : null,
      position: enqueued.position
    };
  }

  private async enqueue(
    request: EnqueueRequest,
    resolved: readonly ResolvedTrack[]
  ): Promise<EnqueuedTracks | DifferentVoiceChannelError> {
    const { queues, services } = this.appContext;
    const { guildId, voiceChannelId, requestedBy } = request;

    if (this.isPlayingElsewhere(guildId, voiceChannelId)) return new DifferentVoiceChannelError();

    const queue = queues.get(guildId);
    const tracks: Track[] = resolved.map(track => ({ ...track, requestedBy }));
    const [position] = tracks.map(track => queue.add(track));

    if (position > 0) return { tracks, position };

    queue.voiceChannelId = voiceChannelId;

    try {
      await services.voice.join(guildId, voiceChannelId);
    } catch (error) {
      if (queues.find(guildId) === queue) await this.release(guildId);

      throw error;
    }

    services.voice.onIdle(guildId, () => void this.advance(guildId));
    services.voice.onDisconnect(guildId, () => void this.release(guildId));
    services.voice.onChannelChange(guildId, channelId =>
      this.updateVoiceChannel(guildId, queue, channelId)
    );

    try {
      await this.play(guildId, queue, tracks[0]);
    } catch (error) {
      if (queues.find(guildId) === queue) await this.advance(guildId);

      throw error;
    }

    return { tracks, position: 0 };
  }

  private isPlayingElsewhere(guildId: string, voiceChannelId: string): boolean {
    const queue = this.appContext.queues.find(guildId);

    return Boolean(queue?.current && queue.voiceChannelId !== voiceChannelId);
  }

  private updateVoiceChannel(guildId: string, queue: GuildQueue, channelId: string) {
    if (this.appContext.queues.find(guildId) === queue) queue.voiceChannelId = channelId;
  }

  private async play(guildId: string, queue: GuildQueue, track: Track) {
    const { queues, services } = this.appContext;
    const stream = await services.audio.stream(track);

    if (queues.find(guildId) !== queue) {
      stream.destroy();
      throw new QueueReleasedError(guildId);
    }

    try {
      services.voice.play(guildId, stream);
    } catch (error) {
      stream.destroy();
      throw error;
    }
  }

  private async advance(guildId: string) {
    try {
      await new QueueAdvancer(this.appContext).execute({ guildId });
    } catch (error) {
      this.appContext.services.logger.error('Failed to advance the queue', error, { guildId });
    }
  }

  private async release(guildId: string) {
    try {
      await new QueueReleaser(this.appContext).execute({ guildId });
    } catch (error) {
      this.appContext.services.logger.error('Failed to release the queue', error, { guildId });
    }
  }
}
