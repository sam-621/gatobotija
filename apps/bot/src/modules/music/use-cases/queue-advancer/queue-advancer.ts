import type { Readable } from 'node:stream';
import { z } from 'zod';

import type { AppContext } from '@/context';
import { QueueReleaser } from '@/modules/music/use-cases/queue-releaser';
import type { Track } from '@/shared/types/track';
import { UseCase } from '@/shared/use-case';
import type { GuildQueue } from '@/state/guild-queue';

const AdvanceQueueSchema = z.object({
  guildId: z.string().min(1)
});

export class QueueAdvancer extends UseCase<typeof AdvanceQueueSchema> {
  private static readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000;

  constructor(private readonly appContext: AppContext) {
    super(AdvanceQueueSchema);
  }

  async run(input: z.output<typeof AdvanceQueueSchema>): Promise<Track | null> {
    const { queues, services } = this.appContext;
    const queue = queues.find(input.guildId);

    if (!queue) return null;

    let next = queue.next();

    while (next) {
      let stream: Readable | null = null;

      try {
        stream = await services.audio.stream(next);

        if (queues.find(input.guildId) !== queue) {
          stream.destroy();

          return null;
        }

        services.voice.play(input.guildId, stream);

        return next;
      } catch (error) {
        stream?.destroy();
        services.logger.error('Failed to play track, skipping it', error, {
          guildId: input.guildId,
          url: next.url
        });

        if (queues.find(input.guildId) !== queue) return null;

        next = queue.next();
      }
    }

    this.scheduleLeave(input.guildId, queue);

    return null;
  }

  private scheduleLeave(guildId: string, queue: GuildQueue) {
    const { queues, services } = this.appContext;

    queue.startIdleTimeout(() => {
      if (queues.find(guildId) !== queue) return;

      new QueueReleaser(this.appContext)
        .execute({ guildId })
        .catch(error => services.logger.error('Failed to release the queue', error, { guildId }));
    }, QueueAdvancer.IDLE_TIMEOUT_MS);
  }
}
