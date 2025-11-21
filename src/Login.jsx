import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// --- IndexedDB Helper ---
const openDB = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("UsuariosDB", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("usuarios")) {
        const store = db.createObjectStore("usuarios", { keyPath: "correo" });
        store.createIndex("correo", "correo", { unique: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const saveUsuario = async (usuario) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("usuarios", "readwrite");
    const store = tx.objectStore("usuarios");
    const request = store.put(usuario);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

const getUsuario = async (correo) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("usuarios", "readonly");
    const store = tx.objectStore("usuarios");
    const request = store.get(correo);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- Login Component ---
function Login() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  // --- Sincronización automática ---
  const syncUsuariosPendientes = async () => {
    if (!navigator.onLine) return;
    const db = await openDB();
    const tx = db.transaction("usuarios", "readonly");
    const store = tx.objectStore("usuarios");

    store.openCursor().onsuccess = async (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const usuario = cursor.value;
        if (usuario.pendienteSync) {
          try {
            const res = await fetch("https://budauni.shop/api/register.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nombre: usuario.nombre,
                correo: usuario.correo,
                contrasena: usuario.contrasena,
              }),
            });
            if (res.ok) {
              usuario.pendienteSync = false;
              await saveUsuario(usuario);
              console.log(`✅ Usuario sincronizado: ${usuario.correo}`);
            }
          } catch (err) {
            console.error("⚠️ Error sincronizando usuario:", err);
          }
        }
        cursor.continue();
      }
    };
  };

  useEffect(() => {
    window.addEventListener("online", syncUsuariosPendientes);
    syncUsuariosPendientes();
    return () => window.removeEventListener("online", syncUsuariosPendientes);
  }, []);

  // --- Manejo de inicio de sesión ---
  const handleLogin = async () => {
    if (!correo || !contrasena)
      return setStatus("⚠️ Por favor completa todos los campos.");

    if (navigator.onLine) {
      try {
        const res = await fetch("https://budauni.shop/api/login.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo, contrasena }),
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Login fallido");

        setStatus("✅ Sesión iniciada (Online)");
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/menu"); // redirige al menú
      } catch (err) {
        console.error(err);
        setStatus("❌ Error al iniciar sesión online.");
      }
    } else {
      const usuario = await getUsuario(correo);
      if (usuario && usuario.contrasena === contrasena) {
        setStatus("✅ Sesión iniciada (Offline)");
        localStorage.setItem("user", JSON.stringify(usuario));
        navigate("/menu"); // redirige al menú
      } else {
        setStatus("⚠️ Offline: usuario no encontrado o contraseña incorrecta.");
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const getStatusClass = () => {
    if (status.includes("✅")) return "text-success";
    if (status.includes("❌") || status.includes("⚠️")) return "text-danger";
    return "text-muted";
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div 
        className="container p-4 shadow rounded bg-white"
        style={{ 
          maxWidth: 450,
          border: 'none',
          borderRadius: '15px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1) !important'
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div 
            className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: '70px', height: '70px' }}
          >
            <span className="text-white fs-4">🔐</span>
          </div>
          <h2 className="fw-bold text-primary mb-2">Iniciar Sesión</h2>
          <p className="text-muted">Accede a tu cuenta</p>
        </div>

        {/* Formulario */}
        <div className="mb-3">
          <label className="form-label fw-semibold text-dark">Correo Electrónico</label>
          <input
            type="email"
            placeholder="usuario@ejemplo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            onKeyPress={handleKeyPress}
            className="form-control form-control-lg border-1"
            style={{ 
              borderRadius: '10px',
              borderColor: '#e0e0e0',
              padding: '12px 16px'
            }}
          />
        </div>

        <div className="mb-4">
          <label className="form-label fw-semibold text-dark">Contraseña</label>
          <input
            type="password"
            placeholder="Ingresa tu contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            onKeyPress={handleKeyPress}
            className="form-control form-control-lg border-1"
            style={{ 
              borderRadius: '10px',
              borderColor: '#e0e0e0',
              padding: '12px 16px'
            }}
          />
        </div>

        {/* Botón de Login */}
        <button 
          className="btn btn-primary w-100 py-3 fw-bold border-0 mb-3"
          onClick={handleLogin}
          disabled={!correo || !contrasena}
          style={{ 
            borderRadius: '12px',
            fontSize: '1.1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            transition: 'all 0.3s ease',
            opacity: (!correo || !contrasena) ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (correo && contrasena) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (correo && contrasena) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }
          }}
        >
          Iniciar Sesión
        </button>

        {/* Estado de conexión */}
        <div className="text-center mb-3">
          <small className={`badge ${navigator.onLine ? 'bg-success' : 'bg-warning'} px-3 py-2`}>
            {navigator.onLine ? '🟢 Conectado' : '🟡 Modo Offline'}
          </small>
        </div>

        {/* Mensaje de estado */}
        {status && (
          <div 
            className={`alert ${getStatusClass().replace('text-', 'alert-')} text-center border-0 mb-0`}
            style={{ borderRadius: '10px' }}
          >
            <strong>{status}</strong>
          </div>
        )}

        {/* Información adicional */}
        <div className="text-center mt-4 pt-3 border-top">
          <small className="text-muted">
            ¿Problemas para acceder?{" "}
            <a 
              href="#" 
              className="text-primary text-decoration-none fw-medium"
              onClick={(e) => {
                e.preventDefault();
                // Aquí puedes agregar funcionalidad de recuperación
                setStatus("ℹ️ Funcionalidad de recuperación en desarrollo");
              }}
            >
              Contactar soporte
            </a>
          </small>
        </div>
      </div>
    </div>
  );
}

export default Login;
