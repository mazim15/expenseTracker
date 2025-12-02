"use client";

import { useState, useEffect, useCallback } from 'react';
import { LogEntry, LogFilter, LogLevel, LogCategory } from '@/lib/logging/types';
import { FirestoreLogAdapter } from '@/lib/logging/storage';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Download, RefreshCw, Activity, Clock, User } from 'lucide-react';

const logAdapter = new FirestoreLogAdapter();

// Color coding for log levels
const logLevelColors: Record<LogLevel, string> = {
  DEBUG: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  WARN: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

// Color coding for categories
const logCategoryColors: Record<LogCategory, string> = {
  USER_ACTION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SYSTEM: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  PERFORMANCE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  AUTHENTICATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DATABASE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  API: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

// User-friendly action descriptions
const actionDescriptions: Record<string, string> = {
  'expense_created': 'Created new expense',
  'expense_updated': 'Updated expense',
  'expense_deleted': 'Deleted expense',
  'receipt_upload_started': 'Started receipt upload',
  'receipt_analysis_successful': 'Receipt analyzed successfully',
  'receipt_analysis_failed': 'Receipt analysis failed',
  'signin': 'Signed in',
  'signout': 'Signed out',
  'signup': 'Created account',
  'password_reset': 'Requested password reset',
  'category_created': 'Created category',
  'category_updated': 'Updated category',
  'page_navigation': 'Navigated to page',
  'expense_validation_failed': 'Form validation failed'
};

export default function UserLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'all'>('all');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const loadLogs = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const filter: LogFilter = {
        userId: user.uid, // Only show logs for current user
        level: selectedLevel !== 'all' ? [selectedLevel] : undefined,
        category: selectedCategory !== 'all' ? [selectedCategory] : undefined,
        search: searchTerm || undefined
      };

      const [logsData, count] = await Promise.all([
        logAdapter.read(filter, pageSize, (currentPage - 1) * pageSize),
        logAdapter.count(filter)
      ]);

      setLogs(logsData);
      setTotalCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [user, selectedLevel, selectedCategory, searchTerm, currentPage, pageSize]);

  useEffect(() => {
    if (!user) {
      setError('Please log in to view your activity logs.');
      setLoading(false);
      return;
    }

    loadLogs();
  }, [user, currentPage, selectedLevel, selectedCategory, loadLogs]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadLogs();
  };

  const exportLogs = async () => {
    if (!user) return;

    try {
      const filter: LogFilter = {
        userId: user.uid,
        level: selectedLevel !== 'all' ? [selectedLevel] : undefined,
        category: selectedCategory !== 'all' ? [selectedCategory] : undefined,
        search: searchTerm || undefined
      };

      const allLogs = await logAdapter.read(filter, 500); // Export up to 500 logs
      const csvContent = [
        ['Date', 'Time', 'Activity', 'Category', 'Details'],
        ...allLogs.map(log => [
          log.timestamp.toLocaleDateString(),
          log.timestamp.toLocaleTimeString(),
          actionDescriptions[log.action] || log.action,
          log.category,
          log.message
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-activity-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export activity logs');
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(timestamp);
    }
  };

  const getActivityIcon = (category: LogCategory) => {
    switch (category) {
      case 'USER_ACTION':
        return <User className="h-4 w-4" />;
      case 'PERFORMANCE':
        return <Clock className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <AlertDescription>
            Please log in to view your activity logs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Activity</h1>
          <p className="text-muted-foreground">Track your actions and app usage</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadLogs} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Activities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {logs.filter(log => log.category === 'USER_ACTION').length}
                </p>
                <p className="text-sm text-muted-foreground">User Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {logs.length > 0 ? formatTimestamp(logs[0].timestamp) : 'No activity'}
                </p>
                <p className="text-sm text-muted-foreground">Last Activity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Activities</CardTitle>
          <CardDescription>Find specific activities and events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <Select value={selectedLevel} onValueChange={(value) => {
              setSelectedLevel(value as LogLevel | 'all');
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={(value) => {
              setSelectedCategory(value as LogCategory | 'all');
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="USER_ACTION">My Actions</SelectItem>
                <SelectItem value="AUTHENTICATION">Sign In/Out</SelectItem>
                <SelectItem value="ERROR">Errors</SelectItem>
                <SelectItem value="PERFORMANCE">Performance</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              {totalCount} activities found
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Your recent activities and system events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading activities...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activities found. Start using the app to see your activity timeline!
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      {getActivityIcon(log.category)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={logCategoryColors[log.category]} variant="secondary">
                        {log.category === 'USER_ACTION' ? 'Action' : log.category}
                      </Badge>
                      {log.level !== 'INFO' && (
                        <Badge className={logLevelColors[log.level]} variant="secondary">
                          {log.level}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {actionDescriptions[log.action] || log.action}
                      </div>
                      {log.message && (
                        <div className="text-sm text-muted-foreground">
                          {log.message}
                        </div>
                      )}
                    </div>

                    {/* Show expense details for user actions */}
                    {log.category === 'USER_ACTION' && (log.details.amount || log.details.category || log.details.description) && (
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs space-y-1">
                        {log.details.description && (
                          <div><span className="font-medium">Description:</span> {log.details.description}</div>
                        )}
                        <div className="flex gap-4">
                          {log.details.amount && (
                            <span><span className="font-medium">Amount:</span> ${log.details.amount}</span>
                          )}
                          {log.details.category && (
                            <span><span className="font-medium">Category:</span> {log.details.category}</span>
                          )}
                          {log.details.date && (
                            <span><span className="font-medium">Date:</span> {log.details.date}</span>
                          )}
                        </div>
                        {log.details.location && (
                          <div><span className="font-medium">Location:</span> {log.details.location}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex justify-center mt-6 gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                variant="outline"
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm">
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </span>
              <Button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= Math.ceil(totalCount / pageSize) || loading}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}