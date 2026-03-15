import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();


// {
//   "projectId": "ai-studio-applet-webapp-4517e",
//   "appId": "1:291281722412:web:9496c3e80ff69f4f27c589",
//   "apiKey": "AIzaSyAozkfgCG_eZ0vTVX_7RD1RUTAymkApT1M",
//   "authDomain": "ai-studio-applet-webapp-4517e.firebaseapp.com",
//   "firestoreDatabaseId": "ai-studio-a8e569a3-f5b3-4ed6-9d5f-c444332e5c66",
//   "storageBucket": "ai-studio-applet-webapp-4517e.firebasestorage.app",
//   "messagingSenderId": "291281722412",
//   "measurementId": ""
// }