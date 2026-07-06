import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET all payment methods
router.get('/', async (req: Request, res: Response) => {
  try {
    const metodos = await prisma.metodoPago.findMany({
      include: {
        puc: true,
        tercero: true,
      },
      orderBy: { nombre: 'asc' },
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
    const { nombre, tipo, puc_codigo, id_tercero } = req.body

    const metodo = await prisma.metodoPago.create({
      data: {
        nombre,
        tipo,
        puc_codigo: puc_codigo || null,
        id_tercero: id_tercero || null,
      },
      include: {
        puc: true,
        tercero: true,
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
    const { nombre, tipo, puc_codigo, id_tercero } = req.body

    const metodo = await prisma.metodoPago.update({
      where: { id_metodo: parseInt(id) },
      data: {
        nombre: nombre || undefined,
        tipo: tipo || undefined,
        puc_codigo: puc_codigo || null,
        id_tercero: id_tercero || null,
      },
      include: {
        puc: true,
        tercero: true,
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

    await prisma.metodoPago.delete({
      where: { id_metodo: parseInt(id) },
    })

    res.json({ success: true, message: 'Método de pago eliminado' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ success: false, error: msg })
  }
})

export default router
