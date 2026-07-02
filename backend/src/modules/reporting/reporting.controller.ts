import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { generateFinancialReports } from '../../services/AccountingService';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// GET /reports/balance-sheet
// ==========================================
/**
 * Generar Balance General agrupado por niveles de PUC
 * Estructura: Activos | Pasivos | Patrimonio
 *
 * Query params:
 *   ?from_date=2024-01-01&to_date=2024-12-31
 */
router.get(
  '/balance-sheet',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from_date = '2024-01-01', to_date = '2024-12-31' } = req.query;

      const asientos = await prisma.asientoDetalle.findMany({
        where: {
          asiento: {
            fecha: {
              gte: new Date(from_date as string),
              lte: new Date(to_date as string),
            },
          },
        },
        include: { puc: true },
      });

      // Agrupar por nivel y código PUC
      const grupos: Record<string, any> = {
        activos: { titulo: '1. ACTIVOS', nivel1: {} },
        pasivos: { titulo: '2. PASIVOS', nivel1: {} },
        patrimonio: { titulo: '3. PATRIMONIO', nivel1: {} },
      };

      let totalActivos = 0;
      let totalPasivos = 0;
      let totalPatrimonio = 0;

      for (const detalle of asientos) {
        if (!detalle.puc) continue;

        const codigo = detalle.puc.codigo;
        const clase = codigo.charAt(0);
        let grupoKey = '';
        let saldo = 0;

        // Clasificar por clase
        if (['1'].includes(clase)) {
          grupoKey = 'activos';
          saldo = Number(detalle.debito) - Number(detalle.credito);
          totalActivos += saldo;
        } else if (['2'].includes(clase)) {
          grupoKey = 'pasivos';
          saldo = Number(detalle.credito) - Number(detalle.debito);
          totalPasivos += saldo;
        } else if (['3'].includes(clase)) {
          grupoKey = 'patrimonio';
          saldo = Number(detalle.credito) - Number(detalle.debito);
          totalPatrimonio += saldo;
        }

        if (grupoKey && !grupos[grupoKey].nivel1[codigo]) {
          grupos[grupoKey].nivel1[codigo] = {
            codigo,
            nombre: detalle.puc.nombre,
            saldo: 0,
          };
        }

        if (grupoKey) {
          grupos[grupoKey].nivel1[codigo].saldo += saldo;
        }
      }

      res.json({
        success: true,
        periodo: {
          desde: from_date,
          hasta: to_date,
        },
        balance: {
          activos: {
            items: Object.values(grupos.activos.nivel1),
            total: totalActivos,
          },
          pasivos: {
            items: Object.values(grupos.pasivos.nivel1),
            total: totalPasivos,
          },
          patrimonio: {
            items: Object.values(grupos.patrimonio.nivel1),
            total: totalPatrimonio,
          },
          ecuacion_contable: {
            activos: totalActivos,
            pasivos_patrimonio: totalPasivos + totalPatrimonio,
            balanceado: Math.abs(totalActivos - (totalPasivos + totalPatrimonio)) < 0.01,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// GET /reports/income-statement
// ==========================================
/**
 * Generar Estado de Resultados
 * Estructura: Ingresos | Gastos | Resultado Neto
 *
 * Query params:
 *   ?from_date=2024-01-01&to_date=2024-12-31
 */
router.get(
  '/income-statement',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from_date = '2024-01-01', to_date = '2024-12-31' } = req.query;

      const asientos = await prisma.asientoDetalle.findMany({
        where: {
          asiento: {
            fecha: {
              gte: new Date(from_date as string),
              lte: new Date(to_date as string),
            },
          },
        },
        include: { puc: true },
      });

      let ingresos = 0;
      let gastos = 0;

      const ingresoDetalle: Record<string, number> = {};
      const gastoDetalle: Record<string, number> = {};

      for (const detalle of asientos) {
        if (!detalle.puc) continue;

        const clase = detalle.puc.codigo.charAt(0);

        if (clase === '4') {
          // Ingresos (clase 4)
          const saldo = Number(detalle.credito) - Number(detalle.debito);
          ingresos += saldo;

          if (!ingresoDetalle[detalle.puc.codigo]) {
            ingresoDetalle[detalle.puc.codigo] = 0;
          }
          ingresoDetalle[detalle.puc.codigo] += saldo;
        } else if (clase === '5') {
          // Gastos (clase 5)
          const saldo = Number(detalle.debito) - Number(detalle.credito);
          gastos += saldo;

          if (!gastoDetalle[detalle.puc.codigo]) {
            gastoDetalle[detalle.puc.codigo] = 0;
          }
          gastoDetalle[detalle.puc.codigo] += saldo;
        }
      }

      const resultadoNeto = ingresos - gastos;

      res.json({
        success: true,
        periodo: {
          desde: from_date,
          hasta: to_date,
        },
        estado_resultados: {
          ingresos: {
            detalle: Object.entries(ingresoDetalle).map(([puc, valor]) => ({
              puc,
              valor,
            })),
            total: ingresos,
          },
          gastos: {
            detalle: Object.entries(gastoDetalle).map(([puc, valor]) => ({
              puc,
              valor,
            })),
            total: gastos,
          },
          resultado_neto: resultadoNeto,
          margen: ingresos > 0 ? Math.round((resultadoNeto / ingresos) * 100) : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// GET /reports/forecast
// ==========================================
/**
 * Proyectar flujo de caja del año
 * Toma el histórico real y suma gastos recurrentes configurados
 */
router.get('/forecast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const yearNum = parseInt(year as string);
    const mesActual = new Date().getMonth() + 1;

    // Obtener gastos recurrentes configurados
    const gastosRecurrentes = await prisma.gastoRecurrenteConfig.findMany({
      include: { puc: true },
    });

    // Obtener movimientos reales del año hasta hoy
    const asientosReales = await prisma.asientoDetalle.findMany({
      where: {
        asiento: {
          fecha: {
            gte: new Date(`${yearNum}-01-01`),
            lte: new Date(),
          },
        },
      },
      include: { puc: true, asiento: true },
    });

    // Calcular gastos reales por mes
    const gastosRealesPorMes: Record<number, number> = {};

    for (let mes = 1; mes <= mesActual; mes++) {
      gastosRealesPorMes[mes] = 0;

      for (const detalle of asientosReales) {
        const fechaMes = new Date(detalle.asiento.fecha).getMonth() + 1;
        if (fechaMes === mes && detalle.puc.codigo.charAt(0) === '5') {
          gastosRealesPorMes[mes] += Number(detalle.debito);
        }
      }
    }

    // Proyectar meses futuros con gastos recurrentes
    const gastosPorMes: Record<number, number> = { ...gastosRealesPorMes };

    for (let mes = mesActual + 1; mes <= 12; mes++) {
      gastosPorMes[mes] = 0;

      for (const gasto of gastosRecurrentes) {
        if (gasto.mes_inicio <= mes && mes <= gasto.mes_fin) {
          gastosPorMes[mes] += Number(gasto.monto_estimado);
        }
      }
    }

    // Calcular acumulados
    let acumulado = 0;
    const forecast = [];

    for (let mes = 1; mes <= 12; mes++) {
      acumulado += gastosPorMes[mes] || 0;

      forecast.push({
        mes,
        mes_nombre: new Date(yearNum, mes - 1).toLocaleDateString('es-CO', {
          month: 'long',
        }),
        gastos_mes: gastosPorMes[mes] || 0,
        acumulado,
        es_proyectado: mes > mesActual,
      });
    }

    res.json({
      success: true,
      año: yearNum,
      mes_actual: mesActual,
      forecast,
      total_estimado_año: acumulado,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GET /reports/inventory-value
// ==========================================
/**
 * Calcular valor total del inventario (para balance)
 */
router.get(
  '/inventory-value',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productos = await prisma.inventarioProducto.findMany();

      const valor_total = productos.reduce((sum, p) => {
        // Nota: necesitaríamos un precio unitario en la tabla de inventario
        // Por ahora solo mostramos stock
        return sum + Number(p.stock_actual);
      }, 0);

      res.json({
        success: true,
        productos_count: productos.length,
        stock_total_items: valor_total,
        productos_en_alerta: productos.filter(
          (p) => Number(p.stock_actual) <= Number(p.stock_minimo)
        ).length,
        data: productos,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
