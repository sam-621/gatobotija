import { type ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream';
import { z } from 'zod';

import type { Logger } from '@/services/logger';
import type { Track } from '@/shared/types/track';

import { AudioResolveFailedError, AudioStreamFailedError } from '../audio-errors';
import type { AudioSource, ResolvedPlaylist, ResolvedTrack } from '../audio-source';

interface ProcessOutput {
  code: number | null;
  stdout: string;
  stderr: string;
}

export class YtDlpAudioSource implements AudioSource {
  private static readonly UNAVAILABLE_PATTERN =
    /video unavailable|private video|has been removed|is not available|confirm your age|members-only|does not exist/i;

  private static readonly PLAYLIST_UNAVAILABLE_PATTERN =
    /does not exist|playlist is private|playlist is unavailable|unviewable/i;

  private static readonly UNAVAILABLE_ENTRY_TITLES = ['[Private video]', '[Deleted video]'];

  private static readonly AVAILABLE_ENTRY_STATES = ['public', 'unlisted'];

  private static readonly ParseVideoInfoSchema = z.object({
    title: z.string(),
    duration: z.number().nullish()
  });

  private static readonly ParsePlaylistInfoSchema = z.object({
    title: z.string(),
    entries: z.array(
      z.object({
        id: z.string().nullish(),
        title: z.string().nullish(),
        duration: z.number().nullish(),
        availability: z.string().nullish()
      })
    )
  });

  constructor(private readonly logger: Logger) {}

  async resolve(url: string): Promise<ResolvedTrack | null> {
    const output = await this.collect(url, ['--dump-single-json', '--no-playlist', url]);

    if (output.code !== 0) {
      if (YtDlpAudioSource.UNAVAILABLE_PATTERN.test(output.stderr)) return null;

      throw new AudioResolveFailedError(url, output.stderr.trim() || `exit code ${output.code}`);
    }

    const info = YtDlpAudioSource.ParseVideoInfoSchema.safeParse(
      this.parseJson(url, output.stdout)
    );

    if (!info.success) throw new AudioResolveFailedError(url, z.prettifyError(info.error));

    return { title: info.data.title, url, durationSeconds: Math.round(info.data.duration ?? 0) };
  }

  async resolvePlaylist(url: string, limit: number): Promise<ResolvedPlaylist | null> {
    const output = await this.collect(url, [
      '--flat-playlist',
      '--dump-single-json',
      '--playlist-end',
      String(limit + 1),
      url
    ]);

    if (output.code !== 0) {
      if (YtDlpAudioSource.PLAYLIST_UNAVAILABLE_PATTERN.test(output.stderr)) return null;

      throw new AudioResolveFailedError(url, output.stderr.trim() || `exit code ${output.code}`);
    }

    const info = YtDlpAudioSource.ParsePlaylistInfoSchema.safeParse(
      this.parseJson(url, output.stdout)
    );

    if (!info.success) throw new AudioResolveFailedError(url, z.prettifyError(info.error));

    const tracks = info.data.entries.slice(0, limit).flatMap(entry => {
      if (!entry.id || !entry.title || !this.isAvailable(entry.title, entry.availability)) {
        return [];
      }

      return [
        {
          title: entry.title,
          url: `https://www.youtube.com/watch?v=${entry.id}`,
          durationSeconds: Math.round(entry.duration ?? 0)
        }
      ];
    });

    return {
      title: info.data.title,
      tracks,
      truncated: info.data.entries.length > limit
    };
  }

  async stream(track: Track): Promise<Readable> {
    const ytDlp = spawn('yt-dlp', ['-f', 'bestaudio', '--no-playlist', '-o', '-', track.url], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const ffmpeg = spawn(
      'ffmpeg',
      ['-loglevel', 'error', '-i', 'pipe:0', '-vn', '-c:a', 'libopus', '-f', 'ogg', 'pipe:1'],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const output = ffmpeg.stdout as Readable;
    let started = false;
    const fail = (reason: string) => {
      if (!started || output.destroyed || output.readableEnded) return;

      output.destroy(new AudioStreamFailedError(track.url, reason));
    };

    output.on('error', error =>
      this.logger.warn('Audio stream closed with an error', {
        url: track.url,
        reason: error.message
      })
    );
    this.watch('yt-dlp', ytDlp, fail);
    this.watch('ffmpeg', ffmpeg, fail);

    try {
      await Promise.all([once(ytDlp, 'spawn'), once(ffmpeg, 'spawn')]);
    } catch (error) {
      ytDlp.kill();
      ffmpeg.kill();
      throw new AudioStreamFailedError(track.url, this.describe(error));
    }

    started = true;

    pipeline(ytDlp.stdout as Readable, ffmpeg.stdin as NodeJS.WritableStream, error => {
      if (error) fail(`pipe from yt-dlp to ffmpeg broke: ${error.message}`);
    });

    output.once('close', () => {
      ytDlp.kill();
      ffmpeg.kill();
    });

    return output;
  }

  private isAvailable(title: string, availability: string | null | undefined): boolean {
    if (YtDlpAudioSource.UNAVAILABLE_ENTRY_TITLES.includes(title)) return false;

    return !availability || YtDlpAudioSource.AVAILABLE_ENTRY_STATES.includes(availability);
  }

  private watch(name: string, child: ChildProcess, fail: (reason: string) => void) {
    let stderr = '';

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-1000);
    });
    child.on('error', error => fail(`${name} failed: ${error.message}`));
    child.on('close', code => {
      if (code !== null && code !== 0) fail(`${name} exited with code ${code}: ${stderr.trim()}`);
    });
  }

  private collect(url: string, args: string[]): Promise<ProcessOutput> {
    return new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('error', error => reject(new AudioResolveFailedError(url, error.message)));
      child.on('close', code => resolve({ code, stdout, stderr }));
    });
  }

  private parseJson(url: string, text: string): unknown {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new AudioResolveFailedError(url, `invalid JSON output: ${this.describe(error)}`);
    }
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
