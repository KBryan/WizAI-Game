import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../logger';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints messages at or above the current level', () => {
    const logger = new Logger(true, 'info');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('suppresses messages below the current level', () => {
    const logger = new Logger(true, 'warn');
    logger.debug('debug message');
    logger.info('info message');

    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('suppresses all output when enabled is false', () => {
    const logger = new Logger(false, 'debug');
    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('uses console.warn for warn level', () => {
    const logger = new Logger(true, 'warn');
    logger.warn('warning');

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('uses console.error for error level', () => {
    const logger = new Logger(true, 'error');
    logger.error('error');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('prefixes output with timestamp and [WizAI] tag', () => {
    const logger = new Logger(true, 'debug');
    logger.info('test');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleLogSpy.mock.calls[0] as string[];
    expect(callArgs[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WizAI\]$/);
    expect(callArgs[1]).toBe('test');
  });
});
