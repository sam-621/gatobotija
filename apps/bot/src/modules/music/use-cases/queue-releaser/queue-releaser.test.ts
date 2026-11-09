import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TrackFixtures } from '@tests/fixtures/track.fixtures';
import { createTestAppContext, type TestAppContext } from '@tests/utils/app-context';

import { QueueReleaser } from './queue-releaser';

describe('QueueReleaser', () => {
  let appContext: TestAppContext;
  let queueReleaser: QueueReleaser;

  beforeEach(() => {
    appContext = createTestAppContext();
    queueReleaser = new QueueReleaser(appContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('leaves the voice channel and deletes the queue of the guild', async () => {
    appContext.queues.get('200000000000000002').add(TrackFixtures.SongA);
    appContext.queues.get('300000000000000003').add(TrackFixtures.SongB);

    await queueReleaser.execute({ guildId: '200000000000000002' });

    expect(appContext.services.voice.leaves).toEqual(['200000000000000002']);
    expect(appContext.queues.guildIds()).toEqual(['300000000000000003']);
  });
});
