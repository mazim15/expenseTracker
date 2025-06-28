"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// Rename the User type to avoid conflict with Firebase's User
type AuthUser = {
  uid: string;
  email: string | null;
};

// Add this interface to define what can be updated
interface UserProfileUpdate {
  displayName?: string | null;
  photoURL?: string | null;
}

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (profileData: UserProfileUpdate) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("AuthContext: Attempting sign in with:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("AuthContext: Sign in successful:", userCredential.user.uid);
    } catch (error: unknown) {
      console.error("AuthContext: Sign in failed:", error);
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      };
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      console.log('Password reset email sent successfully to:', email);
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as { message: string }).message 
        : 'Failed to send password reset email';
      throw new Error(errorMessage);
    }
  };

  const updateUser = async (profileData: UserProfileUpdate) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    
    try {
      await updateProfile(auth.currentUser, profileData);
      // Force a re-render by updating the user state if we have a current user
      if (auth.currentUser) {
        setUser({
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
        });
      }
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, resetPassword, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 