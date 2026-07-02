# 📊 Aplicación de Contabilidad Personal - Guía de Instalación

Sistema completo de contabilidad basado en partida doble con integración a Google Drive.

---

## 📋 Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 13 (o Docker)
- **Cuenta Google** con acceso a Google Drive API
- **Git**

---

## 🚀 Instalación Rápida

### 1. Clonar/Descargar el Proyecto

```bash
cd aplicacion-contable-personal
```

### 2. Configurar Base de Datos

#### Opción A: Con Docker (Recomendado)

```bash
# Inicia PostgreSQL en un contenedor
docker-compose up -d postgres

# Opcional: Inicia pgAdmin para administración visual
docker-compose --profile with-admin up -d pgadmin
# Accede a http://localhost:5050 (admin@contabilidad.local / admin)
```

#### Opción B: PostgreSQL Local

Asegúrate de que PostgreSQL esté corriendo localmente:

```bash
# macOS (con brew)
brew services start postgresql

# Windows: Inicia PostgreSQL desde Services
# Linux: sudo systemctl start postgresql
```

Crea la base de datos:

```bash
psql -U postgres -c "CREATE DATABASE contabilidad;"
```

### 3. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo de configuración
cp .env.example .env

# Actualizar DATABASE_URL en .env según tu setup
# Para Docker:     postgresql://contabilidad_user:contabilidad_pass_secure_123@localhost:5432/contabilidad
# Para local:      postgresql://usuario:contraseña@localhost:5432/contabilidad
```

#### Configurar Google Drive API

1. **Crear Project en Google Cloud Console**
   - Ve a https://console.cloud.google.com
   - Crea un nuevo proyecto
   - Habilita "Google Drive API"

2. **Crear Credenciales OAuth2**
   - En "Credenciales" → "Crear credenciales" → "ID de cliente OAuth"
   - Tipo: "Aplicación web"
   - URIs autorizados: `http://localhost:5000/api/v1/auth/google/callback`
   - Descarga el JSON y copia `client_id` y `client_secret` a `.env`

3. **Crear Service Account (Automatización)**
   - En "Credenciales" → "Crear credenciales" → "Service Account"
   - Crea una clave → formato JSON
   - Descarga el archivo y guárdalo en `backend/config/service-account.json`
   - Actualiza `GOOGLE_SERVICE_ACCOUNT_PATH` en `.env`

4. **Inicializar Base de Datos**

```bash
# Ejecuta migraciones
npm run db:push

# O si deseas crear desde cero
npm run db:migrate
```

5. **Iniciar Backend**

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:5000`

---

### 4. Configurar Frontend

```bash
cd ../frontend

# Instalar dependencias
npm install

# Crear archivo de configuración
cp .env.example .env

# VITE_API_BASE_URL debería ser http://localhost:5000/api/v1
```

**Instalar dependencias de componentes (Shadcn/ui)**

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input select form label
```

**Iniciar Frontend**

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:5000` (o el puerto que configure Vite)

---

## 📁 Estructura del Proyecto

```
aplicacion-contable-personal/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuración (DB, Google Drive, ENV)
│   │   ├── middleware/        # Middleware (auth, validación)
│   │   ├── modules/           # Módulos de negocio
│   │   │   ├── transactions/  # Transacciones
│   │   │   ├── investments/   # Inversiones
│   │   │   ├── credit-cards/  # Tarjetas
│   │   │   ├── inventory/     # Inventario
│   │   │   └── reporting/     # Reportes
│   │   ├── services/          # Servicios (Accounting, GoogleDrive)
│   │   ├── app.ts             # Configuración Express
│   │   └── server.ts          # Entry point
│   ├── prisma/
│   │   ├── schema.prisma      # Definición del ORM
│   │   └── migrations/        # Historial de cambios
│   ├── package.json
│   ├── .env.example
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   │   ├── transactions/
│   │   │   ├── month-close/
│   │   │   ├── inventory-alerts/
│   │   │   └── reports/
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # Cliente API
│   │   ├── types/             # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── docker-compose.yml
└── SETUP.md (este archivo)
```

---

## 🧪 Comandos Útiles

### Backend

```bash
# Desarrollo con hot-reload
npm run dev

# Compilar TypeScript
npm run build

# Ver/editar BD con Prisma Studio
npm run db:studio

# Migración de BD
npm run db:migrate

# Verificar tipos
npm run type-check
```

### Frontend

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

---

## 📚 Endpoints Principales

### Transacciones
- `POST /api/v1/transactions/cash-purchase` - Compra en contado
- `POST /api/v1/transactions/credit-purchase` - Compra a crédito
- `DELETE /api/v1/transactions/:id` - Eliminar transacción

### Inversiones
- `GET /api/v1/investments` - Listar inversiones
- `POST /api/v1/investments/:id/record-interest` - Registrar intereses
- `POST /api/v1/investments/month-close` - Cierre de mes

### Tarjetas de Crédito
- `GET /api/v1/credit-cards` - Listar tarjetas
- `GET /api/v1/credit-cards/:id/purchases` - Compras diferidas
- `POST /api/v1/credit-cards/:id/month-close` - Cierre de mes

### Inventario
- `GET /api/v1/inventory/products` - Listar productos
- `GET /api/v1/inventory/alerts` - Alertas de stock bajo
- `POST /api/v1/inventory/products/:id/consume` - Consumo rápido
- `POST /api/v1/inventory/products/:id/restock` - Reabastecimiento

### Reportes
- `GET /api/v1/reports/balance-sheet` - Balance General
- `GET /api/v1/reports/income-statement` - Estado de Resultados
- `GET /api/v1/reports/forecast` - Forecast de flujo de caja

---

## 🔐 Seguridad

### Variables de Entorno Sensibles

Nunca commitees archivos `.env` o `service-account.json`:

```bash
# Agregar a .gitignore
echo ".env
.env.local
config/service-account.json" >> .gitignore
```

### Validación de Partida Doble

Todos los asientos contables son validados automáticamente:
- ✅ Suma de débitos = Suma de créditos
- ✅ Cada línea tiene PUC válido
- ✅ Tercero obligatorio en ciertas cuentas

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@prisma/client'"

```bash
cd backend
npm install
npm run db:push
```

### Error: "ECONNREFUSED - PostgreSQL"

Asegúrate que PostgreSQL esté corriendo:

```bash
# Con Docker
docker-compose up postgres

# Local
pg_isready -h localhost
```

### Error: "Google Drive API - Unauthorized"

- Verifica que la Service Account JSON esté en la ruta correcta
- Comprueba que el archivo no sea None/null
- Abre la carpeta de Google Drive y comparte con el email de Service Account

---

## 📖 Documentación Adicional

- [Prisma ORM](https://www.prisma.io/docs/)
- [Express.js](https://expressjs.com/)
- [React](https://react.dev/)
- [Google Drive API](https://developers.google.com/drive/api)
- [TailwindCSS](https://tailwindcss.com/)

---

## 🤝 Contribución

1. Crea un branch para tu feature: `git checkout -b feature/nueva-funcionalidad`
2. Commit tus cambios: `git commit -am 'Agregada nueva funcionalidad'`
3. Push al branch: `git push origin feature/nueva-funcionalidad`
4. Abre un Pull Request

---

## 📄 Licencia

MIT License - Ver LICENSE.md

---

## 📞 Soporte

Para problemas o preguntas:
- Abre un issue en GitHub
- Revisa la documentación del proyecto
- Consulta logs del servidor en `backend/logs/`
