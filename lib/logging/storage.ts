/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../firebase';
import { LogEntry, LogFilter, LogStorageAdapter } from './types';

export class FirestoreLogAdapter implements LogStorageAdapter {
  private collectionName = 'logs';

  private logEntryToFirestore(entry: LogEntry) {
    // Ensure userId is never undefined for Firestore
    const firestoreEntry = {
      ...entry,
      timestamp: Timestamp.fromDate(entry.timestamp),
      userId: entry.userId || 'anonymous' // Fallback for undefined userId
    };
    
    // Recursively remove undefined values from the entire object
    const removeUndefined = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(removeUndefined);
      
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = removeUndefined(value);
        }
      });
      return cleaned;
    };
    
    return removeUndefined(firestoreEntry);
  }

  private firestoreToLogEntry(doc: any): LogEntry {
    const data = doc.data();
    
    // Handle timestamp conversion with fallbacks
    let timestamp: Date;
    try {
      if (data.timestamp?.toDate) {
        // Firestore Timestamp object
        timestamp = data.timestamp.toDate();
      } else if (data.timestamp?.seconds) {
        // Firestore Timestamp-like object with seconds
        timestamp = new Date(data.timestamp.seconds * 1000);
      } else if (data.timestamp) {
        // Try to parse as regular timestamp
        timestamp = new Date(data.timestamp);
      } else {
        // Fallback to current date
        timestamp = new Date();
      }
      
      // Validate the date
      if (isNaN(timestamp.getTime())) {
        timestamp = new Date();
      }
    } catch (error) {
      console.warn('Error parsing timestamp:', data.timestamp, error);
      timestamp = new Date();
    }
    
    return {
      ...data,
      id: doc.id,
      timestamp
    };
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      const logsCollection = collection(db, this.collectionName);
      const firestoreEntry = this.logEntryToFirestore(entry);
      await addDoc(logsCollection, firestoreEntry);
    } catch (error) {
      console.error('Failed to write log to Firestore:', error);
      throw error;
    }
  }

  async read(filter?: LogFilter, limit = 100, offset = 0): Promise<LogEntry[]> {
    try {
      const logsCollection = collection(db, this.collectionName);
      let q = query(logsCollection, orderBy('timestamp', 'desc'));

      // Apply filters
      if (filter) {
        if (filter.level && filter.level.length > 0) {
          q = query(q, where('level', 'in', filter.level));
        }
        if (filter.category && filter.category.length > 0) {
          q = query(q, where('category', 'in', filter.category));
        }
        if (filter.userId) {
          q = query(q, where('userId', '==', filter.userId));
        }
        if (filter.startDate) {
          q = query(q, where('timestamp', '>=', Timestamp.fromDate(filter.startDate)));
        }
        if (filter.endDate) {
          q = query(q, where('timestamp', '<=', Timestamp.fromDate(filter.endDate)));
        }
      }

      // Apply pagination
      q = query(q, firestoreLimit(limit));

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => this.firestoreToLogEntry(doc));

      // Apply text search on message and action (client-side since Firestore doesn't support full-text search)
      if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        return logs.filter(log => 
          log.message.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower)
        );
      }

      return logs;
    } catch (error) {
      console.error('Failed to read logs from Firestore:', error);
      throw error;
    }
  }

  async count(filter?: LogFilter): Promise<number> {
    try {
      const logsCollection = collection(db, this.collectionName);
      let q = query(logsCollection);

      // Apply filters (same as read method)
      if (filter) {
        if (filter.level && filter.level.length > 0) {
          q = query(q, where('level', 'in', filter.level));
        }
        if (filter.category && filter.category.length > 0) {
          q = query(q, where('category', 'in', filter.category));
        }
        if (filter.userId) {
          q = query(q, where('userId', '==', filter.userId));
        }
        if (filter.startDate) {
          q = query(q, where('timestamp', '>=', Timestamp.fromDate(filter.startDate)));
        }
        if (filter.endDate) {
          q = query(q, where('timestamp', '<=', Timestamp.fromDate(filter.endDate)));
        }
      }

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error('Failed to count logs in Firestore:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const logDoc = doc(db, this.collectionName, id);
      await deleteDoc(logDoc);
    } catch (error) {
      console.error('Failed to delete log from Firestore:', error);
      throw error;
    }
  }

  async cleanup(retentionDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const logsCollection = collection(db, this.collectionName);
      const q = query(
        logsCollection,
        where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
        firestoreLimit(500) // Delete in batches
      );

      const snapshot = await getDocs(q);
      let deletedCount = 0;

      for (const document of snapshot.docs) {
        await deleteDoc(document.ref);
        deletedCount++;
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup logs in Firestore:', error);
      throw error;
    }
  }
}

export class ConsoleLogAdapter implements LogStorageAdapter {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  async write(entry: LogEntry): Promise<void> {
    this.logs.unshift(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  async read(filter?: LogFilter, limit = 100, offset = 0): Promise<LogEntry[]> {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level && filter.level.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
      }
      if (filter.category && filter.category.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.category!.includes(log.category));
      }
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower)
        );
      }
    }

    return filteredLogs.slice(offset, offset + limit);
  }

  async count(filter?: LogFilter): Promise<number> {
    const logs = await this.read(filter);
    return logs.length;
  }

  async delete(id: string): Promise<void> {
    this.logs = this.logs.filter(log => log.id !== id);
  }

  async cleanup(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const beforeCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
    
    return beforeCount - this.logs.length;
  }
}