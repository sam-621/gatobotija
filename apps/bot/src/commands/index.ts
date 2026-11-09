import type { Command } from './command';
import { PingCommand } from './ping-command';
import { PlayCommand } from './play-command';

export const commands: Command[] = [PingCommand, PlayCommand];
