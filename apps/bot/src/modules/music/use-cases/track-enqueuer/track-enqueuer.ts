import { z } from 'zod';

import type { AppContext } from '@/context';
import {
  DifferentVoiceChannelError,
  InvalidYoutubeUrlError,
  NotInVoiceChannelError,
  TrackNotFoundError
} from '@/modules/music/music-errors';
import { QueueAdvancer } from '@/modules/music/use-cases/queue-advancer';
import { QueueReleaser } from '@/modules/music/use-cases/queue-releaser';
import { AppError } from '@/shared/errors/app-error';
import type { Track } from '@/shared/types/track';
import { UseCase } from '@/shared/use-case';
import { parseYoutubeUrl } from '@/shared/utils/youtube-url';
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

export class TrackEnqueuer extends UseCase<typeof EnqueueTrackSchema> {
  constructor(private readonly appContext: AppContext) {
    super(EnqueueTrackSchema);
  }

  async run(
    input: z.output<typeof EnqueueTrackSchema>
  ): Promise<
    | EnqueuedTrack
    | NotInVoiceChannelError
    | InvalidYoutubeUrlError
    | DifferentVoiceChannelError
    | TrackNotFoundError
  > {
    const { queues, services } = this.appContext;

    if (!input.voiceChannelId) return new NotInVoiceChannelError();

    const url = parseYoutubeUrl(input.url);

    if (!url) return new InvalidYoutubeUrlError();

    if (this.isPlayingElsewhere(input.guildId, input.voiceChannelId)) {
      return new DifferentVoiceChannelError();
    }

    const resolved = await services.audio.resolve(url);

    if (!resolved) return new TrackNotFoundError();

    if (this.isPlayingElsewhere(input.guildId, input.voiceChannelId)) {
      return new DifferentVoiceChannelError();
    }

    const queue = queues.get(input.guildId);
    const track: Track = { ...resolved, requestedBy: input.requestedBy };

    if (queue.current) return { track, position: queue.add(track) };

    queue.add(track);
    queue.voiceChannelId = input.voiceChannelId;

    try {
      await services.voice.join(input.guildId, input.voiceChannelId);
    } catch (error) {
      if (queues.find(input.guildId) === queue) await this.release(input.guildId);

      throw error;
    }

    services.voice.onIdle(input.guildId, () => void this.advance(input.guildId));
    services.voice.onDisconnect(input.guildId, () => void this.release(input.guildId));
    services.voice.onChannelChange(input.guildId, channelId =>
      this.updateVoiceChannel(input.guildId, queue, channelId)
    );

    try {
      await this.play(input.guildId, queue, track);
    } catch (error) {
      if (queues.find(input.guildId) === queue) await this.advance(input.guildId);

      throw error;
    }

    return { track, position: 0 };
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
