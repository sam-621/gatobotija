import { z } from 'zod';

import type { AppContext } from '@/context';
import {
  AlreadyPausedError,
  NotInBotVoiceChannelError,
  NotInVoiceChannelError,
  QueueEmptyError
} from '@/modules/music/music-errors';
import type { Track } from '@/shared/types/track';
import { UseCase } from '@/shared/use-case';
import { PlaybackStatus } from '@/state/guild-queue';

const PausePlaybackSchema = z.object({
  guildId: z.string().min(1),
  voiceChannelId: z.string().min(1).nullable()
});

export class PlaybackPauser extends UseCase<typeof PausePlaybackSchema> {
  constructor(private readonly appContext: AppContext) {
    super(PausePlaybackSchema);
  }

  async run(
    input: z.output<typeof PausePlaybackSchema>
  ): Promise<
    | Track
    | NotInVoiceChannelError
    | NotInBotVoiceChannelError
    | QueueEmptyError
    | AlreadyPausedError
  > {
    const { queues, services } = this.appContext;

    if (!input.voiceChannelId) return new NotInVoiceChannelError();

    const queue = queues.find(input.guildId);

    if (queue && queue.voiceChannelId !== input.voiceChannelId) {
      return new NotInBotVoiceChannelError();
    }

    if (!queue?.current) return new QueueEmptyError();

    if (queue.status === PlaybackStatus.Paused) return new AlreadyPausedError();

    services.voice.pause(input.guildId);
    queue.pause();

    return queue.current;
  }
}
