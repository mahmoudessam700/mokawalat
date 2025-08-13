
'use client';

import React, { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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
        const unsubscribeProfile = onSnapshot(profileDocRef, async (snap) => {
          if (snap.exists()) {
            setAuthState({ user, profile: snap.data() as UserProfile, isLoading: false });
          } else {
            // Bootstrap: if this is the known admin email, try to create an admin profile document.
            // This relies on the Firestore rules bootstrap exception for this email.
            try {
              if (user.email === 'admin@mokawalat.com') {
                await setDoc(profileDocRef, {
                  uid: user.uid,
                  email: user.email,
                  role: 'admin',
                }, { merge: true });
                setAuthState({ user, profile: { uid: user.uid, email: user.email || 'No email', role: 'admin' }, isLoading: false });
                return;
              }
            } catch (e) {
              // If this fails due to rules, continue with fallback below.
              console.warn('Failed to bootstrap admin profile doc:', e);
            }
            // Fallback profile to prevent UI issues.
            setAuthState({ 
              user, 
              profile: {
                uid: user.uid,
                email: user.email || 'No email',
                role: 'user'
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
