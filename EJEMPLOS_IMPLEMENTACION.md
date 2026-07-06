# Ejemplos Prácticos de Implementación

## 🎯 Ejemplos de Código TypeScript/SQL

Usa estos ejemplos como referencia para implementar los endpoints y servicios.

---

## 1. COMPRA EN CONTADO (Lo más común)

### Endpoint
```typescript
// POST /api/v1/transactions/cash-purchase
app.post('/transactions/cash-purchase', async (req, res) => {
  const {
    fecha,
    descripcion,
    monto,
    id_metodo_pago, // ID del método (Efectivo, Banco, etc.)
    items // [{ descripcion, cantidad, precio_unitario, iva? }]
  } = req.body;

  try {
    const asiento = await createCashPurchaseTransaction({
      fecha: new Date(fecha),
      descripcion,
      comprobante_tipo: 'EGRESO',
      metodo_pago_id: id_metodo_pago,
      items
    });

    res.json({ success: true, asiento });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Lógica en Servicio
```typescript
export async function createCashPurchaseTransaction(data: TransactionData) {
  // 1. Obtener el método de pago (trae PUC automáticamente)
  const metodo = await prisma.metodoPago.findUnique({
    where: { id_metodo: data.metodo_pago_id },
    include: { puc: true }
  });

  if (!metodo || !metodo.puc_codigo) {
    throw new Error('Método de pago no tiene PUC configurado');
  }

  // 2. Calcular totales
  let totalGasto = 0;
  let totalIVA = 0;
  const detalles: AsientoDetalleData[] = [];

  for (const item of data.items) {
    const subtotal = item.cantidad * item.precio_unitario;
    const iva = subtotal * ((item.porcentaje_iva || 0) / 100);

    totalGasto += subtotal;
    totalIVA += iva;

    // Débito: Gasto
    detalles.push({
      puc_codigo: '510505', // Gasto general
      debito: new Decimal(subtotal),
      credito: new Decimal(0),
      descripcion: item.descripcion
    });

    // Débito: IVA (si aplica)
    if (iva > 0) {
      detalles.push({
        puc_codigo: '240801', // IVA crédito
        debito: new Decimal(iva),
        credito: new Decimal(0),
      });
    }
  }

  // 3. Crédito: Método de pago
  detalles.push({
    puc_codigo: metodo.puc_codigo,
    debito: new Decimal(0),
    credito: new Decimal(totalGasto + totalIVA),
  });

  // 4. Validar partida doble
  const totalDebito = detalles.reduce((sum, d) => sum + Number(d.debito), 0);
  const totalCredito = detalles.reduce((sum, d) => sum + Number(d.credito), 0);

  if (Math.abs(totalDebito - totalCredito) > 0.01) {
    throw new Error('Partida doble no válida');
  }

  // 5. Crear asiento
  const asiento = await prisma.asientoContable.create({
    data: {
      fecha: data.fecha,
      descripcion: data.descripcion,
      comprobante_tipo: 'EGRESO',
      asiento_detalles: {
        create: detalles
      }
    },
    include: { asiento_detalles: true }
  });

  // 6. Actualizar saldo del método de pago
  await prisma.metodoPago.update({
    where: { id_metodo: data.metodo_pago_id },
    data: {
      saldo_actual: {
        decrement: totalGasto + totalIVA
      }
    }
  });

  return asiento;
}
```

### Frontend (React)
```typescript
// components/CashPurchaseForm.tsx
import { useState } from 'react';
import axios from 'axios';

export function CashPurchaseForm() {
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [idMetodoPago, setIdMetodoPago] = useState('');
  const [metodoPagos, setMetodoPagos] = useState([]);

  // Cargar métodos de pago al montar
  useEffect(() => {
    axios.get('/api/v1/metodos-pago').then(res => {
      setMetodoPagos(res.data.filter(m => m.tipo !== 'TARJETA'));
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      fecha: new Date().toISOString().split('T')[0],
      descripcion,
      id_metodo_pago: parseInt(idMetodoPago),
      items: [
        {
          descripcion,
          cantidad: 1,
          precio_unitario: parseFloat(monto),
          iva: 0
        }
      ]
    };

    try {
      const response = await axios.post('/api/v1/transactions/cash-purchase', payload);
      alert(`✅ Asiento ${response.data.asiento.id_asiento} creado`);
      // Limpiar y recargar
    } catch (error) {
      alert(`❌ Error: ${error.response.data.error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Descripción"
        value={descripcion}
        onChange={e => setDescripcion(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Monto"
        value={monto}
        onChange={e => setMonto(e.target.value)}
        required
      />
      <select value={idMetodoPago} onChange={e => setIdMetodoPago(e.target.value)} required>
        <option>-- Selecciona método --</option>
        {metodoPagos.map(m => (
          <option key={m.id_metodo} value={m.id_metodo}>
            {m.nombre} (Saldo: ${m.saldo_actual})
          </option>
        ))}
      </select>
      <button type="submit">Registrar Gasto</button>
    </form>
  );
}
```

---

## 2. COMPRA CON TARJETA DE CRÉDITO

### Endpoint
```typescript
app.post('/transactions/credit-purchase', async (req, res) => {
  const {
    fecha,
    descripcion,
    monto,
    id_tarjeta,
    cuotas = 1
  } = req.body;

  try {
    const asiento = await createCreditCardTransaction({
      fecha: new Date(fecha),
      descripcion,
      monto,
      id_tarjeta,
      cuotas
    });

    res.json({ success: true, asiento });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Lógica
```typescript
export async function createCreditCardTransaction(data: {
  fecha: Date;
  descripcion: string;
  monto: number;
  id_tarjeta: number;
  cuotas: number;
}) {
  // 1. Obtener tarjeta
  const tarjeta = await prisma.tarjetaCredito.findUnique({
    where: { id_tarjeta: data.id_tarjeta }
  });

  if (!tarjeta) throw new Error('Tarjeta no encontrada');

  // 2. Validar límite
  const nuevoSaldo = tarjeta.saldo_actual + data.monto;
  if (nuevoSaldo > tarjeta.limite_credito) {
    throw new Error(`Límite excedido. Disponible: ${tarjeta.limite_credito - tarjeta.saldo_actual}`);
  }

  // 3. Crear asiento
  const asiento = await prisma.asientoContable.create({
    data: {
      fecha: data.fecha,
      descripcion: data.descripcion,
      comprobante_tipo: 'EGRESO',
      asiento_detalles: {
        create: [
          {
            puc_codigo: '510505', // Gasto
            debito: new Decimal(data.monto),
            credito: new Decimal(0)
          },
          {
            puc_codigo: tarjeta.puc_cuenta_pasivo, // Pasivo (TC)
            debito: new Decimal(0),
            credito: new Decimal(data.monto)
          }
        ]
      }
    },
    include: { asiento_detalles: true }
  });

  // 4. Registrar compra en tarjeta
  await prisma.tarjetaCompra.create({
    data: {
      id_tarjeta: data.id_tarjeta,
      asiento_id: asiento.id_asiento,
      monto_original: new Decimal(data.monto),
      cuotas_totales: data.cuotas,
      cuotas_restantes: data.cuotas,
      saldo_capital: new Decimal(data.monto),
      fecha_compra: data.fecha,
      descripcion: data.descripcion,
      estado: 'PENDIENTE'
    }
  });

  // 5. Actualizar saldo de tarjeta
  await prisma.tarjetaCredito.update({
    where: { id_tarjeta: data.id_tarjeta },
    data: {
      saldo_actual: {
        increment: data.monto
      }
    }
  });

  return asiento;
}
```

---

## 3. CIERRE DE MES - INTERESES TARJETA

### Servicio
```typescript
export async function monthEndCloseCreditCards(mes: number, año: number) {
  // 1. Obtener todas las tarjetas
  const tarjetas = await prisma.tarjetaCredito.findMany({
    where: { activa: true },
    include: { compras: true }
  });

  const asientosCreados = [];

  for (const tarjeta of tarjetas) {
    // 2. Calcular intereses sobre saldo no pagado
    const saldoNoP agado = tarjeta.saldoActual;
    const interes = saldoNoP agado * (tarjeta.tasa_interes / 100);

    if (interes > 0) {
      // 3. Crear asiento de intereses
      const asiento = await prisma.asientoContable.create({
        data: {
          fecha: new Date(año, mes, 28), // Última de mes
          descripcion: `Intereses tarjeta ${tarjeta.nombre}`,
          comprobante_tipo: 'EGRESO',
          asiento_detalles: {
            create: [
              {
                puc_codigo: '520505', // Gasto intereses
                debito: new Decimal(interes),
                credito: new Decimal(0)
              },
              {
                puc_codigo: tarjeta.puc_cuenta_pasivo,
                debito: new Decimal(0),
                credito: new Decimal(interes)
              }
            ]
          }
        }
      });

      asientosCreados.push(asiento);

      // 4. Registrar interés en tabla de auditoría
      await prisma.interésTarjeta.create({
        data: {
          id_compra: tarjeta.compras[0].id_compra, // Primera compra del mes
          fecha: new Date(año, mes, 28),
          monto_interes: new Decimal(interes),
          tasa_aplicada: new Decimal(tarjeta.tasa_interes),
          asiento_id: asiento.id_asiento
        }
      });
    }
  }

  return asientosCreados;
}
```

### Endpoint
```typescript
app.post('/credit-cards/month-close', async (req, res) => {
  const { mes, año } = req.body;

  try {
    const asientos = await monthEndCloseCreditCards(mes, año);
    res.json({
      success: true,
      asientos_creados: asientos.length,
      asientos
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## 4. REGISTRAR INTERESES DE INVERSIÓN (CDT)

### Servicio
```typescript
export async function recordInvestmentInterest(
  id_inversion: number,
  fecha: Date
) {
  // 1. Obtener inversión
  const inversion = await prisma.productoInversion.findUnique({
    where: { id_inversion }
  });

  if (!inversion) throw new Error('Inversión no encontrada');

  // 2. Calcular interés mensual
  const interesMensual = (Number(inversion.monto_actual) * Number(inversion.tasa_interes)) / 100 / 12;

  if (interesMensual <= 0) {
    throw new Error('Interés no válido');
  }

  // 3. Crear asiento (DÉBITO inversión, CRÉDITO ingreso)
  const asiento = await prisma.asientoContable.create({
    data: {
      fecha,
      descripcion: `Intereses ${inversion.nombre_producto}`,
      comprobante_tipo: 'INGRESO',
      asiento_detalles: {
        create: [
          {
            puc_codigo: inversion.puc_cuenta_inversion, // 1103
            debito: new Decimal(interesMensual),
            credito: new Decimal(0)
          },
          {
            puc_codigo: inversion.puc_cuenta_ingreso || '4305', // Ingresos
            debito: new Decimal(0),
            credito: new Decimal(interesMensual),
            id_tercero: inversion.id_tercero
          }
        ]
      }
    }
  });

  // 4. Incrementar monto de inversión
  const montoNuevo = Number(inversion.monto_actual) + interesMensual;
  await prisma.productoInversion.update({
    where: { id_inversion },
    data: {
      monto_actual: new Decimal(montoNuevo)
    }
  });

  // 5. Registrar en tabla de auditoría
  await prisma.interésInversión.create({
    data: {
      id_inversion,
      fecha,
      monto_interes: new Decimal(interesMensual),
      tasa_aplicada: inversion.tasa_interes,
      asiento_id: asiento.id_asiento
    }
  });

  return { asiento, interes: interesMensual, montoNuevo };
}
```

### Endpoint
```typescript
app.post('/investments/:id/record-interest', async (req, res) => {
  const { id } = req.params;
  const { fecha } = req.body;

  try {
    const result = await recordInvestmentInterest(parseInt(id), new Date(fecha));
    res.json({
      success: true,
      interes_registrado: result.interes,
      monto_nuevo: result.montoNuevo,
      asiento_id: result.asiento.id_asiento
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## 5. REGISTRAR CONSUMO DE INVENTARIO

### Servicio
```typescript
export async function consumeInventory(id_producto: number, cantidad: number) {
  // 1. Obtener producto
  const producto = await prisma.inventarioProducto.findUnique({
    where: { id_producto }
  });

  if (!producto) throw new Error('Producto no encontrado');

  if (producto.stock_actual < cantidad) {
    throw new Error(`Stock insuficiente. Disponible: ${producto.stock_actual}`);
  }

  // 2. Decrementar stock
  const nuevoStock = Number(producto.stock_actual) - cantidad;
  
  await prisma.inventarioProducto.update({
    where: { id_producto },
    data: {
      stock_actual: new Decimal(nuevoStock),
      en_alerta: nuevoStock <= Number(producto.stock_minimo)
    }
  });

  // 3. Registrar movimiento
  const movimiento = await prisma.inventarioMovimiento.create({
    data: {
      id_producto,
      tipo_movimiento: 'SALIDA',
      cantidad: new Decimal(cantidad),
      fecha: new Date(),
      descripcion: 'Consumo'
    }
  });

  return { producto: producto.nombre, cantidadConsumida: cantidad, nuevoStock, movimiento };
}
```

### Endpoint
```typescript
app.post('/inventory/:id/consume', async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;

  try {
    const result = await consumeInventory(parseInt(id), cantidad);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## 6. GENERAR REPORTE: BALANCE SHEET

### Servicio
```typescript
export async function generateBalanceSheet(fecha: Date) {
  const asientos = await prisma.asientoDetalle.findMany({
    where: {
      asiento: {
        fecha: { lte: fecha }
      }
    },
    include: {
      puc: true
    }
  });

  // Agrupar por PUC y calcular saldos
  const byPuc: Record<string, number> = {};

  for (const detalle of asientos) {
    const debito = Number(detalle.debito);
    const credito = Number(detalle.credito);
    const naturaleza = detalle.puc.naturaleza;

    // Saldo = Débito - Crédito para naturaleza D, Crédito - Débito para C
    const saldo = naturaleza === 'D' ? debito - credito : credito - debito;

    if (!byPuc[detalle.puc_codigo]) {
      byPuc[detalle.puc_codigo] = 0;
    }
    byPuc[detalle.puc_codigo] += saldo;
  }

  // Agrupar por tipo
  const activos: any[] = [];
  const pasivos: any[] = [];
  const patrimonio: any[] = [];

  for (const [codigo, saldo] of Object.entries(byPuc)) {
    const puc = await prisma.puc.findUnique({ where: { codigo } });
    if (!puc) continue;

    const item = { codigo, nombre: puc.nombre, saldo };

    if (puc.tipo === 'ACTIVO') activos.push(item);
    else if (puc.tipo === 'PASIVO') pasivos.push(item);
    else if (puc.tipo === 'PATRIMONIO') patrimonio.push(item);
  }

  const totalActivos = activos.reduce((sum, a) => sum + a.saldo, 0);
  const totalPasivos = pasivos.reduce((sum, p) => sum + p.saldo, 0);
  const totalPatrimonio = patrimonio.reduce((sum, p) => sum + p.saldo, 0);

  return {
    fecha,
    activos: { items: activos, total: totalActivos },
    pasivos: { items: pasivos, total: totalPasivos },
    patrimonio: { items: patrimonio, total: totalPatrimonio },
    ecuacion: totalActivos === totalPasivos + totalPatrimonio ? '✅ VÁLIDO' : '❌ NO VÁLIDO'
  };
}
```

### Endpoint
```typescript
app.get('/reports/balance-sheet', async (req, res) => {
  const { fecha } = req.query;
  
  try {
    const report = await generateBalanceSheet(new Date(fecha as string));
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## 7. QUERY SQL: OBTENER ESTADO DE RESULTADOS

```sql
-- Estado de Resultados (PyG) para período enero-julio 2024
SELECT 
  puc.tipo,
  puc.codigo,
  puc.nombre,
  SUM(CASE 
    WHEN puc.naturaleza = 'D' THEN ad.debito - ad.credito 
    ELSE ad.credito - ad.debito 
  END) as valor
FROM asiento_detalles ad
JOIN asientos_contables a ON ad.asiento_id = a.id_asiento
JOIN puc ON ad.puc_codigo = puc.codigo
WHERE a.fecha BETWEEN '2024-01-01' AND '2024-07-31'
  AND puc.tipo IN ('INGRESOS', 'GASTOS', 'COSTOS')
GROUP BY puc.tipo, puc.codigo, puc.nombre
ORDER BY puc.tipo DESC, SUM(ad.debito - ad.credito) DESC;
```

---

## 8. QUERY SQL: OBTENER SALDO DE TARJETA

```sql
-- Saldo actual por tarjeta
SELECT 
  tc.id_tarjeta,
  tc.nombre,
  tc.numero_ultimos,
  tc.saldo_actual,
  tc.limite_credito,
  (tc.limite_credito - tc.saldo_actual) as disponible,
  COUNT(tcc.id_compra) as compras_mes,
  SUM(tcc.monto_original) as total_compras_mes
FROM tarjetas_credito tc
LEFT JOIN tarjeta_compras tcc ON tc.id_tarjeta = tcc.id_tarjeta
  AND MONTH(tcc.fecha_compra) = MONTH(CURRENT_DATE)
  AND YEAR(tcc.fecha_compra) = YEAR(CURRENT_DATE)
GROUP BY tc.id_tarjeta, tc.nombre, tc.numero_ultimos, tc.saldo_actual, tc.limite_credito
ORDER BY tc.saldo_actual DESC;
```

---

## 9. QUERY SQL: FORECAST ANUAL

```sql
-- Proyección de gasto anual considerando recurrentes
WITH gastos_reales AS (
  SELECT 
    EXTRACT(MONTH FROM a.fecha) as mes,
    SUM(ad.debito - ad.credito) as gasto_mes
  FROM asiento_detalles ad
  JOIN asientos_contables a ON ad.asiento_id = a.id_asiento
  JOIN puc ON ad.puc_codigo = puc.codigo
  WHERE puc.tipo = 'GASTOS' 
    AND a.fecha >= DATE_TRUNC('YEAR', CURRENT_DATE)
  GROUP BY mes
),
gastos_recurrentes AS (
  SELECT 
    mes,
    SUM(monto) as gasto_recurrente
  FROM gastos_recurrentes,
    jsonb_array_elements((meses_activos)::jsonb) as mes
  WHERE activa = true
  GROUP BY mes
)
SELECT 
  mes,
  COALESCE(gr.gasto_mes, 0) + COALESCE(grec.gasto_recurrente, 0) as gasto_proyectado
FROM gastos_reales gr
FULL OUTER JOIN gastos_recurrentes grec USING (mes)
ORDER BY mes;
```

---

## 🎯 Flujo de Uso Típico

1. **Usuario crea compra**: `POST /api/v1/transactions/cash-purchase`
2. **Sistema crea asiento**: Automáticamente
3. **Usuario al mes cierra**: `POST /api/v1/credit-cards/month-close`
4. **Sistema calcula intereses**: Automáticamente
5. **Usuario consulta PyG**: `GET /api/v1/reports/income-statement?fecha=2024-07-31`
6. **Sistema muestra resultados**: Balance + Estado de Resultados

---

## 📚 Estructura Completa

Con estos ejemplos tienes:
✅ Transacciones en contado  
✅ Transacciones con tarjeta  
✅ Cálculo de intereses  
✅ Gestión de inversiones  
✅ Reportes financieros  
✅ Auditoría completa  

¡Listo para implementar! 🚀
