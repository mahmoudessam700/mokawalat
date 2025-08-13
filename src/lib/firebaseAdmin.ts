// This is a safe stub to avoid importing 'firebase-admin' when it's not installed.
// If you need Admin SDK features, install 'firebase-admin' and replace this stub accordingly.

export function getAdminApp() {
  throw new Error(
    "Firebase Admin SDK is not installed in this project. Install 'firebase-admin' and implement getAdminApp() if needed."
  );
}

export type Admin = unknown;
