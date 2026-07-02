# 📊 Aplicación de Contabilidad Personal

Sistema avanzado de contabilidad personal basado en **partida doble** con integración a Google Drive, gestión de inversiones, tarjetas de crédito e inventario.

[![GitHub](https://img.shields.io/badge/GitHub-Gutihope%2FAplicacion__contable-blue)](https://github.com/Gutihope/Aplicacion_contable)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18+-blue)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🎯 Características Principales

### 💳 Transacciones Inteligentes
- ✅ Compras en **contado** (efectivo, Nequi, bancos)
- ✅ Compras a **crédito** (tarjetas, proveedores)
- ✅ Partida doble **automática y validada**
- ✅ Upload de PDF a Google Drive
- ✅ Desglose dinámico de facturas con IVA

### 💰 Inversiones y CDTs
- ✅ Registro de inversiones (CDTs, fondos)
- ✅ Cálculo de intereses devengados
- ✅ Cierre de mes automatizado
- ✅ Asientos contables automáticos

### 💳 Tarjetas de Crédito
- ✅ Gestión de compras diferidas a cuotas
- ✅ Cuota de manejo e intereses
- ✅ Decrementación automática de cuotas
- ✅ Cierre de mes integrado

### 📦 Gestión de Inventario
- ✅ Dashboard de alertas en rojo (stock bajo)
- ✅ Consumo rápido de despensa
- ✅ Reabastecimiento con trazabilidad
- ✅ Control automático de stock

### 📊 Reportes Financieros
- ✅ Balance General (Activos | Pasivos | Patrimonio)
- ✅ Estado de Resultados (Ingresos | Gastos)
- ✅ Forecast de flujo de caja anual
- ✅ Validación automática: **Activos = Pasivos + Patrimonio**

---

## 🏗️ Stack Tecnológico

### Backend
- **Express.js** - Framework HTTP
- **TypeScript** - Type-safe code
- **Prisma ORM** - Database management
- **PostgreSQL** - Relational database
- **Google Drive API** - File storage
- **Node.js 18+** - Runtime

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Shadcn/ui** - Component library
- **TypeScript** - Type-safe frontend

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - PostgreSQL local
- **Railway.app** - Cloud deployment (optional)

---

## 📋 Tabla de Contenidos

1. [Instalación Rápida](#instalación-rápida)
2. [Setup Detallado](#setup-detallado)
3. [Cargar PUC desde Excel](#cargar-puc-desde-excel)
4. [Probar Localmente](#probar-localmente)
5. [Deploy a Cloud](#deploy-a-cloud)
6. [Ejemplos de API](#ejemplos-de-api)
7. [Arquitectura](#arquitectura)

---

## 🚀 Instalación Rápida

### Requisitos Previos
- Docker Desktop
- Node.js 18+
- Git
- Tu archivo PUC.xlsx

### 5 Pasos (10 minutos)

```bash
# 1. Clonar repositorio
git clone https://github.com/Gutihope/Aplicacion_contable.git
cd Aplicacion_contable

# 2. Inicia PostgreSQL
docker-compose up -d postgres

# 3. Carga PUC
cd backend
npm install
npm run db:push
npm run seed:puc "/ruta/a/Puc aplicación.xlsx"
# Responde: sí

# 4. Inicia backend
npm run dev

# 5. Inicia frontend (nueva terminal)
cd frontend
npm install
npm run dev
```

✅ **Abre:** http://localhost:5173

---

## 📖 Setup Detallado

Ver documentación completa:
- [**SETUP.md**](./SETUP.md) - Instalación paso a paso
- [**INICIO_RAPIDO.md**](./INICIO_RAPIDO.md) - Resumen en 5 minutos
- [**CARGA_PUC.md**](./CARGA_PUC.md) - Cargar datos desde Excel

---

## 📊 Cargar PUC desde Excel

```bash
cd backend

# Analizar estructura del Excel
npm run analyze:puc "ruta/Puc aplicación.xlsx"

# Cargar PUC en BD
npm run seed:puc "ruta/Puc aplicación.xlsx"

# Cargar datos base (bancos, métodos de pago)
npm run seed:base
```

---

## 🧪 Probar Localmente

### Verificar que todo está corriendo:

```bash
# Health check
curl http://localhost:5000/health

# Crear transacción de prueba
curl -X POST http://localhost:5000/api/v1/transactions/cash-purchase \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2024-07-02",
    "descripcion": "Test",
    "metodo_pago_id": 1,
    "items": [{"cantidad": 1, "precio_unitario": 100000, "porcentaje_iva": 19}]
  }'

# Ver base de datos
npm run db:studio
# Abre: http://localhost:5555
```

---

## ☁️ Deploy a Cloud

### Railway.app (Recomendado)

1. **Sube a GitHub:** (ya hecho ✅)
2. **Ve a railway.app**
3. **Conecta tu repo**
4. **Deploy automático**

Ver [SETUP.md#deploy](./SETUP.md) para instrucciones detalladas.

---

## 📡 Ejemplos de API

Todos los endpoints documentados en [**EJEMPLOS_API.md**](./EJEMPLOS_API.md)

### Transacciones
```bash
POST   /api/v1/transactions/cash-purchase
POST   /api/v1/transactions/credit-purchase
GET    /api/v1/transactions/:id
DELETE /api/v1/transactions/:id
```

### Inversiones
```bash
GET    /api/v1/investments
POST   /api/v1/investments/:id/record-interest
POST   /api/v1/investments/month-close
```

### Tarjetas de Crédito
```bash
GET    /api/v1/credit-cards
GET    /api/v1/credit-cards/:id/purchases
POST   /api/v1/credit-cards/:id/month-close
```

### Inventario
```bash
GET    /api/v1/inventory/products
GET    /api/v1/inventory/alerts
POST   /api/v1/inventory/products/:id/consume
POST   /api/v1/inventory/products/:id/restock
```

### Reportes
```bash
GET    /api/v1/reports/balance-sheet?from_date=...&to_date=...
GET    /api/v1/reports/income-statement?from_date=...&to_date=...
GET    /api/v1/reports/forecast?year=...
GET    /api/v1/reports/inventory-value
```

---

## 🏗️ Arquitectura

### Diagrama de Capas

```
┌─────────────────────────────────────┐
│   Frontend (React + Vite)           │ → http://localhost:5173
├─────────────────────────────────────┤
│   Backend (Express + TypeScript)    │ → http://localhost:5000
├─────────────────────────────────────┤
│   Database (PostgreSQL)             │ → localhost:5432
├─────────────────────────────────────┤
│   Storage (Google Drive - Optional) │
└─────────────────────────────────────┘
```

### Motor Contable

Todas las transacciones cumplen con **partida doble**:

```
DÉBITO = CRÉDITO

Ejemplo - Compra en contado:
  Débito:  Inventario (140505)     = $100.000
  Débito:  IVA Acreedor (240801)   = $ 19.000
  Crédito: Efectivo (110101)       = $119.000
  
  ✅ Balanceado: Débitos = Créditos
```

Ver [**ARQUITECTURA.md**](./ARQUITECTURA.md) para detalles técnicos.

---

## 📁 Estructura del Proyecto

```
Aplicacion_contable/
├── backend/
│   ├── src/
│   │   ├── config/           # Google Drive, DB, ENV
│   │   ├── middleware/       # Auth, validación, errores
│   │   ├── modules/          # Transacciones, inversiones, etc.
│   │   ├── services/         # Lógica contable, Google Drive
│   │   ├── app.ts            # Express config
│   │   └── server.ts         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma     # ORM definition
│   │   └── migrations/       # DB versioning
│   ├── scripts/              # Seeders (PUC, datos base)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API client
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── docker-compose.yml        # PostgreSQL local
├── .gitignore
├── README.md                 # Este archivo
├── SETUP.md                  # Instalación detallada
├── INICIO_RAPIDO.md          # 5 minutos
├── CARGA_PUC.md              # Cargar Excel
├── ARQUITECTURA.md           # Diseño técnico
└── EJEMPLOS_API.md           # Ejemplos API
```

---

## 🔐 Seguridad

### Variables de Entorno

Nunca commites:
- `.env` (contiene credenciales)
- `config/service-account.json` (Google Drive)

Configurar en production:
```bash
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_SERVICE_ACCOUNT_PATH=...
```

### Validación Contable

- ✅ Cada asiento valida: Débitos = Créditos
- ✅ PUCs deben existir
- ✅ Tercero requerido en algunas cuentas
- ✅ Movimiento solo en cuentas permitidas

---

## 🚀 Primeros Pasos

```bash
# 1. Clonar
git clone https://github.com/Gutihope/Aplicacion_contable.git
cd Aplicacion_contable

# 2. Ver instrucciones
cat INICIO_RAPIDO.md

# 3. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 4. Setup BD
cd ../backend
npm run db:push
npm run seed:puc "/ruta/puc.xlsx"

# 5. Ejecutar
npm run dev  # Backend
# Nueva terminal:
cd ../frontend && npm run dev
```

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Líneas de código (Backend) | ~2000+ |
| Líneas de código (Frontend) | ~1500+ |
| Endpoints de API | 20+ |
| Tablas de BD | 11 |
| Componentes React | 8+ |
| Documentación | 4 archivos |

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo licencia MIT. Ver [LICENSE](LICENSE) para detalles.

---

## 📞 Soporte

- 📖 Documentación: Ver archivos `.md` en la raíz
- 🐛 Issues: GitHub Issues
- 💬 Preguntas: Discusiones en GitHub

---

## 🎉 Créditos

Desarrollado con ❤️ por [Alejandro Gutiérrez](https://github.com/Gutihope)

---

## 📅 Roadmap

- [ ] Autenticación multi-usuario
- [ ] Exportar a formatos contables (.SAF)
- [ ] Sincronización con bancos
- [ ] App móvil (React Native)
- [ ] OCR para captura de recibos
- [ ] Dashboard avanzado con gráficos
- [ ] Cálculo automático de impuestos
- [ ] Integración con contador

---

## ⭐ Si te fue útil, una estrella es apreciada!

```
⭐ Star the repo if it helps you!
```

---

**Última actualización:** Julio 2024  
**Versión:** 1.0.0-beta
