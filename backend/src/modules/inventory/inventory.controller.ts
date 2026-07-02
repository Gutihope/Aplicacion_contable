import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, Decimal } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// GET /inventory/products
// ==========================================
/**
 * Listar todos los productos de inventario con estado actual
 */
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productos = await prisma.inventarioProducto.findMany({
      include: {
        inventario_movimientos: {
          orderBy: { fecha: 'desc' },
          take: 5, // Últimos 5 movimientos
        },
      },
    });

    // Marcar productos en alerta
    const productosConAlerta = productos.map((p) => ({
      ...p,
      en_alerta: p.stock_actual <= p.stock_minimo,
      porcentaje_stock:
        p.stock_minimo > 0
          ? Math.round((Number(p.stock_actual) / Number(p.stock_minimo)) * 100)
          : 100,
    }));

    res.json({
      success: true,
      data: productosConAlerta,
      alertas: productosConAlerta.filter((p) => p.en_alerta),
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GET /inventory/alerts
// ==========================================
/**
 * Obtener solo productos en alerta (stock <= stock_minimo)
 * Este endpoint es ideal para un dashboard de alertas rápidas
 */
router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alertas = await prisma.inventarioProducto.findMany({
      where: {
        stock_actual: {
          lte: prisma.inventarioProducto.fields.stock_minimo,
        },
      },
    });

    // Alternativa: hacer la comparación en JavaScript
    const productosConAlerta = await prisma.inventarioProducto.findMany();
    const productosEnAlerta = productosConAlerta.filter(
      (p) => Number(p.stock_actual) <= Number(p.stock_minimo)
    );

    res.json({
      success: true,
      alertas_count: productosEnAlerta.length,
      data: productosEnAlerta,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// POST /inventory/products
// ==========================================
/**
 * Crear un nuevo producto de inventario
 */
router.post('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, unidad_medida, stock_actual, stock_minimo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const producto = await prisma.inventarioProducto.create({
      data: {
        nombre,
        unidad_medida: unidad_medida || 'UNIDAD',
        stock_actual: new Decimal(stock_actual || 0),
        stock_minimo: new Decimal(stock_minimo || 0),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: producto,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// POST /inventory/products/:id/consume
// ==========================================
/**
 * Registrar un consumo/salida rápida de inventario (para despensa)
 *
 * Body:
 * {
 *   "cantidad": 2,
 *   "descripcion": "Consumo en el hogar"
 * }
 */
router.post(
  '/products/:id/consume',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { cantidad, descripcion } = req.body;

      if (!cantidad || cantidad <= 0) {
        return res.status(400).json({
          error: 'La cantidad debe ser mayor a 0',
        });
      }

      // Obtener producto
      const producto = await prisma.inventarioProducto.findUnique({
        where: { id_producto: parseInt(id) },
      });

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Validar stock disponible
      if (Number(producto.stock_actual) < cantidad) {
        return res.status(400).json({
          error: `Stock insuficiente. Disponible: ${producto.stock_actual}, Solicitado: ${cantidad}`,
        });
      }

      // Restar del inventario
      const actualizado = await prisma.inventarioProducto.update({
        where: { id_producto: parseInt(id) },
        data: {
          stock_actual: {
            decrement: cantidad,
          },
        },
      });

      // Registrar movimiento
      const movimiento = await prisma.inventarioMovimiento.create({
        data: {
          id_producto: parseInt(id),
          tipo_movimiento: 'SALIDA',
          cantidad: new Decimal(cantidad),
        },
      });

      res.json({
        success: true,
        message: `Consumo registrado: -${cantidad} ${producto.unidad_medida}`,
        stock_anterior: Number(producto.stock_actual),
        stock_nuevo: Number(actualizado.stock_actual),
        en_alerta: Number(actualizado.stock_actual) <= Number(actualizado.stock_minimo),
        movimiento,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// POST /inventory/products/:id/restock
// ==========================================
/**
 * Registrar entrada de inventario (reabastecimiento)
 *
 * Body:
 * {
 *   "cantidad": 10,
 *   "factura_detalle_id": 5  // Opcional: vincular a factura
 * }
 */
router.post(
  '/products/:id/restock',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { cantidad, factura_detalle_id } = req.body;

      if (!cantidad || cantidad <= 0) {
        return res.status(400).json({
          error: 'La cantidad debe ser mayor a 0',
        });
      }

      // Obtener producto
      const producto = await prisma.inventarioProducto.findUnique({
        where: { id_producto: parseInt(id) },
      });

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Sumar al inventario
      const actualizado = await prisma.inventarioProducto.update({
        where: { id_producto: parseInt(id) },
        data: {
          stock_actual: {
            increment: cantidad,
          },
        },
      });

      // Registrar movimiento
      const movimiento = await prisma.inventarioMovimiento.create({
        data: {
          id_producto: parseInt(id),
          tipo_movimiento: 'ENTRADA',
          cantidad: new Decimal(cantidad),
          factura_detalle_id: factura_detalle_id
            ? parseInt(factura_detalle_id)
            : undefined,
        },
      });

      res.json({
        success: true,
        message: `Stock aumentado: +${cantidad} ${producto.unidad_medida}`,
        stock_anterior: Number(producto.stock_actual),
        stock_nuevo: Number(actualizado.stock_actual),
        en_alerta: Number(actualizado.stock_actual) <= Number(actualizado.stock_minimo),
        movimiento,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// PUT /inventory/products/:id
// ==========================================
/**
 * Actualizar configuración de un producto (stock mínimo, etc.)
 */
router.put(
  '/products/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { stock_minimo, unidad_medida } = req.body;

      const updated = await prisma.inventarioProducto.update({
        where: { id_producto: parseInt(id) },
        data: {
          ...(stock_minimo !== undefined && { stock_minimo: new Decimal(stock_minimo) }),
          ...(unidad_medida && { unidad_medida }),
        },
      });

      res.json({
        success: true,
        message: 'Producto actualizado',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
