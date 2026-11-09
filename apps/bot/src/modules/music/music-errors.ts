import { BusinessError } from '@/shared/errors/business-error';

export const MusicErrorCode = {
  NotInVoiceChannel: 'NOT_IN_VOICE_CHANNEL',
  InvalidYoutubeUrl: 'INVALID_YOUTUBE_URL',
  DifferentVoiceChannel: 'DIFFERENT_VOICE_CHANNEL',
  TrackNotFound: 'TRACK_NOT_FOUND'
} as const;

export type MusicErrorCode = (typeof MusicErrorCode)[keyof typeof MusicErrorCode];

export class NotInVoiceChannelError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('NOT_IN_VOICE_CHANNEL', 'You need to be in a voice channel.');
  }
}

export class InvalidYoutubeUrlError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('INVALID_YOUTUBE_URL', 'Only YouTube video links are supported.');
  }
}

export class DifferentVoiceChannelError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('DIFFERENT_VOICE_CHANNEL', "I'm already playing in another voice channel.");
  }
}

export class TrackNotFoundError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('TRACK_NOT_FOUND', 'That video is not available.');
  }
}
