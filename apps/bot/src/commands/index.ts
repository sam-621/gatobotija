import type { Command } from './command';
import { PauseCommand } from './pause-command';
import { PingCommand } from './ping-command';
import { PlayCommand } from './play-command';
import { ResumeCommand } from './resume-command';
import { SkipCommand } from './skip-command';
import { StopCommand } from './stop-command';

export const commands: Command[] = [
  PingCommand,
  PlayCommand,
  SkipCommand,
  PauseCommand,
  ResumeCommand,
  StopCommand
];
