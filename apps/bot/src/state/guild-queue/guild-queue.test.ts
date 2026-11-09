import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TrackFixtures } from '@tests/fixtures/track.fixtures';

import { GuildQueue } from './guild-queue';

describe('GuildQueue', () => {
  let queue: GuildQueue;

  beforeEach(() => {
    queue = new GuildQueue();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('starts empty and idle', () => {
    expect(queue.current).toBeNull();
    expect(queue.upcoming).toEqual([]);
    expect(queue.status).toBe('idle');
    expect(queue.voiceChannelId).toBeNull();
  });

  test('adds the first track as current and returns position 0', () => {
    const position = queue.add(TrackFixtures.SongA);

    expect(position).toBe(0);
    expect(queue.current).toEqual({
      title: 'Never Gonna Give You Up',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      durationSeconds: 213,
      requestedBy: 'Rick'
    });
    expect(queue.upcoming).toEqual([]);
    expect(queue.status).toBe('playing');
  });

  test('adds the next tracks to the end of upcoming and returns their position', () => {
    queue.add(TrackFixtures.SongA);

    expect(queue.add(TrackFixtures.SongB)).toBe(1);
    expect(queue.add(TrackFixtures.SongC)).toBe(2);
    expect(queue.current?.title).toBe('Never Gonna Give You Up');
    expect(queue.upcoming.map(track => track.title)).toEqual(['Take On Me', 'Africa']);
  });

  test('moves the first upcoming track to current on next', () => {
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);
    queue.add(TrackFixtures.SongC);

    const next = queue.next();

    expect(next?.title).toBe('Take On Me');
    expect(queue.current?.title).toBe('Take On Me');
    expect(queue.upcoming.map(track => track.title)).toEqual(['Africa']);
    expect(queue.status).toBe('playing');
  });

  test('returns null and becomes idle on next at the end of the queue', () => {
    queue.add(TrackFixtures.SongA);

    const next = queue.next();

    expect(next).toBeNull();
    expect(queue.current).toBeNull();
    expect(queue.upcoming).toEqual([]);
    expect(queue.status).toBe('idle');
  });

  test('clears the current and upcoming tracks', () => {
    queue.add(TrackFixtures.SongA);
    queue.add(TrackFixtures.SongB);

    queue.clear();

    expect(queue.current).toBeNull();
    expect(queue.upcoming).toEqual([]);
    expect(queue.status).toBe('idle');
  });

  test('runs the idle timeout callback after the delay', () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    queue.startIdleTimeout(callback, 1000);
    vi.advanceTimersByTime(999);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledOnce();
  });

  test('cancels the idle timeout when a track is added', () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    queue.startIdleTimeout(callback, 1000);
    queue.add(TrackFixtures.SongA);
    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  test('cancels the idle timeout when cleared', () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    queue.startIdleTimeout(callback, 1000);
    queue.clear();
    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  test('replaces a running idle timeout when started again', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();

    queue.startIdleTimeout(first, 1000);
    queue.startIdleTimeout(second, 1000);
    vi.advanceTimersByTime(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
