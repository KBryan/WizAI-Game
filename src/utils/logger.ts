import { GameConfig } from '../config/GameConfig';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private enabled: boolean;
  private logLevel: LogLevel;

  constructor(enabled?: boolean, logLevel?: LogLevel) {
    this.enabled = enabled ?? GameConfig.debug.enabled;
    this.logLevel = logLevel ?? GameConfig.debug.logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.logLevel];
  }

  private prefix(): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [WizAI]`;
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.prefix(), ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(this.prefix(), ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.prefix(), ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.prefix(), ...args);
    }
  }
}

export const logger = new Logger();
export default logger;
