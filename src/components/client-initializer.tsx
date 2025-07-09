'use client';

import { useEffect } from 'react';
import { initializeStorageTokens } from '@/lib/storage';

/**
 * Client-side initialization component
 * Handles storage token initialization and error prevention
 */
export function ClientInitializer() {
  useEffect(() => {
    // Initialize storage tokens to prevent undefined errors
    initializeStorageTokens();

    // Handle uncaught promise rejections that might be causing the console errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('Unhandled promise rejection caught and handled:', event.reason);
      // Prevent the error from showing in console if it's Firebase auth related
      if (event.reason?.code && (
        event.reason.code === 403 || 
        event.reason.code === 'auth/operation-not-allowed' ||
        event.reason.code === 'permission-denied'
      )) {
        event.preventDefault();
        console.debug('Firebase auth error suppressed (demo configuration)');
      }
    };

    // Add global error handler
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
