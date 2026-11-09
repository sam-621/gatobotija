import { z } from 'zod';

import type { AppContext } from '@/context';
import {
  NotInBotVoiceChannelError,
  NotInVoiceChannelError,
  NotPausedError
} from '@/modules/music/music-errors';
import type { Track } from '@/shared/types/track';
import { UseCase } from '@/shared/use-case';
import { PlaybackStatus } from '@/state/guild-queue';

const ResumePlaybackSchema = z.object({
  guildId: z.string().min(1),
  voiceChannelId: z.string().min(1).nullable()
});

export class PlaybackResumer extends UseCase<typeof ResumePlaybackSchema> {
  constructor(private readonly appContext: AppContext) {
    super(ResumePlaybackSchema);
  }

  async run(
    input: z.output<typeof ResumePlaybackSchema>
  ): Promise<Track | NotInVoiceChannelError | NotInBotVoiceChannelError | NotPausedError> {
    const { queues, services } = this.appContext;

    if (!input.voiceChannelId) return new NotInVoiceChannelError();

    const queue = queues.find(input.guildId);

    if (queue && queue.voiceChannelId !== input.voiceChannelId) {
      return new NotInBotVoiceChannelError();
    }

    if (!queue?.current || queue.status !== PlaybackStatus.Paused) return new NotPausedError();

    services.voice.resume(input.guildId);
    queue.resume();

    return queue.current;
  }
}
