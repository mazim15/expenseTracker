import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UseFirebaseCollectionOptions {
  orderField?: string;
  orderDirection?: 'asc' | 'desc';
  limitCount?: number;
  realtime?: boolean;
  constraints?: QueryConstraint[];
}

export interface UseFirebaseCollectionReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFirebaseCollection<T>(
  collectionPath: string,
  transform: (doc: QueryDocumentSnapshot<DocumentData>) => T | null,
  options: UseFirebaseCollectionOptions = {}
): UseFirebaseCollectionReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    orderField = 'createdAt',
    orderDirection = 'desc',
    limitCount,
    realtime = false,
    constraints = []
  } = options;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const collectionRef = collection(db, collectionPath);
      
      let q = query(collectionRef, orderBy(orderField, orderDirection), ...constraints);
      
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      
      const transformedData = querySnapshot.docs
        .map(transform)
        .filter((item): item is T => item !== null);

      setData(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [collectionPath, orderField, orderDirection, limitCount, constraints, transform]);

  const refresh = useCallback(() => fetchData(), [fetchData]);

  useEffect(() => {
    if (realtime) {
      // Set up real-time listener
      const collectionRef = collection(db, collectionPath);
      
      let q = query(collectionRef, orderBy(orderField, orderDirection), ...constraints);
      
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const transformedData = querySnapshot.docs
            .map(transform)
            .filter((item): item is T => item !== null);

          setData(transformedData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );

      return unsubscribe;
    } else {
      // Fetch data once
      fetchData();
    }
  }, [realtime, fetchData, collectionPath, orderField, orderDirection, limitCount, constraints, transform]);

  return {
    data,
    loading,
    error,
    refresh
  };
}