# 🏥 FarmaGuardia

> **Portal web de farmacias de turno en tiempo real para Puerto Ayacucho, Estado Amazonas.**  
> Consulta en segundos cuál farmacia está abierta las 24h, llama directamente, envía su ubicación por WhatsApp y navega hasta ella con un clic.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Astro](https://img.shields.io/badge/-Astro-fff?style=flat&logo=astro)
![Tailwind CSS](https://img.shields.io/badge/-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)
![SQLite](https://img.shields.io/badge/-SQLite-003B57?logo=sqlite&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)

---

## ✨ Características

- **🕒 Información en tiempo real**: Muestra la farmacia de turno según la hora actual (zona horaria Venezuela).
- **📞 Acción inmediata**: Botones para llamar, enviar WhatsApp y abrir en Google Maps/Waze.
- **🚚 Indicador de entrega**: Señala qué farmacias ofrecen servicio a domicilio.
- **🗓️ Próximos turnos**: Vista de los turnos programados para los próximos días.
- **🌓 Modo oscuro automático**: Se adapta a la preferencia del sistema y se guarda en `localStorage`.
- **🔐 Panel de administración**: CRUD sencillo para gestionar farmacias y turnos (protegido por contraseña).
- **📱 PWA básico**: Funciona offline y se puede instalar en el móvil.
- **🤖 Bot de Telegram (próximamente)**: Recibe reportes de la comunidad cuando una farmacia no está abierta.

---

## 📦 Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/farmaguardia.git
cd farmaguardia

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env
# Edita .env y define:
#   ADMIN_PASSWORD=tu_contraseña_secreta

# 4. Inicializar la base de datos y sembrar datos iniciales
npm run seed   # ejecuta seed.js y seed_turnos.js

# 5. Iniciar el servidor de desarrollo
npm run dev
```

> La aplicación estará disponible en `http://localhost:4321`.

---

## 🚀 Uso

### Usuario final
1. Visita la homepage.
2. Verás la **farmacia de turno actual** con su nombre, dirección, teléfono y botones de acción.
3. Desplázate hacia abajo para ver los **próximos turnos**.
4. Usa los botones para llamar, enviar por WhatsApp o ver en el mapa.

### Administrador
1. Accede a `/admin/login`.
2. Ingresa la contraseña definida en `ADMIN_PASSWORD`.
3. Desde el panel puedes:
   - **Gestionar farmacias**: crear, editar, eliminar, marcar como activa/inactivas y activar/desactivar servicio de entrega.
   - **Gestionar turnos**: asignar turnos a farmacias con fecha/hora de inicio y fin, agregar notas.
   - Ver estadísticas rápidas (total de farmacias, activas, turno actual, próximos turnos).

---

## 🔌 Endpoints de la API (opcional)

| Método | Ruta                  | Descripción                         |
|--------|-----------------------|-------------------------------------|
| `GET`  | `/api/turno-actual`   | Devuelve la farmacia de turno en JSON |
| `GET`  | `/api/proximos-turnos`| Lista de turnos para los próximos 3 días |
| `POST` | `/api/reporte`        | (futuro) endpoint para recibir reportes del bot de Telegram |

*(Estos endpoints son internos y usados por el frontend; pueden consumirse externamente si se necesita.)*

---

## 🛠️ Despliegue con Dokploy

1. **Construir la imagen Docker**  
   Incluimos un `Dockerfile` multi‑stage que builda la app Astro y la sirve con `node`.

2. **Archivo de configuración**  
   `dokploy.yaml` define los servicios, variables de secreto y el puerto.

3. **Despliegue**  
   Sube el repositorio a tu Git provider y conecta el proyecto en Dokploy; la plataforma se encargará del build y del despliegue.

Ver la sección **Despliegue** más abajo para detalles.

---

## 🐳 Dockerfile

```dockerfile
# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./public
COPY package*.json ./
RUN npm ci --only=production
ENV NODE_ENV=production
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
```

---

## 📄 dokploy.yaml

```yaml
version: 1
services:
  web:
    image: ghcr.io/tu-usuario/farmaguardia:latest
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "4321:4321"
    environment:
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    restart: unless-stopped
```

> En Dokploy, define `ADMIN_PASSWORD` como variable de entorno protegida.

---

## 📂 Estructura del proyecto

```
farmaguardia/
├── src/
│   ├── components/          # Componentes Astro reutilizables
│   ├── layouts/             # Layouts (incl. Layout.astro)
│   ├── pages/
│   │   ├── index.astro      # Landing page pública
│   │   └── admin/           # Panel de administración
│   │       ├── index.astro  # Dashboard
│   │       ├── login.astro  # Login
│   │       ├── farmacias.astro
│   │       └── turnos.astro
│   ├── db/                  # Esquema y conexión a SQLite
│   └── styles/              # CSS global (Tailwind)
├── public/                  # Assets estáticos (manifest, service worker, íconos)
├── seed.js                  # Siembra inicial de farmacias
├── seed_turnos.js           # Siembra de turnos de ejemplo
├── .env                     # Variables de entorno (no versionado)
├── .gitignore
├── astro.config.mjs
├── Dockerfile
├── dokploy.yaml
├── package.json
└── README.md
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor sigue estos pasos:

1. Haz fork del proyecto.
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`).
3. Realiza tus cambios y haz commit (`git commit -m 'Add amazing feature'`).
4. Push a la rama (`git push origin feature/amazing-feature`).
5. Abre un Pull Request.

Asegúrate de seguir el estilo de código existente y de escribir pruebas si aplica.

---

## � Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- Los datos iniciales de farmacias provienen de fuentes locales de Puerto Ayacucho.
- Inspirado en proyectos similares de información de turno en América Latina.
- Gracias a la comunidad de Astro y Tailwind por sus excelentes herramientas.

---

> **Nota**: Este es un proyecto de código abierto con fines educativos y de servicio comunitario. No sustituye el consejo médico oficial; en caso de emergencia llama al número de emergencias local (911 en Venezuela).