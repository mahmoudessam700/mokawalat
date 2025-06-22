
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: FirebaseAuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

export function useAuth() {
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
            // Profile doesn't exist yet, might be a new user
             setAuthState({ user, profile: null, isLoading: false });
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

  return authState;
}
