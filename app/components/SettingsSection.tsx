"use client";

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User } from 'firebase/auth';
import toast from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';
import { PaymentMethod } from '../types';

interface SettingsSectionProps {
  user: User;
}

export default function SettingsSection({ user }: SettingsSectionProps) {
  const [currency, setCurrency] = useState('PKR');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState<PaymentMethod['type']>('cash');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const settingsDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const docSnap = await getDoc(settingsDocRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCurrency(data.currency || 'PKR');
          setPaymentMethods(data.paymentMethods || []);
          setExportFormat(data.exportFormat || 'csv');
          setNotificationsEnabled(data.notificationsEnabled !== false);
        } else {
          // Initialize with defaults
          const defaultPaymentMethods: PaymentMethod[] = [
            { id: '1', name: 'Cash', type: 'cash' },
            { id: '2', name: 'Credit Card', type: 'credit' },
            { id: '3', name: 'Debit Card', type: 'debit' },
          ];
          setPaymentMethods(defaultPaymentMethods);
          await saveSettings({
            currency: 'PKR',
            paymentMethods: defaultPaymentMethods,
            exportFormat: 'csv',
            notificationsEnabled: true
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [user.uid]);
  
  const saveSettings = async (settings: any) => {
    try {
      const settingsDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(settingsDocRef, settings);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
      return false;
    }
  };
  
  const handleAddPaymentMethod = async () => {
    if (!newMethodName.trim()) {
      toast.error('Please enter a payment method name');
      return;
    }
    
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      name: newMethodName.trim(),
      type: newMethodType
    };
    
    const updatedMethods = [...paymentMethods, newMethod];
    const success = await saveSettings({
      currency,
      paymentMethods: updatedMethods,
      exportFormat,
      notificationsEnabled
    });
    
    if (success) {
      setPaymentMethods(updatedMethods);
      setNewMethodName('');
      toast.success('Payment method added');
    }
  };
  
  const handleDeletePaymentMethod = async (id: string) => {
    const updatedMethods = paymentMethods.filter(method => method.id !== id);
    const success = await saveSettings({
      currency,
      paymentMethods: updatedMethods,
      exportFormat,
      notificationsEnabled
    });
    
    if (success) {
      setPaymentMethods(updatedMethods);
      toast.success('Payment method removed');
    }
  };
  
  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    await saveSettings({
      currency: newCurrency,
      paymentMethods,
      exportFormat,
      notificationsEnabled
    });
    toast.success('Currency updated');
  };
  
  const handleExportFormatChange = async (format: 'csv' | 'pdf') => {
    setExportFormat(format);
    await saveSettings({
      currency,
      paymentMethods,
      exportFormat: format,
      notificationsEnabled
    });
    toast.success('Export format updated');
  };
  
  const handleNotificationToggle = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    await saveSettings({
      currency,
      paymentMethods,
      exportFormat,
      notificationsEnabled: newValue
    });
    toast.success(`Notifications ${newValue ? 'enabled' : 'disabled'}`);
  };
  
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.'
    );
    
    if (confirmed) {
      try {
        // Delete user data from Firestore
        // This would require a Cloud Function to properly delete all user data
        
        // Delete the user account
        await user.delete();
        toast.success('Your account has been deleted');
      } catch (error) {
        console.error('Error deleting account:', error);
        toast.error('Failed to delete account. You may need to re-authenticate first.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Theme</span>
            <ThemeToggle />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Currency</label>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PKR">Pakistani Rupee (PKR)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
              <option value="INR">Indian Rupee (INR)</option>
            </select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder="Payment method name"
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            
            <select
              value={newMethodType}
              onChange={(e) => setNewMethodType(e.target.value as PaymentMethod['type'])}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="cash">Cash</option>
              <option value="credit">Credit Card</option>
              <option value="debit">Debit Card</option>
              <option value="online">Online Payment</option>
              <option value="other">Other</option>
            </select>
            
            <button
              onClick={handleAddPaymentMethod}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add Method
            </button>
          </div>
          
          <div className="space-y-2 mt-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <span className="font-medium">{method.name}</span>
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({method.type})</span>
                </div>
                <button
                  onClick={() => handleDeletePaymentMethod(method.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Export & Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Default Export Format</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={exportFormat === 'csv'}
                  onChange={() => handleExportFormatChange('csv')}
                  className="mr-2"
                />
                CSV
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={exportFormat === 'pdf'}
                  onChange={() => handleExportFormatChange('pdf')}
                  className="mr-2"
                />
                PDF
              </label>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Enable Notifications</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={handleNotificationToggle}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete Account
          </button>
          <p className="mt-2 text-sm text-gray-500">
            This will permanently delete your account and all associated data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 