# Estructura de Base de Datos - Aplicación Contable Personal

## 📋 Índice
1. [Visión General](#visión-general)
2. [Módulos Principales](#módulos-principales)
3. [Flujos de Negocio](#flujos-de-negocio)
4. [Ejemplos Prácticos](#ejemplos-prácticos)
5. [Consideraciones de Implementación](#consideraciones-de-implementación)

---

## Visión General

Esta BD implementa un **sistema contable completo** basado en el PUC (Plan Único de Cuentas) colombiano, con soporte para:
- ✅ Partida doble contable
- ✅ Control de métodos de pago (contado/crédito)
- ✅ Gestión de tarjetas de crédito con intereses
- ✅ Control de inversiones y CDT
- ✅ Inventario de consumibles
- ✅ Gastos recurrentes y estacionales
- ✅ Divisas y compras en moneda extranjera
- ✅ Trazabilidad completa

---

## Módulos Principales

### 1. **NÚCLEO CONTABLE**

#### PUC (Plan Único de Cuentas)
```
- Contiene todos los códigos de cuenta (1105, 1102, 1103, 43, etc.)
- Cada cuenta tiene:
  * Código (PK): "1105" o "110501"
  * Nombre: "Efectivo"
  * Tipo: ACTIVO, PASIVO, PATRIMONIO, INGRESOS, GASTOS
  * Naturaleza: D (Deudora) o C (Acreedora)
  * Requiere tercero: bool (para cuentas que necesitan identificar al proveedor)
```

**Importancia**: Todo movimiento contable usa una PUC. Sin PUC válida, no hay asiento.

#### Asiento Contable
```
- Registro principal de toda transacción
- Representa cada comprobante contable (factura, egreso, nota, etc.)
- Relaciona Detalles (débitos/créditos por PUC)
- Contiene referencia a Google Drive para almacenar comprobantes
```

#### Asiento Detalle
```
- Cada línea del asiento (débito/crédito)
- Estructura:
  * PUC Código: "510505" (gasto)
  * Débito: 100,000 COP
  * Crédito: 0
  * Tercero: ID del proveedor (opcional pero importante para trazabilidad)
```

**Validación**: Suma de débitos = Suma de créditos (partida doble)

---

### 2. **MÉTODOS DE PAGO**

#### Flujo de Contado (cuando pagas al momento)
```
Clicas en "Compra en Contado":
  1. Sistema pregunta: ¿Cómo pagas?
     - Efectivo → Trae automáticamente PUC 110101
     - Nequi → Trae PUC de cuenta de Nequi
     - Banco XYZ → Trae PUC de cuenta bancaria
  
  2. Crea asiento:
     DÉBITO:  510505 (Gasto) ........... 100,000
     CRÉDITO: 110101 (Efectivo) ........ 100,000
  
  3. Actualiza saldo del método de pago
```

#### Flujo de Crédito con Tarjeta
```
Clicas en "Compra a Crédito":
  1. Sistema pregunta: ¿Con cuál tarjeta?
     - Seleccionas "Visa Banco XYZ"
     - Sistema trae automáticamente PUC del pasivo (ej: 210501)
  
  2. Crea asiento:
     DÉBITO:  510505 (Gasto) ........... 100,000
     CRÉDITO: 210501 (Cta x Pagar TC) .. 100,000
  
  3. Crea registro en TarjetaCompra para tracking
  
  4. AL CIERRE DEL MES:
     - Calculas intereses sobre compras pendientes
     - Creas nuevo asiento con intereses
```

#### Flujo de Crédito con Proveedor
```
Clicas en "Compra a Crédito":
  1. Sistema pregunta: ¿A qué proveedor?
     - Seleccionas "Supermercado ABC"
     - Sistema trae automáticamente PUC 220505 (Cta x Pagar)
  
  2. Crea asiento:
     DÉBITO:  510505 (Gasto) .............. 500,000
     CRÉDITO: 220505 (Cta x Pagar Proveedores) ... 500,000
     Tercero: Supermercado ABC
```

**Beneficio**: No necesitas saber de PUC. El sistema trae las cuentas automáticamente.

---

### 3. **TARJETAS DE CRÉDITO**

Tabla `TarjetaCredito`:
```
- id_tarjeta: 1
- nombre: "Visa Banco Bogotá"
- numero_ultimos: "4567"
- id_banco_tercero: 3 (FK a Tercero "Banco Bogotá")
- puc_cuenta_pasivo: "210501" (Pasivos - Tarjetas de crédito)
- tasa_interes: 3.5% (mensuales o anuales)
- limite_credito: 5,000,000
- saldo_actual: 1,200,000
- fecha_corte: 28 (día del mes)
- fecha_pago: 5 (día del mes siguiente)
```

**Ciclo de Tarjeta**:
1. Haces compra → Se registra en `TarjetaCompra`
2. Acumulas compras hasta fecha de corte (28)
3. A fecha de pago (5 del siguiente mes):
   - Sistema calcula intereses sobre saldo no pagado
   - Crea asiento de intereses (DÉBITO: gasto, CRÉDITO: pasivo)

---

### 4. **INVERSIONES Y CDT**

Tabla `ProductoInversion`:
```
- id_inversion: 1
- nombre_producto: "CDT Bancolombia 5%"
- tipo: "CDT"
- id_tercero: 5 (Bancolombia)
- monto_inicial: 10,000,000 COP
- tasa_interes: 5% anual
- fecha_inicio: 2024-01-15
- fecha_vencimiento: 2024-12-15
- puc_cuenta_inversion: "1103" (Inversiones corto plazo)
- puc_cuenta_ingreso: "4305" (Ingresos por intereses)
```

**Registro de Intereses (Mensual)**:
```
Clicas "Registrar Intereses del CDT":
  1. Sistema calcula: 10,000,000 × 5% / 12 = 41,667
  
  2. Crea asiento:
     DÉBITO:  1103 (Inversión) .......... 41,667
     CRÉDITO: 4305 (Ingresos) .......... 41,667
  
  3. Incrementa monto_actual del CDT
  
  4. Registra en InterésInversión para audit
```

**En PyG**: Solo ves los intereses (4305), no la inversión. Es correcto.

---

### 5. **INVENTARIO DE CONSUMIBLES**

Módulo para comida, artículos de hogar, etc.

Tabla `InventarioProducto`:
```
- nombre: "Arroz x 5kg"
- categoria: "ALIMENTOS"
- stock_actual: 3 bolsas
- stock_minimo: 1 bolsa
- en_alerta: false
- precio_unitario: 25,000

Cuando stock_actual < stock_minimo → en_alerta = true
```

**Flujo**:
1. Compras arroz en el supermercado
2. En la factura, marcas "Arroz x 5kg"
3. Sistema:
   - Crea asiento contable
   - Incrementa stock_actual en 3
   - Registra en InventarioMovimiento (ENTRADA)

4. Cuando usas arroz en casa:
   - Clicas "Consumir Arroz"
   - Sistema:
     - Decrementa stock_actual
     - Genera movimiento SALIDA (auditoría)
     - Opción: Crea asiento contable si quieres ver consumo en PyG

---

### 6. **GASTOS RECURRENTES**

Para gastos que se repiten (algunos meses específicos).

Tabla `GastoRecurrente`:
```
- descripcion: "Colegio niños"
- monto: 500,000
- período: "MENSUAL"
- meses_activos: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]  // Feb a Nov
- puc_codigo: "610501" (Educación/Gastos)
- id_tercero: 10 (Colegio ABC)
```

**Uso en Forecast**:
- Sistema suma estos gastos para proyectar cierre de año
- Evita sorpresas de gastos recurrentes estacionales

---

### 7. **DIVISAS**

Para compras en moneda extranjera (Binance, Strike, etc.).

Tabla `Divisa`:
```
- codigo: "USD"
- nombre: "Dólar Estadounidense"
- trm_actual: 4,250 (actualizado diariamente)
```

Tabla `CuentaDivisa`:
```
- id_metodo_pago: 5 (FK a MetodoPago "Nequi USD")
- divisa: "USD"
- monto: 500 USD
- trm_compra: 4,200 (TRM al momento de compra)
- plataforma: "Binance"
```

**Reportes**:
- Puedes ver en COP: 500 USD × 4,200 = 2,100,000 COP
- Puedes ver ganancias/pérdidas por variación de TRM

---

## Flujos de Negocio

### ✅ Flujo 1: Compra en Efectivo

```
Usuario: "Gasté 50,000 COP en supermercado"

1. Clica "Nueva Transacción" → "Compra Contado"
2. Forma pregunta:
   - ¿Qué compraste? → "Comida y artículos hogar"
   - ¿Cuánto? → 50,000
   - ¿Con qué pagaste? → "Efectivo"
3. Sistema:
   - Trae automáticamente PUC 110101
   - Crea asiento:
     DÉBITO: 510505 (Gasto general) .... 50,000
     CRÉDITO: 110101 (Efectivo) ........ 50,000
   - Decrementa saldo_actual de "Efectivo"
4. Listo. Asiento en BD.
```

### ✅ Flujo 2: Compra con Tarjeta

```
Usuario: "Compré ropa por 150,000 COP con Visa"

1. Clica "Nueva Transacción" → "Compra Crédito"
2. Forma pregunta:
   - ¿Qué compraste? → "Ropa"
   - ¿Cuánto? → 150,000
   - ¿Con cuál tarjeta? → "Visa Banco XYZ"
3. Sistema:
   - Trae automáticamente PUC 210501 (Tarjeta crédito)
   - Crea asiento:
     DÉBITO: 510505 (Gasto) .......... 150,000
     CRÉDITO: 210501 (TC) ........... 150,000
   - Crea registro en TarjetaCompra para tracking
   - Incrementa saldo_actual de "Visa Banco XYZ"
4. Al cierre de mes:
   - Calculas intereses: 150,000 × 3.5% = 5,250
   - Creas nuevo asiento:
     DÉBITO: 520505 (Gastos intereses) . 5,250
     CRÉDITO: 210501 (TC) ............. 5,250
```

### ✅ Flujo 3: Inversión y Generación de Intereses

```
Usuario: "Tengo un CDT de 10M con 5% anual"

1. Clica "Inversiones" → "Nuevo CDT"
2. Registra:
   - Monto: 10,000,000
   - Tasa: 5%
   - Banco: Bancolombia
   - Fecha inicio: 2024-01-15
3. Sistema crea asiento de apertura:
   DÉBITO: 1103 (Inversiones) ........ 10,000,000
   CRÉDITO: 1105 (Efectivo) ......... 10,000,000
   (Este es un asiento de transferencia, no afecta PyG)

4. Mensualmente (cierre de mes):
   - Clica "Registrar Intereses"
   - Sistema calcula: 10M × 5% / 12 = 41,667
   - Crea asiento:
     DÉBITO: 1103 (Inversión) ........ 41,667
     CRÉDITO: 4305 (Ingresos interés) .. 41,667
   - Incrementa monto_actual: 10,041,667

5. En PyG solo ves 4305 (ingresos), no 1103 (activo)
```

### ✅ Flujo 4: Compra con Factura Discriminada

```
Usuario: "Compré en tienda con factura. Artículos con IVA del 19%"

1. Clica "Nueva Transacción" → "Compra con Factura"
2. Registra:
   - Factura #001234
   - Tercero: "Supermercado XYZ"
   - Tipo de pago: Contado / Crédito
   - Detalles:
     * Arroz 5kg: 2 × 25,000 = 50,000 (subtotal)
     * IVA: 50,000 × 19% = 9,500
     * Total: 59,500

3. Sistema crea asiento:
   DÉBITO: 140505 (Inventario) ...... 50,000
   DÉBITO: 240801 (IVA crédito) .... 9,500
   CRÉDITO: 110101 (Efectivo) ...... 59,500

4. Registra FacturaDetalle:
   - Producto: Arroz 5kg
   - Cantidad: 2
   - Precio unitario: 25,000
   - IVA: 9,500

5. Actualiza InventarioProducto "Arroz":
   - stock_actual += 2
```

### ✅ Flujo 5: Saldos Iniciales

```
Tengo efectivo de 500,000 que no registré antes.

1. Clica "Configuración" → "Saldos Iniciales"
2. Registra:
   - Método de pago: "Efectivo"
   - Monto: 500,000
   - Fecha: 2024-01-01
3. Sistema crea asiento de apertura:
   DÉBITO: 110101 (Efectivo) ....... 500,000
   CRÉDITO: 310101 (Patrimonio) ... 500,000
   (Aumenta tu patrimonio inicial)
```

---

## Ejemplos Prácticos

### Ejemplo 1: Pago de Nómina

```sql
INSERT INTO AsientoContable (fecha, descripcion, comprobante_tipo)
VALUES ('2024-07-01', 'Pago nómina julio', 'EGRESO');

-- Detalle del asiento
INSERT INTO AsientoDetalle (asiento_id, puc_codigo, debito, credito, id_tercero)
VALUES 
  (1, '610501', 5000000, 0, NULL),     -- DÉBITO: Gasto nómina
  (1, '110101', 0, 5000000, NULL);     -- CRÉDITO: Efectivo
```

### Ejemplo 2: Pago a Proveedor

```sql
-- Tenías compra pendiente de 500,000 a "Supermercado ABC"
-- Hoy pagas:

INSERT INTO AsientoContable (fecha, descripcion, comprobante_tipo)
VALUES ('2024-07-15', 'Pago a Supermercado ABC', 'EGRESO');

INSERT INTO AsientoDetalle (asiento_id, puc_codigo, debito, credito, id_tercero)
VALUES 
  (2, '220505', 500000, 0, 8),        -- DÉBITO: CxP Proveedores
  (2, '110101', 0, 500000, NULL);     -- CRÉDITO: Efectivo
```

### Ejemplo 3: Cierre de Tarjeta de Crédito

```sql
-- Tienes compras en TC pendientes de pago
-- Fecha de corte: 28 de mes, Fecha de pago: 5 siguiente

-- 1. Calcular intereses
saldo_no_pagado = 150,000 + 200,000 = 350,000
interes = 350,000 × 3.5% = 12,250

-- 2. Crear asiento
INSERT INTO AsientoContable (fecha, descripcion, comprobante_tipo)
VALUES ('2024-07-31', 'Intereses TC julio', 'EGRESO');

INSERT INTO AsientoDetalle (asiento_id, puc_codigo, debito, credito)
VALUES 
  (3, '520505', 12250, 0),           -- DÉBITO: Gasto intereses
  (3, '210501', 0, 12250);           -- CRÉDITO: TC
```

### Ejemplo 4: Forecast (Proyección de Cierre)

```sql
-- Calcular gastos del mes + recurrentes estacionales
SELECT 
  (SELECT SUM(debito) FROM AsientoDetalle 
   WHERE puc_codigo LIKE '5%' AND MONTH(fecha) = 7) as gastos_mes,
  (SELECT SUM(monto) FROM GastoRecurrente 
   WHERE activa = true AND meses_activos LIKE '%7%') as gastos_recurrentes,
  ROUND((SELECT SUM(debito) - SUM(credito) FROM AsientoDetalle 
         WHERE puc_codigo LIKE '4%') / 30 * 31) as proyección_ingresos;
```

---

## Consideraciones de Implementación

### 1. **Cargar el PUC Colombiano**
```bash
npm run seed:puc-csv
# Cargará todos los códigos de cuenta del sistema colombiano
```

### 2. **Validaciones Obligatorias**
- ✅ Partida doble: Suma(débito) = Suma(crédito)
- ✅ PUC válida: Solo códigos existentes en tabla PUC
- ✅ Tercero requerido: Si PUC.requiere_tercero = true
- ✅ Decimales: Máximo 2 dígitos en dinero

### 3. **Índices para Rendimiento**
```sql
-- Ya están en schema.prisma:
- AsientoDetalle(asiento_id, puc_codigo)
- AsientoContable(fecha, comprobante_tipo)
- InventarioProducto(categoria, en_alerta)
- GastoRecurrente(activa)
```

### 4. **Auditoría y Trazabilidad**
```
Cada asiento registra:
- Usuario que lo creó
- Fecha y hora
- Referencia a Google Drive
- Si se modifica, queda registro en AuditoriaAsiento
```

### 5. **Cálculo de PyG (Estado de Resultados)**
```sql
SELECT 
  puc.tipo,
  puc.nombre,
  SUM(CASE WHEN puc.naturaleza = 'D' THEN debito - credito ELSE credito - debito END) as saldo
FROM AsientoDetalle ad
JOIN PUC puc ON ad.puc_codigo = puc.codigo
WHERE ad.asiento.fecha BETWEEN '2024-01-01' AND '2024-12-31'
  AND puc.tipo IN ('INGRESOS', 'GASTOS', 'COSTOS')
GROUP BY puc.tipo, puc.codigo;
```

### 6. **Cálculo del Balance Sheet**
```sql
-- Todas las cuentas de ACTIVO, PASIVO, PATRIMONIO al 2024-12-31
SELECT 
  puc.tipo,
  puc.nombre,
  SUM(CASE WHEN puc.naturaleza = 'D' THEN debito - credito ELSE credito - debito END) as saldo
FROM AsientoDetalle ad
JOIN PUC puc ON ad.puc_codigo = puc.codigo
WHERE ad.asiento.fecha <= '2024-12-31'
  AND puc.tipo IN ('ACTIVO', 'PASIVO', 'PATRIMONIO')
GROUP BY puc.tipo, puc.codigo;
```

### 7. **Alertas de Inventario**
```sql
UPDATE InventarioProducto
SET en_alerta = true
WHERE stock_actual <= stock_minimo;
```

---

## Resumen de Tablas Clave

| Tabla | Propósito |
|-------|-----------|
| `PUC` | Catálogo de cuentas contables |
| `AsientoContable` | Documento principal (factura, egreso, etc.) |
| `AsientoDetalle` | Líneas de débito/crédito |
| `MetodoPago` | Cuentas disponibles (Efectivo, Bancos, etc.) |
| `TarjetaCredito` | Tarjetas de crédito |
| `TarjetaCompra` | Compras individuales con TC |
| `ProductoInversion` | CDT, fondos, acciones |
| `InventarioProducto` | Comida, artículos hogar |
| `GastoRecurrente` | Gastos mensuales/estacionales |
| `Factura` | Comprobante de compra |

---

## ¿Preguntas?

Consulta el schema Prisma en `backend/prisma/schema.prisma` para detalles técnicos.
