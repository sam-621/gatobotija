import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Logger } from '@/services/logger';
import { TrackFixtures } from '@tests/fixtures/track.fixtures';

import { YtDlpAudioSource } from '../yt-dlp-audio-source';

import { YtDlpFixtures } from './fixtures/yt-dlp.fixtures';

const { spawn } = vi.hoisted(() => ({ spawn: vi.fn() }));

vi.mock('node:child_process', () => ({ spawn }));

class FakeChildProcess extends EventEmitter {
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  kill = vi.fn();
}

describe('YtDlpAudioSource', () => {
  let audio: YtDlpAudioSource;
  let logger: Logger;
  let children: FakeChildProcess[];

  beforeEach(() => {
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    audio = new YtDlpAudioSource(logger);
    children = [];
    spawn.mockImplementation(() => {
      const child = new FakeChildProcess();
      children.push(child);

      return child;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function finish(child: FakeChildProcess, code: number, stdout: string, stderr: string) {
    child.stdout.end(stdout);
    child.stderr.end(stderr);
    setImmediate(() => child.emit('close', code));
  }

  describe('resolve', () => {
    test('returns the title, url and rounded duration of the video', async () => {
      const result = audio.resolve(TrackFixtures.SongA.url);
      finish(children[0], 0, JSON.stringify(YtDlpFixtures.VideoInfo), '');

      await expect(result).resolves.toEqual({
        title: 'Never Gonna Give You Up',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationSeconds: 213
      });
      expect(spawn).toHaveBeenCalledWith(
        'yt-dlp',
        ['--dump-single-json', '--no-playlist', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );
    });

    test('returns a duration of 0 when the video has no duration', async () => {
      const result = audio.resolve(TrackFixtures.SongA.url);
      finish(children[0], 0, JSON.stringify(YtDlpFixtures.LiveInfo), '');

      await expect(result).resolves.toEqual({
        title: 'lofi hip hop radio',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationSeconds: 0
      });
    });

    test('returns null when the video is unavailable', async () => {
      const result = audio.resolve(TrackFixtures.SongA.url);
      finish(children[0], 1, '', YtDlpFixtures.UnavailableStderr);

      await expect(result).resolves.toBeNull();
    });

    test('returns null when the video is private', async () => {
      const result = audio.resolve(TrackFixtures.SongA.url);
      finish(children[0], 1, '', YtDlpFixtures.PrivateStderr);

      await expect(result).resolves.toBeNull();
    });

    test('throws AudioResolveFailedError when yt-dlp fails for another reason', async () => {
      const result = audio.resolve(TrackFixtures.SongA.url);
      finish(children[0], 1, '', YtDlpFixtures.NetworkStderr);

      await expect(result).rejects.toThrow(
        'yt-dlp failed resolving https://www.youtube.com/watch?v=dQw4w9WgXcQ: ERROR: Unable to download API page: <urlopen error [Errno 8] nodename nor servname>'
      );
    });

    test('throws AudioResolveFailedError when yt-dlp cannot be spawned', async () => {
      const result = audio.resolve(TrackFixtures.SongA.url);
      children[0].emit('error', new Error('spawn yt-dlp ENOENT'));

      await expect(result).rejects.toMatchObject({
        name: 'AudioResolveFailedError',
        message:
          'yt-dlp failed resolving https://www.youtube.com/watch?v=dQw4w9WgXcQ: spawn yt-dlp ENOENT'
      });
    });

    test('throws AudioResolveFailedError when the output is not valid JSON', async () => {
      const result = audio.resolve(TrackFixtures.SongA.url);
      finish(children[0], 0, YtDlpFixtures.InvalidJsonOutput, '');

      await expect(result).rejects.toMatchObject({ name: 'AudioResolveFailedError' });
    });

    test('throws AudioResolveFailedError when the output has no title', async () => {
      const result = audio.resolve(TrackFixtures.SongA.url);
      finish(children[0], 0, JSON.stringify(YtDlpFixtures.InfoWithoutTitle), '');

      await expect(result).rejects.toMatchObject({ name: 'AudioResolveFailedError' });
    });
  });

  describe('resolvePlaylist', () => {
    const playlistUrl = 'https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG';

    test('returns the title and the available tracks of the playlist in order', async () => {
      const result = audio.resolvePlaylist(playlistUrl, 100);
      finish(children[0], 0, JSON.stringify(YtDlpFixtures.PlaylistInfo), '');

      await expect(result).resolves.toEqual({
        title: '80s Hits',
        tracks: [
          {
            title: 'Never Gonna Give You Up',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 213
          },
          {
            title: 'Take On Me',
            url: 'https://www.youtube.com/watch?v=djV11Xbc914',
            durationSeconds: 0
          },
          {
            title: 'Africa',
            url: 'https://www.youtube.com/watch?v=FTQbiNvZqaY',
            durationSeconds: 295
          }
        ],
        truncated: false
      });
      expect(spawn).toHaveBeenCalledWith(
        'yt-dlp',
        [
          '--flat-playlist',
          '--dump-single-json',
          '--playlist-end',
          '101',
          'https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG'
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );
    });

    test('returns the first 100 tracks marked as truncated when the playlist has more', async () => {
      const result = audio.resolvePlaylist(playlistUrl, 100);
      finish(children[0], 0, JSON.stringify(YtDlpFixtures.LongPlaylistInfo), '');

      const playlist = await result;

      expect(playlist?.tracks).toHaveLength(100);
      expect(playlist?.tracks[99]).toEqual({
        title: 'Song 100',
        url: 'https://www.youtube.com/watch?v=song0000099',
        durationSeconds: 200
      });
      expect(playlist?.truncated).toBe(true);
    });

    test('drops unavailable entries among the first 100 without queuing the 101st', async () => {
      const result = audio.resolvePlaylist(playlistUrl, 100);
      finish(children[0], 0, JSON.stringify(YtDlpFixtures.LongPlaylistWithPrivateInfo), '');

      const playlist = await result;

      expect(playlist?.tracks).toHaveLength(99);
      expect(playlist?.tracks.map(track => track.title)).not.toContain('Song 101');
      expect(playlist?.truncated).toBe(true);
    });

    test('returns null when the playlist does not exist', async () => {
      const result = audio.resolvePlaylist(playlistUrl, 100);
      finish(children[0], 1, '', YtDlpFixtures.PlaylistNotFoundStderr);

      await expect(result).resolves.toBeNull();
    });

    test('returns null when the playlist is private', async () => {
      const result = audio.resolvePlaylist(playlistUrl, 100);
      finish(children[0], 1, '', YtDlpFixtures.PrivatePlaylistStderr);

      await expect(result).resolves.toBeNull();
    });

    test('throws AudioResolveFailedError when yt-dlp fails for another reason', async () => {
      const result = audio.resolvePlaylist(playlistUrl, 100);
      finish(children[0], 1, '', YtDlpFixtures.NetworkStderr);

      await expect(result).rejects.toThrow(
        'yt-dlp failed resolving https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG: ERROR: Unable to download API page: <urlopen error [Errno 8] nodename nor servname>'
      );
    });

    test('throws AudioResolveFailedError when the output is not valid JSON', async () => {
      const result = audio.resolvePlaylist(playlistUrl, 100);
      finish(children[0], 0, YtDlpFixtures.InvalidJsonOutput, '');

      await expect(result).rejects.toMatchObject({ name: 'AudioResolveFailedError' });
    });

    test('throws AudioResolveFailedError when the output has no title', async () => {
      const result = audio.resolvePlaylist(playlistUrl, 100);
      finish(children[0], 0, JSON.stringify(YtDlpFixtures.PlaylistWithoutTitle), '');

      await expect(result).rejects.toMatchObject({ name: 'AudioResolveFailedError' });
    });
  });

  describe('stream', () => {
    function spawnAll() {
      setImmediate(() => children.forEach(child => child.emit('spawn')));
    }

    test('returns the ffmpeg output fed by yt-dlp', async () => {
      const result = audio.stream(TrackFixtures.SongA);
      spawnAll();
      const output = await result;

      expect(output).toBe(children[1].stdout);
      expect(spawn).toHaveBeenNthCalledWith(
        1,
        'yt-dlp',
        [
          '-f',
          'bestaudio',
          '--no-playlist',
          '-o',
          '-',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );
      expect(spawn).toHaveBeenNthCalledWith(
        2,
        'ffmpeg',
        ['-loglevel', 'error', '-i', 'pipe:0', '-vn', '-c:a', 'libopus', '-f', 'ogg', 'pipe:1'],
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );

      const received: Buffer[] = [];
      children[1].stdin.on('data', (chunk: Buffer) => received.push(chunk));
      children[0].stdout.write('audio');
      await new Promise(resolve => setImmediate(resolve));

      expect(Buffer.concat(received).toString()).toBe('audio');
    });

    test('kills both processes when the output closes', async () => {
      const result = audio.stream(TrackFixtures.SongA);
      spawnAll();
      const output = await result;

      output.destroy();
      await new Promise(resolve => setImmediate(resolve));

      expect(children[0].kill).toHaveBeenCalled();
      expect(children[1].kill).toHaveBeenCalled();
    });

    test('destroys the output with AudioStreamFailedError when yt-dlp exits with an error', async () => {
      const result = audio.stream(TrackFixtures.SongA);
      spawnAll();
      const output = await result;
      const errors: Error[] = [];
      output.on('error', error => errors.push(error));

      children[0].stderr.write(YtDlpFixtures.ForbiddenStderr);
      await new Promise(resolve => setImmediate(resolve));
      children[0].emit('close', 1);
      await new Promise(resolve => setImmediate(resolve));

      expect(logger.warn).toHaveBeenCalledWith('Audio stream closed with an error', {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        reason:
          'Audio stream failed for https://www.youtube.com/watch?v=dQw4w9WgXcQ: yt-dlp exited with code 1: ERROR: HTTP Error 403: Forbidden'
      });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        name: 'AudioStreamFailedError',
        message:
          'Audio stream failed for https://www.youtube.com/watch?v=dQw4w9WgXcQ: yt-dlp exited with code 1: ERROR: HTTP Error 403: Forbidden'
      });
    });

    test('logs a late stream error without throwing when nobody listens to the output', async () => {
      const result = audio.stream(TrackFixtures.SongA);
      spawnAll();
      await result;

      children[1].emit('close', 1);
      await new Promise(resolve => setImmediate(resolve));

      expect(logger.warn).toHaveBeenCalledWith(
        'Audio stream closed with an error',
        expect.objectContaining({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
      );
    });

    test('throws AudioStreamFailedError and kills both processes when one cannot be spawned', async () => {
      const result = audio.stream(TrackFixtures.SongA);
      setImmediate(() => {
        children[0].emit('spawn');
        children[1].emit('error', new Error('spawn ffmpeg ENOENT'));
      });

      await expect(result).rejects.toMatchObject({
        name: 'AudioStreamFailedError',
        message:
          'Audio stream failed for https://www.youtube.com/watch?v=dQw4w9WgXcQ: spawn ffmpeg ENOENT'
      });
      expect(children[0].kill).toHaveBeenCalled();
      expect(children[1].kill).toHaveBeenCalled();
    });
  });
});
