import { z } from 'zod';

import type { AppContext } from '@/context';
import {
  NotInBotVoiceChannelError,
  NotInVoiceChannelError,
  QueueEmptyError
} from '@/modules/music/music-errors';
import { QueueAdvancer } from '@/modules/music/use-cases/queue-advancer';
import { InvalidInputError } from '@/shared/errors/invalid-input-error';
import type { Track } from '@/shared/types/track';
import { UseCase } from '@/shared/use-case';

const SkipTrackSchema = z.object({
  guildId: z.string().min(1),
  voiceChannelId: z.string().min(1).nullable()
});

export class TrackSkipper extends UseCase<typeof SkipTrackSchema> {
  constructor(private readonly appContext: AppContext) {
    super(SkipTrackSchema);
  }

  async run(
    input: z.output<typeof SkipTrackSchema>
  ): Promise<
    | Track
    | null
    | NotInVoiceChannelError
    | NotInBotVoiceChannelError
    | QueueEmptyError
    | InvalidInputError
  > {
    const { queues, services } = this.appContext;

    if (!input.voiceChannelId) return new NotInVoiceChannelError();

    const queue = queues.find(input.guildId);

    if (queue && queue.voiceChannelId !== input.voiceChannelId) {
      return new NotInBotVoiceChannelError();
    }

    if (!queue?.current) return new QueueEmptyError();

    const next = await new QueueAdvancer(this.appContext).execute({ guildId: input.guildId });

    if (next instanceof InvalidInputError) return next;

    if (!next) services.voice.stop(input.guildId);

    return next;
  }
}
