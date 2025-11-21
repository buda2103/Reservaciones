
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBu61U8GYYAMxT3vcjanMglpo9s6tnxBTw",
  authDomain: "rercordatorios.firebaseapp.com",
  projectId: "rercordatorios",
  storageBucket: "rercordatorios.firebasestorage.app",
  messagingSenderId: "55717327510",
  appId: "1:55717327510:web:a08fe9e7f59444861ac8b7",
  measurementId: "G-WZCJLSGWWY"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const messaging = getMessaging(app);