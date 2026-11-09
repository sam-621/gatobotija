import { z } from 'zod';

import type { AppContext } from '@/context';
import { UseCase } from '@/shared/use-case';

const ReleaseQueueSchema = z.object({
  guildId: z.string().min(1)
});

export class QueueReleaser extends UseCase<typeof ReleaseQueueSchema> {
  constructor(private readonly appContext: AppContext) {
    super(ReleaseQueueSchema);
  }

  async run(input: z.output<typeof ReleaseQueueSchema>): Promise<void> {
    const { queues, services } = this.appContext;

    services.voice.leave(input.guildId);
    queues.delete(input.guildId);
  }
}
