# Logging System Documentation

This comprehensive logging system provides structured logging for user actions, system events, errors, and performance metrics.

## Features

- **Multiple Log Levels**: DEBUG, INFO, WARN, ERROR
- **Categorized Logging**: USER_ACTION, SYSTEM, ERROR, PERFORMANCE, AUTHENTICATION, DATABASE, API
- **Flexible Storage**: Console logging for development, Firestore for production
- **Middleware Support**: Easy integration with API routes and functions
- **Admin Interface**: Web-based log viewer with filtering and export
- **Performance Tracking**: Built-in performance monitoring
- **Context Management**: Automatic user context tracking

## Basic Usage

### Import the logger

```typescript
import { logger, logUserAction, logError } from '@/lib/logging';
```

### Log user actions

```typescript
// Simple user action
await logUserAction('expense_created', { amount: 100, category: 'food' });

// Using the hook in components
import { useLogger } from '@/lib/hooks/useLogger';

function MyComponent() {
  const { logAction } = useLogger();
  
  const handleClick = async () => {
    await logAction('button_clicked', { buttonId: 'save-expense' });
  };
}
```

### Log errors

```typescript
try {
  // Some operation
} catch (error) {
  await logError(error, 'expense_save_failed', { expenseId: '123' });
}
```

### Log API calls

```typescript
import { createLoggedApiHandler } from '@/lib/logging/middleware';

export const POST = createLoggedApiHandler(async (request) => {
  // Your API logic here
  return new Response('Success');
});
```

## Advanced Usage

### Using middleware for performance tracking

```typescript
import { withPerformanceLogging } from '@/lib/logging/middleware';

const expensiveOperation = withPerformanceLogging(
  'calculate_analytics',
  async (data) => {
    // Your expensive operation
    return result;
  }
);
```

### Using middleware for database operations

```typescript
import { withDatabaseLogging } from '@/lib/logging/middleware';

const getExpenses = withDatabaseLogging(
  'read',
  'expenses',
  async (userId) => {
    // Database operation
    return expenses;
  }
);
```

### Custom logging with full control

```typescript
import { logger } from '@/lib/logging';

await logger.log(
  'INFO', 
  'USER_ACTION', 
  'custom_action', 
  'User performed custom action',
  { customData: 'value' },
  { duration: 150, component: 'CustomComponent' }
);
```

## React Integration

### Error Boundary with Logging

```typescript
import { LoggedErrorBoundary } from '@/components/LoggedErrorBoundary';

function App() {
  return (
    <LoggedErrorBoundary>
      <YourAppContent />
    </LoggedErrorBoundary>
  );
}
```

### Using the Logger Hook

```typescript
import { useLogger } from '@/lib/hooks/useLogger';

function ExpenseForm() {
  const { logAction, logError, withActionLogging } = useLogger();
  
  const handleSubmit = withActionLogging(
    'expense_submit',
    async (formData) => {
      // Form submission logic
    },
    { formType: 'expense', hasReceipt: true }
  );
}
```

## Configuration

### Environment-based Configuration

The logger automatically configures based on the environment:

- **Development**: Console logging enabled, uses in-memory storage
- **Production**: Firestore storage enabled, console logging disabled

### Manual Configuration

```typescript
import { configureLogger } from '@/lib/logging';

configureLogger({
  level: 'INFO',
  enableConsole: true,
  enableStorage: true
});
```

## Admin Interface

Access the admin logs interface at `/admin/logs` (requires admin privileges).

Features:
- Real-time log viewing
- Filtering by level, category, user, and date range
- Search functionality
- Export to CSV
- Log deletion
- Pagination

## Log Storage

### Firestore Structure

```
logs/
├── {logId}/
    ├── timestamp: Date
    ├── level: string
    ├── category: string
    ├── action: string
    ├── message: string
    ├── userId?: string
    ├── details: object
    └── metadata: object
```

### Data Retention

- Logs are automatically cleaned up based on retention policies
- Use `logAdapter.cleanup(retentionDays)` to manually clean old logs

## Best Practices

1. **Use appropriate log levels**:
   - DEBUG: Detailed information for debugging
   - INFO: General application flow
   - WARN: Potentially harmful situations
   - ERROR: Error events that don't stop the application

2. **Provide meaningful context**:
   ```typescript
   await logAction('expense_created', {
     amount: expense.amount,
     category: expense.category,
     hasReceipt: !!expense.receipt,
     paymentMethod: expense.paymentMethod
   });
   ```

3. **Don't log sensitive information**:
   - Avoid logging passwords, tokens, or personal data
   - Use sanitized versions of sensitive data

4. **Use structured data**:
   ```typescript
   // Good
   await logAction('search_performed', {
     query: 'food expenses',
     resultCount: 25,
     filters: ['category:food', 'date:last-month']
   });
   
   // Avoid
   await logAction('search_performed', 'User searched for food expenses and got 25 results');
   ```

5. **Log important user journeys**:
   - Authentication events
   - CRUD operations
   - Navigation between important pages
   - Feature usage

## Performance Considerations

- Logging is asynchronous and won't block your application
- Failed log writes are handled gracefully
- In-memory storage has automatic size limits
- Firestore writes are batched when possible

## Troubleshooting

### Logs not appearing

1. Check if the user context is set:
   ```typescript
   import { setLoggerUser } from '@/lib/logging';
   setLoggerUser(userId, userEmail);
   ```

2. Verify Firestore permissions in development
3. Check browser console for any logging errors

### Performance issues

1. Reduce log verbosity in production
2. Use appropriate log levels
3. Monitor Firestore usage and costs
4. Implement log retention policies