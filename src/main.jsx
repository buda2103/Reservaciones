import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login.jsx";
import Menu from "./menu.jsx";
import App from "./App.jsx";
import Pendientes from "./Pendientes.jsx";
import Notificaciones from "./Notificaciones.jsx";
import "./index.css";

import { getToken } from "firebase/messaging";
import { messaging } from "./firebase"; // tu config de Firebase
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Componente que obtiene y muestra el token FCM ---
function ObtenerToken() {
  React.useEffect(() => {
    async function pedirToken() {
      try {
        const token = await getToken(messaging, {
          vapidKey: "BIUqz_rAb0wZWJW34gsUtZCEdLeGGNysoVnDZ9xIlLZ-KVGLqYQ-o7dt79u3t8nFdcykuNfCahohxfwiV2TpObA"
        });
        if (token) console.log("🔑 Token FCM de este dispositivo:", token);
        else console.log("No se pudo obtener token. Revisa permisos y SW.");
      } catch (err) {
        console.error("Error obteniendo token FCM:", err);
      }
    }

    pedirToken();
  }, []);

  return null;
}

const Root = () => (
  <>
    {/* Componente para obtener token al iniciar la app */}
    <ObtenerToken />

    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/app" element={<App />} />
        <Route path="/pendientes" element={<Pendientes />} />
        <Route path="/notificaciones" element={<Notificaciones />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>

    <ToastContainer />
  </>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

// --- Registrar Service Worker solo en producción ---
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js") // Asegúrate de que sea firebase-messaging-sw.js
      .then((reg) => console.log("SW de Firebase registrado ✅", reg))
      .catch((err) => console.log("Error al registrar SW ❌", err));
  });
}
