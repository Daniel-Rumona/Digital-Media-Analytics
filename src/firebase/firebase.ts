// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBJsahAeP0o2zdSX6syxROrshf8AQqKpg4",
  authDomain: "digital-media-analytics-e9a0e.firebaseapp.com",
  projectId: "digital-media-analytics-e9a0e",
  storageBucket: "digital-media-analytics-e9a0e.firebasestorage.app",
  messagingSenderId: "395462720140",
  appId: "1:395462720140:web:aba2df377fdb553d58d9a9",
  measurementId: "G-BB1GFEYCEX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
