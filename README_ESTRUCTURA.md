# 🏦 Sistema Contable Personal - Estructura Completa

## 📌 Resumen Ejecutivo

Se ha diseñado una **estructura de base de datos completa** que integra:

✅ **Contabilidad de Partida Doble** - Todos los asientos cumplen débito = crédito  
✅ **Plan de Cuentas Colombiano** - Compatible con PUC oficial  
✅ **Métodos de Pago Automáticos** - Contado/Crédito con trazabilidad  
✅ **Tarjetas de Crédito** - Con cálculo de intereses y cuotas  
✅ **Inversiones y CDT** - Con seguimiento de intereses mensuales  
✅ **Inventario de Consumibles** - Comida, artículos hogar, etc.  
✅ **Gastos Recurrentes** - Mensuales, estacionales (ej: colegio feb-nov)  
✅ **Divisas y Criptos** - Para compras en moneda extranjera  
✅ **Reportes Financieros** - Balance sheet, PyG, Forecast  
✅ **Auditoría Completa** - Registro de cambios y trazabilidad  

---

## 📁 Archivos Generados

1. **`backend/prisma/schema.prisma`** ✅ ACTUALIZADO
   - Schema Prisma completo (31 modelos)
   - Compatible con PostgreSQL
   - Relaciones optimizadas

2. **`ESTRUCTURA_BD.md`** ✅ NUEVO
   - Explicación detallada de cada módulo
   - Flujos de negocio con ejemplos
   - Cómo funciona la parametrización automática

3. **`GUIA_MIGRACION.md`** ✅ NUEVO
   - Paso a paso para migrar del schema anterior
   - Validaciones y checklists
   - Solución a problemas comunes

4. **`README_ESTRUCTURA.md`** ✅ ESTE ARCHIVO
   - Resumen y próximas acciones

---

## 🚀 Próximas Acciones (En Orden)

### PASO 1: Hacer Backup (AHORA MISMO)
```bash
pg_dump contabilidad > backup_$(date +%Y%m%d_%H%M%S).sql
echo "✅ Backup creado"
```

### PASO 2: Ejecutar Migración
```bash
cd backend
npx prisma migrate dev --name complete_schema
# Espera a que termine...
```

### PASO 3: Cargar Plan de Cuentas
```bash
npm run seed:puc-csv
# Cargará ~5000 cuentas del PUC colombiano
```

### PASO 4: Crear Datos Base
```bash
npm run seed:base
# Crea registros de prueba y terceros iniciales
```

### PASO 5: Verificar Migración
```bash
npm run type-check
# Si no hay errores, todo bien
```

### PASO 6: Iniciar Servidor
```bash
npm run dev
# Backend debería escuchar en http://localhost:5000
```

---

## 📊 Estructura de Tablas Principales

```
PUC (Plan Único de Cuentas)
├── 1105 - Efectivo
├── 1102-110506 - Cuentas Bancarias
├── 1103 - Inversiones CP/LP
├── 140505 - Inventario
├── 210501 - Cuentas x Pagar TC
├── 220505 - CxP Proveedores
├── 310101 - Patrimonio
├── 43 - Ingresos (Clase)
├── 51 - Gastos Operacionales
└── ... (más de 5000 códigos)

TABLAS CORE:
├── AsientoContable (id, fecha, descripción, tipo)
├── AsientoDetalle (débito, crédito, PUC, tercero)
├── Tercero (proveedores, clientes, bancos)
├── MetodoPago (Efectivo, Bancos, Tarjetas, Divisas)
├── TarjetaCredito (Visa, Mastercard, etc)
├── ProductoInversion (CDT, Fondos, etc)
├── InventarioProducto (Comida, artículos)
└── GastoRecurrente (Colegio, servicios)
```

---

## 💡 Características Clave

### 1️⃣ Parametrización Automática de Pagos

```
Usuario: "Compre 50,000 en efectivo"
↓
Sistema automáticamente:
- Trae PUC 110101 (Efectivo)
- Crea asiento:
  DÉBITO: 510505 (Gasto) ......... 50,000
  CRÉDITO: 110101 (Efectivo) .... 50,000
```

### 2️⃣ Control Automático de Tarjetas

```
Usuario: "Compre 150,000 con Visa"
↓
Sistema automáticamente:
- Trae PUC 210501 (Cta x Pagar TC)
- Registra en TarjetaCompra (para intereses)
- Al mes:
  DÉBITO: 520505 (Gasto interés) ... 5,250
  CRÉDITO: 210501 (TC) ............ 5,250
```

### 3️⃣ Inversiones Sin Afectar PyG

```
Usuario: "Tengo CDT de 10M a 5% anual"
↓
Asiento de Apertura (NO afecta PyG):
DÉBITO: 1103 (Inversión) ........ 10,000,000
CRÉDITO: 1105 (Efectivo) ........ 10,000,000

Mensualmente se registran intereses:
DÉBITO: 1103 (Inversión) ........ 41,667
CRÉDITO: 4305 (Ingresos) ........ 41,667  ← Solo esto en PyG
```

### 4️⃣ Inventario con Alertas

```
Producto: "Arroz 5kg"
- Stock: 3 bolsas
- Stock mínimo: 1 bolsa
- En alerta: false

Si stock < stock_minimo → en_alerta = true → Notificación
```

### 5️⃣ Gastos Estacionales

```
"Colegio niños"
- Monto: 500,000
- Meses activos: [2,3,4,5,6,7,8,9,10,11] (Febrero a Noviembre)
- Sistema calcula forecast considerando esto
```

---

## 🔍 Validaciones Integradas

✅ **Partida Doble**: Suma(débito) = Suma(crédito)  
✅ **PUC Válida**: Solo códigos existentes en tabla PUC  
✅ **Tercero Requerido**: Si la cuenta lo requiere  
✅ **Integridad Referencial**: FK validas  
✅ **Saldos No Negativos**: En métodos de pago (opcional)  
✅ **Fechas Consistentes**: No futuro, no antes de saldos iniciales  

---

## 📈 Reportes Disponibles

Con esta estructura puedes generar:

1. **Balance General (Balance Sheet)**
   - Activos, Pasivos, Patrimonio
   - A cualquier fecha

2. **Estado de Resultados (PyG)**
   - Ingresos vs Gastos
   - Por período (mes, trimestre, año)

3. **Forecast Anual**
   - Proyección a cierre de año
   - Considerando gastos recurrentes

4. **Análisis de Tarjetas**
   - Saldo por tarjeta
   - Intereses acumulados
   - Pagos pendientes

5. **Análisis de Inversiones**
   - Monto actual de cada inversión
   - Intereses generados
   - Rendimiento anual

6. **Análisis de Inventario**
   - Productos en alerta
   - Rotación de inventario
   - Costo de existencias

---

## ❓ Preguntas Frecuentes

### P: ¿Cómo carga el PyG los intereses del CDT?
**R**: Los intereses se registran en PUC 4305 (Ingresos). No necesitas hacer nada especial. Cada mes registras los intereses y aparecen automáticamente en el PyG.

### P: ¿Cómo funciona la transferencia de 1105 a gastos de anticipo?
**R**: Es un asiento normal:
```
DÉBITO: 110501 (Gasto anticipos) ... 100,000
CRÉDITO: 110101 (Efectivo) ........ 100,000
```
Luego cuando se gasta ese anticipio, compensas contra la cuenta de anticipo.

### P: ¿Dónde se ve el costo de las inversiones en el PyG?
**R**: No se ve. Las inversiones son ACTIVOS (1103), no gastos. Solo los **intereses** (4305) aparecen en PyG.

### P: ¿Puedo comprar divisas en Binance?
**R**: Sí. Registras en tabla `CuentaDivisa`:
- Divisa: USD
- Monto: 500
- TRM compra: 4,200
- En COP: 2,100,000

### P: ¿Los gastos recurrentes se crean automáticamente cada mes?
**R**: No todavía. Se proponen en el Forecast, pero debes confirmarlos. En futuro puedes automatizarlo con un scheduler.

### P: ¿Cómo calculo la trazabilidad de dinero de 1105 a cuenta de gasto?
**R**: Buscas asientos donde:
```sql
- Débito de 110501 (Gasto anticipo)
- Crédito de 110101 (Efectivo)
- Tercero = quien recibió el dinero
```

---

## 🛠️ Tecnología Stack

- **Base de Datos**: PostgreSQL 13+
- **ORM**: Prisma 6.19+
- **Backend**: Express + TypeScript
- **Frontend**: React + Vite
- **Autenticación**: Google Drive OAuth2 (para documentos)

---

## 📞 Soporte

Consulta estos archivos:
1. **`ESTRUCTURA_BD.md`** - Para entender cómo funciona todo
2. **`GUIA_MIGRACION.md`** - Para problemas de migración
3. **`backend/prisma/schema.prisma`** - Para detalles técnicos
4. **`backend/src/services/AccountingService.ts`** - Para lógica contable

---

## ✨ Resumen Visual

```
┌─────────────────────────────────────────────────┐
│   USUARIO REGISTRA: "Gasto 50,000 en efectivo"  │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │ Sistema Automático  │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────────────────┐
        │ 1. Trae PUC 110101 (Efectivo)  │
        │ 2. Crea asiento contable       │
        │ 3. Valida partida doble        │
        │ 4. Actualiza saldo de efectivo │
        │ 5. Registra en auditoría       │
        └──────────┬──────────────────────┘
                   │
        ┌──────────▼────────────────┐
        │ BD CONSISTENTE             │
        │ Asiento creado             │
        │ Partida doble cumplida ✅ │
        │ Trazabilidad completa ✅  │
        └────────────────────────────┘
```

---

## 🎉 ¡Listo!

Tu estructura de BD está completa y optimizada. Ahora solo necesitas:

1. ✅ Hacer el backup
2. ✅ Ejecutar la migración (PASO 2 arriba)
3. ✅ Cargar PUC
4. ✅ Crear datos iniciales
5. ✅ Empezar a registrar transacciones

¿Preguntas sobre la estructura? Revisa `ESTRUCTURA_BD.md`.

¿Problemas con la migración? Revisa `GUIA_MIGRACION.md`.

**¡Éxito con tu aplicación contable! 🚀**
