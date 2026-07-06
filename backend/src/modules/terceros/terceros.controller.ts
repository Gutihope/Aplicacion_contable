import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// POST /api/v1/terceros
// Crear un nuevo tercero
// ==========================================
/**
 * Crear un nuevo tercero (Proveedor, Cliente, Banco, etc.)
 *
 * Body:
 * {
 *   "nombre": "Supermercado ABC",
 *   "tipo": "PROVEEDOR",
 *   "identificacion": "900123456",
 *   "email": "info@supermercado.com",
 *   "telefono": "3001234567",
 *   "direccion": "Cra 5 #10-20",
 *   "ciudad": "Bogotá",
 *   "pais": "Colombia"
 * }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      nombre,
      tipo,
      identificacion,
      email,
      telefono,
      direccion,
      ciudad,
      pais,
      nit_o_documento,
    } = req.body;

    // Validar campos obligatorios
    if (!nombre || !tipo) {
      return res.status(400).json({
        error: 'Los campos nombre y tipo son obligatorios',
      });
    }

    // Validar que el tipo sea válido
    const tiposValidos = ['PROVEEDOR', 'CLIENTE', 'BANCO', 'EMPLEADO', 'OTRO'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        error: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}`,
      });
    }

    // Verificar si el tercero ya existe
    const terceroExistente = await prisma.tercero.findUnique({
      where: { nombre },
    }).catch(() => null);

    if (terceroExistente) {
      return res.status(409).json({
        error: 'Ya existe un tercero con este nombre',
      });
    }

    // Crear tercero
    const tercero = await prisma.tercero.create({
      data: {
        nombre,
        tipo,
        identificacion,
        email,
        telefono,
        direccion,
        ciudad,
        pais,
        nit_o_documento,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Tercero creado exitosamente',
      tercero,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GET /api/v1/terceros
// Obtener todos los terceros (con filtros opcionales)
// ==========================================
/**
 * Obtener lista de terceros
 * Query params:
 *   - tipo: PROVEEDOR, CLIENTE, BANCO, etc.
 *   - buscar: búsqueda por nombre
 *   - limite: cantidad de registros (default: 50)
 *   - pagina: número de página (default: 1)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      tipo,
      buscar,
      limite = '50',
      pagina = '1',
    } = req.query;

    const skip = (parseInt(pagina as string) - 1) * parseInt(limite as string);
    const take = parseInt(limite as string);

    // Construir filtro
    const where: any = {};

    if (tipo) {
      where.tipo = tipo as string;
    }

    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar as string, mode: 'insensitive' } },
        { identificacion: { contains: buscar as string, mode: 'insensitive' } },
      ];
    }

    // Obtener total de registros
    const total = await prisma.tercero.count({ where });

    // Obtener terceros
    const terceros = await prisma.tercero.findMany({
      where,
      skip,
      take,
      orderBy: { nombre: 'asc' },
    });

    const totalPaginas = Math.ceil(total / take);

    res.json({
      success: true,
      data: terceros,
      paginacion: {
        total,
        pagina: parseInt(pagina as string),
        limite: take,
        totalPaginas,
        hayProxima: parseInt(pagina as string) < totalPaginas,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GET /api/v1/terceros/:id
// Obtener un tercero específico
// ==========================================
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const tercero = await prisma.tercero.findUnique({
      where: { id_tercero: parseInt(id) },
      include: {
        asiento_detalles: {
          select: {
            id_detalle: true,
            debito: true,
            credito: true,
            asiento: {
              select: {
                fecha: true,
                descripcion: true,
              },
            },
          },
          take: 5,
          orderBy: { id_detalle: 'desc' },
        },
      },
    });

    if (!tercero) {
      return res.status(404).json({
        error: 'Tercero no encontrado',
      });
    }

    res.json({
      success: true,
      tercero,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// PUT /api/v1/terceros/:id
// Actualizar un tercero
// ==========================================
/**
 * Actualizar datos de un tercero
 *
 * Body: (solo los campos a actualizar)
 * {
 *   "email": "nuevo@email.com",
 *   "telefono": "3009876543",
 *   "ciudad": "Medellín"
 * }
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      tipo,
      identificacion,
      email,
      telefono,
      direccion,
      ciudad,
      pais,
      nit_o_documento,
    } = req.body;

    // Validar que el tercero existe
    const terceroExistente = await prisma.tercero.findUnique({
      where: { id_tercero: parseInt(id) },
    });

    if (!terceroExistente) {
      return res.status(404).json({
        error: 'Tercero no encontrado',
      });
    }

    // Si se intenta cambiar el nombre, verificar que no exista otro con ese nombre
    if (nombre && nombre !== terceroExistente.nombre) {
      const otroTercero = await prisma.tercero.findUnique({
        where: { nombre },
      }).catch(() => null);

      if (otroTercero) {
        return res.status(409).json({
          error: 'Ya existe un tercero con este nombre',
        });
      }
    }

    // Actualizar tercero
    const terceroActualizado = await prisma.tercero.update({
      where: { id_tercero: parseInt(id) },
      data: {
        ...(nombre && { nombre }),
        ...(tipo && { tipo }),
        ...(identificacion !== undefined && { identificacion }),
        ...(email !== undefined && { email }),
        ...(telefono !== undefined && { telefono }),
        ...(direccion !== undefined && { direccion }),
        ...(ciudad !== undefined && { ciudad }),
        ...(pais !== undefined && { pais }),
        ...(nit_o_documento !== undefined && { nit_o_documento }),
      },
    });

    res.json({
      success: true,
      message: 'Tercero actualizado exitosamente',
      tercero: terceroActualizado,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DELETE /api/v1/terceros/:id
// Eliminar un tercero
// ==========================================
/**
 * Eliminar un tercero (solo si no tiene movimientos contables)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Verificar que el tercero existe
    const tercero = await prisma.tercero.findUnique({
      where: { id_tercero: parseInt(id) },
    });

    if (!tercero) {
      return res.status(404).json({
        error: 'Tercero no encontrado',
      });
    }

    // Verificar si tiene movimientos contables
    const movimientos = await prisma.asientoDetalle.count({
      where: { id_tercero: parseInt(id) },
    });

    if (movimientos > 0) {
      return res.status(409).json({
        error: `No se puede eliminar este tercero porque tiene ${movimientos} movimientos contables asociados`,
      });
    }

    // Eliminar tercero
    await prisma.tercero.delete({
      where: { id_tercero: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Tercero eliminado exitosamente',
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GET /api/v1/terceros/:id/movimientos
// Obtener todos los movimientos de un tercero
// ==========================================
router.get(
  '/:id/movimientos',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { limite = '50', pagina = '1' } = req.query;

      const skip = (parseInt(pagina as string) - 1) * parseInt(limite as string);
      const take = parseInt(limite as string);

      // Verificar que el tercero existe
      const tercero = await prisma.tercero.findUnique({
        where: { id_tercero: parseInt(id) },
      });

      if (!tercero) {
        return res.status(404).json({
          error: 'Tercero no encontrado',
        });
      }

      // Obtener movimientos
      const total = await prisma.asientoDetalle.count({
        where: { id_tercero: parseInt(id) },
      });

      const movimientos = await prisma.asientoDetalle.findMany({
        where: { id_tercero: parseInt(id) },
        include: {
          asiento: {
            select: {
              id_asiento: true,
              fecha: true,
              descripcion: true,
              comprobante_tipo: true,
            },
          },
          puc: {
            select: {
              codigo: true,
              nombre: true,
            },
          },
        },
        skip,
        take,
        orderBy: { asiento: { fecha: 'desc' } },
      });

      const totalPaginas = Math.ceil(total / take);

      // Calcular saldo del tercero
      const saldoData = await prisma.asientoDetalle.aggregate({
        where: { id_tercero: parseInt(id) },
        _sum: {
          debito: true,
          credito: true,
        },
      });

      const saldo =
        Number(saldoData._sum.debito || 0) - Number(saldoData._sum.credito || 0);

      res.json({
        success: true,
        tercero: {
          id_tercero: tercero.id_tercero,
          nombre: tercero.nombre,
          tipo: tercero.tipo,
        },
        movimientos,
        saldo,
        paginacion: {
          total,
          pagina: parseInt(pagina as string),
          limite: take,
          totalPaginas,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// GET /api/v1/terceros/tipo/:tipo
// Obtener terceros por tipo
// ==========================================
router.get(
  '/filtro/:tipo',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tipo } = req.params;

      const tiposValidos = ['PROVEEDOR', 'CLIENTE', 'BANCO', 'EMPLEADO', 'OTRO'];
      if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({
          error: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}`,
        });
      }

      const terceros = await prisma.tercero.findMany({
        where: { tipo },
        orderBy: { nombre: 'asc' },
      });

      res.json({
        success: true,
        tipo,
        cantidad: terceros.length,
        terceros,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
