import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, Decimal } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// GET /credit-cards
// ==========================================
/**
 * Listar todas las tarjetas de crédito registradas
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tarjetas = await prisma.tarjetaCredito.findMany({
      include: {
        banco_tercero: true,
        tarjeta_compras: {
          where: { estado: 'VIGENTE' },
        },
      },
    });

    res.json({
      success: true,
      data: tarjetas,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GET /credit-cards/:id/purchases
// ==========================================
/**
 * Listar todas las compras diferidas de una tarjeta
 */
router.get(
  '/:id/purchases',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const compras = await prisma.tarjetaCompra.findMany({
        where: {
          id_tarjeta: parseInt(id),
          estado: 'VIGENTE',
        },
        include: {
          asiento: true,
          establecimiento: true,
        },
      });

      res.json({
        success: true,
        data: compras,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// POST /credit-cards/:id/month-close
// ==========================================
/**
 * Cierre de mes de tarjeta de crédito
 *
 * Body:
 * {
 *   "mes": 7,
 *   "año": 2024,
 *   "cuota_manejo": 25000,  // Opcional
 *   "compras_intereses": [
 *     { "id_compra_tc": 1, "interes_individual": 5000 }
 *   ]
 * }
 */
router.post(
  '/:id/month-close',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { mes, año, cuota_manejo = 0, compras_intereses = [] } = req.body;

      const idTarjeta = parseInt(id);
      const fecha = new Date(año, mes - 1, 1);

      // Obtener tarjeta
      const tarjeta = await prisma.tarjetaCredito.findUnique({
        where: { id_tarjeta: idTarjeta },
        include: { banco_tercero: true },
      });

      if (!tarjeta) {
        return res.status(404).json({ error: 'Tarjeta no encontrada' });
      }

      const asientos = [];
      let totalIntereses = 0;

      // 1. Registrar cuota de manejo (si aplica)
      if (cuota_manejo > 0) {
        const asientoCuota = await prisma.asientoContable.create({
          data: {
            fecha,
            descripcion: `Cuota de manejo - ${tarjeta.nombre_tarjeta}`,
            comprobante_tipo: 'Egreso',
            asiento_detalles: {
              create: [
                {
                  puc_codigo: '530535', // Gastos financieros
                  debito: new Decimal(cuota_manejo),
                  credito: new Decimal(0),
                },
                {
                  puc_codigo: tarjeta.puc_cuenta_pasivo,
                  id_tercero: tarjeta.id_banco_tercero,
                  debito: new Decimal(0),
                  credito: new Decimal(cuota_manejo),
                },
              ],
            },
          },
          include: { asiento_detalles: true },
        });

        asientos.push({ tipo: 'Cuota Manejo', asiento: asientoCuota });
      }

      // 2. Registrar intereses de compras diferidas
      for (const compra_interes of compras_intereses) {
        const compra = await prisma.tarjetaCompra.findUnique({
          where: { id_compra_tc: compra_interes.id_compra_tc },
          include: { asiento: true },
        });

        if (!compra) continue;

        const interes = parseFloat(compra_interes.interes_individual);
        totalIntereses += interes;

        // Crear asiento de intereses
        const asientoInteres = await prisma.asientoContable.create({
          data: {
            fecha,
            descripcion: `Intereses cuota ${compra.cuotas_totales - compra.cuotas_restantes + 1}/${compra.cuotas_totales} - ${tarjeta.nombre_tarjeta}`,
            comprobante_tipo: 'Egreso',
            asiento_detalles: {
              create: [
                {
                  puc_codigo: '530535', // Gastos financieros
                  debito: new Decimal(interes),
                  credito: new Decimal(0),
                },
                {
                  puc_codigo: tarjeta.puc_cuenta_pasivo,
                  id_tercero: tarjeta.id_banco_tercero,
                  debito: new Decimal(0),
                  credito: new Decimal(interes),
                },
              ],
            },
          },
          include: { asiento_detalles: true },
        });

        asientos.push({
          tipo: 'Interés Compra',
          asiento: asientoInteres,
        });

        // Actualizar compra: restar una cuota y actualizar saldo
        const cuotaPagada = compra.saldo_capital_actual / compra.cuotas_restantes;
        await prisma.tarjetaCompra.update({
          where: { id_compra_tc: compra_interes.id_compra_tc },
          data: {
            cuotas_restantes: {
              decrement: 1,
            },
            saldo_capital_actual: {
              decrement: cuotaPagada,
            },
            // Si no hay más cuotas, marcar como CANCELADA
            estado:
              compra.cuotas_restantes === 1
                ? 'CANCELADA'
                : 'VIGENTE',
          },
        });
      }

      res.status(201).json({
        success: true,
        message: `Cierre de mes completado para ${tarjeta.nombre_tarjeta}`,
        resumen: {
          cuota_manejo: cuota_manejo,
          intereses_totales: totalIntereses,
          total_movimiento: cuota_manejo + totalIntereses,
          asientos_generados: asientos.length,
        },
        asientos,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// PUT /credit-cards/:id/purchase/:compraId
// ==========================================
/**
 * Actualizar el estado de una compra (marcar como pagada/cancelada)
 */
router.put(
  '/:id/purchase/:compraId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { compraId } = req.params;
      const { estado } = req.body;

      const updated = await prisma.tarjetaCompra.update({
        where: { id_compra_tc: parseInt(compraId) },
        data: { estado },
      });

      res.json({
        success: true,
        message: 'Compra actualizada',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
