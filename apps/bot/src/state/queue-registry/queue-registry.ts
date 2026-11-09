import { GuildQueue } from '@/state/guild-queue';

export class QueueRegistry {
  private readonly queues = new Map<string, GuildQueue>();

  get(guildId: string): GuildQueue {
    const existing = this.queues.get(guildId);

    if (existing) return existing;

    const queue = new GuildQueue();
    this.queues.set(guildId, queue);

    return queue;
  }

  find(guildId: string): GuildQueue | null {
    return this.queues.get(guildId) ?? null;
  }

  delete(guildId: string) {
    this.queues.get(guildId)?.clear();
    this.queues.delete(guildId);
  }

  guildIds(): string[] {
    return [...this.queues.keys()];
  }
}
