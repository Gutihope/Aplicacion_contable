# Guía de Migración - Schema Anterior → Schema Mejorado

## ⚠️ IMPORTANTE: Lee esto ANTES de ejecutar migraciones

Este documento explica cómo pasar del schema anterior al nuevo schema completo con todos los módulos integrados.

---

## Paso 1: Backup de la BD Existente

```bash
# Hacer backup de PostgreSQL (OBLIGATORIO)
pg_dump contabilidad > backup_$(date +%Y%m%d_%H%M%S).sql

# Verificar que el backup se creó
ls -lh backup_*.sql
```

---

## Paso 2: Análisis de Cambios

### Tablas que se AGREGAN (nuevas funcionalidades):
- ✅ `metodos_pago` - Sistema de métodos de pago mejorado
- ✅ `metodos_pago_cuentas` - Relación PUC → Método de pago
- ✅ `divisas` - Soporte para monedas extranjeras
- ✅ `cuentas_divisas` - Saldos en divisas
- ✅ `facturas` - Registro de comprobantes de compra
- ✅ `intereses_tarjetas` - Tracking de intereses por compra
- ✅ `intereses_inversiones` - Tracking de intereses de inversiones
- ✅ `registros_gastos_recurrentes` - Historial de gastos recurrentes
- ✅ `gastos_recurrentes` - Config de gastos recurrentes
- ✅ `saldos_iniciales` - Valores iniciales por método de pago
- ✅ `auditorias_asientos` - Registro de cambios
- ✅ `errores_validaciones` - Tracking de errores contables

### Tablas que se RENOMBRAN:
- `metodos_pago_cuentas` → Cambio de estructura
- `tarjeta_compras` → Agregamos más campos

### Tablas que se MODIFICAN:
- `asientos_contables` - Agregamos campos de referencia
- `asiento_detalles` - Agregamos campo `cantidad`
- `productos_inversion` - Agregamos más campos
- `tarjetas_credito` - Agregamos más campos
- `gastos_recurrentes_config` → `gastos_recurrentes` (rediseñado)

---

## Paso 3: Ejecutar la Migración

### Opción A: Con Prisma Migrate (RECOMENDADO)

```bash
# 1. Ir a la carpeta backend
cd backend

# 2. Crear archivo de migración
npx prisma migrate dev --name init_complete_schema

# 3. Responder las preguntas:
# - "Do you want to create a new migration?" → yes
# - "Create new migration?" → yes

# 4. Verificar que se creó
ls prisma/migrations/
```

### Opción B: Manual (Si Prisma Migrate da problemas)

```bash
# 1. Crear nuevo schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# 2. Reemplazar con el nuevo schema (ya lo hizo)

# 3. Generar cliente Prisma
npx prisma generate

# 4. Ejecutar en PostgreSQL directamente
psql contabilidad < migration.sql

# 5. Verificar tablas
npx prisma db execute --stdin < query.sql
```

---

## Paso 4: Cargar Datos Iniciales

### 4.1 Cargar Plan Único de Cuentas (PUC)

```bash
# El script seed-puc-csv.js cargará automáticamente
npm run seed:puc-csv

# Output esperado:
# ✅ Cargadas 5000+ cuentas del PUC
# ✅ Verificadas relaciones
```

### 4.2 Crear Terceros Base

```bash
# Crear registro para tu entidad (tu casa/negocio)
npm run seed:base

# O insertar manualmente:
INSERT INTO terceros (nombre, tipo, identificacion)
VALUES ('MI CASA', 'PROPIO', '1234567890');
```

### 4.3 Crear Métodos de Pago

```sql
-- Crear métodos de pago base
INSERT INTO metodos_pago (nombre, tipo, puc_codigo, saldo_inicial, divisa)
VALUES 
  ('Efectivo', 'EFECTIVO', '110101', 500000, 'COP'),
  ('Banco XYZ Ahorros', 'BANCARIA', '110505', 2000000, 'COP'),
  ('Nequi', 'DIGITAL', '110506', 0, 'COP'),
  ('Visa Banco ABC', 'TARJETA', '210501', 0, 'COP');

-- Verificar
SELECT id_metodo, nombre, saldo_actual FROM metodos_pago;
```

---

## Paso 5: Validar la Migración

### 5.1 Verificar Integridad

```bash
# Contar registros
npx prisma db execute --stdin << 'EOF'
SELECT 'PUC' as tabla, COUNT(*) as cantidad FROM puc
UNION
SELECT 'Terceros', COUNT(*) FROM terceros
UNION
SELECT 'Métodos Pago', COUNT(*) FROM metodos_pago
UNION
SELECT 'Asientos', COUNT(*) FROM asientos_contables;
EOF
```

### 5.2 Prueba de Transacción

```typescript
// backend/src/test-migration.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMigration() {
  try {
    // 1. Verificar PUC
    const puc = await prisma.puc.findFirst();
    console.log('✅ PUC cargado:', puc?.codigo, puc?.nombre);

    // 2. Verificar Terceros
    const tercero = await prisma.tercero.findFirst();
    console.log('✅ Terceros cargado:', tercero?.nombre);

    // 3. Verificar Métodos de Pago
    const metodo = await prisma.metodoPago.findFirst();
    console.log('✅ Método de pago:', metodo?.nombre);

    // 4. Crear asiento de prueba
    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        descripcion: 'Prueba de migración',
        comprobante_tipo: 'EGRESO',
        asiento_detalles: {
          create: [
            {
              puc_codigo: '510505',
              debito: new Decimal(100000),
              credito: new Decimal(0),
            },
            {
              puc_codigo: '110101',
              debito: new Decimal(0),
              credito: new Decimal(100000),
            },
          ],
        },
      },
    });

    console.log('✅ Asiento de prueba creado:', asiento.id_asiento);
    console.log('✅ MIGRACIÓN EXITOSA');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testMigration();
```

```bash
# Ejecutar prueba
npx ts-node src/test-migration.ts
```

---

## Paso 6: Migrar Datos Existentes

Si tienes asientos ya registrados en el schema anterior:

### 6.1 Mapear Terceros

```sql
-- Copiar terceros existentes al nuevo formato
INSERT INTO terceros (nombre, tipo, identificacion)
SELECT 
  nombre_completo,
  'PROVEEDOR',
  nit_o_documento
FROM terceros_old
WHERE nombre_completo IS NOT NULL;
```

### 6.2 Mapear Asientos

```sql
-- Los asientos se mantienen, solo verificar integridad
-- Todas las FK deben apuntar a PUC válidos
SELECT ad.*, puc.codigo 
FROM asiento_detalles ad
LEFT JOIN puc ON ad.puc_codigo = puc.codigo
WHERE puc.codigo IS NULL;  -- Mostrar inconsistencias
```

### 6.3 Crear Tarjetas de Crédito

```sql
-- Si tienes tarjetas en el sistema anterior
INSERT INTO tarjetas_credito (nombre, numero_ultimos, id_banco_tercero, puc_cuenta_pasivo, limite_credito)
VALUES 
  ('Visa Banco ABC', '1234', 1, '210501', 5000000),
  ('Mastercard Banco XYZ', '5678', 2, '210502', 3000000);
```

### 6.4 Crear Inversiones

```sql
-- Migrar inversiones existentes
INSERT INTO productos_inversion (nombre_producto, tipo, id_tercero, monto_inicial, monto_actual, tasa_interes, fecha_inicio, puc_cuenta_inversion, estado)
VALUES 
  ('CDT Bancolombia 5%', 'CDT', 1, 10000000, 10000000, 5.0, '2024-01-15', '1103', 'ACTIVA'),
  ('Fondo ABC', 'FONDO', 2, 5000000, 5000000, 3.5, '2024-02-01', '1103', 'ACTIVA');
```

---

## Paso 7: Actualizar el Backend

### 7.1 Regenerar Cliente Prisma

```bash
cd backend
npx prisma generate
```

### 7.2 Actualizar los Servicios

El archivo `AccountingService.ts` ya está actualizado para usar:
- ✅ Métodos de pago automáticos
- ✅ Validación de partida doble
- ✅ Tracking de tarjetas de crédito
- ✅ Cálculo de intereses

### 7.3 Actualizar Controladores

```typescript
// Ejemplo: El controlador debe usar los nuevos tipos
import { MetodoPago, TarjetaCredito } from '@prisma/client';

// Ya funciona con el nuevo schema
```

---

## Paso 8: Verificación Final

```bash
# 1. Compilar TypeScript
npm run type-check

# 2. Ejecutar tests (si existen)
npm test

# 3. Iniciar servidor
npm run dev

# 4. Verificar en browser
curl http://localhost:5000/health
```

---

## Problemas Comunes y Soluciones

### ❌ Error: "Unique constraint violation"

```bash
# Significa que hay duplicados en la migración
# Solución: 
DELETE FROM terceros WHERE nombre IS NULL OR nombre = '';
DELETE FROM metodos_pago WHERE nombre IS NULL;
```

### ❌ Error: "FK constraint violation"

```bash
# Una FK apunta a un registro que no existe
# Solución: Identificar y corregir
SELECT * FROM asiento_detalles WHERE puc_codigo NOT IN (SELECT codigo FROM puc);
```

### ❌ Error: "Migration cannot be executed, a migration failed"

```bash
# Limpiar estado de Prisma
rm -rf node_modules/.prisma
npx prisma db execute --stdin << 'EOF'
DELETE FROM "_prisma_migrations" WHERE name LIKE 'init%';
EOF

# Intentar nuevamente
npx prisma migrate dev
```

---

## Rollback (Deshacer)

Si necesitas volver atrás:

```bash
# 1. Ver migraciones
npx prisma migrate status

# 2. Revertir última migración
npx prisma migrate resolve --rolled-back "fecha_migration"

# 3. Restaurar desde backup
psql contabilidad < backup_YYYYMMDD_HHMMSS.sql
```

---

## Checklist de Validación

- [ ] Backup creado y verificado
- [ ] Migración Prisma ejecutada sin errores
- [ ] PUC cargado (5000+ registros)
- [ ] Terceros creados
- [ ] Métodos de pago registrados
- [ ] Asiento de prueba crea sin errores de partida doble
- [ ] Backend compila sin errores
- [ ] API health check responde (GET /health → 200)
- [ ] Datos existentes migrados correctamente
- [ ] Tests pasan

---

## Siguientes Pasos

Después de la migración:

1. **Cargar datos iniciales** (saldos iniciales de cuentas)
2. **Crear tarjetas de crédito** (si existen)
3. **Registrar inversiones existentes** (CDT, fondos)
4. **Importar facturas antiguas** (si es necesario)
5. **Configurar gastos recurrentes** (colegio, servicios)

Consulta `ESTRUCTURA_BD.md` para ejemplos detallados.
