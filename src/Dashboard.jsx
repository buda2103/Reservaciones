import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Legend } from "recharts";
import { useNavigate } from "react-router-dom";

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

// --- Dashboard ---
const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

function Dashboard() {
  const navigate = useNavigate();
  const [recordatorios, setRecordatorios] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [syncStatus, setSyncStatus] = useState("");

  // Cargar recordatorios desde IndexedDB
  const cargarRecordatorios = async () => {
    const data = await getRecordatorios();
    setRecordatorios(data);
  };

  // Sincronizar recordatorios pendientes con el servidor
  const syncPending = async () => {
    const todos = await getRecordatorios();

    for (let r of todos) {
      if (r.pendienteSync === true) {
        try {
          const res = await fetch("https://khaki-reindeer-695805.hostingersite.com/api/recordatorios.php", {
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
            await deleteRecordatorio(r.id);
            r.id = data.id_recordatorio;
            r.pendienteSync = false;
            await saveRecordatorio(r);
          }
        } catch (err) {
          console.log("Error sincronizando pendiente:", err);
        }
      } else if (r.pendienteSync === "delete") {
        try {
          const res = await fetch(`https://khaki-reindeer-695805.hostingersite.com/api/recordatorios.php?id=${r.id}`, {
            method: "DELETE",
          });
          if (res.ok) await deleteRecordatorio(r.id);
        } catch (err) {
          console.log("Error eliminando pendiente:", err);
        }
      }
    }

    await cargarRecordatorios();
  };

  // Sincronizar desde servidor a IndexedDB
  const syncFromServer = async () => {
    if (!navigator.onLine) return;
    try {
      const res = await fetch("https://khaki-reindeer-695805.hostingersite.com/api/recordatorios.php");
      if (!res.ok) throw new Error("Error al obtener datos del servidor");
      const data = await res.json();

      const locales = await getRecordatorios();
      const idsLocales = locales.map((r) => r.id);

      for (let r of data) {
        if (!idsLocales.includes(r.id_recordatorio)) {
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
      }

      await cargarRecordatorios();
      setSyncStatus("✅ Sincronizado con servidor");
    } catch (err) {
      console.log(err);
      setSyncStatus("❌ Error al sincronizar");
    }
  };

  useEffect(() => {
    cargarRecordatorios();

    const handleOnline = () => {
      syncPending();
      syncFromServer();
    };
    const handleOffline = () => setSyncStatus("⚠️ Sin conexión");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Filtrar recordatorios
  const filtrarRecordatorios = () => {
    if (filtro === "todos") return recordatorios;
    return recordatorios.filter((r) => r.estado === filtro);
  };

  const resumenGrafica = () => {
    const pendientes = recordatorios.filter((r) => r.estado === "pendiente").length;
    const completados = recordatorios.filter((r) => r.estado === "completado").length;
    return [
      { name: "Pendientes", value: pendientes },
      { name: "Completados", value: completados },
    ];
  };

  return (
    <div className="container m-5">
      <header className="d-flex justify-content-between align-items-center mb-4">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={() => navigate("/login")}>
          Iniciar sesión
        </button>
      </header>

      <div className="mb-3">
        <label>Filtrar:</label>
        <select
          className="form-select w-25"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="completado">Completados</option>
        </select>
      </div>

      <div className="row mb-5">
        {filtrarRecordatorios().map((r) => (
          <div key={r.id} className="col-md-4 mb-3">
            <div
              className={`card p-3 ${
                r.estado === "pendiente" ? "border-warning" : "border-success"
              }`}
            >
              <h5>{r.titulo}</h5>
              <p>Estado: {r.estado}</p>
            </div>
          </div>
        ))}
      </div>

      <h3>Resumen</h3>
      <PieChart width={400} height={300}>
        <Pie
          data={resumenGrafica()}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {resumenGrafica().map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Legend />
      </PieChart>

      <div className="mt-3">Estado sincronización: {syncStatus}</div>
    </div>
  );
}

export default Dashboard;
