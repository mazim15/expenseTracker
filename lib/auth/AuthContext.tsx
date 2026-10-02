"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { logAuth, setLoggerUser, clearLoggerUser } from "@/lib/logging";

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
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        };
        setUser(userData);

        // Set logger context
        setLoggerUser(firebaseUser.uid, firebaseUser.email || undefined);

        // Log authentication state change
        logAuth("state_change", true, {
          userId: firebaseUser.uid,
          email: firebaseUser.email,
          action: "user_authenticated",
        });
      } else {
        setUser(null);

        // Clear logger context
        clearLoggerUser();

        // Log authentication state change
        logAuth("state_change", false, {
          action: "user_unauthenticated",
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await logAuth("signup", true, {
        userId: userCredential.user.uid,
        email: userCredential.user.email,
      });
    } catch (error) {
      await logAuth("signup", false, {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await logAuth("signin", true, {
        userId: userCredential.user.uid,
        email: userCredential.user.email,
      });
    } catch (error: unknown) {
      await logAuth("signin", false, {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const currentUser = auth.currentUser;
      await firebaseSignOut(auth);
      await logAuth("signout", true, {
        userId: currentUser?.uid,
        email: currentUser?.email,
      });
    } catch (error) {
      await logAuth("signout", false, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      await logAuth("password_reset", true, { email });
    } catch (error: unknown) {
      await logAuth("password_reset", false, {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : "Failed to send password reset email";
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

  // Firebase requires a recent sign-in to change the password, so re-check the current one first.
  const changePassword = async (currentPassword: string, newPassword: string) => {
    const current = auth.currentUser;
    if (!current?.email) throw new Error("No user logged in");
    try {
      await reauthenticateWithCredential(
        current,
        EmailAuthProvider.credential(current.email, currentPassword),
      );
      await updatePassword(current, newPassword);
      await logAuth("password_changed", true, { userId: current.uid });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        throw new Error("Your current password is incorrect.");
      }
      if (code === "auth/too-many-requests") {
        throw new Error("Too many attempts. Please wait a few minutes and try again.");
      }
      if (code === "auth/weak-password") {
        throw new Error("Choose a stronger password (at least 8 characters).");
      }
      throw new Error("Couldn't change your password. Please try again.");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signUp, signIn, signOut, resetPassword, updateUser, changePassword }}
    >
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
