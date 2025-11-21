import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaCheck, FaTrash, FaPlus, FaHome, FaExclamationTriangle, FaCalendarAlt } from "react-icons/fa";

// --- API CORREGIDA ---
const API_URL = "https://budauni.shop/api/pendientes.php";

// --- IndexedDB helper para Pendientes ---
const openDB = () =>
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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendientes", "readonly");
    const store = tx.objectStore("pendientes");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const savePendiente = async (pendiente) => {
  if (!pendiente.id) pendiente.id = "temp-" + Date.now();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendientes", "readwrite");
    const store = tx.objectStore("pendientes");
    const request = store.put(pendiente);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

const deletePendienteDB = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendientes", "readwrite");
    const store = tx.objectStore("pendientes");
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

// --- Función para registrar logs ---
const registrarLog = (tipo, accion) => {
  const logs = JSON.parse(localStorage.getItem("logs")) || [];
  logs.push({ tipo, accion, fecha: new Date() });
  localStorage.setItem("logs", JSON.stringify(logs));
};

// --- React App Pendientes ---
function Pendientes() {
  const [pendientes, setPendientes] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  const [showForm, setShowForm] = useState(false);

  const navigate = useNavigate();

  const cargarPendientes = async () => {
    const data = await getPendientes();
    setPendientes(data);
  };

  // --- Sincronización CORREGIDA ---
  const syncPending = async () => {
    const todos = await getPendientes();
    for (let p of todos) {
      // Pendientes nuevos o actualizados
      if (p.pendienteSync && p.id.startsWith("temp-")) {
        try {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              titulo: p.titulo,
              descripcion: p.descripcion,
              fecha_limite: p.fecha_limite,
              estado: p.estado,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const nuevoId = data.id_pendiente;
            await savePendiente({ ...p, id: nuevoId, pendienteSync: false });
            await deletePendienteDB(p.id);
          }
        } catch (err) {
          console.log("Error sincronizando pendiente:", err);
        }
      }

      // Pendientes eliminados
      if (p.pendienteDelete) {
        try {
          const res = await fetch(`${API_URL}?id=${p.id}`, { method: "DELETE" });
          if (res.ok) await deletePendienteDB(p.id);
        } catch (err) {
          console.log("Error eliminando pendiente:", err);
        }
      }
    }
    await cargarPendientes();
  };

  const syncFromServer = async () => {
    if (!navigator.onLine) return;

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Error al obtener datos del servidor");
      const data = await res.json();
      const locales = await getPendientes();
      const idsLocales = locales.map((p) => p.id);

      // CORRECCIÓN: data es un array directo, no data.pendientes
      for (let p of data) {
        if (!idsLocales.includes(p.id_pendiente)) {
          await savePendiente({
            id: p.id_pendiente,
            titulo: p.titulo,
            descripcion: p.descripcion,
            fecha_limite: p.fecha_limite,
            estado: p.estado,
            pendienteSync: false,
          });
        }
      }
      await cargarPendientes();
      setSyncStatus("Sincronizado con servidor");
    } catch (err) {
      console.log("Error sincronizando:", err);
      setSyncStatus("Error al sincronizar");
    }
  };

  useEffect(() => {
    const init = async () => {
      await cargarPendientes();
      await syncFromServer();
    };
    init();

    const handleOnline = () => {
      setOnline(true);
      syncPending();
      syncFromServer();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // --- CRUD CORREGIDO ---
  const handleAgregar = async () => {
    if (!titulo || !fechaLimite) return;

    const nuevo = {
      titulo,
      descripcion,
      fecha_limite: fechaLimite,
      estado: "pendiente",
      pendienteSync: !online,
      pendienteDelete: false,
      id: online ? undefined : "temp-" + Date.now(),
    };

    if (online) {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevo),
        });
        const data = await res.json();
        nuevo.id = data.id_pendiente;
        nuevo.pendienteSync = false;
        setSyncStatus("Sincronizado con servidor");
      } catch (err) {
        console.log("Error guardando:", err);
        nuevo.id = "temp-" + Date.now();
        setSyncStatus("Guardado solo en cache");
      }
    }

    await savePendiente(nuevo);
    registrarLog("Pendiente", `Se agregó "${nuevo.titulo}"`);
    await cargarPendientes();
    setTitulo("");
    setDescripcion("");
    setFechaLimite("");
    setShowForm(false);
  };

  const handleToggle = async (p) => {
    const actualizado = { 
      ...p, 
      estado: p.estado === "pendiente" ? "completado" : "pendiente", 
      pendienteSync: !online 
    };
    await savePendiente(actualizado);
    await cargarPendientes();

    registrarLog("Pendiente", `Se cambió "${p.titulo}" a ${actualizado.estado}`);

    if (online) {
      try {
        await fetch(`${API_URL}?id=${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(actualizado),
        });
        actualizado.pendienteSync = false;
        await savePendiente(actualizado);
        setSyncStatus("Sincronizado con servidor");
      } catch (err) {
        console.log("Error actualizando:", err);
        setSyncStatus("Error al sincronizar");
      }
    }
  };

  const handleEliminar = async (p) => {
    if (!online) {
      const pendienteEliminar = { ...p, pendienteDelete: true };
      await savePendiente(pendienteEliminar);
      setSyncStatus("Eliminado en cache, pendiente de sincronización");
    } else {
      await deletePendienteDB(p.id);
      try {
        await fetch(`${API_URL}?id=${p.id}`, { method: "DELETE" });
        setSyncStatus("Eliminado en servidor");
      } catch {
        setSyncStatus("Error al eliminar");
      }
    }

    registrarLog("Pendiente", `Se eliminó "${p.titulo}"`);
    await cargarPendientes();
  };

  // --- Filtrado ---
  const pendientesFiltrados = pendientes.filter((p) => {
    switch (activeTab) {
      case "pendientes":
        return p.estado === "pendiente";
      case "completados":
        return p.estado === "completado";
      default:
        return true;
    }
  });

  const pendientesCount = pendientes.filter((p) => p.estado === "pendiente").length;
  const completadosCount = pendientes.filter((p) => p.estado === "completado").length;

  const hoy = new Date();
  const pendientesProximos = pendientes.filter((p) => {
    if (p.estado === "completado") return false;
    const fechaLimite = new Date(p.fecha_limite);
    const diffTime = fechaLimite - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });

  // --- Render ---
  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-warning text-dark shadow-sm">
        <div className="container py-4">
          <div className="row align-items-center">
            <div className="col">
              <div className="d-flex align-items-center">
                <div className="bg-dark bg-opacity-10 rounded-circle p-3 me-3">
                  <FaExclamationTriangle className="fs-2 text-dark" />
                </div>
                <div>
                  <h1 className="h3 mb-1 fw-bold">Pendientes</h1>
                  <p className="mb-0 opacity-75">Organiza y gestiona tus tareas pendientes</p>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="d-flex gap-2">
                <button className="btn btn-dark btn-lg d-flex align-items-center" onClick={() => navigate("/menu")}>
                  <FaHome className="me-2" /> Menú
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-bottom">
        <div className="container py-3">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center">
                <div className={`badge ${online ? "bg-success" : "bg-danger"} me-2`}>
                  {online ? "🟢" : "🔴"}
                </div>
                <span className="fw-medium">{online ? "Conectado" : "Desconectado"}</span>
                <span className="mx-2 text-muted">•</span>
                <span className="text-muted">{syncStatus}</span>
              </div>
            </div>
            <div className="col-md-6 text-md-end">
              <div className="text-muted">
                Total: <strong>{pendientes.length}</strong> | Pendientes: <strong className="text-warning">{pendientesCount}</strong> | Completados: <strong className="text-success">{completadosCount}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-4">
        <div className="row">
          {/* Sidebar */}
          <div className="col-lg-3 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 py-3">
                <h6 className="mb-0 fw-bold">Acciones Rápidas</h6>
              </div>
              <div className="card-body p-3">
                <button
                  className="btn btn-warning w-100 mb-3 d-flex align-items-center justify-content-center py-3"
                  onClick={() => setShowForm(!showForm)}
                  style={{ borderRadius: "12px" }}
                >
                  <FaPlus className="me-2" /> Nuevo Pendiente
                </button>

                {pendientesCount > 0 && (
                  <button
                    className="btn btn-success w-100 mb-3 d-flex align-items-center justify-content-center py-3"
                    onClick={async () => {
                      for (let p of pendientes.filter((p) => p.estado === "pendiente")) {
                        await handleToggle(p);
                      }
                    }}
                    style={{ borderRadius: "12px" }}
                  >
                    <FaCheck className="me-2" /> Marcar todos como completados
                  </button>
                )}

                {pendientesProximos.length > 0 && (
                  <div className="alert alert-warning border-0" style={{ borderRadius: "12px" }}>
                    <small>
                      <FaExclamationTriangle className="me-1" />
                      <strong>{pendientesProximos.length}</strong> pendiente(s) próximo(s) a vencer
                    </small>
                  </div>
                )}

                <div className="mt-3">
                  <h6 className="text-muted mb-2">Resumen</h6>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Pendientes:</span>
                    <strong className="text-warning">{pendientesCount}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Completados:</span>
                    <strong className="text-success">{completadosCount}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Total:</span>
                    <strong>{pendientes.length}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Area */}
          <div className="col-lg-9">
            {showForm && (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-warning text-dark py-3">
                  <h6 className="mb-0 fw-bold">➕ Crear Nuevo Pendiente</h6>
                </div>
                <div className="card-body p-4">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Título *</label>
                      <input
                        className="form-control border-0 bg-light"
                        placeholder="¿Qué necesitas hacer?"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        style={{ borderRadius: "10px" }}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Fecha Límite *</label>
                      <input
                        type="date"
                        className="form-control border-0 bg-light"
                        value={fechaLimite}
                        onChange={(e) => setFechaLimite(e.target.value)}
                        style={{ borderRadius: "10px" }}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Descripción</label>
                    <textarea
                      className="form-control border-0 bg-light"
                      placeholder="Detalles adicionales..."
                      rows="3"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      style={{ borderRadius: "10px", resize: "none" }}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-warning fw-bold border-0 flex-fill"
                      onClick={handleAgregar}
                      disabled={!titulo.trim() || !fechaLimite}
                      style={{ borderRadius: "10px" }}
                    >
                      <FaPlus className="me-2" /> Guardar Pendiente
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setShowForm(false)}
                      style={{ borderRadius: "10px" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="card border-0 shadow-lg">
              <div className="card-header bg-white border-0 py-3">
                <ul className="nav nav-pills nav-fill">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === "todos" ? "active bg-warning" : "text-dark"}`}
                      onClick={() => setActiveTab("todos")}
                      style={{ borderRadius: "10px", margin: "0 2px" }}
                    >
                      Todos ({pendientes.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === "pendientes" ? "active bg-warning" : "text-dark"}`}
                      onClick={() => setActiveTab("pendientes")}
                      style={{ borderRadius: "10px", margin: "0 2px" }}
                    >
                      Pendientes ({pendientesCount})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === "completados" ? "active bg-warning" : "text-dark"}`}
                      onClick={() => setActiveTab("completados")}
                      style={{ borderRadius: "10px", margin: "0 2px" }}
                    >
                      Completados ({completadosCount})
                    </button>
                  </li>
                </ul>
              </div>
              <div className="card-body p-4">
                {pendientesFiltrados.length === 0 ? (
                  <div className="text-center text-muted py-5">No hay pendientes aquí.</div>
                ) : (
                  pendientesFiltrados.map((p) => (
                    <div key={p.id} className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                      <div>
                        <h6 className={`mb-1 fw-bold ${p.estado === "completado" ? "text-success text-decoration-line-through" : ""}`}>{p.titulo}</h6>
                        {p.descripcion && <small className="text-muted d-block">{p.descripcion}</small>}
                        <small className="text-muted d-block">
                          <FaCalendarAlt className="me-1" />
                          {p.fecha_limite}
                        </small>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => handleToggle(p)}>
                          <FaCheck />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleEliminar(p)}>
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pendientes;