import { AppError } from '@/shared/errors/app-error';

export class AudioResolveFailedError extends AppError {
  constructor(url: string, reason: string) {
    super(`yt-dlp failed resolving ${url}: ${reason}`);
  }
}

export class AudioStreamFailedError extends AppError {
  constructor(url: string, reason: string) {
    super(`Audio stream failed for ${url}: ${reason}`);
  }
}
