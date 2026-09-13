// Firebase web app config from Firebase console → Project settings → Your apps.
// These values identify the project and are safe to ship in client code;
// Firestore security rules are what protect the data.
export const firebaseConfig = {
  apiKey: 'AIzaSyBiPEDK5G3h_5bTOzFRqAq_INO2DQGrz24',
  authDomain: 'monthly-expanse-tracker-3de0c.firebaseapp.com',
  projectId: 'monthly-expanse-tracker-3de0c',
  storageBucket: 'monthly-expanse-tracker-3de0c.firebasestorage.app',
  messagingSenderId: '493118608805',
  appId: '1:493118608805:web:48e566629e2a25b49c844c'
};

export const isCloudConfigured = Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId);
