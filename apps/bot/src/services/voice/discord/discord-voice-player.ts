import type { Readable } from 'node:stream';
import {
  type AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  StreamType,
  type VoiceConnection,
  VoiceConnectionStatus
} from '@discordjs/voice';
import { type Client, Events, type VoiceState } from 'discord.js';

import type { Logger } from '@/services/logger';

import { VoiceConnectionFailedError, VoiceNotConnectedError } from '../voice-errors';
import type { VoicePlayer } from '../voice-player';

interface GuildVoice {
  channelId: string;
  connection: VoiceConnection;
  player: AudioPlayer;
}

export class DiscordVoicePlayer implements VoicePlayer {
  private static readonly CONNECT_TIMEOUT_MS = 20_000;
  private static readonly RECONNECT_TIMEOUT_MS = 5_000;
  private readonly guilds = new Map<string, GuildVoice>();
  private readonly idleCallbacks = new Map<string, () => void>();
  private readonly disconnectCallbacks = new Map<string, () => void>();
  private readonly channelChangeCallbacks = new Map<string, (channelId: string) => void>();

  constructor(
    private readonly client: Client,
    private readonly logger: Logger
  ) {
    client.on(Events.VoiceStateUpdate, (_oldState, newState) => this.trackMove(newState));
  }

  async join(guildId: string, channelId: string) {
    const existing = this.guilds.get(guildId);

    if (existing?.channelId === channelId) return;

    const guild = this.client.guilds.cache.get(guildId);

    if (!guild) throw new VoiceConnectionFailedError(guildId, channelId, 'guild is not cached');

    const connection = joinVoiceChannel({
      guildId,
      channelId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true
    });

    try {
      await entersState(
        connection,
        VoiceConnectionStatus.Ready,
        DiscordVoicePlayer.CONNECT_TIMEOUT_MS
      );
    } catch (error) {
      if (existing) this.leave(guildId);
      else connection.destroy();

      throw new VoiceConnectionFailedError(
        guildId,
        channelId,
        error instanceof Error ? error.message : String(error)
      );
    }

    if (existing) {
      existing.channelId = channelId;

      return;
    }

    const player = createAudioPlayer();
    player.on(AudioPlayerStatus.Idle, () => this.idleCallbacks.get(guildId)?.());
    player.on('error', error => this.logger.error('Audio player failed', error, { guildId }));
    connection.subscribe(player);
    connection.on(VoiceConnectionStatus.Disconnected, () => void this.recover(guildId, connection));
    connection.on(VoiceConnectionStatus.Destroyed, () => this.drop(guildId, connection));
    this.guilds.set(guildId, { channelId, connection, player });
  }

  play(guildId: string, stream: Readable) {
    const voice = this.guilds.get(guildId);

    if (!voice) throw new VoiceNotConnectedError(guildId);

    voice.player.play(createAudioResource(stream, { inputType: StreamType.OggOpus }));
  }

  leave(guildId: string) {
    this.idleCallbacks.delete(guildId);
    this.disconnectCallbacks.delete(guildId);
    this.channelChangeCallbacks.delete(guildId);

    const voice = this.guilds.get(guildId);

    if (!voice) return;

    this.guilds.delete(guildId);
    voice.player.stop(true);

    if (voice.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      voice.connection.destroy();
    }
  }

  onIdle(guildId: string, callback: () => void) {
    this.idleCallbacks.set(guildId, callback);
  }

  onDisconnect(guildId: string, callback: () => void) {
    this.disconnectCallbacks.set(guildId, callback);
  }

  onChannelChange(guildId: string, callback: (channelId: string) => void) {
    this.channelChangeCallbacks.set(guildId, callback);
  }

  private trackMove(state: VoiceState) {
    if (state.id !== this.client.user?.id || !state.channelId) return;

    const voice = this.guilds.get(state.guild.id);

    if (!voice || voice.channelId === state.channelId) return;

    voice.channelId = state.channelId;
    this.channelChangeCallbacks.get(state.guild.id)?.(state.channelId);
  }

  private async recover(guildId: string, connection: VoiceConnection) {
    try {
      await Promise.race([
        entersState(
          connection,
          VoiceConnectionStatus.Signalling,
          DiscordVoicePlayer.RECONNECT_TIMEOUT_MS
        ),
        entersState(
          connection,
          VoiceConnectionStatus.Connecting,
          DiscordVoicePlayer.RECONNECT_TIMEOUT_MS
        )
      ]);
    } catch {
      this.drop(guildId, connection);
    }
  }

  private drop(guildId: string, connection: VoiceConnection) {
    if (this.guilds.get(guildId)?.connection !== connection) return;

    const callback = this.disconnectCallbacks.get(guildId);

    this.leave(guildId);
    callback?.();
  }
}
