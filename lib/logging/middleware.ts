/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest } from 'next/server';
import { logger } from './index';

export interface LoggedRequest extends NextRequest {
  startTime?: number;
  requestId?: string;
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Middleware for API route logging
export function withLogging<T extends any[]>(
  handler: (...args: T) => Promise<Response> | Response
) {
  return async (...args: T): Promise<Response> => {
    const request = args[0] as LoggedRequest;
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Add tracking info to request
    request.startTime = startTime;
    request.requestId = requestId;

    const method = request.method;
    const url = request.url;
    const pathname = new URL(url).pathname;

    // Log request start
    await logger.info('API', 'request_start', `${method} ${pathname}`, {
      requestId,
      method,
      pathname,
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type'),
    });

    try {
      // Execute the handler
      const response = await handler(...args);
      const duration = Date.now() - startTime;
      
      // Log successful response
      await logger.logApiCall(method, pathname, response.status, duration, {
        requestId,
        responseSize: response.headers.get('content-length'),
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error response
      await logger.error('API', 'request_error', `${method} ${pathname} failed`, {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, {
        method,
        route: pathname,
        duration,
        statusCode: 500,
      });

      // Re-throw the error
      throw error;
    }
  };
}

// Higher-order function for API route handlers
export function createLoggedApiHandler(
  handler: (request: NextRequest, context?: any) => Promise<Response> | Response
) {
  return withLogging(handler);
}

// Middleware for performance tracking
export function withPerformanceLogging<T extends any[]>(
  name: string,
  handler: (...args: T) => Promise<any> | any
) {
  return async (...args: T): Promise<any> => {
    const startTime = Date.now();
    
    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;
      
      await logger.logPerformance(name, duration, {
        success: true,
        resultType: typeof result,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await logger.logPerformance(name, duration, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  };
}

// Database operation logging middleware
export function withDatabaseLogging<T extends any[]>(
  operation: string,
  table: string,
  handler: (...args: T) => Promise<any> | any
) {
  return async (...args: T): Promise<any> => {
    const startTime = Date.now();
    
    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;
      
      await logger.logDatabaseOperation(operation, table, duration, {
        success: true,
        resultCount: Array.isArray(result) ? result.length : 1,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await logger.logDatabaseOperation(operation, table, duration, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  };
}

// User action logging middleware for client-side
export function withUserActionLogging<T extends any[]>(
  action: string,
  handler: (...args: T) => Promise<any> | any
) {
  return async (...args: T): Promise<any> => {
    try {
      const result = await handler(...args);
      
      await logger.logUserAction(action, {
        success: true,
        args: args.length > 0 ? JSON.stringify(args) : undefined,
      });
      
      return result;
    } catch (error) {
      await logger.logUserAction(action, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  };
}

// Error boundary logging
export function logErrorBoundary(error: Error, errorInfo: any) {
  logger.error('ERROR', 'react_error_boundary', error.message, {
    componentStack: errorInfo.componentStack,
    errorBoundary: true,
  }, {
    stack: error.stack,
  });
}

// Page navigation logging
export function logPageNavigation(from: string, to: string, duration?: number) {
  logger.info('USER_ACTION', 'page_navigation', `Navigation from ${from} to ${to}`, {
    from,
    to,
    navigationType: 'client_side',
  }, {
    duration,
  });
}