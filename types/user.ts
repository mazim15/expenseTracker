export interface UserSettings {
  currency: string;
  notifications: boolean;
  darkMode: boolean;
}

export interface UserProfileData {
  displayName?: string;
  photoURL?: string;
}

export interface UserProfileFormData {
  displayName: string;
  email: string;
} 