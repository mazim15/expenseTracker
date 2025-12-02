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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Download, Trash2, RefreshCw } from 'lucide-react';

const logAdapter = new FirestoreLogAdapter();

// Color coding for log levels
const logLevelColors: Record<LogLevel, string> = {
  DEBUG: 'bg-gray-100 text-gray-800',
  INFO: 'bg-blue-100 text-blue-800',
  WARN: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800'
};

// Color coding for categories
const logCategoryColors: Record<LogCategory, string> = {
  USER_ACTION: 'bg-green-100 text-green-800',
  SYSTEM: 'bg-purple-100 text-purple-800',
  ERROR: 'bg-red-100 text-red-800',
  PERFORMANCE: 'bg-orange-100 text-orange-800',
  AUTHENTICATION: 'bg-blue-100 text-blue-800',
  DATABASE: 'bg-indigo-100 text-indigo-800',
  API: 'bg-gray-100 text-gray-800'
};

export default function LogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LogFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'all'>('all');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Check if user has admin access 
  const isAdmin = user?.email === 'admin@example.com' || user?.email === 'admin@localhost';

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentFilter: LogFilter = {
        ...filter,
        level: selectedLevel !== 'all' ? [selectedLevel] : undefined,
        category: selectedCategory !== 'all' ? [selectedCategory] : undefined,
        search: searchTerm || undefined
      };

      const [logsData, count] = await Promise.all([
        logAdapter.read(currentFilter, pageSize, (currentPage - 1) * pageSize),
        logAdapter.count(currentFilter)
      ]);

      setLogs(logsData);
      setTotalCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [filter, currentPage, selectedLevel, selectedCategory, searchTerm, pageSize]);

  useEffect(() => {
    if (!isAdmin) {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }

    loadLogs();
  }, [isAdmin, loadLogs]);

  const handleSearch = () => {
    setCurrentPage(1);
    setFilter(prev => ({
      ...prev,
      search: searchTerm || undefined
    }));
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    loadLogs();
  };

  const exportLogs = async () => {
    try {
      const allLogs = await logAdapter.read(filter, 1000); // Export up to 1000 logs
      const csvContent = [
        ['Timestamp', 'Level', 'Category', 'Action', 'Message', 'User ID', 'Details'],
        ...allLogs.map(log => [
          log.timestamp.toISOString(),
          log.level,
          log.category,
          log.action,
          log.message,
          log.userId || '',
          JSON.stringify(log.details)
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export logs');
    }
  };

  const deleteLogs = async (id: string) => {
    try {
      await logAdapter.delete(id);
      setLogs(prev => prev.filter(log => log.id !== id));
      setTotalCount(prev => prev - 1);
    } catch {
      setError('Failed to delete log');
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestamp);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertDescription>
            Access denied. Admin privileges required to view logs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-gray-600">Monitor application activity and debug issues</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadLogs} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter logs by level, category, and search terms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search logs..."
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
              setTimeout(handleFilterChange, 0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Log Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="DEBUG">Debug</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={(value) => {
              setSelectedCategory(value as LogCategory | 'all');
              setTimeout(handleFilterChange, 0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="USER_ACTION">User Actions</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
                <SelectItem value="ERROR">Errors</SelectItem>
                <SelectItem value="PERFORMANCE">Performance</SelectItem>
                <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                <SelectItem value="DATABASE">Database</SelectItem>
                <SelectItem value="API">API</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-600 flex items-center">
              Total: {totalCount} logs
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

      {/* Logs Display */}
      <Card>
        <CardHeader>
          <CardTitle>Log Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No logs found matching the current filters.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={logLevelColors[log.level]}>
                        {log.level}
                      </Badge>
                      <Badge className={logCategoryColors[log.category]}>
                        {log.category}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <Button
                      onClick={() => deleteLogs(log.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-medium">{log.action}</div>
                    <div className="text-gray-700">{log.message}</div>
                    {log.userId && (
                      <div className="text-sm text-gray-500">User: {log.userId}</div>
                    )}
                  </div>

                  {/* Expandable Details */}
                  <Tabs defaultValue="summary" className="mt-3">
                    <TabsList>
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="metadata">Metadata</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="mt-2">
                      <div className="text-sm">
                        {Object.keys(log.details).length > 0 && (
                          <div>
                            <strong>Key details:</strong> {Object.keys(log.details).join(', ')}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="details" className="mt-2">
                      <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </TabsContent>
                    <TabsContent value="metadata" className="mt-2">
                      <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </TabsContent>
                  </Tabs>
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
              <span className="flex items-center px-4">
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