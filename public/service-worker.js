const CACHE_NAME = "recordatorios-cache-v1";
const urlsToCache = [
  "/RecordatoriosBuild/", // index
  "/RecordatoriosBuild/index.html",
  "/RecordatoriosBuild/assets/index.js",  // cambiar por tu JS real
  "/RecordatoriosBuild/assets/index.css", // cambiar por tu CSS real
  "/RecordatoriosBuild/assets/calendario.png",
  "/RecordatoriosBuild/assets/vite.svg",
];

// Instalación: cachear archivos esenciales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activación: limpiar caches antiguas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch: servir desde cache si no hay internet
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() =>
        caches.match(event.request).then(
          (res) =>
            res || new Response("Offline", { status: 503, statusText: "Offline" })
        )
      )
  );
});

// Sincronización de recordatorios offline
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-recordatorios") {
    event.waitUntil(syncPendingRecordatorios());
  }
});

// Función para sincronizar IndexedDB al servidor
async function syncPendingRecordatorios() {
  const db = await openIndexedDB();
  const tx = db.transaction("recordatorios", "readonly");
  const store = tx.objectStore("recordatorios");
  const all = await store.getAll();

  for (let r of all) {
    if (r.offline) {
      try {
        const res = await fetch("/api/recordatorios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(r),
        });
        if (res.ok) {
          const updateTx = db.transaction("recordatorios", "readwrite");
          const updateStore = updateTx.objectStore("recordatorios");
          delete r.offline;
          updateStore.put(r);
        }
      } catch (err) {
        console.log("No se pudo sincronizar", r, err);
      }
    }
  }
}

// Helper IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("RecordatoriosDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("recordatorios")) {
        db.createObjectStore("recordatorios", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
