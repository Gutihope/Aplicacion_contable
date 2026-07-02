# 🏗️ Arquitectura Técnica - Contabilidad Personal

## 📐 Diagrama de Capas

```
┌─────────────────────────────────────────┐
│   FRONTEND (React + Vite)               │
│   - Transacciones Inteligentes           │
│   - Cierre de Mes                       │
│   - Dashboard de Alertas                │
│   - Reportes Financieros                │
└──────────────┬──────────────────────────┘
               │ HTTP/REST API
┌──────────────▼──────────────────────────┐
│   BACKEND (Express + TypeScript)         │
│   - Validación Partida Doble            │
│   - Lógica Contable                     │
│   - Integraciones Google Drive          │
│   - Cálculo de Reportes                 │
└──────────────┬──────────────────────────┘
               │ Prisma ORM
┌──────────────▼──────────────────────────┐
│   DATABASE (PostgreSQL)                  │
│   - Asientos Contables                  │
│   - Catálogo PUC                        │
│   - Terceros                            │
│   - Inventario                          │
└─────────────────────────────────────────┘
               │ Storage API
┌──────────────▼──────────────────────────┐
│   GOOGLE DRIVE                          │
│   - Almacenamiento de PDFs              │
│   - Organización Año/Mes                │
└─────────────────────────────────────────┘
```

---

## 🧮 Motor Contable: Partida Doble

### Concepto Fundamental

Toda transacción genera **dos lados** que siempre deben ser iguales:

```
DÉBITO = CRÉDITO
(Izquierda) = (Derecha)
```

### Ejemplo: Compra en Contado

**Transacción:** Comprar mercancía por $100.000 en Carrefour, pagando en efectivo

```sql
-- Asiento Contable Generado:
Fecha: 2024-07-02
Descripción: Compra Carrefour

Detalles:
┌──────────────────┬────────┬────────┐
│ Cuenta PUC       │ Débito │ Crédito│
├──────────────────┼────────┼────────┤
│ 140505 (Inv)     │100.000 │        │  ← Entra mercancía
│ 110101 (Efectivo)│        │100.000│  ← Sale dinero
└──────────────────┴────────┴────────┘
Total Débitos: 100.000
Total Créditos: 100.000
✅ BALANCEADO
```

### Clasificación de Cuentas (Naturaleza)

| Clase | Nombre | Naturaleza | Lado de Aumento | Lado de Disminución |
|-------|--------|-----------|-----------------|-------------------|
| 1 | Activos | Débito | Débito | Crédito |
| 2 | Pasivos | Crédito | Crédito | Débito |
| 3 | Patrimonio | Crédito | Crédito | Débito |
| 4 | Ingresos | Crédito | Crédito | Débito |
| 5 | Gastos | Débito | Débito | Crédito |

### Validación Automática

Cada asiento es validado antes de ser guardado:

```typescript
// backend/src/services/AccountingService.ts

const validateDoubleEntry = (detalles: AsientoDetalleData[]): boolean => {
  const totalDebito = detalles.reduce((sum, d) => sum + Number(d.debito), 0);
  const totalCredito = detalles.reduce((sum, d) => sum + Number(d.credito), 0);
  
  // Permitir error de redondeo < 0.01 COP
  return Math.abs(totalDebito - totalCredito) < 0.01;
};
```

---

## 🔄 Flujo de Transacción Inteligente

### 1. Usuario abre "Transacción Contado"

```
┌─────────────────────────────────────┐
│ Frontend: SmartTransactionForm       │
│ Selecciona:                         │
│ - Fecha                             │
│ - Descripción                       │
│ - Método de pago (Ej: Efectivo)    │
│ - Items (cantidad, precio, IVA)    │
│ - PDF Factura (opcional)           │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Backend: POST /transactions/cash-... │
│                                     │
│ 1. Validar datos                   │
│ 2. Si hay PDF:                     │
│    - Upload a Google Drive         │
│    - Obtener fileId + webViewLink  │
│ 3. Calcular totales e IVA          │
│ 4. Generar asiento doble          │
│ 5. Actualizar inventario           │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Asiento Generado:                   │
│                                     │
│ Débito: Gasto/Inventario (140505)   │
│ Débito: IVA Acreedor (240801)      │
│ Crédito: Efectivo (110101)         │
│ google_drive_file_id: xyz123       │
│ google_drive_webview_link: [url]   │
└─────────────────────────────────────┘
```

---

## 💳 Cierre de Mes: Tarjetas de Crédito

### Estructura de Datos

```
tarjeta_credito (1) ←─────→ (N) tarjeta_compras
    ↓
    └─→ id_tarjeta (int)
        nombre_tarjeta (string)
        puc_cuenta_pasivo (ref a PUC)
        banco_tercero_id (ref a Tercero)

tarjeta_compras
    ↓
    ├─→ id_tarjeta (FK)
    ├─→ monto_total_original (decimal)
    ├─→ cuotas_totales (int)
    ├─→ cuotas_restantes (int) ← Se decrementa cada mes
    ├─→ saldo_capital_actual (decimal) ← Se reduce
    └─→ asiento_id (ref a AsientoContable)
```

### Flujo de Cierre Mes

```
Usuario abre: CreditCardMonthClose
    │
    ├─→ Selecciona tarjeta
    │
    ├─→ Ingresa:
    │   - Cuota de manejo (Ej: 25.000)
    │   - Interés de cada compra diferida
    │
    └─→ Click: "Registrar Cierre"
            │
            ├─ Asiento 1: Cuota de Manejo
            │   Débito: 530535 (Gastos Financieros)
            │   Crédito: 2101xxx (Pasivo TC)
            │
            └─ Asiento 2-N: Intereses por Compra
                Para cada compra:
                   Débito: 530535 (Gastos Financieros)
                   Crédito: 2101xxx (Pasivo TC)
                   
                Actualizar tarjeta_compras:
                   cuotas_restantes -= 1
                   saldo_capital_actual -= cuota_pagada
                   Si cuotas_restantes = 0:
                       estado = 'CANCELADA'
```

---

## 📊 Generación de Reportes

### Balance General

Agrupa asientos por clase de PUC y aplica naturaleza:

```typescript
// Para clase 1 (Activos):
Saldo = SUM(Débitos) - SUM(Créditos)

// Para clase 2 (Pasivos):
Saldo = SUM(Créditos) - SUM(Débitos)

// Validación:
ACTIVOS = PASIVOS + PATRIMONIO
```

### Estado de Resultados

Solo considera clases 4 (Ingresos) y 5 (Gastos):

```
INGRESOS (Clase 4)
  - Ingresos Laboral:        $2.500.000
  - Ingresos Inversiones:      $125.000
  = Ingresos Totales:        $2.625.000

GASTOS (Clase 5)
  - Gastos de Operación:     $1.200.000
  - Gastos Financieros:        $150.000
  = Gastos Totales:          $1.350.000

RESULTADO NETO:              $1.275.000 (49%)
```

### Forecast (Proyección)

```
Real (Enero - Hoy):
  - Suma real de gastos del año hasta la fecha

Proyectado (Hoy+1 - Diciembre):
  - Gastos recurrentes configurados para meses pendientes
  - Tabla: gastos_recurrentes_config (mes_inicio, mes_fin)

Resultado:
  - Gráfico acumulativo de gastos estimados
  - Total estimado para cierre de año
```

---

## 🗄️ Modelo de Datos Clave

### Tabla: asientos_contables

```sql
CREATE TABLE asientos_contables (
    id_asiento SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,                -- Fecha contable
    descripcion TEXT NOT NULL,          -- Ej: "Compra Carrefour"
    comprobante_tipo VARCHAR(50),       -- 'Egreso', 'Ingreso', 'Nota'
    google_drive_file_id VARCHAR(255),  -- ID del PDF en Drive
    google_drive_webview_link TEXT      -- Enlace para previsualizar
);

-- Índice para búsquedas por fecha
CREATE INDEX idx_asientos_fecha ON asientos_contables(fecha);
```

### Tabla: asiento_detalles

```sql
CREATE TABLE asiento_detalles (
    id_detalle SERIAL PRIMARY KEY,
    asiento_id INT REFERENCES asientos_contables ON DELETE CASCADE,
    puc_codigo VARCHAR(20) REFERENCES puc(codigo),
    id_tercero INT REFERENCES terceros(id_tercero),
    debito DECIMAL(12,2) DEFAULT 0,
    credito DECIMAL(12,2) DEFAULT 0
);

-- Garantizar que no hay duplicados (misma cuenta + tercero en asiento)
ALTER TABLE asiento_detalles 
ADD UNIQUE(asiento_id, puc_codigo, id_tercero);
```

### Tabla: tarjeta_compras

```sql
CREATE TABLE tarjeta_compras (
    id_compra_tc SERIAL PRIMARY KEY,
    id_tarjeta INT REFERENCES tarjetas_credito,
    asiento_id INT REFERENCES asientos_contables,
    monto_total_original DECIMAL(12,2),
    cuotas_totales INT,
    cuotas_restantes INT,               -- Disminuye cada mes
    saldo_capital_actual DECIMAL(12,2), -- Se descuenta con abonos
    estado VARCHAR(20) DEFAULT 'VIGENTE'
);
```

---

## 🔐 Integridad Contable

### Validaciones en Backend

1. **Partida Doble**
   - Cada asiento debe tener débitos = créditos
   - Se valida antes de guardar en BD

2. **PUC Válido**
   - Código PUC existe en tabla `puc`
   - Cuenta permite movimiento (`movimiento = true`)

3. **Tercero (Cuando Aplica)**
   - Algunas cuentas requieren tercero
   - Ej: Cuentas de proveedores, bancos

4. **Moneda Consistente**
   - Todos los valores en COP
   - Precisión: 2 decimales

### Prevención de Cambios Accidentales

```typescript
// El asiento es inmutable después de crear
// Para corregir se usa: Nota Contable (contraparte)

// NO: UPDATE asientos_contables SET ... WHERE id_asiento = X
// SÍ: INSERT INTO asientos_contables (Nota Contable que revierte)
```

---

## 📁 Google Drive: Estructura de Carpetas

```
Google Drive del Usuario
└── 📁 Contabilidad Personal
    ├── 📁 Enero 2024
    │   ├── 2024-01-15_factura_carrefour.pdf
    │   ├── 2024-01-20_boleta_servicios.pdf
    │   └── ...
    ├── 📁 Febrero 2024
    │   ├── 2024-02-05_invoice_amazon.pdf
    │   └── ...
    └── ...
```

**Automatización:**
- Al crear asiento con PDF: Backend crea carpetas automáticamente
- Naming: `{timestamp}_{descripcion_factura}.pdf`
- Se guarda `fileId` y `webViewLink` en `asientos_contables`

---

## 🚦 Flujo de Autenticación Google Drive

### OAuth2 (Usuario Manual)
1. Usuario hace click: "Conectar Google Drive"
2. Redirige a Google OAuth
3. Usuario autoriza app
4. Backend recibe access_token
5. Se almacena en sesión del usuario

### Service Account (Automatización)
1. Backend carga JSON de Service Account
2. Se autentica automáticamente
3. Acceso a carpetas que comparte el usuario
4. Sin intervención del usuario

**Recomendación:** Usar Service Account para uploads automáticos

---

## 🔧 Stack Técnico

| Capa | Tecnología | Razón |
|------|-----------|-------|
| Frontend | React + Vite | SPA moderno, recarga rápida, HMR |
| Estilos | TailwindCSS | Utility-first, responsive por defecto |
| UI | Shadcn/ui | Componentes accesibles, totalmente customizable |
| Backend | Express + TS | Routing simple, tipado, flexible |
| ORM | Prisma | Type-safe, migraciones automáticas, studio |
| BD | PostgreSQL | Transacciones ACID, relaciones complejas |
| Storage | Google Drive | Escalable, seguro, documentos versionados |

---

## 📈 Escalabilidad Futura

### Mejoras Posibles

1. **Autenticación**
   - JWT tokens para usuarios
   - Multi-usuario con permisos

2. **Cálculos Avanzados**
   - Depreciación de activos fijos
   - Ajustes por inflación
   - Análisis de ratios financieros

3. **Integraciones**
   - Bancos (API abierta)
   - Sincronización con contadores
   - Exportación a formatos contables (.saf)

4. **Reportes**
   - Impuestos predeterminados por país
   - Cash flow más detallado
   - Dashboard con KPIs personalizados

5. **Mobile**
   - App React Native
   - Captura de recibos con OCR

---

## 📚 Referencias

- [Principios de Partida Doble](https://es.wikipedia.org/wiki/Partida_doble)
- [Plan de Cuentas PUC Colombia](https://www.supersociedades.gov.co/)
- [NIIF para Pymes](https://www.ifrs.org/)
- [Prisma Docs](https://www.prisma.io/docs/)
