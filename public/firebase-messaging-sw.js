// public/firebase-messaging-sw.js

// Importa Firebase (versión compat usada por FCM en SW)
importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js");

// Configuración de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyBu61U8GYYAMxT3vcjanMglpo9s6tnxBTw",
  authDomain: "rercordatorios.firebaseapp.com",
  projectId: "rercordatorios",
  storageBucket: "rercordatorios.firebasestorage.app",
  messagingSenderId: "55717327510",
  appId: "1:55717327510:web:a08fe9e7f59444861ac8b7",
  measurementId: "G-WZCJLSGWWY"
};

// Inicializa Firebase en el SW
firebase.initializeApp(firebaseConfig);

// Inicializa Messaging (obligatorio para recibir en background)
const messaging = firebase.messaging();

// Evento cuando llega una notificación con la app cerrada o en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("📩 Notificación recibida en background:", payload);

  const notificationTitle = payload.notification?.title || "Nuevo mensaje";
  const notificationOptions = {
    body: payload.notification?.body || "Tienes una nueva notificación",
    icon: "/Icono.png"  // Asegúrate de que exista en /public
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
