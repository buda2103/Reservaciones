importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

firebase.initializeApp({
  apiKey: "AIzaSyBfnmTIGPa2dzp8v9iZEWoyDfFh6HoFX2Y",
  authDomain: "recordatorios-1b7cb.firebaseapp.com",
  projectId: "recordatorios-1b7cb",
  storageBucket: "recordatorios-1b7cb.appspot.com",
  messagingSenderId: "428905183130",
  appId: "1:428905183130:web:fdcdc0547521f0a6beedaa",
});

const messaging = firebase.messaging();

/* 👉 MUY IMPORTANTE: manejar mensajes en segundo plano */
messaging.setBackgroundMessageHandler((payload) => {
  console.log("📲 Notificación recibida en segundo plano:", payload);

  const title = payload.notification.title;
  const options = {
    body: payload.notification.body,
    icon: "/Icono.png",
  };

  return self.registration.showNotification(title, options);
});
