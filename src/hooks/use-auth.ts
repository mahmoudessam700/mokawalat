
'use client';

import React, { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';

export type UserRole = 'admin' | 'manager' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  photoUrl?: string;
}

interface AuthState {
  user: FirebaseAuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, now listen for their profile document
        const profileDocRef = doc(firestore, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(profileDocRef, (doc) => {
          if (doc.exists()) {
            setAuthState({ user, profile: doc.data() as UserProfile, isLoading: false });
          } else {
            // Profile doesn't exist yet. Create a fallback profile to prevent UI issues.
            // This can happen if the user was created in the auth console but not in Firestore.
            setAuthState({ 
                user, 
                profile: {
                    uid: user.uid,
                    email: user.email || 'No email',
                    role: 'user' // Default to 'user' as a safe fallback
                }, 
                isLoading: false 
            });
          }
        }, (error) => {
            console.error("Error fetching user profile:", error);
            setAuthState({ user, profile: null, isLoading: false });
        });
        
        // Return a cleanup function for the profile listener
        return () => unsubscribeProfile();
      } else {
        // User is signed out
        setAuthState({ user: null, profile: null, isLoading: false });
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribeAuth();
  }, []);
  
  return React.createElement(AuthContext.Provider, { value: authState }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
