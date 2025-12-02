/* eslint-disable @typescript-eslint/no-explicit-any */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogCategory = 
  | 'USER_ACTION' 
  | 'SYSTEM' 
  | 'ERROR' 
  | 'PERFORMANCE' 
  | 'AUTHENTICATION'
  | 'DATABASE'
  | 'API';

export interface LogMetadata {
  userAgent?: string;
  ip?: string;
  route?: string;
  duration?: number;
  method?: string;
  statusCode?: number;
  component?: string;
  stack?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  action: string;
  message: string;
  userId?: string;
  details: Record<string, any>;
  metadata: LogMetadata;
}

export interface LogFilter {
  level?: LogLevel[];
  category?: LogCategory[];
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface LogStorageAdapter {
  write(entry: LogEntry): Promise<void>;
  read(filter?: LogFilter, limit?: number, offset?: number): Promise<LogEntry[]>;
  count(filter?: LogFilter): Promise<number>;
  delete(id: string): Promise<void>;
  cleanup(retentionDays: number): Promise<number>;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  adapter?: LogStorageAdapter;
  context?: Record<string, any>;
}