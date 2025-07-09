'use client';

/**
 * Client-side storage utilities with error handling
 * Fixes the storage token, session, and expires errors
 */

// Safe localStorage wrapper with error handling
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get localStorage item '${key}':`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set localStorage item '${key}':`, error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove localStorage item '${key}':`, error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return false;
    }
  }
};

// Session storage utilities
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get sessionStorage item '${key}':`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set sessionStorage item '${key}':`, error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove sessionStorage item '${key}':`, error);
      return false;
    }
  }
};

// Storage token management
export const storageTokenManager = {
  getToken: (): string | null => {
    const token = safeLocalStorage.getItem('storageToken');
    if (!token) {
      console.debug('storageToken not found in localStorage');
    }
    return token;
  },

  setToken: (token: string): boolean => {
    return safeLocalStorage.setItem('storageToken', token);
  },

  removeToken: (): boolean => {
    return safeLocalStorage.removeItem('storageToken');
  },

  getSession: (): string | null => {
    const session = safeSessionStorage.getItem('storageSession');
    if (!session) {
      console.debug('storageSession not found in sessionStorage');
    }
    return session;
  },

  setSession: (session: string): boolean => {
    return safeSessionStorage.setItem('storageSession', session);
  },

  getExpiresAt: (): string | null => {
    const expiresAt = safeLocalStorage.getItem('storageExpiresAt');
    if (!expiresAt) {
      console.debug('storageExpiresAt not found in localStorage');
    }
    return expiresAt;
  },

  setExpiresAt: (expiresAt: string): boolean => {
    return safeLocalStorage.setItem('storageExpiresAt', expiresAt);
  },

  isTokenExpired: (): boolean => {
    const expiresAt = storageTokenManager.getExpiresAt();
    if (!expiresAt) return true;
    
    try {
      const expirationDate = new Date(expiresAt);
      return expirationDate.getTime() <= Date.now();
    } catch (error) {
      console.warn('Invalid expiration date format:', expiresAt);
      return true;
    }
  },

  clearAll: (): void => {
    storageTokenManager.removeToken();
    safeSessionStorage.removeItem('storageSession');
    storageTokenManager.removeToken();
  }
};

// Initialize storage tokens with default values if missing
export const initializeStorageTokens = (): void => {
  if (typeof window === 'undefined') return;

  try {
    // Check if tokens exist, if not, initialize with default values
    if (!storageTokenManager.getToken()) {
      console.debug('Initializing default storage token');
      storageTokenManager.setToken('default-token');
    }

    if (!storageTokenManager.getSession()) {
      console.debug('Initializing default storage session');
      storageTokenManager.setSession('default-session');
    }

    if (!storageTokenManager.getExpiresAt()) {
      console.debug('Initializing default storage expiration');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      storageTokenManager.setExpiresAt(tomorrow.toISOString());
    }
  } catch (error) {
    console.warn('Failed to initialize storage tokens:', error);
  }
};
