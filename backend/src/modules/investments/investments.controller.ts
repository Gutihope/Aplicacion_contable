import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { recordInvestmentInterest } from '../../services/AccountingService';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// GET /investments
// ==========================================
/**
 * Listar todas las inversiones activas del usuario
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inversiones = await prisma.productoInversion.findMany({
      where: { estado: 'ACTIVO' },
      include: {
        tercero: true,
        puc: true,
      },
    });

    res.json({
      success: true,
      data: inversiones,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// POST /investments/:id/record-interest
// ==========================================
/**
 * Registrar intereses de una inversión
 *
 * Body:
 * {
 *   "monto_interes": 50000,
 *   "fecha": "2024-07-02"
 * }
 */
router.post(
  '/:id/record-interest',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { monto_interes, fecha } = req.body;

      if (!monto_interes || !fecha) {
        return res.status(400).json({
          error: 'Faltan campos: monto_interes, fecha',
        });
      }

      const asiento = await recordInvestmentInterest(
        parseInt(id),
        parseFloat(monto_interes),
        new Date(fecha)
      );

      res.status(201).json({
        success: true,
        message: 'Intereses registrados exitosamente',
        asiento_id: asiento.id_asiento,
        asiento,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// POST /investments/month-close
// ==========================================
/**
 * Cierre de mes: Registrar intereses de todas las inversiones del mes
 *
 * Body:
 * {
 *   "mes": 7,
 *   "año": 2024,
 *   "intereses": [
 *     { "id_inversion": 1, "monto": 50000 },
 *     { "id_inversion": 2, "monto": 75000 }
 *   ]
 * }
 */
router.post(
  '/month-close',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mes, año, intereses } = req.body;

      if (!mes || !año || !Array.isArray(intereses)) {
        return res.status(400).json({
          error: 'Faltan campos: mes, año, intereses (array)',
        });
      }

      const asientos = [];
      const fecha = new Date(año, mes - 1, 1); // Primer día del mes

      for (const interes of intereses) {
        try {
          const asiento = await recordInvestmentInterest(
            interes.id_inversion,
            interes.monto,
            fecha
          );
          asientos.push(asiento);
        } catch (error) {
          console.error(
            `Error registrando intereses para inversión ${interes.id_inversion}:`,
            error
          );
        }
      }

      res.status(201).json({
        success: true,
        message: `Cierre de mes completado. ${asientos.length} asientos generados`,
        asientos,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// PUT /investments/:id
// ==========================================
/**
 * Actualizar estado de una inversión (Ej: de ACTIVO a LIQUIDADO)
 */
router.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      const updated = await prisma.productoInversion.update({
        where: { id_inversion: parseInt(id) },
        data: { estado },
      });

      res.json({
        success: true,
        message: 'Inversión actualizada',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
