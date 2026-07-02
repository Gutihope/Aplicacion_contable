# 📡 Ejemplos de Uso de API

Guía completa con curl, JavaScript y PostMan para todos los endpoints.

---

## 🔐 Base URL

```
http://localhost:5000/api/v1
```

---

## 💳 TRANSACCIONES

### 1. Crear Compra en Contado (con PDF)

**Descripción:** Usuario compra en Carrefour pagando con efectivo. Se sube factura a Google Drive.

#### curl

```bash
curl -X POST http://localhost:5000/api/v1/transactions/cash-purchase \
  -F "fecha=2024-07-02" \
  -F "descripcion=Compra Carrefour" \
  -F "metodo_pago_id=1" \
  -F "items=[{\"cantidad\": 2, \"precio_unitario\": 50000, \"porcentaje_iva\": 19}]" \
  -F "invoice_pdf=@/ruta/factura.pdf"
```

#### JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append('fecha', '2024-07-02');
formData.append('descripcion', 'Compra Carrefour');
formData.append('metodo_pago_id', '1');
formData.append('items', JSON.stringify([
  {
    cantidad: 2,
    precio_unitario: 50000,
    porcentaje_iva: 19
  }
]));

// Agregar archivo PDF
const fileInput = document.getElementById('facturaInput');
formData.append('invoice_pdf', fileInput.files[0]);

const response = await fetch('http://localhost:5000/api/v1/transactions/cash-purchase', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Asiento creado:', result.asiento_id);
console.log('PDF en Google Drive:', result.google_drive_file_id);
```

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Transacción de compra en contado creada exitosamente",
  "asiento_id": 42,
  "google_drive_file_id": "1a2b3c4d5e6f7g8h9i",
  "asiento": {
    "id_asiento": 42,
    "fecha": "2024-07-02",
    "descripcion": "Compra Carrefour",
    "comprobante_tipo": "Egreso",
    "google_drive_file_id": "1a2b3c4d5e6f7g8h9i",
    "google_drive_webview_link": "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i/view",
    "asiento_detalles": [
      {
        "id_detalle": 101,
        "asiento_id": 42,
        "puc_codigo": "140505",
        "id_tercero": null,
        "debito": "119000",
        "credito": "0"
      },
      {
        "id_detalle": 102,
        "asiento_id": 42,
        "puc_codigo": "240801",
        "id_tercero": null,
        "debito": "19000",
        "credito": "0"
      },
      {
        "id_detalle": 103,
        "asiento_id": 42,
        "puc_codigo": "110101",
        "id_tercero": null,
        "debito": "0",
        "credito": "100000"
      }
    ]
  }
}
```

---

### 2. Crear Compra a Crédito (Tarjeta)

**Descripción:** Compra en Amazon de $200.000 en 3 cuotas con tarjeta de crédito.

#### curl

```bash
curl -X POST http://localhost:5000/api/v1/transactions/credit-purchase \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2024-07-02",
    "descripcion": "Compra Amazon - Laptop",
    "tipo_credito": "TARJETA",
    "id_tarjeta": 2,
    "establecimiento_tercero_id": 15,
    "cuotas_totales": 3,
    "items": [
      {
        "cantidad": 1,
        "precio_unitario": 200000,
        "porcentaje_iva": 19
      }
    ]
  }'
```

#### JavaScript

```javascript
const response = await fetch('http://localhost:5000/api/v1/transactions/credit-purchase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fecha: '2024-07-02',
    descripcion: 'Compra Amazon - Laptop',
    tipo_credito: 'TARJETA',
    id_tarjeta: 2,
    establecimiento_tercero_id: 15,
    cuotas_totales: 3,
    items: [
      {
        cantidad: 1,
        precio_unitario: 200000,
        porcentaje_iva: 19
      }
    ]
  })
});
```

---

## 💰 INVERSIONES Y CDTs

### 1. Listar Inversiones Activas

#### curl

```bash
curl -X GET http://localhost:5000/api/v1/investments
```

#### Respuesta

```json
{
  "success": true,
  "data": [
    {
      "id_inversion": 1,
      "nombre_producto": "CDT Bancolombia 90 días",
      "id_tercero": 5,
      "puc_cuenta_inversion": "1103050101",
      "puc_cuenta_ingreso": "410501",
      "monto_inicial": "10000000",
      "fecha_apertura": "2024-03-15",
      "estado": "ACTIVO"
    },
    {
      "id_inversion": 2,
      "nombre_producto": "Fondo Protección - Davivienda",
      "id_tercero": 6,
      "puc_cuenta_inversion": "1103050102",
      "puc_cuenta_ingreso": "410502",
      "monto_inicial": "5000000",
      "fecha_apertura": "2024-04-01",
      "estado": "ACTIVO"
    }
  ]
}
```

### 2. Registrar Intereses de una Inversión

**Descripción:** CDT generó $125.000 de intereses en julio.

#### curl

```bash
curl -X POST http://localhost:5000/api/v1/investments/1/record-interest \
  -H "Content-Type: application/json" \
  -d '{
    "monto_interes": 125000,
    "fecha": "2024-07-31"
  }'
```

#### JavaScript

```javascript
const response = await fetch('http://localhost:5000/api/v1/investments/1/record-interest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    monto_interes: 125000,
    fecha: '2024-07-31'
  })
});

const result = await response.json();
console.log(`Intereses registrados. Asiento: ${result.asiento_id}`);
```

### 3. Cierre de Mes - Todas las Inversiones

**Descripción:** Registrar intereses de todas las inversiones para julio.

#### curl

```bash
curl -X POST http://localhost:5000/api/v1/investments/month-close \
  -H "Content-Type: application/json" \
  -d '{
    "mes": 7,
    "año": 2024,
    "intereses": [
      { "id_inversion": 1, "monto": 125000 },
      { "id_inversion": 2, "monto": 60000 }
    ]
  }'
```

#### Respuesta

```json
{
  "success": true,
  "message": "Cierre de mes completado. 2 asientos generados",
  "asientos": [
    {
      "id_asiento": 51,
      "descripcion": "Intereses generados - CDT Bancolombia 90 días"
    },
    {
      "id_asiento": 52,
      "descripcion": "Intereses generados - Fondo Protección - Davivienda"
    }
  ]
}
```

---

## 💳 TARJETAS DE CRÉDITO

### 1. Listar Tarjetas y Compras Vigentes

#### curl

```bash
curl -X GET http://localhost:5000/api/v1/credit-cards

curl -X GET http://localhost:5000/api/v1/credit-cards/2/purchases
```

### 2. Cierre de Mes - Tarjeta de Crédito

**Descripción:** 
- Cuota de manejo: $25.000
- Interés compra 1 (cuota 1 de 3): $5.000
- Interés compra 2 (cuota 2 de 3): $8.000

#### curl

```bash
curl -X POST http://localhost:5000/api/v1/credit-cards/2/month-close \
  -H "Content-Type: application/json" \
  -d '{
    "mes": 7,
    "año": 2024,
    "cuota_manejo": 25000,
    "compras_intereses": [
      { "id_compra_tc": 1, "interes_individual": 5000 },
      { "id_compra_tc": 2, "interes_individual": 8000 }
    ]
  }'
```

#### JavaScript

```javascript
const response = await fetch('http://localhost:5000/api/v1/credit-cards/2/month-close', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mes: 7,
    año: 2024,
    cuota_manejo: 25000,
    compras_intereses: [
      { id_compra_tc: 1, interes_individual: 5000 },
      { id_compra_tc: 2, interes_individual: 8000 }
    ]
  })
});

const result = await response.json();
console.log('Resumen:', {
  'Cuota de manejo': '$25.000',
  'Intereses totales': '$13.000',
  'Total movimiento': '$38.000',
  'Asientos generados': result.resumen.asientos_generados
});
```

#### Respuesta

```json
{
  "success": true,
  "message": "Cierre de mes completado para Visa Débito Personas",
  "resumen": {
    "cuota_manejo": 25000,
    "intereses_totales": 13000,
    "total_movimiento": 38000,
    "asientos_generados": 3
  },
  "asientos": [...]
}
```

---

## 📦 INVENTARIO

### 1. Ver Alertas de Despensa

#### curl

```bash
curl -X GET http://localhost:5000/api/v1/inventory/alerts
```

#### Respuesta

```json
{
  "success": true,
  "alertas_count": 3,
  "data": [
    {
      "id_producto": 5,
      "nombre": "Aceite de oliva",
      "stock_actual": "0.5",
      "stock_minimo": "2",
      "unidad_medida": "litros",
      "en_alerta": true,
      "porcentaje_stock": 25
    },
    {
      "id_producto": 8,
      "nombre": "Harina integral",
      "stock_actual": "1",
      "stock_minimo": "5",
      "unidad_medida": "kg",
      "en_alerta": true,
      "porcentaje_stock": 20
    }
  ]
}
```

### 2. Registrar Consumo Rápido (Despensa)

**Descripción:** Se consumieron 0.5 litros de aceite en el hogar.

#### curl

```bash
curl -X POST http://localhost:5000/api/v1/inventory/products/5/consume \
  -H "Content-Type: application/json" \
  -d '{
    "cantidad": 0.5
  }'
```

#### JavaScript

```javascript
const response = await fetch('http://localhost:5000/api/v1/inventory/products/5/consume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cantidad: 0.5 })
});

const result = await response.json();
console.log(`${result.message} | Stock: ${result.stock_anterior} → ${result.stock_nuevo}`);
```

#### Respuesta

```json
{
  "success": true,
  "message": "Consumo registrado: -0.5 litros",
  "stock_anterior": 1,
  "stock_nuevo": 0.5,
  "en_alerta": true
}
```

### 3. Reabastecer Inventario

**Descripción:** Se compró 5 litros de aceite en Carrefour.

#### curl

```bash
curl -X POST http://localhost:5000/api/v1/inventory/products/5/restock \
  -H "Content-Type: application/json" \
  -d '{
    "cantidad": 5,
    "factura_detalle_id": 42
  }'
```

---

## 📊 REPORTES Y ANÁLISIS

### 1. Balance General (Enero a Julio 2024)

#### curl

```bash
curl -X GET "http://localhost:5000/api/v1/reports/balance-sheet?from_date=2024-01-01&to_date=2024-07-31"
```

#### Respuesta

```json
{
  "success": true,
  "periodo": {
    "desde": "2024-01-01",
    "hasta": "2024-07-31"
  },
  "balance": {
    "activos": {
      "items": [
        { "codigo": "110101", "nombre": "Efectivo", "saldo": 5250000 },
        { "codigo": "140505", "nombre": "Inventario", "saldo": 850000 }
      ],
      "total": 6100000
    },
    "pasivos": {
      "items": [
        { "codigo": "210101", "nombre": "Cuentas por pagar", "saldo": 450000 }
      ],
      "total": 450000
    },
    "patrimonio": {
      "items": [
        { "codigo": "310101", "nombre": "Capital", "saldo": 5650000 }
      ],
      "total": 5650000
    },
    "ecuacion_contable": {
      "activos": 6100000,
      "pasivos_patrimonio": 6100000,
      "balanceado": true
    }
  }
}
```

### 2. Estado de Resultados

#### curl

```bash
curl -X GET "http://localhost:5000/api/v1/reports/income-statement?from_date=2024-01-01&to_date=2024-07-31"
```

#### Respuesta

```json
{
  "success": true,
  "periodo": {
    "desde": "2024-01-01",
    "hasta": "2024-07-31"
  },
  "estado_resultados": {
    "ingresos": {
      "detalle": [
        { "puc": "410501", "valor": 2500000 },
        { "puc": "410502", "valor": 185000 }
      ],
      "total": 2685000
    },
    "gastos": {
      "detalle": [
        { "puc": "510505", "valor": 1200000 },
        { "puc": "530535", "valor": 156000 }
      ],
      "total": 1356000
    },
    "resultado_neto": 1329000,
    "margen": 49
  }
}
```

### 3. Forecast de Flujo de Caja

**Descripción:** Proyectar gastos hasta fin de año basado en histórico + gastos recurrentes.

#### curl

```bash
curl -X GET "http://localhost:5000/api/v1/reports/forecast?year=2024"
```

#### Respuesta

```json
{
  "success": true,
  "año": 2024,
  "mes_actual": 7,
  "forecast": [
    {
      "mes": 1,
      "mes_nombre": "enero",
      "gastos_mes": 180000,
      "acumulado": 180000,
      "es_proyectado": false
    },
    ...
    {
      "mes": 7,
      "mes_nombre": "julio",
      "gastos_mes": 156000,
      "acumulado": 1156000,
      "es_proyectado": false
    },
    {
      "mes": 8,
      "mes_nombre": "agosto",
      "gastos_mes": 350000,
      "acumulado": 1506000,
      "es_proyectado": true
    },
    ...
    {
      "mes": 12,
      "mes_nombre": "diciembre",
      "gastos_mes": 450000,
      "acumulado": 2856000,
      "es_proyectado": true
    }
  ],
  "total_estimado_año": 2856000
}
```

---

## ⚠️ Manejo de Errores

### Error: Partida Doble No Cumplida

```json
{
  "error": true,
  "message": "❌ La transacción no cumple con partida doble"
}
```

### Error: Método de Pago No Configurado

```json
{
  "error": true,
  "message": "Método de pago 999 no tiene PUC configurado"
}
```

### Error: Stock Insuficiente

```json
{
  "error": true,
  "message": "Stock insuficiente. Disponible: 2, Solicitado: 5"
}
```

### Error: Google Drive - Archivo No Subido

```json
{
  "success": true,
  "asiento_id": 42,
  "google_drive_file_id": null,
  "message": "Transacción creada pero Google Drive service account no disponible"
}
```

---

## 🧪 Testing con Postman

### Crear Colección

1. Abre Postman
2. Crea nueva colección: "Contabilidad Personal"
3. Agrega las siguientes carpetas:
   - Transacciones
   - Inversiones
   - Tarjetas
   - Inventario
   - Reportes

### Importar Environment

```json
{
  "id": "...",
  "name": "Local Dev",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:5000/api/v1",
      "type": "string"
    },
    {
      "key": "asiento_id",
      "value": "42",
      "type": "string"
    }
  ]
}
```

### Usar Variables

```
POST {{base_url}}/transactions/:id
GET  {{base_url}}/investments/{{investment_id}}/record-interest
```

---

## 📝 Scripts Post-Request

En Postman, agrega scripts para validar respuestas:

```javascript
pm.test("Respuesta exitosa", function () {
    pm.response.to.have.status(200);
    pm.expect(pm.response.json().success).to.be.true;
});

pm.test("Asiento tiene ID", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.asiento_id).to.be.a('number');
});
```

---

## 🔑 Notas Importantes

1. **Formato de Fecha:** `YYYY-MM-DD`
2. **Moneda:** Todos los valores en COP
3. **Decimales:** Máximo 2 lugares (DECIMAL(12,2))
4. **IVA:** Porcentaje (0, 5, 19)
5. **Validación Automática:** La partida doble se valida en backend
6. **Transacciones Atómicas:** Si falla una parte, todo se revierte
