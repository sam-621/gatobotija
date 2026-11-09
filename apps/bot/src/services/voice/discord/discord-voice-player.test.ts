import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { Client } from 'discord.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Logger } from '@/services/logger';

import { DiscordVoicePlayer } from './discord-voice-player';

const voice = vi.hoisted(() => ({
  joinVoiceChannel: vi.fn(),
  entersState: vi.fn(),
  createAudioPlayer: vi.fn(),
  createAudioResource: vi.fn()
}));

vi.mock('@discordjs/voice', () => ({
  ...voice,
  AudioPlayerStatus: { Idle: 'idle' },
  VoiceConnectionStatus: {
    Ready: 'ready',
    Signalling: 'signalling',
    Connecting: 'connecting',
    Disconnected: 'disconnected',
    Destroyed: 'destroyed'
  },
  StreamType: { OggOpus: 'ogg/opus' }
}));

class FakeAudioPlayer extends EventEmitter {
  play = vi.fn();
  stop = vi.fn();
}

class FakeVoiceConnection extends EventEmitter {
  state = { status: 'ready' };
  subscribe = vi.fn();
  destroy = vi.fn(() => {
    this.state = { status: 'destroyed' };
  });
}

describe('DiscordVoicePlayer', () => {
  const guildId = '200000000000000002';
  const adapterCreator = vi.fn();
  let logger: Logger;
  let player: FakeAudioPlayer;
  let connection: FakeVoiceConnection;
  let voicePlayer: DiscordVoicePlayer;
  let client: EventEmitter;

  beforeEach(() => {
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    player = new FakeAudioPlayer();
    connection = new FakeVoiceConnection();
    voice.joinVoiceChannel.mockReturnValue(connection);
    voice.entersState.mockResolvedValue(connection);
    voice.createAudioPlayer.mockReturnValue(player);
    voice.createAudioResource.mockReturnValue({ resource: true });
    client = Object.assign(new EventEmitter(), {
      user: { id: '100000000000000001' },
      guilds: { cache: new Map([[guildId, { voiceAdapterCreator: adapterCreator }]]) }
    });
    voicePlayer = new DiscordVoicePlayer(client as unknown as Client, logger);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('joins the voice channel and subscribes a new audio player', async () => {
    await voicePlayer.join(guildId, '300000000000000003');

    expect(voice.joinVoiceChannel).toHaveBeenCalledWith({
      guildId: '200000000000000002',
      channelId: '300000000000000003',
      adapterCreator,
      selfDeaf: true
    });
    expect(voice.entersState).toHaveBeenCalledWith(connection, 'ready', 20_000);
    expect(connection.subscribe).toHaveBeenCalledWith(player);
  });

  test('does not join again when already in the same channel', async () => {
    await voicePlayer.join(guildId, '300000000000000003');
    await voicePlayer.join(guildId, '300000000000000003');

    expect(voice.joinVoiceChannel).toHaveBeenCalledOnce();
  });

  test('moves to another channel keeping the same audio player', async () => {
    await voicePlayer.join(guildId, '300000000000000003');
    await voicePlayer.join(guildId, '400000000000000004');

    expect(voice.joinVoiceChannel).toHaveBeenLastCalledWith(
      expect.objectContaining({ channelId: '400000000000000004' })
    );
    expect(voice.createAudioPlayer).toHaveBeenCalledOnce();
  });

  test('plays the stream as an ogg opus resource', async () => {
    const stream = new PassThrough();
    await voicePlayer.join(guildId, '300000000000000003');

    voicePlayer.play(guildId, stream);

    expect(voice.createAudioResource).toHaveBeenCalledWith(stream, { inputType: 'ogg/opus' });
    expect(player.play).toHaveBeenCalledWith({ resource: true });
  });

  test('calls the idle callback when the audio player becomes idle', async () => {
    const callback = vi.fn();
    await voicePlayer.join(guildId, '300000000000000003');
    voicePlayer.onIdle(guildId, callback);

    player.emit('idle');

    expect(callback).toHaveBeenCalledOnce();
  });

  test('logs the audio player errors', async () => {
    await voicePlayer.join(guildId, '300000000000000003');
    const error = new Error('stream broke');

    player.emit('error', error);

    expect(logger.error).toHaveBeenCalledWith('Audio player failed', error, {
      guildId: '200000000000000002'
    });
  });

  test('leaves the channel without calling the idle callback', async () => {
    const callback = vi.fn();
    await voicePlayer.join(guildId, '300000000000000003');
    voicePlayer.onIdle(guildId, callback);
    player.stop.mockImplementation(() => player.emit('idle'));

    voicePlayer.leave(guildId);

    expect(player.stop).toHaveBeenCalledWith(true);
    expect(connection.destroy).toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });

  test('keeps the connection when it reconnects after a disconnect', async () => {
    const callback = vi.fn();
    await voicePlayer.join(guildId, '300000000000000003');
    voicePlayer.onDisconnect(guildId, callback);
    voice.entersState.mockReset();
    voice.entersState.mockResolvedValueOnce(connection).mockReturnValueOnce(new Promise(() => {}));

    connection.emit('disconnected');
    await new Promise(resolve => setImmediate(resolve));

    expect(voice.entersState).toHaveBeenCalledWith(connection, 'signalling', 5_000);
    expect(voice.entersState).toHaveBeenCalledWith(connection, 'connecting', 5_000);
    expect(connection.destroy).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });

  test('cleans up and calls the disconnect callback when it does not reconnect', async () => {
    const callback = vi.fn();
    await voicePlayer.join(guildId, '300000000000000003');
    voicePlayer.onDisconnect(guildId, callback);
    voice.entersState
      .mockRejectedValueOnce(new Error('The operation was aborted'))
      .mockRejectedValueOnce(new Error('The operation was aborted'));

    connection.emit('disconnected');
    await new Promise(resolve => setImmediate(resolve));

    expect(connection.destroy).toHaveBeenCalledOnce();
    expect(player.stop).toHaveBeenCalledWith(true);
    expect(callback).toHaveBeenCalledOnce();

    await voicePlayer.join(guildId, '300000000000000003');

    expect(voice.joinVoiceChannel).toHaveBeenCalledTimes(2);
  });

  test('cleans up and calls the disconnect callback when the connection is destroyed elsewhere', async () => {
    const callback = vi.fn();
    await voicePlayer.join(guildId, '300000000000000003');
    voicePlayer.onDisconnect(guildId, callback);

    connection.state = { status: 'destroyed' };
    connection.emit('destroyed');

    expect(connection.destroy).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledOnce();
    expect(() => voicePlayer.play(guildId, new PassThrough())).toThrow(
      'Not connected to a voice channel in guild 200000000000000002'
    );
  });

  test('does not call the disconnect callback when leaving on purpose', async () => {
    const callback = vi.fn();
    await voicePlayer.join(guildId, '300000000000000003');
    voicePlayer.onDisconnect(guildId, callback);
    connection.destroy.mockImplementation(() => connection.emit('destroyed'));

    voicePlayer.leave(guildId);

    expect(callback).not.toHaveBeenCalled();
  });

  test('calls the channel change callback when the bot is moved to another channel', async () => {
    const callback = vi.fn();
    await voicePlayer.join(guildId, '300000000000000003');
    voicePlayer.onChannelChange(guildId, callback);

    client.emit(
      'voiceStateUpdate',
      {},
      {
        id: '100000000000000001',
        channelId: '400000000000000004',
        guild: { id: guildId }
      }
    );
    await voicePlayer.join(guildId, '400000000000000004');

    expect(callback).toHaveBeenCalledWith('400000000000000004');
    expect(voice.joinVoiceChannel).toHaveBeenCalledOnce();
  });

  test('does not call the channel change callback for other members or the same channel', async () => {
    const callback = vi.fn();
    await voicePlayer.join(guildId, '300000000000000003');
    voicePlayer.onChannelChange(guildId, callback);

    client.emit(
      'voiceStateUpdate',
      {},
      {
        id: '500000000000000005',
        channelId: '400000000000000004',
        guild: { id: guildId }
      }
    );
    client.emit(
      'voiceStateUpdate',
      {},
      {
        id: '100000000000000001',
        channelId: '300000000000000003',
        guild: { id: guildId }
      }
    );

    expect(callback).not.toHaveBeenCalled();
  });

  test('does nothing when leaving a guild without connection', () => {
    voicePlayer.leave(guildId);

    expect(connection.destroy).not.toHaveBeenCalled();
  });

  test('throws VoiceConnectionFailedError and destroys the connection when it does not get ready', async () => {
    voice.entersState.mockRejectedValue(new Error('The operation was aborted'));

    await expect(voicePlayer.join(guildId, '300000000000000003')).rejects.toMatchObject({
      name: 'VoiceConnectionFailedError',
      message:
        'Failed to join voice channel 300000000000000003 in guild 200000000000000002: The operation was aborted'
    });
    expect(connection.destroy).toHaveBeenCalledOnce();
  });

  test('throws VoiceConnectionFailedError when the guild is not cached', async () => {
    await expect(
      voicePlayer.join('999999999999999999', '300000000000000003')
    ).rejects.toMatchObject({ name: 'VoiceConnectionFailedError' });
    expect(voice.joinVoiceChannel).not.toHaveBeenCalled();
  });

  test('throws VoiceNotConnectedError when playing without joining', () => {
    expect(() => voicePlayer.play(guildId, new PassThrough())).toThrow(
      'Not connected to a voice channel in guild 200000000000000002'
    );
  });
});
