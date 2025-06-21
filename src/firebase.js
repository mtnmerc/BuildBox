import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXq",
  authDomain: "buildbox-50322.firebaseapp.com",
  projectId: "buildbox-50322",
  storageBucket: "buildbox-50322.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// New conversational AI function
export const callOpenAI = httpsCallable(functions, 'callOpenAI');

// Legacy functions for backward compatibility
export const editWithAI = httpsCallable(functions, 'editWithAI');
export const pullRepo = httpsCallable(functions, 'pullRepo');
export const pushChanges = httpsCallable(functions, 'pushChanges');

export { app, functions }; 