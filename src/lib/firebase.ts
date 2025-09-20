// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: 'studio-6080596132-e636f',
  appId: '1:705868700170:web:63b2ba30e2427d0e271df3',
  apiKey: 'AIzaSyDiKtzbrSlPg5CBnVCP5dP9srTcaQ_YuF0',
  authDomain: 'studio-6080596132-e636f.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '705868700170',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
