import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaHome, FaCheck, FaTrash, FaPlus, FaCalendarAlt, FaClock, FaSync, FaList, FaTimes } from "react-icons/fa";

// --- IndexedDB helper ---
const openDB = () =>
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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordatorios", "readonly");
    const store = tx.objectStore("recordatorios");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveRecordatorio = async (recordatorio) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordatorios", "readwrite");
    const store = tx.objectStore("recordatorios");
    const request = store.put(recordatorio);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

const deleteRecordatorio = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordatorios", "readwrite");
    const store = tx.objectStore("recordatorios");
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

// --- Logs ---
const registrarLog = (tipo, accion) => {
  const logs = JSON.parse(localStorage.getItem("logs")) || [];
  logs.push({ tipo, accion, fecha: new Date() });
  localStorage.setItem("logs", JSON.stringify(logs));
};

// --- React App ---
function Recordatorios() {
  const [recordatorios, setRecordatorios] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  const [showForm, setShowForm] = useState(false);

  const navigate = useNavigate();

  // --- Cargar todos los recordatorios desde IndexedDB ---
  const cargarRecordatorios = async () => {
    try {
      const data = await getRecordatorios();
      setRecordatorios(data);
    } catch (err) {
      console.error("Error cargando recordatorios:", err);
      setSyncStatus(`Error cargando recordatorios: ${err.message} ❌`);
    }
  };

  // --- Sincronización inicial desde servidor ---
  const syncFromServer = async () => {
    if (!navigator.onLine) {
      setSyncStatus("Sin conexión a internet");
      return;
    }
    try {
      const res = await fetch("https://budauni.shop/api/recordatorios.php");
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();

      // Guardar todos los registros del servidor en IndexedDB
      for (let r of data) {
        await saveRecordatorio({
          id: r.id_recordatorio,
          titulo: r.titulo,
          descripcion: r.descripcion,
          fecha: r.fecha,
          hora: r.hora,
          estado: r.estado,
          pendienteSync: false,
        });
      }

      await cargarRecordatorios();
      setSyncStatus("Sincronizado con servidor ✅");
    } catch (err) {
      console.error("Error al sincronizar con servidor:", err);
      setSyncStatus(`Error al sincronizar: ${err.message} ❌`);
    }
  };

  // --- Sincronizar pendientes (POST, PUT, DELETE) ---
  const syncPending = async () => {
    const todos = await getRecordatorios();

    for (let r of todos) {
      if (r.pendienteSync === true && r.id.startsWith("temp-")) {
        try {
          const res = await fetch("https://budauni.shop/api/recordatorios.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              titulo: r.titulo,
              descripcion: r.descripcion,
              fecha: r.fecha,
              hora: r.hora,
              estado: r.estado,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const nuevoId = data.id_recordatorio;
            await saveRecordatorio({ ...r, id: nuevoId, pendienteSync: false });
            await deleteRecordatorio(r.id);
          }
        } catch (err) {
          console.log("Error sincronizando pendiente:", err);
          setSyncStatus(`Error sincronizando pendiente: ${err.message} ❌`);
        }
      } else if (r.pendienteSync === "delete") {
        try {
          const res = await fetch(`https://budauni.shop/api/recordatorios.php?id=${r.id}`, { method: "DELETE" });
          if (res.ok) await deleteRecordatorio(r.id);
        } catch (err) {
          console.log("Error eliminando pendiente:", err);
          setSyncStatus(`Error eliminando pendiente: ${err.message} ❌`);
        }
      }
    }

    await cargarRecordatorios();
  };

  // --- Efecto inicial ---
  useEffect(() => {
    const init = async () => {
      if (navigator.onLine) {
        await syncFromServer();
        await syncPending();
      }
      await cargarRecordatorios();
    };
    init();

    const handleOnline = () => {
      setOnline(true);
      syncFromServer();
      syncPending();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // --- Agregar recordatorio ---
  const handleAgregar = async () => {
    if (!titulo) return;

    const ahora = new Date();
    const fechaMySQL = ahora.toISOString().split("T")[0];
    const horaMySQL = ahora.toTimeString().split(" ")[0];

    const nuevo = {
      titulo,
      descripcion,
      fecha: fechaMySQL,
      hora: horaMySQL,
      estado: "pendiente",
      pendienteSync: !online,
      id: online ? undefined : "temp-" + Date.now(),
    };

    if (online) {
      try {
        const res = await fetch("https://budauni.shop/api/recordatorios.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevo),
        });
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const data = await res.json();
        nuevo.id = data.id_recordatorio;
        nuevo.pendienteSync = false;
        setSyncStatus("Recordatorio sincronizado con servidor ✅");
      } catch (err) {
        console.error(err);
        nuevo.id = "temp-" + Date.now();
        setSyncStatus(`Error al sincronizar: ${err.message} ❌`);
      }
    }

    await saveRecordatorio(nuevo);
    registrarLog("Recordatorio", `Se agregó "${nuevo.titulo}"`);
    await cargarRecordatorios();
    setTitulo("");
    setDescripcion("");
    setShowForm(false);
  };

  // --- Toggle estado ---
  const handleToggle = async (r) => {
    const estadoAnterior = r.estado;
    const actualizado = {
      ...r,
      estado: r.estado === "pendiente" ? "completado" : "pendiente",
      pendienteSync: !online,
    };
    await saveRecordatorio(actualizado);
    await cargarRecordatorios();
    registrarLog("Recordatorio", `Se cambió "${r.titulo}" de ${estadoAnterior} a ${actualizado.estado}`);

    if (online) {
      try {
        await fetch(`https://budauni.shop/api/recordatorios.php?id=${r.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(actualizado),
        });
        actualizado.pendienteSync = false;
        await saveRecordatorio(actualizado);
        setSyncStatus("Sincronizado con servidor ✅");
      } catch (err) {
        console.log(err);
        setSyncStatus(`Error al sincronizar: ${err.message} ❌`);
      }
    }
  };

  // --- Eliminar ---
  const handleEliminar = async (r) => {
    if (!online) {
      const pendienteEliminar = { ...r, pendienteSync: "delete" };
      await saveRecordatorio(pendienteEliminar);
      setSyncStatus("Eliminado en cache, pendiente de sincronización");
    } else {
      await deleteRecordatorio(r.id);
      try {
        await fetch(`https://budauni.shop/api/recordatorios.php?id=${r.id}`, { method: "DELETE" });
        setSyncStatus("Eliminado en servidor ✅");
      } catch (err) {
        console.log(err);
        setSyncStatus(`Error al eliminar: ${err.message} ❌`);
      }
    }

    registrarLog("Recordatorio", `Se eliminó "${r.titulo}"`);
    await cargarRecordatorios();
  };

  // --- Filtrado ---
  const recordatoriosFiltrados = recordatorios.filter(r => {
    switch (activeTab) {
      case "pendientes": return r.estado === "pendiente";
      case "completados": return r.estado === "completado";
      default: return true;
    }
  });

  // --- Contadores para badges ---
  const totalCount = recordatorios.length;
  const pendientesCount = recordatorios.filter(r => r.estado === "pendiente").length;
  const completadosCount = recordatorios.filter(r => r.estado === "completado").length;

  // --- Renderizado principal ---
  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-3">
        
        {/* Header con botón de menú y título */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <button 
            className="btn btn-outline-primary d-flex align-items-center"
            onClick={() => navigate("/menu")}
          >
            <FaHome className="me-2" />
            Menú Principal
          </button>
          <h2 className="text-primary mb-0">Mis Recordatorios</h2>
          <div className="d-flex align-items-center">
            <span className={`badge ${online ? 'bg-success' : 'bg-warning'} me-2`}>
              {online ? 'En línea' : 'Offline'}
            </span>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={syncPending}
              title="Sincronizar"
            >
              <FaSync />
            </button>
          </div>
        </div>

        {/* Estado sincronización */}
        {syncStatus && (
          <div className={`alert ${syncStatus.includes('✅') ? 'alert-success' : syncStatus.includes('❌') ? 'alert-danger' : 'alert-warning'} mb-3`}>
            {syncStatus}
          </div>
        )}

        {/* Tarjeta de estadísticas */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card text-white bg-primary">
              <div className="card-body text-center">
                <h4>{totalCount}</h4>
                <p className="mb-0">Total</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card text-white bg-warning">
              <div className="card-body text-center">
                <h4>{pendientesCount}</h4>
                <p className="mb-0">Pendientes</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card text-white bg-success">
              <div className="card-body text-center">
                <h4>{completadosCount}</h4>
                <p className="mb-0">Completados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pestañas de filtro */}
        <div className="card mb-4">
          <div className="card-header">
            <ul className="nav nav-pills card-header-pills">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'todos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('todos')}
                >
                  <FaList className="me-1" />
                  Todos <span className="badge bg-secondary ms-1">{totalCount}</span>
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'pendientes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pendientes')}
                >
                  <FaClock className="me-1" />
                  Pendientes <span className="badge bg-warning ms-1">{pendientesCount}</span>
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'completados' ? 'active' : ''}`}
                  onClick={() => setActiveTab('completados')}
                >
                  <FaCheck className="me-1" />
                  Completados <span className="badge bg-success ms-1">{completadosCount}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Botón para agregar recordatorio */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <button 
            className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'} d-flex align-items-center`}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <FaTimes className="me-2" /> : <FaPlus className="me-2" />}
            {showForm ? "Cancelar" : "Agregar recordatorio"}
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Nuevo Recordatorio</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Título *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ingresa el título del recordatorio"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={100}
                />
                <div className="form-text">{titulo.length}/100 caracteres</div>
              </div>
              <div className="mb-3">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-control"
                  placeholder="Descripción opcional del recordatorio"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows="3"
                  maxLength={500}
                />
                <div className="form-text">{descripcion.length}/500 caracteres</div>
              </div>
              <button 
                className="btn btn-success w-100 d-flex align-items-center justify-content-center"
                onClick={handleAgregar}
                disabled={!titulo.trim()}
              >
                <FaPlus className="me-2" />
                Guardar Recordatorio
              </button>
            </div>
          </div>
        )}

        {/* Lista de recordatorios */}
        {recordatoriosFiltrados.length === 0 ? (
          <div className="text-center py-5">
            <FaList className="display-1 text-muted mb-3" />
            <h4 className="text-muted">No hay recordatorios</h4>
            <p className="text-muted">
              {activeTab === 'todos' 
                ? "Comienza agregando tu primer recordatorio" 
                : `No hay recordatorios ${activeTab}`
              }
            </p>
            {activeTab !== 'todos' && (
              <button 
                className="btn btn-primary"
                onClick={() => setActiveTab('todos')}
              >
                Ver todos los recordatorios
              </button>
            )}
          </div>
        ) : (
          <div className="row">
            {recordatoriosFiltrados.map(r => (
              <div key={r.id} className="col-md-6 col-lg-4 mb-3">
                <div className={`card h-100 shadow-sm border-${r.estado === 'completado' ? 'success' : 'warning'}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="card-title">{r.titulo}</h5>
                      <span className={`badge bg-${r.estado === 'completado' ? 'success' : 'warning'}`}>
                        {r.estado === 'completado' ? 'Completado' : 'Pendiente'}
                      </span>
                    </div>
                    {r.descripcion && (
                      <p className="card-text text-muted">{r.descripcion}</p>
                    )}
                    <div className="d-flex align-items-center text-muted small mb-3">
                      <FaCalendarAlt className="me-1" />
                      <span className="me-3">{r.fecha}</span>
                      <FaClock className="me-1" />
                      <span>{r.hora}</span>
                    </div>
                    <div className="btn-group w-100">
                      <button 
                        className={`btn btn-sm ${r.estado === 'completado' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                        onClick={() => handleToggle(r)}
                        title={r.estado === 'completado' ? 'Marcar como pendiente' : 'Marcar como completado'}
                      >
                        <FaCheck />
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleEliminar(r)}
                        title="Eliminar recordatorio"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Recordatorios;