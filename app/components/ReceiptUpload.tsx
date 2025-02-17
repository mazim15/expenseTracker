import React, { useState, useEffect } from 'react';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import toast from 'react-hot-toast';

interface ReceiptUploadProps {
  user: any;
  expenseId?: string;
}

export default function ReceiptUpload({ user, expenseId }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !expenseId) return;
    loadReceipts();
  }, [user, expenseId]);

  const loadReceipts = async () => {
    if (!expenseId) return;
    const receiptsRef = collection(db, 'users', user.uid, 'expenses', expenseId, 'receipts');
    const snapshot = await getDocs(receiptsRef);
    const urls = await Promise.all(
      snapshot.docs.map((doc) => {
        return getDownloadURL(ref(storage, doc.data().path));
      })
    );
    setReceipts(urls);
  };

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
        await addDoc(collection(db, 'users', user.uid, 'expenses', expenseId, 'receipts'), {
          path,
          uploadedAt: new Date()
        });
      }
      
      toast.success('Receipt uploaded successfully!');
      loadReceipts();
    } catch (error) {
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
          {receipts.map((url, index) => (
            <div key={index} className="relative rounded-lg overflow-hidden">
              <img
                src={url}
                alt={`Receipt ${index + 1}`}
                className="w-full h-48 object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
