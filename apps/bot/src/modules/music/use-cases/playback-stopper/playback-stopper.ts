import { z } from 'zod';

import type { AppContext } from '@/context';
import {
  NotInBotVoiceChannelError,
  NotInVoiceChannelError,
  QueueEmptyError
} from '@/modules/music/music-errors';
import { UseCase } from '@/shared/use-case';

const StopPlaybackSchema = z.object({
  guildId: z.string().min(1),
  voiceChannelId: z.string().min(1).nullable()
});

export class PlaybackStopper extends UseCase<typeof StopPlaybackSchema> {
  constructor(private readonly appContext: AppContext) {
    super(StopPlaybackSchema);
  }

  async run(
    input: z.output<typeof StopPlaybackSchema>
  ): Promise<void | NotInVoiceChannelError | NotInBotVoiceChannelError | QueueEmptyError> {
    const { queues, services } = this.appContext;

    if (!input.voiceChannelId) return new NotInVoiceChannelError();

    const queue = queues.find(input.guildId);

    if (queue && queue.voiceChannelId !== input.voiceChannelId) {
      return new NotInBotVoiceChannelError();
    }

    if (!queue?.current) return new QueueEmptyError();

    queue.clear();
    services.voice.stop(input.guildId);
    services.voice.leave(input.guildId);
    queue.cancelIdleTimeout();
    queues.delete(input.guildId);
  }
}
