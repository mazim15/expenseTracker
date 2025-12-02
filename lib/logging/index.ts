/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from './logger';
import { FirestoreLogAdapter, ConsoleLogAdapter } from './storage';
import { LoggerConfig } from './types';

// Create storage adapter based on environment
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createStorageAdapter = () => {
  if (process.env.NODE_ENV === 'production') {
    return new FirestoreLogAdapter();
  } else {
    return new ConsoleLogAdapter();
  }
};

// Default configuration
const defaultConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',
  enableConsole: true,
  enableStorage: true, // Always enable storage so logs are saved to Firestore
  adapter: new FirestoreLogAdapter(), // Always use Firestore for persistent logs
  context: {}
};

// Create and export logger instance
export const logger = new Logger(defaultConfig);

// Export everything for flexibility
export * from './types';
export * from './logger';
export * from './storage';
export * from './middleware';

// Helper function to set user context
export const setLoggerUser = (userId: string, userEmail?: string) => {
  logger.setContext({
    userId,
    userEmail
  });
};

// Helper function to clear user context (on logout)
export const clearLoggerUser = () => {
  logger.clearContext();
};

// Helper function to configure logger for different environments
export const configureLogger = (config: Partial<LoggerConfig>) => {
  logger.updateConfig(config);
};

// Convenience functions for common logging patterns
export const logUserAction = (action: string, details?: Record<string, any>) => {
  return logger.logUserAction(action, details);
};

// Enhanced logging function that ensures userId is set
export const logUserActionWithUserId = (userId: string, action: string, details?: Record<string, any>) => {
  // Temporarily set user context if not already set
  const currentUserId = logger.getContext().userId;
  if (!currentUserId && userId) {
    logger.setContext({ userId });
  }
  return logger.logUserAction(action, { ...details, userId });
};

export const logError = (error: Error, context?: string, details?: Record<string, any>) => {
  return logger.logError(error, context, details);
};

export const logApiCall = (method: string, route: string, statusCode: number, duration: number, details?: Record<string, any>) => {
  return logger.logApiCall(method, route, statusCode, duration, details);
};

export const logDatabaseOperation = (operation: string, table: string, duration?: number, details?: Record<string, any>) => {
  return logger.logDatabaseOperation(operation, table, duration, details);
};

export const logPerformance = (action: string, duration: number, details?: Record<string, any>) => {
  return logger.logPerformance(action, duration, details);
};

export const logAuth = (action: string, success: boolean, details?: Record<string, any>) => {
  return logger.logAuth(action, success, details);
};