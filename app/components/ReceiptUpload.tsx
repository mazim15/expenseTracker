"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { CameraIcon } from '@heroicons/react/24/outline';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { ReceiptUploadProps, Receipt } from '../types';

export default function ReceiptUpload({ user, expenseId }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState<string[]>([]);

  const loadReceipts = useCallback(async () => {
    if (!expenseId) return;
    try {
      const receiptsRef = collection(db, 'users', user.uid, 'expenses', expenseId, 'receipts');
      const snapshot = await getDocs(receiptsRef);
      const urls = await Promise.all(
        snapshot.docs.map((doc) => {
          return getDownloadURL(ref(storage, doc.data().path));
        })
      );
      setReceipts(urls);
    } catch (err) {
      console.error('Error loading receipts:', err);
      toast.error('Error loading receipts');
    }
  }, [user.uid, expenseId]);

  useEffect(() => {
    if (!user || !expenseId) return;
    void loadReceipts();
  }, [user, expenseId, loadReceipts]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const timestamp = new Date().getTime();
      const path = `receipts/${user.uid}/${expenseId}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, path);
      
      await uploadBytes(storageRef, file);
      
      if (expenseId) {
        const receipt: Receipt = {
          path,
          uploadedAt: Timestamp.fromDate(new Date())
        };
        
        await addDoc(
          collection(db, 'users', user.uid, 'expenses', expenseId, 'receipts'), 
          receipt
        );
      }
      
      toast.success('Receipt uploaded successfully!');
      await loadReceipts();
    } catch (err) {
      console.error('Error uploading receipt:', err);
      toast.error('Error uploading receipt');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Receipts</h3>
        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700">
          <CameraIcon className="h-5 w-5 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Receipt'}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {receipts.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {receipts.map((url, idx) => (
            <div key={idx} className="relative rounded-lg overflow-hidden">
              <Image
                src={url}
                alt={`Receipt ${idx + 1}`}
                width={400}
                height={192}
                className="w-full h-48 object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}