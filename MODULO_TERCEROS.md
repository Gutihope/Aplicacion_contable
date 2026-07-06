# 📋 Módulo de Terceros - Documentación Completa

## 📌 ¿Qué es el Módulo de Terceros?

El módulo de terceros gestiona todos los **proveedores, clientes, bancos y otras entidades** que interactúan con tu sistema contable. Es fundamental porque:

- ✅ Identifica quién es el responsable de cada transacción
- ✅ Permite la trazabilidad contable (saber a qué tercero se le debe dinero)
- ✅ Facilita el cierre contable (saldo de cuentas por pagar/cobrar)
- ✅ Genera reportes por tercero (deudas, créditos, movimientos)

---

## 🚀 Características

### ✨ CRUD Completo
- ✅ **Crear** nuevos terceros
- ✅ **Leer** información detallada
- ✅ **Actualizar** datos de contacto
- ✅ **Eliminar** terceros (sin movimientos)

### 🔍 Búsqueda y Filtros
- ✅ Buscar por nombre o identificación
- ✅ Filtrar por tipo (Proveedor, Cliente, Banco, Empleado)
- ✅ Paginación automática (10 registros por página)

### 📊 Información Enriquecida
- ✅ Detalles de contacto (email, teléfono, dirección)
- ✅ Identificación (NIT/Cédula)
- ✅ Ubicación (ciudad, país)
- ✅ Últimos 5 movimientos contables

### ⚠️ Validaciones
- ✅ Previene duplicados (mismo nombre)
- ✅ No permite eliminar si hay movimientos contables
- ✅ Campos requeridos: nombre y tipo

---

## 📖 Cómo Usar

### 1️⃣ Crear un Nuevo Tercero

**Frontend:**
1. Clica en la pestaña **"Terceros"**
2. Clica el botón **"+ Nuevo Tercero"**
3. Llena los datos:
   - **Nombre** ⭐ (obligatorio): "Supermercado ABC"
   - **Tipo** ⭐ (obligatorio): Elige entre:
     - PROVEEDOR → Vende cosas
     - CLIENTE → Te compra cosas
     - BANCO → Entidad financiera
     - EMPLEADO → Persona que trabaja contigo
     - OTRO → Cualquier otra entidad
   - **Identificación**: NIT o cédula (ej: 900123456-7)
   - **Email**: (opcional) contacto@empresa.com
   - **Teléfono**: (opcional) 3001234567
   - **Dirección**: (opcional) Cra 5 #10-20
   - **Ciudad**: (opcional) Bogotá
   - **País**: (opcional) Colombia
4. Clica **"Guardar"**

**Backend (si lo haces por API):**
```bash
curl -X POST http://localhost:5000/api/v1/terceros \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Supermercado ABC",
    "tipo": "PROVEEDOR",
    "identificacion": "900123456-7",
    "email": "contacto@supermercado.com",
    "telefono": "3001234567",
    "ciudad": "Bogotá"
  }'
```

### 2️⃣ Buscar y Filtrar Terceros

**Por nombre o identificación:**
- En la caja de búsqueda escribe "Supermercado" o "900123456"
- Los resultados se actualizan en tiempo real

**Por tipo:**
- Usa el dropdown "Todos los tipos"
- Selecciona "PROVEEDOR", "BANCO", etc.

**Resultado:**
- Se muestra la tabla filtrada
- Puedes ver cuántos registros coinciden

### 3️⃣ Ver Detalles de un Tercero

1. Clica el icono 👁️ (ojo) en la fila del tercero
2. Se muestra un panel con todos los datos
3. Opcionalmente puedes ver:
   - Todos los movimientos contables del tercero
   - Saldo total (cuánto le debes o te debe)
   - Últimos 5 movimientos

### 4️⃣ Editar un Tercero

1. Clica el icono ✏️ (lápiz) en la fila, O
2. Clica "Ver detalles" y luego "Editar"
3. Modifica los datos que necesites
4. Clica **"Guardar"**

**⚠️ Nota:** No puedes cambiar el tipo si hay movimientos contables. Si es necesario, elimina primero los movimientos.

### 5️⃣ Eliminar un Tercero

1. Clica el icono 🗑️ (basura) en la fila, O
2. Clica "Ver detalles" y luego "Eliminar"
3. Confirma la eliminación en el diálogo

**⚠️ Restricción:** Solo puedes eliminar si:
- El tercero no tiene movimientos contables
- No está asociado a ninguna transacción

**Si ves el error:**
```
"No se puede eliminar este tercero porque tiene 5 movimientos contables asociados"
```

Significa que tiene transacciones. En este caso:
- Opción A: No lo elimines (mantén el registro histórico)
- Opción B: Elimina los asientos contables primero (no recomendado)

---

## 🔗 Casos de Uso

### Caso 1: Compra a Proveedor

```
Usuario: "Compré 500,000 COP a Supermercado ABC"

Paso 1: Si no existe, crear tercero:
  - Nombre: "Supermercado ABC"
  - Tipo: PROVEEDOR

Paso 2: Registrar compra:
  - Sistema busca el tercero "Supermercado ABC"
  - Crea asiento contable:
    DÉBITO: 510505 (Gasto) ................. 500,000
    CRÉDITO: 220505 (CxP Proveedores) .... 500,000
    Tercero: Supermercado ABC

Paso 3: Consultar detalles:
  - Clica "Ver detalles" del tercero
  - Ve que le debes 500,000
  - En "Movimientos" ve la compra registrada
```

### Caso 2: Deposito a Banco

```
Usuario: "Tengo cuenta en Banco Bogotá"

Paso 1: Crear tercero:
  - Nombre: "Banco Bogotá"
  - Tipo: BANCO
  - Identificación: "112-234-567"

Paso 2: Transferencias:
  - Sistema usa este tercero para registrar transferencias
  - Trazabilidad completa del movimiento
```

### Caso 3: Tarjeta de Crédito

```
Usuario: "Tengo Visa del Banco XYZ"

Paso 1: Crear banco como tercero:
  - Nombre: "Banco XYZ"
  - Tipo: BANCO

Paso 2: Crear tarjeta:
  - Nombre: "Visa Banco XYZ"
  - Banco asociado: Se busca el tercero "Banco XYZ"
  - PUC: Se asigna automáticamente

Resultado: Trazabilidad completa de compras y pagos
```

---

## 📊 Consultas por API

### Obtener todos los terceros
```bash
GET /api/v1/terceros?pagina=1&limite=50
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_tercero": 1,
      "nombre": "Supermercado ABC",
      "tipo": "PROVEEDOR",
      "identificacion": "900123456-7",
      "email": "contacto@supermercado.com",
      "telefono": "3001234567",
      "ciudad": "Bogotá"
    }
  ],
  "paginacion": {
    "total": 15,
    "pagina": 1,
    "limite": 50,
    "totalPaginas": 1
  }
}
```

### Buscar terceros
```bash
GET /api/v1/terceros?buscar=Supermercado&tipo=PROVEEDOR
```

### Obtener un tercero específico
```bash
GET /api/v1/terceros/1
```

**Respuesta:**
```json
{
  "success": true,
  "tercero": {
    "id_tercero": 1,
    "nombre": "Supermercado ABC",
    "tipo": "PROVEEDOR",
    "identificacion": "900123456-7",
    "email": "contacto@supermercado.com",
    "asiento_detalles": [
      {
        "id_detalle": 105,
        "debito": 500000,
        "credito": 0,
        "asiento": {
          "fecha": "2024-07-02",
          "descripcion": "Compra en supermercado"
        }
      }
    ]
  }
}
```

### Obtener movimientos de un tercero
```bash
GET /api/v1/terceros/1/movimientos?pagina=1&limite=50
```

**Respuesta:**
```json
{
  "success": true,
  "tercero": {
    "id_tercero": 1,
    "nombre": "Supermercado ABC",
    "tipo": "PROVEEDOR"
  },
  "movimientos": [
    {
      "id_detalle": 105,
      "debito": 500000,
      "credito": 0,
      "puc": {
        "codigo": "220505",
        "nombre": "Cuentas por Pagar"
      },
      "asiento": {
        "id_asiento": 42,
        "fecha": "2024-07-02",
        "descripcion": "Compra en supermercado"
      }
    }
  ],
  "saldo": 500000,
  "paginacion": {
    "total": 5,
    "pagina": 1
  }
}
```

### Obtener terceros por tipo
```bash
GET /api/v1/terceros/filtro/PROVEEDOR
```

### Crear tercero
```bash
POST /api/v1/terceros
Content-Type: application/json

{
  "nombre": "Supermercado ABC",
  "tipo": "PROVEEDOR",
  "identificacion": "900123456-7",
  "email": "contacto@supermercado.com",
  "telefono": "3001234567",
  "direccion": "Cra 5 #10-20",
  "ciudad": "Bogotá",
  "pais": "Colombia"
}
```

### Actualizar tercero
```bash
PUT /api/v1/terceros/1
Content-Type: application/json

{
  "email": "nuevo@supermercado.com",
  "telefono": "3009876543"
}
```

### Eliminar tercero
```bash
DELETE /api/v1/terceros/1
```

---

## 🎯 Integración con Otros Módulos

El módulo de terceros se integra con:

### 💰 Transacciones
- Al registrar una compra, se selecciona el tercero (proveedor)
- El sistema crea el asiento contable asociado al tercero

### 💳 Tarjetas de Crédito
- Cada tarjeta está asociada a un banco (tercero)
- Los intereses se asignan al banco

### 📊 Reportes
- Reporte de cuentas por pagar por tercero
- Reporte de cuentas por cobrar por tercero
- Análisis de proveedores (quién vendo más, con mejor precio, etc.)

---

## ✅ Checklist de Uso

- [ ] He creado terceros para:
  - [ ] Proveedores principales
  - [ ] Bancos donde tengo cuentas
  - [ ] Tarjetas de crédito (como banco)
  - [ ] Empleados (si pago nómina)
  
- [ ] Sé cómo buscar terceros rápidamente
- [ ] He usado filtros por tipo
- [ ] He visto los movimientos de un tercero
- [ ] He actualizado información de contacto

---

## 🐛 Troubleshooting

### Error: "Ya existe un tercero con este nombre"
- **Causa**: Hay otro tercero con el mismo nombre
- **Solución**: Usa un nombre único o verifica si ya lo creaste antes

### Error: "No se puede eliminar este tercero porque tiene X movimientos"
- **Causa**: El tercero tiene transacciones registradas
- **Solución**: Si es histórico, déjalo. Si necesitas eliminarlo, elimina primero los asientos

### Tercero no aparece en búsqueda
- **Causa**: Es sensible a mayúsculas/minúsculas o está en otra página
- **Solución**: Intenta escribir el nombre parcial, verifica los filtros

### Error de conexión al crear
- **Causa**: El backend no está corriendo
- **Solución**: Revisa que el servidor esté en puerto 5000: `npm run dev`

---

## 📞 Soporte

Para más información:
- Lee `ESTRUCTURA_BD.md` para entender la estructura
- Revisa el código en `frontend/src/components/Terceros.tsx`
- Revisa el backend en `backend/src/modules/terceros/terceros.controller.ts`
