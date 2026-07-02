# ⚡ INICIO RÁPIDO - 5 MINUTOS

Toda la aplicación lista para probar.

---

## 🏁 Paso 1: Inicia PostgreSQL (1 min)

```bash
# Terminal 1
cd aplicacion-contable-personal
docker-compose up -d postgres

# Espera 5 segundos
# Verifica:
docker ps | grep postgres
```

---

## 🏁 Paso 2: Carga el PUC (2 min)

```bash
# Terminal 2
cd backend
npm install
npm run db:push

# Luego carga tu PUC:
npm run seed:puc "C:\Users\alejandro.gutierrez\OneDrive - Fundación Universitaria Cafam\Puc aplicación.xlsx"

# Cuando pregunte: ¿Deseas continuar? (sí/no):
# Escribe: sí
```

✅ Salida esperada:
```
✅ 1250 registros válidos
✅ ¡ÉXITO! Datos cargados
📊 Total de PUCs insertados: 1250
```

---

## 🏁 Paso 3: Datos Base (1 min)

```bash
# Misma terminal 2
npm run seed:base

# Inserta bancos y métodos de pago
```

---

## 🏁 Paso 4: Inicia Backend (1 min)

```bash
# Terminal 2
npm run dev

# Espera a ver:
# 🚀 Servidor iniciado en puerto 5000
# 📍 API disponible en http://localhost:5000/api/v1
```

---

## 🏁 Paso 5: Inicia Frontend

```bash
# Terminal 3
cd frontend
npm install
npm run dev

# Espera a ver:
# ➜  Local:   http://localhost:5173/
```

---

## ✅ Listo para Probar

Abre: **http://localhost:5173**

### Prueba esto:

1. **Crear Transacción:**
   - Click: "📋 Transacción Inteligente"
   - Llenar formulario
   - Click: "✅ Guardar"

2. **Ver Alertas:**
   - Click: "🚨 Alertas Inventario"
   - (Verá vacío, es normal sin datos)

3. **Ver Balance:**
   - Click: "📊 Reportes"
   - Verá balance balanceado

---

## 🐛 Si algo falla

### Puerto 5000 en uso
```bash
lsof -i :5000
kill -9 <PID>
```

### Errores de dependencias
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### BD no conecta
```bash
docker-compose down
docker-compose up -d postgres
```

---

## 📊 Ver datos en BD

```bash
# Terminal nueva
npm run db:studio

# Se abre http://localhost:5555
```

---

## 🎉 LISTO

```
✅ Backend: http://localhost:5000
✅ Frontend: http://localhost:5173
✅ BD: PostgreSQL corriendo
✅ PUC: Cargado desde Excel
```

Prueba las transacciones y reportes. 🚀
