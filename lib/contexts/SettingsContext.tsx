"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserSettings {
  currency: string;
  notifications: boolean;
  darkMode: boolean;
  autoCategorizationEnabled: boolean;
  aiInsightsEnabled: boolean;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  isAIFeatureEnabled: (feature: 'categorization' | 'insights') => boolean;
}

const defaultSettings: UserSettings = {
  currency: 'PKR',
  notifications: true,
  darkMode: false,
  autoCategorizationEnabled: false,
  aiInsightsEnabled: true
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse user settings:', error);
      }
    }
  }, []);

  // Apply dark mode when settings change
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
  };

  const isAIFeatureEnabled = (feature: 'categorization' | 'insights'): boolean => {
    // Check if Gemini API key is available
    const isAIAvailable = typeof window !== 'undefined' && 
                         process.env.NEXT_PUBLIC_GEMINI_API_KEY !== undefined;
    
    if (!isAIAvailable) return false;
    
    switch (feature) {
      case 'categorization':
        return settings.autoCategorizationEnabled;
      case 'insights':
        return settings.aiInsightsEnabled;
      default:
        return false;
    }
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      isAIFeatureEnabled
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}