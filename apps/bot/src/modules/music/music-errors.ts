import { BusinessError } from '@/shared/errors/business-error';

export const MusicErrorCode = {
  NotInVoiceChannel: 'NOT_IN_VOICE_CHANNEL',
  InvalidYoutubeUrl: 'INVALID_YOUTUBE_URL',
  DifferentVoiceChannel: 'DIFFERENT_VOICE_CHANNEL',
  TrackNotFound: 'TRACK_NOT_FOUND',
  PlaylistNotFound: 'PLAYLIST_NOT_FOUND',
  QueueEmpty: 'QUEUE_EMPTY',
  AlreadyPaused: 'ALREADY_PAUSED',
  NotPaused: 'NOT_PAUSED',
  NotInBotVoiceChannel: 'NOT_IN_BOT_VOICE_CHANNEL'
} as const;

export type MusicErrorCode = (typeof MusicErrorCode)[keyof typeof MusicErrorCode];

export class NotInVoiceChannelError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('NOT_IN_VOICE_CHANNEL', 'You need to be in a voice channel.');
  }
}

export class InvalidYoutubeUrlError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('INVALID_YOUTUBE_URL', 'Only YouTube video or playlist links are supported.');
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

export class PlaylistNotFoundError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('PLAYLIST_NOT_FOUND', 'That playlist is not available.');
  }
}

export class QueueEmptyError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('QUEUE_EMPTY', 'Nothing is playing.');
  }
}

export class AlreadyPausedError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('ALREADY_PAUSED', 'Already paused.');
  }
}

export class NotPausedError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('NOT_PAUSED', 'Nothing is paused.');
  }
}

export class NotInBotVoiceChannelError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('NOT_IN_BOT_VOICE_CHANNEL', 'You need to be in my voice channel.');
  }
}
