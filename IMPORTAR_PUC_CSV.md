# 📊 Importar PUC desde CSV

Guía para importar tu PUC sin problemas de rutas con OneDrive.

---

## 🎯 OPCIÓN 1: Usar CSV Directo (MÁS FÁCIL)

Si ya tienes `Puc.csv` en la carpeta `backend/`:

### En PowerShell (Terminal Backend):

```powershell
cd "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend"

# Cargar PUC desde CSV
docker run --rm -v "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend:/app" -w /app --network host -e "DATABASE_URL=postgresql://contabilidad_user:contabilidad_pass_secure_123@host.docker.internal:5432/contabilidad" node:18 node scripts/seed-puc-csv.js "Puc.csv"

# Responde: sí
```

✅ **Listo**

---

## 🔄 OPCIÓN 2: Convertir tu Excel a CSV

Si tienes tu Excel en OneDrive:

### Paso 1: Convertir Excel → CSV

```powershell
cd "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend"

# Convertir tu Excel a CSV
docker run --rm -v "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend:/app" -w /app node:18 node scripts/convert-xlsx-to-csv.js "C:\Users\alejandro.gutierrez\OneDrive - Fundación Universitaria Cafam\Puc aplicación.xlsx"
```

Deberías ver:
```
📂 Leyendo: C:\Users\alejandro.gutierrez\OneDrive...
✅ 1250 filas leídas
📊 CSV creado: C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend\Puc.csv
```

### Paso 2: Cargar CSV

```powershell
docker run --rm -v "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend:/app" -w /app --network host -e "DATABASE_URL=postgresql://contabilidad_user:contabilidad_pass_secure_123@host.docker.internal:5432/contabilidad" node:18 node scripts/seed-puc-csv.js "Puc.csv"

# Responde: sí
```

✅ **Listo**

---

## 📋 FORMATO CSV ESPERADO

Las columnas **deben ser exactamente**:

```csv
Código,Nombre,Nivel,Naturaleza,Movimiento
```

Donde:
- **Código**: Código PUC (ej: 110101)
- **Nombre**: Descripción (ej: Caja)
- **Nivel**: Número de nivel (1-6)
- **Naturaleza**: `D` (Débito) o `C` (Crédito)
- **Movimiento**: `Sí` o `No` (permite transacciones)

### Ejemplo:
```csv
Código,Nombre,Nivel,Naturaleza,Movimiento
110101,Caja,5,D,Sí
110105,Bancos,5,D,Sí
210101,Cuentas por Pagar,4,C,Sí
310101,Capital,3,C,No
```

---

## 🛠️ SCRIPTS DISPONIBLES

### Convertir Excel a CSV
```bash
npm run convert:xlsx-to-csv "ruta/archivo.xlsx"
```

### Cargar desde CSV
```bash
npm run seed:puc-csv "Puc.csv"
```

### Cargar desde Excel (original)
```bash
npm run seed:puc "ruta/archivo.xlsx"
```

---

## 🚀 PROCESO COMPLETO CON DOCKER

```powershell
# 1. Inicia PostgreSQL (Terminal 1)
docker-compose up -d postgres
Start-Sleep -Seconds 10

# 2. Backend (Terminal 2)
cd backend

# Cargar BD
docker run --rm -v "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend:/app" -w /app --network host -e "DATABASE_URL=postgresql://contabilidad_user:contabilidad_pass_secure_123@host.docker.internal:5432/contabilidad" node:18 npx prisma db push

# Convertir Excel a CSV (OPCIONAL)
docker run --rm -v "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend:/app" -w /app node:18 node scripts/convert-xlsx-to-csv.js "C:\Users\alejandro.gutierrez\OneDrive - Fundación Universitaria Cafam\Puc aplicación.xlsx"

# Cargar PUC desde CSV
docker run --rm -v "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend:/app" -w /app --network host -e "DATABASE_URL=postgresql://contabilidad_user:contabilidad_pass_secure_123@host.docker.internal:5432/contabilidad" node:18 node scripts/seed-puc-csv.js "Puc.csv"

# Responde: sí

# Cargar datos base
docker run --rm -v "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend:/app" -w /app --network host -e "DATABASE_URL=postgresql://contabilidad_user:contabilidad_pass_secure_123@host.docker.internal:5432/contabilidad" node:18 node scripts/seed-base.js

# Inicia servidor
docker run -p 5000:5000 -v "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend:/app" -w /app --network host -e "DATABASE_URL=postgresql://contabilidad_user:contabilidad_pass_secure_123@host.docker.internal:5432/contabilidad" node:18 npm run dev

# 3. Frontend (Terminal 3)
cd frontend
docker run --rm -v "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\frontend:/app" -w /app node:18 npm install
docker run -p 5173:5173 -v "C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\frontend:/app" -w /app node:18 npm run dev
```

---

## ✅ VENTAJAS DEL CSV

✓ **Sin problemas de rutas** (OneDrive, espacios, caracteres especiales)  
✓ **Más rápido** que Excel  
✓ **Fácil de editar** manualmente  
✓ **Compatible** con cualquier programa  
✓ **Sin dependencias** adicionales en runtime  

---

## 💡 CREAR CSV MANUALMENTE

Si prefieres crear el CSV manualmente:

1. Abre **Notepad** o **Excel**
2. Crea una tabla con: `Código, Nombre, Nivel, Naturaleza, Movimiento`
3. Guarda como **CSV** (delimitado por comas)
4. Coloca en carpeta `backend/`
5. Ejecuta: `npm run seed:puc-csv "nombre.csv"`

---

## 🆘 TROUBLESHOOTING

### Archivo no encontrado
- Asegúrate que el CSV esté en: `C:\Users\alejandro.gutierrez\Downloads\aplicacione contable personal\backend\`
- Verifica el nombre exacto del archivo

### Columnas no detectadas
- El script detecta automáticamente: `Código`, `Nombre`, `Nivel`, `Naturaleza`, `Movimiento`
- Si tus columnas tienen otros nombres, renómbralas

### Error de codificación
- Guarda el CSV como **UTF-8 sin BOM**
- En Excel: Guardar Como → CSV UTF-8

---

## 🎉 ¡LISTO!

CSV es mucho más simple que Excel. Úsalo para evitar problemas 🚀
