import { toast } from "sonner";

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface IAppError extends Error {
  code?: string;
  severity?: ErrorSeverity;
  userMessage?: string;
  originalError?: Error;
}

export class AppError extends Error implements IAppError {
  constructor(
    message: string,
    public code?: string,
    public severity: ErrorSeverity = 'error',
    public userMessage?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Firebase error codes to user-friendly messages
const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'permission-denied': 'You don\'t have permission to perform this action.',
  'unavailable': 'Service is temporarily unavailable. Please try again.',
  'deadline-exceeded': 'Request timed out. Please check your connection and try again.',
  'not-found': 'The requested data was not found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Too many requests. Please wait a moment and try again.',
  'failed-precondition': 'Operation cannot be completed in the current state.',
  'aborted': 'Operation was aborted. Please try again.',
  'out-of-range': 'Invalid range specified.',
  'unimplemented': 'This feature is not yet implemented.',
  'internal': 'An internal error occurred. Please try again.',
  'unauthenticated': 'You need to sign in to perform this action.',
  'invalid-argument': 'Invalid data provided. Please check your input.',
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage || error.message;
  }

  if (error instanceof Error) {
    // Check if it's a Firebase error
    if ('code' in error && typeof error.code === 'string') {
      const firebaseMessage = FIREBASE_ERROR_MESSAGES[error.code];
      if (firebaseMessage) {
        return firebaseMessage;
      }
    }

    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}

export function handleError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const severity = error instanceof AppError ? error.severity : 'error';

  console.error(`Error in ${context || 'unknown context'}:`, error);

  // Show user-friendly toast
  switch (severity) {
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
    case 'info':
      toast.info(message);
      break;
    default:
      toast.error(message);
  }
}

export function showSuccessMessage(message: string): void {
  toast.success(message);
}

export function showInfoMessage(message: string): void {
  toast.info(message);
}

// Error boundary error handler
export function logErrorToBoundary(error: Error, errorInfo: { componentStack: string }): void {
  console.error('Error boundary caught error:', error, errorInfo);
  
  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to logging service
    // logToService({ error, errorInfo });
  }
}

// Async operation wrapper with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context);
    return null;
  }
}