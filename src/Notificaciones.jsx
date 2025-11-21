import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

// --- Helpers IndexedDB Pendientes ---
const openPendientesDB = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("PendientesDB", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("pendientes")) {
        db.createObjectStore("pendientes", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getPendientes = async () => {
  const db = await openPendientesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendientes", "readonly");
    const store = tx.objectStore("pendientes");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- Helpers IndexedDB Recordatorios ---
const openRecordatoriosDB = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("RecordatoriosDB", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("recordatorios")) {
        db.createObjectStore("recordatorios", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getRecordatorios = async () => {
  const db = await openRecordatoriosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordatorios", "readonly");
    const store = tx.objectStore("recordatorios");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- Componente Notificaciones ---
function Notificaciones() {
  const [user, setUser] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [recordatorios, setRecordatorios] = useState([]);
  const navigate = useNavigate();

  // --- Cargar usuario ---
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Error leyendo usuario:", err);
        // opcional: podrías mostrar mensaje en vez de redirigir
      }
    }
  }, []);

  // --- Cargar datos de IndexedDB ---
  useEffect(() => {
    const cargarDatos = async () => {
      const p = await getPendientes();
      const r = await getRecordatorios();
      setPendientes(p);
      setRecordatorios(r);
    };
    cargarDatos();
  }, []);

  if (!user) {
    return (
      <div className="container mt-5 text-center">
        <h4 className="text-muted">Cargando datos del usuario...</h4>
      </div>
    );
  }

  return (
    <div className="container my-5">
      <div className="d-flex justify-content-between mb-4">
        <h2>🔔 Notificaciones de {user.nombre}</h2>
        <button className="btn btn-dark" onClick={() => navigate("/menu")}>
          🏠 Volver al Menú
        </button>
      </div>

      {/* Pendientes */}
      <div className="card mb-4 shadow-sm p-3">
        <h5>Pendientes</h5>
        {pendientes.length === 0 ? (
          <p className="text-muted">No hay movimientos en pendientes.</p>
        ) : (
          pendientes
            .slice()
            .reverse()
            .map((p) => (
              <div
                key={p.id}
                className={`alert alert-${p.estado === "completado" ? "success" : "primary"} py-2`}
              >
                <strong>{p.titulo}</strong> — {p.descripcion || "Sin descripción"} (
                {p.estado})
              </div>
            ))
        )}
      </div>

      {/* Recordatorios */}
      <div className="card mb-4 shadow-sm p-3">
        <h5>Recordatorios</h5>
        {recordatorios.length === 0 ? (
          <p className="text-muted">No hay movimientos en recordatorios.</p>
        ) : (
          recordatorios
            .slice()
            .reverse()
            .map((r) => (
              <div
                key={r.id}
                className={`alert alert-${r.estado === "completado" ? "success" : "info"} py-2`}
              >
                <strong>{r.titulo}</strong> — {r.descripcion || "Sin descripción"} ({r.fecha}{" "}
                {r.hora}) [{r.estado}]
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default Notificaciones;
