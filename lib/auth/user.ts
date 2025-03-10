import { User, updateProfile } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserSettings, UserProfileData } from "@/types/user";

/**
 * Update the user's profile information
 */
export async function updateUserProfile(user: User, data: UserProfileData) {
  try {
    await updateProfile(user, data);
    
    // Also update the user document in Firestore if it exists
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      displayName: data.displayName || user.displayName,
      photoURL: data.photoURL || user.photoURL,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

/**
 * Update user settings in Firestore
 */
export async function updateUserSettings(userId: string, settings: UserSettings) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      settings,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating user settings:", error);
    throw error;
  }
}

/**
 * Get user settings from Firestore
 */
export async function getUserSettings(uid: string): Promise<UserSettings> {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    return userDoc.data() as UserSettings;
  } catch (error) {
    console.error("Error getting user settings:", error);
    throw error;
  }
} 