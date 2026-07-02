import { Router, Request, Response } from 'express'
import { prisma } from '../../db'

const router = Router()

// GET all payment methods
router.get('/', async (req: Request, res: Response) => {
  try {
    const metodos = await prisma.metodoPagoCuenta.findMany({
      include: {
        puc: true,
        banco_tercero: true,
      },
      orderBy: { nombre_comercial: 'asc' },
    })

    res.json({ success: true, data: metodos })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ success: false, error: msg })
  }
})

// CREATE new payment method
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nombre_comercial, categoria_pago, tipo_origen, puc_codigo, banco_tercero_id } = req.body

    const metodo = await prisma.metodoPagoCuenta.create({
      data: {
        nombre_comercial,
        categoria_pago,
        tipo_origen,
        puc_codigo: puc_codigo || null,
        banco_tercero_id: banco_tercero_id || null,
      },
      include: {
        puc: true,
        banco_tercero: true,
      },
    })

    res.status(201).json({ success: true, data: metodo })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ success: false, error: msg })
  }
})

// UPDATE payment method
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { nombre_comercial, categoria_pago, tipo_origen, puc_codigo, banco_tercero_id } = req.body

    const metodo = await prisma.metodoPagoCuenta.update({
      where: { id_metodo: parseInt(id) },
      data: {
        nombre_comercial,
        categoria_pago,
        tipo_origen,
        puc_codigo: puc_codigo || null,
        banco_tercero_id: banco_tercero_id || null,
      },
      include: {
        puc: true,
        banco_tercero: true,
      },
    })

    res.json({ success: true, data: metodo })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ success: false, error: msg })
  }
})

// DELETE payment method
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await prisma.metodoPagoCuenta.delete({
      where: { id_metodo: parseInt(id) },
    })

    res.json({ success: true, message: 'Método de pago eliminado' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ success: false, error: msg })
  }
})

export default router
