import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// --- Helpers de IndexedDB (solo ejemplo simplificado) ---
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

function Menu() {
  const [user, setUser] = useState(null);
  const [recordatorios, setRecordatorios] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const navigate = useNavigate();

  // --- Cargar usuario ---
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // --- Cargar recordatorios y pendientes ---
  useEffect(() => {
    const fetchData = async () => {
      const todos = await getRecordatorios();

      const hoy = new Date();
      const proximosRecordatorios = todos
        .filter((r) => r.estado === "pendiente")
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      const proximosPendientes = todos
        .filter((r) => r.estado === "pendiente")
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      setRecordatorios(proximosRecordatorios);
      setPendientes(proximosPendientes);
    };
    fetchData();
  }, []);

  // --- Vista cuando no hay usuario cargado ---
  if (!user) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <h4 className="text-muted mt-3">Cargando datos del usuario...</h4>
      </div>
    );
  }

  // --- Vista principal ---
  return (
    <div className="container-fluid bg-light min-vh-100 py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10 col-xl-8">
          
          {/* Header con usuario y logout */}
          <div className="d-flex justify-content-between align-items-center mb-5 p-4 bg-white rounded-3 shadow-sm">
            <div className="d-flex align-items-center">
              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                   style={{width: '50px', height: '50px', fontSize: '1.2rem', fontWeight: 'bold'}}>
                {user.nombre ? user.nombre.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <h2 className="fw-bold mb-1">Hola, {user.nombre || "Usuario"} 👋</h2>
                <p className="text-muted mb-0">Bienvenido a tu panel de control</p>
              </div>
            </div>
            <button 
              className="btn btn-outline-danger d-flex align-items-center"
              onClick={() => { localStorage.removeItem("user"); navigate("/login"); }}
            >
              <i className="bi bi-box-arrow-right me-2"></i>
              Cerrar sesión
            </button>
          </div>

          {/* Botones de navegación principales */}
          <div className="row g-4 mb-5">
            <div className="col-md-4">
              <div 
                className="card border-0 shadow-sm h-100 hover-card cursor-pointer"
                onClick={() => navigate("/app")}
                style={{cursor: 'pointer'}}
              >
                <div className="card-body text-center p-4">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{width: '70px', height: '70px'}}>
                    <span className="fs-2">📅</span>
                  </div>
                  <h5 className="card-title fw-bold">Recordatorios</h5>
                  <p className="text-muted">Gestiona tus eventos y recordatorios</p>
                  <div className="badge bg-primary">
                    {recordatorios.length} activos
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div 
                className="card border-0 shadow-sm h-100 hover-card cursor-pointer"
                onClick={() => navigate("/pendientes")}
                style={{cursor: 'pointer'}}
              >
                <div className="card-body text-center p-4">
                  <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{width: '70px', height: '70px'}}>
                    <span className="fs-2">📌</span>
                  </div>
                  <h5 className="card-title fw-bold">Pendientes</h5>
                  <p className="text-muted">Organiza tus tareas pendientes</p>
                  <div className="badge bg-warning text-dark">
                    {pendientes.length} pendientes
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div 
                className="card border-0 shadow-sm h-100 hover-card cursor-pointer"
                onClick={() => navigate("/notificaciones")}
                style={{cursor: 'pointer'}}
              >
                <div className="card-body text-center p-4">
                  <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{width: '70px', height: '70px'}}>
                    <span className="fs-2">🔔</span>
                  </div>
                  <h5 className="card-title fw-bold">Notificaciones</h5>
                  <p className="text-muted">Revisa tus alertas</p>
                  <div className="badge bg-info">
                    {recordatorios.length + pendientes.length} total
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard con información resumida */}
          <div className="row g-4">
            
            {/* Próximos Recordatorios */}
            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold">📌 Próximos Recordatorios</h6>
                  <span className="badge bg-white text-primary">{recordatorios.length}</span>
                </div>
                <div className="card-body">
                  {recordatorios.slice(0, 3).map((r) => (
                    <div key={r.id} className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                      <div>
                        <strong className="d-block">{r.titulo}</strong>
                        <small className="text-muted">{r.fecha}</small>
                      </div>
                      <span className="badge bg-primary bg-opacity-10 text-primary">Próximo</span>
                    </div>
                  ))}
                  {recordatorios.length === 0 && (
                    <p className="text-muted text-center mb-0">No hay recordatorios próximos</p>
                  )}
                  {recordatorios.length > 3 && (
                    <button 
                      className="btn btn-sm btn-outline-primary w-100 mt-2"
                      onClick={() => navigate("/app")}
                    >
                      Ver todos ({recordatorios.length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Próximos Pendientes */}
            <div className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold">📋 Próximos Pendientes</h6>
                  <span className="badge bg-dark text-warning">{pendientes.length}</span>
                </div>
                <div className="card-body">
                  {pendientes.slice(0, 3).map((p) => (
                    <div key={p.id} className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                      <div>
                        <strong className="d-block">{p.titulo}</strong>
                        <small className="text-muted">{p.fecha}</small>
                      </div>
                      <span className="badge bg-warning bg-opacity-10 text-dark">Pendiente</span>
                    </div>
                  ))}
                  {pendientes.length === 0 && (
                    <p className="text-muted text-center mb-0">No hay pendientes próximos</p>
                  )}
                  {pendientes.length > 3 && (
                    <button 
                      className="btn btn-sm btn-outline-warning w-100 mt-2"
                      onClick={() => navigate("/pendientes")}
                    >
                      Ver todos ({pendientes.length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Calendario de Pendientes */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold">🗓️ Calendario de Pendientes</h6>
                  <span className="badge bg-white text-success">{pendientes.length}</span>
                </div>
                <div className="card-body">
                  {pendientes.slice(0, 5).map((p) => (
                    <div key={p.id} className="d-flex align-items-center border-bottom pb-2 mb-2">
                      <div className="bg-success bg-opacity-10 rounded p-2 me-3 text-center" style={{minWidth: '60px'}}>
                        <small className="text-success fw-bold d-block">{new Date(p.fecha).getDate()}</small>
                        <small className="text-muted">
                          {new Date(p.fecha).toLocaleDateString('es-ES', { month: 'short' })}
                        </small>
                      </div>
                      <div className="flex-grow-1">
                        <strong>{p.titulo}</strong>
                      </div>
                    </div>
                  ))}
                  {pendientes.length === 0 && (
                    <p className="text-muted text-center mb-0">No hay pendientes programados</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notificaciones Resumidas */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold">🔔 Notificaciones Recientes</h6>
                  <span className="badge bg-white text-info">
                    {recordatorios.slice(0, 2).length + pendientes.slice(0, 2).length}
                  </span>
                </div>
                <div className="card-body">
                  {recordatorios.slice(0, 2).map((r) => (
                    <div key={r.id} className="d-flex align-items-center border-bottom pb-2 mb-2">
                      <span className="badge bg-primary me-2">R</span>
                      <div>
                        <strong>Recordatorio:</strong> {r.titulo}
                      </div>
                    </div>
                  ))}
                  {pendientes.slice(0, 2).map((p) => (
                    <div key={p.id} className="d-flex align-items-center border-bottom pb-2 mb-2">
                      <span className="badge bg-warning me-2">P</span>
                      <div>
                        <strong>Pendiente:</strong> {p.titulo}
                      </div>
                    </div>
                  ))}
                  {recordatorios.length === 0 && pendientes.length === 0 && (
                    <p className="text-muted text-center mb-0">No hay notificaciones recientes</p>
                  )}
                  {(recordatorios.length > 0 || pendientes.length > 0) && (
                    <button 
                      className="btn btn-sm btn-outline-info w-100 mt-2"
                      onClick={() => navigate("/notificaciones")}
                    >
                      Ver todas las notificaciones
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hover-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .min-vh-100 {
          min-height: 100vh;
        }
      `}</style>
    </div>
  );
}

export default Menu;