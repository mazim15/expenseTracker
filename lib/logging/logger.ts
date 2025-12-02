/* eslint-disable @typescript-eslint/no-explicit-any */
import { LogLevel, LogCategory, LogEntry, LoggerConfig, LogMetadata } from './types';

class Logger {
  private config: LoggerConfig;
  private context: Record<string, any> = {};

  constructor(config: LoggerConfig) {
    this.config = config;
    this.context = config.context || {};
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const configLevelIndex = levels.indexOf(this.config.level);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= configLevelIndex;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createLogEntry(
    level: LogLevel,
    category: LogCategory,
    action: string,
    message: string,
    details: Record<string, any> = {},
    metadata: LogMetadata = {}
  ): Promise<LogEntry> {
    return {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      action,
      message,
      userId: this.context.userId,
      details: {
        ...details,
        context: this.context
      },
      metadata: {
        ...metadata,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      }
    };
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    // Console logging
    if (this.config.enableConsole) {
      const consoleMethod = entry.level === 'ERROR' ? 'error' :
                           entry.level === 'WARN' ? 'warn' :
                           entry.level === 'DEBUG' ? 'debug' : 'info';
      
      console[consoleMethod](`[${entry.level}] ${entry.category}: ${entry.action}`, {
        message: entry.message,
        details: entry.details,
        metadata: entry.metadata
      });
    }

    // Storage logging
    if (this.config.enableStorage && this.config.adapter) {
      try {
        await this.config.adapter.write(entry);
      } catch (error) {
        console.error('Failed to write log to storage:', error);
      }
    }
  }

  async log(
    level: LogLevel,
    category: LogCategory,
    action: string,
    message: string,
    details?: Record<string, any>,
    metadata?: LogMetadata
  ): Promise<void> {
    if (!this.shouldLog(level)) return;

    const entry = await this.createLogEntry(level, category, action, message, details, metadata);
    await this.writeLog(entry);
  }

  async debug(category: LogCategory, action: string, message: string, details?: Record<string, any>, metadata?: LogMetadata): Promise<void> {
    await this.log('DEBUG', category, action, message, details, metadata);
  }

  async info(category: LogCategory, action: string, message: string, details?: Record<string, any>, metadata?: LogMetadata): Promise<void> {
    await this.log('INFO', category, action, message, details, metadata);
  }

  async warn(category: LogCategory, action: string, message: string, details?: Record<string, any>, metadata?: LogMetadata): Promise<void> {
    await this.log('WARN', category, action, message, details, metadata);
  }

  async error(category: LogCategory, action: string, message: string, details?: Record<string, any>, metadata?: LogMetadata): Promise<void> {
    await this.log('ERROR', category, action, message, details, metadata);
  }

  // Helper methods for common logging scenarios
  async logUserAction(action: string, details?: Record<string, any>): Promise<void> {
    await this.info('USER_ACTION', action, `User performed: ${action}`, details);
  }

  async logApiCall(method: string, route: string, statusCode: number, duration: number, details?: Record<string, any>): Promise<void> {
    const level = statusCode >= 400 ? 'ERROR' : 'INFO';
    await this.log(level, 'API', 'api_call', `${method} ${route}`, details, {
      method,
      route,
      statusCode,
      duration
    });
  }

  async logDatabaseOperation(operation: string, table: string, duration?: number, details?: Record<string, any>): Promise<void> {
    await this.info('DATABASE', operation, `Database ${operation} on ${table}`, details, {
      duration,
      component: table
    });
  }

  async logError(error: Error, context?: string, details?: Record<string, any>): Promise<void> {
    await this.error('ERROR', 'exception', error.message, {
      ...details,
      context,
      errorName: error.name
    }, {
      stack: error.stack
    });
  }

  async logPerformance(action: string, duration: number, details?: Record<string, any>): Promise<void> {
    await this.info('PERFORMANCE', action, `Performance: ${action}`, details, { duration });
  }

  async logAuth(action: string, success: boolean, details?: Record<string, any>): Promise<void> {
    const level = success ? 'INFO' : 'WARN';
    await this.log(level, 'AUTHENTICATION', action, `Auth ${action}: ${success ? 'success' : 'failed'}`, details);
  }

  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  getContext(): Record<string, any> {
    return this.context;
  }

  clearContext(): void {
    this.context = {};
  }

  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export { Logger };