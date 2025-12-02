"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback } from 'react';
import { logUserAction, logError, logPerformance } from '@/lib/logging';

export function useLogger() {
  const logAction = useCallback(async (action: string, details?: Record<string, any>) => {
    try {
      await logUserAction(action, details);
    } catch (error) {
      console.error('Failed to log user action:', error);
    }
  }, []);

  const logActionError = useCallback(async (error: Error, context?: string, details?: Record<string, any>) => {
    try {
      await logError(error, context, details);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }, []);

  const logActionPerformance = useCallback(async (action: string, duration: number, details?: Record<string, any>) => {
    try {
      await logPerformance(action, duration, details);
    } catch (error) {
      console.error('Failed to log performance:', error);
    }
  }, []);

  // Helper to time and log performance of functions
  const withPerformanceLogging = useCallback(<T extends any[], R>(
    actionName: string,
    fn: (...args: T) => Promise<R> | R,
    additionalDetails?: Record<string, any>
  ) => {
    return async (...args: T): Promise<R> => {
      const startTime = Date.now();
      try {
        const result = await fn(...args);
        const duration = Date.now() - startTime;
        await logActionPerformance(actionName, duration, {
          ...additionalDetails,
          success: true,
          argsCount: args.length
        });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        await logActionPerformance(actionName, duration, {
          ...additionalDetails,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          argsCount: args.length
        });
        throw error;
      }
    };
  }, [logActionPerformance]);

  // Helper to log and handle user actions
  const withActionLogging = useCallback(<T extends any[], R>(
    actionName: string,
    fn: (...args: T) => Promise<R> | R,
    additionalDetails?: Record<string, any>
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        const result = await fn(...args);
        await logAction(actionName, {
          ...additionalDetails,
          success: true,
          argsCount: args.length
        });
        return result;
      } catch (error) {
        await logAction(actionName, {
          ...additionalDetails,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          argsCount: args.length
        });
        throw error;
      }
    };
  }, [logAction]);

  return {
    logAction,
    logError: logActionError,
    logPerformance: logActionPerformance,
    withPerformanceLogging,
    withActionLogging
  };
}