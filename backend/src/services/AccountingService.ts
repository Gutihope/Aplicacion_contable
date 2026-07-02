import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

/**
 * Servicio de Contabilidad que implementa:
 * - Validación de partida doble
 * - Cálculo automático de cuentas
 * - Asignación de PUC según reglas de negocio
 */

export interface TransactionLineItem {
  descripcion?: string;
  id_producto?: number;
  cantidad?: number;
  precio_unitario?: number;
  porcentaje_iva?: number;
}

export interface TransactionData {
  fecha: Date;
  descripcion: string;
  comprobante_tipo: 'Egreso' | 'Ingreso' | 'Nota Contable';
  metodo_pago_id?: number;
  id_tarjeta?: number; // Para compras diferidas
  cuotas_totales?: number;
  establecimiento_tercero_id?: number;
  items: TransactionLineItem[];
  google_drive_file_id?: string;
  google_drive_webview_link?: string;
}

interface AsientoDetalleData {
  puc_codigo: string;
  id_tercero?: number;
  debito: Decimal;
  credito: Decimal;
}

/**
 * Valida que la suma de débitos = suma de créditos (Partida Doble)
 */
const validateDoubleEntry = (detalles: AsientoDetalleData[]): boolean => {
  const totalDebito = detalles.reduce(
    (sum, d) => sum + Number(d.debito),
    0
  );
  const totalCredito = detalles.reduce(
    (sum, d) => sum + Number(d.credito),
    0
  );

  console.log(`Validando partida doble: Débito=${totalDebito}, Crédito=${totalCredito}`);

  // Permitir pequeños errores de redondeo (0.01 COP)
  return Math.abs(totalDebito - totalCredito) < 0.01;
};

/**
 * Obtiene la cuenta PUC para un método de pago
 */
const getPUCForPaymentMethod = async (
  metodo_pago_id: number
): Promise<{ puc_codigo: string; naturaleza: string }> => {
  const metodo = await prisma.metodoPagoCuenta.findUnique({
    where: { id_metodo: metodo_pago_id },
    include: { puc: true },
  });

  if (!metodo || !metodo.puc) {
    throw new Error(`Método de pago ${metodo_pago_id} no tiene PUC configurado`);
  }

  return { puc_codigo: metodo.puc.codigo, naturaleza: metodo.puc.naturaleza };
};

/**
 * Crea un asiento contable de compra en CONTADO
 * Estructura:
 *   DÉBITO:  Gasto / Inventario (según tipo de producto)
 *   CRÉDITO: Cuenta de pago (Efectivo, Nequi, Banco)
 */
export const createCashPurchaseTransaction = async (
  data: TransactionData
): Promise<any> => {
  if (!data.metodo_pago_id) {
    throw new Error('Se requiere metodo_pago_id para compra en contado');
  }

  // Obtener PUC del método de pago
  const paymentPuc = await getPUCForPaymentMethod(data.metodo_pago_id);

  const detalles: AsientoDetalleData[] = [];
  let totalAmount = 0;
  let totalIVA = 0;

  // Procesar cada item
  for (const item of data.items) {
    if (!item.precio_unitario || !item.cantidad) continue;

    const subtotal = item.cantidad * item.precio_unitario;
    const iva = subtotal * ((item.porcentaje_iva || 0) / 100);
    totalAmount += subtotal;
    totalIVA += iva;

    // Determinar cuenta de destino (Gasto o Inventario)
    let pucGasto = '510505'; // Gasto directo por defecto
    if (item.id_producto) {
      // Verificar si es producto de inventario o gasto
      const producto = await prisma.inventarioProducto.findUnique({
        where: { id_producto: item.id_producto },
      });

      if (producto) {
        pucGasto = '140505'; // Inventario de consumibles
      }
    }

    // Débito: Cuenta del gasto o inventario
    detalles.push({
      puc_codigo: pucGasto,
      debito: new Decimal(subtotal),
      credito: new Decimal(0),
    });

    // Débito: IVA si aplica
    if (iva > 0) {
      detalles.push({
        puc_codigo: '240801', // IVA por pagar (crédito fiscal)
        debito: new Decimal(iva),
        credito: new Decimal(0),
      });
    }
  }

  // Crédito: Cuenta del método de pago
  const totalWithIVA = totalAmount + totalIVA;
  detalles.push({
    puc_codigo: paymentPuc.puc_codigo,
    debito: new Decimal(0),
    credito: new Decimal(totalWithIVA),
  });

  // Validar partida doble
  if (!validateDoubleEntry(detalles)) {
    throw new Error('❌ La transacción no cumple con partida doble');
  }

  // Crear asiento
  const asiento = await prisma.asientoContable.create({
    data: {
      fecha: data.fecha,
      descripcion: data.descripcion,
      comprobante_tipo: data.comprobante_tipo,
      google_drive_file_id: data.google_drive_file_id,
      google_drive_webview_link: data.google_drive_webview_link,
      asiento_detalles: {
        create: detalles,
      },
    },
    include: { asiento_detalles: true },
  });

  // Actualizar inventario si hay movimientos
  for (const item of data.items) {
    if (item.id_producto && item.cantidad) {
      await prisma.inventarioProducto.update({
        where: { id_producto: item.id_producto },
        data: {
          stock_actual: {
            increment: item.cantidad,
          },
        },
      });

      // Registrar movimiento
      await prisma.inventarioMovimiento.create({
        data: {
          id_producto: item.id_producto,
          tipo_movimiento: 'ENTRADA',
          cantidad: new Decimal(item.cantidad),
        },
      });
    }
  }

  return asiento;
};

/**
 * Crea un asiento contable de compra a CRÉDITO (Tarjeta o Proveedor)
 */
export const createCreditPurchaseTransaction = async (
  data: TransactionData
): Promise<any> => {
  if (!data.id_tarjeta && !data.establecimiento_tercero_id) {
    throw new Error('Se requiere id_tarjeta o establecimiento_tercero_id');
  }

  const detalles: AsientoDetalleData[] = [];
  let totalAmount = 0;

  // Procesar items
  for (const item of data.items) {
    if (!item.precio_unitario || !item.cantidad) continue;

    const subtotal = item.cantidad * item.precio_unitario;
    totalAmount += subtotal;

    // Débito: Gasto o inventario
    const pucGasto = item.id_producto ? '140505' : '510505';
    detalles.push({
      puc_codigo: pucGasto,
      debito: new Decimal(subtotal),
      credito: new Decimal(0),
    });
  }

  // Crédito: Según tipo de crédito
  let pucCredito = '';
  let idTercero: number | undefined;

  if (data.id_tarjeta) {
    // Obtener PUC de la tarjeta
    const tarjeta = await prisma.tarjetaCredito.findUnique({
      where: { id_tarjeta: data.id_tarjeta },
    });
    if (!tarjeta) throw new Error('Tarjeta no encontrada');
    pucCredito = tarjeta.puc_cuenta_pasivo;
  } else {
    // Cuenta por pagar a proveedor
    pucCredito = '220505'; // PUC de proveedores
    idTercero = data.establecimiento_tercero_id;
  }

  detalles.push({
    puc_codigo: pucCredito,
    id_tercero: idTercero,
    debito: new Decimal(0),
    credito: new Decimal(totalAmount),
  });

  if (!validateDoubleEntry(detalles)) {
    throw new Error('❌ La transacción no cumple con partida doble');
  }

  // Crear asiento
  const asiento = await prisma.asientoContable.create({
    data: {
      fecha: data.fecha,
      descripcion: data.descripcion,
      comprobante_tipo: data.comprobante_tipo,
      google_drive_file_id: data.google_drive_file_id,
      google_drive_webview_link: data.google_drive_webview_link,
      asiento_detalles: {
        create: detalles,
      },
    },
    include: { asiento_detalles: true },
  });

  // Si es compra diferida con tarjeta, crear registro en tarjeta_compras
  if (data.id_tarjeta && data.cuotas_totales) {
    await prisma.tarjetaCompra.create({
      data: {
        id_tarjeta: data.id_tarjeta,
        asiento_id: asiento.id_asiento,
        establecimiento_tercero_id: data.establecimiento_tercero_id || 1,
        monto_total_original: new Decimal(totalAmount),
        cuotas_totales: data.cuotas_totales,
        cuotas_restantes: data.cuotas_totales,
        saldo_capital_actual: new Decimal(totalAmount),
      },
    });
  }

  return asiento;
};

/**
 * Registra intereses de inversión (CDT, Fondos, etc.)
 * Asiento: DÉBITO a inversión (aumenta activo) | CRÉDITO a ingresos
 */
export const recordInvestmentInterest = async (
  id_inversion: number,
  monto_interes: number,
  fecha: Date
): Promise<any> => {
  const inversion = await prisma.productoInversion.findUnique({
    where: { id_inversion },
    include: { tercero: true },
  });

  if (!inversion) {
    throw new Error('Inversión no encontrada');
  }

  const detalles: AsientoDetalleData[] = [
    {
      puc_codigo: inversion.puc_cuenta_inversion,
      debito: new Decimal(monto_interes),
      credito: new Decimal(0),
    },
    {
      puc_codigo: inversion.puc_cuenta_ingreso,
      id_tercero: inversion.id_tercero,
      debito: new Decimal(0),
      credito: new Decimal(monto_interes),
    },
  ];

  if (!validateDoubleEntry(detalles)) {
    throw new Error('❌ Asiento de intereses no cumple con partida doble');
  }

  const asiento = await prisma.asientoContable.create({
    data: {
      fecha,
      descripcion: `Intereses generados - ${inversion.nombre_producto}`,
      comprobante_tipo: 'Ingreso',
      asiento_detalles: {
        create: detalles,
      },
    },
    include: { asiento_detalles: true },
  });

  // Actualizar monto de la inversión
  await prisma.productoInversion.update({
    where: { id_inversion },
    data: {
      monto_inicial: {
        increment: monto_interes,
      },
    },
  });

  return asiento;
};

/**
 * Calcula Balance General y Estado de Resultados
 */
export const generateFinancialReports = async (
  fromDate: Date,
  toDate: Date
): Promise<any> => {
  const asientos = await prisma.asientoDetalle.findMany({
    where: {
      asiento: {
        fecha: {
          gte: fromDate,
          lte: toDate,
        },
      },
    },
    include: { puc: true },
  });

  // Agrupar por PUC
  const byPUC: Record<string, { debito: number; credito: number }> = {};

  for (const detalle of asientos) {
    if (!byPUC[detalle.puc_codigo]) {
      byPUC[detalle.puc_codigo] = { debito: 0, credito: 0 };
    }
    byPUC[detalle.puc_codigo].debito += Number(detalle.debito);
    byPUC[detalle.puc_codigo].credito += Number(detalle.credito);
  }

  // Calcular saldos por naturaleza
  const balances: Record<string, { cuenta: string; saldo: number }> = {};
  for (const [puc, saldo] of Object.entries(byPUC)) {
    const cuenta = await prisma.pUC.findUnique({ where: { codigo: puc } });
    if (!cuenta) continue;

    const valor = cuenta.naturaleza === 'D'
      ? saldo.debito - saldo.credito
      : saldo.credito - saldo.debito;

    balances[puc] = { cuenta: cuenta.nombre, saldo: valor };
  }

  return balances;
};
