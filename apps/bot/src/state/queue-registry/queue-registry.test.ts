import { beforeEach, describe, expect, test } from 'vitest';

import { TrackFixtures } from '@tests/fixtures/track.fixtures';

import { QueueRegistry } from './queue-registry';

describe('QueueRegistry', () => {
  let queues: QueueRegistry;

  beforeEach(() => {
    queues = new QueueRegistry();
  });

  test('creates an empty queue the first time a guild is requested', () => {
    const queue = queues.get('200000000000000002');

    expect(queue.current).toBeNull();
    expect(queues.guildIds()).toEqual(['200000000000000002']);
  });

  test('returns the same queue for the same guild', () => {
    const queue = queues.get('200000000000000002');
    queue.add(TrackFixtures.SongA);

    expect(queues.get('200000000000000002')).toBe(queue);
  });

  test('keeps a separate queue per guild', () => {
    queues.get('200000000000000002').add(TrackFixtures.SongA);

    expect(queues.get('300000000000000003').current).toBeNull();
  });

  test('finds an existing queue without creating one', () => {
    const queue = queues.get('200000000000000002');

    expect(queues.find('200000000000000002')).toBe(queue);
    expect(queues.find('300000000000000003')).toBeNull();
    expect(queues.guildIds()).toEqual(['200000000000000002']);
  });

  test('deletes the queue of a guild and clears it', () => {
    const queue = queues.get('200000000000000002');
    queue.add(TrackFixtures.SongA);

    queues.delete('200000000000000002');

    expect(queue.current).toBeNull();
    expect(queues.guildIds()).toEqual([]);
    expect(queues.get('200000000000000002')).not.toBe(queue);
  });
});
