Firebase lo utilicé principalmente para las notificaciones push, ya que su servicio de Firebase Cloud Messaging (FCM) permite enviar avisos a la PWA incluso cuando el navegador está cerrado. Con esto la aplicación puede alertar al usuario sobre recordatorios o acciones importantes sin necesidad de tener la app abierta.

La aplicación trata de un panel de recordatorios tipo PWA, donde el usuario puede crear, editar y recibir avisos. Funciona como una herramienta ligera que se instala en el dispositivo y aprovecha tecnologías modernas como service workers, notificaciones y almacenamiento local.

Para desarrollarla trabajé con React + Vite como base del frontend, junto con Bootstrap para el diseño. Además, se utilizó un service worker personalizado para manejar la lógica de las notificaciones y la comunicación con Firebase, integrando así una experiencia más cercana a una app móvil.
