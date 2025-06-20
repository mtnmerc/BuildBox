import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBBKkFTORI1-cAxjbbrgsGGO1nBJwOF2LE",
  authDomain: "buildbox-50322.firebaseapp.com",
  projectId: "buildbox-50322",
  storageBucket: "buildbox-50322.firebasestorage.app",
  messagingSenderId: "835746675165",
  appId: "1:835746675165:web:2c4c34a893b7ab8c2a9e34"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Firebase Functions
export const editWithAI = httpsCallable(functions, 'editWithAI');
export const pullRepo = httpsCallable(functions, 'pullRepo');
export const pushChanges = httpsCallable(functions, 'pushChanges');

export { app, functions }; 