# 📊 Guía: Cargar PUC desde Excel

Proceso paso a paso para cargar el Plan de Cuentas desde tu archivo Excel.

---

## 📋 Prerequisitos

✅ Backend instalado (`npm install`)  
✅ Base de datos PostgreSQL corriendo  
✅ `.env` configurado con `DATABASE_URL`  
✅ Archivo `Puc aplicación.xlsx` disponible

---

## 🚀 PROCESO RÁPIDO (3 pasos)

### **Paso 1: Preparar el Backend**

```bash
cd backend

# Instalar dependencias (si no lo hiciste)
npm install

# Migraciones de BD
npm run db:push
```

✅ Debería decir: "11 tables created/updated"

---

### **Paso 2: Analizar Estructura del Excel**

```bash
# Analizar el archivo para detectar automáticamente las columnas
npm run analyze:puc "C:\Users\alejandro.gutierrez\OneDrive - Fundación Universitaria Cafam\Puc aplicación.xlsx"

# Alternativa con comillas simples (Si falla con comillas dobles)
npm run analyze:puc '/Usuarios/alejandro.gutierrez/OneDrive - Fundación Universitaria Cafam/Puc aplicación.xlsx'
```

**Salida esperada:**
```
📂 Leyendo archivo: C:\Users\alejandro.gutierrez\OneDrive...
📋 Hojas disponibles:
  1. PUC
  2. Métodos Pago (opcional)

🏷️ Columnas detectadas:
  1. Código
  2. Nombre
  3. Nivel
  4. Naturaleza
  5. Movimiento

📊 Total de filas: 1250

📝 Primeras 3 filas:
Fila 1:
  Código: 110101
  Nombre: Caja
  ...

✅ Análisis guardado en: scripts/puc-analysis.json
```

---

### **Paso 3: Cargar PUC en la Base de Datos**

```bash
# Cargar el PUC del Excel
npm run seed:puc "C:\Users\alejandro.gutierrez\OneDrive - Fundación Universitaria Cafam\Puc aplicación.xlsx"
```

**Proceso:**
1. ✅ Lee el archivo
2. ✅ Detecta estructura automáticamente
3. ✅ Valida datos
4. ✅ Muestra preview de primeros 3 registros
5. ⚠️ Pregunta: "¿Deseas continuar? (sí/no):"
6. 💾 Carga en la BD

**Salida esperada:**
```
📂 Leyendo archivo Excel...

🏷️ Columnas detectadas:
  Código, Nombre, Nivel, Naturaleza, Movimiento

📋 Mapeo de columnas:
  codigo: Código
  nombre: Nombre
  nivel: Nivel
  naturaleza: Naturaleza
  movimiento: Movimiento

🔍 Validando datos...
✅ 1250 registros válidos para insertar

📝 Primeros 3 registros a insertar:

1. Código: 110101
   Nombre: Caja
   Nivel: 5 | Naturaleza: D | Movimiento: true

2. Código: 110105
   Nombre: Banco Bancolombia
   Nivel: 5 | Naturaleza: D | Movimiento: true

3. Código: 110110
   Nombre: Banco Davivienda
   Nivel: 5 | Naturaleza: D | Movimiento: true

⚠️ ADVERTENCIA: Esto eliminará todos los PUCs existentes
¿Deseas continuar? (sí/no): sí

🗑️ Eliminando PUCs existentes...
💾 Insertando PUCs en base de datos...

✅ ¡ÉXITO! Datos cargados:
  Total de PUCs insertados: 1250

📊 Distribución por nivel:
  Nivel 1: 5 cuentas
  Nivel 2: 25 cuentas
  Nivel 3: 150 cuentas
  Nivel 4: 600 cuentas
  Nivel 5: 470 cuentas

📊 Distribución por naturaleza:
  Débito: 700 cuentas
  Crédito: 550 cuentas
```

---

## 🎯 PASO ADICIONAL: Cargar Datos Base

```bash
# Opcional: Cargar terceros y métodos de pago predeterminados
npm run seed:base

# Salida:
# 🌱 Iniciando seed de datos base...
# 
# 👥 Insertando Terceros...
#    ✅ 5 terceros insertados
# 
# 💳 Insertando Métodos de Pago...
#    ✅ 5 métodos de pago insertados
# 
# 📊 Estadísticas:
#    Terceros en BD: 5
#    Métodos de Pago: 5
#    PUCs en BD: 1250
```

---

## ✅ Verificar Carga en BD

### Opción 1: Prisma Studio (GUI)

```bash
npm run db:studio

# Se abre en http://localhost:5555
# Navega a tabla "PUC" y verifica que están los datos
```

### Opción 2: PostgreSQL directo

```bash
# Ver total de PUCs
docker-compose exec postgres psql -U contabilidad_user -d contabilidad -c "
SELECT COUNT(*) as total_pucs FROM puc;
"

# Ver PUCs por nivel
docker-compose exec postgres psql -U contabilidad_user -d contabilidad -c "
SELECT nivel, COUNT(*) as cantidad FROM puc GROUP BY nivel ORDER BY nivel;
"

# Ver primeros 10 PUCs
docker-compose exec postgres psql -U contabilidad_user -d contabilidad -c "
SELECT codigo, nombre, nivel, naturaleza FROM puc LIMIT 10;
"
```

### Opción 3: Query desde Node.js

Crea un archivo `test-puc.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const total = await prisma.pUC.count();
  console.log(`Total PUCs: ${total}`);

  const byNivel = await prisma.pUC.groupBy({
    by: ['nivel'],
    _count: true
  });

  console.log('\nPor nivel:');
  byNivel.forEach(g => {
    console.log(`  Nivel ${g.nivel}: ${g._count}`);
  });

  const samples = await prisma.pUC.findMany({ take: 3 });
  console.log('\nPrimeros 3:');
  samples.forEach(p => {
    console.log(`  ${p.codigo} - ${p.nombre}`);
  });

  await prisma.$disconnect();
}

test();
```

Ejecutar:
```bash
node test-puc.js
```

---

## 🔧 Troubleshooting

### ❌ Error: "No se pudieron detectar las columnas"

**Causa:** Las columnas del Excel no tienen los nombres esperados.

**Solución 1: Renombrar columnas en Excel**

El script busca automáticamente palabras clave. Asegúrate que tenga:
- **Código** (también detecta: `code`, `puc`, `cuenta`)
- **Nombre** (también detecta: `name`, `descripción`)
- **Nivel** (también detecta: `level`, `jerarquía`)
- **Naturaleza** (también detecta: `nature`, `tipo`, `débito`, `crédito`)
- **Movimiento** (también detecta: `puede`, `movement`, `activo`)

**Solución 2: Editar manualmente el mapeo**

Edita `scripts/seed-puc.js` línea ~24 y ajusta:
```javascript
const patterns = {
  codigo: ['código', 'code', 'cuenta', 'TU_COLUMNA_AQUI'],
  // ...
};
```

---

### ❌ Error: "Código vacío" en fila X

**Causa:** Hay filas con datos incompletos.

**Solución:** 
- El script muestra cuáles filas tienen problemas
- Edita el Excel y elimina filas vacías o incompletas
- Vuelve a ejecutar

---

### ❌ Error: "DATABASE_URL not set"

**Causa:** El `.env` no está configurado.

**Solución:**
```bash
cp .env.example .env
# Edita .env y completa DATABASE_URL
nano .env
```

---

### ❌ Error: "Cannot find module 'xlsx'"

**Causa:** Falta instalar xlsx.

**Solución:**
```bash
npm install xlsx
```

---

## 📊 Qué se carga exactamente

### Tabla: `puc`

```
┌──────────┬────────────────────┬───────┬───────────┬────────────┐
│ codigo   │ nombre             │ nivel │ naturaleza│ movimiento │
├──────────┼────────────────────┼───────┼───────────┼────────────┤
│ 110101   │ Caja               │   5   │ D (Débito)│ true       │
│ 110105   │ Bancos             │   5   │ D         │ true       │
│ 140505   │ Inventario         │   5   │ D         │ true       │
│ 220505   │ Cuentas por Pagar  │   5   │ C (Créd.) │ true       │
│ 310101   │ Capital            │   3   │ C         │ false      │
└──────────┴────────────────────┴───────┴───────────┴────────────┘
```

**Naturaleza:**
- `D` = Débito (Activos, Gastos)
- `C` = Crédito (Pasivos, Patrimonio, Ingresos)

**Movimiento:**
- `true` = Permite movimientos (transacciones)
- `false` = Solo informativo

---

## 🎯 Próximos Pasos

Una vez cargado el PUC:

1. **Verificar datos:**
   ```bash
   npm run db:studio
   ```

2. **Iniciar servidor:**
   ```bash
   npm run dev
   ```

3. **Iniciar frontend:**
   ```bash
   cd ../frontend && npm run dev
   ```

4. **Probar transacciones:**
   - Abre http://localhost:5173
   - Ve a "📋 Transacción Inteligente"
   - Crea una compra (ahora verás todos los métodos de pago del PUC)

---

## 📝 Notas Importantes

✅ El script **elimina PUCs anteriores** antes de cargar los nuevos  
✅ Detecta automáticamente la estructura del Excel  
✅ Valida datos antes de insertar  
✅ Muestra preview antes de confirmar  
✅ Genera estadísticas después de la carga  

---

## 🆘 Soporte

Si tienes problemas:

1. **Verifica el análisis:**
   ```bash
   npm run analyze:puc "ruta/archivo.xlsx"
   cat scripts/puc-analysis.json
   ```

2. **Revisa logs:**
   ```bash
   # Los errores se muestran en terminal durante la carga
   ```

3. **Consulta el archivo:**
   - Abre Excel
   - Verifica que no haya filas vacías
   - Asegúrate que los códigos sean únicos
   - Nivel debe ser número (1-5)

---

## 💡 Ejemplo: Cargar desde OneDrive

Si el archivo está en OneDrive, cópialo primero a una carpeta local:

```bash
# Windows
cd %TEMP%
copy "C:\Users\alejandro.gutierrez\OneDrive - Fundación Universitaria Cafam\Puc aplicación.xlsx" .
npm run seed:puc "Puc aplicación.xlsx"

# macOS/Linux
cp ~/OneDrive\ -\ Fundación\ Universitaria\ Cafam/Puc\ aplicación.xlsx /tmp/
npm run seed:puc "/tmp/Puc aplicación.xlsx"
```

---

¿Necesitas ayuda con algo específico? 🚀
