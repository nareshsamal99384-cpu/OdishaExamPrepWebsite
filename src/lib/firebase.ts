import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Use the specific database ID provided in the config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app, firebaseConfig.storageBucket);
export const googleProvider = new GoogleAuthProvider();
